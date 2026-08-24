# MelisCmsPageScriptEditor

> Injecte des `<script>`/`<style>`/HTML personnalisés (analytics, pixels de tracking, widgets tiers)
> dans le `<head>` et le `<body>` des pages du front-office, par page et par site, sans modifier les
> templates. Paquet `melisplatform/melis-cms-page-script-editor`.

## Présentation

MelisCmsPageScriptEditor vous permet d'ajouter du balisage brut et de le faire injecter
automatiquement dans le HTML rendu de vos pages. Trois emplacements d'injection sont disponibles :
**head top** (juste après `<head>`), **head bottom** (juste avant `</head>`), et **body bottom**
(juste avant `</body>`). Les scripts peuvent être limités à l'ensemble du site ou à une seule page ;
une page peut être marquée comme **exception** pour exclure les scripts du site.

Dans le back-office React v6, le module est livré sous forme de **brique de contribution
uniquement** — il n'a pas d'outil dédié dans le menu de gauche. Il ajoute plutôt un **onglet Scripts
à deux endroits** : l'**éditeur de page CMS** (scripts par page) et l'**édition de l'outil Sites**
(scripts du site + exceptions). Le modèle de données, le service et les listeners d'injection sont
inchangés par rapport à la v5 ; seule l'interface du back-office est passée à React.

## Activation

Ajoutez à `config/melis.module.load.php` :

```php
return [
    'MelisCmsPageScriptEditor',
];
```

Nécessite `melis-core ^6.0` et `melis-cms ^6.0` (PHP `^8.3|^8.5`). Le module est marqué
`dbdeploy: true`, ses tables sont donc créées automatiquement par melis-dbdeploy.

> **Activation par site :** l'injection n'est effective sur un site qu'une fois le module chargé pour
> ce site dans MelisCms → Sites → Chargement des modules. Les scripts peuvent être édités dans le
> back-office avant cela, mais rien n'est injecté en front tant que le module n'est pas activé sur le
> site.

## Back-office en React

Il n'y a **aucun outil dédié dans le menu de gauche** — l'onglet Scripts réside à l'intérieur de deux
outils existants, tous deux natifs React. Les deux onglets n'apparaissent que lorsque le module est
actif (découvert via `GET /melis/react-api/react-modules`, puis le bundle de la brique est préchargé
au démarrage).

| Surface | Emplacement | Contenu | Enregistrement |
| --- | --- | --- | --- |
| **Éditeur de page → onglet Scripts** | MelisCms → ouvrir une **page** → *Scripts* | Trois éditeurs de code par page (Head top / Head bottom / Body bottom) pour **cette page uniquement**. | Bouton **Enregistrer les scripts** propre. |
| **Outil Sites → onglet Scripts** | MelisCms → **Sites** → ouvrir un site → *Scripts* | Trois éditeurs pour le site + liste **Exceptions actuelles** + **Ajouter une exception** (saisie d'un identifiant de page ou sélecteur dans l'arbre des pages). | Enregistré par le bouton global **Enregistrer** de l'éditeur de site ; les ajouts/suppressions d'exceptions sont persistés immédiatement. |

