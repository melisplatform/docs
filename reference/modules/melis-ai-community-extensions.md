# MelisAICommunityExtensions

> Injects AI generation into existing CMS editing surfaces — mini-template creator, news content creator, and drag-and-drop zone AI buttons. Package `melisplatform/melis-ai-community-extensions`.

## Purpose

MelisAICommunityExtensions is an app layer on top of the MelisAI suite that wires AI generation directly into existing backoffice editing surfaces. It registers two pre-configured instances (`minitemplatecreator` and `newscontentcreator`), two MCP tool sets, and a set of event listeners that manage the lifecycle of AI-generated front-end assets (CSS, JS, images). It does not add a standalone tool screen; instead it injects **Generate with AI** buttons and chat modals into the Mini Template Manager and the News editor, and also into page drag-and-drop zones.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisAICommunityExtensions',
];
```

Requires `melisplatform/melis-ai` `^5.3`. Run the dbdeploy after enabling — the module seeds the `minitemplatecreator` and `newscontentcreator` agent/instance rows into the MelisAI engine tables (`dbdeploy: true`). The module integrates with MelisCms and MelisCmsNews.

## Key services

| Service alias | Role |
| --- | --- |
| `generateWithAIBtn` (view helper `MelisGenerateWithAIBtnHelper`) | Renders the reusable **Generate with AI** button (using the engine's `melisAIIcon`); reused across all three editing surfaces. |

The module reuses the engine's `melis_ai_instances` / `melis_ai_agents` tables — it owns no additional AI tables.

## Backoffice

Three editing surfaces are extended. In each, an AI button opens a scoped chat and the result is written back into the correct field.

### AI Mini-template Creator (MiniTemplateController)

Overrides the MelisCms mini-template manager to add an **AI Mini Template Creator** button that opens the `minitemplatecreator` chat. The manual **Add mini-template** form also gains a **Generate with AI** button inside the TinyMCE toolbar of the *Template's HTML* field. Existing mini-templates carry an AI badge for duplicate/vary-with-AI flows.

| Action | Purpose |
| --- | --- |
| `renderAiChat` | Opens the `minitemplatecreator` chat; passes `siteModule` and an optional reference template. |
| `getMiniTemplatePreviewShell` | Returns the preview HTML shell with AI assets injected. |
| `validateTemplateName` | Validates the proposed template name. |
| `checkTemplateAssets` | Checks that expected assets exist. |
| `getSiteModuleByPageTemplateId` | Resolves a page template's site module. |
| `getAIIcon` / `getGenerateWithAIButton` | Returns the icon and button markup. |

### News Content Creator (NewsController)

Adds a **Generate with AI** button on each **Paragraph** in the News editor **Texts** tab, per language. Opens the `newscontentcreator` chat scoped to that article (session isolated per article so sessions do not collide).

| Action | Purpose |
| --- | --- |
| `renderAiChat` | Opens the `newscontentcreator` chat; sets **exit params** to route the answer back to the target paragraph field; passes article images as `custom_files`. |
| `getNewsTitle` | Returns the news article title to seed the chat greeting. |
| `getGenerateWithAIButton` | Returns the per-paragraph button markup. |

### Generate-with-AI in drag-and-drop zones

Empty page drag-and-drop zones receive an injected **Generate with AI** button. When the user accepts a generated block, three commit options are presented: **Cancel**, **Insert** (drop into this zone only), or **Save & Insert** (drop and also promote to a permanent reusable mini-template).

### BaseController

`BaseController` provides `emptyGenericModal` shared across the surfaces.

### Event listeners

| Listener | Event | Effect |
| --- | --- | --- |
| `…TinyMCEConfigurationListener` | `meliscore_tinymce_config` | Points the TinyMCE `minitemplate` plugin at this module's JS. |
| `…CreateMiniTemplateListener` | `meliscms_mini_template_manager_create_end` | Moves temp CSS/JS/images to permanent storage; renames the init JS per template. |
| `…PublishPageListener` | `meliscms_page_publish_start` | Promotes temp assets a published page references; updates `page_content`. |
| `…SanitizeSavedPluginHtmlListener` | `meliscms_page_savesession_plugin_start` | Cleans carousel/slider runtime markup (Owl/Slick/Swiper artefacts) before save. |
| `…DeleteMiniTemplateAssetsListener` | `meliscms_mini_template_manager_delete_end` | Deletes the template's CSS/JS/images. |
| `…AttachAIGeneratedCssListener` | `MvcEvent::EVENT_FINISH` (front + back) | Injects AI CSS/JS into rendered pages. |
| `…InjectDndAiButtonListener` | `MvcEvent::EVENT_FINISH` | Injects the **Generate with AI** button into drag-and-drop zones. |

The module also registers a `MelisPluginRendererOverride` so AI assets are injected correctly during plugin rendering.

## MCP server

A stdio MCP server `minitemplate_creator` (entry point `mcp/minitemplatecreator/bin/server.php`) is registered in `config['mcp']['servers']`. The tools below are declared in `function_declarations` with `mcp: true`:

| Tool | Parameters | Purpose |
| --- | --- | --- |
| `readSiteAssets` | `siteModule`, `templateRequest` | Returns the site's relevant CSS/JS/view files so the AI matches the real design. |
| `getSitePublicUrl` | `siteModule` | Returns the site's public URL/domain for visual inspection before generating. |
| `uploadMinitemplateImages` | `siteModule`, `image`, `filename` | Saves an image (base64/data-URL/HTTP) under the AI temp dir and returns a web path for `<img src>`. |
| `renderMinitemplatePreview` | `siteModule` | Triggers the editor preview of the generated template. |

The `minitemplatecreator` agent also has the engine's filesystem tools (`createFile` / `readFile` / `updateFiles` / …) in its allow-list.

## Database tables

This module creates no tables of its own. Its dbdeploy deltas insert rows into the tables owned by `melis-ai`:

| Table | Holds |
| --- | --- |
| `melis_ai_instances` | The seeded `minitemplatecreator` and `newscontentcreator` instances. |
| `melis_ai_agents` | The seeded agents for the two instances. |

At runtime, news data is accessed via `NewsTable` (`getNewsData($newsId)`), which joins the site table to resolve the `siteModule` needed to place generated images.

## Example

Open the `newscontentcreator` chat scoped to an article and wired to a specific paragraph field:

```php
// Suffix the instance ID with the news ID to isolate the session per article.
$instanceId = 'newscontentcreator|' . $newsId;

