# MelisCmsNews

> Système d'actualités / blog pour les sites Melis, avec un outil de rédaction React en back-office et trois plugins d'affichage front office. Paquet `melisplatform/melis-cms-news`.

## Présentation

MelisCmsNews fournit un outil **News** dans le back-office où les rédacteurs rédigent et gèrent des
articles d'actualité multilingues (titres, paragraphes en texte enrichi, images, documents,
planification de publication/dépublication et SEO). Les articles sont affichés sur le front office
via trois plugins de templating prêts à l'emploi : un aperçu des dernières actualités, une liste
d'articles paginée et une page de détail d'article unique. Les URLs SEO-friendly et les balises méta
par article sont gérées automatiquement via des listeners dédiés.

Dans Melis v6, l'outil est livré sous forme de **brique full-React native** dans le nouveau
back-office (`/melis-react`) : une véritable interface React pour lister et éditer les articles,
s'appuyant sur une couche JSON `react-api`, avec une bascule **New / Old** permettant de revenir à
l'outil classique dans une iframe. Le framework, les services, les événements, les tables et les
plugins front sont inchangés par rapport à la v5 — seule la couche de présentation est nouvelle.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsNews',
];
```

Nécessite `melis-core`, `melis-engine`, `melis-front` et `melis-cms` (`^5.2`), ainsi que
`laminas/laminas-paginator`. Les intégrations optionnelles s'activent lorsque `MelisCmsSlider`, le
module de catégories Melis, `MelisCmsTags`, `MelisCmsUserAccount` (auteurs) ou `MelisCmsComments`
sont également installés. La brique React n'apparaît que tant que le module figure dans
`melis.module.load.php` (découverte modulaire des briques via
`GET /melis/react-api/react-modules`).

## Back-office React

Menu de gauche → **Outils du site** → **News** (`Actualités`). L'outil s'ouvre dans un onglet
principal nommé **News** qui héberge l'ensemble via des **sous-onglets** internes : la liste des
articles, et un sous-onglet par article ouvert/nouveau avec l'éditeur complet. Chaque sous-onglet
reste monté, ce qui rend instantané le passage d'un article à l'autre. La route de l'arbre est
`/melis-cms/news` (avec `/melis-cms/news/:id` pour les liens profonds, ex. l'œil de Workflow).

### La liste des articles

![La liste News React — cartes KPI (Total des articles / Publiés / Non publiés), une recherche avec des filtres Tous / Actifs / Inactifs, un gestionnaire de colonnes, un bouton d'export, la bascule New/Old et le bouton « + Nouvel article », avec des actions d'édition et de suppression par ligne](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-list.png)

La liste affiche tous les articles de la plateforme, avec :

- **Cartes KPI** — Total des articles, Publiés, Non publiés.
- Une **recherche** avec des filtres de statut **Tous / Actifs / Inactifs**, des colonnes triables,
  un gestionnaire de **colonnes** (masquer/réordonner), un **export** (xlsx) et une
  **réinitialisation des filtres**.
- Par ligne, une action d'**édition** (ouvre l'article dans un sous-onglet) et de **suppression** ;
  **+ Nouvel article** ouvre un éditeur vierge.
- Une bascule **New / Old** (en haut à droite) qui fait passer la liste entre l'interface React et
  l'outil legacy dans une iframe (`/melis/react-tool-page?key=meliscmsnews_left_menu`).

### L'éditeur d'article

Un formulaire unique déroulant : une large colonne de contenu à gauche, une barre latérale de
réglages à droite, et un **sélecteur de langue** (English / Français) en haut — chaque traduction
est conservée simultanément et sauvegardée ensemble en un seul appel.

![L'éditeur de nouvel article — un sélecteur de langue, les champs Titre et Sous-titre, le CORPS avec un éditeur de paragraphe WYSIWYG et « Générer avec l'IA », une zone MÉDIAS verrouillée, et la barre latérale de réglages (Statut, Publication, Site, Auteur, SEO, Catégories, Tags, Slider)](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-new.png)

| Zone | Contenu |
| --- | --- |
| Titre / Sous-titre | Texte simple, par langue |
| Corps | Jusqu'à **10 paragraphes en texte enrichi (WYSIWYG)**, réordonnables par glisser-déposer, chacun avec une aide **Générer avec l'IA** |
| Médias | Jusqu'à **3 images** et **3 documents** — verrouillés jusqu'à la première sauvegarde de l'article |
| Statut | Bascule **Publié / Non publié**, plus un bouton **Workflow** lorsque MelisSmallBusiness est actif |
| Publication | Sélecteurs date-heure **Publier le** / **Dépublier le** |
| Site | Le site auquel appartient l'article |
| Auteur | Sélecteur d'auteur — uniquement lorsque `MelisCmsUserAccount` fournit la colonne `cnews_author_account` |
| SEO | **URL** conviviale, **redirection d'URL**, **URL 301**, **titre méta**, **description méta**, **URL canonique** (par langue) |
| Catégories / Tags / Slider | Sections optionnelles affichées uniquement lorsque le module correspondant est actif |
| Commentaires | Panneau de modération natif (ajouter / approuver / refuser / supprimer) affiché uniquement lorsque `MelisCmsComments` est actif |

![Édition des textes d'un article — titre, sous-titre et un éditeur de paragraphe en texte enrichi (type TinyMCE) ; les paragraphes peuvent être ajoutés et réordonnés](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-texts.png)

![Le haut de la barre latérale de réglages — la bascule Publié avec Workflow, les dates Publier le / Dépublier le, et le sélecteur de Site](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-properties.png)

![La zone Médias — Images (max. 3, avec Remplacer/Supprimer) et Pièces jointes (max. 3), plus le panneau de modération des Commentaires natif lorsque MelisCmsComments est actif](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-medias.png)

![La section SEO — Titre méta, Description méta, URL, redirection d'URL, URL 301 et URL canonique, par langue](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-seo.png)

Une fois l'article sauvegardé, une zone **Aperçu** affiche l'article dans sa page NEWS_DETAIL en
iframe, avec une option **Afficher dans un nouvel onglet** et un sélecteur de page lorsque le site
comporte plusieurs pages de détail.

![La zone Aperçu — l'article sauvegardé rendu dans sa page NEWS_DETAIL, avec un bouton « Afficher dans un nouvel onglet »](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-preview.png)

### Afficher des actualités sur une page

Depuis l'éditeur de page React (ouvrir une page → Édition), ouvrir le panneau des plugins et
déposer **Latest News**, **News List** ou **News Detail** sur la page ; chacun ouvre la modale de
configuration classique du plugin Melis (rendue à l'intérieur de l'éditeur React) avec les mêmes
onglets qu'en v5 — voir [Front office](#front-office).

![L'éditeur de page React avec le panneau des plugins ouvert — les blocs de contenu News prêts à déposer sur la page](/screenshots/react/melis-cms-news/meliscmsnews-page-menu-plugins-selector.png)

![Plugin Latest News → Propriétés — Template, Site et Page de détail des actualités (avec un sélecteur d'arbre de pages)](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-latestnews-config-tab-properties.png)

![Plugin News List → Pagination — Actualités par page et le nombre de liens de pages à afficher](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-newslist-tab-pagination.png)

![Plugin News Detail → Propriétés — Template (news-details) et un sélecteur d'actualité par défaut avec un raccourci vers l'outil News](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-newsdetail-config-tab-properties.png)

## API React

Il n'existe **aucun `config/react-api.php`** : les routes sont déclarées **en ligne dans
`config/module.config.php`**, imbriquées sous le nœud partagé `melis-react-api` afin d'être montées
sous `/melis/react-api/…`. Contrôleur :
`MelisCmsNews\Controller\MelisCmsNewsReactApiController` (alias invokable
`MelisCmsNews\Controller\MelisCmsNewsReactApi`). Contrat `{ success, data, error }`.

| Méthode & URL | Rôle |
| --- | --- |
| `GET /news` | Liste des articles (keyset : `limit`, `search`, `status`, `siteId`, `sort`, `dir`, `after`, `langId`) |
| `GET /news/stats` | KPI `{total, published, draft}` |
| `GET /news/:id` | Un article (`?langId=` → cette traduction ; base + paragraphes + médias + SEO + ids catégorie/tag) |
| `POST /news/save` | Création / mise à jour (toutes les traductions, SEO, catégories, tags en un seul appel) |
| `DELETE /news/delete/:id` | Suppression d'un article (+ ses textes + SEO) |
| `GET /news/categories` | Catégories disponibles (`?langId=&siteId=`) |
| `GET /news/tags` | Tags disponibles (`MelisCmsTags` ; vide si absent) |
| `GET /news/users` | Utilisateurs front-office comme auteurs (`MelisCmsUserAccount` ; vide si absent) |
| `GET /news/preview/:id` | URL d'aperçu + pages NEWS_DETAIL du site de l'article |
| `GET /news/:id/comments` | Commentaires d'un article (404 si `MelisCmsComments` désactivé) |
| `POST /news/comments/save` | Ajout / édition d'un commentaire (BO → approuvé) |
| `POST /news/comments/approve/:cid` · `/refuse/:cid` | Modération d'un commentaire |
| `DELETE /news/comments/delete/:cid` | Suppression d'un commentaire |
| `GET /news-sites` · `GET /news-languages` | Liste des sites · langues du CMS |

L'upload/suppression de médias réutilise les endpoints **legacy** (aucune modification backend) :
`POST /melis/MelisCmsNews/MelisCmsNews/saveFileForm` et `.../removeAttachFile`.

Le contrôleur combine le service `MelisCmsNewsService` du module (`getNewsById`, `saveNews`,
`deleteNewsById`, `getNewsDetailsPagesBySite`) avec du SQL paramétré direct (liste keyset,
statistiques, SEO, tables de liaison catégorie/tag) et le service partagé `MelisCmsCategory2Service` ;
les colonnes/tables optionnelles sont détectées par fonctionnalité, de sorte qu'un module optionnel
absent ne casse jamais une sauvegarde.

### Capacités

Déclarées dans `config/react.capabilities.php` sous le nœud porteur de droits
`meliscmsnews_tools_section` (et non la clé de manifeste/zone `meliscmsnews_left_menu` utilisée par
l'iframe de la vue Old) :

```
meliscmsnews_tools_section
└─ actions: list · create · edit · delete · export
```

Chaque action du contrôleur est protégée deux fois — `denyUnlessAccess()` (auth +
`MelisCoreRights::canAccess`) puis `denyUnlessCan(<cap>)`. `saveAction` choisit `create` ou `edit`
selon la présence d'un id. React conditionne le bouton **+ Nouvel article** à `create` et la liste
à `list` via `window.__melisUseCaps(melisKey)`.

## Services principaux

Enregistrés en tant qu'alias `service_manager` dans `config/module.config.php`.

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsNewsService` | Service principal de CRUD/requête. Lit, crée, met à jour et supprime des articles ; interroge par site, langue, plage de dates, statut. Chaque méthode déclenche des événements `*_start` / `*_end` via `MelisGeneralService`. |

