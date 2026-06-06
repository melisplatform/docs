# MelisDemoCms

> Le site de démonstration officiel de Melis Platform — l'exemple canonique d'un **module de site**.
> Paquet Composer : `melisplatform/melis-demo-cms`.

## Objectif

`MelisDemoCms` est un site web front-office prêt à l'emploi livré avec Melis Platform. Ce n'est pas
un outil de backoffice : c'est un **site** (`type: melisplatform-site`, `extra.melis-site: true`)
dont les pages, gabarits et contrôleurs front montrent comment relier le rendu MelisFront/MelisEngine
aux modules de contenu du CMS — sliders, actualités, prospects (formulaires de contact), listes par
dossier et bannière RGPD. À lire comme l'implémentation de référence pour
[Construire un site](/fr/guide/build-a-site).

## Activation

`MelisDemoCms` est un module Laminas standard. Il est listé dans le `config/melis.module.load.php`
du squelette ; le `config/module.load.php` du module déclare les modules qu'il attend à ses côtés :

```php
// vendor/melisplatform/melis-demo-cms/config/module.load.php
'MelisAssetManager', 'MelisEngine', 'MelisFront',
'MelisCmsNews', 'MelisCmsSlider', 'MelisCmsProspects',
'MelisDemoCms', 'MelisCmsPageScriptEditor'
```

Dépendances Composer (`composer.json`) : `melis-cms`, `melis-cms-slider`, `melis-cms-prospects`,
`melis-cms-news`, `melis-cms-page-script-editor` ; `melis-engine` et `melis-front` sont suggérés
(et requis à l'exécution pour le rendu). Le site est servi lorsque le vhost définit
`SetEnv MELIS_MODULE "MelisDemoCms"`. Son contenu (pages, sliders, actualités…) est installé via le
flux d'**installation de site** de la marketplace, et non par un simple dump SQL (voir
[Base de données](#base-de-donnees)).

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `DemoCmsService` | Aides propres au site, utilisées par les contrôleurs front et les listeners. Construit le menu personnalisé du site (`customizeSiteMenu()`), injecte un sous-menu d'actualités groupé par date (`getNewsListFormMenu()`) et produit les options du filtre actualités par année/mois (`getNewsListMonthsYears()`). Étend `MelisCore\Service\MelisGeneralService`. |
| `MelisPlatformTable` | Table générique sur `melis_core_platform` (`MelisEngine\Model\Tables\MelisGenericTable`, clé primaire `plf_id`). |

`DemoCmsService` s'appuie sur des services de la plateforme qu'il résout à l'exécution —
`MelisSiteConfigService` (MelisFront), `MelisCmsNewsTable` (MelisCmsNews) et `MelisEngineTree` —
plutôt que de les réimplémenter.

## Backoffice

Ce module n'ajoute **aucun outil de backoffice** (pas d'entrée toolstree / `melisKey`). Sa seule
surface backoffice est l'assistant de **mise en place du site** utilisé par la marketplace /
l'installeur : contrôleurs `MelisDemoCms\Controller\MelisSetup`, `…\MelisSetupPostDownload` et
`…\MelisSetupPostUpdate` (routés sous `/MelisDemoCms/setup` et `/melis/MelisDemoCms/...`), ainsi que
les aides de vue de formulaire `DemoSiteFieldRow` / `DemoSiteFieldCollection` qui rendent le
formulaire d'installation. La configuration de setup se trouve dans
`config/setup/download.config.php` et `config/setup/update.config.php`.

## Front office

Le site est piloté par de simples contrôleurs de site MelisFront (étendant
`MelisFront\Controller\MelisSiteActionController` via le `BaseController` local), un par type de
page :

| Contrôleur (invokable) | Page |
| --- | --- |
| `MelisDemoCms\Controller\Home` | Accueil (carrousel + slider secondaire, témoignages, bannière RGPD) |
| `MelisDemoCms\Controller\News` | Liste / détail des actualités |
| `MelisDemoCms\Controller\Team` | Équipe |
| `MelisDemoCms\Controller\Services` | Services |
| `MelisDemoCms\Controller\Faq` | Liste & détail des FAQ |
| `MelisDemoCms\Controller\Contact` | Contact (formulaire prospects) |
| `MelisDemoCms\Controller\Testimonial` / `…\Template` / `…\DragDrop` | Témoignages / démos de gabarit / zones de drag-drop |
| `MelisDemoCms\Controller\Page404` | 404 |

Plutôt que de livrer ses propres plugins, `MelisDemoCms` **fournit des gabarits front**
(`view/plugins/*.phtml`) aux [plugins de templating](/fr/guide/plugins) existants de la plateforme,
câblés dans `config/melis.plugins.config.php` :

| Plugin de templating (module propriétaire) | Gabarits fournis |
| --- | --- |
| `MelisFrontMenuPlugin` (MelisFront) | `menu`, `white-menu`, `footer-menu` |
| `MelisFrontShowListFromFolderPlugin` (MelisFront) | `faq-listing`, `faq-values`, `home-testimonial-slider` |
| `MelisFrontGdprBannerPlugin` (MelisFront) | `gdpr-banner` |
| `MelisCmsSliderShowSliderPlugin` (MelisCmsSlider) | `home-carousel-slider`, `home-slider2`, `team-slider` |
| `MelisCmsNewsListNewsPlugin` / `…ShowNewsPlugin` / `…LatestNewsPlugin` (MelisCmsNews) | `news-list`, `news-details`, `latest-news-vertical`, `latest-news-horizontal` |
| `MelisCmsProspectsShowFormPlugin` (MelisCmsProspects) | `prospect-form` |

Deux listeners personnalisent le rendu :
`SiteMenuCustomizationListener` s'attache à `MelisFrontMenuPlugin_melistemplating_plugin_end` pour
reconstruire le menu via `DemoCmsService::customizeSiteMenu()`, et `LatestNewsHorizontalListener`
ajuste le bloc des dernières actualités. `MelisDemoCmsCreateConfigListener` écoute
`melis_marketplace_site_install_results` pour générer le `MelisDemoCms.config.php` du site à partir
du `.config.stub` après l'installation.

## Base de données

`MelisDemoCms` ne définit aucune table `melis_*` propre. Son `MelisPlatformTable` lit la table
centrale `melis_core_platform`. Le **contenu** de la démo (pages, gabarits, sliders, actualités,
configuration prospects et clés de config par site) est créé à l'installation par le processus
d'installation de site de la marketplace (`SetupDemoCmsListener` sur
`melis_install_last_process_start`), à partir de la config par site de
`config/MelisDemoCms.config.php` (p. ex. `home_page_id`, `news_page_id`, `home_page_slider_1_id`).

