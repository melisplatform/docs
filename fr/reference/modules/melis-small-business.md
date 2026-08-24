# MelisSmallBusiness

> Extension pour équipe éditoriale du CMS — **rôles utilisateurs**, **workflow** de validation, **versionnage** de pages, **commentaires** et **verrouillage** de page, plus une **médiathèque** TinyMCE, le tout exposé dans le back-office React. Package `melisplatform/melis-small-business`.

## Présentation

`MelisSmallBusiness` ajoute des outils de collaboration pour petites équipes par-dessus l'éditeur de
pages du CMS. Il conserve des **versions** des pages publiées (restaurer ou prévisualiser un état
antérieur), pilote un **workflow** de contenu où un éditeur demande une validation et un relecteur
valide ou refuse, attache des **commentaires** aux pages, empêche deux utilisateurs d'éditer la même
page simultanément via un **verrou de page**, gère un outil de **rôles utilisateurs** dédié et
fournit une **médiathèque** basée sur TinyMCE (MoxieManager). La logique métier reste côté serveur
(services Laminas, événements de l'éditeur CMS) ; en v6 toute la surface visible par l'utilisateur
est un ensemble de bricks React et de contributions modulaires.

## Activation

C'est un module Laminas standard. Ajoutez-le à `config/melis.module.load.php` :

```php
return [
    // …
    'MelisSmallBusiness',
];
```

Il dépend de `melis-core`, `melis-engine`, `melis-front` et `melis-cms`, et ses tables sont créées
via dbdeploy (`extra.dbdeploy = true`). Chaque surface React ci-dessous n'apparaît **que lorsque le
module est actif** (découverte des bricks via `GET /melis/react-api/react-modules`).

## Surfaces React

Dans le back-office React (`/melis-react`), le module fournit **deux bricks** et **deux
contributions modulaires** qui n'ont pas de route propre.

| Surface | Type | Route / hôte |
| --- | --- | --- |
| **Rôles utilisateurs** (`smallbusiness`) | brick full-React native (bascule Nouveau/Ancien) | `/melis-core/user-roles` |
| **Médiathèque** (`smallbusiness-medialib`) | brick iframe (MoxieManager) | `/melis-cms/media-library` |
| **Modale workflow** | modale partagée (`window.__melisWorkflowModal`) | rendue par News / Blog / éditeur de page CMS / Newsletter + widget de dashboard |
| **Versionnage / Commentaires / Verrou** | onglets + bandeau dans l'éditeur de page CMS | contribués au nœud de capacité `meliscms_page` |
| **Rôle dans Utilisateurs** | colonne/filtre/sélecteur Rôle | outil Utilisateurs hôte, conditionné par `useModuleActive('MelisSmallBusiness')` |

`public/ui-react/brick.manifest.json` déclare les deux bricks ; `ui-react/src/brick.tsx` les
enregistre et publie la modale workflow comme variable globale de la fenêtre afin que les autres
bricks puissent rendre une seule implémentation partagée.

## Outil Rôles utilisateurs

**Où :** barre latérale → **MelisCore → User Roles** (`/melis-core/user-roles`).

Un **rôle** est un profil de droits nommé, stocké une seule fois (`melis_core_user_role`) et affecté
à plusieurs utilisateurs. La liste affiche chaque rôle avec des cartes KPI (Rôles / Affectés), une
recherche, un gestionnaire de colonnes, un export et une bascule **Nouveau / Ancien** (Ancien =
l'outil classique dans une iframe). Chaque ligne (ID, Nom, Créé le, Nombre d'utilisateurs) propose
des actions éditer/supprimer ; un rôle affecté à des utilisateurs **ne peut pas être supprimé**.

![Liste des rôles dans le back-office React](/screenshots/react/melis-small-business/melissmallbusiness-tool-roles-list.png)

L'édition d'un rôle ouvre un sous-onglet avec un champ **Nom du rôle** et un arbre des **Droits
d'accès** qui reflète l'arbre des droits des Utilisateurs (OUTILS groupés par section,
List/Create/Edit/Delete/Export par outil, plus les sections Pages et Plugins de dashboard).
**Enregistrer** persiste le nom et le XML `urole_rights`.

![Éditeur de rôle et son arbre de droits](/screenshots/react/melis-small-business/melissmallbusiness-tool-roles-edit-and-rights.png)

::: warning
Écrire le XML des **droits** d'un rôle requiert un administrateur de la plateforme (`usr_admin`) ;
un non-administrateur qui édite un rôle obtient un 403 sur l'écriture des droits. Cela bloque une
voie d'escalade de privilèges (forger un rôle tous droits, puis se l'affecter). Le **nom** du rôle
peut être modifié par toute personne disposant du droit `edit` de l'outil.
:::

