# MelisCmsUserAccount

> Système de comptes visiteurs front-office — inscription, connexion et profils par site pour les membres d'un site web.
> Package `melisplatform/melis-cms-user-account`.

## Présentation

MelisCmsUserAccount gère les comptes des **visiteurs de site** (front-office) — les personnes qui s'inscrivent et se connectent sur vos sites CMS. Ces comptes sont distincts des comptes du personnel back-office gérés par MelisCore. Les comptes sont limités **par site** (une même personne peut détenir des comptes sur plusieurs sites). Le module fournit deux plugins de page déposables (formulaire de connexion et formulaire d'inscription), un outil d'administration back-office, et un pipeline GDPR complet couvrant l'information sur les données, l'export des données, la suppression anonymisée, ainsi qu'un workflow automatique de purge des comptes inactifs. Au démarrage, il ajoute également des colonnes de clé étrangère aux tables blog/actualités/commentaires afin qu'un seul passage GDPR puisse exposer, exporter ou effacer tout ce qu'un utilisateur possède dans ces modules.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsUserAccount',
];
```

Dépendances Composer : `melisplatform/melis-core ^5.2` (framework GDPR, sessions, outils BO) et
`melisplatform/melis-cms ^5.2` (hôte de pages/plugins). `melis-engine` et `melis-front` sont tirés
transitivement pour le rendu front-office.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsUserAccountService` | Service principal — également aliasé **`FrontUserAccountService`**. CRUD pour les utilisateurs du site et authentification. |
| `MelisCmsUserAccountGdprAutoDeleteService` | Logique du pipeline de suppression automatique des comptes inactifs (avertissements + anonymisation). |
| `FrontUserAccountTable` | Passerelle de table pour `melis_cms_user_account`. |
| `MelisCmsUserSitesTable` | Passerelle de table pour `melis_cms_user_account_sites`. |
| `MelisPasswordValidator` | Validateur de politique de mot de passe appliqué à l'inscription et à la sauvegarde du profil. |

Méthodes principales de `MelisCmsUserAccountService` (aliasé `FrontUserAccountService`) :

```php
$svc = $sm->get('FrontUserAccountService');

// Authenticate a site visitor
$result = $svc->siteUserAuthenticate($login, $password, $siteId);

// Create a new account
$id = $svc->createUser($data);

// Fetch by various keys
$user = $svc->getUserById($id);
$user = $svc->getUserByLogin($login);
$user = $svc->getUserByEmailAndPassword($email, $password);

// Persist profile changes
$svc->saveUserAccountData($id, $data);

// Site memberships for a user
$sites = $svc->getUsersSitesByUserId($id);

// Record a login timestamp (used by the auto-delete pipeline)
$svc->updateUserConnectionDate($id);
```

Il est également possible de déclencher l'événement `site_user_account_authentication` et de laisser
`MelisCmsUserAccountSiteUserAuthenticationListener` appeler `siteUserAuthenticate()` ; l'utilisateur
authentifié est ensuite stocké dans un `Laminas\Session\Container` indexé par site.

## Back-office

L'outil **Users FO** est accessible sous **MelisCms → Users FO** (clé de menu
`melis_cms_user_account_tool_display`, icône `fa-user`). Il fournit une liste consultable et filtrable de
tous les utilisateurs du site, tous sites confondus.

Colonnes : **Id · Statut · Admin · Photo · Email · Login · Nom complet · Date de création · Action**.  
Filtres : Afficher (taille de page) · Site · Admin · Recherche — plus un bouton **+ Nouvel utilisateur**.

Chaque ligne expose trois actions :

| Action | Description |
| --- | --- |
| Voir les sites | Fenêtre modale affichant, par site, le module associé, la date d'inscription, la date de dernière connexion et les domaines du site. |
| Modifier | Ouvre l'onglet **Utilisateur** avec tous les champs du profil (Statut, Admin, Email, Langue, Prénom, Nom, Date de naissance, Photo, Sites). `ID` et `Login` sont en lecture seule. Les champs mot de passe sont facultatifs — laisser vide pour conserver le mot de passe actuel. |
| Supprimer | Supprime l'utilisateur. |

**Contrôleur :** `MelisCmsUserAccountToolController`.

## Front office

Deux plugins de mise en page sont enregistrés dans `config/plugins/` :