## Exemple

Un contrôleur front rend un plugin de templating en lui passant un chemin de gabarit et les valeurs
de config de la page — le motif utilisé partout dans le site (`HomeController`) :

```php
$siteConfigSrv = $this->getServiceManager()->get('MelisSiteConfigService');

$sliderPlugin = $this->MelisCmsSliderShowSliderPlugin();
$homeSlider1 = $sliderPlugin->render([
    'template_path' => 'MelisDemoCms/plugins/home-carousel-slider',
    'id'            => 'homeSlider1',
    'pageId'        => $this->idPage,
    'sliderId'      => $siteConfigSrv->getSiteConfigByKey('home_page_slider_1_id', $this->idPage),
]);
$this->view->addChild($homeSlider1, 'homeSlider1');
```

## Fichiers clés

| Sujet | Chemin (sous `vendor/melisplatform/melis-demo-cms/`) |
| --- | --- |
| Routes, contrôleurs, services, mapping de gabarits | `config/module.config.php` |
| Câblage gabarit ↔ plugin | `config/melis.plugins.config.php` |
| Clés de config par site (ids de page/slider) | `config/MelisDemoCms.config.php`, `config/MelisDemoCms.config.stub` |
| Modules chargés avec le site | `config/module.load.php` |
| Formulaires / flux de setup du site | `config/setup/download.config.php`, `config/setup/update.config.php` |
| Bootstrap & attache des listeners | `src/Module.php` |
| Service d'aide du site | `src/Service/DemoCmsService.php` |
| Contrôleur de base front | `src/Controller/BaseController.php` |
| Listeners menu / actualités / installation | `src/Listener/` |
| Gabarits des plugins front | `view/plugins/*.phtml` |
| Gabarits de page | `view/melis-demo-cms/*/*.phtml` |

Voir aussi : [Référence des modules](/fr/reference/modules), [Construire un site](/fr/guide/build-a-site),
[Plugins](/fr/guide/plugins).
