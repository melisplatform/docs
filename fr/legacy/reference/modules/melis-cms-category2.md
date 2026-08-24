# MelisCmsCategory2

> Catégories de contenu multi-sites et multilingues pour le CMS — paquet `melisplatform/melis-cms-category2`.

## Présentation

MelisCmsCategory2 fournit un système de catégories hiérarchique dans le backoffice Melis. Les catégories forment
un arbre (chaque nœud pointe vers un parent), portent des traductions par langue (nom et description), peuvent
être associées à un ou plusieurs sites, disposent d'une période de validité et d'un statut, et peuvent contenir
des fichiers médias. Le module embarque un plugin de templating front-office pour afficher un arbre de catégories
dans une page, ainsi qu'un sélecteur de catégorie réutilisable intégré par d'autres modules (par ex. News,
Commerce) pour classer leurs enregistrements.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsCategory2',
];
```

Nécessite `melis-core` et `melis-cms` (`^5.2`). Le module est compatible `dbdeploy`, ses tables sont donc
créées au déploiement. `melis-engine` est également requis pour le rendu front.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsCategory2Service` | Service principal des catégories : créer/lire les nœuds, récupérer l'arbre, gérer les traductions et les liens de site. |
| `MelisCmsCategory2MediaService` | Stockage des fichiers par catégorie sur le disque et en base de données. |

Méthodes notables de `MelisCmsCategory2Service` :

- `getCategoryTreeview($fatherId, $langId, $onlyValid, $siteId)` — arbre récursif.
- `getCategoryById($categoryId, $langId, $onlyValid)` — nœud de catégorie complet.
- `getCategoryNameById($categoryId, $langId)` — recherche du nom.
- `getCategoryListByIdRecursive(...)` — liste récursive à plat.
- `getCategoryTranslationById(...)` — ligne de traduction unique.
- `getFirstLevelCategoriesPerSite($siteId, $langId)`, `getCategoriesPerSite($siteId, $langId)`.
- `getCategoryMediaById(...)` — lignes de médias pour un nœud.
- `saveCategory(...)` — créer ou mettre à jour un nœud.
- `saveCategoryTexts($categoryId, $catLangId, $postData, $id)` — enregistrer une ligne de traduction.
- `saveCategorySites($categoryId, $siteId, $id, $toDelete)` — lier ou délier un site.
- `reOrderCategories($parentId, $currentOrder)` — persister le glisser-déposer pour réordonner.
- `validateDates($dateStart, $dateEnd)`.

`MelisCmsCategory2MediaService` gère la partie système de fichiers : `uploadFile`, `deleteFile`,
`getMediaFilesByCategoryId`, `getFilesInDir`, `removeCategoryDir`.

## Back-office

Le gestionnaire de catégories est accessible depuis la section des outils CMS du menu gauche du back-office
(icône `fa-th-list`). Il affiche les catalogues sous forme d'accordéon, chacun contenant son jsTree de
catégories, avec une barre de recherche et un filtre par site. Contrôleurs :

| Contrôleur | Utilisation |
| --- | --- |
| `MelisCmsCategoryListController` | Liste des catégories, vue en arbre, filtre par site, recherche, ajout de catalogue/catégorie. |
| `MelisCmsCategoryController` | Le formulaire d'édition de catégorie (traductions, statut, dates de validité, sites). |
| `MelisCmsCategoryMediaController` | L'onglet Média — parcourir, téléverser, supprimer les médias d'une catégorie. |
| `MelisCmsCategorySelectController` | La modale de sélection de catégorie, réutilisée par d'autres modules. |

L'élément de formulaire `MelisCmsCategorySelect` (factory `MelisCmsCategorySelectFactory`) permet à tout
module d'intégrer un sélecteur de catégorie dans ses propres formulaires.

## Front office

- **Plugin de templating** `MelisCmsCategoryDisplayCategoriesPlugin` — affiche un arbre de catégories dans une
  page. La configuration (`config/plugins/MelisCmsCategoryDisplayCategoriesPlugin.config.php`) expose
  un onglet Propriétés avec trois champs : `template_path`, `site_id`, `category_start`. Template par défaut :
  `MelisCmsCategory2/default` (`view/.../plugins/default.phtml`).
- **Aide de vue** `renderTreeRec` — affiche récursivement un tableau d'arbre de catégories dans une vue.

Utilisation directe dans le code :

```php
$display = $this->MelisCmsCategoryDisplayCategoriesPlugin();
echo $display->render([
    'template_path' => ['MelisCmsCategory2/default'],
    'site_id'        => 1,
    'category_start' => 1,
]);
```

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_cms_category2` | Nœud de catégorie : `cat2_id`, `cat2_father_cat_id`, ordre, statut, référence, dates de validité, audit. |
| `melis_cms_category2_trans` | Traduction par langue : nom et description, indexée par `catt2_id`. |
| `melis_cms_category2_sites` | Lien catégorie-site, indexé par `cats2_id`. |
| `melis_cms_category2_media` | Média attaché à une catégorie : `catm2_type`, `catm2_path`, `catm2_cat_id`. |

Un nœud racine de départ (`cat2_id = 1`, "My catalog" / "Mon catalogue") est inséré à l'installation.

## Exemple

Récupérer et afficher l'arbre de catégories depuis n'importe quel contrôleur ou service :

```php
$cat = $this->getServiceManager()->get('MelisCmsCategory2Service');

// Recursive tree — valid categories only, scoped to a site
$tree = $cat->getCategoryTreeview($fatherId, $langId, true, $siteId);

// Single node with translations
$node = $cat->getCategoryById($categoryId, $langId, false);

// Name lookup
$name = $cat->getCategoryNameById($categoryId, $langId);

// All categories for a site
$site = $cat->getCategoriesPerSite($siteId, $langId);
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Config du module (services, contrôleurs, plugin, aide de vue) | `vendor/melisplatform/melis-cms-category2/config/module.config.php` |
| Arbre des outils / interfaces back-office | `vendor/melisplatform/melis-cms-category2/config/app.interface.php` |
| Service principal | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryService.php` |
| Service média | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryMediaService.php` |
| Factory de l'élément de formulaire sélecteur de catégorie | `vendor/melisplatform/melis-cms-category2/src/Form/Factory/MelisCmsCategorySelectFactory.php` |
| Plugin de templating | `vendor/melisplatform/melis-cms-category2/src/Controller/Plugin/MelisCmsCategoryDisplayCategoriesPlugin.php` |
| Config du plugin | `vendor/melisplatform/melis-cms-category2/config/plugins/MelisCmsCategoryDisplayCategoriesPlugin.config.php` |
| SQL d'installation | `vendor/melisplatform/melis-cms-category2/install/sql/` |

Voir aussi : [melis-cms](/fr/legacy/reference/modules/melis-cms), [melis-core](/fr/legacy/reference/modules/melis-core), [melis-cms-news](/fr/legacy/reference/modules/melis-cms-news)
