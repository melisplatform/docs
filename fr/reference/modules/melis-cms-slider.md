# MelisCmsSlider

> Gestionnaire de sliders en backoffice et plugin de templating front-office qui affiche un slider
> sur une page. Paquet Composer `melisplatform/melis-cms-slider`.

## Objectif

MelisCmsSlider permet aux éditeurs de créer des **sliders** (des collections nommées de slides
ordonnés) en backoffice, puis de les déposer sur les pages front-office avec le plugin de templating
`MelisCmsSliderShowSliderPlugin`. Chaque slide porte un titre, trois sous-lignes, un lien, une image
et un statut actif/inactif ; seuls les slides actifs sont renvoyés au rendu front. C'est le module de
contenu de référence à lire en parallèle de [Plugins](/fr/guide/plugins).

## Activation

C'est un module Laminas standard. Ajoutez-le à `config/melis.module.load.php` :

```php
return [
    // …
    'MelisCmsSlider',
];
```

Dépendances Composer (`composer.json`) : `melis-core`, `melis-engine`, `melis-front`, `melis-cms`.
Le module embarque `dbdeploy: true`, ses tables sont donc créées/mises à jour via
[melis-dbdeploy](/fr/reference/modules). Les sliders se gèrent depuis la zone CMS — voir
[Construire un site](/fr/guide/build-a-site).

## Services principaux

Déclarés comme alias `service_manager` dans `config/module.config.php`.

| Alias | Rôle |
| --- | --- |
| `MelisCmsSliderService` | La logique métier des sliders. Encapsule les deux passerelles de tables et émet des événements `meliscmsslider_*`. |
| `MelisCmsSliderTable` | Passerelle de table pour `melis_cms_slider`. |
| `MelisCmsSliderDetailTable` | Passerelle de table pour `melis_cms_slider_details` (les slides). |

`MelisCmsSliderService` (étend `MelisCore\Service\MelisGeneralService`) expose :

| Méthode | Rôle |
| --- | --- |
| `getSliderList($start, $limit, $order, $search)` | Liste paginée/recherchable des sliders (chacun renvoyé comme entité slider complète). |
| `getSlider($sliderId, $status = null)` | Un slider avec ses slides ordonnés ; passez `$status = 1` pour ne garder que les slides actifs. |
| `getSliderByPageId($pageId, $status = null)` | Le slider rattaché à un id de page, avec ses slides. |
| `getSliderDetails($sliderDetailId)` | Une ligne de slide. |
| `saveSlider($slider, $sliderId = null)` | Insère/met à jour un slider ; renvoie l'id du slider. |
| `saveSliderDetails($sliderDetail, $sliderDetailId = null)` | Insère/met à jour un slide. |
| `updateSliderDetailsOrdering($sliderDetailId, $mcsdetail_order)` | Réordonne un slide. |
| `deleteSlider($sliderId)` | Supprime un slider et tous ses slides. |
| `deleteSliderDetails($sliderDetailId)` | Supprime un slide. |

`getSlider()` / `getSliderByPageId()` renvoient une entité `MelisCmsSlider\Entity\MelisCmsSlider`
dont `getSliderDetails()` fournit les slides.

## Backoffice

Le module ajoute l'outil **Gestionnaire de sliders** dans l'arbre des outils CMS
(`config/app.interface.php` / `config/app.tools.php`) :

- Entrée d'arbre d'outils `melis_cms_slider_tool` → section de melisKey `meliscms_slider_tools_section`.
- Une vue **liste** (`MelisCmsSlider_list`, melisKey `MelisCmsSlider_left_menu`) servie par la
  configuration de table `MelisCmsSlider_list` et
  `MelisCmsSlider\Controller\MelisCmsSliderListController`.
- Une vue **détails** (éditeur de slides) sous
  `MelisCmsSlider\Controller\MelisCmsSliderDetailsController`, avec la configuration de table
  `MelisCmsSlider_details`, un onglet propriétés et des modales d'ajout/édition/suppression/info de slide.
- `MelisSetupController` gère la configuration initiale (`melis-setup/setup-form`).

Le routage backoffice est le segment standard `/melis/MelisCmsSlider/<Controller>/<action>`.
`onBootstrap` (dans `src/Module.php`) attache quatre listeners backoffice :
`MelisCmsSliderFlashMessengerListener`, `MelisCmsSliderServiceMicroServiceListener`,
`MelisCmsSliderTableColumnDisplayListener`, `MelisCmsSliderToolCreatorEditionTypeListener`.

