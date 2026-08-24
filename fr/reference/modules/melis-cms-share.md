# MelisCmsShare

> Injecte des balises méta de partage sur les réseaux sociaux / Open Graph dans le `<head>` front-office d'une page CMS, géré depuis un back-office React natif. Package `melisplatform/melis-cms-share`.

## Présentation

`MelisCmsShare` permet à un éditeur de définir cinq valeurs par page — **titre, description, image, type et URL** —
et les écrit dans le `<head>` de la page rendue sous forme de trois familles de balises méta : **Twitter Card**
(`twitter:title/description/image/card`), **schema.org / Google** (attributs `itemprop`) et
**Facebook / Open Graph** (`og:title/description/image/type/url`). Une ligne de données est stockée par
page ; si une balise est déjà présente dans le template, elle est remplacée, sinon elle est insérée juste
après `<head>`. Les pages sans ligne de partage sont laissées intactes.

En v6, le module fournit une **brique React native** (et non une brique iframe) exposant ces données sur deux
surfaces — un outil **Open Graph** autonome et un **onglet Open Graph dans l'éditeur de page CMS** —
tous deux lisant et écrivant via une couche JSON `/melis/react-api/cms-share…`. L'injecteur
front-office du `<head>`, le modèle de données et les services sont inchangés par rapport à la v5.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsShare',
];
```

Dépendances : `melisplatform/melis-core`, `melisplatform/melis-engine`, `melisplatform/melis-front`
et `melisplatform/melis-cms`. Le module nécessite l'éditeur de page CMS (pour l'onglet Open Graph et les
événements du cycle de vie des pages) ainsi que le pipeline de rendu front (pour le hook `MvcEvent::EVENT_FINISH`). Les
deux surfaces React n'apparaissent **que tant que le module est listé ici** (découverte modulaire des briques via
`GET /melis/react-api/react-modules`).

## Le back-office React

La brique est une interface **React native** dotée d'un **basculement Nouveau / Ancien** : *Nouveau* correspond à l'interface
React (par défaut), *Ancien* affiche l'outil legacy dans une iframe
(`/melis/react-tool-page?key=melis_cms_share_tool_display`).

| Élément | Valeur |
| --- | --- |
| Id de la brique | `cms-share` (route `/melis-cms-share/share`, libellé `Partage`) |
| `forwardKey` | `MelisCmsShare/MelisCmsShareTool` |
| `melisKey` (droits / iframe vue Ancien) | `melis_cms_share_tool_display` |
| Clé de l'onglet éditeur de page | `melis_cms_share_page_edition_tab` (enregistré sous `meliscms_page`) |
| Base de l'API | `/melis/react-api/cms-share` |

**Outil Open Graph** — Barre latérale → **Outils du site** → **Open Graph**. Liste la ligne de partage de chaque page avec des
**cartes KPI** (Total des partages, Pages couvertes, Types distincts), un champ de **recherche** (titre, URL, type,
description, id de page), un filtre **Tous les types**, **Réinitialiser les filtres**, un gestionnaire de **Colonnes**,
**Export**, un rafraîchissement et le basculement Nouveau/Ancien. Cliquez sur un en-tête de colonne (Page / Titre / Type / URL /
Ajouté le) pour trier ; chaque ligne comporte les actions modifier (crayon) et supprimer (corbeille).

![L'outil Open Graph React : cartes KPI (Total / Pages couvertes / Types distincts), recherche, un filtre par type, Réinitialiser les filtres, gestionnaire de Colonnes, Export, le basculement Nouveau/Ancien et un rafraîchissement — chaque ligne affiche Page, Titre, Type, URL, Ajouté le avec les actions modifier et supprimer par ligne](/screenshots/react/melis-cms-share/meliscmsshare-tool-opengraph-list.png)

**Formulaire d'édition** — Id de page (obligatoire), Type (`article`, `website`…), Titre (`og:title`), URL
(`og:url`), un panneau Image (aperçu + Remplacer / Supprimer ; JPG, PNG, GIF, WEBP — max 15 Mo) et une
Description (`og:description`). L'image est d'abord uploadée (multipart) vers
`/media/melisCmsShare/<pageId>/…`, puis son chemin est enregistré à l'**Enregistrement**.

![Le formulaire de partage React — Id de page, Type, Titre, URL, un panneau image avec le chemin enregistré (`/media/melisCmsShare/<pageId>/…`) plus Remplacer/Supprimer, et une zone de texte Description](/screenshots/react/melis-cms-share/meliscmsshare-tool-opengraph-edit.png)

**Onglet Open Graph dans l'éditeur de page CMS** — ouvrez une page CMS et sélectionnez l'onglet **Open Graph** pour éditer
en ligne les métadonnées de partage de cette seule page (Titre, Type, URL, Image, Description) ; l'Id de page est
implicite. L'onglet **n'a pas de bouton Enregistrer propre** — les valeurs sont persistées par l'action
Enregistrer / Publier de l'éditeur de page via un hook de sauvegarde, exactement comme l'onglet Partage legacy.

![L'éditeur de page CMS avec l'onglet Open Graph actif (à côté d'Édition, Propriétés, SEO, Langues, Historique, Analytics de page et plus) — Titre, Type, URL, panneau image et Description, enregistrés via les boutons Enregistrer/Publier en haut de la page](/screenshots/react/melis-cms-share/meliscmsshare-pageedition-tab-opengraph.png)

## API React

Les routes se trouvent dans `config/react-api.php` (fusionnées via `MelisCmsShare\Module::getConfig()`) ; contrôleur
`MelisCmsShare\Controller\MelisReactApiShareController`. Toutes sous `/melis/react-api/cms-share` avec
le contrat `{ success, data, error }`.

| Méthode & URL | Garde | Rôle |
| --- | --- | --- |
| `GET /cms-share` | access + `list` | Liste keyset (`limit`, `search`, `type`, `page`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /cms-share/stats` | access + `list` | KPI `{total, pages, types}` |
| `GET /cms-share/types` | access + `list` | Valeurs `mcs_type` distinctes (options de filtre) |
| `GET /cms-share/:id` | access + `edit` | Une ligne de partage |
| `GET /cms-share/by-page/:idPage` | auth uniquement | Le partage de la page (pour l'onglet de l'éditeur de page) ; `data:null` si aucun |
| `POST /cms-share/save` | access + `create`/`edit` | Création / mise à jour (`{id?, pageId, title, type, url, img, description}`) ; auteur forcé côté serveur ; cache de page invalidé |
| `POST /cms-share/upload-image` | access + `edit` | Upload multipart (`pageId`, `image`) → `{path}` sous `/media/melisCmsShare/<pageId>/…` |
| `DELETE /cms-share/delete/:id` | access + `delete` | Supprime une ligne ; cache de page invalidé |

