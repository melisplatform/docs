# MelisCms

> Le backoffice CMS — sites, arbre de pages, éditeur de page, templates, styles et SEO.
> Paquet Composer `melisplatform/melis-cms`.

## Objectif

`MelisCms` est le backoffice de gestion de contenu de Melis Platform. Il fournit l'explorateur de
l'arbre des sites, l'éditeur de page (onglets Édition, Propriétés, SEO, Langues), les zones de
glisser-déposer de plugins servant à composer le contenu d'une page, ainsi que les outils
d'administration des sites, templates, styles, langues, identifiants de plateforme, domaines et
redirections de site. Il écrit les données de page/site que
[melis-engine](/fr/reference/modules/melis-engine) lit et que
[melis-front](/fr/reference/modules/melis-front) affiche. Pour le déroulé complet, voir
[Construire un site](/fr/guide/build-a-site).

## Activation

`MelisCms` est un module Laminas standard. Il est livré activé dans le skeleton — son nom figure
dans `config/melis.module.load.php` :

```php
return [
    'MelisCms',
    // …
];
```

Il dépend de `melisplatform/melis-core`, `melisplatform/melis-engine` et
`melisplatform/melis-front` (déclarés dans son `composer.json`). Il n'a pas de SQL d'installation
propre ; les tables CMS font partie du schéma de la plateforme (définies via melis-engine, voir
plus bas).

## Services clés

Enregistrés sous `service_manager` dans `config/module.config.php`. Résolvez-les avec
`$sm->get('<alias>')`.

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsPageService` | Enregistre une page et ses parties : `savePage()`, `savePagePublished()`, `savePageSaved()`, `savePageSeo()`, `savePageLang()`, `savePageStyle()`, `savePageTree()`, `duplicatePage()`, `saveProperties()`. |
| `MelisCmsSiteService` | Gestion des sites : `saveSite()`, `getSitePages()`, `getAllSites()`, `getSiteById()`, `getSiteByModule()`, `getModulePath()`. |
| `MelisCmsPageGetterService` | `getPageContent($pageId)` — renvoie le HTML complet d'une page (utilise le cache de page sous `/cache` ; la page doit avoir été générée au moins une fois). |
| `MelisCmsRightsService` (alias `MelisCmsRights`) | Résout l'accès de l'utilisateur aux éléments de l'interface : `isAccessible()`, `getRightsValues()`, `createXmlRightsValues()`, `isActionButtonActive()`. |
| `MelisCmsSitesDomainsService` | Domaines par environnement : `getEnvironments()`, `getDomainsBySiteId()`, `getDomainBySiteIdAndEnv()`, `saveSiteDomain()`. |
| `MelisCmsSitesPropertiesService` | Propriétés de site (réglages clé/valeur du site). |
| `MelisCmsSiteModuleLoadService` | Chargement de modules par site. |
| `MelisCmsMiniTemplateService` / `MelisCmsMiniTemplateGetterService` | Mini-templates (blocs de contenu réutilisables en backoffice) et leurs catégories : `createMiniTemplate()`, `saveCategory()`, `getTree()`, `getMiniTemplates()`. |
| `MelisCmsPageExportService` / `MelisCmsPageImportService` | Exporte un arbre de pages en ZIP et le réimporte. |

## Backoffice

`MelisCms` ajoute la section CMS du backoffice. L'arbre de l'interface se trouve dans
`config/app.interface.php` / `config/app.tools.php` ; les outils sont adressés par `melisKey`.
Entrées principales :

| melisKey | Outil |
| --- | --- |
| `meliscms_sitetree` | L'explorateur de l'arbre des sites (menu de gauche + éditeur de page au centre). |
| `meliscms_site_tools` | Groupe d'administration de site. |
| `meliscms_tool_sites` | Outil Sites. |
| `meliscms_tool_templates` | Outil Templates (contrôleur `ToolTemplate`). |
| `meliscms_tool_styles` | Outil Styles (`ToolStyle`). |
| `meliscms_tool_language` | Outil Langues. |
| `meliscms_tool_platform_ids` | Outil Identifiants de plateforme. |
| `meliscms_tool_site_301` | Outil Redirection de site (301). |
| `meliscms_mini_template_manager` | Gestionnaire de mini-templates. |

Les contrôleurs de l'éditeur de page comprennent `PageController`, `PageEditionController`,
`PagePropertiesController`, `PageSeoController`, `PageLanguagesController` et
`PageDuplicationController`. `FrontPluginsController` pilote le menu des plugins dans l'éditeur et
la fenêtre modale de configuration des plugins utilisée par les zones de glisser-déposer.

### Plugin de dashboard

`MelisCmsPagesIndicatorsPlugin` (module `meliscms`, action `pageIndicators`) est un widget du
dashboard backoffice qui présente des indicateurs de pages. Voir [Plugins](/fr/guide/plugins) pour
le modèle des plugins de dashboard.

## Front office

`MelisCms` est un module de backoffice et ne fournit **aucun** plugin de templating ni view helper
propre — le rendu front est assuré par [melis-engine](/fr/reference/modules/melis-engine) et
[melis-front](/fr/reference/modules/melis-front). Ce qu'il fournit côté édition, c'est la surface
d'**autoring** des plugins : les éditeurs déposent des blocs de contenu dans une
`MelisDragDropZone` de la page, et `FrontPluginsController` affiche le menu des plugins, les
formulaires modaux et enregistre les paramètres choisis dans le contenu de la page. Des fabriques
d'éléments de formulaire comme `MelisCmsPluginSiteSelect` et `MelisCmsPluginSiteModuleSelect` sont
réutilisées par les formulaires de plugins d'autres modules.

## Tables de base de données

`MelisCms` opère sur le schéma CMS de base (les table gateways sont définis dans melis-engine et
consommés par les services CMS) :

| Table | Contenu |
| --- | --- |
| `melis_cms_site` | Sites. |
| `melis_cms_site_config` | Configuration par site. |
| `melis_cms_site_domain` | Domaines par environnement. |
| `melis_cms_site_home` | Page d'accueil du site. |
| `melis_cms_site_langs` | Langues activées par site. |
| `melis_cms_page_tree` | L'arbre des pages (hiérarchie). |
| `melis_cms_page_saved` | Contenu de page enregistré (brouillon). |
| `melis_cms_page_published` | Contenu de page publié. |
| `melis_cms_page_lang` | Liens de langue des pages. |
| `melis_cms_page_seo` | SEO par page. |
| `melis_cms_page_style` | Styles par page. |
| `melis_cms_page_default_urls` | URLs par défaut/canoniques des pages. |
| `melis_cms_template` | Templates. |
| `melis_cms_style` | Styles. |
| `melis_cms_lang` | Langues CMS. |
| `melis_cms_platform_ids` | Identifiants de plateforme (environnements). |
| `melis_cms_mini_tpl_category`, `melis_cms_mini_tpl_site_category`, `melis_cms_mini_tpl_category_template` | Catégories de mini-templates et liens. |

## Exemple

Enregistrer une page puis relire son HTML rendu :

```php
// Dans un contrôleur / service avec le service manager disponible
$pageSrv = $sm->get('MelisCmsPageService');
$pageId  = $pageSrv->savePage($pageTree, $pagePublished, $pageSaved, $pageSeo, $pageLang, $pageStyle);

