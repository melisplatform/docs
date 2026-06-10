# MelisCmsShare

> Injecte des balises méta de partage sur les réseaux sociaux / Open Graph dans le `<head>` front-office d'une page CMS. Package `melisplatform/melis-cms-share`.

## Présentation

`MelisCmsShare` permet à un éditeur de définir cinq valeurs par page — titre, description, image, type et URL —
et les écrit dans le `<head>` de la page rendue sous forme de trois familles de balises méta : **Twitter Card**
(`twitter:title/description/image/card`), **schema.org / Google** (attributs `itemprop`), et
**Facebook / Open Graph** (`og:title/description/image/type/url`). Une ligne de données est stockée par
page ; si une balise est déjà présente dans le template, elle est remplacée, sinon elle est insérée juste
après `<head>`. Les pages sans ligne de partage sont laissées intactes.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsShare',
];
```

Dépendances (depuis `composer.json`) : `melisplatform/melis-core`, `melisplatform/melis-engine`,
`melisplatform/melis-front` et `melisplatform/melis-cms` (toutes `^5.2`). Le module nécessite l'éditeur de
pages CMS (pour l'onglet Partage et les événements du cycle de vie des pages) ainsi que le pipeline de rendu
front (pour le hook `MvcEvent::EVENT_FINISH`).

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsShareService` | CRUD complet pour les enregistrements de partage. Méthodes clés : `saveShare($data)`, `deleteShare()`, `getShareById()`, `getShareByPageId($idPage)`, `getAllShare()`, `searchShare()`, `countAllShare()`, `countFilteredShare()`. Les quatre dernières alimentent le datatable de Site-Tools. |
| `melisCmsShareTable` | Table gateway pour `melis_cms_share` (`MelisCmsShareTable`). Récupérer la ligne d'une page avec `getEntryByField('mcs_page_id', $idPage)`. |

## Back-office

Le module enregistre deux points d'entrée BO, tous deux gérés par `MelisCmsShareToolController` :

| Point d'entrée | Description |
| --- | --- |
| **Site Tools → Partage** (`melis_cms_share_tool`) | Liste la configuration de partage de chaque page dans un datatable — Id, Id de page, Titre, Type, Url, Utilisateur (qui l'a défini), Date d'ajout — avec une modale d'édition et une modale d'upload d'image. Icône : `fa fa-share-alt`. |
| **Éditeur de page CMS → Onglet Partage** (`melis_cms_share`) | Onglet (icône *share*) dans l'éditeur de page CMS (`meliscms_page → meliscms_tabs`). Callback JS : `initMelisCmsShareTab()`. Permet à l'éditeur de définir le titre, la description, une image uploadable, le type et l'URL pour les aperçus sociaux de cette page. |

Le câblage se trouve dans `config/app.interface.php` (emplacement de l'outil et onglet de l'éditeur de page) et
`config/app.tools.php` (colonnes du datatable).

## Front office

Aucun view helper ni plugin de template n'est exposé. Les balises de partage sont injectées par
`MelisCmsShare\Listener\MelisCmsShareMetaPageListener`, attaché dans `src/Module.php` et
déclenché sur **`MvcEvent::EVENT_FINISH`** à la priorité **110** :

1. Ignore les requêtes non-PHP/asset (regex sur l'URI) et les requêtes sans `idpage`.
2. Charge la ligne de partage de la page via `melisCmsShareTable->getEntryByField('mcs_page_id', $idPage)`.
3. Pour chaque champ non vide, effectue soit un `preg_replace` sur la balise existante, soit une insertion après `<head>` —
   pour les trois familles (Twitter Card, `itemprop`, `og:`).
4. Échappe les valeurs avec `addslashes` ; préfixe les URLs d'image avec `scheme://host` ; réécrit via
   `$response->setContent()`.

Comme il opère sur la chaîne HTML déjà rendue en fin de cycle de vie MVC, il peut
remplacer les balises déjà émises par un template.

> **Remarque sur le type :** le champ unique `mcs_type` alimente à la fois `twitter:card` et `og:type`, qui
> attendent des vocabulaires différents (`summary`/`summary_large_image` vs `website`/`article`). Utilisez une
> valeur acceptable pour les deux, ou acceptez qu'une des deux soit non canonique.

## Listeners du cycle de vie des pages

| Listener | Événement(s) | Rôle |
| --- | --- | --- |
| `MelisCmsSavePageListener` | `meliscms_page_save_start`, `meliscms_page_publish_start` | Maintient l'enregistrement de partage cohérent lors de la sauvegarde ou de la publication d'une page CMS. |
| `MelisCmsShareDeletePageListener` | `meliscms_page_delete_end` | Supprime la ligne `melis_cms_share` lorsque sa page est supprimée (évite les données de partage orphelines). |
| `MelisCmsShareFlashMessengerListener` | Événements BO de sauvegarde/suppression | Retour visuel flash dans le back-office après une sauvegarde ou une suppression. |

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_cms_share` | Une configuration de partage par page. PK `mcs_id`. Colonnes : `mcs_page_id`, `mcs_title`, `mcs_description`, `mcs_img`, `mcs_type`, `mcs_url`, `mcs_add_user_id`, `mcs_date_added`. La table joint l'utilisateur BO pour exposer `mcs_share_added_by` (nom complet). |

## Exemple

```php
// Lire la configuration de partage pour une page donnée
$share = $serviceManager->get('MelisCmsShareService')->getShareByPageId($pageId);

// Persister une configuration de partage pour une page (création ou mise à jour)
$serviceManager->get('MelisCmsShareService')->saveShare([
    'mcs_page_id'      => $pageId,
    'mcs_title'        => 'My page title for social',
    'mcs_description'  => 'A short description shown in link previews.',
    'mcs_img'          => '/path/to/preview-image.jpg',
    'mcs_type'         => 'summary_large_image',
    'mcs_url'          => 'https://example.com/my-page',
    'mcs_add_user_id'  => $currentUserId,
]);
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Module / bootstrap | `vendor/melisplatform/melis-cms-share/src/Module.php` |
| Routes, services, contrôleurs | `vendor/melisplatform/melis-cms-share/config/module.config.php` |
| Outil BO + onglet éditeur de page | `vendor/melisplatform/melis-cms-share/config/app.interface.php` |
| Configuration de l'outil DataTable | `vendor/melisplatform/melis-cms-share/config/app.tools.php` |
| Injecteur `<head>` front | `vendor/melisplatform/melis-cms-share/src/Listener/MelisCmsShareMetaPageListener.php` |
| Listener de sauvegarde/publication de page | `vendor/melisplatform/melis-cms-share/src/Listener/MelisCmsSavePageListener.php` |
| Listener de nettoyage à la suppression de page | `vendor/melisplatform/melis-cms-share/src/Listener/MelisCmsShareDeletePageListener.php` |
| Listener flash-messenger | `vendor/melisplatform/melis-cms-share/src/Listener/MelisCmsShareFlashMessengerListener.php` |
| Contrôleur BO | `vendor/melisplatform/melis-cms-share/src/Controller/MelisCmsShareToolController.php` |
| Service | `vendor/melisplatform/melis-cms-share/src/Service/MelisCmsShareService.php` |
| Table | `vendor/melisplatform/melis-cms-share/src/Model/Tables/MelisCmsShareTable.php` |

Voir aussi : [MelisCms](/fr/reference/modules/melis-cms) · [MelisCmsPageAnalytics](/fr/reference/modules/melis-cms-page-analytics) · [Référence des modules](/fr/reference/modules)