Alias des passerelles de tables : `MelisCmsNewsTable`, `MelisCmsNewsTextsTable`, `MelisCmsNewsSeoTable`,
`MelisCmsNewsCategoryTable`, `MelisCmsNewsTagsTable`.

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
| Config du module + routes react-api en ligne | `vendor/melisplatform/melis-cms-news/config/module.config.php` |
| Capacités React | `vendor/melisplatform/melis-cms-news/config/react.capabilities.php` |
| Arbre des outils back-office | `vendor/melisplatform/melis-cms-news/config/app.interface.php` |
| Config du tableau de liste | `vendor/melisplatform/melis-cms-news/config/app.tools.php` |
| Config des micro-services | `vendor/melisplatform/melis-cms-news/config/app.microservice.php` |
| Contrôleur de l'API React | `vendor/melisplatform/melis-cms-news/src/Controller/MelisCmsNewsReactApiController.php` |
| Brique React (source Vite IIFE) | `vendor/melisplatform/melis-cms-news/ui-react/src/` |
| Brique compilée + manifeste | `vendor/melisplatform/melis-cms-news/public/ui-react/brick.js` · `brick.manifest.json` |
| Service principal | `vendor/melisplatform/melis-cms-news/src/Service/MelisCmsNewsService.php` |
| Plugins front | `vendor/melisplatform/melis-cms-news/src/Controller/Plugin/` |
| View helpers | `vendor/melisplatform/melis-cms-news/src/View/Helper/` |
| Listeners (SEO, RGPD, nettoyage slider) | `vendor/melisplatform/melis-cms-news/src/Listener/` |
| Passerelles de tables | `vendor/melisplatform/melis-cms-news/src/Model/Tables/` |
| SQL d'installation | `vendor/melisplatform/melis-cms-news/install/sql/setup_structure.sql` |
| Migrations BDD | `vendor/melisplatform/melis-cms-news/install/dbdeploy/` |

Voir aussi : [melis-cms](/fr/reference/modules/melis-cms), [melis-front](/fr/reference/modules/melis-front),
[melis-engine](/fr/reference/modules/melis-engine), [melis-core](/fr/reference/modules/melis-core)
