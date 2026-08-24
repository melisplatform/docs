# MelisAI

> واجهة إدارة خلفية بلغة React لمجموعة MelisAI — اربط المزوّدين، صمّم الوكلاء، انشر النُسخ، راقب الاستخدام، افحص خوادم MCP، ودردش من أي مكان. الحزمة `melisplatform/melis-ai`.

## الغرض

يُمثّل MelisAI **طبقة الإدارة الخلفية** لمجموعة MelisAI. وهو لا يشغّل نماذج الذكاء الاصطناعي بنفسه — فتلك مهمة `melis-ai-engine` ووحدات المزوّدين التابعة له. بل يوفّر الواجهة والخدمات اللازمة لربط منظومة الذكاء الاصطناعي بأكملها: توصيل مزوّد (**Platform AI**)، وبناء السلوكيات (**AI Agents** بسيناريوهات وقوائم أدوات مسموح بها)، ونشرها بوصفها **Instances** مُسمّاة، ومراقبة **Usage**، وتصحيح الأخطاء عبر دردشة بحمولة خام (**Chat Dev Tool**)، وفحص **خوادم MCP** المتصلة.

في **الواجهة الخلفية بلغة React** (`/melis-react`) يأتي MelisAI بوصفه **حزمة واحدة متعددة القوالب (bricks)** تُتيح ثلاث أدوات قائمة أصلية بلغة React — **Admin** و**AI Agents** و**MCP Inspector** — لكلٍّ منها مفتاح تبديل **New / Old** إلى أداتها القديمة داخل iframe، **بالإضافة إلى طبقة مساعد ذكاء اصطناعي عامة (AI Assistant overlay)** (زر دردشة عائم على كل شاشة، دون مدخل في القائمة). يبقى منطق الذكاء الاصطناعي على جانب الخادم في `melis-ai-engine`.

## تفعيله

