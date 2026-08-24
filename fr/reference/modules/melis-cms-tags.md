# MelisCmsTags

> Système de tags/taxonomie partagé pour le CMS — les « libellés » auxquels les modules de contenu (par ex. News) rattachent leurs éléments, désormais doté d'un back-office React natif. Package `melisplatform/melis-cms-tags`.

## Présentation

MelisCmsTags fournit le **système de tags (taxonomie)** de la plateforme : des tags multilingues (un titre par
langue) auxquels d'autres modules associent leur contenu. Les éditeurs créent et traduisent des tags, voient combien
d'éléments utilisent chaque tag et suppriment ceux qui ne sont pas utilisés. D'autres modules (par ex. MelisCmsNews)
s'intègrent à la couche d'association via une déclaration de configuration et un seul appel de service, rendant
leurs éléments « taggables » sans aucune modification du schéma du module de tags. Un plugin de template front
**List Tags** affiche les tags d'un site sur le front office.

Dans **Melis v6**, le back-office est une **brique full-React native** rendue à l'intérieur de `/melis-react`, appelant
une couche JSON `react-api` propre au module. Le modèle de données côté serveur, le service, les tables, la config
d'associations et le plugin front sont inchangés par rapport à la v5 — seule la couche de présentation et de navigation
est passée à React.

## Activation