Le contrôleur dialogue avec `melis_cms_share` **directement via du SQL paramétré**, reproduisant les règles
métier legacy (id de page obligatoire, auteur forcé à l'utilisateur courant à la création, liste blanche d'images
jpg/jpeg/png/gif/webp/ico/bmp ≤ 15 Mo conservée comme seul fichier sous `/media/melisCmsShare/<pageId>/`,
invalidation du cache de page front pour rafraîchir les balises du `<head>`). Le service de plus haut niveau `MelisCmsShareService`
n'est pas utilisé par ce contrôleur. Chaque requête fetch envoie `X-Requested-With: XMLHttpRequest` et
`credentials:'include'`.

## Capacités

Déclarées dans `config/react.capabilities.php` sous le nœud porteur de droits
`melis_cms_share_tool_display` (le même nœud que celui utilisé par la garde d'accès du contrôleur) :

```
melis_cms_share_tool_display → list · create · edit · delete · export
```

`MelisCan('melis_cms_share_tool_display', cap)` conditionne les boutons de l'interface ; côté serveur chaque action appelle
`denyUnlessAccess()` (auth + `MelisCoreRights::canAccess(...)` → 401/403) puis `denyUnlessCan(cap)`.
L'onglet de l'éditeur de page est une contribution **modulaire** distincte : le même fichier fusionne une entrée `tabs`
sous `meliscms_page` (clé `melis_cms_share_page_edition_tab`, correspondant à l'appel `registerPageTab(...)`
dans la brique), pour que MelisCms affiche le bouton de l'onglet.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsShareService` | CRUD complet pour les enregistrements de partage : `saveShare($data)`, `deleteShare()`, `getShareById()`, `getShareByPageId($idPage)`, `getAllShare()`, `searchShare()`, `countAllShare()`, `countFilteredShare()`. |
| `melisCmsShareTable` | Table gateway pour `melis_cms_share` (`MelisCmsShareTable`). Récupérer la ligne d'une page avec `getEntryByField('mcs_page_id', $idPage)`. |

## Front office

Aucun view helper ni plugin de template n'est exposé. Les balises de partage sont injectées par
`MelisCmsShare\Listener\MelisCmsShareMetaPageListener`, attaché dans `src/Module.php` et
déclenché sur **`MvcEvent::EVENT_FINISH`** à la priorité **110** :

1. Ignore les requêtes non-PHP/asset (regex sur l'URI) et les requêtes sans `idpage`.
2. Charge la ligne de partage de la page via `melisCmsShareTable->getEntryByField('mcs_page_id', $idPage)`.
3. Pour chaque champ non vide, effectue soit un `preg_replace` sur la balise existante, soit une insertion après `<head>` —
   pour les trois familles (Twitter Card, `itemprop`, `og:`).
4. Échappe les valeurs avec `addslashes`, préfixe les URLs d'image avec `scheme://host`, réécrit via
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
| Routes API React + invokable | `vendor/melisplatform/melis-cms-share/config/react-api.php` |
| Capacités React + onglet de page | `vendor/melisplatform/melis-cms-share/config/react.capabilities.php` |
| Contrôleur API React | `vendor/melisplatform/melis-cms-share/src/Controller/MelisReactApiShareController.php` |
| Contrôleur BO legacy (vue Ancien) | `vendor/melisplatform/melis-cms-share/src/Controller/MelisCmsShareToolController.php` |
| Source de la brique React | `vendor/melisplatform/melis-cms-share/ui-react/src/` (`brick.tsx`, `SharePage.tsx`, …) |
| Brique compilée + manifest | `vendor/melisplatform/melis-cms-share/public/ui-react/` (`brick.js`, `brick.manifest.json`) |
| Injecteur `<head>` front | `vendor/melisplatform/melis-cms-share/src/Listener/MelisCmsShareMetaPageListener.php` |
| Service | `vendor/melisplatform/melis-cms-share/src/Service/MelisCmsShareService.php` |
| Table | `vendor/melisplatform/melis-cms-share/src/Model/Tables/MelisCmsShareTable.php` |

Voir aussi : [MelisCms](/fr/reference/modules/melis-cms) · [MelisCmsPageAnalytics](/fr/reference/modules/melis-cms-page-analytics) · [Référence des modules](/fr/reference/modules)
