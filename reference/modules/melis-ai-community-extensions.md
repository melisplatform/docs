# MelisAICommunityExtensions

> Community AI extensions that wire Melis AI into real editing flows — AI-assisted news content
> and AI mini-template generation. Package `melisplatform/melis-ai-community-extensions`.

## Purpose

MelisAICommunityExtensions ships ready-to-use AI agents that plug the [Melis AI](/guide/ai) engine
into concrete backoffice tasks. It provides two pre-configured agents:

- **newscontentcreator** — generates news article content (title, intro, paragraphs, conclusion)
  directly into MelisCmsNews fields, optionally using attached images as context.
- **minitemplatecreator** — helps the model author mini-template HTML for a site, backed by an
  [MCP](/guide/mcp) server that reads relevant site assets, resolves the site's public URL, uploads
  images, and renders a live preview.

The module does not add a standalone tool screen of its own; instead it injects a **"Generate with
AI"** button and chat modals into existing tools (the News editor and the Mini Template Manager) and
manages the CSS/JS assets the AI produces.

## Enable it

It is a standard Laminas module listed in `config/melis.module.load.php` — ensure
`'MelisAICommunityExtensions'` is present in that array. It requires `melisplatform/melis-ai`
(`^5.3`) and PHP 8.1/8.3 (see `composer.json`); it integrates with `melis-cms`, `melis-cms-news` and
`melis-engine` when present. Its install deltas (`install/dbdeploy/`) seed the agent/instance data,
so run the dbdeploy after enabling.

To make AI-generated mini-template assets render on the front office, also load
`MelisAICommunityExtensions` on the site itself (MelisCMS → Site Tools → Sites → *site* → Module
Loading tab). See [Module reference](/reference/modules), [AI](/guide/ai) and [MCP](/guide/mcp).

## Key services

The module registers a single table-gateway alias in `config/module.config.php`; the heavy lifting
is done by the agents (seeded in the database) plus the controllers and listeners below.

| Service alias | Role |
| --- | --- |
| `AINewsTable` | Table gateway (`MelisAICommunityExtensions\Model\Tables\NewsTable`, extends `MelisCmsNewsTable`). `getNewsData($newsId)` joins `melis_cms_news` with `melis_cms_site` to resolve a post's `site_name` (used to locate site image paths). |

It also adds a view helper alias `generateWithAIBtn`
(`MelisGenerateWithAIBtnHelper`), which renders the reusable **Generate with AI** button (AI icon +
label), and a `controllers` block for its four controllers.

## Backoffice

The module has no tool tree entry of its own (`app.tools.php` is an empty placeholder). Instead it
hooks into existing tools via `config/app.interface.php` and event listeners.

| Controller | Key actions | Role |
| --- | --- | --- |
| `MelisAICommunityExtensions\Controller\News` | `render-ai-chat`, `get-generate-with-ai-button`, `get-news-title` | Opens the **newscontentcreator** chat for a given `newsId`/`paragraphField`; builds `exitParamArr` so the agent writes its answer back into the targeted news field. |
| `MelisAICommunityExtensions\Controller\MiniTemplate` | `render-ai-chat`, `get-generate-with-ai-button`, `get-mini-template-preview-shell`, `validate-template-name`, `check-template-assets`, `get-site-module-by-page-template-id` | Opens the **minitemplatecreator** chat for a site module / page template; serves the preview shell and validates template names/assets. |
| `MelisAICommunityExtensions\Controller\MelisPluginRendererOverride` | `get-plugin` | Overrides the MelisFront plugin renderer route (`/melispluginrenderer`) so AI-generated mini-template content renders correctly. |
| `MelisAICommunityExtensions\Controller\Base` | — | Shared base controller (service-manager helpers, TinyMCE config access). |

Backoffice integration points declared in `app.interface.php`:

- `melisaicommunity_extension_generate_news_text_modal` (melisKey, icon `cogwheel`) — forwards to
  `News/render-ai-chat`.
- A `jscallback` `addNewsGenerateAIBtn()` injected under the MelisCmsNews paragraph fields.
- A `jscallback` `addMinitplCreatorGenerateAIBtn()` injected into the MelisCMS Mini Template Manager
  add form.

Event listeners (attached in `src/Module.php`, all extending `MelisGeneralListener`):