Ajoutez dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsTags',
];
```

Nécessite `melis-core` et `melis-cms`. Le module est livré avec `dbdeploy: true` — ses trois tables sont
créées automatiquement au premier déploiement. La brique React n'apparaît dans le back-office **que si le module
est activé** (découverte modulaire des briques).

## Emplacement dans le back-office React

Menu de gauche → groupe **Site Tools** → **Tags** (`fa-tag`). Il s'ouvre dans un onglet principal nommé **Tags**. La
`forwardKey` de menu `MelisCmsTags/TagsList` correspond à la route d'arbre `/melis-cms/tags` (`/melis-cms/tags/:id`
pour l'éditeur), où le composant `TagsPage` est rendu.

La brique est une interface **full-React native** avec un **bascule New / Old** (en haut à droite) : *New* correspond
à l'interface React (par défaut), *Old* affiche l'outil legacy dans une iframe (`/melis/react-tool-page?key=tags_left_menu`).

## Back-office — liste et éditeur

**Un seul onglet de shell (`Tags`) avec des sous-onglets internes.** La liste est la vue principale ; ouvrir ou créer
un tag ajoute un **sous-onglet d'édition** (`subTabs: true`), ce qui rend le passage d'un tag ouvert à l'autre instantané.

**La liste** affiche chaque tag de la plateforme, avec :

- **Cartes KPI** — Total · Avec associations · Sans association (issues de l'endpoint `stats`).
- **Recherche** (« Search a tag… », correspond à l'id ou à un titre dans n'importe quelle langue), **Réinitialiser
  les filtres**, un gestionnaire de **Colonnes** (masquer/réordonner) et un bouton **Export** (`.xlsx` via le
  `window.MelisXLSX` de l'hôte, avec repli CSV).
- Colonnes triables **ID / Title / Nb associations**, avec actions d'**édition** et de **suppression** par ligne.
- Un bouton **+ New tag** qui ouvre un éditeur vierge.

![Liste des tags React — cartes KPI (Total / Avec associations / Sans association), recherche, Réinitialiser les filtres, gestionnaire de Colonnes, Export, la bascule New/Old, « + New tag », et lignes affichant ID / Title / Nb associations avec les actions d'édition et de suppression](/screenshots/react/melis-cms-tags/meliscmstags-tool-tags-list.png)

**L'éditeur** est un formulaire compact (un tag n'est qu'un titre par langue) : un **sélecteur de langue**
(English / Français…) alimenté par l'endpoint `languages`, et un champ **Label** pour la langue sélectionnée.
Toutes les traductions sont conservées en même temps et enregistrées ensemble — **au moins un titre non vide est requis**.
La suppression d'un tag est **refusée tant qu'il possède encore des associations**, ce qui protège le contenu taggé.

![L'éditeur de tag React — un sélecteur de langue (English / Français) et le champ « LABEL » propre à chaque langue avec l'indication « At least one title is required »](/screenshots/react/melis-cms-tags/meliscmstags-tool-tags-edit-texts.png)

## Tagger du contenu — le sélecteur de Tags

Les tags sont faits pour être *utilisés* par d'autres modules. Dans l'**éditeur de News React** (Site Tools → News →
ouvrir un article), la barre latérale des réglages affiche un panneau **TAGS** : une liste à cocher des tags disponibles.
Cocher des tags et enregistrer l'article stocke les associations, qui comptent ensuite dans le **Nb associations** de
chaque tag.

![Le panneau TAGS à l'intérieur de l'éditeur d'article News React — une liste à cocher de tags (Art, Business, Design, Development, Education…) qui taguent l'article](/screenshots/react/melis-cms-tags/meliscmstags-tooloverride-news-tags.png)

Ce sélecteur et son enregistrement sont la propriété de la brique **News** (elle lit `GET /melis/react-api/news/tags`
et écrit dans la table de liaison partagée avec `entity_type = 'NEWS'`) ; MelisCmsTags ne possède que les données de
tags et la table partagée `melis_cms_tag_entity`. Le panneau n'apparaît que lorsque MelisCmsTags est actif.

## API React — endpoints

Il n'y a **pas de `config/react-api.php`** : les routes sont déclarées **en ligne dans `config/module.config.php`**
en tant que nœud enfant `react-api-cms-tags` sous `melis-backoffice`, si bien que les URL se trouvent sous
**`/melis/react-api-cms-tags`** (propre au module, et *non* dans l'espace de noms partagé `/melis/react-api/…`).
Contrôleur : `MelisCmsTags\Controller\MelisCmsTagsReactApiController`. Toutes les réponses utilisent le
contrat `{ success, data, error }` ; les requêtes envoient `X-Requested-With: XMLHttpRequest` et
`credentials: 'include'`.

| Méthode & URL | Action | Objet |
| --- | --- | --- |
| `GET /melis/react-api-cms-tags` | `list` | Liste des tags (keyset : `search`, `limit`, `sort`, `dir`, `after`, `lang` optionnel) → `{items,total,nextCursor}` ; chaque élément a `id`, `title`, `associationsCount` |
| `GET /melis/react-api-cms-tags/stats` | `stats` | KPI `{total, withAssociations, orphan}` |
| `GET /melis/react-api-cms-tags/languages` | `languages` | Langues CMS `{languages:[{id,locale,name}]}` (alimente le sélecteur de langue de l'éditeur) |
| `GET /melis/react-api-cms-tags/:id` | `get` | Un tag `{id, creationDate, titles:{langId:title}, associationsCount}` |
| `POST /melis/react-api-cms-tags/save` | `save` | Création / mise à jour (`{id?, titles:{langId:title}}`) → `{id}` |
| `DELETE /melis/react-api-cms-tags/delete/:id` | `delete` | Supprime un tag (refusé s'il possède encore des associations) |

> L'ordre des routes est important : `stats` / `languages` / `save` sont déclarées **avant** le fourre-tout `:id`
> afin qu'elles soient résolues vers leurs propres actions plutôt que vers `get`.

Le contrôleur combine du SQL keyset paramétré direct (list, stats) avec les tables et le service du module
(`TagTable`, `TagTextsTable`, `TagEntityTable` pour `get`/`save` ; `MelisCmsTagsService` pour `delete` —
`getAssociationsByTagId()` bloque la suppression, puis `deleteTagById()` + `TagTextsTable::deleteByField()`
font le nettoyage). `save` reproduit les règles legacy (≥1 titre non vide, ≤255 caractères, unicité par langue)
et déclenche les mêmes événements (`meliscmstags_save_tag_end`, `meliscmstags_delete_tag_end`).

Exemple (`tags-api.ts`) :

```ts
const BASE = '/melis/react-api-cms-tags'
await apiFetch<TagListResult>(`${BASE}?search=art&limit=25&sort=id&dir=desc`) // list
await apiFetch<TagDetail>(`${BASE}/42`)                                       // one tag
await apiFetch<{ id: number }>(`${BASE}/save`, {                              // save all translations
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: null, titles: { 1: 'Art', 2: 'Art' } }),        // langId → title
})
await apiFetch<null>(`${BASE}/delete/42`, { method: 'DELETE' })              // delete
```

## Capacités (capabilities)

Déclarées dans `config/react.capabilities.php` sous le nœud de menu **`tags_left_menu`** (le nœud d'outil affichable ;
`MelisCmsTags\Module::getConfig()` fusionne le fichier). Actions : `list` · `create` · `edit` · `delete`
· `export`. En React, le `can(cap)` de `TagsPage` lit `window.MelisCan('tags_left_menu', cap)` pour conditionner le
bouton **+ New tag**, l'édition/suppression par ligne et l'Export. Côté serveur, chaque action appelle `denyUnlessAccess()`
(auth + `MelisCoreRights::canAccess('tags_left_menu')` → 401/403) ; ici la clé des capacités et la
`MELIS_KEY` de garde d'accès coïncident (`tags_left_menu`).

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsTagsService` | CRUD complet des tags ainsi que l'API d'association. Chaque méthode déclenche des événements `*_start` / `*_end` via `MelisGeneralService`. |

Alias des passerelles de table : `TagTable`, `TagTextsTable`, `TagEntityTable` (enregistrés dans `module.config.php`).

## Front office

`ListTagsPlugin` (`Controller\Plugin\ListPublicationsPlugin.php`) étend `MelisTemplatingPlugin`.

| Paramètre | Détail |
| --- | --- |
| Clé de plugin de config | `tags` · Clé XML DB `TagsList` |
| Fichier de config | `config/plugins/ListPublicationsPlugin.config.php` |
| Vue front | `MelisCmsTags/listtags` |
| Onglets de paramètres | **Template** (template + sélection du site) · **Filters** (colonne / ordre / date-min / date-max / recherche) |

