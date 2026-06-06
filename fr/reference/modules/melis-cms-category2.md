# MelisCmsCategory2

> Catégories de contenu multi-sites et multilingues pour le CMS — paquet `melisplatform/melis-cms-category2`.

## Objectif

MelisCmsCategory2 ajoute un système de catégories hiérarchique au backoffice Melis. Les catégories
forment un arbre (chaque ligne pointe vers un parent), portent des traductions par langue (nom +
description), peuvent être rattachées à un ou plusieurs sites, disposent d'une période de validité
et d'un statut, et peuvent contenir des fichiers médias. Le module fournit aussi un plugin de
templating front-office pour afficher un arbre de catégories dans une page, ainsi qu'un listener qui
alimente les catégories dans le plugin de liste de news de MelisCmsNews. C'est la base pour
catégoriser du contenu (notamment les news) par catégorie, à travers les sites et les langues.

## Activation

C'est un module Laminas standard, déclaré dans `config/melis.module.load.php` (entrée
`'MelisCmsCategory2'`). Il dépend de `melis-core` et `melis-cms` (selon `composer.json`), et en
pratique de `melis-engine` pour le rendu front. Le module est compatible `dbdeploy`, ses tables sont
donc créées au déploiement. Voir [Référence des modules](/fr/reference/modules) et
[Construire un site](/fr/guide/build-a-site).

## Services principaux

Déclarés comme alias du service manager dans `config/module.config.php` :

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsCategory2Service` | Service principal des catégories (`Service\MelisCmsCategoryService`) : créer/lire les catégories, l'arbre et les traductions. |
| `MelisCmsCategory2MediaService` | Service média (`Service\MelisCmsCategoryMediaService`) : stockage des fichiers par catégorie sur le disque + en base. |

Méthodes notables de `MelisCmsCategory2Service` :

- `saveCategory($parentId, $status, $currentUserId, $validDateStart, $validDateEnd, $categoryId, $postValues)` — crée/met à jour une catégorie (déclenche les événements `melis_cms_category_save_category2_start`).
- `saveCategoryTexts($categoryId, $catLangId, $postData, $id = null)` — enregistre une ligne de traduction.
- `saveCategorySites($categoryId, $siteId, $id = null, $tobeDeleted = false)` — lie/délie une catégorie à un site.
- `getCategoryById($categoryId, $langId = null, $onlyValid = false)`, `getCategoryDataById($categoryId)`, `getCategoryNameById(...)`, `getCategoryTranslationById(...)`.
- `getCategoryTreeview($fatherId = null, $langId = null, $onlyValid = false, $siteId = null)` — l'arbre récursif.
- `getFirstLevelCategoriesPerSite($siteId, $langId = 1)`, `getCategoriesPerSite($siteId, $langId = 1)`, `returnCategoryBasedFromSiteId(...)`.
- `reOrderCategories($parentId, $currentOrder)`, `validateDates($dateStart, $dateEnd)`.
- `getCategoryNewsList(...)` — utilisé par l'intégration avec la liste de news.

`MelisCmsCategory2MediaService` gère la partie fichiers : `getMediaFilesByCategoryId($categoryId, $fileType = 'file')`, `uploadFile(...)`, `deleteFile(...)`, `removeCategoryDir($categoryId)`, ainsi que des utilitaires de répertoire.

## Backoffice

L'outil est monté sous l'arbre des outils CMS (`config/app.interface.php`). L'entrée racine de
melisKey `melis_cms_category_v2` ouvre l'outil `melis_cms_categories_v2`, qui forward vers le module
`MelisCmsCategory2`, contrôleur `MelisCmsCategoryList`, action `render-categories-page`.
Contrôleurs :

| Contrôleur | Usage |
| --- | --- |
| `MelisCmsCategoryListController` | Liste des catégories, vue en arbre, filtre par site, recherche. |
| `MelisCmsCategoryController` | Le formulaire d'édition (statut, traductions, dates de validité, sites). |
| `MelisCmsCategoryMediaController` | L'onglet Média et la mini médiathèque. |
| `MelisCmsCategorySelectController` | La modale « sélectionner une catégorie dans un arbre » (réutilisée par les plugins). |

L'interface liste/édition est construite à partir des melisKeys `interface` imbriqués (p. ex.
`melis_cms_categories_v2_list`, `meliscategory_categories_category`,
`meliscategory_category_tab_media`), et l'élément de formulaire `MelisCmsCategorySelect` (factory
`MelisCmsCategorySelectFactory`) est utilisé par d'autres modules pour choisir une catégorie.
L'interface en arbre utilise les assets jsTree livrés dans `public/`. Voir
[Créer un outil](/fr/guide/create-a-tool).

## Front-office

- **Plugin de templating** `MelisCmsCategoryDisplayCategoriesPlugin` (invokable `controller_plugins` ;
  config dans `config/plugins/MelisCmsCategoryDisplayCategoriesPlugin.config.php`, clé de config
  `meliscmscategory2`). Il affiche un arbre de catégories dans une page. Son `front()` lit
  `category_start`, `site_id` et la langue courante du plugin, puis appelle `getCategoryTreeview()` /
  `returnCategoryBasedFromSiteId()` et passe `cmsCategoryTreeData` à la vue. Le formulaire d'édition
  en backoffice expose un sélecteur de template, un sélecteur de catégorie de départ
  (`MelisCmsCategorySelect`) et un sélecteur de site. Voir [Plugins](/fr/guide/plugins).
- **Aide de vue** `renderTreeRec` (`View\Helper\RenderRecTreeHelper`) — affiche récursivement un
  tableau d'arbre de catégories dans une vue.
- **Listener** `MelisCmsCategoryNewsListListener` — s'attache à l'événement partagé
  `meliscmsnews_list` ; lorsqu'un plugin de liste de news porte un `categoryIdNews`, il injecte les
  news correspondantes dans `newsList` via `getCategoryNewsList()`. Un second listener,
  `MelisCmsCategory2FlashMessengerListener`, ne s'exécute qu'au rendu backoffice.

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_cms_category2` | Le nœud de catégorie : `cat2_id`, `cat2_father_cat_id`, `cat2_order`, `cat2_status`, `cat2_reference`, `cat2_date_valid_start/end`, audit création/édition. |
| `melis_cms_category2_trans` | Traduction par langue : `catt2_category_id`, `catt2_lang_id`, `catt2_name`, `catt2_description`. |
| `melis_cms_category2_sites` | Lien catégorie-site : `cats2_cat2_id`, `cats2_site_id`. |
| `melis_cms_category2_media` | Média rattaché à une catégorie : `catm2_cat_id`, `catm2_type`, `catm2_path`. |

