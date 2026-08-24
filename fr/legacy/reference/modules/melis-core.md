# MelisCore

> La fondation du back-office sur laquelle repose chaque autre module : connexion, utilisateurs/rôles/droits, le framework de menu
> et d'outils (DataTable), tableau de bord, configuration, e-mail, RGPD, et le système de services + événements de base.
> Paquet `melisplatform/melis-core`.

## Présentation

`MelisCore` est le cœur du back-office de Melis Platform. Il fournit la coquille de l'application (en-tête,
menu gauche, arbre des outils, tableau de bord, pied de page), l'arbre de configuration `MelisCoreConfig` qui
agrège tous les fichiers `app.*.php` de chaque module, l'authentification et les droits par outil, la gestion
des utilisateurs, la gestion des plateformes/environnements, les e-mails transactionnels, les outils RGPD, un
point d'entrée d'authentification micro-service, et la couche partagée de services/événements que chaque autre
module étend. Tous les modules `melisplatform/*` en dépendent.

## Activation

Ajouter dans `config/modules.config.php` :

```php
return [
    'MelisCore',
    // … autres modules …
];
```

Il doit être chargé tôt — la plupart des autres modules appellent ses services. Ses modules d'infrastructure
complémentaires sont [MelisAssetManager](/fr/legacy/reference/modules), [MelisDbDeploy](/fr/legacy/reference/modules),
[MelisComposerDeploy](/fr/legacy/reference/modules) et [MelisInstaller](/fr/legacy/reference/modules).

## Services principaux

Enregistrés comme alias du `service_manager` dans
`vendor/melisplatform/melis-core/config/module.config.php` :

| Alias de service | Rôle |
| --- | --- |
| `MelisCoreConfig` | Arbre de configuration à l'exécution. Lit n'importe quelle config `app.*` agrégée par chemin : `getItem('/meliscore/interface/…')`, `getItemPerPlatform('/meliscore/datas/')`, `getFormMergedAndOrdered(…)`, `setFormFieldRequired(…)`. |
| `MelisCoreAuth` | Authentification du back-office (étend Laminas auth). `hasIdentity()`, `getIdentity()` (la ligne `melis_core_user`), `getAuthRights()` (XML des droits), `encryptPassword()`, `isPasswordCorrect()`. |
| `MelisCoreRights` | Contrôle d'accès par outil. `canAccess($melisKey)`, `isAccessible($xmlRights, $sectionId, $itemId)`, `getRightsValues($id, $isRole)`, `createXmlRightsValues(…)`, `getToolSectionMap()`. |
| `MelisCoreTool` | Assistant d'outil back-office pour les contrôleurs. `setMelisToolKey($plugin, $toolKey)`, `getColumns()`, `getForm($formKey)`, `getDataTableConfiguration(…)`, `getSearchableColumns()`. |
| `MelisCoreDispatch` | Chaîne les dispatches de contrôleurs en accumulant `[success, errors, datas]` pour les sauvegardes multi-étapes. |
| `MelisCoreTranslation` | Charge et fusionne les traductions d'interface/formulaire `tr_*` par locale. |
| `MelisCoreBOEmailService` | Modèles d'e-mails back-office : `sendBoEmailByCode($code, $tags, $toEmail, $toName, $langId)`, `getBoEmailByCode()`, `saveBoEmailByCode()`, `deleteEmail()`. |
| `MelisCoreEmailSendingService` | Envoi d'e-mails bas niveau : `sendEmail($fromEmail, $fromName, $toEmail, $toName, $replyTo, $subject, $htmlBody, $textBody, $transportConfig)`. |
| `MelisCoreGdprService` | Accès/effacement des données RGPD (diffuse des événements) : `getUserInfo()`, `extractSelected()`, `deleteSelected()`. |
| `MelisCoreGdprAutoDeleteService` | Moteur de rétention des données planifié : `run()`, `getFirstAlertUsers()`, `getSecondAlertUsers()`, `getSmtpConfigData()`. |
| `MelisGeneralService` | Classe de base dont héritent la plupart des services de la plateforme — fournit `makeArrayFromParameters()`, `sendEvent()`, `getServiceManager()`. |