// exitParamArr routes the agent answer back into the target paragraph field.
$exitParamArr = [
    'masse_exit_input_1'     => $paragraphField,             // e.g. 'news_paragraph_1'
    'masse_exit_js_callback' => "setParagraphContent($paragraphField)",
];

// Render the chat via the engine view helper.
echo $this->AIChatViewHelper(
    $instanceId,
    null,
    ['custom_text' => '...', 'custom_files' => $images],
    false,
    $exitParamArr
);
```

The general pattern: (1) inject a `generateWithAIBtn` via `app.toolstree.php` + an `EVENT_FINISH` listener; (2) open `AIChatViewHelper(<instance>, …)` with exit params that route the answer back into the host field; (3) give the agent MCP tools that expose host context; (4) manage generated assets' temp→permanent lifecycle with CMS event listeners.

## Key files

| Concern | Path |
| --- | --- |
| Module config | `vendor/melisplatform/melis-ai-community-extensions/config/module.config.php` |
| Backoffice UI injections | `vendor/melisplatform/melis-ai-community-extensions/config/app.toolstree.php` |
| Interface (button + modal wiring) | `vendor/melisplatform/melis-ai-community-extensions/config/app.interface.php` |
| MCP tools declaration | `vendor/melisplatform/melis-ai-community-extensions/config/mcp.tools.php` |
| Mini-template controller | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/MiniTemplateController.php` |
| News controller | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` |
| Listeners | `vendor/melisplatform/melis-ai-community-extensions/src/Listener/` |
| Generate-with-AI button helper | `vendor/melisplatform/melis-ai-community-extensions/src/View/Helper/MelisGenerateWithAIBtnHelper.php` |
| News table gateway | `vendor/melisplatform/melis-ai-community-extensions/src/Model/Tables/NewsTable.php` |
| MCP server entry point | `vendor/melisplatform/melis-ai-community-extensions/mcp/minitemplatecreator/bin/server.php` |
| AI assets directory | `public/miniTemplatesTinyMce/AI/{siteModule}/{temp\|css\|js\|images}/` |
| Install deltas (seed agents) | `vendor/melisplatform/melis-ai-community-extensions/install/dbdeploy/` |

See also: [MelisAIEngine](/reference/modules/melis-ai-engine), [MelisAI](/reference/modules/melis-ai), [MelisAIToolCreator](/reference/modules/melis-ai-tool-creator), [MelisCms](/reference/modules/melis-cms), [MelisCmsNews](/reference/modules/melis-cms-news)
