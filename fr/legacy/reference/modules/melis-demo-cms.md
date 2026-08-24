# MelisDemoCms

> Le site de référence et de démonstration officiel de Melis Platform — un **module de site**
> prêt à installer qui montre aux développeurs comment un site front-office Melis est architecturé.
> Paquet `melisplatform/melis-demo-cms`.

## Présentation

`MelisDemoCms` est un site web front-office complet et installable (`melis-site: true`,
`type: melisplatform-module`, catégorie `cms`). Ce n'est pas un outil de back-office : ses pages,
contrôleurs et gabarits de plugins illustrent les trois techniques de composition de contenu —
**placement manuel de plugins**, **zones de drag-and-drop** et **balises éditables en ligne** —
en s'appuyant sur MelisFront, MelisEngine et les modules de contenu CMS (slider, actualités,
prospects). À utiliser comme implémentation de référence pour
[construire un site](/fr/legacy/guide/build-a-site).

## Activation

`MelisDemoCms` est un module de site Laminas installé sous `module/MelisSites/MelisDemoCms/` par
les `installer-paths` de Composer. Son propre `config/module.load.php` déclare les modules qu'il
attend à ses côtés :

```php
// vendor/melisplatform/melis-demo-cms/config/module.load.php
'MelisAssetManager', 'MelisEngine', 'MelisFront',
'MelisCmsNews', 'MelisCmsSlider', 'MelisCmsProspects',
'MelisDemoCms', 'MelisCmsPageScriptEditor'
```

