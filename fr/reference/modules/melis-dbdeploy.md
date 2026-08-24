# MelisDbDeploy

> Outil d'exécution sans interface des migrations de base de données pour la plateforme Melis — applique dans l'ordre les deltas SQL de chaque module. Paquet `melisplatform/melis-dbdeploy`.

## Présentation

`MelisDbDeploy` maintient le schéma de base de données de chaque module synchronisé avec le code installé. Chaque module
qui y participe livre ses changements de schéma sous forme de fichiers SQL ordonnés (**deltas**) dans
`install/dbdeploy/`. MelisDbDeploy découvre ces deltas dans tous les modules, applique ceux qui
n'ont pas encore été exécutés, et enregistre chacun dans une table changelog afin qu'il ne soit appliqué qu'une seule fois — construit
sur la `DbDeployTask` de [Phing](https://www.phing.info/).

Il n'a **aucune interface destinée aux utilisateurs**.

## Relation avec le back-office React

MelisDbDeploy n'a **aucun outil React, aucune page, aucune entrée de menu, aucune route**. Il n'apparaît nulle part dans
`/melis-react`. Il n'y a pas de brique `ui-react/`, pas de `config/react-api.php`, pas de
`config/react.capabilities.php` et pas de `src/Controller/` — c'est un module sans interface, composé uniquement de services.

Son lien avec le back-office React est entièrement **indirect**, via deux faits :

- **Il crée les tables et les colonnes que les outils React lisent et écrivent.** Chaque outil React (Utilisateurs,
  Pages CMS, Sites, Médias, …) interroge des tables de base de données. Ces tables — ainsi que les colonnes ajoutées par
  les fonctionnalités React plus récentes — sont créées par les deltas `install/dbdeploy/*.sql` du module propriétaire, que
  MelisDbDeploy applique. Si un outil React échoue avec une erreur « table/colonne introuvable » juste après une
  installation ou une mise à jour, une migration non exécutée en est la cause habituelle.
- **Il s'exécute dans le pipeline de déploiement qui livre le build React.** Le build React versionné
  (`melis-core/public/ui-react/`, application sur `/melis-react`) est livré par le même déploiement qui
  exécute les migrations de schéma. MelisDbDeploy gère les deltas SQL **livrés par les modules** ; **Flyway**
  gère les migrations versionnées de la plateforme (`V*.sql`). Ce sont des mécanismes complémentaires au sein de la
  même étape de déploiement.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisDbDeploy',
];
```

`MelisDbDeploy` dépend uniquement de `phing/phing`. Il n'a **aucune** dépendance envers `melis-core` — c'est un
outil autonome invoqué par MelisInstaller et par les flux d'installation/mise à jour des modules, jamais appelé
depuis React.

## Rendre un module participant

Un module participe au système de migration en déclarant ce qui suit dans son `composer.json` :

```json
"extra": {
    "dbdeploy": true
}
```

Ses deltas SQL sont placés dans `install/dbdeploy/*.sql`. Chaque nom de fichier commence par un préfixe numérique
qui définit l'ordre d'exécution (ex. : `23051701_create_my_table.sql`).

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisDbDeployDiscoveryService` | Trouve les deltas de chaque paquet `melisplatform/*` participant et les copie dans le cache de travail (`dbdeploy/data/`), puis délègue au service de déploiement. |
| `MelisDbDeployDeployService` | Se connecte à la base de données, s'assure que la table changelog existe, et applique les deltas en attente via la `DbDeployTask` + `PDOSQLExecTask` de Phing. |

## La table changelog

Chaque delta appliqué est enregistré dans une table `changelog` fixe (ce nom est imposé par la tâche
Phing), qui joue le rôle de registre « appliqué une seule fois » :

```sql
CREATE TABLE IF NOT EXISTS changelog (
  `change_number` BIGINT NOT NULL,
  `delta_set`     VARCHAR(10) NOT NULL,
  `start_dt`      TIMESTAMP NOT NULL,
  `complete_dt`   TIMESTAMP NULL,
  `applied_by`    VARCHAR(100) NOT NULL,
  `description`   VARCHAR(500) NOT NULL,
  PRIMARY KEY `Pkchangelog` (`change_number`, `delta_set`)
);
```

L'accès au modèle se fait via `MelisDbDeploy\Model\Table\ChangelogTable` (aliasé `ChangelogTable`).

## Exemple

```php
// Discovery — gather deltas from all dbdeploy modules
$discovery = $sm->get(\MelisDbDeploy\Service\MelisDbDeployDiscoveryService::class);
$discovery->setComposer($composer);
$discovery->processing();   // discovers modules and copies their *.sql deltas

// Deploy — apply pending deltas
$deploy = new \MelisDbDeploy\Service\MelisDbDeployDeployService(/* db params */);
if (!$deploy->isInstalled()) {
    $deploy->install();                  // creates the changelog table on first run
}
$count = $deploy->changeLogCount();      // number of deltas applied so far
$deploy->applyDeltaPath($pathToDeltas);  // run any not-yet-applied deltas
```

## Quand il s'exécute

MelisDbDeploy est invoqué automatiquement dans deux scénarios, dont aucun n'implique l'interface React :

- **Première installation** — par **MelisInstaller** lors de l'assistant de configuration de la plateforme.
- **Installation / mise à jour d'un module** — via l'outil Modules du back-office / marketplace et le hook
  Composer post-update (`DbDeployOnComposerUpdate::postUpdate()`), qui copie les deltas de chaque module et
  les ré-applique jusqu'à ce que le nombre d'entrées du changelog corresponde au nombre de fichiers de delta (convergence idempotente).

Il n'expose aucun contrôleur.

## Dépannage

Si un outil React affiche des données vides ou une erreur 500 / « table doesn't exist » juste après l'installation,
la mise à jour ou le déploiement d'un module, la cause première habituelle est un **delta dbdeploy non exécuté** (ou une
migration Flyway manquante) — et non le code React. Relancer le flux de migration corrige le problème.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Service de découverte | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDiscoveryService.php` |
| Service de déploiement | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDeployService.php` |
| Hook Composer post-update | `vendor/melisplatform/melis-dbdeploy/src/DbDeployOnComposerUpdate.php` |
| DDL du changelog | `vendor/melisplatform/melis-dbdeploy/data/changelog.sql` |
| Modèles | `vendor/melisplatform/melis-dbdeploy/src/Model/` |
| Deltas du module (tout module) | `vendor/melisplatform/<module>/install/dbdeploy/*.sql` |

Voir aussi : [MelisCore](/fr/reference/modules/melis-core) · [MelisInstaller](/fr/reference/modules/melis-installer) · [MelisComposerDeploy](/fr/reference/modules/melis-composerdeploy) · [Concepts de la plateforme](/fr/guide/concepts)
