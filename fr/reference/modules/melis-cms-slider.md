# MelisCmsSlider

> Gestionnaire de sliders / carousels en back-office avec un plugin de templating front-office pour afficher des sliders sur les pages.
> Paquet `melisplatform/melis-cms-slider`.

## Présentation

MelisCmsSlider fournit un outil back-office pour construire des **sliders** (des carousels nommés de slides ordonnés —
image, titre, sous-titres, lien) ainsi qu'un bloc de contenu `MelisCmsSliderShowSliderPlugin` qui affiche le slider
choisi sur n'importe quelle page front-office. Il embarque également un **sélecteur de slider** réutilisable en tant
qu'élément de formulaire, que d'autres modules (News, Blog) intègrent pour associer un slider à un contenu.

## Activation

Ajoutez à `config/melis.module.load.php` :

```php
return [
    // …
    'MelisCmsSlider',
];
```

Dépendances : `melis-core`, `melis-engine`, `melis-front`, `melis-cms` (`^5.2`). Le module embarque
`dbdeploy: true`, ses tables sont donc créées/mises à jour par melis-dbdeploy.

## Services principaux

| Alias | Rôle |
| --- | --- |
| `MelisCmsSliderService` | Logique métier des sliders et des slides ; émet des événements `meliscmsslider_*`. |
| `MelisCmsSliderTable` | Passerelle de table pour `melis_cms_slider`. |
| `MelisCmsSliderDetailTable` | Passerelle de table pour `melis_cms_slider_details`. |

`MelisCmsSliderService` étend `MelisGeneralService` et expose :

| Méthode | Rôle |
| --- | --- |
| `getSlider($sliderId, $status)` | Un slider avec ses slides ; passez `1` pour ne retourner que les slides actifs. |
| `getSliderByPageId($pageId, $status)` | Slider lié à un id de page, avec ses slides. |
| `getSliderList($start, $limit, $order, $search)` | Liste paginée et recherchable de sliders. |
| `getSliderDetails($sliderDetailId)` | Une ligne de slide. |
| `saveSlider($data, $sliderId)` | Créer ou mettre à jour un slider ; retourne l'id du slider. |
| `saveSliderDetails($slideData, $detailId)` | Créer ou mettre à jour un slide. |
| `updateSliderDetailsOrdering($detailId, $newOrder)` | Réordonner un slide. |
| `deleteSlider($sliderId)` | Supprimer un slider et tous ses slides. |
| `deleteSliderDetails($sliderDetailId)` | Supprimer un slide. |

`getSlider()` / `getSliderByPageId()` retournent une entité `MelisCmsSlider\Entity\MelisCmsSlider` dont
`getSlider()` fournit la ligne conteneur et `getSliderDetails()` fournit les slides.

**Note sur les noms d'événements :** chaque méthode émet des événements `meliscmsslider_service_*_start` / `_end`, mais
plusieurs méthodes d'écriture réutilisent les noms d'événements d'une autre méthode dans le code source actuel. En
particulier, `saveSlider` émet les événements `get_slider_details`, et `deleteSliderDetails` /
`updateSliderDetailsOrdering` réutilisent les événements `delete_details` de `deleteSlider` — un listener sur
`meliscmsslider_service_delete_details_end` se déclenche donc aussi lors des réordonnements.

**Micro-services** (`config/app.microservice.php`) exposent `getSliderList`, `getSlider`,
`getSliderDetails`, `getSliderByPageId`.

## Back-office

Le **Gestionnaire de sliders** est disponible dans le menu gauche du back-office sous les outils **CMS**. Il
fonctionne selon une navigation à trois niveaux :

| Niveau | Contrôleur | Rôle |
| --- | --- | --- |
| Liste des sliders | `MelisCmsSliderListController` | Liste tous les sliders de la plateforme ; modale de création / renommage. |
| Slides du slider | `MelisCmsSliderDetailsController` | Liste les slides d'un slider ; ajout / édition / suppression / réordonnement ; upload d'images vers `/media/sliders/`. |
| Configuration | `MelisSetupController` | Configuration initiale du module. |

