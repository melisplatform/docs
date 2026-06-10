# MelisSmallBusiness

> Fonctionnalités de collaboration en back-office pour le CMS — versionnage de pages, **workflow**
> de validation, **commentaires** de page, **verrouillage** de page, **rôles utilisateurs** et une
> **médiathèque** TinyMCE. Package `melisplatform/melis-small-business`.

## Présentation

`MelisSmallBusiness` ajoute des outils de collaboration pour petites équipes / petites entreprises
par-dessus l'éditeur de pages du CMS. Il conserve des **versions** des pages publiées (pour pouvoir
restaurer ou prévisualiser un état antérieur), pilote un **workflow** de contenu où un éditeur
demande une validation et un relecteur valide ou refuse, attache des **commentaires** aux pages,
empêche deux utilisateurs d'éditer la même page simultanément via un **verrou de page**, gère un
outil de **rôles utilisateurs** dédié et fournit une **médiathèque** basée sur TinyMCE
(MoxieManager) pour parcourir et téléverser des fichiers. L'essentiel de son comportement est câblé
via les **événements** de l'éditeur CMS (voir [Modules](/fr/reference/modules)).

## Activation

C'est un module Laminas standard. Ajoutez-le à `config/melis.module.load.php` :

```php
return [
    // …
    'MelisSmallBusiness',
];
```

Il dépend de `melis-core`, `melis-engine`, `melis-front` et `melis-cms` (voir `composer.json`), et
ses tables sont créées via dbdeploy (`extra.dbdeploy = true`). Le `Module::init()` attache
`MelisSBAddModuleConfigListener` puis, sur les routes back-office, un ensemble de listeners de
l'éditeur CMS (sauvegarde de versionnage, verrou de page, workflow, arbre des droits, config
TinyMCE…).

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisEnginePage` | Le module **surcharge** le service de page du moteur par `MelisSBPageService`. Lorsque la route est la route de prévisualisation de version (`…/id/{idpage}/preview/idversion/{idversion}`), il retourne l'arbre de page versionné depuis `melis_sb_page_versioning` ; sinon il se comporte exactement comme le parent. |
| `MelisSBPageCommentService` | Commentaires de page : `getPageComments()` (enrichit avec l'utilisateur + la date formatée), `setPageComments()` (enregistre avec l'utilisateur courant comme auteur). |

Les passerelles de tables sont aussi enregistrées comme services : `MelisPageComment`,
`MelisPageCommentType`, `MelisPageLockTable`, `MelisPageVersioningTable`, `MelisUserRole`,
`MelisWorkflowTable`, `MelisWorkflowEventsTable`.

::: warning
En aliasant `MelisEnginePage` vers sa propre classe, ce module remplace le service de page du cœur
pour toute l'application tant qu'il est activé. À garder en tête dans l'ordre des modules.
:::

## Back-office

Les outils et interfaces sont déclarés dans `config/app.tools.php` et `config/app.interface.php`
(les contrôleurs sont de simples invokables sous `MelisSmallBusiness\Controller\…`).

| Outil / onglet (melisKey) | Contrôleur / action | Rôle |
| --- | --- | --- |
| `melissb_tool_userrole` | `ToolUserRole::render-tool-user-role` (données : `getRolesData`) | Outil **rôles utilisateurs** sous *Admin* dans l'arbre des outils ; CRUD sur les rôles, plus un champ `MelisUserRoleSelect` injecté dans le formulaire utilisateur du cœur. |
| `melissb_page_versioning` | `PageVersioning::render-page-versioning` | Onglet **Versionnage** de l'éditeur de page — liste des versions archivées avec actions éditer / sauvegarder / visualiser (aperçu). |
| `melissb_page_comments` | `PageComments::render-page-comments` | Onglet **Commentaires** de l'éditeur de page (ajout + fil chronologique). |
| `melissb_medialib` | `MediaLibrary::renderPageMediaLibrary` | Outil **médiathèque** (TinyMCE MoxieManager) pour parcourir / téléverser des fichiers. |
| `melissb_workflow_modal_content` | `MelisWorkflow::render-workflow-modal-content` | Modale **workflow** : demander une validation, valider, refuser et consulter l'historique. |

Le workflow envoie trois e-mails back-office (définis dans `app.emails.php`) via le service d'e-mail
BO de MelisCore :

| Code e-mail | Déclencheur | Balises disponibles |
| --- | --- | --- |
| `WF_DEMAND` | Une demande de validation est soumise | `USER_TO`, `USER_FROM`, `TYPE`, `DETAILS` |
| `WF_VALIDATED` | Un approbateur valide une demande | idem |
| `WF_REFUSED` | Un approbateur refuse une demande | idem |

Le module ajoute aussi un élément de formulaire `MelisMediaUpload` (`melis-media-upload`) avec sa
factory, son view helper et `MelisMediaUploadValidator`.

Le verrouillage de page n'a pas d'outil dédié : il est appliqué par des listeners
(`MelisSBPageLockListener`, `…TreeListener`, `…InfoListener`,
`…PageActionButtonsAndTabsListener`, `…LogoutListener`) qui marquent une page comme verrouillée
dans `melis_sb_page_locked` pendant qu'un utilisateur l'édite.

## Front office

| Type | Nom | Rôle |
| --- | --- | --- |
| Plugin de dashboard | `MelisSBWorkflowPlugin` | Widget du dashboard back-office (action `workflow`) listant les demandes de workflow en attente / l'activité récente. Déclaré sous `meliscore_dashboard` (`melissb_dashboard_workflow`) ; voir [Plugins](/fr/guide/plugins). |

Il existe aussi un petit asset front-office (`front.pagelock.js`) enregistré sous `melisfront`, mais
le module n'a **aucun plugin de templating** front-office — sa surface est le back-office.

## Tables de base de données

Créées par `install/dbdeploy/126618_melis_sb_install.sql` (repris dans
`install/sql/setup_structure.sql`).

| Table | Rôle |
| --- | --- |
| `melis_sb_page_versioning` | Copies archivées des pages publiées (`page_v_version_number`, `page_v_version_name`, `page_content`, `page_edit_date`, …). |
| `melis_sb_workflow` | Enregistrements de workflow par page. |
| `melis_sb_workflow_events` | Événements de workflow (demande / validation / refus). |
| `melis_sb_page_comment` | Commentaires attachés à une page. |
| `melis_sb_page_comment_type` | Types de commentaires (`PAGE`, `WORKFLOW`). |
| `melis_sb_page_locked` | Verrous de page actifs (quel utilisateur édite quelle page). |
| `melis_core_user_role` | Rôles nommés (`urole_id`, `urole_name`, `urole_creation_date`, `urole_rights`) — droits stockés en XML, comme l'enregistrement de droits propre à un utilisateur. |

## Exemple

Lire et ajouter un commentaire de page via le service public :

```php
$commentService = $serviceManager->get('MelisSBPageCommentService');