### Rôle dans l'outil Utilisateurs

Lorsque le module est actif, l'outil **Utilisateurs** de MelisCore gagne une colonne + un filtre
**Rôle** dans la liste et un sélecteur **Rôle** dans le formulaire utilisateur (aux côtés de Statut
et Droits). Le menu déroulant est alimenté par `GET /melis/react-api/roles` (la liste de sélection de
MelisCore) ; à l'enregistrement, un listener réinjecte les capacités du rôle afin qu'elles ne soient
pas perdues.

![Formulaire utilisateur avec le sélecteur Rôle](/screenshots/react/melis-small-business/melissmallbusiness-tooloverride-users-edit-withrole.png)

## Médiathèque

**Où :** barre latérale → **MelisCms → Media library** (`/melis-cms/media-library`).

Le navigateur de fichiers avancé TinyMCE / **MoxieManager** : dossiers à gauche, fichiers à droite
(nom, taille, type, date), avec Créer, Téléverser, vue liste/grille, Trier, Filtrer et les raccourcis
Favoris/Historique/Téléversés. La page React est une fine enveloppe qui rend une iframe pleine page
vers le moxiemanager historique
(`/melis/MelisSmallBusiness/js/tinyMCE/moxiemanager/index.php?lang=xx`), si bien que le comportement
est identique à l'outil classique — pas de react-api propre.

![Médiathèque — navigateur MoxieManager dans un onglet React](/screenshots/react/melis-small-business/melissmallbusiness-tool-medialibrary.png)

## Workflow (validation de page)

Le workflow permet à un éditeur de **demander** une validation et à un validateur de **répondre**.
La **même modale** s'ouvre depuis l'éditeur de page CMS (bouton **Workflow**), les éditeurs News et
Blog, et le widget de dashboard. Elle est générique sur le type d'élément — `PAGE`, `NEWS`, `BLOG`.

Sous **Demander une validation**, choisissez un **Rôle** pour notifier toutes les personnes ayant ce
rôle, ou **« 1 personne seulement »** pour révéler un menu déroulant **Utilisateur** et cibler une
seule personne, puis **Envoyer la demande**.

![Modale workflow — demander à une seule personne](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-workflow-demand-1person.png)

L'**Historique** de la modale liste chaque demande et réponse (Date, Statut, À/Rôle, De, Action). Le
destinataire d'une demande ouverte obtient des boutons **Valider** / **Refuser** et peut joindre une
note.

![Modale workflow — historique avec Valider/Refuser](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-workflow-demand-to-validated.png)

Le **Dashboard** du back-office affiche un widget **Workflow** listant les demandes, réparties entre
*Demandes des utilisateurs* / *Mes demandes* avec des sous-onglets PAGE / NEWS ; chaque ligne montre
une pastille de statut (VALIDATED / REFUSED / Demand) et propose des actions en ligne de validation
(✓) / refus (✗) et de prévisualisation sur les demandes qui vous sont adressées.

![Widget Workflow du dashboard](/screenshots/react/melis-small-business/melissmallbusiness-dashboardplugins-workflow.png)

## Versionnage & Commentaires (éditeur de page CMS)

Ouvrir une page dans l'éditeur CMS ajoute deux onglets SmallBusiness après les onglets natifs :

- **Versionnage** — une liste paginée des instantanés de la page (N°, Nom, Modifié le, Par) avec, par
  ligne, Visualiser / Restaurer / Renommer. Un instantané est pris à chaque publication.

  ![Éditeur de page — onglet Versionnage](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-edit-tab-versionning.png)

- **Commentaires** — le fil d'activité de la page mêlant commentaires d'utilisateurs et événements de
  workflow (les plus récents en premier), avec une zone « Ajouter un commentaire ».

  ![Éditeur de page — onglet Commentaires](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-tab-comments.png)

Un bandeau de **verrou de page** + un bouton **Déverrouiller** apparaissent lorsqu'un autre
utilisateur détient le verrou sur la page.

## Endpoints react-api

Tous sous `/melis/react-api/…`, contrat `{ success, data, error }`. Les contrôleurs vivent dans ce
module (`config/react-api.php` + `src/Controller/MelisReactApi*Controller.php`).

