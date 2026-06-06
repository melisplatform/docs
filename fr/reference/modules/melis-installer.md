# MelisInstaller

> L'assistant d'installation initiale qui transforme un squelette neuf en une plateforme Melis
> opérationnelle. Paquet : `melisplatform/melis-installer`.

## Objectif

`MelisInstaller` est l'installateur web que Melis sert **avant** que la plateforme ne soit
configurée. Sur un checkout neuf, il intercepte chaque requête et redirige vers `/melis/setup`, où
il guide l'utilisateur à travers un assistant par étapes : vérification du système (extensions PHP,
droits sur les répertoires, Apache/vhost), configuration des identifiants de base de données et des
environnements, sélection et téléchargement des modules, exécution du déploiement de base de
données, et enfin choix du type d'installation — une plateforme **vide** prête à l'emploi, un
**module de site** généré, ou le site d'apprentissage **MelisCmsDemo**. Une fois l'installation
terminée, le module se décharge lui-même et redirige vers `/melis/login` ; il n'est donc actif que
pendant l'installation.

## Activation

`MelisInstaller` est un module Laminas standard déclaré dans `config/melis.module.load.php`. Sur un
squelette neuf, le bootstrap du module (`src/Module.php`) écrit un loader minimal ne contenant que
les modules nécessaires à l'exécution de l'assistant :

```php
['MelisAssetManager', 'MelisDbDeploy', 'MelisComposerDeploy', 'MelisInstaller', 'MelisModuleConfig']
```

Il dépend de `melisplatform/melis-core` (composer) et, à l'exécution, de `MelisComposerDeploy`
(pour lire les paquets Composer installés) et de `MelisDbDeploy` (pour appliquer les deltas de base
de données). Il est conditionné par le fichier indicateur `config/melis.install` : tant que cet
indicateur n'est pas défini, l'installateur force la route `/melis/setup` ; une fois l'installation
terminée, le module se retire du loader (et, pour une installation de site, laisse le module de site
généré chargé). Voir [Référence des modules](/fr/reference/modules) et
[Construire un site](/fr/guide/build-a-site).

## Services clés

Enregistrés dans `config/module.config.php` sous les `aliases` du `service_manager` :

| Alias de service | Rôle |
| --- | --- |
| `InstallerHelper` (`InstallHelperService`) | Aides système et installation : `checkMysqlConnection()`, `isExtensionsExists()`, `checkEnvironmentVariables()`, `importSql()` / `getSqlFileTables()`, `isDbTableExists()` / `dropDbTable()`, `filePermission()` / `isDirWritable()`, `xcopy()` / `deleteDirectory()`, `getAvailableModules()`, `getPackagistMelisModules()` / `getPackagistMelisSites()`. |
| `MelisInstallerModulesService` | Découverte des modules et loader : `getAllModules()`, `getVendorModules()`, `getUserModules()`, `getModulesAndVersions()`, `getModulePath()`, `getDependencies()` / `getChildDependencies()`, et `createModuleLoader()` qui (ré)écrit `config/melis.module.load.php`. |
| `MelisInstallerConfig` (`MelisInstallerConfigService`) | Lit l'arbre de configuration applicative fusionné (le tableau `plugins`) par melisKey / chemin : `getItem()`, `getItemPerPlatform()`, `getMelisKeys()`, plus les aides de fusion de formulaires (`getFormMergedAndOrdered()`). |
| `MelisInstallerTranslation` (`MelisInstallerTranslationService`) | Fournit les messages de traduction de l'installateur à l'UI JS : `getTranslationMessages()`, `getTranslationsLocale()`, `getDateFormat()`. |

Le module enregistre également des factories d'éléments de formulaire (`MelisSelect`, `MelisText`,
`MelisInstallerLanguageSelect`, `MelisInstallerWebOptionSelect`) et un `MelisPasswordValidator`.

## Back-office

`MelisInstaller` n'ajoute **pas** d'outil de back-office — il s'exécute avant que le back-office
n'existe. Ses routes vivent sous `/melis/` et ciblent deux contrôleurs :