أضِف إلى `config/melis.module.load.php` (يجب إدراج وحدات المزوّدين قبل `MelisAI`):

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',   // Anthropic provider
    'MelisAIEngineGemini',   // Google provider
    'MelisAI',
];
```

يتطلّب `MelisAI` الوحدة `melisplatform/melis-ai-engine`، التي تملك جميع جداول قاعدة البيانات `melis_ai_*` وزمن تشغيل الوكلاء/السيناريوهات. أمّا وحدات المزوّدين (`melis-ai-engine-claude` و`melis-ai-engine-gemini` و`-ollama` و`-oci`) فتُنفّذ عقد المزوّد ويجب تثبيتها للشركات المعنية.

## الأسماء الأساسية الأربعة

| الاسم | الجدول | العمود المفتاح | الوصف |
| --- | --- | --- | --- |
| **model** | `melis_ai_models` (`mam_*`) | `mam_generative_model` | سطر نموذج مزوّد: الشركة (Anthropic / Google)، سلسلة النموذج، رابط مفتاح API، علامة الافتراضي، إعدادات رفع الملفات. |
| **agent** | `melis_ai_agents` (`maa_*`) | `maa_agent_tools` (قائمة سماح بصيغة JSON) | سلوك: الاسم، رمز الوكيل، تجاوز اختياري للنموذج، خطوات سيناريو مُرتّبة، قائمة سماح بالأدوات. |
| **instance** | `melis_ai_instances` (`mai_*`) | `mai_instance_id` | نشر مُسمّى لوكيل. سلسلة `mai_instance_id` هي المفتاح الثابت الذي تشير إليه كل الواجهات (مثل `mainchatassistantgeneral` و`aitoolcreator`). |
| **tool** | `melis_ai_tools` (`mat_*`) | — | دالّة قابلة للاستدعاء يمكن للنموذج استحضارها. إمّا **MCP** (خادم MCP خارجي، `mcp: true`) أو **Local** (PHP مدمج). |

**نموذج ذهني في جملة واحدة:** تشير النُسخة (instance) إلى وكيل، ويشير الوكيل إلى نموذج، ويُسمّي النموذج شركةً — وهذا يحدّد المزوّد؛ وتشغّل الدردشةُ على النُسخة سيناريوَ الوكيل، مُستدعيةً الأدوات المسموح بها للوكيل.

## أين يوجد في الواجهة الخلفية بلغة React

يأتي MelisAI بحزمة قوالب (brick) **واحدة** (`public/ui-react/brick.js`) يُعلن بيانها الوصفي عن مصفوفة `bricks: [...]` — أربعة تسجيلات ذاتية التسجيل في `brick.tsx`:

| معرّف القالب (Brick id) | المسار | melisKey | النوع |
| --- | --- | --- | --- |
| `ai-admin` | `/melis-ai/admin` | `melisadmin_tool` | هيكل تبويبات أصلي بلغة React (Usage / Platform AI / Instances / MCP Server / Chat dev tool) |
| `ai-agents` | `/melis-ai/ai-agents` | `melisagent_tool` | قائمة + محرّر أصلي بلغة React (تبويبات فرعية) |
| `mcp-inspector` | `/melis-ai/mcp-inspector` | `melis_mcp_inspector_tool` | أصلي بلغة React (دالّة واحدة) |
| `ai-assistant` | *(لا شيء)* | — | **طبقة (Overlay)** — زر الدردشة العائم العام (FAB)، دون مسار ودون مدخل في القائمة |

تظهر الأدوات الثلاث ذات المسارات في القائمة اليسرى تحت **Melis AI** (إلى جانب **AI Tool Creator**، الذي تُسهم به الوحدة المنفصلة `melis-ai-tool-creator`). أمّا المساعد فيُرسَم مرّة واحدة في جذر الهيكل بحيث تبقى الدردشة العائمة عبر التنقّل. ولا تظهر جميعها إلّا عندما يكون MelisAI نشطًا (اكتشاف القوالب عبر `GET /melis/react-api/react-modules`). وتحمل كل أداة قائمة مفتاح تبديل **New / Old**: **New** = واجهة React، و**Old** = الأداة الكلاسيكية داخل iframe.

![قسم Melis AI في الشريط الجانبي بلغة React — Admin وAI Agents وMCP Inspector وAI Tool Creator](/screenshots/react/melis-ai/melisai-menu-section-melisai.png)

## Admin — تهيئة الذكاء الاصطناعي

المسار `/melis-ai/admin`. هيكل تبويبات أصلي بلغة React — **Usage · Platform AI · Instances · MCP Server · Chat dev tool** — بزرّ حفظ واحد (يحفظ التبويب النشط) ومفتاح تبديل New/Old للأداة بأكملها.

- **Usage** — التصفية حسب Company/Model ضمن نطاق؛ أربعة رسوم بيانية: Total Queries وQueries per Instance وTotal Tokens وTokens per Instance (سلاسل «لكل نُسخة» هي نُسخك المنشورة). مدعومة بجدول `melis_ai_daily_usage`.

![تبويب Admin ← Usage — مرشّحات Company/Model وأربعة رسوم بيانية (الاستعلامات والرموز، الإجمالي ولكل نُسخة) ضمن نطاق قابل للاختيار](/screenshots/react/melis-ai/melisai-tool-admin-tab-usage.png)

- **Platform AI** — تشغيل الذكاء الاصطناعي: اختر Company + Model، ثم اختر *Same key for all platforms* أو *One key per platform*، والصق المفتاح (المفاتيح)، واضبط **Status: Active** + **Default model: Yes**. بالإضافة إلى **Upload management** — مفاتيح تبديل ملفات المستخدم/السياق و**Upload mode: File API vs Embed in request** (وهو الوضع `mam_file_upload_mode` الذي يقرأه المزوّدون؛ يستخدم Gemini افتراضيًا File API، ويستخدم Claude التضمين) والحد الأقصى لحجم الملف.

![تبويب Admin ← Platform AI — الشركة/النموذج/المفاتيح على اليسار، ومفاتيح Status + Default وإدارة رفع الملفات (File API vs Embed in request، والحجم الأقصى) على اليمين](/screenshots/react/melis-ai/melisai-tool-admin-tab-platformai.png)

- **Instances** — بطاقات مؤشرات أداء (Total / Active / Inactive)، وبحث، ومرشّحات، و**+ New instance**. تأتي ست نُسخ جاهزة: ثلاث نُسخ **نظامية** (قابلة للتحرير فقط، دون حذف: `admintool` و`agenttool` و`mainchatassistantgeneral`) وثلاث نُسخ **تطبيقية** (قابلة للحذف: `aitoolcreator` و`minitemplatecreator` و`newscontentcreator`). يفتح التحريرُ نموذجًا في تبويب فرعي: **Name** و**Instance ID** (أي `mai_instance_id`) و**Status** و**Agent** (اختياري) و**Label** لكل لغة.

![تبويب Admin ← Instances — بطاقات مؤشرات الأداء، والبحث + المرشّحات، والنُسخ الست الجاهزة (نظامية + تطبيقية) مع اسمها ومعرّفها والوكيل المرتبط بها](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances.png)

![Admin ← Instances — نموذج التحرير: Name وInstance ID وStatus وAgent والترجمات لكل لغة](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances-edit.png)

- **MCP Server** — تبويبان فرعيان: **MCP Exposition** (تحديد دوال MCP التي يُتيحها خادم MCP للعملاء) وتبويب **DB / sensitive tables**؛ لكلٍّ منهما زر حفظ خاص به.
- **Chat Dev Tool** — دردشة لتصحيح الأخطاء: اختر وكيلًا، ودردش، واقرأ **raw AI PAYLOAD** بالضبط (`tools` / `functionDeclarations`، السياق) و**AI RESPONSE** بصيغة JSON جنبًا إلى جنب.

![Admin ← Chat Dev Tool — اختر وكيلًا، ودردش على اليسار، واقرأ حمولة الذكاء الاصطناعي الخام (functionDeclarations وtools والسياق) على اليمين](/screenshots/react/melis-ai/melisai-tool-admin-tab-chatdevtool.png)

## AI Agents — تصميم السلوك

المسار `/melis-ai/ai-agents`. تعرض القائمة **ID / Status / Name / Entries / Call number** (Entries = خطوات السيناريو، Call number = إجمالي استدعاءات الذكاء الاصطناعي طوال العمر) مع بطاقات مؤشرات الأداء والبحث والمرشّحات وExport. يُضيف فتحُ وكيلٍ تبويبًا فرعيًا فيه محرّر بخمسة تبويبات وزر حفظ واحد.

![قائمة AI Agents — بطاقات مؤشرات الأداء، والبحث/المرشّحات، والوكلاء الجاهزون (Tool Builder وMini-template Creator وNews Content Creator وMain Chat Assistant) مع عدد الخطوات وعدد الاستدعاءات](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents.png)

| التبويب | الغرض |
| --- | --- |
| **Config** | اسم الوكيل، ورمز الوكيل (slug ثابت)، والوصف، و**Override default AI model** (Company + Model)، ومفاتيح رفع الملفات، ومفتاح Active. |
| **AI Tools** | قائمة سماح القدرات — حدّد الأدوات التي يجوز لهذا الوكيل استدعاؤها، مُجمّعةً في **MCP tools** (تُقدّمها خوادم MCP) و**Local tools** (PHP مدمج). يُقدّم المحرّك للنموذج الأدوات المُحدّدة تحديدًا. |
| **DB Rights** | مربّعات اختيار **read / write / delete row / drop** لكل جدول، مُجمّعة حسب الوحدة، ومفتاح عام **Allow table creation**، ومعالجة الجداول الحسّاسة، والبحث، وتوسيع/طيّ الكل. |
| **Scenario** | خطوات مُصنّفة ومُرتّبة مع السحب لإعادة الترتيب والتحرير/الحذف لكل سطر: `ENTRY PARAMS` ← `AI CONTEXT` (صامت) ← `AI CHAT` (ظاهر) ← `EXIT PARAMS`، بالإضافة إلى خطوات `CODE` اختيارية. لكل خطوة **Code** تشير إليه عبر `[CODE]` لسحب إجابة خطوة سابقة. يفتح تحريرُ خطوةٍ نافذةً منبثقة (Code وReturn type وType of entry وAI Prompt بمحرّر عام + تجاوزات لكل لغة). |
| **Run** | دردشة اختبار في المكان مع الوكيل (مع *Custom step end prompt* اختياري)، تُشغّل الدردشة الأصلية نفسها التي يشغّلها المساعد. |

![محرّر الوكيل ← تبويب Config — Status واسم/رمز/وصف الوكيل، وتجاوز النموذج (company + model)، ومفاتيح رفع الملفات](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-config.png)

![محرّر الوكيل ← تبويب AI Tools — قائمة تحقّق بأدوات MCP والأدوات المحلية؛ يعرض العنوان عدد المُحدَّد من الكتالوج](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-aitools.png)

![محرّر الوكيل ← تبويب DB Rights — مربّعات اختيار read/write/delete/drop لكل جدول مُجمّعة حسب الوحدة، والمفتاح العام "Allow table creation" ومعالجة الجداول الحسّاسة](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-dbrights.png)

![محرّر الوكيل ← تبويب Scenario — خطوات مُصنّفة ومُرتّبة (ENTRY PARAMS وAI CONTEXT وCODE وAI CHAT وEXIT PARAMS) مع السحب لإعادة الترتيب والتحرير/الحذف لكل سطر](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario.png)

![محرّر الوكيل ← نافذة تحرير الخطوة — Code وReturn type وType of entry، وAI Prompt بتبويبات General + لكل لغة](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario-editstep.png)

![محرّر الوكيل ← تبويب Run — دردشة اختبار في المكان مع مربّع "Custom step end prompt" وRelaunch، تُشغّل الوكيل مباشرةً](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-run.png)

### كتالوج الأدوات الجاهز

| المجموعة | الأدوات |
| --- | --- |
| **MCP — DB schema/data** | `getTableStructure`، `createDatabaseTable`، `addDBTableColumns`، `updateDBTableColumns`، `dropDBTableColumns`، `selectData`، `insertData`، `updateData`، `deleteData`، `bulkInsertData` |
| **MCP — filesystem** | `createFile`، `createDirectory`، `pathExists`، `readFile`، `updateFiles`، `deleteFile`، `deleteDirectory` |
| **MCP — site/mini-template** (CommunityExtensions) | `readSiteAssets`، `getSitePublicUrl`، `uploadMinitemplateImages`، `renderMinitemplatePreview` |
| **MCP — module builder** (ToolCreator) | `createModule`، `activateModule`، `deactivateModule`، `generateBundle` |
| **Local** | `activate_module` |

## MCP Inspector

المسار `/melis-ai/mcp-inspector`. صفحة أصلية بلغة React (بمفتاح تبديل New/Old) تسرد **خوادم MCP** المتصلة وتتيح لك تشغيلها / فحص حالتها / قراءة سجلّاتها — لتأكيد أنّ الخادم يعمل وأنّ أدواته قابلة للاكتشاف قبل السماح بها على وكيل. مدعومة بخدمة المحرّك `MelisAIEngineMcpService`.

## AI Assistant — الدردشة من أي مكان

يفتح زر **AI Assistant** العائم (أسفل اليمين، على كل شاشة) لوحة دردشة تُشغّل **Main Chat Assistant** العام (معرّف الوكيل `1`، النُسخة `mainchatassistantgeneral`). ويمكنه قيادة الواجهة الخلفية (فتح أداة، فتح صفحة) من المحادثة، ويُرسَل ذلك على جانب المضيف عبر `window.melisReactActionMap`. يحافظ التصغير (Minimise) على الجلسة، وتبدأ New session جلسةً جديدة، وينهيها Close.

![زر AI Assistant العائم العام (أسفل يمين الهيكل) — أيقونة روبوت موسومة بشعار MelisAi "M" المتدرّج](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant.png)

![لوحة AI Assistant وقد فُتحت — "Main Chat Assistant" العام يُشغّل النُسخة `mainchatassistantgeneral`، مع Minimise / New session / Close في الترويسة](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)

## React API — نقاط النهاية

لا يوجد **`config/react-api.php`**: تُعلَن مسارات react-api **مباشرةً داخل `config/module.config.php`**، مُطعّمةً على المسار الأصل `melis-react-api` (بادئة `/melis/react-api`). وتوجد المتحكّمات في `src/Controller/React/MelisReactApiAi*Controller.php`. العقد في كل مكان: `{ success, data }` عند النجاح، و`{ success:false, error }` عند الفشل؛ ويرسل كل fetch الترويسة `X-Requested-With: XMLHttpRequest` + بيانات الاعتماد.

يبني كل متحكّم حارس الوصول الخاص به (وليس السمة العامة):

```php
private const MELIS_KEY = 'melisadmin_tool'; // or melisagent_tool / melis_mcp_inspector_tool
if ($deny = $this->denyUnlessAccess()) { return $deny; }
//   → 401 if !isAuthenticated() ; else 403 unless MelisCoreRights::canAccess(self::MELIS_KEY)
```

| السطح (الحارس) | نقاط النهاية التمثيلية (`/melis/react-api/…`) |
| --- | --- |
| **Admin** (`melisadmin_tool`) | `ai-usage/bootstrap` · `ai-usage/charts` · `ai-platform/data` · `ai-instances/{bootstrap,stats,list,save,:id,delete/:id}` · `ai-mcp-server/{data,save-tools,save-sensitive}` · `ai-chat-dev/{agents,run,continue}` |
| **AI Agents** (`melisagent_tool`) | `agents` (list) · `agents/{stats,options,:id,save,delete/:id,db-rights/:id}` · `agents/scenario/{list,options,step/:id,…}` |
| **MCP Inspector** (`melis_mcp_inspector_tool`) | `mcp-inspector/{servers,launch,status,log}` |

تُعيد **عمليات الكتابة** في السيناريو استخدام نقاط النهاية القديمة `/melis/MelisAI/AgentProperties/*` (الحذف / إعادة الترتيب / الحفظ) بحيث يبقى كل ما يخصّ التحقّق ومعالجة الملفات وتفرّد الرموز على جانب الخادم. مثال (من `agent-api.ts`):

```ts
const BASE = '/melis/react-api/agents'
await apiFetch<{ id: number }>(`${BASE}/save`, {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'same-origin',
  body: JSON.stringify({
    id: 4, name: 'Tool Builder', code: 'aitoolcreator', modelId: null, status: 1,
    dbCanCreateTable: 1, tools: ['createModule', 'activateModule'],
    dbRights: { melis_cms_page: { read: true, write: false, delete_row: false, drop: false } },
  }),
})
```

## القدرات (الحقوق المتقدّمة)

مُعلَنة في `config/react.capabilities.php` تحت `melisReactToolCapabilities`، مُفهرسة بحسب `melisKey` الحامل للحقوق لكل أداة. **السماح بالافتراض، تعريفية فقط**: فهي تُحرّك مربّعات الاختيار في **Users → Rights** وتتحكّم في أي تبويبات/إجراءات React تظهر (`useCaps(melisKey).can(cap)`)؛ وهي **غير مُطبَّقة على جانب الخادم** (تتحكّم المتحكّمات في الوصول إلى الأداة فقط عبر `canAccess`).

- `melisadmin_tool` — دقّة على مستوى **التبويب** (`usage` و`platform_ai.edit` و`instances` + `create/edit/delete` و`chat_dev` و`mcp_server` مع `tools.edit` / `db.edit` المتداخلين).
- `melisagent_tool` — عمليات CRUD على مستوى الأداة (`list/create/edit/delete`) بالإضافة إلى تبويبات المحرّر (`general` و`tools` و`dbrights` و`scenario` + CRUD و`run`).
- `melis_mcp_inspector_tool` — لا يُعلن شيئًا؛ الوصول هو مربّع اختيار الوصول الوحيد لأداة القائمة.

## اعتمادية واجهة الدردشة

يُصيّر كل سطح دردشة (طبقة المساعد، وتبويب **Run** للوكيل، و**Chat Dev Tool** في Admin) المكوّن `<AiChatContainer>` المستورد من **`@melis-ai-engine`** — وهو اسم مستعار في Vite لـ `../../melis-ai-engine/ui-react/src`، لذا **يُحزَّم مكوّن الدردشة من مصادر melis-ai-engine** داخل هذا القالب (وليس مُصدَّرًا خارجيًا). الخصائص الرئيسية: `maiInstanceId` و`agentId` و`autoRun` و`showHeader` و`clearSession` و`extraEntryParams`.

للمطوّرين الذين يُدمجون صندوق دردشة في واجهة **قديمة / مُصيّرة على الخادم**، لا يزال `melis-ai-engine` يوفّر مساعد العرض `AIChatViewHelper($maiInstanceId, …)` — راجع [صفحة MelisAI القديمة](/legacy/reference/modules/melis-ai) و[melis-ai-engine](/legacy/reference/modules/melis-ai-engine).

## تدفّق الدردشة (ماذا يحدث عند الإرسال)

1. يُرسل سطح الدردشة أدوار المستخدم إلى المحرّك لأجل `mai_instance_id` المعطى.
2. تحلّ `MelisAIEngineAgentService::runAgent()` **instance ← agent ← model**، ثم تختار المزوّد عبر `getActiveModelClass($company, $modelId, $agentId)` (الشركة `Google` ← Gemini، و`Anthropic` ← Claude).
3. يمرّ المحرّك على **خطوات سيناريو** الوكيل بالترتيب؛ وتستدعي `MelisAIEngineModelService::send()` واجهة API للذكاء الاصطناعي؛ وتُوجَّه استدعاءات الأدوات عبر `MelisAIEngineMcpService` (JSON-RPC لأدوات MCP، واستدعاء PHP مباشر للأدوات المحلية).
4. تُحفَظ الحالة في `melis_ai_conversation_state`؛ وعدّادات الرموز/الاستدعاءات في `melis_ai_daily_usage`.

**MelisAI لا يستدعي واجهات API للذكاء الاصطناعي بنفسه — بل يفعل ذلك المحرّك ووحدات المزوّدين.**

## نمط الامتداد (كيف تندمج وحدات التطبيقات)

1. تُدرِج **dbdeploy** **وكيلًا** (بسيناريو + قائمة سماح بالأدوات) و**نُسخة** بـ `mai_instance_id` ثابت.
2. سجّل **خادم MCP** تحت `config['mcp']['servers']` وأعلن أدواته في `function_declarations` مع `mcp: true`.
3. أضِف مدخل واجهة يفتح دردشة على `<mai_instance_id>` بمعاملات الدخول/الخروج الصحيحة.

## جداول قاعدة البيانات

لا يملك MelisAI أي مخطّط خاص به — فكل الجداول يُثبّتها `melis-ai-engine`. البادئة هي `melis_ai_*`.

| الجدول | يحتوي على |
| --- | --- |
| `melis_ai_models` (`mam_*`) | أسطر نماذج المزوّدين (الشركة، سلسلة النموذج، رابط مفتاح API، إعدادات رفع الملفات). |
| `melis_ai_companies` (`macp_*`) | تعريفات الشركات (Google وAnthropic و…). |
| `melis_ai_platform_keys` (`mapk_*`) | مفاتيح API للمزوّدين. |
| `melis_ai_agents` (`maa_*`) | تعريفات الوكلاء (الرمز، تجاوز النموذج، قائمة السماح `maa_agent_tools` بصيغة JSON). |
| `melis_ai_agents_tools` (`maat_*`) | ربط الوكيل بالأداة. |
| `melis_ai_tools` (`mat_*`) | كتالوج الأدوات (MCP / Local). |
| `melis_ai_instances` (`mai_*`) | النشرات المُسمّاة (`mai_instance_id` ثابت). |
| `melis_ai_instance_trans` (`mait_*`) | تسميات النُسخ لكل لغة. |
| `melis_ai_scenario_steps` (`mas_*`) | خطوات سيناريو مُرتّبة لكل وكيل. |
| `melis_ai_scenario_steps_datas` (`massd_*`) | بيانات الخطوة (نص السياق، مسار النموذج، …). |
| `melis_ai_scenario_steps_datas_entryexit` (`masse_*`) | تعريفات معاملات الدخول/الخروج لكل خطوة. |
| `melis_ai_return_types` (`mart_*`) | تعريفات نوع الإرجاع عند الخروج. |
| `melis_ai_files` (`maf_*`) | الملفات المرفقة بخطوات السيناريو. |
| `melis_ai_daily_usage` (`mau_*`) | عدّادات استخدام الرموز والاستعلامات. |
| `melis_ai_conversation_state` (`macs_*`) | حالة المحادثة لكل مستخدم. |

راجع أيضًا: [melis-ai-engine](/legacy/reference/modules/melis-ai-engine) · [melis-ai-engine-claude](/legacy/reference/modules/melis-ai-engine-claude) · [melis-ai-engine-gemini](/legacy/reference/modules/melis-ai-engine-gemini) · [melis-ai-tool-creator](/legacy/reference/modules/melis-ai-tool-creator) · [melis-ai-community-extensions](/legacy/reference/modules/melis-ai-community-extensions)
