# MelisCms

> Le back-office CMS — sites, arbre de pages, éditeur de page, templates, styles et SEO, livré sous forme de back-office React. Paquet `melisplatform/melis-cms`.

## Présentation

`MelisCms` est le back-office où vous construisez et exploitez vos sites web sur la plateforme
Melis. Il fournit l'arbre des pages du site, l'éditeur de page (onglets Édition, Propriétés, SEO,
Langues), les zones de glisser-déposer de plugins pour composer le contenu, ainsi que les outils
d'administration des sites, templates, styles, langues, identifiants de plateforme, domaines et
redirections. Il **ne possède aucune table de base de données** — il lit et écrit tout via
[melis-engine](/fr/reference/modules/melis-engine), et le rendu des pages (y compris l'aperçu en
édition live) est assuré par [melis-front](/fr/reference/modules/melis-front).

En Melis v6, la logique métier est inchangée ; la **couche d'affichage** est un **back-office React**
(`/melis-react`). MelisCms livre **un seul bundle multi-bricks** exposant **neuf outils** : l'éditeur
de page (un hôte de barre latérale : arbre de pages + éditeur à onglets) et **huit outils latéraux
React natifs**. La seule partie qui reste l'UI classique est l'onglet **Édition** de l'éditeur de
page, chargé dans une iframe.

## Le trio MelisCms / MelisFront / MelisEngine

Ces trois modules forment un système étroitement couplé ; une question concernant l'un d'eux implique
généralement les autres.

- **MelisEngine** — possède l'intégralité du modèle de base de données CMS (pages, arbre, sites,
  templates, langues, SEO, styles) et l'expose via des table gateways et des services. Définit
  `MelisTemplatingPlugin`, la classe de base dont hérite chaque bloc de contenu.
- **MelisFront** — pipeline de rendu front office ; transforme une URL en page terminée et alimente
  l'aperçu éditable en live dans le back-office (`renderMode/melis`).
- **MelisCms** *(ce module)* — la couche UI du back-office ; pilote le cycle de vie des pages en
  déclenchant des événements que les écouteurs de engine et front traitent.