| Contrôleur | Routes de base | Garde |
| --- | --- | --- |
| `MelisReactApiRoleController` | `GET /user-roles`, `/user-roles/stats`, `/user-roles/:id`; `POST /user-roles/save`; `DELETE /user-roles/delete/:id` | accès `melissb_tool_userrole` + capacité (écriture du XML de droits = admin uniquement) |
| `MelisReactApiWorkflowController` | `GET /workflow/roles`, `/workflow/users`, `/workflow/history`; `POST /workflow/ask` | authentification uniquement |
| `MelisReactApiPageVersioningController` | `GET /cms-page/versioning` | authentification uniquement |
| `MelisReactApiPageCommentsController` | `GET /cms-page/comments`, `/cms-page/timeline`; `POST /cms-page/comments/save` | authentification uniquement |
| `MelisReactApiPageLockController` | `GET /cms-page/lock`; `POST /cms-page/unlock` | authentification uniquement |

Les **mutations** de workflow réutilisent les endpoints historiques éprouvés plutôt que react-api :
`GET /melis/MelisSmallBusiness/MelisWorkflow/saveWorkflowActions` (valider / refuser) et
`POST /melis/MelisSmallBusiness/MelisWorkflow/addWorkflowComments` (ajouter une note). Le texte des
commentaires est assaini par HTMLPurifier à l'enregistrement.

## Capacités

`config/react.capabilities.php` **contribue** le bouton et les onglets de l'éditeur de page sous la
clé partagée `meliscms_page` détenue par MelisCms (fusionnées, de sorte que MelisCms n'a pas besoin
de connaître SB) :

| Type | Clé | Libellé |
| --- | --- | --- |
| action | `workflow` | Bouton Workflow |
| action | `unlock` | Bouton Déverrouiller |
| tab | `melissb_page_versioning` | Onglet Versionnage |
| tab | `melissb_page_comments` | Onglet Commentaires |

`CmsPage.tsx` filtre ces onglets / masque ces boutons via `useCaps('meliscms_page').can(cap)`.
L'outil Rôles lui-même est référencé sous `melissb_tool_userrole` et la médiathèque sous
`melissb_medialib`.

## Tables de base de données

Créées par `install/dbdeploy/126618_melis_sb_install.sql`.

| Table | Rôle |
| --- | --- |
| `melis_sb_page_versioning` | Copies archivées des pages publiées (alimente l'onglet Versionnage). |
| `melis_sb_workflow` | Enregistrements de workflow par élément. |
| `melis_sb_workflow_events` | Événements de workflow (demande / validation / refus). |
| `melis_sb_page_comment` | Commentaires attachés à une page (type de commentaire 1 = PAGE, 2 = WORKFLOW). |
| `melis_sb_page_comment_type` | Types de commentaires. |
| `melis_sb_page_locked` | Verrous de page actifs (quel utilisateur édite quelle page). |
| `melis_core_user_role` | Rôles nommés (`urole_id`, `urole_name`, `urole_creation_date`, XML `urole_rights`). |

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisEnginePage` | Le module **surcharge** le service de page du moteur par `MelisSBPageService` ; sur la route de prévisualisation de version, il retourne l'arbre de page versionné depuis `melis_sb_page_versioning`, sinon il se comporte comme le parent. |
| `MelisSBPageCommentService` | Commentaires de page : `getPageComments()` / `setPageComments()`. |

::: warning
En aliasant `MelisEnginePage` vers sa propre classe, ce module remplace le service de page du cœur
pour toute l'application tant qu'il est activé. À garder en tête dans l'ordre des modules.
:::

Le workflow envoie trois e-mails back-office (`app.emails.php`) : `WF_DEMAND`, `WF_VALIDATED`,
`WF_REFUSED` (balises `USER_TO`, `USER_FROM`, `TYPE`, `DETAILS`).

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Bootstrap du module & listeners | `src/Module.php`, `src/Listener/` |
| Routes react-api + invokables | `config/react-api.php` |
| Contrôleurs react-api | `src/Controller/MelisReactApi{Role,Workflow,PageVersioning,PageComments,PageLock}Controller.php` |
| Contribution de capacités | `config/react.capabilities.php` |
| Service de page (surcharge moteur) | `src/Service/MelisSBPageService.php` |
| Service de commentaires | `src/Service/MelisSBPageCommentService.php` |
| Bricks React (source) | `ui-react/src/` (`brick.tsx`, `UserRolePage.tsx`, `MediaLibraryPage.tsx`, `WorkflowModal.tsx`, `RolesRightsTree.tsx`) |
| Bundle compilé | `public/ui-react/brick.js` + `brick.manifest.json` |
| SQL d'installation | `install/dbdeploy/126618_melis_sb_install.sql` |
