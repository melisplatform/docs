# MelisCore

> Le cœur de la plateforme : la coquille du backoffice, l'arbre de configuration, l'authentification,
> les droits, les utilisateurs, les logs, les événements et la couche de services sur laquelle
> reposent tous les autres modules. Paquet `melisplatform/melis-core`.

## Objectif

`MelisCore` est le module fondateur de Melis Platform. Il fournit la coquille de l'application
backoffice, l'arbre de configuration `MelisCoreConfig` qui agrège les fichiers `app.*.php` de chaque
module, l'authentification et les droits par outil, la gestion des utilisateurs, le sous-système de
logs, le tableau de bord (widgets), la gestion des plateformes/environnements, la suppression
automatique RGPD, un point d'entrée d'authentification micro-service, ainsi que la couche partagée
de services et de view helpers consommée par les autres modules. Presque tous les modules
`melisplatform/*` en dépendent.

## L'activer

`MelisCore` est un module Laminas standard. Il est chargé par le `config/melis.module.load.php` du
squelette :

```php
return [
    'MelisCore',
    // … autres modules …
];
```

Il doit être chargé tôt — la plupart des modules appellent ses services. Ses propres dépendances
composer tirent [`melis-asset-manager`](/fr/reference/modules), `melis-composerdeploy` et
`melis-dbdeploy`, et il charge automatiquement les composants Laminas dont il a besoin
(`Laminas\I18n`, `Laminas\Router`, `Laminas\Form`, `Laminas\Db`, `Laminas\Cache`, …) via son
`config/module.load.php`.

## Services clés

Enregistrés comme alias du `service_manager` dans
`vendor/melisplatform/melis-core/config/module.config.php` :

| Alias de service | Rôle |
| --- | --- |
| `MelisCoreConfig` | L'arbre de configuration. Lit n'importe quelle config `app.*` agrégée par chemin avec `getItem('meliscore/datas/…')` ; `getMelisKeys()` / `getMelisKeyData()` résolvent les `melisKey` ; `getItemPerPlatform()`, `getFormMergedAndOrdered()`. |
| `MelisCoreAuth` | Authentification du backoffice. `getAuthRights()` renvoie le XML des droits de l'utilisateur connecté. |
| `MelisCoreRights` | Contrôle d'accès par outil. `isAccessible($xmlRights, $sectionId, $itemId)`, `getRightsValues($userId)`, `createXmlRightsValues($userId, $datas)`. |
| `MelisCoreUser` | Aides utilisateur : `getUserXmlRights()`, `isItemRightChecked()`, `getUserConnectionData()`, `getUserLastLoggedInDate()`. |
| `MelisCoreDispatch` | Liaison de dispatch des plugins front/back : `dispatchPluginAction($e, $nameContainer, $nameVarSession, $controller, $vars)`. |
| `MelisCoreTool` | L'assistant d'outil backoffice utilisé par les contrôleurs d'outils (colonnes, formulaires, modales, config DataTable, export CSV). Voir [Créer un outil](/fr/guide/create-a-tool). |
| `MelisCoreLogService` | Journal d'activité : `logAction()`, `saveLog()`, `getLogList()`, `getLogType()`, traductions des types de log. |
| `MelisCoreDashboardService` | Construit le tableau de bord backoffice à partir de ses plugins enregistrés. |
| `MelisCoreTranslation` | Charge/fusionne les traductions des modules. |
| `MelisCoreFlashMessenger` | Messages flash inter-requêtes. |
| `MelisCoreImage` | Aide à la manipulation d'images. |
| `MelisCoreLostPassword` / `MelisCoreCreatePassword` / `MelisPasswordSettingsService` | Flux de mot de passe perdu, liens de création de compte et politique/historique de mots de passe. |
| `MelisCoreEmailSendingService` / `MelisCoreBOEmailService` | Modèles d'e-mails backoffice et envoi. |
| `ModulesService` (`MelisCoreModulesService`) | Liste/active/désactive les modules de la plateforme. |
| `MelisCorePlatformSchemeService` | Gestion des schémas de plateforme (environnement). |
| `MelisCoreGdprService` / `MelisCoreGdprAutoDeleteService` | Traitement RGPD des données et suppression automatique planifiée. |
| `MelisCorePluginsService` / `MelisCoreDashboardPluginsService` | Enregistrement et droits des plugins et plugins de tableau de bord. |
| `MelisCoreCacheSystemService` | Aides de lecture/écriture du cache. |
| `MelisCoreAnnouncementService` | Annonces du backoffice : `getLists()`, `saveAnnouncement()`, `deleteAnnouncement()`. |
| `MelisGeneralService` / `MelisCoreFormService` | Utilitaires généraux et construction/fusion de formulaires. |