## Exemple

Récupérer l'arbre des catégories pour un site et une langue depuis n'importe quel contrôleur/service :

```php
$catSvc = $this->getServiceManager()->get('MelisCmsCategory2Service');

// Arbre récursif, catégories valides uniquement, limité à un site
$tree = $catSvc->getCategoryTreeview(null, $langId, true, $siteId);

// L'afficher récursivement dans une vue
echo $this->renderTreeRec($tree);
```

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Config du module (services, contrôleurs, plugin, aide de vue) | `vendor/melisplatform/melis-cms-category2/config/module.config.php` |
| Arbre des outils / interfaces backoffice | `vendor/melisplatform/melis-cms-category2/config/app.interface.php` |
| Service principal | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryService.php` |
| Service média | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryMediaService.php` |
| Plugin de templating | `vendor/melisplatform/melis-cms-category2/src/Controller/Plugin/MelisCmsCategoryDisplayCategoriesPlugin.php` |
| Config du plugin | `vendor/melisplatform/melis-cms-category2/config/plugins/MelisCmsCategoryDisplayCategoriesPlugin.config.php` |
| Aide de vue | `vendor/melisplatform/melis-cms-category2/src/View/Helper/RenderRecTreeHelper.php` |
| Listener liste de news | `vendor/melisplatform/melis-cms-category2/src/Listener/MelisCmsCategoryNewsListListener.php` |
| Bootstrap du module | `vendor/melisplatform/melis-cms-category2/src/Module.php` |
| SQL d'installation | `vendor/melisplatform/melis-cms-category2/install/sql/setup_structure.sql` |