> **Note sur la dérive de nommage.** La classe du plugin se trouve dans `ListPublicationsPlugin.php` et les vues Phtml
> livrées sont `listpublications.phtml` / `showpublication.phtml` — un artefact historique ; la fonctionnalité active est
> bien le plugin **List Tags** décrit ci-dessus.

## Tables de base de données

Structure de base dans `install/sql/setup_structure.sql` ; migrations dans `install/dbdeploy/`.

| Table | Contenu |
| --- | --- |
| `melis_cms_tag` | Ligne principale du tag : `tag_id`, `tag_creation_date`, `tag_site_id`, `tag_type` |
| `melis_cms_tag_texts` | Textes par langue : `tag_text_id`, `tag_id`, `tag_title`, `tag_lang_id` |
| `melis_cms_tag_entity` | Lien tag ↔ élément de contenu : `id`, `tag_id`, `entity_id`, `entity_type` (ex. `NEWS`) |

## Exemple de service

```php
$tags = $this->getServiceManager()->get('MelisCmsTagsService');

// Tag CRUD
$list = $tags->getTagsList($status, $langId, $start, $limit, $orderCol, $order, $siteId, $search);
$tag  = $tags->getTagById($tagId, $langId);
$id   = $tags->saveTag(['tag_site_id' => $siteId, ...], $tagId); // $tagId null → create
$tags->deleteTagById($tagId);

// Associations — the integration surface for other modules
$tags->saveTagEntity([$tagId1, $tagId2], $entityId, 'NEWS'); // (re)attach a tag set to an item
$set   = $tags->loadTagByEntityIdType($entityId, 'NEWS');    // tags of one item
$items = $tags->loadEntityByTagsId($tagIds, 'NEWS');         // items carrying given tags
$tags->deleteEntities($entityId, 'NEWS');                    // clear an item's tags
$assoc = $tags->getAssociationsByTagId($tagId, $langId);     // items associated to a tag
```

`saveTagEntity()` supprime les liens existants de l'entité puis ré-enregistre l'ensemble fourni — appelez-la depuis
le flux de sauvegarde d'un module de contenu pour maintenir ses tags à jour.

## Rendre un module « taggable » (associations pilotées par la config)

Déclarez le mapping sous `plugins.melis_cms_tag.datas.associations` dans `config/associations.config.php`.
L'exemple MelisCmsNews livré :

```php
'associations' => [
    'meliscmsnews' => [
        'module'           => 'MelisCmsNews',       // skipped if module not loaded
        'entity_type'      => 'NEWS',               // stored in melis_cms_tag_entity.entity_type
        'entity_table'     => 'melis_cms_news',
        'entity_primary_id'=> 'cnews_id',
        'trans' => [
            'trans_table'      => 'melis_cms_news_texts',
            'trans_foreign_id' => 'cnews_id',
            'trans_lang_key'   => 'cnews_lang_id',
        ],
        'association_title_key' => 'cnews_title',   // shown in the Associations grid "Title" column
    ],
],
```

Appelez ensuite `saveTagEntity()` dans l'action de sauvegarde du module de contenu. Dans la brique News React, cela
est câblé via sa propre surface `/melis/react-api/news/tags` ; MelisCmsTags ne possède que les données de tags et la
table de liaison partagée.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Config du module (routes, routes react-api en ligne, services, éléments de formulaire) | `vendor/melisplatform/melis-cms-tags/config/module.config.php` |
| Capacités React | `vendor/melisplatform/melis-cms-tags/config/react.capabilities.php` |
| Mapping des associations | `vendor/melisplatform/melis-cms-tags/config/associations.config.php` |
| Config du plugin List Tags | `vendor/melisplatform/melis-cms-tags/config/plugins/ListPublicationsPlugin.config.php` |
| Contrôleur API React | `vendor/melisplatform/melis-cms-tags/src/Controller/MelisCmsTagsReactApiController.php` |
| Service principal | `vendor/melisplatform/melis-cms-tags/src/Service/MelisCmsTagsService.php` |
| Plugin front | `vendor/melisplatform/melis-cms-tags/src/Controller/Plugin/ListPublicationsPlugin.php` |
| Passerelles de table | `vendor/melisplatform/melis-cms-tags/src/Model/Tables/` |
| Source de la brique React | `vendor/melisplatform/melis-cms-tags/ui-react/src/` (`TagsPage`, `tags-api.ts`, `ViewToggle`, `ExportModal`) |
| Build + manifeste de la brique React | `vendor/melisplatform/melis-cms-tags/public/ui-react/brick.js` · `brick.manifest.json` |
| SQL d'installation | `vendor/melisplatform/melis-cms-tags/install/sql/setup_structure.sql` |
| Migrations DB | `vendor/melisplatform/melis-cms-tags/install/dbdeploy/` |

Voir aussi : [melis-cms](/fr/reference/modules/melis-cms),
[melis-cms-news](/fr/reference/modules/melis-cms-news),
[melis-front](/fr/reference/modules/melis-front),
[melis-engine](/fr/reference/modules/melis-engine),
[melis-core](/fr/reference/modules/melis-core)