## Back-office

`MelisCore` fournit l'intégralité de la coquille du back-office et la section *Configuration du système* de
l'arbre des outils, ainsi que :

| Outil (préfixe melisKey) | Présentation |
| --- | --- |
| Utilisateurs (`meliscore_tool_user`) | Créer et modifier les utilisateurs back-office ; assigner des rôles et des droits par outil ; consulter l'historique des connexions ; générer des clés API. |
| Plateformes | Déclarer les environnements (dev / pré-prod / production) et définir le schéma de couleurs par plateforme. |
| Langues | Gérer les locales du back-office. |
| Gestion des e-mails | Créer/modifier les modèles d'e-mails transactionnels avec un corps par langue et des espaces réservés `[TAG]`. |
| Logs | Journal d'actions consultable, filtrable par type, utilisateur et date. |
| Autre configuration | Politique de mot de passe/sécurité : expiration, seuil de verrouillage, historique des mots de passe. |
| RGPD | Rechercher une personne, consulter les données détenues, anonymiser, configurer le SMTP pour les notifications RGPD ; moteur de suppression automatique piloté par cron séparé. |
| Modules / Marketplace | Installer, mettre à jour ou supprimer des modules et gérer le bundle d'assets de production. |
| Annonces | Créer des annonces back-office affichées sur le tableau de bord. |

### Arbre d'interface (app.interface.php) — la colonne vertébrale du back-office

L'intégralité du back-office — chaque outil, onglet, modale, entrée de menu — est décrite sous la forme d'un
seul arbre imbriqué de **nœuds d'interface**, fusionné en profondeur depuis le fichier `config/app.interface.php`
de chaque module. Chaque nœud possède :

- **`conf`** — `melisKey` (unique, préfixé par le module), `id` DOM, `name` de traduction, `icon`,
  `rightsDisplay`.
- **`forward`** — l'action du contrôleur qui rend la zone (`module`, `controller`, `action`,
  `jscallback` optionnel).
- **`interface`** — nœuds enfants (récursif).

`melisKey` est l'identifiant stable utilisé pour les vérifications de droits, les rechargements de zones et
l'adressage DOM. Les droits sont stockés sous la forme d'un arbre XML dans `melis_core_user.usr_rights` ;
tout ce qui n'est pas accordé est masqué.