**Ordre de chargement :** `melis-core` → `melis-front` → `melis-engine` → `melis-cms`.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCms',
];
```

Nécessite `melisplatform/melis-core`, `melisplatform/melis-engine` et `melisplatform/melis-front`.
Il n'a pas de SQL d'installation propre ; le schéma CMS fait partie de melis-engine. Les bricks
apparaissent dans le back-office React uniquement lorsque MelisCms est actif (découverte via
`GET /melis/react-api/react-modules`).

## Le back-office React — un bundle, neuf bricks

Le bundle (`public/ui-react/brick.js` + `brick.manifest.json`) déclare neuf bricks qui
s'auto-enregistrent dans `brick.tsx`. Tous sont en React natif complet, sauf l'onglet Édition de
l'éditeur de page.

| Id de brick | Route | melisKey | Type |
| --- | --- | --- | --- |
| `cms` | `/melis-cms/page` | `meliscms_page` | Éditeur de page (hôte de barre latérale : arbre + éditeur à onglets) |
| `cms-sites` | `/melis-cms/sites` | `meliscms_tool_sites` | React natif (liste + éditeur + assistant en 5 étapes) |
| `cms-templates` | `/melis-cms/templates` | `meliscms_tool_templates` | React natif (liste + formulaire) |
| `cms-styles` | `/melis-cms/styles` | `meliscms_tool_styles` | React natif |
| `cms-languages` | `/melis-cms/languages` | `meliscms_tool_language` | React natif |
| `cms-platform-ids` | `/melis-cms/platform-ids` | `meliscms_tool_platform_ids` | React natif |
| `cms-site-301` | `/melis-cms/site-301` | `meliscms_tool_site_301` | React natif |
| `cms-mini-templates` | `/melis-cms/mini-templates` | `meliscms_mini_template_manager_tool` | React natif |
| `cms-menu-manager` | `/melis-cms/menu-manager` | `meliscms_mini_template_menu_manager_tool` | React natif |

Le brick `cms` est particulier : il enregistre **à la fois** un `Component` routé (l'éditeur à
onglets) **et** une `Sidebar` (l'arbre de pages), afin que l'arbre reste visible dans la barre
latérale gauche pendant que vous travaillez. Chaque outil latéral porte une bascule **Nouveau /
Ancien** — *Nouveau* est l'UI React, *Ancien* est l'outil classique dans une iframe
(`/melis/react-tool-page?key=<melisKey>`).

![La section MelisCms dans la barre latérale React — le panneau ARBRE DE PAGES et le groupe Outils de site](/screenshots/react/melis-cms/meliscms-menu-entry.png)

## Arbre de pages (barre latérale gauche)

L'arbre de pages est la carte de vos sites et de chaque page qu'ils contiennent. Cliquez sur une page
pour l'ouvrir en tant qu'onglet principal dans l'éditeur ; la recherche trouve les pages non encore
chargées et déplie l'arbre jusqu'à elles ; le menu contextuel (clic droit) d'un nœud ajoute une page
enfant, affiche les détails, duplique une page ou toute une branche, ou supprime. Déplacez une page
par glisser-déposer (les droits côté serveur déterminent ce que vous pouvez déplacer).

![L'arbre de pages React — sites et pages, avec les indicateurs de brouillon, de verrou et de racine de site](/screenshots/react/melis-cms/meliscms-menu-site-treeview.png)

L'arbre réutilise les endpoints CMS legacy (aucun changement backend) via `cms-tree-api.ts` :

| Objectif | Endpoint |
| --- | --- |
| Enfants d'un nœud (lazy) | `GET /melis/MelisCms/TreeSites/get-tree-pages-by-page-id?nodeId=<id>` (`-1` = racines de site) |
| Rechercher des pages par nom | `POST /melis/MelisCms/Page/searchTreePages` |
| Déplacer / re-parenter | `GET /melis/MelisCms/Page/movePage` |
| Dupliquer un arbre | `POST /melis/MelisCms/TreeSites/duplicateTreePage` |
| Supprimer une page | `GET /melis/MelisCms/Page/deletePage?idPage=<id>` |

L'arbre écoute l'événement `melis:cms-tree-refresh` pour se rafraîchir et révéler une page après
Enregistrer/Publier/Supprimer.

## Éditeur de page

Ouvrez une page depuis l'arbre, ou utilisez le lien direct `/melis-cms/page/:idPage`. L'éditeur a un
**habillage React natif** (titre + statut, boutons d'action, barre d'onglets) autour du contenu des
onglets. L'habillage est assemblé à partir d'une structure fusionnée côté serveur
(`GET /melis/react-api/cms-page/structure?idPage=<id>` → `{ header, tabs[], buttons[] }`), si bien
que **d'autres modules peuvent ajouter des onglets et des boutons en fusionnant la config côté
serveur**.

Les onglets natifs d'abord, puis ceux ajoutés par d'autres modules : **Édition · Propriétés · SEO ·
Langues · Historique · Page Analytics · Scripts · Open Graph · Link Checker · Google Analytics ·
Versioning · Commentaires**. Boutons d'action : **Nouvelle page · Dupliquer · Effacer le brouillon ·
Supprimer la page · Voir · Afficher · Enregistrer · Publier** (plus un interrupteur de statut
Publié/En ligne et des boutons modulaires tels que Workflow).

### Onglet Propriétés (React natif)

Définissez le **nom** de la page, son **type** (Page / Dossier / Site…), son **template** (mise en
page), sa **langue** (verrouillée après la création), son **affichage dans le menu**, son **style**
et ses mots-clés de taxonomie.

![L'onglet Propriétés React — nom, type, template, langue, affichage dans le menu, style et taxonomie](/screenshots/react/melis-cms/meliscms-page-tab-properties.png)

### Onglet Édition (glisser-déposer legacy dans une iframe)

L'onglet Édition remplit la page : il effectue un rendu live et vous **glissez des blocs de contenu
(plugins)** dans les zones du template. C'est l'**éditeur classique chargé dans une iframe** à
l'intérieur de l'habillage React (`/melis/react-tool-page?key=meliscms_page&idPage=<id>`) ; le
glisser-déposer, le menu de plugins, le gestionnaire de mini-templates et les éditeurs de texte
riche sont les mêmes que dans le back-office classique. Leur contenu est enregistré automatiquement
dans la session PHP et écrit lorsque vous Enregistrez ou Publiez.

![L'onglet Édition — la page en live avec la surcouche de glisser-déposer, dans l'habillage de l'éditeur React](/screenshots/react/melis-cms/meliscms-page-tab-edition.png)

![Le panneau des plugins — les blocs de contenu que vous pouvez déposer sur la page ; la liste dépend des modules actifs du site](/screenshots/react/melis-cms/meliscms-page-tab-edition-menu-templating-plugins.png)

![Les dispositions de zone de glisser-déposer — choisissez comment diviser une zone pour placer vos blocs](/screenshots/react/melis-cms/meliscms-page-tab-edition-dragdropzone-layouts.png)

### Onglets SEO et Langues (React natif)

L'onglet **SEO** contient l'URL conviviale, le meta title/description, les URL canonique et de
redirection. L'onglet **Langues** gère les versions linguistiques de la page (chacune avec son propre
contenu et son propre SEO).

![L'onglet SEO React — URL, meta title/description et champs de redirection](/screenshots/react/melis-cms/meliscms-page-tab-seo.png)

### Enregistrer ou publier

- **Enregistrer** écrit le brouillon (Propriétés + SEO + le XML d'Édition ensemble, en une seule
  action).
- **Voir → Aperçu / Voir en ligne** affiche le brouillon ou la page live.
- **Publier** met le brouillon courant en ligne ; l'interrupteur de statut publie / dépublie.
- **Effacer le brouillon** annule le brouillon pour revenir à la version publiée.

Enregistrer/Publier envoient vers les endpoints **legacy** avec les noms de champs legacy :
`POST /melis/MelisCms/Page/savePage?idPage=` et `.../publishPage?idPage=` (plus `unpublishPage`,
`clearSavedPage`, `deletePage`) ; le XML d'Édition est lu depuis la session PHP.

## Outils latéraux

### Sites — créer et gérer les sites web

`/melis-cms/sites`. Chaque ligne est un site web entier (ID, nom, module, langues). **+ Nouveau
site** lance un **assistant en 5 étapes** : Multilingue → Langues → Domaines → Module → Récapitulatif.
Un site existant se gère via des onglets React natifs : **Propriétés · Chargement de modules ·
Domaines · Langues · Config du site · Traductions · Scripts**.

![L'outil Sites React — recherche, Colonnes, Export, bascule Nouveau/Ancien et + Nouveau site](/screenshots/react/melis-cms/meliscms-tool-sites-list.png)

![Édition de site — onglet Chargement de modules : interrupteurs par module avec réordonnancement par glisser-déposer de l'ordre de chargement](/screenshots/react/melis-cms/meliscms-tool-sites-edit-tab-moduleloading.png)

![Édition de site — onglet Config du site : Général plus paramètres clé/valeur par langue](/screenshots/react/melis-cms/meliscms-tool-sites-edit-tab-siteconfig.png)

### Templates — mises en page

`/melis-cms/templates`. Liste native et formulaire natif : Nom / Type / Site, et Layout / Controller
/ Action (la mise en page `.phtml` vers laquelle pointe le template).

![La liste Templates React — cartes KPI, controller/action, layout et site par ligne](/screenshots/react/melis-cms/meliscms-tool-templatemanager-list.png)

### Styles — CSS appliqué aux pages

`/melis-cms/styles`. Gérez les feuilles de style CSS (nom, chemin/source CSS, site) ; associez un
style à une page depuis l'onglet Propriétés de la page.

![La liste Styles React — statut, nom, chemin CSS et site par ligne](/screenshots/react/melis-cms/meliscms-tool-stylemanager-list.png)

### Langues front office

`/melis-cms/languages`. La liste principale des locales connues de la plateforme (locale + nom avec
drapeau).

### Identifiants de plateforme — plages d'ID de page par environnement

`/melis-cms/platform-ids`. Réserve une bande distincte d'ID de page et de template par environnement,
afin que les ID n'entrent jamais en collision lors du déplacement de contenu entre dev / staging /
production.

![La liste Identifiants de plateforme React — plages d'ID de page et de template par plateforme](/screenshots/react/melis-cms/meliscms-tool-platformids-list.png)

### Redirections 301 — maintenir les anciens liens fonctionnels

`/melis-cms/site-301`. Lorsqu'une URL publique change, ajoutez une redirection (ancienne URL →
nouvelle URL, unique par site) pour que l'ancienne adresse continue de résoudre.

![La liste Redirections 301 React — ancienne URL vers nouvelle URL par site](/screenshots/react/melis-cms/meliscms-tool-siteredirect-list.png)

### Mini-templates et gestionnaire de menu

Les Mini-templates (`/melis-cms/mini-templates`) sont des blocs de contenu pré-construits que les
éditeurs peuvent déposer sur une page en un clic ; le gestionnaire de menu
(`/melis-cms/menu-manager`) les organise en catégories afin qu'ils soient faciles à trouver dans le
gestionnaire de mini-templates de l'éditeur de page.

![Le gestionnaire de menu React — un arbre réordonnable par glisser-déposer de catégories et de leurs mini-templates](/screenshots/react/melis-cms/meliscms-tool-minitemplate-menu-manager.png)

## Endpoints de l'API React

Les routes sont déclarées dans `config/react-api.php` sous `/melis/react-api/…` ; les contrôleurs se
trouvent dans `src/Controller/MelisReactApi*Controller.php`. Chaque action est protégée par
`CapabilityGuardTrait` (`denyUnlessAccess()` pour `MelisCoreRights::canAccess(MELIS_KEY)`, puis
`denyUnlessCan('<action>')`). Le contrat partout est `{ success, data }` en cas de succès et
`{ success:false, error }` en cas d'échec ; chaque fetch envoie `X-Requested-With: XMLHttpRequest`
avec les credentials.

| Contrôleur | Guard (melisKey) | Base | Actions |
| --- | --- | --- | --- |
| `MelisReactApiPageController` | `meliscms_page` | `/cms-page` | `structure`, `properties`, `seo`, `refs`, `languages`, `ancestors`, `save-properties`, `save-seo` |
| `MelisReactApiCmsSitesController` | `meliscms_tool_sites` | `/cms-sites` | `list`, `meta`, `get`, `config`, `modules`, `create` |
| `MelisReactApiSiteRedirectController` | `meliscms_tool_site_301` | `/site-redirects` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiTemplateController` | `meliscms_tool_templates` | `/templates` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiCmsLanguageController` | `meliscms_tool_language` | `/cms-languages` | `list`, `stats`, `get`, `save`, `delete` |
| `MelisReactApiCmsPlatformIdController` | `meliscms_tool_platform_ids` | `/cms-platform-ids` | `list`, `stats`, `get`, `save`, `delete` |
| `MelisReactApiCmsStyleController` | `meliscms_tool_styles` | `/cms-styles` | `list`, `stats`, `sites`, `get`, `save`, `delete` |
| `MelisReactApiCmsMiniTemplateController` | `meliscms_mini_template_manager_tool` | `/cms-mini-templates` | `list`, `stats`, `sites`, `item`, `save`, `delete` |
| `MelisReactApiCmsMenuManagerController` | `meliscms_mini_template_menu_manager_tool` | `/menu-manager` | `sites`, `languages`, `tree`, `saveTree`, `category`, `saveCategory`, `deleteCategory` |

```ts
// GET the styles list (keyset), then POST a 301 redirect
const r = await fetch('/melis/react-api/cms-styles?limit=25', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
})
const { success, data } = await r.json()   // { success, data: { items, total, nextCursor } }

