# MelisCmsShare

> Injects social-media share / Open Graph meta tags into a CMS page's front-office `<head>`, managed from a native React back-office. Package `melisplatform/melis-cms-share`.

## Purpose

`MelisCmsShare` lets an editor set five per-page values — **title, description, image, type and URL** —
and writes them into the rendered page `<head>` as three families of meta tags: **Twitter Card**
(`twitter:title/description/image/card`), **schema.org / Google** (`itemprop` attributes), and
**Facebook / Open Graph** (`og:title/description/image/type/url`). One row of data is stored per
page; a tag already present in the template is replaced, otherwise it is inserted right after
`<head>`. Pages without a share row are left untouched.

In v6 the module ships a **native full-React brick** (not an iframe brick) exposing this data on two
surfaces — a standalone **Open Graph** tool and an **Open Graph tab inside the CMS page editor** —
both reading and writing through a `/melis/react-api/cms-share…` JSON layer. The front-office
`<head>` injector, data model and services are unchanged from v5.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisCmsShare',
];
```

Dependencies: `melisplatform/melis-core`, `melisplatform/melis-engine`, `melisplatform/melis-front`
and `melisplatform/melis-cms`. The module needs the CMS page editor (for the Open Graph tab and page
lifecycle events) and the front render pipeline (for the `MvcEvent::EVENT_FINISH` hook). Both React
surfaces appear **only while the module is listed here** (modular brick discovery via
`GET /melis/react-api/react-modules`).

## The React back-office

The brick is a **native full-React** UI with a **New / Old toggle**: *New* is the React interface
(default), *Old* renders the legacy tool in an iframe
(`/melis/react-tool-page?key=melis_cms_share_tool_display`).

| Item | Value |
| --- | --- |
| Brick id | `cms-share` (route `/melis-cms-share/share`, label `Partage`) |
| `forwardKey` | `MelisCmsShare/MelisCmsShareTool` |
| `melisKey` (rights / Old-view iframe) | `melis_cms_share_tool_display` |
| Page-editor tab key | `melis_cms_share_page_edition_tab` (registered under `meliscms_page`) |
| API base | `/melis/react-api/cms-share` |

**Open Graph tool** — Sidebar → **Site Tools** → **Open Graph**. Lists every page's share row with
**KPI cards** (Total shares, Pages covered, Distinct types), a **search** box (title, URL, type,
description, page id), an **All types** filter, **Reset filters**, a **Columns** manager,
**Export**, a refresh and the New/Old toggle. Click a column header (Page / Title / Type / URL /
Added on) to sort; each row has edit (pencil) and delete (trash).

![The React Open Graph tool: KPI cards (Total / Pages covered / Distinct types), search, a type filter, Reset filters, Columns manager, Export, the New/Old toggle and a refresh — each row shows Page, Title, Type, URL, Added on with per-row edit and delete actions](/screenshots/react/melis-cms-share/meliscmsshare-tool-opengraph-list.png)

**Edit form** — Page ID (required), Type (`article`, `website`…), Title (`og:title`), URL
(`og:url`), an Image panel (preview + Replace / Remove; JPG, PNG, GIF, WEBP — max 15 MB) and a
Description (`og:description`). The image is uploaded first (multipart) to
`/media/melisCmsShare/<pageId>/…`, then its path is stored on **Save**.

![The React share form — Page ID, Type, Title, URL, an image panel with the stored path (`/media/melisCmsShare/<pageId>/…`) plus Replace/Remove, and a Description textarea](/screenshots/react/melis-cms-share/meliscmsshare-tool-opengraph-edit.png)

**Open Graph tab in the CMS page editor** — open a CMS page and pick the **Open Graph** tab to edit
that one page's share metadata inline (Title, Type, URL, Image, Description); the Page ID is
implicit. The tab has **no own Save button** — values are persisted by the page editor's
Save / Publish via a save hook, exactly like the legacy Share tab.

![The CMS page editor with the Open Graph tab active (next to Edition, Properties, SEO, Languages, Historic, Page Analytics and more) — Title, Type, URL, image panel and Description, saved via the page's top Save/Publish buttons](/screenshots/react/melis-cms-share/meliscmsshare-pageedition-tab-opengraph.png)

## React API

Routes live in `config/react-api.php` (merged via `MelisCmsShare\Module::getConfig()`); controller
`MelisCmsShare\Controller\MelisReactApiShareController`. All under `/melis/react-api/cms-share` with
the contract `{ success, data, error }`.

| Method & URL | Guard | Purpose |
| --- | --- | --- |
| `GET /cms-share` | access + `list` | Keyset list (`limit`, `search`, `type`, `page`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /cms-share/stats` | access + `list` | KPI `{total, pages, types}` |
| `GET /cms-share/types` | access + `list` | Distinct `mcs_type` values (filter options) |
| `GET /cms-share/:id` | access + `edit` | One share row |
| `GET /cms-share/by-page/:idPage` | auth only | The page's share (for the page-editor tab); `data:null` if none |
| `POST /cms-share/save` | access + `create`/`edit` | Create / update (`{id?, pageId, title, type, url, img, description}`); author forced server-side; page cache invalidated |
| `POST /cms-share/upload-image` | access + `edit` | Multipart upload (`pageId`, `image`) → `{path}` under `/media/melisCmsShare/<pageId>/…` |
| `DELETE /cms-share/delete/:id` | access + `delete` | Delete a row; page cache invalidated |

