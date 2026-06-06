# MelisDbDeploy

> Deltas de base de données versionnés (le mécanisme `changelog`) pour Melis Platform —
> paquet Composer `melisplatform/melis-dbdeploy`.

## Objectif

`MelisDbDeploy` maintient le schéma de base de données de chaque module synchronisé. Chaque module
Melis livre ses changements de schéma sous forme de petits fichiers SQL ordonnés (**deltas**) dans
`install/dbdeploy/`. Après une mise à jour Composer ou une installation depuis la Marketplace,
MelisDbDeploy collecte ces deltas dans tous les paquets `melisplatform/*`, applique ceux qui n'ont
pas encore été exécutés, et enregistre chacun d'eux dans une unique table `changelog` afin qu'ils ne
soient jamais rejoués. En coulisses, il pilote la tâche `DbDeployTask` de
[Phing](https://www.phing.info/).

## Activation

`MelisDbDeploy` est un module Laminas standard. Il est listé dans `config/melis.module.load.php` :

```php
return [
    // …
    'MelisDbDeploy',
    // …
];
```

Il dépend de `melis-core` (il étend `MelisCore\Service\MelisServiceManager` et lit
`config/autoload/platforms/*.php` pour les identifiants de la base), de `melis-composerdeploy`
(`MelisComposerDeploy\MelisComposer` liste les paquets Melis), de `melis-asset-manager`
(`MelisAssetManagerModulesService` fournit l'instance Composer), et de la dépendance Composer
`phing/phing` (déclarée dans le `composer.json` du module).

L'étape de déploiement est branchée dans le `post-update-cmd` du `composer.json` du projet :

```json
"post-update-cmd": [
    "MelisCore\\ModuleComposerScript::executeScripts",
    "MelisDbDeploy\\DbDeployOnComposerUpdate::postUpdate"
]
```

ainsi les deltas sont appliqués automatiquement à la fin de chaque `composer update`. Voir
[Référence des modules](/fr/reference/modules) et [Marketplace](/fr/reference/modules).

## Comment écrire un delta

Un delta est un simple fichier `.sql` dans le dossier `install/dbdeploy/` d'un module. Le **préfixe
numérique** du nom de fichier est le `change_number` du delta (sa clé d'ordre) ; le reste est une
description lisible. Exemples réels issus des modules livrés :

```
melis-core/install/dbdeploy/24051501_core_update_platform_table.sql
melis-document-upload/install/dbdeploy/24012603_document_upload_add_isactive_document.sql
```

```sql
-- 24051501_core_update_platform_table.sql
ALTER TABLE `melis_core_platform`
  ADD `plf_activate_cache` INT NOT NULL DEFAULT '1' AFTER `plf_update_marketplace`;
```

Les deltas au numéro plus élevé s'exécutent après ceux au numéro plus bas, et uniquement si leur
`change_number` n'est pas déjà présent dans `changelog`.

## Services principaux

Enregistrés comme alias `service_manager` dans `config/module.config.php` :

| Alias de service | Rôle |
| --- | --- |
| `MelisDbDeployDiscoveryService` | Parcourt tous les paquets Composer `melisplatform/*`, copie leurs deltas `install/dbdeploy/*.sql` dans le cache d'exécution `dbdeploy/data/`, puis délègue au service de déploiement. Point d'entrée : `processing($module = null)` (passer un nom de module pour se limiter à un seul paquet). |
| `MelisDbDeployDeployService` | Se connecte à la base (PDO/MySQL), s'assure que la table `changelog` existe, et applique les deltas en attente via la `DbDeployTask` de Phing. Méthodes clés : `isInstalled()`, `install()`, `changeLogCount()`, `applyDeltaPath($deltaPath)`. |
| `ChangelogTable` | `TableGateway` sur la table `changelog` (`MelisGenericTable`, clé primaire `change_number`). |

Constantes notables de `MelisDbDeployDeployService` : `TABLE_NAME = 'changelog'`,
`OUTPUT_FILENAME = 'melisplatform-dbdeploy.sql'`,
`OUTPUT_FILENAME_UNDO = 'melisplatform-dbdeploy-reverse.sql'`. Il applique les deltas avec
`applied_by = 'MelisDbDeploy'`.

## Comment ça s'exécute

Deux points d'entrée déclenchent le même pipeline :

- **Composer** — `DbDeployOnComposerUpdate::postUpdate()` s'exécute lors du `post-update-cmd`. Il
  copie les deltas de chaque paquet Melis dans `dbdeploy/data/`, puis boucle
  `MelisDbDeployDeployService` jusqu'à ce que `changeLogCount()` égale le nombre de fichiers delta
  en cache.
- **Marketplace** — lorsqu'un module est installé/mis à jour depuis le backoffice,
  `MelisMarketPlaceController` appelle
  `MelisDbDeployDiscoveryService->processing($module)` pour ce paquet.

`Module::run()` expose également le pipeline de découverte sous forme d'assistant statique. Les deux
chemins créent le dossier d'exécution `dbdeploy/` s'il est absent, créent la table `changelog` au
premier lancement, et ignorent tout delta déjà enregistré.

## Backoffice

Aucun. MelisDbDeploy ne livre **aucun** outil de backoffice, vue, plugin de contrôleur, plugin de
tableau de bord ni plugin de templating — il s'agit de plomberie de plateforme invoquée par Composer
et par la [Marketplace](/fr/reference/modules). Il déclare néanmoins une entrée `diagnostic` dans
`config/diagnostic.config.php` (utilisée par l'auto-diagnostic de la plateforme).

## Tables de base de données

| Table | Rôle |
| --- | --- |
| `changelog` | Registre des deltas appliqués. Colonnes : `change_number`, `delta_set`, `start_dt`, `complete_dt`, `applied_by`, `description` ; clé primaire `(change_number, delta_set)`. Créée à partir de `data/changelog.sql`. |

Remarque : contrairement à la plupart des modules, la table de suivi se nomme `changelog` (et non
`melis_*`) — ce nom est fixe car c'est une dépendance de la `DbDeployTask` de Phing.

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Amorçage du module / `run()` | `vendor/melisplatform/melis-dbdeploy/src/Module.php` |
| Hook Composer post-update | `vendor/melisplatform/melis-dbdeploy/src/DbDeployOnComposerUpdate.php` |
| Service de découverte | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDiscoveryService.php` |
| Service de déploiement (Phing) | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDeployService.php` |
| Modèle de table `changelog` | `vendor/melisplatform/melis-dbdeploy/src/Model/Table/ChangelogTable.php` |
| SQL de création de `changelog` | `vendor/melisplatform/melis-dbdeploy/data/changelog.sql` |
| Alias de services | `vendor/melisplatform/melis-dbdeploy/config/module.config.php` |
| Exemples de deltas (tout module) | `vendor/melisplatform/<module>/install/dbdeploy/*.sql` |