| Listener | Hooked event | Role |
| --- | --- | --- |
| `...CreateMiniTemplateListener` | `meliscms_mini_template_manager_create_end` | Persists AI-generated mini-template assets when a template is created. |
| `...DeleteMiniTemplateAssetsListener` | `meliscms_mini_template_manager_delete_end` | Cleans up the AI CSS/JS for a deleted mini-template. |
| `...PublishPageListener` | `meliscms_page_publish_start` | Promotes AI-generated assets when a page is published. |
| `...SanitizeSavedPluginHtmlListener` | `meliscms_page_savesession_plugin_start` | Sanitises AI HTML before it is saved into page content. |
| `...AttachAIGeneratedCssListener` | render (front + back) | Appends AI-generated CSS to the page. |
| `...InjectDndAiButtonListener` | render / dnd-layout | Injects the "Generate with AI" button into drag-and-drop zones. |
| `...TinyMCEConfigurationListener` | backoffice bootstrap | Extends the TinyMCE configuration used by the mini-template editor. |

## Front office

The module overrides the `melis-plugin-renderer` route (`/melispluginrenderer`) with
`MelisPluginRendererOverride::getPlugin` so mini-templates authored through AI render through the
front engine. AI-generated CSS is attached at render time by
`MelisAICommunityExtensionsAttachAIGeneratedCssListener`. It exposes no drag-and-drop templating
plugin of its own — see [Plugins](/guide/plugins).

## MCP server

`config/mcp.tools.php` registers a stdio MCP server (`minitemplate_creator`, entry point
`mcp/minitemplatecreator/bin/server.php`) and merges four function declarations into the
`melisaiengine` config so the **minitemplatecreator** agent can call them:

| Tool | Role |
| --- | --- |
| `readSiteAssets` | Selects and reads a small set of relevant CSS/JS/view assets for a site module given a template request. |
| `getSitePublicUrl` | Resolves a site module's public URL/domain for visual context. |
| `uploadMinitemplateImages` | Saves attached images (data URL / base64 / HTTP URL) to the mini-template temp dir and returns a web path. |
| `renderMinitemplatePreview` | Triggers a visual preview of the mini-template being authored. |

See [MCP](/guide/mcp).

## Database tables

This module creates **no `melis_*` tables of its own**. Its `install/dbdeploy/` deltas only insert
and update **agent/instance/scenario** rows in the tables owned by `melis-ai`
(`melis_ai_agents`, `melis_ai_instances`, `melis_ai_instance_trans`, `melis_ai_scenario_steps`,
`melis_ai_scenario_steps_datas`, `melis_ai_scenario_steps_datas_entryexit`, `melis_ai_files`),
seeding the `newscontentcreator` and `minitemplatecreator` agents. At runtime it reads MelisCmsNews
data via `melis_cms_news` / `melis_cms_site`.

## Example

Render the **newscontentcreator** chat so the agent writes back into a specific news paragraph
field (the pattern used by `NewsController::renderAiChatAction`):

```php
// mai_instance_id is suffixed with |{newsId} to isolate the session per article
$view->maiInstanceId = 'newscontentcreator|' . $newsId;

// exitParamArr tells the agent where to return its answer in the UI
$view->exitParamArr = [
    'masse_exit_input_1'     => $paragraphField,                    // e.g. 'news_paragraph_1'
    'masse_exit_js_callback' => "setParagraphContent($paragraphField)",
];

// extraEntryParam seeds the prompt and optional image context
$view->extraEntryParam = [
    'custom_text'  => 'Generate content for paragraph 1 of the news',
    'custom_files' => $images,   // local paths or public URLs
];
```

The view renders the chat with the Melis AI Engine helper:

```php
<?= $this->AIChatViewHelper(
    'newscontentcreator|' . $newsId,
    null,
    $this->extraEntryParam,
    false,
    $this->exitParamArr
) ?>
```

## Key files

| Concern | Path |
| --- | --- |
| Module config (routes, controllers, table alias, view helper) | `vendor/melisplatform/melis-ai-community-extensions/config/module.config.php` |
| Backoffice integration points (modals, jscallbacks) | `vendor/melisplatform/melis-ai-community-extensions/config/app.interface.php` |
| MCP server + function declarations | `vendor/melisplatform/melis-ai-community-extensions/config/mcp.tools.php` |
| News AI controller | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` |
| Mini-template AI controller | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/MiniTemplateController.php` |
| Plugin-renderer override | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/MelisPluginRendererOverrideController.php` |
| Listeners | `vendor/melisplatform/melis-ai-community-extensions/src/Listener/` |
| "Generate with AI" button helper | `vendor/melisplatform/melis-ai-community-extensions/src/View/Helper/MelisGenerateWithAIBtnHelper.php` |
| News table gateway | `vendor/melisplatform/melis-ai-community-extensions/src/Model/Tables/NewsTable.php` |
| MCP implementation | `vendor/melisplatform/melis-ai-community-extensions/mcp/minitemplatecreator/` |
| Install deltas (seed agents) | `vendor/melisplatform/melis-ai-community-extensions/install/dbdeploy/` |