The controller talks to `melis_cms_share` **directly via parameterised SQL**, reproducing the legacy
business rules (page id required, author forced to the current user on create, image allow-list
jpg/jpeg/png/gif/webp/ico/bmp ≤ 15 MB kept as the only file under `/media/melisCmsShare/<pageId>/`,
front page-cache invalidation so the `<head>` tags refresh). The higher-level `MelisCmsShareService`
is not used by this controller. Every fetch sends `X-Requested-With: XMLHttpRequest` and
`credentials:'include'`.

## Capabilities

Declared in `config/react.capabilities.php` under the rights-bearing node
`melis_cms_share_tool_display` (the same node used by the controller's access guard):

```
melis_cms_share_tool_display → list · create · edit · delete · export
```

`MelisCan('melis_cms_share_tool_display', cap)` gates the UI buttons; server-side each action calls
`denyUnlessAccess()` (auth + `MelisCoreRights::canAccess(...)` → 401/403) then `denyUnlessCan(cap)`.
The page-editor tab is a separate **modular** contribution: the same file merges a `tabs` entry
under `meliscms_page` (key `melis_cms_share_page_edition_tab`, matching the `registerPageTab(...)`
call in the brick), so MelisCms shows the tab button.

## Key services

| Service alias | Role |
| --- | --- |
| `MelisCmsShareService` | Full CRUD for share records: `saveShare($data)`, `deleteShare()`, `getShareById()`, `getShareByPageId($idPage)`, `getAllShare()`, `searchShare()`, `countAllShare()`, `countFilteredShare()`. |
| `melisCmsShareTable` | Table gateway for `melis_cms_share` (`MelisCmsShareTable`). Look up a page's row with `getEntryByField('mcs_page_id', $idPage)`. |

## Front office

No view helper or templating plugin is exposed. The share tags are injected by
`MelisCmsShare\Listener\MelisCmsShareMetaPageListener`, attached in `src/Module.php` and firing on
**`MvcEvent::EVENT_FINISH`** at priority **110**:

1. Skips non-PHP/asset requests (regex on URI) and requests without an `idpage`.
2. Loads the page's share row via `melisCmsShareTable->getEntryByField('mcs_page_id', $idPage)`.
3. For each non-empty field, either `preg_replace`s the existing tag or inserts it after `<head>` —
   across all three families (Twitter Card, `itemprop`, `og:`).
4. `addslashes`-escapes values, prepends `scheme://host` to image URLs, writes back via
   `$response->setContent()`.

Because it operates on the already-rendered HTML string at the end of the MVC lifecycle, it can
replace tags a template already emitted.

> **Type caveat:** the single `mcs_type` field feeds both `twitter:card` and `og:type`, which expect
> different vocabularies (`summary`/`summary_large_image` vs `website`/`article`). Use a value
> acceptable to both, or accept one being non-canonical.

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
| React API routes + invokable | `vendor/melisplatform/melis-cms-share/config/react-api.php` |
| React capabilities + page tab | `vendor/melisplatform/melis-cms-share/config/react.capabilities.php` |
| React API controller | `vendor/melisplatform/melis-cms-share/src/Controller/MelisReactApiShareController.php` |
| Legacy BO controller (Old view) | `vendor/melisplatform/melis-cms-share/src/Controller/MelisCmsShareToolController.php` |
| React brick source | `vendor/melisplatform/melis-cms-share/ui-react/src/` (`brick.tsx`, `SharePage.tsx`, …) |
| Built brick + manifest | `vendor/melisplatform/melis-cms-share/public/ui-react/` (`brick.js`, `brick.manifest.json`) |
| Front `<head>` injector | `vendor/melisplatform/melis-cms-share/src/Listener/MelisCmsShareMetaPageListener.php` |
| Service | `vendor/melisplatform/melis-cms-share/src/Service/MelisCmsShareService.php` |
| Table | `vendor/melisplatform/melis-cms-share/src/Model/Tables/MelisCmsShareTable.php` |

See also: [MelisCms](/reference/modules/melis-cms) · [MelisCmsPageAnalytics](/reference/modules/melis-cms-page-analytics) · [Module reference](/reference/modules)