Dépendances Composer requises : `melis-cms`, `melis-cms-slider`, `melis-cms-prospects`,
`melis-cms-news`, `melis-cms-page-script-editor` (`^5.2`). `melis-engine` et `melis-front` sont
suggérés (et requis à l'exécution). Le site est activé pour un domaine en définissant la variable
d'environnement vhost `MELIS_MODULE "MelisDemoCms"`.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `DemoCmsService` | Aides propres au site, utilisées par les contrôleurs front et les listeners d'installation. |
| `MelisPlatformTable` | Table gateway générique sur la table centrale de la plateforme (`MelisEngine\Model\Tables\MelisGenericTable`, clé primaire `plf_id`). |

## Back-office

Ce module n'ajoute aucune entrée dans l'arbre des outils du back-office. Sa seule surface
back-office est l'**assistant de mise en place du site** utilisé par la marketplace / l'installeur :
contrôleurs `MelisDemoCms\Controller\MelisSetupController` (route `/MelisDemoCms/setup`),
`MelisSetupPostDownloadController` et `MelisSetupPostUpdateController`. La configuration de setup
se trouve dans `config/setup/download.config.php` et `config/setup/update.config.php`.

## Front office

Le site est piloté par de simples contrôleurs de site MelisFront, un par type de page :

| Contrôleur | Page |
| --- | --- |
| `MelisDemoCms\Controller\Home` | Accueil (carrousel + slider secondaire, témoignages, bannière RGPD) |
| `MelisDemoCms\Controller\News` | Liste / détail des actualités |
| `MelisDemoCms\Controller\Team` | Équipe |
| `MelisDemoCms\Controller\Services` | Liste / détail des services |
| `MelisDemoCms\Controller\Faq` | Liste FAQ et blocs par catégorie |
| `MelisDemoCms\Controller\Contact` | Contact / formulaire prospects |
| `MelisDemoCms\Controller\Testimonial` | Témoignages |
| `MelisDemoCms\Controller\Template` | Démos de gabarits (statique / drag-drop / mixte) |
| `MelisDemoCms\Controller\Page404` | Page d'erreur 404 |

Plutôt que de livrer ses propres plugins, `MelisDemoCms` fournit des **gabarits de plugins**
(`view/plugins/*.phtml`) câblés dans `config/melis.plugins.config.php` :

| Plugin de templating (module propriétaire) | Gabarits fournis |
| --- | --- |
| `MelisFrontMenuPlugin` (MelisFront) | `menu`, `white-menu`, `footer-menu` |
| `MelisFrontShowListFromFolderPlugin` (MelisFront) | `faq-listing`, `faq-values`, `home-testimonial-slider` |
| `MelisFrontGdprBannerPlugin` (MelisFront) | `gdpr-banner` |
| `MelisCmsSliderShowSliderPlugin` (MelisCmsSlider) | `home-carousel-slider`, `home-slider2`, `team-slider` |
| `MelisCmsNewsListNewsPlugin` / `…ShowNewsPlugin` / `…LatestNewsPlugin` (MelisCmsNews) | `news-list`, `news-details`, `latest-news-vertical`, `latest-news-horizontal` |
| `MelisCmsProspectsShowFormPlugin` (MelisCmsProspects) | `prospect-form` |

### Les trois techniques de composition

| Technique | Fonctionnement | Pages concernées |
| --- | --- | --- |
| **Placement manuel** | Le plugin est instancié dans le contrôleur, rendu avec des paramètres et ajouté comme enfant de la vue — la vue l'affiche avec `echo`. | Accueil, Équipe (slider), Actualités, FAQ, Contact |
| **Zone de drag-and-drop** | Le `.phtml` déclare une zone nommée ; l'éditeur back-office y dépose n'importe quel plugin sans aucun code contrôleur. | Démos DragDrop, Template |
| **Balises éditables en ligne** | `MelisTag` encapsule une valeur par défaut dans la vue ; l'utilisateur back-office modifie le texte / les images directement en place. | Services, Témoignages, 404 |

### Listeners

`SetupDemoCmsListener` pilote le processus d'installation du site.
`MelisDemoCmsCreateConfigListener` génère `MelisDemoCms.config.php` à partir du `.config.stub` après
une installation via la marketplace. `SiteMenuCustomizationListener` personnalise le menu front.
`LatestNewsHorizontalListener` ajuste la sortie du plugin de dernières actualités.

## Base de données

`MelisDemoCms` ne définit aucune table `melis_*` propre. `MelisPlatformTable` lit la table centrale
`melis_core_platform`. Tout le contenu de la démo (pages, gabarits, sliders, actualités, clés de
config) est créé à l'installation par les listeners de setup, à partir des valeurs de
`config/MelisDemoCms.config.php` telles que `home_page_id`, `news_page_id` et
`home_page_slider_1_id`.

## Exemple

Un contrôleur front rend un plugin de templating en lui injectant un chemin de gabarit propre au
site et un identifiant issu de la config — le motif utilisé partout dans le site (`HomeController`) :

```php
$cfg = $this->getServiceManager()->get('MelisSiteConfigService');

$slider = $this->MelisCmsSliderShowSliderPlugin();
$homeSlider1 = $slider->render([
    'template_path' => 'MelisDemoCms/plugins/home-carousel-slider',
    'id'            => 'homeSlider1',
    'pageId'        => $this->idPage,
    'sliderId'      => $cfg->getSiteConfigByKey('home_page_slider_1_id', $this->idPage),
]);
$this->view->addChild($homeSlider1, 'homeSlider1');
// vue : <?= $this->homeSlider1 ?>
```

Une zone de drag-and-drop ne nécessite qu'un seul appel dans la vue — aucun code contrôleur :

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

Une balise éditable en ligne avec une valeur par défaut :

```php
<?= $this->MelisTag($this->idPage, 'static-html-1', 'html', '<h1>Accessible…</h1>') ?>
```

## Fichiers clés

| Élément | Chemin (sous `vendor/melisplatform/melis-demo-cms/`) |
| --- | --- |
| Routes, contrôleurs, mapping de gabarits | `config/module.config.php` |
| Modules chargés avec le site | `config/module.load.php` |
| Câblage des gabarits de plugins | `config/melis.plugins.config.php` |
| Clés de config par site (IDs de page / slider / dossier) | `config/MelisDemoCms.config.php`, `…config.stub` |
| Flux de setup du site | `config/setup/download.config.php`, `config/setup/update.config.php` |
| Bootstrap et enregistrement des listeners | `src/Module.php` |
| Service d'aide du site | `src/Service/DemoCmsService.php` |
| Contrôleurs de setup et post-installation | `src/Controller/MelisSetupController.php`, `…PostDownloadController.php`, `…PostUpdateController.php` |
| Listeners d'installation / menu / actualités | `src/Listener/` |
| Gabarits de plugins | `view/plugins/*.phtml` |
| Gabarits de pages | `view/melis-demo-cms/*/*.phtml` |
| Démos de gabarits | `view/melis-demo-cms/template/` |

Voir aussi : [Référence des modules](/fr/legacy/reference/modules), [Construire un site](/fr/legacy/guide/build-a-site),
[Plugins](/fr/legacy/guide/plugins).