| Plugin | Rendu | Options principales |
| --- | --- | --- |
| `MelisCmsUserAccountLoginPlugin` | Formulaire de connexion (et contrôle de déconnexion lorsque l'utilisateur est déjà authentifié). | `template_path`, `page_id_registration_page` |
| `MelisCmsUserAccountUserRegisterPlugin` | Formulaire d'inscription (nom d'utilisateur, email, mot de passe ×2, prénom/nom, photo, langue). | `template_path`, `page_id_login_page`, `force_joint_accounts` |

`force_joint_accounts` sur le plugin d'inscription réutilise un compte existant inter-sites ; l'appartenance
au site est stockée dans `melis_cms_user_account_sites`.

Les deux plugins sont servis par **`MelisCmsUserAccountPluginController`** :

| Action | Rôle |
| --- | --- |
| `authenticateUserAction()` | Authentifier `login`/`password`/`siteId` et ouvrir la session. |
| `logoutUserAction()` | Fermer la session de l'utilisateur du site. |
| `createUserAction()` | Valider et créer un utilisateur (inclut le téléversement de photo). |
| `getRegistrationFormAction()` | Retourner le formulaire d'inscription (pour la permutation connexion↔inscription). |
| `getTranslationsAction()` | Chaînes de traduction côté front. |

> Il n'existe pas d'action de récupération/réinitialisation de mot de passe ni d'activation par email dans le contrôleur de plugin.
> Construire ces fonctionnalités par-dessus `FrontUserAccountService` si nécessaire.

## Tables de base de données

| Table | PK | Contenu |
| --- | --- | --- |
| `melis_cms_user_account` | `uac_id` | Utilisateur du site : `uac_login`, `uac_email`, `uac_password`, `uac_firstname`, `uac_lastname`, `uac_picture`, `uac_status`, `uac_admin`, `uac_birthday`, `uac_lang_id`, `uac_date_creation`. |
| `melis_cms_user_account_sites` | `uacs_id` | Table de jointure utilisateur ↔ site : `uacs_uac_id`, id du site, `uacs_anonymized` (indicateur GDPR par site). |

`MelisCmsUserAccountAddCustomFieldsTableListener` (déclenché au démarrage) ajoute des colonnes FK `*_author_account`
aux tables blog/actualités/commentaires, crée `melis_cms_user_account_sites`, et migre la colonne
héritée `uac_site_id`. L'opération est idempotente (vérification de l'existence des colonnes).

## GDPR

### Information / extraction / suppression manuelle (ensembles 1+2)

Neuf listeners répondent à trois événements MelisCore :

| Événement | Listener compte | Listener blog | Listener commentaires |
| --- | --- | --- | --- |
| `melis_core_gdpr_user_info_event` | `…GdprUserInfoListener` | `…BlogGdprUserInfoListener` | `…CommentsGdprUserInfoListener` |
| `melis_core_gdpr_user_extract_event` | `…GdprUserExtractListener` | `…BlogGdprUserExtractListener` | `…CommentsGdprUserExtractListener` |
| `melis_core_gdpr_user_delete_event` | `…GdprUserDeleteListener` | `…BlogGdprUserDeleteListener` | `…CommentsGdprUserDeleteListener` |

Les listeners Blog et Commentaires sont actifs uniquement lorsque `MelisCmsBlog` / `MelisCmsComments` sont installés.
La suppression anonymise la ligne du compte et définit `uacs_anonymized`. Les correspondances de champs et les seuils
de rétention sont définis dans `config/app.gdpr.php`.

### Pipeline automatique de comptes inactifs (ensemble 3)

Six listeners se connectent au planificateur de suppression automatique de MelisCore :

| Étape | Listener | Événement | Effet |
| --- | --- | --- | --- |
| 1. Enregistrer | `…GdprAutoDeleteModuleListListener` | `melis_core_gdpr_auto_delete_modules_list` | Déclarer le module au planificateur. |
| 2. Tags | `…GdprAutoDeleteTagsListListener` | `MelisCoreGdprAutoDeleteService::TAGS_EVENT` | Enregistrer les tags/catégories d'inactivité. |
| 3. Premier avertissement | `…GdprAutoDeleteWarningListUsersListener` | `MelisCoreGdprAutoDeleteService::WARNING_EVENT` | Envoyer le premier email d'avertissement aux utilisateurs dormants. |
| 4. Deuxième avertissement | `…GdprAutoDeleteSecondWarningListUsersListener` | `MelisCoreGdprAutoDeleteService::SECOND_WARNING_EVENT` | Envoyer le deuxième email d'avertissement aux utilisateurs toujours dormants. |
| 5. Supprimer | `…GdprAutoDeleteActionDeleteUserListener` | `MelisCoreGdprAutoDeleteService::DELETE_ACTION_EVENT` | Anonymiser les comptes sans réponse. |
| (journal) | `…GdprAutoDeleteGetEmailListener` | `melis_core_gdpr_auto_delete_log_get_user_email` | Résoudre l'email pour le journal d'audit (ignore les comptes déjà anonymisés). |

