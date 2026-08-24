# MelisAICommunityExtensions

> 将 AI 生成能力注入现有的 CMS 编辑界面——迷你模板创建器、新闻内容创建器以及拖放区域的 AI 按钮。在 React 后台中，它以扩展（宿主注入）brick 的形式提供，本身没有独立页面。软件包为 `melisplatform/melis-ai-community-extensions`。

## 用途

MelisAICommunityExtensions 是构建在 MelisAI 套件之上的应用层，它将 AI 生成能力直接接入现有的编辑界面。它注册了两个预配置实例（`minitemplatecreator` 和 `newscontentcreator`）、一套 MCP 工具集，以及一组用于管理 AI 生成的前端资源（CSS、JS、图片）生命周期的事件监听器。它**没有独立的工具页面**；而是将 **Generate with AI**（使用 AI 生成）按钮和聊天弹窗注入到迷你模板管理器、新闻编辑器和页面拖放区域中。AI 聊天本身由 MelisAI / MelisAIEngine 提供——本模块仅提供周边 UI 和进入/退出的接线逻辑。

## 启用它

添加到 `config/melis.module.load.php`：

```php
return [
    'MelisAICommunityExtensions',
];
```

依赖 `melisplatform/melis-ai`。启用后请运行 dbdeploy——该模块会将 `minitemplatecreator` 和 `newscontentcreator` 的 agent/instance 记录种入 MelisAI 引擎的数据表（`dbdeploy: true`）。它与 MelisCms 和 MelisCmsNews 集成。

## 它在 React 后台中的位置

该 React brick 是一个**扩展 / 宿主注入 brick**：它不绘制任何页面，也不添加任何侧边栏条目。加载时，它在 `window` 上注册**两个宿主扩展点**，供其他模块的 React 页面调用以内联渲染 *Generate with AI* 按钮；此外还注册一个始终挂载的 `Header` 组件（`MiniTemplateAiDialogHost`），用于将页面编辑对话框锚定在旧版编辑框架之上。

由于它没有路由，因此没有可导航到的目标——你会在*其他工具内部*遇到它：

- **新闻编辑器**（MelisCmsNews）→ **Texts** 选项卡 → 每个段落的按钮。
- **迷你模板管理器**（MelisCms）→ *Template's HTML* 字段 → 按钮。
- **页面编辑**（MelisCms 拖放）→ 区域 / HTML-tag 插件的按钮。

**由两个模块共同控制激活。** 只有当 `MelisAICommunityExtensions` 和 `MelisAI` **都**处于激活状态时，按钮才会出现（通过宿主的 `__melisIsModuleActive` 实时检查，其背后是 `GET /melis/react-api/react-modules`）。之所以需要 MelisAI，是因为它提供聊天服务；如果在会话中途禁用任一模块，按钮会在无需重新加载的情况下消失。该 brick **不贡献任何 capability 节点**——可见性完全由这两个模块的检查决定。

## 后台编辑界面

被扩展的编辑界面共有三个。在每个界面中，AI 按钮都会打开一个作用域受限的聊天，结果会被写回正确的字段。

### AI 迷你模板创建器

在迷你模板管理器中，*Template's HTML* 字段带有一个由 `renderHtmlActions()` 扩展点渲染的 **Generate with AI** 按钮。它会打开一个全窗口对话框：**左侧是 AI 聊天 + 现有模板列表，右侧是实时预览**（在较窄宽度下，这两个面板会折叠为分段式的 *AI & Templates / Preview* 选项卡）。聊天使用 `minitemplatecreator` 实例，每次打开时都会重新开始（`clearSession`），并在每次 AI 返回结果时重新拉取真实的站点外壳，以便反映新写入的 CSS/JS。

![迷你模板管理器，按站点列出的列表以及 Generate with AI 入口](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-list.png)

![minitemplatecreator 聊天正在生成模板，并针对真实站点外壳进行预览](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-createwithai.png)

模板列表中的每一行都显示一个 **Melis-AI 图标**：点击它可以以该模板为基准参考生成一个新模板（聊天会以所选模板的标记为种子重新运行）。**Insert**（插入）会捕获预览的 PNG 缩略图（html2canvas）并填充表单；表单自身的提交操作则将其保存。

![模板行上的 Melis-AI 图标——使用 AI 对现有模板进行变体或复制](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-duplicatewithai.png)

![Add mini-template 表单——HTML 字段旁的 Generate with AI](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-addminitpl.png)

### 新闻内容创建器

在**新闻**编辑器的 **Texts** 选项卡中，每个 **Paragraph**（段落）都会（按语言）获得一个由 `renderParagraphActions()` 扩展点渲染的 **Generate with AI** 按钮。它会打开一个紧凑的弹窗，其中是 `newscontentcreator` 聊天，**作用域限定为该文章**（以标题、副标题、其他段落以及文章图片作为种子）。返回的结果会替换该段落的文本并将其标记为已验证。会话通过 `newscontentcreator|<newsId>` 实例 id 按文章隔离。