await fetch('/melis/react-api/site-redirects/save', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ id: null, siteId: 1, oldUrl: 'old', newUrl: 'new' }),
})
```

## Capacités

Déclarées dans `config/react.capabilities.php` sous `melisReactToolCapabilities`, indexées par le
`melisKey` porteur de droits de chaque outil (`export` uniquement là où l'outil a un bouton Export) :

```php
'meliscms_tool_site_301'                    => ['list','create','edit','delete','export','test'],
'meliscms_tool_templates'                   => ['list','create','edit','delete','export'],
'meliscms_tool_styles'                      => ['list','create','edit','delete','export'],
'meliscms_tool_language'                    => ['list','create','edit','delete'],
'meliscms_tool_platform_ids'                => ['list','create','edit','delete','export'],
'meliscms_tool_sites'                       => ['list','create','edit','delete','export'],
'meliscms_mini_template_manager_tool'       => ['list','create','edit','delete','export'],
'meliscms_mini_template_menu_manager_tool'  => ['list','create','edit','delete'],
```

L'éditeur de page est indexé sous `meliscms_page` comme un arbre structuré, de sorte que ses boutons
et ses onglets deviennent chacun une capacité :

```php
'meliscms_page' => [
  'actions' => ['create','save','clear','publish','status','delete','duplicate','view','display'],
  'tabs'    => ['edition','properties','seo','languages'],
],
```

Chaque module contributeur ajoute **ses** onglets/boutons de page sous cette même clé
`meliscms_page` (fusion Laminas), et `CmsPage.tsx` les filtre via `useCaps('meliscms_page').can(cap)`.
Deux clés associées dans le même fichier exposent les droits de l'éditeur : `melisReactRightsTools`
injecte un nœud `meliscms_page` uniquement de droits (« Page edition ») dans Utilisateurs → Droits,
et `melisReactSidebarHostSections` maintient la section MelisCms visible afin que l'arbre de pages
reste accessible même pour un utilisateur n'ayant que des droits de page.

## Points d'extension modulaires

D'autres modules contribuent des onglets d'éditeur de page et des sauvegardes inter-onglets sans
toucher à MelisCms :

```ts
// Register a page-edit tab (link-check, Open Graph, GA, historic, script-editor…)
window.__melisRegisterPageTab(key, ({ idPage }) => <MyTab idPage={idPage} />)
// Register a cross-cutting save hook, run by the global Save/Publish
window.__melisRegisterPageSaveHook(key, async (idPage) => { /* persist my tab */ })
```

Côté serveur, les mêmes points d'extension restent disponibles :

- **`melis_cms_page_tabs_alter`** — ajouter ou supprimer des onglets dans l'éditeur de page.
- **`modify_page_properties_form_config`** — modifier le formulaire Propriétés pour y ajouter des
  champs personnalisés.

## Services principaux

À résoudre avec `$sm->get('<alias>')`. La logique métier reste côté serveur (services Laminas) ;
React est la présentation plus les appels d'API.

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsPageService` | Écriture du modèle de page : `savePage()`, `savePagePublished()`, `savePageSaved()`, `savePageSeo()`, `savePageLang()`, `savePageStyle()`, `savePageTree()`, `saveProperties()`. |
| `MelisCmsSiteService` | CRUD des sites et requêtes de pages par site. |
| `MelisCmsPageGetterService` | `getPageContent($pageId)` — retourne le HTML rendu en cache d'une page. |
| `MelisCmsRights` | Vérifications des permissions back-office : `isAccessible()`, `isActionButtonActive()`. |
| `MelisCmsSitesDomainsService` | Gestion des domaines par environnement. |
| `MelisCmsSitesPropertiesService` | Paramètres clé/valeur du site (onglet Config du site). |
| `MelisCmsSiteModuleLoadService` | Chargement de modules par site (onglet Chargement de modules). |
| `MelisCmsMiniTemplateService` / `MelisCmsMiniTemplateGetterService` | Bibliothèque de mini-templates et gestion des catégories. |
| `MelisCmsPageExportService` / `MelisCmsPageImportService` | Export/import d'un arbre de pages sous forme de fichier. |