Une fabrique abstraite (`MelisCore\Factory\MelisAbstractFactory`) et des alias par table
(`MelisCoreTableUser`, `MelisCoreTableLog`, …) sont également enregistrés.

## Backoffice

`MelisCore` injecte la section **Système** en haut de l'arbre des outils du backoffice
(`config/app.toolstree.php`, `melisKey` de section `meliscore_toolstree_section`), notamment :

| Outil (melisKey) | Contrôleur | Objectif |
| --- | --- | --- |
| `meliscore_tool_system_config` | `MelisCore\Controller\MelisCoreOtherConfig` | Configuration système. |
| `meliscore_tool_user_module_management` | `MelisCore\Controller\Modules` | Activer/désactiver et réordonner les modules. |
| `meliscore_tool_platform` | `MelisCore\Controller\Platforms` | Déclarer les plateformes/environnements (local, pré-prod, prod). |
| `meliscore_tool_emails_mngt` | `MelisCore\Controller\EmailsManagement` | Gestion des modèles d'e-mails backoffice. |
| `meliscore_tool_phpunit` | `MelisCore\Controller\MelisPhpUnitTool` | Exécuter les suites de tests des modules. |

La gestion des utilisateurs passe par `MelisCore\Controller\User` / `ToolUser` (l'outil
Utilisateurs), et la suppression automatique RGPD par `MelisCore\Controller\MelisCoreGdprAutoDelete*`.
Le tableau de bord est servi par `MelisCore\Controller\Dashboard` / `DashboardPlugins`.

### Plugins de tableau de bord

`MelisCore` fournit le framework du tableau de bord (widgets backoffice) et plusieurs widgets
intégrés, chacun avec un fichier de config sous `config/dashboard-plugins/` :

`MelisCoreDashboardAnnouncementPlugin`, `MelisCoreDashboardBubbleNewsMelisPlugin`,
`MelisCoreDashboardBubbleUpdatesPlugin`, `MelisCoreDashboardBubbleNotificationsPlugin`,
`MelisCoreDashboardBubbleChatPlugin`, `MelisCoreDashboardRecentUserActivityPlugin`.

`MelisCoreDashboardTemplatingPlugin` est la classe de base dont hérite chaque widget backoffice —
voir [Plugins : templating & tableau de bord](/fr/guide/plugins).

## Front office

`MelisCore` est un module backoffice/plateforme, mais il enregistre des **view helpers** partagés
(dans `config/module.config.php`, section `view_helpers`) utilisés dans les deux offices :

| View helper | Rôle |
| --- | --- |
| `MelisGenericTable` | Affiche un tableau de données générique. |
| `MelisDataTable` | Aide à l'intégration DataTables. |
| `MelisModal` / `MelisModalInvoker` | Rendu/invocation des modales backoffice. |
| `MelisTextHelper` | Aide au formatage/échappement de texte. |
| `MelisCoreHeadPlugin` | Agrégation des scripts/styles d'en-tête pour la coquille. |
| `MelisDashboardDragDropZone` / `MelisCoreDashboardBubblePlugin` | Rendu des zones du tableau de bord. |
| `getMelisSectionIcons` | Résout les icônes des sections de l'arbre d'outils. |
| `MelisFieldCollection` / `MelisFieldRow` | Aides au rendu des formulaires. |

