# MelisCmsTags

> Shared tag/taxonomy system for the CMS — create tags and associate content items with them.
> Package `melisplatform/melis-cms-tags`.

## Purpose

MelisCmsTags provides a **Tags manager** in the backoffice where editors create multilingual tags
(title per language, optional picture and document, site-scoped) and view/remove the content items
associated with each tag. Other modules (e.g. MelisCmsNews) plug into the association layer via a
config declaration and a single service call, making their items taggable without any schema changes
to the tag module itself. A front **List Tags** templating plugin is included to display a site's
tags on the front office.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsTags',
];
```

Requires `melis-core` and `melis-cms` (`^5.3`), PHP `^8.1|^8.3`. The module ships with
`dbdeploy: true` — its three tables are created automatically on first deploy.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisCmsTagsService` | Full tag CRUD plus the association API. Every method fires `*_start` / `*_end` events via `MelisGeneralService`. |

Table gateway aliases: `TagTable`, `TagTextsTable`, `TagEntityTable` (all registered in
`module.config.php`).

## Backoffice

The **Tags** tool is accessible from the left menu under **MelisCms → Tags** (`fa-tag`). It opens
on a filterable DataTable of all tags (columns: ID, Title, Nb associations, site; with edit and
delete row actions) and an **Add tag** button. The tag editor has two tabs:

| Tab | Content |
| --- | --- |
| Texts | Per-language title (language selector + Title field per language) |
| Associations | Table of content items linked to this tag (ID, Entity ID, Title, Entity type); delete-association action |

Upload modals allow one picture and one document per tag; files land in `/media/tags/`. The two
DataTables are defined in `app.tools.php`: `tags_list_table` (`#tagsList`) for the tag list and
`tags_list_association` (`#tagsListAssociations`) for the per-tag association grid.

### Controllers

| Controller | Responsibilities |
| --- | --- |
| `TagsListController` | Tag list screen: render, filters (site / search / limit), table JSON (`renderListData`), row actions (info / edit / delete), `deleteTag` |
| `TagController` | Tag editor: header, Texts tab, Associations tab, `save`, association grid JSON (`renderListAssociationsData`), `deleteAssociation`, reusable tag-select (`renderTagSelect` / `getSelectTags`) |

## Front office

`ListTagsPlugin` (`Controller\Plugin\ListPublicationsPlugin.php`) extends `MelisTemplatingPlugin`.

| Setting | Detail |
| --- | --- |
| Config plugin key | `tags` · XML DB key `TagsList` |
| Config file | `config/plugins/ListPublicationsPlugin.config.php` |
| Front view | `MelisCmsTags/listtags` |
| Settings tabs | **Template** (template select + site select) · **Filters** (column / order / date-min / date-max / search) |

> **Naming drift notice.** The plugin class lives in `ListPublicationsPlugin.php`, and the shipped
> Phtml views are `listpublications.phtml` / `showpublication.phtml`. This is a historical artefact
> — the live feature is the **List Tags** plugin described above.

## Form elements (tag pickers for other modules)

Registered under `form_elements.factories` in `module.config.php`.

| Element type | Factory | Use |
| --- | --- | --- |
| `TagsSelect` | `TagSelectFactory` | Multi-select tag picker |
| `TagsSelectSingle` | `TagSelectSingleFactory` | Single tag picker |
| `TagsFondsSelect` | `TagFondsSelectFactory` | Tag-group ("fonds") picker |
| `MelisCmsSiteTagSelect` | `MelisCmsSiteTagSelectFactory` | Site-scoped tag picker |

## Database tables

Base structure in `install/sql/setup_structure.sql`; migrations in `install/dbdeploy/`.

| Table | Holds |
| --- | --- |
| `melis_cms_tag` | Core tag row: `tag_id`, `tag_creation_date`, `tag_site_id`, `tag_type` |
| `melis_cms_tag_texts` | Per-language texts: `tag_text_id`, `tag_id`, `tag_title`, `tag_lang_id` |
| `melis_cms_tag_entity` | Tag ↔ content item link: `id`, `tag_id`, `entity_id`, `entity_type` (e.g. `NEWS`) |

## Example

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
$assoc = $tags->getAssociationsByTagId($tagId, $langId);     // items associated to a tag (grid)
```

`saveTagEntity()` deletes the entity's existing links then re-saves the supplied set — call it from
a content module's save flow to keep its tags in sync.

## Making a module taggable (config-driven associations)

Declare the mapping under `plugins.melis_cms_tag.datas.associations` in
`config/associations.config.php`. The shipped MelisCmsNews example:

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

Then call `saveTagEntity()` in the content module's save action and add a `TagsSelect` (or
`TagsSelectSingle`) form element to its editor form spec.

## Key files

| Concern | Path |
| --- | --- |
| Module config (routes, services, form elements) | `vendor/melisplatform/melis-cms-tags/config/module.config.php` |
| Backoffice tool tree + editor tabs | `vendor/melisplatform/melis-cms-tags/config/app.interface.php` |
| DataTable configs | `vendor/melisplatform/melis-cms-tags/config/app.tools.php` |
| Association mapping | `vendor/melisplatform/melis-cms-tags/config/associations.config.php` |
| List Tags plugin config | `vendor/melisplatform/melis-cms-tags/config/plugins/ListPublicationsPlugin.config.php` |
| Main service | `vendor/melisplatform/melis-cms-tags/src/Service/MelisCmsTagsService.php` |
| Controllers | `vendor/melisplatform/melis-cms-tags/src/Controller/` |
| Front plugin | `vendor/melisplatform/melis-cms-tags/src/Controller/Plugin/ListPublicationsPlugin.php` |
| Table gateways | `vendor/melisplatform/melis-cms-tags/src/Model/Tables/` |
| Form element factories | `vendor/melisplatform/melis-cms-tags/src/Form/Factory/` |
| Listener (active) | `vendor/melisplatform/melis-cms-tags/src/Listener/TagsFlashMessengerListener.php` |
| Install SQL | `vendor/melisplatform/melis-cms-tags/install/sql/setup_structure.sql` |
| DB migrations | `vendor/melisplatform/melis-cms-tags/install/dbdeploy/` |

See also: [melis-cms](/reference/modules/melis-cms),
[melis-cms-news](/reference/modules/melis-cms-news),
[melis-front](/reference/modules/melis-front),
[melis-engine](/reference/modules/melis-engine),
[melis-core](/reference/modules/melis-core)