// lister les commentaires de la page 42
$comments = $commentService->getPageComments(42);

// ajouter un commentaire de type PAGE (commentType 1 = PAGE, 2 = WORKFLOW)
$commentService->setPageComments(
    ['pcom_page_id' => 42, 'pcom_comment' => 'Prêt à publier.'],
    1
);
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Bootstrap du module & listeners | `vendor/melisplatform/melis-small-business/src/Module.php` |
| Routage, services, contrôleurs | `vendor/melisplatform/melis-small-business/config/module.config.php` |
| Outils (rôles, versionnage) | `vendor/melisplatform/melis-small-business/config/app.tools.php` |
| Arbre d'interface back-office | `vendor/melisplatform/melis-small-business/config/app.interface.php` |
| Définitions des e-mails workflow | `vendor/melisplatform/melis-small-business/config/app.emails.php` |
| Service de page (surcharge moteur) | `vendor/melisplatform/melis-small-business/src/Service/MelisSBPageService.php` |
| Service de commentaires | `vendor/melisplatform/melis-small-business/src/Service/MelisSBPageCommentService.php` |
| Contrôleurs workflow / versionnage / verrou | `vendor/melisplatform/melis-small-business/src/Controller/` |
| Plugin de dashboard | `vendor/melisplatform/melis-small-business/src/Controller/DashboardPlugins/MelisSBWorkflowPlugin.php` |
| Listeners de l'éditeur CMS | `vendor/melisplatform/melis-small-business/src/Listener/` |
| SQL d'installation | `vendor/melisplatform/melis-small-business/install/dbdeploy/126618_melis_sb_install.sql` |