La configuration des outils et des DataTables se trouve dans `config/app.tools.php` (deux tables) ;
le formulaire de slide (champs `mcsdetail_title`, `mcsdetail_sub1`–`sub3`, `mcsdetail_link`,
`mcsdetail_img`, `mcsdetail_order`) est dans `config/app.forms.php`.

## Front office

| Élément | Rôle |
| --- | --- |
| `MelisCmsSliderShowSliderPlugin` (plugin de contrôleur) | Récupère le slider configuré via `MelisCmsSliderService` et le rend via le template choisi. Config : `config/plugins/MelisCmsSliderShowSliderPlugin.config.php` — un onglet **Propriétés** avec `template_path` et `sliderId`. Template par défaut : `view/melis-cms-slider/plugins/showslider.phtml`. |
| `MelisCmsSliderPlugin` (aide de vue) | `MelisCmsSliderHelper` — affiche le plugin depuis un template phtml. |
| `CmsSliderSelect` (élément de formulaire) | Select peuplé des sliders disponibles ; fabrique `src/Form/Factory/CmsSliderSelectFactory.php`. Utilisé dans le formulaire d'options du plugin et intégré par News / Blog. |

**Interfaces de sélection réutilisables :** `meliscmsslider_select_slider` (`renderSelectSliderAction`) pour
News, `meliscmsslider_select_slider_blog` pour Blog.

**Consommateurs :** MelisCmsNews persiste le slider choisi dans `cnews_slider_id` et embarque un listener
qui dissocie un slider supprimé de toute actualité l'utilisant ; Blog utilise `cblog_slider_id`.

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_cms_slider` | Un slider : `mcslide_id`, `mcslide_name`, `mcslide_page_id`, `mcslide_date`. |
| `melis_cms_slider_details` | Un slide : `mcsdetail_id`, FK `mcsdetail_mcslider_id`, `mcsdetail_status`, `mcsdetail_title`, `mcsdetail_sub1`–`sub3`, `mcsdetail_link`, `mcsdetail_img`, `mcsdetail_order`. |

## Exemple

```php
$slider = $this->getServiceManager()->get('MelisCmsSliderService');

// Fetch one slider with active slides only
$one    = $slider->getSlider($sliderId, 1);

// Fetch the slider tied to a page
$byPage = $slider->getSliderByPageId($pageId, 1);

// Paginated list
$list   = $slider->getSliderList(0, 10, 'mcslide_id', null);

// Create / update
$id     = $slider->saveSlider($data, $sliderId);
$did    = $slider->saveSliderDetails($slideData, $detailId);

// Reorder
$slider->updateSliderDetailsOrdering($detailId, $newOrder);

// Delete slider + all its slides
$slider->deleteSlider($sliderId);
```

Écouter un événement du service :

```php
$sharedEvents->attach(
    'MelisCmsSlider',
    'meliscmsslider_service_delete_details_end',
    $fn,
    50
);
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Câblage du module | `vendor/melisplatform/melis-cms-slider/config/module.config.php` |
| Interface back-office / outils | `vendor/melisplatform/melis-cms-slider/config/app.interface.php` · `app.tools.php` |
| Formulaire de slide | `vendor/melisplatform/melis-cms-slider/config/app.forms.php` |
| Configuration micro-service | `vendor/melisplatform/melis-cms-slider/config/app.microservice.php` |
| Config du plugin de templating | `vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php` |
| Service | `vendor/melisplatform/melis-cms-slider/src/Service/MelisCmsSliderService.php` |
| Entité | `vendor/melisplatform/melis-cms-slider/src/Entity/MelisCmsSlider.php` |
| Passerelles de tables | `vendor/melisplatform/melis-cms-slider/src/Model/Tables/` |
| Fabrique du sélecteur de slider | `vendor/melisplatform/melis-cms-slider/src/Form/Factory/CmsSliderSelectFactory.php` |
| Aide de vue | `vendor/melisplatform/melis-cms-slider/src/View/Helper/MelisCmsSliderHelper.php` |
| Template front par défaut | `vendor/melisplatform/melis-cms-slider/view/melis-cms-slider/plugins/showslider.phtml` |

Voir aussi : [Référence des modules](/fr/reference/modules) · [Plugins](/fr/guide/plugins) ·
[Construire un site](/fr/guide/build-a-site)