![Onglet Scripts de l'éditeur de page CMS React : les trois éditeurs de code par page (Head top / Head bottom / Body bottom) avec un bouton Enregistrer les scripts](/screenshots/react/melis-cms-page-script-editor/meliscmspagescripteditor-page-tab-scripts.png)

![Onglet Scripts de l'édition Sites React : les trois éditeurs pour le site, la liste Exceptions actuelles et le bloc Ajouter une exception, enregistrés par le bouton global Enregistrer de l'éditeur de site](/screenshots/react/melis-cms-page-script-editor/meliscmspagescripteditor-tooloverride-sites-edit-tab-scripts.png)

Sur une page servie, chaque emplacement reçoit **d'abord les scripts du site, puis les scripts
propres à la page** — sauf si la page est une exception, auquel cas seuls ses scripts de page sont
injectés.

Le **composant d'onglet de l'éditeur de page** réside dans MelisCms (`PageTabs.tsx`, clé
`meliscms_page_script_editor`) ; le **composant d'onglet du site** (`ScriptsTab.tsx`) réside dans ce
module et s'auto-enregistre via le registre générique `window.__melisSiteTabs` (ordre `55`). Ce
module est propriétaire des endpoints et de la capacité derrière les deux onglets.

## Capacités (droits avancés)

L'onglet de page est une **capacité de l'outil de page CMS**, déclarée dans
`config/react.capabilities.php` sous le nœud partagé `meliscms_page` :

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'meliscms_page_script_editor', 'label' => 'tr_meliscmspagescripteditor_title'],
      ],
    ],
  ],
];
```

Sans cette déclaration, la liste blanche des capacités de la page CMS masque le bouton d'onglet
**Scripts** dans l'éditeur de page, même pour un administrateur. L'onglet Scripts de l'**outil
Sites** n'a pas de capacité propre : il est protégé par l'accès à l'outil Sites
(`meliscms_tool_sites`).

## API React

Deux contrôleurs appartenant à ce module, tous deux délégant à `MelisCmsPageScriptEditorService`.
Contrat `{ success, data, error }`, avec `X-Requested-With: XMLHttpRequest` et
`credentials: 'include'`.

**Onglet de page** — `MelisReactApiPageScriptEditorController`, routes dans `config/react-api.php`.
Protégé par auth + `MelisCoreRights::canAccess('meliscms_page_script_editor')` :

| Méthode & URL | Rôle |
| --- | --- |
| `GET /melis/react-api/cms-page/scripts?idPage=<id>` | Lit les scripts d'une page → `{ idPage, headTop, headBottom, bodyBottom, editDate }`. |
| `POST /melis/react-api/cms-page/scripts/save` | Enregistre les scripts d'une page (`{ idPage, headTop, headBottom, bodyBottom }`). |

**Onglet de site** — `MelisCmsPageScriptEditorReactController`, route générique
`/melis/MelisCmsPageScriptEditor/:controller/:action` dans `config/module.config.php`. Protégé par
auth + `MelisCoreRights::canAccess('meliscms_tool_sites')` :

| Méthode & URL (relative à `.../MelisCmsPageScriptEditorReact`) | Rôle |
| --- | --- |
| `GET /site-script?siteId=<id>` | Scripts du site + nombre d'exceptions → `{ siteId, script, exceptionCount }`. |
| `POST /save-site-script` | Enregistre les scripts du site (tout vide ⇒ supprime l'entrée). |
| `GET /exceptions?siteId=<id>` | Les exceptions du site → `{ items:[{id,pageId,pageName}], total }`. |
| `POST /add-exception` | Ajoute une exception (`{ siteId, pageId }` ; impose le même site + aucun doublon). |
| `POST /delete-exception` | Supprime une exception (`{ id }`). |

> **Note de sécurité.** Les endpoints de page injectent des `<script>`/HTML personnalisés dans le
> rendu **public** d'une page ; c'est pourquoi `get` et `save` exigent tous deux le droit de l'outil
> page-script-editor (et pas seulement une session), empêchant un utilisateur BO sans droits de
> planter un XSS persistant. Les écritures utilisent des requêtes SQL paramétrées directement sur
> `melis_cms_scripts`.

## Services principaux

| Alias | Rôle |
| --- | --- |
| `MelisCmsPageScriptEditorService` | Toute la logique métier des scripts : enregistrement, lecture, fusion et injection. Réutilisé par les deux contrôleurs React. |
| `MelisCmsScriptTable` | Passerelle de table pour `melis_cms_scripts`. |
| `MelisCmsScriptExceptionTable` | Passerelle de table pour `melis_cms_scripts_exceptions`. |

`MelisCmsPageScriptEditorService` expose :

| Méthode | Rôle |
| --- | --- |
| `addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId)` | Insère ou met à jour une ligne de scripts pour un site ou une page. |
| `addScriptException($siteId, $pageId)` | Marque une page comme excluant les scripts du site. |
| `getScriptExceptions($siteId, $sortCol, $sortOrder)` | Liste les pages qui excluent les scripts du site. |
| `getScriptsPerSite($siteId)` / `getScriptsPerPage($pageId)` | Récupère la ou les lignes de scripts pour un site / une page. |
| `getScriptsExceptionPerPage($pageId)` | Récupère la ou les lignes d'exception pour une page. |
| `getMixedScriptsPerPage($pageId)` | Résout les scripts finaux d'une page — site + page fusionnés, ou page seule lorsque la page est une exception. Utilisé par le listener de rendu front. |
| `updatePageScripts($pageId, $html)` | Injecte les scripts fusionnés dans le HTML rendu (après `<head>`, avant `</head>`, avant `</body>`). |
| `getSiteId($pageId)` | Résout l'identifiant de site pour une page donnée. |

## Front office

L'injection se fait via un listener MVC, et non via un plugin de template :

| Listener | Déclencheur | Rôle |
| --- | --- | --- |
| `MelisCmsPageScriptEditorScriptTagListener` | Rendu de page (front) | Appelle `getMixedScriptsPerPage()` et injecte les scripts résolus : head-top après `<head>`, head-bottom avant `</head>`, body-bottom avant `</body>`. |

L'enregistrement et la duplication restent pilotés par événements (`Module.php::onBootstrap`) : les
listeners de sauvegarde de page, de sauvegarde des scripts du site et de duplication de page
persistent les scripts et l'exception d'exclusion du site lorsque des pages/sites sont enregistrés ou
dupliqués dans le back-office. Le view helper `melisCmsPageScriptEditorAddScript`
(`src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php`) offre un accès programmatique pour
enregistrer une ligne de scripts via le service.

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_cms_scripts` | Un jeu de scripts par site ou par page : `mcs_id`, `mcs_site_id`, `mcs_page_id`, `mcs_head_top`, `mcs_head_bottom`, `mcs_body_bottom`, `mcs_date_edition`, `mcs_user_id`. |
| `melis_cms_scripts_exceptions` | Pages qui ignorent les scripts du site : `mcse_id`, `mcse_site_id`, `mcse_page_id`, `mcse_date_creation`, `mcse_user_id`. |