$pageGetter  = $sm->get('MelisCmsPageGetterService');
$pageContent = $pageGetter->getPageContent($pageId); // HTML complet (la page doit avoir été générée une fois)
```

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Config du module (services, contrôleurs, plugin de dashboard) | `vendor/melisplatform/melis-cms/config/module.config.php` |
| Arbre de l'interface backoffice | `vendor/melisplatform/melis-cms/config/app.interface.php` |
| Outils (templates, styles, …) | `vendor/melisplatform/melis-cms/config/app.tools.php` |
| Service de page | `vendor/melisplatform/melis-cms/src/Service/MelisCmsPageService.php` |
| Service de site | `vendor/melisplatform/melis-cms/src/Service/MelisCmsSiteService.php` |
| Récupération de page (HTML/cache) | `vendor/melisplatform/melis-cms/src/Service/MelisCmsPageGetterService.php` |
| Service de droits | `vendor/melisplatform/melis-cms/src/Service/MelisCmsRightsService.php` |
| Contrôleur de plugins de l'éditeur | `vendor/melisplatform/melis-cms/src/Controller/FrontPluginsController.php` |
| Plugin de dashboard | `vendor/melisplatform/melis-cms/src/Controller/DashboardPlugins/MelisCmsPagesIndicatorsPlugin.php` |
| Écouteurs d'événements | `vendor/melisplatform/melis-cms/src/Listener/` |

## Voir aussi

- [Construire un site](/fr/guide/build-a-site) — le workflow CMS + engine + front.
- [Plugins](/fr/guide/plugins) — plugins de templating et de dashboard.
- [Référence des modules](/fr/reference/modules) — tous les modules de la plateforme.
