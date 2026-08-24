# MelisDemoCms

> Le site de référence et de démonstration officiel de Melis Platform — un **module de site**
> prêt à installer qui apprend aux développeurs comment un site front-office Melis est architecturé.
> Paquet `melisplatform/melis-demo-cms`.

## Présentation

`MelisDemoCms` est un site web front-office complet et installable (`melis-site: true`,
`type: melisplatform-module`, catégorie `cms`). Ce n'est **pas un outil de back-office** : ses pages,
contrôleurs et gabarits de plugins illustrent les trois techniques de composition de contenu —
**placement manuel de plugins**, **zones de drag-and-drop** et **balises éditables en ligne** —
en s'appuyant sur MelisFront, MelisEngine et les modules de contenu CMS (slider, actualités,
prospects). À utiliser comme implémentation de référence pour
[construire un site](/fr/guide/build-a-site).

![La page d'accueil front-office MelisDemoCms en ligne — navigation supérieure (Actualités / Équipe / Nos services / Notre processus / FAQ / Contact), le hero « Melis Demo Cms » avec un appel à l'action « Try to Free » par-dessus un visuel hero de tableau de bord. Il s'agit du site de démonstration rendu côté serveur, et non d'un écran de back-office React.](/screenshots/react/melis-demo-cms/melisdemocms-site.png)

## Il n'a pas de back-office React

Melis v6 a introduit un back-office React, mais `MelisDemoCms` est un **site front-office**, et non
un outil de back-office ; il n'est donc **volontairement pas migré vers React** :

- pas de projet brick `ui-react/`, pas de `public/ui-react/brick.manifest.json` ;
- pas d'endpoints `config/react-api.php` et pas de capacités `config/react.capabilities.php` ;
- pas d'entrée dans la barre latérale ni de nœud de menu dans `/melis-react`.

Vous ne chercherez jamais un outil « MelisDemoCms » dans le shell React. Le site de démo est
**du contenu sur lequel opèrent les outils CMS React génériques**, et le site en ligne est
**rendu côté serveur** par MelisFront/MelisEngine dès qu'un visiteur navigue sur le domaine.

### Comment travailler dessus dans `/melis-react`

Comme le module n'a pas d'outil propre, vous l'éditez avec les outils CMS React génériques :

| Outil React | Ce que vous en faites ici |
| --- | --- |
| **Éditeur de pages CMS** | Ouvrez n'importe quelle page de démo (Accueil, Actualités, Équipe, FAQ, Contact…) depuis l'arbre **Pages CMS** et éditez ses blocs en ligne, ses zones de drag-and-drop et ses plugins. Surface d'édition principale. |
| **Médias** | Gérez les images / fichiers référencés par les pages. |
| **Sites** | Réglages de domaine / langue du site de démo. |
| **Gabarits** | Les gabarits de page utilisés par les pages CMS. |

> **Où :** barre latérale → **Pages CMS** → ouvrez une page du site de démo dans l'éditeur. Il n'y a
> pas d'entrée « MelisDemoCms » dans la barre latérale — le module est le *contenu*, pas un outil.

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
`melis-cms-news`, `melis-cms-page-script-editor` (`^6.0`). `melis-engine` et `melis-front` sont
suggérés (et requis à l'exécution). Le site est activé pour un domaine en définissant la variable
d'environnement vhost `MELIS_MODULE "MelisDemoCms"`.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `DemoCmsService` | Aides propres au site, utilisées par les contrôleurs front et les listeners d'installation. |
| `MelisPlatformTable` | Table gateway générique sur la table centrale de la plateforme (`MelisEngine\Model\Tables\MelisGenericTable`, clé primaire `plf_id`). |

## Mise en place du site (installeur, pas React)

Ce module n'ajoute aucune entrée dans l'arbre des outils du back-office. Sa seule surface
back-office est l'**assistant de mise en place du site** utilisé par la marketplace / l'installeur :
contrôleurs `MelisDemoCms\Controller\MelisSetupController` (route `/MelisDemoCms/setup`),
`MelisSetupPostDownloadController` et `MelisSetupPostUpdateController`. La configuration de setup
se trouve dans `config/setup/download.config.php` et `config/setup/update.config.php`. C'est une
préoccupation back-end / CLI, sans surface React.

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
| `MelisDemoCms\Controller\Template` / `DragDrop` | Démos de gabarits (statique / drag-drop / mixte) |
| `MelisDemoCms\Controller\Search` | Résultats de recherche sur le site (Lucene ; désactivé dans la démo) |
| `MelisDemoCms\Controller\Page404` | Page d'erreur 404 |

Plutôt que de livrer ses propres plugins, `MelisDemoCms` fournit des **surcharges de gabarits de
plugins** (`view/plugins/*.phtml`) câblées dans `config/melis.plugins.config.php` :

| Plugin de templating (module propriétaire) | Gabarits fournis par ce site |
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
| **Zone de drag-and-drop** | Le `.phtml` déclare une zone nommée ; l'éditeur de pages CMS React y dépose n'importe quel plugin ; aucun code contrôleur. | Démos DragDrop, Template |
| **Balises éditables en ligne** | `MelisTag` encapsule une valeur par défaut dans la vue ; l'auteur modifie le texte / les images directement en place depuis l'éditeur de pages React. | Services, Témoignages, 404 |

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

Une zone de drag-and-drop ne nécessite qu'un seul appel dans la vue — aucun code contrôleur (le bloc
est rempli depuis l'éditeur de pages CMS React) :

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

Une balise éditable en ligne avec une valeur par défaut (éditée en place depuis l'éditeur de pages
React) :

```php
<?= $this->MelisTag($this->idPage, 'static-html-1', 'html', '<h1>Accessible…</h1>') ?>
```

## Fichiers clés

| Élément | Chemin (sous `vendor/melisplatform/melis-demo-cms/`) |
| --- | --- |
| Routes, contrôleurs, mapping de gabarits | `config/module.config.php` |
| Modules chargés avec le site | `config/module.load.php` |
| Câblage des surcharges de gabarits de plugins | `config/melis.plugins.config.php` |
| Clés de config par site (IDs de page / slider / dossier) | `config/MelisDemoCms.config.php`, `…config.stub` |
| Flux de setup du site | `config/setup/download.config.php`, `config/setup/update.config.php` |
| Bootstrap et enregistrement des listeners | `src/Module.php` |
| Service d'aide du site | `src/Service/DemoCmsService.php` |
| Contrôleurs de setup et post-installation | `src/Controller/MelisSetupController.php`, `…PostDownloadController.php`, `…PostUpdateController.php` |
| Listeners d'installation / menu / actualités | `src/Listener/` |
| Gabarits de plugins | `view/plugins/*.phtml` |
| Gabarits de pages | `view/melis-demo-cms/*/*.phtml` |
| Démos de gabarits | `view/melis-demo-cms/template/` |

Voir aussi : [Référence des modules](/fr/reference/modules), [Construire un site](/fr/guide/build-a-site),
[Plugins](/fr/guide/plugins).
