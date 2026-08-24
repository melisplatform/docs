# MelisInstaller

> L'assistant de configuration initiale de la plateforme — orchestre les vérifications système, la configuration de la base de données, le téléchargement et l'activation des modules. Paquet `melisplatform/melis-installer`.

## Présentation

MelisInstaller est un assistant web qui s'exécute sur un squelette Melis vierge avant que la plateforme ne soit entièrement configurée. Il guide l'utilisateur à travers les vérifications serveur (extensions PHP, modules Apache, variables d'environnement vhost, droits sur les répertoires), le test de connexion à la base de données, la sélection du type d'installation, le téléchargement des modules via Composer, l'import des tables de base de données via DbDeploy, la configuration par module, et l'installation finale. Une fois la configuration terminée, il n'est plus actif ; la gestion quotidienne des modules est assurée depuis l'outil Modules du back-office (MelisComposerDeploy).

## Activation

À ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisInstaller',
];
```

MelisInstaller requiert `melisplatform/melis-core` et `melisplatform/melis-engine` (`^5.2`) comme dépendances Composer. Durant le flux d'installation, il pilote **MelisComposerDeploy** (téléchargement des paquets) et **MelisDbDeploy** (imports des tables), et une fois les modules activés, **MelisAssetManager** sert leurs assets.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `InstallHelperService` | Vérifications système et base de données : contrôle des extensions requises, vérification des chemins accessibles en écriture, `checkMysqlConnection()`, adaptateur DB + amorçage SQL brut, et `isDbTableExists()` (détecte une installation partielle). Alimente les étapes 1 et 2 de l'assistant. |
| `MelisInstallerModulesService` | Découverte et sélection des modules : tous les modules / par vendeur / utilisateur / site / core, versions, chemins Composer. Alimente la liste de sélection de l'étape 3.1. |
| `MelisInstallerConfigService` | Lit et fusionne l'arbre de configuration de l'installateur avant que MelisCore ne soit pleinement disponible : `getItem()`, `getFormMergedAndOrdered()`. |
| `MelisInstallerTranslationService` | Fournit les messages de traduction de l'interface de l'assistant : `getTranslationMessages()`. Fonctionne avant que MelisCore ne soit disponible. |

Le module enregistre également des factories d'éléments de formulaire (`MelisSelect`, `MelisText`, `MelisInstallerLanguageSelect`, `MelisInstallerWebOptionSelect`) ainsi qu'un `MelisPasswordValidator` qui applique la politique de mot de passe administrateur lors de l'étape de configuration.

## Back-office

MelisInstaller n'ajoute pas d'outil de back-office. Il s'exécute avant que le back-office n'existe. Son interface est servie par deux contrôleurs :

| Contrôleur | Rôle |
| --- | --- |
| `InstallerController` | Pilote chaque étape de l'assistant : vérifications système, test DB, sélection du type d'installation, téléchargement Composer, import DbDeploy, activation des modules, configuration par module et installation finale. Expose également la `rollBackAction`. |
| `TranslationController` | Sert les chaînes de traduction propres à l'assistant (celui-ci s'exécute avant que les traductions de MelisCore ne soient disponibles). |

Deux listeners se branchent sur le processus d'installation :

| Listener | Rôle |
| --- | --- |
| `MelisInstallModuleConfigListener` | Gère l'écriture de la configuration des modules durant l'installation. |
| `MelisInstallerNewPlatformListener` | Gère la configuration de la nouvelle plateforme et de l'environnement. |

## Tables de base de données

MelisInstaller ne définit aucune table qui lui soit propre. Durant la configuration, il amorce la base de données de la plateforme en important du SQL et en exécutant des deltas versionnés via MelisDbDeploy. Les tables créées appartiennent aux modules installés (MelisCore, MelisCms, etc.).

## Exemple

```php
// Récupérer les modules installables et tester la connexion DB depuis un contrôleur
$helper = $serviceManager->get('InstallHelperService');
$connected = $helper->checkMysqlConnection($host, $dbName, $user, $password);

$modulesSvc = $serviceManager->get('MelisInstallerModulesService');
$allModules  = $modulesSvc->getAllModules();          // liste complète des modules découvrables
$versions    = $modulesSvc->getModulesAndVersions();  // nom → map de version installée
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Config module, routes, gestionnaire de services | `vendor/melisplatform/melis-installer/config/module.config.php` |
| Config des formulaires applicatifs | `vendor/melisplatform/melis-installer/config/app.forms.php` |
| Loader minimal de l'assistant | `vendor/melisplatform/melis-installer/config/module.load.php` |
| Contrôleur de l'assistant | `vendor/melisplatform/melis-installer/src/Controller/InstallerController.php` |
| Contrôleur de traduction | `vendor/melisplatform/melis-installer/src/Controller/TranslationController.php` |
| Aides système / DB / droits fichiers | `vendor/melisplatform/melis-installer/src/Service/InstallHelperService.php` |
| Service de découverte des modules | `vendor/melisplatform/melis-installer/src/Service/MelisInstallerModulesService.php` |
| Service de fusion de config | `vendor/melisplatform/melis-installer/src/Service/MelisInstallerConfigService.php` |
| Service de traduction | `vendor/melisplatform/melis-installer/src/Service/MelisInstallerTranslationService.php` |
| Validateur de mot de passe administrateur | `vendor/melisplatform/melis-installer/src/Validator/MelisPasswordValidator.php` |
| View helpers de formulaire de l'assistant | `vendor/melisplatform/melis-installer/src/Form/View/Helper/` |
| Listeners d'installation | `vendor/melisplatform/melis-installer/src/Listener/` |
| Vues de l'assistant | `vendor/melisplatform/melis-installer/view/` |
| Fichiers de langue | `vendor/melisplatform/melis-installer/language/` |

Voir aussi : [MelisCore](/fr/legacy/reference/modules/melis-core) · [MelisDbDeploy](/fr/legacy/reference/modules/melis-dbdeploy) · [MelisComposerDeploy](/fr/legacy/reference/modules/melis-composerdeploy) · [MelisAssetManager](/fr/legacy/reference/modules/melis-asset-manager)