## Tables de base de données

`MelisCms` ne possède aucune table. Le schéma CMS est défini dans melis-engine et accessible via ses
gateways et services. Ne jamais interroger directement les tables CMS — utilisez les
gateways/services du moteur afin que le cache et le reste de l'écosystème restent cohérents.

## Événements du cycle de vie des pages

Le cycle de vie des pages est implémenté via 19 écouteurs câblés dans `Module.php::onBootstrap`. Ces
événements constituent le principal point d'extension — accrochez-vous à eux plutôt qu'appeler
`MelisCmsPageService` directement, afin que l'historique, les caches et les autres modules restent
synchronisés.

| Action | Événements |
| --- | --- |
| Enregistrer le brouillon | `meliscms_page_save_start` / `_end` (+ `…savetree_*`, `…saveproperties_*`, `…saveedition_*`, `…saveseo_*`) |
| Publier | `meliscms_page_publish_start` / `_end` |
| Dépublier | `meliscms_page_unpublish_start` / `_end` |
| Supprimer | `meliscms_page_delete_start` / `_end` (+ `…deleteseo_*`, `…delete_page_*`) |
| Déplacer | `meliscms_page_move_start` / `_end` |
| Dupliquer | `meliscms_page_duplicate_start` / `_end` |
| Session de plugin | `meliscms_page_savesession_plugin_*`, `meliscms_page_removesession_plugin_*` |