Il expose également un point d'entrée d'authentification micro-service (routes `microservice` /
`microservice_list`, contrôleur `MelisCore\Controller\MelisCoreMicroService`) adossé à
`melis_core_microservice_auth`.

## Tables de base de données

Créées par `install/sql/setup_structure.sql` et les deltas de `install/dbdeploy/` :

| Table | Contenu |
| --- | --- |
| `melis_core_user` | Utilisateurs du backoffice. |
| `melis_core_user_role` | Rôles / XML des droits utilisateur. |
| `melis_core_user_connection_date` | Historique des connexions. |
| `melis_core_user_password_history` | Historique de réutilisation des mots de passe (politique). |
| `melis_core_lost_password` / `melis_core_create_password` | Jetons de réinitialisation et de création de compte. |
| `melis_core_lang` | Langues du backoffice. |
| `melis_core_log` / `melis_core_log_type` / `melis_core_log_type_trans` | Journal d'activité + types & traductions. |
| `melis_core_platform` / `melis_core_platform_scheme` | Plateformes (environnements) et leurs schémas. |
| `melis_core_dashboards` | Disposition du tableau de bord par utilisateur. |
| `melis_plugins` | Plugins enregistrés. |
| `melis_core_announcement` | Annonces du backoffice. |
| `melis_core_bo_emails` / `melis_core_bo_emails_details` | Modèles d'e-mails backoffice. |
| `melis_core_microservice_auth` / `melis_core_microservice_logs` | Authentification micro-service & logs d'appels. |
| `melis_core_gdpr_delete_config` / `…_emails` / `…_emails_sent` / `…_emails_logs` / `…_emails_smtp` | Configuration de suppression automatique RGPD & suivi des e-mails. |

## Exemple

Lire une valeur de config, vérifier un droit et écrire une entrée de log depuis un contrôleur :

```php
$config  = $this->getServiceManager()->get('MelisCoreConfig');
$rights  = $this->getServiceManager()->get('MelisCoreRights');
$auth    = $this->getServiceManager()->get('MelisCoreAuth');
$logs    = $this->getServiceManager()->get('MelisCoreLogService');

$xmlRights = $auth->getAuthRights();
if ($rights->isAccessible($xmlRights, 'meliscore_toolstree_section', 'meliscore_tool_platform')) {
    $logs->logAction(/* … */);
}
```

## Fichiers clés

| Concern | Chemin |
| --- | --- |
| Amorçage du module | `vendor/melisplatform/melis-core/src/Module.php` |
| Config principale (services, contrôleurs, view helpers, routes) | `vendor/melisplatform/melis-core/config/module.config.php` |
| Arbre des outils backoffice | `vendor/melisplatform/melis-core/config/app.toolstree.php` |
| Config interface / formulaires / e-mails | `vendor/melisplatform/melis-core/config/app.interface.php`, `app.forms.php`, `app.emails.php` |
| Configs des plugins de tableau de bord | `vendor/melisplatform/melis-core/config/dashboard-plugins/` |
| Composants Laminas à charger | `vendor/melisplatform/melis-core/config/module.load.php` |
| Services | `vendor/melisplatform/melis-core/src/Service/` |
| Contrôleurs | `vendor/melisplatform/melis-core/src/Controller/` |
| Plugins de tableau de bord | `vendor/melisplatform/melis-core/src/Controller/DashboardPlugins/` |
| Passerelles de tables | `vendor/melisplatform/melis-core/src/Model/Tables/` |
| View helpers | `vendor/melisplatform/melis-core/src/View/Helper/` |
| SQL d'installation & deltas | `vendor/melisplatform/melis-core/install/sql/`, `install/dbdeploy/` |
| Traductions | `vendor/melisplatform/melis-core/language/` |

Voir aussi la [Référence des modules](/fr/reference/modules), [Créer un outil](/fr/guide/create-a-tool)
et [Plugins](/fr/guide/plugins).
