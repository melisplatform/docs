# MelisCmsUserAccount

> Système de comptes visiteurs front-office — inscription, connexion et profils par site pour les membres d'un site web, administrés depuis un outil back-office natif React. Package `melisplatform/melis-cms-user-account`.

## Présentation

MelisCmsUserAccount gère les comptes des **visiteurs de site** (front-office) — les personnes qui
s'inscrivent et se connectent sur vos sites CMS. Ces comptes sont distincts des comptes du personnel
back-office gérés par MelisCore. Les comptes sont limités **par site** (une même personne peut détenir
des comptes sur plusieurs sites). Le module fournit deux plugins de page déposables (formulaire de
connexion et formulaire d'inscription), un outil d'administration back-office, et un pipeline GDPR
complet couvrant l'information sur les données, l'export des données, la suppression anonymisée, ainsi
qu'un workflow automatique de purge des comptes inactifs. Au démarrage, il ajoute également des colonnes
de clé étrangère aux tables blog/actualités/commentaires afin qu'un seul passage GDPR puisse exposer,
exporter ou effacer tout ce qu'un utilisateur possède dans ces modules.

En v6, l'outil d'administration back-office (**Users FO**) est une **brique full-React native** — une
véritable interface CRUD React appelant une couche JSON `react-api` — dotée d'un bascule **New / Old**
qui rétablit l'outil hérité dans une iframe. Le framework, les services, les tables, la machinerie GDPR
et les plugins front-office sont inchangés ; seule l'interface d'administration est passée à React.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsUserAccount',
];
```

Dépendances Composer : `melisplatform/melis-core` (framework GDPR, sessions, outils BO) et
`melisplatform/melis-cms` (hôte de pages/plugins). `melis-engine` et `melis-front` sont tirés
transitivement pour le rendu front-office. L'outil React est découvert automatiquement dès que le module
est actif (il fournit un `brick.manifest.json`) ; retirer le module de `melis.module.load.php` fait
disparaître l'outil du back-office React.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsUserAccountService` | Service principal — également aliasé **`FrontUserAccountService`**. CRUD pour les utilisateurs du site et authentification. |
| `MelisCmsUserAccountGdprAutoDeleteService` | Logique du pipeline de suppression automatique des comptes inactifs (avertissements + anonymisation). |
| `FrontUserAccountTable` | Passerelle de table pour `melis_cms_user_account`. |
| `MelisCmsUserSitesTable` | Passerelle de table pour `melis_cms_user_account_sites`. |
| `MelisPasswordValidator` | Validateur de politique de mot de passe (min. 8 caractères, une minuscule, un chiffre) appliqué à l'inscription et à la sauvegarde du profil. |

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

## Back-office (React) — Users FO