| Route | Contrôleur / action |
| --- | --- |
| `/` et `/melis/setup` | `MelisInstaller\Controller\Installer` → `indexAction` (l'UI de l'assistant) |
| `/melis/get-translations` | `MelisInstaller\Controller\Translation` → `getTranslation` (chaînes UI en JSON) |

`InstallerController` expose les actions AJAX appelées par l'assistant, par ex.
`checkSysConfigAction`, `checkApacheSetupAction`, `checkFileSystemRightsAction`,
`testDatabaseConnectionAction`, `newEnvironmentAction`, `addModulesToComposerAction`,
`downloadModulesAction`, `activateModulesAction`, `execDbDeployAction`, `installSiteModuleAction`,
`finalizeSetupAction` et `rollBackAction`.

## Front-office

`MelisInstaller` ne fournit aucun plugin de templating ni plugin de tableau de bord. Ses seuls
view helpers sont des rendus de formulaire internes utilisés par les `.phtml` de l'assistant
(`MelisFieldCollection` / `melisFieldCollection`, `MelisFieldRow`).

## Événements

Le module attache deux listeners (dans `src/Module.php`) qui finalisent l'installation :

| Listener | Événement | Rôle |
| --- | --- | --- |
| `MelisInstallerNewPlatformListener` | `melis_install_new_platform_start` | Construit la configuration des environnements / domaines de site dans le conteneur de session `melisinstaller`. |
| `MelisInstallModuleConfigListener` | `melis_installer_last_process_start` | Génère les modèles de configuration d'environnement de `etc/MelisModuleConfig/` dans le module `MelisModuleConfig` généré. |

## Tables de base de données

`MelisInstaller` ne définit **aucune** table `melis_*` propre. Pendant l'installation, il
*amorce* la base de données de la plateforme : il importe le SQL du squelette (via
`InstallerHelper::importSql()`) et exécute les deltas versionnés via `MelisDbDeploy`
(`execDbDeployAction`). Les tables créées appartiennent aux modules installés (`melis-core`,
`melis-cms`, …), pas à l'installateur.

## Exemple

Découvrir les modules installables et le loader de modules depuis les services de l'installateur :

```php
$modulesSvc = $sm->get('MelisInstallerModulesService');

$all = $modulesSvc->getAllModules();                 // modules utilisateur + melisplatform-modules composer
$deps = $modulesSvc->getDependencies('MelisCms');    // ['MelisCore', 'MelisEngine', ...]

// (ré)écrire config/melis.module.load.php avec un ensemble de modules choisi
$modulesSvc->createModuleLoader('config/', ['MelisCore', 'MelisEngine', 'MelisFront']);
```

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Bootstrap (gating des routes, auto-déchargement) | `vendor/melisplatform/melis-installer/src/Module.php` |
| Config module + services/routes | `vendor/melisplatform/melis-installer/config/module.config.php` |
| Loader minimal pour l'assistant | `vendor/melisplatform/melis-installer/config/module.load.php` |
| Assets/interface de l'installateur | `vendor/melisplatform/melis-installer/config/app.interface.php` |
| Contrôleur de l'assistant | `vendor/melisplatform/melis-installer/src/Controller/InstallerController.php` |
| Contrôleur de traduction | `vendor/melisplatform/melis-installer/src/Controller/TranslationController.php` |
| Aides système / installation | `vendor/melisplatform/melis-installer/src/Service/InstallHelperService.php` |
| Découverte des modules & écriture du loader | `vendor/melisplatform/melis-installer/src/Service/MelisInstallerModulesService.php` |
| Lecteur de l'arbre de config | `vendor/melisplatform/melis-installer/src/Service/MelisInstallerConfigService.php` |
| Listeners de finalisation | `vendor/melisplatform/melis-installer/src/Listener/` |
| Modèles de config d'environnement | `vendor/melisplatform/melis-installer/etc/MelisModuleConfig/` |
| Vues de l'assistant | `vendor/melisplatform/melis-installer/view/melis-installer/installer/` |
