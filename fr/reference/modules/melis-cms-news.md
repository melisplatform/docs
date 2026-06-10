# MelisCmsNews

> Système d'articles d'actualité / blog pour les sites Melis, avec un outil de rédaction en back-office et trois plugins
> d'affichage front office. Paquet `melisplatform/melis-cms-news`.

## Présentation

MelisCmsNews fournit un outil **News** dans le back-office où les rédacteurs rédigent et gèrent des
articles multilingues (titres, paragraphes en texte enrichi, images, documents, planification de
publication/dépublication et SEO). Les articles sont affichés sur le front office via trois plugins
de templating prêts à l'emploi : un aperçu des dernières actualités, une liste d'articles paginée,
et une page de détail d'article unique. Les URLs SEO-friendly et les balises méta par article sont
gérées automatiquement via des listeners dédiés.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsNews',
];
```

Nécessite `melis-core`, `melis-engine`, `melis-front` et `melis-cms` (`^5.2`), ainsi que
`laminas/laminas-paginator`. Les intégrations optionnelles s'activent lorsque `MelisCmsSlider`, le
module de catégories Melis, `MelisCmsTag` ou `MelisCmsComments` sont également installés.

## Services principaux

Enregistrés en tant qu'alias `service_manager` dans `config/module.config.php`.

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsNewsService` | Service principal de CRUD/requête. Lit, crée, met à jour et supprime des articles ; interroge par site, langue, plage de dates, statut. Chaque méthode déclenche des événements `*_start` / `*_end` via `MelisGeneralService`. |

Alias des passerelles de tables : `MelisCmsNewsTable`, `MelisCmsNewsTextsTable`, `MelisCmsNewsSeoTable`,
`MelisCmsNewsCategoryTable`, `MelisCmsNewsTagsTable`.

## Back-office

L'outil **News** est accessible depuis le menu de gauche sous **Outils CMS** (icône journal). Il
s'ouvre sur une liste filtrable de tous les articles (filtre par site, texte de recherche, limite
d'affichage), avec des actions d'information et de suppression par ligne. L'éditeur d'article est
organisé en onglets :

| Onglet | Contenu |
| --- | --- |
| Propriétés | Dates de publication / dépublication et assignation au site |
| Textes | Titre, sous-titre et jusqu'à 10 paragraphes en texte enrichi par langue |
| Médias | Jusqu'à 3 images et 3 documents (stockés sous `/media/news/`) |
| SEO | URL conviviale, titre/description méta, redirection et canonical |
| Aperçu | Prévisualisation en iframe de l'article sauvegardé (disponible après la première sauvegarde) |

Les onglets **Médias** et **Aperçu** ne sont disponibles qu'après la première sauvegarde de
l'article.

## Front office

Trois plugins de templating étendent `MelisTemplatingPlugin` ; chacun dispose d'un controller
plugin, d'un view helper et d'un fichier de configuration sous `config/plugins/`.

| Plugin | Controller plugin | View helper | Onglets de config |
| --- | --- | --- | --- |
| Latest News | `MelisCmsNewsLatestNewsPlugin` | `MelisCmsNewsLatestPlugin` | Propriétés, Filtres |
| News List | `MelisCmsNewsListNewsPlugin` | `MelisCmsNewsListPlugin` | Propriétés, Pagination, Filtres |
| News Detail | `MelisCmsNewsShowNewsPlugin` | `MelisCmsNewsShowNewsPlugin` | Propriétés |

Paramètres de configuration des plugins : `template_path`, `site_id`, `pageIdNews` (lien vers la page de détail), `column`,
`order`, `limit`, `date_min`, `date_max`, `search`, ainsi que `nbPerPage` / `nbPageBeforeAfter` (News
List uniquement). La configuration est persistée dans le XML de la page via `loadDbXmlToPluginConfig()` /
`savePluginConfigToXml()`.

Le routage SEO et les balises méta par article sont câblés dans `src/Module.php` via :
`MelisCmsNewsSEORouteListener`, `MelisCmsNewsRenderPageListener`, `MelisCmsNewsMetaPageListener`,
`MelisCmsNewsSeoRedirectUrlListener`.