La « dernière activité » est suivie par `updateUserConnectionDate()`.

## Listeners inter-modules

Enregistrés dans `Module.php` au démarrage :

| Listener | Événement | Fonction |
| --- | --- | --- |
| `MelisCmsUserAccountSiteUserAuthenticationListener` | `site_user_account_authentication` | Point d'entrée d'authentification FO → `siteUserAuthenticate()` ; stocke l'utilisateur dans un `Laminas\Session\Container` indexé par site. (priorité `-1001`) |
| `MelisCmsUserAccountLoginFormListener` | `melis_cms_user_account_login_form` | Injecter le membre connecté dans le formulaire de commentaire (champs cachés `mccom_user_acct`/`mccom_site_id`, bouton de déconnexion, nom issu du compte) ; supprimer les champs nom/email pour les utilisateurs anonymes. |
| `MelisCmsUserAccountCommentsFormModificationListener` | `meliscmsuseraccount_comments_form_modification_listener` | Réordonner les éléments du formulaire de commentaire selon un ordre demandé. |
| `MelisCmsUserAccountAddAuthorPicture` | `melis_cms_user_account_add_user_picture` | Afficher la `uac_picture` du membre à côté de son commentaire (URI de données base64). |
| `MelisCmsUserAccountSaveUserAccountListenter` | `meliscmsnews_get_postvalues` | Persister `cnews_author_account` / `cnews_comments_require_account` lors de la sauvegarde d'une actualité. |
| `MelisCmsUserAccountAddCustomFieldsTableListener` | `meliscms_user_account_add_custom_fields_table` | Migration au démarrage : ajouter les colonnes FK aux tables blog/actualités/commentaires, créer la table de jointure des sites, migrer les données héritées. |
| `MelisCmsUserAccountFlashMessengerListener` | `meliscms_user_account_tooluser_save`, `meliscms_user_account_tooluser_delete` | Messages flash BO lors de la sauvegarde/suppression. |

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Entrée de menu BO | `vendor/melisplatform/melis-cms-user-account/config/app.interface.php` |
| Datatable BO (colonnes, filtres, modales) | `vendor/melisplatform/melis-cms-user-account/config/app.tools.php` |
| Tous les formulaires (FO + BO) | `vendor/melisplatform/melis-cms-user-account/config/app.forms.php` |
| Correspondances de champs GDPR + seuils de rétention | `vendor/melisplatform/melis-cms-user-account/config/app.gdpr.php` |
| Points d'intégration des commentaires | `vendor/melisplatform/melis-cms-user-account/config/comments.php` |
| Endpoints microservice REST | `vendor/melisplatform/melis-cms-user-account/config/app.microservice.php` |
| Routes, alias de services, plugins, validateurs | `vendor/melisplatform/melis-cms-user-account/config/module.config.php` |
| Config du plugin de connexion | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountLoginPlugin.config.php` |
| Config du plugin d'inscription | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountUserRegisterPlugin.config.php` |
| Contrôleur de l'outil BO | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountToolController.php` |
| Contrôleur du plugin FO | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountPluginController.php` |
| Service principal | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountService.php` |
| Service de suppression automatique | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountGdprAutoDeleteService.php` |
| Validateur de mot de passe | `vendor/melisplatform/melis-cms-user-account/src/Validator/MelisPasswordValidator.php` |
| Passerelles de tables DB | `vendor/melisplatform/melis-cms-user-account/src/Model/Tables/` |
| Listeners | `vendor/melisplatform/melis-cms-user-account/src/Listener/` |
| Bootstrap / injection de colonnes | `vendor/melisplatform/melis-cms-user-account/src/Module.php` |

Voir aussi : [MelisCore](/reference/modules/melis-core) · [MelisCms](/reference/modules/melis-cms) · [MelisCmsComments](/reference/modules/melis-cms-comments) · [MelisCmsBlog](/reference/modules/melis-cms-blog) · [MelisCmsNews](/reference/modules/melis-cms-news)
