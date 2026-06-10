# MelisDbDeploy

> Outil d'exécution des migrations de base de données pour la plateforme Melis — applique les deltas SQL de chaque module dans l'ordre.
> Paquet `melisplatform/melis-dbdeploy`.

## Présentation

`MelisDbDeploy` maintient le schéma de base de données de chaque module synchronisé avec le code installé. Chaque module
qui y participe livre ses changements de schéma sous forme de fichiers SQL ordonnés (**deltas**) dans
`install/dbdeploy/`. MelisDbDeploy découvre ces deltas dans tous les modules, applique ceux qui
n'ont pas encore été exécutés, et enregistre chacun dans une table changelog afin qu'il ne soit appliqué qu'une seule fois — construit
sur la `DbDeployTask` de [Phing](https://www.phing.info/).

Il fait partie des [fondations de la plateforme MelisCore](/fr/reference/modules/melis-core) et ne
dispose d'aucune interface utilisateur.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisDbDeploy',
];
```

`MelisDbDeploy` dépend uniquement de `phing/phing` (`2.17.4`). Il n'a **aucune** dépendance envers `melis-core` —
c'est un outil autonome invoqué par MelisInstaller et par les flux d'installation/mise à jour des modules.

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
| `MelisDbDeployDiscoveryService` | Trouve les deltas de chaque module participant et les copie à l'emplacement de travail, puis délègue au service de déploiement. |
| `MelisDbDeployDeployService` | Se connecte à la base de données, s'assure que la table changelog existe, et applique les deltas en attente via Phing. |

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

MelisDbDeploy est invoqué automatiquement dans deux scénarios :

- **Première installation** — par **MelisInstaller** lors de l'assistant de configuration de la plateforme.
- **Installation / mise à jour d'un module** — déclenché via l'outil Modules du back-office / marketplace et
  les hooks Composer.

Ce n'est pas un outil destiné aux utilisateurs et il n'expose aucun contrôleur.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Service de découverte | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDiscoveryService.php` |
| Service de déploiement | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDeployService.php` |
| Modèles | `vendor/melisplatform/melis-dbdeploy/src/Model/` |
| Configuration du module / alias de services | `vendor/melisplatform/melis-dbdeploy/etc/` |
| Deltas du module (tout module) | `vendor/melisplatform/<module>/install/dbdeploy/*.sql` |

Voir aussi : [MelisCore](/fr/reference/modules/melis-core) · [MelisInstaller](/fr/reference/modules/melis-installer) · [MelisComposerDeploy](/fr/reference/modules/melis-composerdeploy) · [Concepts de la plateforme](/fr/guide/concepts)