L'outil **Users FO** réside dans le back-office React (`/melis-react`), sous le groupe **MelisCms** de la
barre latérale → **Utilisateurs FO** (« FO Users »). C'est une **brique full-React native** (et non une
iframe) montée sur la route d'arbre `/melis-cms/user-account` ; la clé de menu
`melis_cms_user_account_tool_display` en régit l'accès, les capacités et l'iframe de la vue Old. L'outil
administre **uniquement les utilisateurs du site** — jamais le personnel back-office (celui-ci relève de
l'outil **Users** de MelisCore).

Il s'agit d'une navigation à deux niveaux présentée via les **sous-onglets natifs** de l'hôte
(`subTabs: true`) : une **liste** à plat des utilisateurs du site, et un unique formulaire **Utilisateur**
ouvert par sous-onglet.

![Liste React Users FO — cartes KPI (Total / Actifs / Inactifs / Admins), recherche, filtres statut/admin/site, Réinitialiser les filtres, gestionnaire de Colonnes, Export, la bascule New / Old et + Nouvel utilisateur ; chaque ligne expose les actions Voir les sites, Modifier et Supprimer](/screenshots/react/melis-cms-user-account/meliscmsuseraccount-tool-usersfo-list.png)

**Liste (niveau 1)** — un tableau consultable, triable et filtrable de tous les comptes front-office de la
plateforme, avec des **cartes KPI** (Total / Actifs / Inactifs / Admins). Contrôles :

- **Recherche** (correspond au login, à l'email, au prénom, au nom)
- Filtre **Statut** (Tous / Actifs / Inactifs) et filtre **Admin** (Tous / Admin / Non-admin)
- Sélecteur de **Site** (Tous les sites) et **Réinitialiser les filtres**
- Gestionnaire de **Colonnes** (masquer / réordonner les colonnes par glisser-déposer)
- **Export** vers Excel ou CSV (exécuté côté client dans la brique via SheetJS)
- Bascule **New / Old** (en haut à droite) et bouton **+ Nouvel utilisateur**

Colonnes : **Id · Statut · Admin · Photo · Email · Login · Nom complet · Date de création · Action** (la
colonne Photo est purement présentative ; cliquer sur tout autre en-tête pour trier). Chaque ligne expose
trois actions :

| Action | Description |
| --- | --- |
| Voir les sites (🔍) | Fenêtre modale affichant, par site auquel l'utilisateur appartient, la date d'inscription, la date de dernière connexion, si l'appartenance est **anonymisée** (GDPR) et les domaines du site. |
| Modifier (✏️) | Ouvre l'utilisateur dans un sous-onglet (voir ci-dessous). |
| Supprimer (🗑) | Supprime le compte (irréversible). |

**Formulaire Utilisateur (niveau 2)** — ouvrir une ligne ou **+ Nouvel utilisateur** ajoute un sous-onglet
comportant un unique formulaire **Utilisateur** : **Login** (en lecture seule en modification), **Email**,
**Prénom**, **Nom**, **Date de naissance** (un calendrier dans la langue de session), **Langue**, une
**Date de création** en lecture seule, un panneau **Photo** (aperçu + Choisir une image / Supprimer la
photo), et **Mot de passe** / **Confirmer le mot de passe**. À droite, les bascules **Actif** et
**Administrateur** ainsi que la liste de cases à cocher **Sites** (obligatoire). **Enregistrer** persiste
le compte.

![Le formulaire React d'édition d'utilisateur — Login (en lecture seule en modification), Email, Prénom/Nom, Date de naissance, Langue, Date de création en lecture seule, panneau Photo, Mot de passe / Confirmer le mot de passe, ainsi que les bascules Actif et Administrateur et la liste de cases à cocher Sites (obligatoire)](/screenshots/react/melis-cms-user-account/meliscmsuseraccount-tool-usersfo-edit-tab-user.png)

> Les champs mot de passe portent l'indication *« Laisser vide pour conserver le mot de passe actuel »* —
> modifier un profil ne force jamais un changement de mot de passe. Lorsqu'un mot de passe **est** saisi,
> il doit satisfaire `MelisPasswordValidator` (min. 8 caractères, une minuscule, un chiffre). **Au moins
> un site est requis** ; un site déjà **anonymisé** (GDPR) pour cet utilisateur est silencieusement
> écarté de la soumission.

**Bascule New / Old** — l'ensemble de l'outil bascule entre l'interface React (**New**, par défaut) et
l'outil classique rendu dans une iframe (**Old**,
`/melis/react-tool-page?key=melis_cms_user_account_tool_display`). L'outil BO hérité est toujours servi par
**`MelisCmsUserAccountToolController`**, inchangé.

## Endpoints de l'API React

Les routes résident dans `config/react-api.php`, servies par le contrôleur
`MelisReactApiUserAccountController` (alias invocable
`MelisCmsUserAccount\Controller\MelisReactApiUserAccount`). Toutes sous `/melis/react-api/user-account`,
respectant le contrat `{ success, data, error }`.

| Méthode & URL | Fonction |
| --- | --- |
| `GET /user-account` | Liste des utilisateurs (keyset : `limit`, `search`, `siteId`, `admin`, `status`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` ; chaque élément porte `hasPicture` |
| `GET /user-account/stats` | KPI `{total, active, inactive, admins}` |
| `GET /user-account/sites` | Liste des sites de la plateforme (filtre + cases à cocher du formulaire) → `[{id,label}]` |
| `GET /user-account/langs` | Liste des langues (sélecteur du formulaire) → `[{id,label}]` |
| `GET /user-account/:id` | Un utilisateur (ajoute `siteIds[]` + `pictureDataUrl`) — pour l'édition |
| `GET /user-account/:id/picture` | Photo de ligne en `image/jpeg` (retombe sur l'avatar par défaut) |
| `GET /user-account/:id/sites` | Détail « Voir les sites » par site : libellé, dates d'inscription/dernière connexion, `anonymized`, domaines |
| `POST /user-account/save` | Créer / mettre à jour le compte |
| `DELETE /user-account/delete/:id` | Supprimer le compte |

`list`/`stats` interrogent directement `melis_cms_user_account` en SQL paramétré ;
`get`/`save`/`delete`/`userSites` **délèguent aux services hérités** (`FrontUserAccountTable`,
`FrontUserAccountService`) — les mêmes services que ceux utilisés par l'outil hérité, de sorte que toutes
les règles métier (login/email unique, hachage du mot de passe, liens de site, garde-fou GDPR sur les
sites anonymisés) et les événements du journal d'activité
(`meliscms_user_account_tooluser_save` / `_delete`) sont préservés.

## Capacités

Déclarées dans `config/react.capabilities.php` sous le nœud de droits
`melis_cms_user_account_tool_display`. L'outil est un CRUD à plat, la déclaration est donc une liste à
plat :

```php
return [
  'melisReactToolCapabilities' => [
    'melis_cms_user_account_tool_display' => ['list', 'create', 'edit', 'delete', 'export'],
  ],
];
```

Chaque action de l'API appelle d'abord `denyUnlessAccess()` (auth +
`MelisCoreRights::canAccess('melis_cms_user_account_tool_display')` → 401/403), puis une vérification de
capacité :

| Capacité | Appliquée à |
| --- | --- |
| `list` | `list`, `stats`, `picture` |
| `edit` | `get`, `userSites`, et `save` lorsqu'un `id` est présent (mise à jour) |
| `create` | `save` en l'absence d'`id` (création) |
| `delete` | `delete` |
| `export` | déclaratif uniquement — l'export s'exécute côté client dans la brique |

## Front office

Deux plugins de mise en page sont enregistrés dans `config/plugins/` (inchangés en v6 — servis par le
moteur de rendu front-office, et non par l'outil React) :

| Plugin | Rendu | Options principales |
| --- | --- | --- |
| `MelisCmsUserAccountLoginPlugin` | Formulaire de connexion (et contrôle de déconnexion lorsque l'utilisateur est déjà authentifié). | `template_path`, `page_id_registration_page` |
| `MelisCmsUserAccountUserRegisterPlugin` | Formulaire d'inscription (nom d'utilisateur, email, mot de passe ×2, prénom/nom, photo, langue). | `template_path`, `page_id_login_page`, `force_joint_accounts` |

`force_joint_accounts` sur le plugin d'inscription réutilise un compte existant inter-sites ;
l'appartenance au site est stockée dans `melis_cms_user_account_sites`.

Les deux plugins sont servis par **`MelisCmsUserAccountPluginController`** :

| Action | Rôle |
| --- | --- |
| `authenticateUserAction()` | Authentifier `login`/`password`/`siteId` et ouvrir la session. |
| `logoutUserAction()` | Fermer la session de l'utilisateur du site. |
| `createUserAction()` | Valider et créer un utilisateur (inclut le téléversement de photo). |
| `getRegistrationFormAction()` | Retourner le formulaire d'inscription (pour la permutation connexion↔inscription). |
| `getTranslationsAction()` | Chaînes de traduction côté front. |

> Il n'existe pas d'action de récupération/réinitialisation de mot de passe ni d'activation par email dans
> le contrôleur de plugin. Construire ces fonctionnalités par-dessus `FrontUserAccountService` si
> nécessaire.

## Tables de base de données

| Table | PK | Contenu |
| --- | --- | --- |
| `melis_cms_user_account` | `uac_id` | Utilisateur du site : `uac_login`, `uac_email`, `uac_password`, `uac_firstname`, `uac_lastname`, `uac_picture`, `uac_status`, `uac_admin`, `uac_birthday`, `uac_lang_id`, `uac_date_creation`. |
| `melis_cms_user_account_sites` | `uacs_id` | Table de jointure utilisateur ↔ site : `uacs_uac_id`, id du site, `uacs_anonymized` (indicateur GDPR par site). |

`MelisCmsUserAccountAddCustomFieldsTableListener` (déclenché au démarrage) ajoute des colonnes FK
`*_author_account` aux tables blog/actualités/commentaires, crée `melis_cms_user_account_sites`, et migre
la colonne héritée `uac_site_id`. L'opération est idempotente (vérification de l'existence des colonnes).

## GDPR

### Information / extraction / suppression manuelle (ensembles 1+2)

Neuf listeners répondent à trois événements MelisCore :

| Événement | Listener compte | Listener blog | Listener commentaires |
| --- | --- | --- | --- |
| `melis_core_gdpr_user_info_event` | `…GdprUserInfoListener` | `…BlogGdprUserInfoListener` | `…CommentsGdprUserInfoListener` |
| `melis_core_gdpr_user_extract_event` | `…GdprUserExtractListener` | `…BlogGdprUserExtractListener` | `…CommentsGdprUserExtractListener` |
| `melis_core_gdpr_user_delete_event` | `…GdprUserDeleteListener` | `…BlogGdprUserDeleteListener` | `…CommentsGdprUserDeleteListener` |

Les listeners Blog et Commentaires sont actifs uniquement lorsque `MelisCmsBlog` / `MelisCmsComments` sont
installés. La suppression anonymise la ligne du compte et définit `uacs_anonymized`. Les correspondances
de champs et les seuils de rétention sont définis dans `config/app.gdpr.php`.

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
| `MelisCmsUserAccountFlashMessengerListener` | `meliscms_user_account_tooluser_save`, `meliscms_user_account_tooluser_delete` | Messages flash BO lors de la sauvegarde/suppression (outil hérité). |

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Manifeste de la brique React | `vendor/melisplatform/melis-cms-user-account/public/ui-react/brick.manifest.json` |
| Routes de l'API React + invocable | `vendor/melisplatform/melis-cms-user-account/config/react-api.php` |
| Capacités React | `vendor/melisplatform/melis-cms-user-account/config/react.capabilities.php` |
| Contrôleur de l'API React | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisReactApiUserAccountController.php` |
| Contrôleur de l'outil BO hérité (vue Old) | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountToolController.php` |
| Contrôleur du plugin FO | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountPluginController.php` |
| Entrée de menu BO | `vendor/melisplatform/melis-cms-user-account/config/app.interface.php` |
| Datatable BO hérité (colonnes, filtres, modales) | `vendor/melisplatform/melis-cms-user-account/config/app.tools.php` |
| Tous les formulaires (FO + BO hérité) | `vendor/melisplatform/melis-cms-user-account/config/app.forms.php` |
| Correspondances de champs GDPR + seuils de rétention | `vendor/melisplatform/melis-cms-user-account/config/app.gdpr.php` |
| Points d'intégration des commentaires | `vendor/melisplatform/melis-cms-user-account/config/comments.php` |
| Routes, alias de services, plugins, validateurs | `vendor/melisplatform/melis-cms-user-account/config/module.config.php` |
| Config du plugin de connexion | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountLoginPlugin.config.php` |
| Config du plugin d'inscription | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountUserRegisterPlugin.config.php` |
| Service principal | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountService.php` |
| Service de suppression automatique | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountGdprAutoDeleteService.php` |
| Validateur de mot de passe | `vendor/melisplatform/melis-cms-user-account/src/Validator/MelisPasswordValidator.php` |
| Passerelles de tables DB | `vendor/melisplatform/melis-cms-user-account/src/Model/Tables/` |
| Listeners | `vendor/melisplatform/melis-cms-user-account/src/Listener/` |
| Bootstrap / injection de colonnes | `vendor/melisplatform/melis-cms-user-account/src/Module.php` |

Voir aussi : [MelisCore](/fr/reference/modules/melis-core) · [MelisCms](/fr/reference/modules/melis-cms) · [MelisCmsComments](/fr/reference/modules/melis-cms-comments) · [MelisCmsBlog](/fr/reference/modules/melis-cms-blog) · [MelisCmsNews](/fr/reference/modules/melis-cms-news)