## Exemple

```php
$scripts = $this->getServiceManager()->get('MelisCmsPageScriptEditorService');

// Résoudre les scripts finaux d'une page (site + page fusionnés, ou page seule si exception)
$resolved = $scripts->getMixedScriptsPerPage($pageId);
// $resolved contains headTopScript, headBottomScript, bodyBottomScript

// Enregistrer les scripts pour un site ou une page
$scripts->addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId);

// Marquer une page comme exception (elle ne recevra plus les scripts du site)
$scripts->addScriptException($siteId, $pageId);

// Lister toutes les pages exclues des scripts du site
$exceptions = $scripts->getScriptExceptions($siteId, $sortCol, $sortOrder);
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Bootstrap du module & câblage des listeners | `vendor/melisplatform/melis-cms-page-script-editor/src/Module.php` |
| Câblage du service & des routes | `vendor/melisplatform/melis-cms-page-script-editor/config/module.config.php` |
| Routes de l'API React de l'onglet de page | `vendor/melisplatform/melis-cms-page-script-editor/config/react-api.php` |
| Déclaration de capacité de l'onglet de page | `vendor/melisplatform/melis-cms-page-script-editor/config/react.capabilities.php` |
| Contrôleurs React (page / site) | `vendor/melisplatform/melis-cms-page-script-editor/src/Controller/` |
| Brique de l'onglet de site (Vite IIFE) | `vendor/melisplatform/melis-cms-page-script-editor/ui-react/src/` (`brick.tsx`, `ScriptsTab.tsx`, `site-scripts-api.ts`) |
| Service | `vendor/melisplatform/melis-cms-page-script-editor/src/Service/MelisCmsPageScriptEditorService.php` |
| Listener d'injection front | `vendor/melisplatform/melis-cms-page-script-editor/src/Listener/MelisCmsPageScriptEditorScriptTagListener.php` |
| View helper | `vendor/melisplatform/melis-cms-page-script-editor/src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php` |
| Passerelles de table | `vendor/melisplatform/melis-cms-page-script-editor/src/Model/Tables/` |
| SQL d'installation | `vendor/melisplatform/melis-cms-page-script-editor/install/dbdeploy/` |

Voir aussi : [Référence des modules](/fr/reference/modules) · [melis-cms](/fr/reference/modules/melis-cms) ·
[melis-core](/fr/reference/modules/melis-core)
