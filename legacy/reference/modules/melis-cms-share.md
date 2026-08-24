# MelisCmsShare

> Injects social-media share / Open Graph meta tags into a CMS page's front-office `<head>`. Package `melisplatform/melis-cms-share`.

## Purpose

`MelisCmsShare` lets an editor set five per-page values — title, description, image, type and URL —
and writes them into the rendered page `<head>` as three families of meta tags: **Twitter Card**
(`twitter:title/description/image/card`), **schema.org / Google** (`itemprop` attributes), and
**Facebook / Open Graph** (`og:title/description/image/type/url`). One row of data is stored per
page; if a tag is already present in the template it is replaced, otherwise it is inserted right
after `<head>`. Pages without a share row are left untouched.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsShare',
];
```

Dependencies (from `composer.json`): `melisplatform/melis-core`, `melisplatform/melis-engine`,
`melisplatform/melis-front` and `melisplatform/melis-cms` (all `^5.2`). The module needs the CMS
page editor (for the Share tab and page lifecycle events) and the front render pipeline (for the
`MvcEvent::EVENT_FINISH` hook).

## Key services

| Service alias | Role |
| --- | --- |
| `MelisCmsShareService` | Full CRUD for share records. Key methods: `saveShare($data)`, `deleteShare()`, `getShareById()`, `getShareByPageId($idPage)`, `getAllShare()`, `searchShare()`, `countAllShare()`, `countFilteredShare()`. The last four back the Site-Tools datatable. |
| `melisCmsShareTable` | Table gateway for `melis_cms_share` (`MelisCmsShareTable`). Look up a page's row with `getEntryByField('mcs_page_id', $idPage)`. |

## Backoffice

The module registers two BO entry points, both backed by `MelisCmsShareToolController`:

| Entry point | Description |
| --- | --- |
| **Site Tools → Share** (`melis_cms_share_tool`) | Lists every page's share configuration in a datatable — Id, Page id, Title, Type, Url, User (who set it), Date added — with an edit modal and an image-upload modal. Icon: `fa fa-share-alt`. |
| **CMS page editor → Share tab** (`melis_cms_share`) | Tab (icon *share*) inside the CMS page editor (`meliscms_page → meliscms_tabs`). JS callback: `initMelisCmsShareTab()`. Lets the editor set title, description, uploadable image, type and URL for social previews on that single page. |

Wiring lives in `config/app.interface.php` (tool placement and page-editor tab) and
`config/app.tools.php` (datatable columns).

## Front office

No view helper or templating plugin is exposed. The share tags are injected by
`MelisCmsShare\Listener\MelisCmsShareMetaPageListener`, which is attached in `src/Module.php` and
fires on **`MvcEvent::EVENT_FINISH`** at priority **110**:

1. Skips non-PHP/asset requests (regex on URI) and requests without an `idpage`.
2. Loads the page's share row via `melisCmsShareTable->getEntryByField('mcs_page_id', $idPage)`.
3. For each non-empty field, either `preg_replace`s the existing tag or inserts it after `<head>` —
   across all three families (Twitter Card, `itemprop`, `og:`).
4. `addslashes`-escapes values; prepends `scheme://host` to image URLs; writes back via
   `$response->setContent()`.

Because it operates on the already-rendered HTML string at the end of the MVC lifecycle, it can
replace tags a template already emitted.

> **Type caveat:** the single `mcs_type` field feeds both `twitter:card` and `og:type`, which
> expect different vocabularies (`summary`/`summary_large_image` vs `website`/`article`). Use a
> value that is acceptable to both, or accept one being non-canonical.

## Page-lifecycle listeners

| Listener | Event(s) | Purpose |
| --- | --- | --- |
| `MelisCmsSavePageListener` | `meliscms_page_save_start`, `meliscms_page_publish_start` | Keeps the share record consistent when a CMS page is saved or published. |
| `MelisCmsShareDeletePageListener` | `meliscms_page_delete_end` | Deletes the `melis_cms_share` row when its page is deleted (no orphan share data). |
| `MelisCmsShareFlashMessengerListener` | BO save/delete events | Back-office flash feedback after save or delete. |

## Database tables

| Table | Holds |
| --- | --- |
| `melis_cms_share` | One share config per page. PK `mcs_id`. Columns: `mcs_page_id`, `mcs_title`, `mcs_description`, `mcs_img`, `mcs_type`, `mcs_url`, `mcs_add_user_id`, `mcs_date_added`. The table joins the BO user to expose `mcs_share_added_by` (full name). |

## Example

```php
// Read the share config for a given page
$share = $serviceManager->get('MelisCmsShareService')->getShareByPageId($pageId);

// Persist a share config for a page (create or update)
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

## Key files

| Concern | Path |
| --- | --- |
| Module / bootstrap | `vendor/melisplatform/melis-cms-share/src/Module.php` |
| Routes, services, controllers | `vendor/melisplatform/melis-cms-share/config/module.config.php` |
| Backoffice tool + page-editor tab | `vendor/melisplatform/melis-cms-share/config/app.interface.php` |
| DataTable tool config | `vendor/melisplatform/melis-cms-share/config/app.tools.php` |
| Front `<head>` injector | `vendor/melisplatform/melis-cms-share/src/Listener/MelisCmsShareMetaPageListener.php` |
| Page save/publish listener | `vendor/melisplatform/melis-cms-share/src/Listener/MelisCmsSavePageListener.php` |
| Page delete cleanup listener | `vendor/melisplatform/melis-cms-share/src/Listener/MelisCmsShareDeletePageListener.php` |
| Flash-messenger listener | `vendor/melisplatform/melis-cms-share/src/Listener/MelisCmsShareFlashMessengerListener.php` |
| BO controller | `vendor/melisplatform/melis-cms-share/src/Controller/MelisCmsShareToolController.php` |
| Service | `vendor/melisplatform/melis-cms-share/src/Service/MelisCmsShareService.php` |
| Table | `vendor/melisplatform/melis-cms-share/src/Model/Tables/MelisCmsShareTable.php` |

See also: [MelisCms](/legacy/reference/modules/melis-cms) · [MelisCmsPageAnalytics](/legacy/reference/modules/melis-cms-page-analytics) · [Module reference](/legacy/reference/modules)