```php
// React to a page being published — in Module.php::onBootstrap or a listener's attach()
$eventManager->getSharedManager()->attach(
    'MelisCms',
    'meliscms_page_publish_end',
    function (\Laminas\EventManager\EventInterface $e) {
        $idPage = $e->getParams()['idPage'] ?? null;
        // log, sync, clear a custom cache, notify…
    },
    50
);
```

## Ajouter un nouveau bloc de contenu

Chaque bloc de contenu étend `MelisTemplatingPlugin` (défini dans melis-engine). Implémentez `front()`
pour le rendu sur le site live et `back()` pour le rendu du conteneur d'édition, puis enregistrez le
plugin. Les modules News, Slider et Category2 sont des implémentations de référence.

## Widget de tableau de bord

`MelisCmsPagesIndicatorsPlugin` affiche le nombre de sites et de pages (publiées ou non) sur le
tableau de bord du back-office.

![Le widget Indicateurs du tableau de bord — sites, pages, et pages publiées ou non](/screenshots/react/melis-cms/meliscms-dashboardplugins-indicators.png)

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Bootstrap du module + câblage des écouteurs | `vendor/melisplatform/melis-cms/src/Module.php` |
| Routes + contrôleurs de l'API React | `vendor/melisplatform/melis-cms/config/react-api.php` |
| Capacités React | `vendor/melisplatform/melis-cms/config/react.capabilities.php` |
| Source des bricks (les 9 outils) | `vendor/melisplatform/melis-cms/ui-react/src/` |
| Bundle compilé (commité) | `vendor/melisplatform/melis-cms/public/ui-react/brick.js` + `brick.manifest.json` |
| Service de page | `vendor/melisplatform/melis-cms/src/Service/MelisCmsPageService.php` |
| Service de site | `vendor/melisplatform/melis-cms/src/Service/MelisCmsSiteService.php` |
| Service de droits | `vendor/melisplatform/melis-cms/src/Service/MelisCmsRightsService.php` |
| Tous les écouteurs (19) | `vendor/melisplatform/melis-cms/src/Listener/` |
| Widget de tableau de bord | `vendor/melisplatform/melis-cms/src/Controller/DashboardPlugins/MelisCmsPagesIndicatorsPlugin.php` |

## Voir aussi

- [melis-engine](/fr/reference/modules/melis-engine) — possède le modèle de données CMS et tous les table gateways.
- [melis-front](/fr/reference/modules/melis-front) — rendu front office et aperçu live.
- [melis-core](/fr/reference/modules/melis-core) — authentification, droits, événements et config de base.