![新闻 Texts 选项卡——每个段落的标题栏都带有 Generate with AI 操作](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-news-edit-tab-texts.png)

![newscontentcreator 聊天，感知文章上下文](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-news-edit-tab-texts-aicreator.png)

### 拖放区域中的 Generate with AI

编辑 CMS 页面时，空的**拖放区域**（以及 HTML-tag 插件）会被注入一个 **Generate with AI** 按钮。由于页面编辑是位于 React 外壳之下的旧版 iframe，该按钮会请求 React 宿主打开与上文*相同*的迷你模板对话框。接受后会提供三个提交选项：**Close**（关闭）、**Insert**（仅放入此区域），或 **Save & Insert**（放入并将该区块提升为永久可复用的迷你模板）。

![带有注入的 Generate with AI 按钮的空拖放区域](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-1.png)

![一个完整带样式的区块直接生成到页面区域中](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-2.png)

![针对生成区块的 Close / Insert / Save & Insert 提交选项](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-differentinserts.png)

## 该 brick

`ui-react/` 是一个 Vite IIFE 库（名称为 `MelisAiCommunityExtensionsBrick`，输出为 `public/ui-react/brick.js`）。React、react-dom 和 react-router-dom 被外部化到宿主全局变量；`@melis-ai-engine` 别名用于导入共享的 `AiChatContainer` 聊天组件。

| 文件 | 作用 |
| --- | --- |
| `src/brick.tsx` | 注册两个扩展点 + `Header`；一次性注入 Tailwind。 |
| `src/NewsAiExtension.tsx` | `renderParagraphActions()` → 每段落的按钮 + 弹窗（实例 `newscontentcreator`）。 |
| `src/MiniTemplateAiExtension.tsx` | `renderHtmlActions()` → 全窗口 `MiniTemplateAiDialog`（聊天 + 列表 + 预览；Insert / Save & Insert；html2canvas 缩略图）。 |
| `src/MiniTemplateAiDialogHost.tsx` | 用于**页面编辑**的 `Header` 锚点；监听 `melis-ai-minitemplate-open` 并挂载对话框。 |

该 brick 在注册时**没有 `Component`**、**也没有 `Sidebar`**——只有受保护的扩展点和 `Header` 锚点：

```ts
window.__melisNewsExtensions.renderParagraphActions = /* guarded by isModuleActive() */
window.__melisMiniTemplateExtensions.renderHtmlActions = /* guarded by isModuleActive() */
window.__melisRegisterBrick?.({ id: 'melis-ai-community-extensions', Header: MiniTemplateAiDialogHost })
```

## 该 brick 调用的端点

该 brick **没有 `config/react-api.php`**。它消费其他模块拥有的端点，外加一个自身的旧版 MVC action：

| 调用 | 拥有者 |
| --- | --- |
| `GET /melis/react-api/cms-mini-templates?site=<m>&limit=9999` | MelisCms（模板列表） |
| `GET /melis/react-api/cms-mini-templates/item?site=<m>&name=<n>` | MelisCms（单个模板的 HTML） |
| `GET /melis/MelisAICommunityExtensions/MiniTemplate/getMiniTemplatePreviewShell?siteModule=<m>` | 本模块（旧版 MVC；返回站点外壳 HTML） |
| `AiChatContainer` 运行/退出流量 | MelisAI / MelisAIEngine |

聊天返回的结果通过在退出参数（`masse_exit_js_callback`）中声明的 `window` 回调路由回宿主字段：新闻使用 `__melisNewsAiCallback_<paraIdx>`，迷你模板使用 `__melisMiniTemplateAiCallback`。

## 宿主集成（页面编辑桥接）

页面编辑运行在 React 外壳之下的多个框架中，因此 `MiniTemplateAiDialogHost` 会设置 `window.__melisAiMiniTemplateDialogReady = true` 并监听 `melis-ai-minitemplate-open` 事件。被编辑的页面运行 `public/js/minitemplate/react-bridge.js`，它会**沿着框架链向上**查找 `__melisAiMiniTemplateDialogReady`；找到后便派发打开事件，并附带同源的 `onInsert` / `onSaveInsert` 回调。如果找不到 React 宿主（旧版 `/melis`），桥接会回退到历史遗留的 Bootstrap 弹窗——那里的行为保持不变。

对于在 React **"Old"** 视图中显示的旧版工具，`config/module.config.php` 注册了 `melis_react_override.toolpage_extensions` → `PluginViewToolPageExtension`，它会注入本模块的 `tool.js` / `style.css`，使嫁接到 MelisCms / MelisCmsNews 工具上的 jsCallbacks 能够找到它们的全局变量。

## 事件监听器