Pour construire votre propre outil comme celui-ci, voir [Créer un outil](/fr/guide/create-a-tool).

## Front office

Un **plugin de templating** affiche le slider sur une page (voir [Plugins](/fr/guide/plugins)).

| Plugin | Rôle |
| --- | --- |
| `MelisCmsSliderShowSliderPlugin` (`src/Controller/Plugin/`) | Récupère le slider configuré via `MelisCmsSliderService::getSlider($sliderId, 1)` et transmet `pluginId` + `showSlider` (les slides actifs) au template front. |

Configuration : `config/plugins/MelisCmsSliderShowSliderPlugin.config.php` — `configPluginKey` vaut
`meliscmsslider`, `pluginXmlDbKey` vaut `melisCmsSlider`. Le formulaire backoffice (un seul onglet
**Propriétés**) permet à l'éditeur de choisir un `template_path`
(`MelisEnginePluginTemplateSelect`) et un `sliderId` (l'élément de formulaire `CmsSliderSelect`,
fabrique `src/Form/Factory/CmsSliderSelectFactory.php`). Template front par défaut :
`MelisCmsSlider/showslider` (`view/melis-cms-slider/plugins/showslider.phtml`).

Également déclarés :

| Élément | Nom | Rôle |
| --- | --- | --- |
| Aide de vue | `MelisCmsSliderPlugin` (`src/View/Helper/MelisCmsSliderHelper.php`) | Affiche le plugin slider depuis un template : `$this->MelisCmsSliderPlugin($params)`. |
| Élément de formulaire | `CmsSliderSelect` | Un select peuplé des sliders disponibles, utilisé dans le formulaire d'options du plugin. |

## Tables de base de données

Créées par `install/dbdeploy/` (gérées par melis-dbdeploy) :

| Table | Rôle |
| --- | --- |
| `melis_cms_slider` | Un slider : `mcslide_id`, `mcslide_name`, `mcslide_page_id`, `mcslide_date`. |
| `melis_cms_slider_details` | Les slides : `mcsdetail_id`, `mcsdetail_mcslider_id`, `mcsdetail_status`, `mcsdetail_title`, `mcsdetail_sub1`–`sub3`, `mcsdetail_link`, `mcsdetail_img`, `mcsdetail_order`. |

## Exemple

Afficher un slider depuis un contrôleur front-office via le plugin de templating :

```php
// Dans une action de contrôleur
$plugin = $this->MelisCmsSliderShowSliderPlugin();
$pluginView = $plugin->render(['sliderId' => 1]);
$view->addChild($pluginView, 'showSlider');
// Dans le .phtml : echo $this->showSlider;
```

Ou lire directement les slides actifs d'un slider via le service :

```php
$sliderSrv = $serviceManager->get('MelisCmsSliderService');
$slider = $sliderSrv->getSlider($sliderId, 1); // statut 1 = actifs uniquement
$slides = $slider ? $slider->getSliderDetails() : [];
```

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Module / chargement de config | `vendor/melisplatform/melis-cms-slider/src/Module.php` |
| Câblage (services, routes, plugins, aides) | `vendor/melisplatform/melis-cms-slider/config/module.config.php` |
| Arbre d'outils backoffice | `vendor/melisplatform/melis-cms-slider/config/app.interface.php` |
| Configuration de table backoffice | `vendor/melisplatform/melis-cms-slider/config/app.tools.php` |
| Config du plugin de templating | `vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php` |
| Service | `vendor/melisplatform/melis-cms-slider/src/Service/MelisCmsSliderService.php` |
| Plugin de templating | `vendor/melisplatform/melis-cms-slider/src/Controller/Plugin/MelisCmsSliderShowSliderPlugin.php` |
| Aide de vue | `vendor/melisplatform/melis-cms-slider/src/View/Helper/MelisCmsSliderHelper.php` |
| Tables | `vendor/melisplatform/melis-cms-slider/src/Model/Tables/MelisCmsSliderTable.php`, `MelisCmsSliderDetailTable.php` |
| SQL d'installation | `vendor/melisplatform/melis-cms-slider/install/dbdeploy/83118_cms_slider_install.sql` |

Voir aussi : [Référence des modules](/fr/reference/modules) · [Plugins](/fr/guide/plugins) ·
[Construire un site](/fr/guide/build-a-site).