## Tables de base de données

Structure de base dans `install/sql/setup_structure.sql` ; migrations dans `install/dbdeploy/`.

| Table | Contenu |
| --- | --- |
| `melis_cms_news` | Ligne principale de l'article : statut, dates de publication/dépublication, site, image1-3, documents1-3, identifiant slider |
| `melis_cms_news_texts` | Textes par langue : titre, sous-titre, paragraphes 1-10, ordre des paragraphes, langue |
| `melis_cms_news_seo` | SEO par langue : URL, redirection, indicateur 301, titre/description méta, canonical |
| `melis_cms_news_category` | Lien article ↔ catégorie (fonctionnalité de catégorie optionnelle) |

## Exemple

```php
$news = $this->getServiceManager()->get('MelisCmsNewsService');

// Latest 10 published articles for site 1, French, newest first:
$list = $news->getNewsList(
    status: 1, langId: 1, start: 0, limit: 10,
    orderColumn: 'cnews_publish_date', order: 'DESC', siteId: 1
);

// Fetch one article (all languages, or one language):
$all = $news->getNewsById(42);
$fr  = $news->getNewsById(42, 1);

// Create / update / delete:
$id = $news->saveNews($data, $newsId);   // $newsId null → create
$ok = $news->deleteNewsById(42);         // also removes texts + SEO rows

// Utility:
$txt  = $news->getPostText(42);
$pages = $news->getNewsDetailsPagesBySite(1);  // NEWS_DETAIL-type pages for a site
```

Se brancher sur un événement de service pour étendre le comportement (ex. notifier un index de recherche après la sauvegarde) :

```php
$sharedEvents->attach('MelisCmsNews', 'melis_cms_news_save_news_end', function ($e) {
    $params = $e->getParams(); // includes 'news', 'newsId', 'results'
}, 50);
```

Les autres identifiants d'événements suivent le même schéma `melis_cms_news_[method]_start/end` :
`melis_cms_news_get_news_list_*`, `melis_cms_news_get_news_by_id_*`,
`melis_cms_news_get_news_by_id_array_*`, `melis_cms_news__delete_news_by_id_*` (double
underscore), `melis_cms_news_get_post_text_*`, `melis_cms_news_get_news_details_pages_*`.

## Micro-services

`config/app.microservice.php` expose `getNewsList` et `getNewsById` via le bus de micro-services
Melis avec des formulaires et filtres d'entrée auto-générés. Les factory de formulaires `MelisCmsNewsSelect`
et `MelisCmsNewsBOSelect` se trouvent dans `src/Form/Factory/`.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Config du module (services, passerelles, plugins, view helpers) | `vendor/melisplatform/melis-cms-news/config/module.config.php` |
| Arbre des outils back-office | `vendor/melisplatform/melis-cms-news/config/app.interface.php` |
| Config du tableau de liste | `vendor/melisplatform/melis-cms-news/config/app.tools.php` |
| Config des micro-services | `vendor/melisplatform/melis-cms-news/config/app.microservice.php` |
| Configs des plugins | `vendor/melisplatform/melis-cms-news/config/plugins/` |
| Service principal | `vendor/melisplatform/melis-cms-news/src/Service/MelisCmsNewsService.php` |
| Plugins front | `vendor/melisplatform/melis-cms-news/src/Controller/Plugin/` |
| View helpers | `vendor/melisplatform/melis-cms-news/src/View/Helper/` |
| Listeners (SEO, RGPD, nettoyage slider) | `vendor/melisplatform/melis-cms-news/src/Listener/` |
| Passerelles de tables | `vendor/melisplatform/melis-cms-news/src/Model/Tables/` |
| SQL d'installation | `vendor/melisplatform/melis-cms-news/install/sql/setup_structure.sql` |
| Migrations BDD | `vendor/melisplatform/melis-cms-news/install/dbdeploy/` |

Voir aussi : [melis-cms](/fr/reference/modules/melis-cms), [melis-front](/fr/reference/modules/melis-front),
[melis-engine](/fr/reference/modules/melis-engine), [melis-core](/fr/reference/modules/melis-core)