| 监听器 | 事件 | 效果 |
| --- | --- | --- |
| `…TinyMCEConfigurationListener` | `meliscore_tinymce_config` | 将 TinyMCE 的 `minitemplate` 插件指向本模块的 JS。 |
| `…CreateMiniTemplateListener` | `meliscms_mini_template_manager_create_end` | 将临时的 CSS/JS/图片移动到永久存储；按模板重命名初始化 JS。 |
| `…PublishPageListener` | `meliscms_page_publish_start` | 提升已发布页面所引用的临时资源；更新 `page_content`。 |
| `…SanitizeSavedPluginHtmlListener` | `meliscms_page_savesession_plugin_start` | 在保存前清理 carousel/slider 的运行时标记（Owl/Slick/Swiper 残留物）。 |
| `…DeleteMiniTemplateAssetsListener` | `meliscms_mini_template_manager_delete_end` | 删除模板的 CSS/JS/图片。 |
| `…AttachAIGeneratedCssListener` | `MvcEvent::EVENT_FINISH`（前台 + 后台） | 将 AI 的 CSS/JS 注入到渲染的页面中。 |
| `…InjectDndAiButtonListener` | `MvcEvent::EVENT_FINISH` | 将 **Generate with AI** 按钮注入到旧版拖放区域中。 |

该模块还注册了一个 `MelisPluginRendererOverride`，以便在插件渲染期间正确注入 AI 资源。

## MCP 服务器

一个 stdio MCP 服务器 `minitemplate_creator`（入口点 `mcp/minitemplatecreator/bin/server.php`）注册在 `config['mcp']['servers']` 中。下列工具以 `mcp: true` 声明：

| 工具 | 参数 | 用途 |
| --- | --- | --- |
| `readSiteAssets` | `siteModule`、`templateRequest` | 返回站点相关的 CSS/JS/视图文件，以便 AI 匹配真实的设计。 |
| `getSitePublicUrl` | `siteModule` | 返回站点的公开 URL/域名，以便在生成前进行视觉检查。 |
| `uploadMinitemplateImages` | `siteModule`、`image`、`filename` | 将图片（base64/data-URL/HTTP）保存到 AI 临时目录下，并返回可用于 `<img src>` 的 web 路径。 |
| `renderMinitemplatePreview` | `siteModule` | 触发生成模板的编辑器预览。 |

`minitemplatecreator` agent 的允许列表中还包含引擎的文件系统工具（`createFile` / `readFile` / `updateFiles` / …）。在对话进行中，React 对话框会注册 `window.melisReactActionMap.preview_minitemplate`，以便当 `render_minitemplate_preview` 返回时，引擎能将生成的 `html` 区块推送到实时预览中。

## 数据库表

本模块不创建自己的数据表。它的 dbdeploy 增量会向 `melis-ai` 拥有的表中插入记录：

| 表 | 存放内容 |
| --- | --- |
| `melis_ai_instances` | 种入的 `minitemplatecreator` 和 `newscontentcreator` 实例。 |
| `melis_ai_agents` | 为这两个实例种入的 agent。 |

在运行时，新闻数据通过 `NewsTable`（`getNewsData($newsId)`）访问，它会联结站点表以解析放置生成图片所需的 `siteModule`。

## 关键文件

| 关注点 | 路径 |
| --- | --- |
| 模块配置（MVC 路由、toolpage_extensions） | `vendor/melisplatform/melis-ai-community-extensions/config/module.config.php` |
| brick 源码 | `vendor/melisplatform/melis-ai-community-extensions/ui-react/src/` |
| 构建后的 brick | `vendor/melisplatform/melis-ai-community-extensions/public/ui-react/{brick.js, brick.manifest.json}` |
| 页面编辑框架桥接 | `vendor/melisplatform/melis-ai-community-extensions/public/js/minitemplate/react-bridge.js` |
| MCP 工具声明 | `vendor/melisplatform/melis-ai-community-extensions/config/mcp.tools.php` |
| 迷你模板控制器 | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/MiniTemplateController.php` |
| 新闻控制器 | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` |
| "Old" 视图注入器 | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/React/PluginViewToolPageExtension.php` |
| 监听器 | `vendor/melisplatform/melis-ai-community-extensions/src/Listener/` |
| Generate-with-AI 按钮辅助类 | `vendor/melisplatform/melis-ai-community-extensions/src/View/Helper/MelisGenerateWithAIBtnHelper.php` |
| 新闻表网关 | `vendor/melisplatform/melis-ai-community-extensions/src/Model/Tables/NewsTable.php` |
| MCP 服务器入口点 | `vendor/melisplatform/melis-ai-community-extensions/mcp/minitemplatecreator/bin/server.php` |
| AI 资源目录 | `public/miniTemplatesTinyMce/AI/{siteModule}/{temp\|css\|js\|images}/` |
| 安装增量（种入 agent） | `vendor/melisplatform/melis-ai-community-extensions/install/dbdeploy/` |

另见：[MelisAIEngine](/zh/reference/modules/melis-ai-engine)、[MelisAI](/zh/reference/modules/melis-ai)、[MelisAIToolCreator](/zh/reference/modules/melis-ai-tool-creator)、[MelisCms](/zh/reference/modules/melis-cms)、[MelisCmsNews](/zh/reference/modules/melis-cms-news)