Branches principales de la coquille : `meliscore_header`, `meliscore_leftmenu`, `meliscore_center`,
`meliscore_footer`, et `meliscore_toolstree_section` (l'arbre des outils groupés).

### Framework d'outils (DataTable) (app.tools.php)

Chaque outil de liste est déclaré dans le fichier `config/app.tools.php` d'un module et rendu via
`MelisCoreTool` + le view helper `MelisDataTable`. La déclaration couvre les colonnes, les filtres,
les champs de recherche, les boutons d'action, les modales et les formulaires.

### Système d'événements

`MelisGeneralService` déclenche des événements `*_start` / `*_end` autour de chaque méthode de service,
permettant à n'importe quel module d'intercepter. Connectez-vous via le gestionnaire d'événements partagé :

```php
$sm->get('SharedEventManager')->attach(
    'MelisCore',
    'meliscore_tooluser_savenew_end',
    function ($e) { $p = $e->getParams(); /* react */ },
    100
);
```

Événements principaux : `meliscore_tooluser_savenew_start/end`, `…delete_start/end`, `…save_start/end`,
`melis_core_check_user_rights`, `meliscore_install_create_new_user`, `melis_core_new_platform`, et
les événements RGPD (`melis_core_gdpr_user_info_event`, `…_extract_event`, `…_delete_event`,
`melis_core_gdpr_auto_delete*`).

### Helpers JS

Disponibles globalement via `melisHelper` (`public/js/core/melisHelper.js`) :

`zoneReload(melisKey, params)`, `createModal(zoneId, modalKey, …)`,
`melisOkNotification(title, msg)` / `melisKoNotification(…)`,
`tabOpen()` / `tabClose()` / `tabSwitch()`,
`loadingZone(sel)` / `removeLoadingZone(sel)`,
`melisTinyMCE.createTinyMCE('tool', sel, {})`.

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_core_user` | Utilisateurs back-office (login, hash du mot de passe, XML `usr_rights`, indicateur admin, langue, rôle). |
| `melis_core_user_role` | Rôles et leur XML `urole_rights`. |
| `melis_core_user_connection_date` | Historique des connexions. |
| `melis_core_lang` | Langues du back-office. |
| `melis_core_platform` | Environnements/plateformes. |
| `melis_core_bo_emails` / `_details` | Modèles d'e-mails transactionnels et corps par langue. |
| `melis_core_log` / `_log_type` / `_log_type_trans` | Journal d'actions, types et traductions. |
| `melis_core_lost_password` | Jetons de réinitialisation de mot de passe. |
| `melis_core_user_connection_date` | Historique des connexions par utilisateur. |
| `melis_core_microservice_auth` | Clés API pour les points d'entrée micro-service. |
| `melis_core_dashboards` / `_dashboard_schema` | Disposition du tableau de bord par utilisateur. |
| `melis_core_plugins` | Plugins enregistrés. |
| `melis_core_gdpr_delete_config` / `_delete_emails_logs` | Règles de suppression automatique RGPD et piste d'audit. |
| `melis_user_password_history` | Historique des mots de passe (prévention de réutilisation). |
| `melis_announcement` | Annonces du back-office. |

## Exemple

Envoyer un e-mail back-office via le système de modèles, vérifier un droit et appeler une méthode de service
avec le pattern d'événement :

```php
// Envoyer un e-mail basé sur un modèle (B7)
$boEmail = $sm->get('MelisCoreBOEmailService');
$boEmail->sendBoEmailByCode(
    'MYMODULE_WELCOME',
    ['USER_NAME' => 'John', 'SITE_NAME' => 'Acme'],
    'john@doe.com',
    'John Doe',
    $langId
);

// Vérifier un droit avant d'agir (B0f)
$rights = $sm->get('MelisCoreRights');
if (! $rights->canAccess('melismymodule_tool')) {
    // accès refusé
}

// Lire une valeur de config par plateforme (B0i)
$config  = $sm->get('MelisCoreConfig');
$merged  = $config->getItemPerPlatform('/meliscore/datas/');
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Amorçage du module | `vendor/melisplatform/melis-core/src/Module.php` |
| Routes, services, contrôleurs, view helpers | `vendor/melisplatform/melis-core/config/module.config.php` |
| Coquille back-office & arbre des outils (interface) | `vendor/melisplatform/melis-core/config/app.interface.php` |
| Déclarations d'outils DataTable | `vendor/melisplatform/melis-core/config/app.tools.php` |
| Points d'entrée micro-service | `vendor/melisplatform/melis-core/config/app.microservice.php` |
| Services | `vendor/melisplatform/melis-core/src/Service/` |
| Contrôleurs | `vendor/melisplatform/melis-core/src/Controller/` |
| Passerelles de tables | `vendor/melisplatform/melis-core/src/Model/Tables/` |
| Listeners | `vendor/melisplatform/melis-core/src/Listener/` |
| SQL d'installation & migrations | `vendor/melisplatform/melis-core/install/` |
| Traductions | `vendor/melisplatform/melis-core/language/` |

Voir aussi : [Référence des modules](/fr/legacy/reference/modules), [Créer un outil](/fr/legacy/guide/create-a-tool),
[Plugins](/fr/legacy/guide/plugins)
