# MelisAIEngine

> محرك الذكاء الاصطناعي المجرّد — عقد المزوّد، بيئة تشغيل الوكلاء/السيناريوهات، مخزن المحادثات، جسر MCP/الأدوات، جميع جداول قاعدة بيانات الذكاء الاصطناعي، ومكوّنات الدردشة المشتركة المبنية على React التي تشغّل الواجهة الخلفية للإصدار السادس (v6). الحزمة `melisplatform/melis-ai-engine`.

## الغرض

يُعدّ MelisAIEngine حجر الأساس في مجموعة MelisAI. فهو يعرّف عقد المزوّد المجرّد (`MelisAIEngineModelService`) الذي ينفّذه كلٌّ من Claude وGemini، ويشغّل الوكلاء عبر سير عمل سيناريوهات متعدّدة الخطوات، ويدير جسر MCP/استدعاء الأدوات، ويملك جميع جداول قاعدة البيانات `melis_ai_*`. وليست له **أداة مستقلّة** خاصّة به — فهو محرك الدردشة الخفيّ في الواجهة الخلفية. وفي الإصدار السادس (React) يشحن أيضًا مكوّن React المشترك **`AiChatContainer`** وواجهة الدردشة الخلفية `/melis/react-api/ai-engine/*` التي تركّبها وحدة `MelisAI` داخل أدواتها المرئية.

## تفعيله

أضِفه إلى `config/melis.module.load.php`:

```php
return [
    'MelisAIEngine',
];
```

اعتماديّات Composer المطلوبة: `melisplatform/melis-core` و`melisplatform/melis-document-upload`. يجب تثبيت وحدة مزوّد واحدة على الأقل (`MelisAIEngineClaude` أو `MelisAIEngineGemini`) لإجراء استدعاءات نماذج فعلية؛ ومن دون مزوّد نشط لشركة النموذج تُبلّغ الدردشة بالرسالة *"The AI company module is not active."*

## الخدمات الرئيسية

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `MelisAIEngineModelService` | عقد المزوّد المجرّد. اشتقّ منه لإضافة مزوّد ذكاء اصطناعي جديد (§ عقد المزوّد). |
| `MelisAIEngineService` | السجلّ/المصنع: `getActiveInstance()`، `getActiveAgent()`، `getActiveModel()`، `getActiveModelClass()` (اختيار المزوّد)، `getActiveAITools()`، `saveDailyUsage()`. |
| `MelisAIEngineAgentService` | بيئة تشغيل السيناريوهات: `runAgent($postValues, $files)` تجتاز خطوات الوكيل وتقود `MelisAIEngineModelService::send()`. |
| `MelisAIEngineMcpService` | جسر MCP/استدعاء الأدوات: إدارة الخوادم، الاتصال عبر JSON-RPC، قاطع الدارة، `getAvailableTools()`، `isMcpTool()`، `invokeTool()`، `formatToolsForAI()`، `getToolSchema()`. |
| `MelisAIEngineConversationStore` | حالة المحادثة المستمرّة متعدّدة الأدوار في `melis_ai_conversation_state`: `get()`، `has()`، `set()`، `delete()`. جمع تلقائي للمهملات بعد 48 ساعة. |
| `MelisAIEngineFunctionService` | تنفيذات الأدوات المدمجة (غير MCP)، مثل `get_table_structure` و`create_database_table`. |
| `MelisAIEngineFileService` | تنظيف الاحتفاظ بالمستندات المرفوعة عبر الذكاء الاصطناعي: `deleteAIDocUploads()`. |
| `MelisAIEngineGeneralService` | قاعدة مدركة للأحداث: `sendEvent()`، `makeArrayFromParameters()`. |

## عقد المزوّد

الصنف `MelisAIEngineModelService` (`src/Service/MelisAIEngineModelService.php`) هو الصنف المجرّد الذي يجب على كل مزوّد أن يمدّده. المُنشئ: `(ServiceManager $serviceManager, int $modelId, int $agentId)`.

**الدوال المجرّدة التي يجب على المزوّد تنفيذها:**

```php
abstract public function setClient();
abstract public function addToolsToPayload($payload);
abstract public function addContentToPayload($payload, $role, $prompt, $files=[], $content=[]);
abstract public function constructContent($role, $prompt, $files=[]);
abstract public function getMessageKey(): string;            // 'messages' (Claude) | 'contents' (Gemini)
abstract public function sendCustomAI(?array $payload = []): array;
abstract public function getAllowedMimetypes(): array;
abstract public function setPromptTokenCount($responseData);
abstract public function setResponseTokenCount($responseData);
abstract public function setTotalTokenCount($responseData);
abstract public function processFiles($filesArr): array;
abstract public function processContextFiles($filesArr): array;
```

دورة حياة الدالة الأساسية `send(array $contextArr): array` ثابتة: `addToolsToPayload()` ← `addContentToPayload()` لكل مُدخل سياق ← `sendCustomAI()` ← عدّ الرموز ← تُرجع `['request','responseData','result','errors','needs_continuation','session_id','continuation_context','tool_results']`.

**الدوال المساعدة التي يوفّرها الصنف الأساسي:** `getModel()`، `getAgentFunctions()`، `getToolDeclarationByName()`، دوال جلب الرموز، `uploadDocument()`، `extractTextFromDocx()`، `extractTextFromXlsx()`، `getMimeType()`.

## اختيار المزوّد

تختار الدالة `MelisAIEngineService::getActiveModelClass($company, $modelId, $agentId)` المزوّد بناءً على اسم شركة النموذج:

```php
if (strpos($company, 'Google') !== false) {
    // builds MelisAIEngineModelGeminiService — requires MelisAIEngineGemini module
} elseif (strpos($company, 'Anthropic') !== false) {
    // builds MelisAIEngineModelClaudeService — requires MelisAIEngineClaude module
}
```

لإضافة مزوّد جديد (مثل OpenAI): مدّد `MelisAIEngineModelService`، ونفّذ الدوال المجرّدة، وسجّله كخدمة، وأضِف فرعًا هنا مفتاحه اسم الشركة. يتبع مزوّدا Ollama وOCI العقد نفسه.

## نظام MCP / استدعاء الأدوات

تُعرَّف الأدوات في موضعين: `config['plugins']['melisaiengine']['datas']['function_declarations']` (الاسم، الوصف، مخطط JSON، القيمة المنطقية `mcp`) وجدول `melis_ai_tools`. ويختار الوكيل الاشتراك في الأدوات عبر `maa_agent_tools`.

عند وقت الاستدعاء: تُرجع `getAgentFunctions()` التصريحات المسموح بها ← تحقنها `addToolsToPayload()` ← وعند استدعاء أداة يوجّه المزوّد المسار عبر `MelisAIEngineMcpService::isMcpTool($name)`: تذهب أدوات MCP إلى `invokeTool()` (JSON-RPC عبر stdio، محميّة بقاطع الدارة)؛ وتذهب الأدوات المدمجة إلى `MelisAIEngineFunctionService`. تُعاد النتائج إلى النموذج وتستمرّ المحادثة حتى يشير النموذج إلى الاكتمال أو يُبلَغ حدّ الأمان.

تُهيَّأ خوادم MCP ضمن `config['mcp']['servers'][<name>]` = `{enabled, command, args, tools, timeout}`؛ وتشغّلها `MelisAIEngineMcpService` عبر `proc_open` وتتحدّث بروتوكول JSON-RPC 2.0 (`tools/list`، واستدعاء الأدوات).

## جداول قاعدة البيانات

جميع جداول `melis_ai_*` مملوكة لهذه الوحدة (`dbdeploy: true`):

| الجدول | يحتوي على |
| --- | --- |
| `melis_ai_models` | نماذج المزوّدين (الشركة، `mam_generative_model`، رابط مفتاح API). |
| `melis_ai_companies` | شركات الذكاء الاصطناعي (Google وAnthropic…). |
| `melis_ai_platform_keys` | مفاتيح API لكل منصّة. |
| `melis_ai_agents` | الوكلاء (`maa_name`، رابط النموذج، `maa_agent_tools` بصيغة JSON، مفاتيح تبديل الملفات). |
| `melis_ai_agents_tools` | إسناد الوكيل ↔ الأداة. |
| `melis_ai_tools` | فهرس الأدوات (`mat_name`، `mat_desc`، `mat_config` بصيغة JSON). |
| `melis_ai_instances` / `melis_ai_instance_trans` | عمليات النشر المسمّاة (النسخ) وترجماتها. |
| `melis_ai_scenario_steps` / `…_datas` / `…_datas_entryexit` | خطوات السيناريو وبياناتها ومعاملات الدخول/الخروج. |
| `melis_ai_return_types` | تعريفات أنواع الإرجاع للخطوات. |
| `melis_ai_files` | الملفات المرفقة بالخطوات/السياق. |
| `melis_ai_daily_usage` | عدد الرموز والاستدعاءات لكل نموذج/وكيل/نسخة/يوم. |
| `melis_ai_conversation_state` | حالة المحادثة المستمرّة (`macs_key`، JSON، جمع تلقائي للمهملات). |

## مكوّنات الدردشة المبنية على React

ليس لـ MelisAIEngine أي **brick** ولا أي مُدخل في قائمة `/melis-react`. وبالنسبة إلى الواجهة الخلفية المبنية على React فإنه يعرض مكتبة مكوّنات **بصيغة المصدر فقط** ضمن `ui-react/src/`، يستوردها المستهلكون عبر الاسم المستعار في Vite **`@melis-ai-engine`** (المربوط بـ `melis-ai-engine/ui-react/src`). وهو يعرض سطح الدردشة بأكمله؛ أمّا النموذج اللغوي الفعلي فيوفّره دائمًا مزوّد وحدة.

| التصدير | الدور |
| --- | --- |
| `AiChatContainer` (الافتراضي) | مكوّن التنسيق: يشغّل حلقة `init → run → (continue×N) → validate` بأكملها، ويحمل حالة الدردشة، ويربط المكوّنات الفرعية. **ركّب هذا.** |
| `ChatHistory`، `TypingIndicator`، `StepInterface` | قائمة الرسائل القابلة للتمرير (markdown عبر `window.marked` عند توفّرها)، ومؤشّر التفكير، وبطاقات واجهة كل خطوة. |
| `ChatFormBox` | شريط الإدخال السفلي: منطقة نصّية، إرسال/تحقّق، قائمة `+` ← رفع ملف (`user_file_upload[]`) أو مكتبة الوسائط (`userMediaFiles[]`، MoxieManager)، وطبقة السحب والإفلات. |
| `ChatDebugPanel`، `DebugEntry` | عرض التنقيح: حمولة الطلب (←) واستجابة النموذج الخام (←) بوصفها كتل JSON (فقط عند `debugMode`). |
| `MelisPlanPanel`، `extractMelisPlan`، `looksLikeMelisPlan` | يعرض "خطة Melis" منظَّمة مقترحة من الذكاء الاصطناعي (مثل قائمة حقول نموذج) بهيئة جدول. |
| `aiEngineInit/Run/Continue/Validate/Restart` | عميل مُنمَّط لنقاط النهاية `ai-engine` (§ واجهة الدردشة الخلفية). |
| `parseResultActionString`، `dispatchResultAction`، `dispatchToolResults` | موزّع تنقّل `JS_ACTION` بحلقة مغلقة (§ التنقّل بالحلقة المغلقة). |

**عقد التركيب — `AiChatContainerProps`:**

```tsx
type AiChatContainerProps = {
  maiInstanceId: string                        // required — e.g. "agenttool" or "newscontentcreator|42"
  agentId?: number | null                      // override the instance's default agent
  extraEntryParams?: Record<string, unknown>   // → extra_entry_param[key] context
  entryParamForm?: Record<string, string>      // → entry_param_form[key]
  debugMode?: boolean
  exitParamArr?: ExitParamArr
  showCloseButton?: boolean
  needExitParam?: boolean
  showHideButton?: boolean
  showHeader?: boolean
  clearSession?: boolean                        // clear the server session on init (fresh conversation)
  autoRun?: boolean                             // start the agent immediately after init
  initialMessage?: string                       // first user_chat when autoRun
  onClose?: () => void
  onHide?: () => void
  className?: string
  style?: React.CSSProperties
}
```

يحدّ المكوّن الحاوي عدد عمليات المتابعة عند `MAX_CONTINUATION_HOPS = 20`. ولإضافة دردشة ذكاء اصطناعي إلى أداة React، استورِد `AiChatContainer` وركّبه مع `maiInstanceId` — دون أي عمل على الواجهة الخلفية، فنقاط النهاية موجودة بالفعل. ويرفع المستهلكون قيمة `key` على العنصر المُركَّب لفرض جلسة خادم جديدة عند إعادة التشغيل.

## أين يظهر

لن ترى MelisAIEngine أبدًا كعنصر قائمة؛ فسطوح دردشته تظهر داخل وحدة **MelisAI**، التي تركّب المكوّن نفسه `AiChatContainer` في ثلاثة مواضع (يختلف فيها `maiInstanceId` / `agentId` فقط):

- **AI Assistant** — طبقة المساعد العائمة (دردشة عامة الغرض يمكنها التصرّف في الواجهة الخلفية، تُطلَق بـ `autoRun`).
- **Chat Dev Tool** — ساحة اختبار للمطوّرين لإطلاق أي وكيل/نسخة والتحدّث إليه.
- **علامة تبويب "Run" الخاصّة بالوكيل** — اختبار وكيل من أداة وكلاء MelisAI (`maiInstanceId="agenttool"`).

## واجهة الدردشة الخلفية — نقاط النهاية `ai-engine`

تُعرَّف المسارات في `config/module.config.php` (وليس في `react-api.php`)، والاسم المستعار للمتحكّم `MelisAIEngine\Controller\React\MelisReactApiAiEngine` ← `MelisReactApiAiEngineController`. ويحرس كلُّ إجراء نفسه بـ `denyUnlessAuthenticated()` (استجابة 401 من دون هوية MelisCore — دون بوّابة قدرات خاصّة بكل أداة، لأن هذا محرك مشترك). مظروف الاستجابة الموحّد: `{ success, data, error? }`. وتحاكي نقاط النهاية هذه المتحكّم القديم `AIController` (`/melis/MelisAIEngine/AI/*`) وتستدعي الخدمة نفسها `MelisAIEngineAgentService`.

| الطريقة والعنوان | دالة العميل | الغرض |
| --- | --- | --- |
| `GET /melis/react-api/ai-engine/init` | `aiEngineInit` | التحقّق من النسخة←الوكيل←النموذج←المزوّد؛ وإرجاع `label`، `finalInstanceId`، `agentId`، `isFileUploadActivated`، `isMediaLibraryActivated`، `hasExitParameter` (أو `errorType`/`errorMessage`). |
| `POST /melis/react-api/ai-engine/run` | `aiEngineRun` | بدء دور/تقدّمه. JSON للنصّ، وmultipart/form-data عند إرفاق ملفات ← `runAgent()`. |
| `POST /melis/react-api/ai-engine/continue` | `aiEngineContinue` | استئناف دور متعدّد الخطوات (`needs_continuation=true`) ← `continueConversation(sessionId, continuationContext)`. |
| `POST /melis/react-api/ai-engine/validate` | `aiEngineValidate` | قبول إجابة الذكاء الاصطناعي، والتقدّم إلى خطوة معامل الخروج، وإرجاع `exitParams` لدالة الاستدعاء الراجعة الخاصّة بالمضيف ← `validateAnswer()`. |
| `POST /melis/react-api/ai-engine/restart` | `aiEngineRestart` | مسح الجلسة، وإرجاع `finalInstanceId` نفسه جاهزًا لإعادة الاستخدام. |

تتضمّن `RunResult` الحقول `chatHist`، `needs_continuation`، `session_id`، `continuation_context`، `payload`/`response` (تنقيح)، `exitParams`، `tool_results`.

**أبسط دور نصّي:**

```ts
import { aiEngineInit, aiEngineRun } from '@melis-ai-engine'

const cfg = await aiEngineInit({ maiInstanceId: 'agenttool', clearSession: true })
if (cfg.errorType) throw new Error(cfg.errorMessage)   // instance/agent/model/companyModule/exitParam

const res = await aiEngineRun({
  agentId:    cfg.agentId,
  instanceId: cfg.finalInstanceId,
  userText:   'Create a news article about our new store',
})
// res.chatHist, res.needs_continuation, res.session_id, res.tool_results …
```

## التنقّل بالحلقة المغلقة

يقتصر عمل المحرك على **التوزيع**: يحلّل `nav-actions.ts` سلاسل الاستدعاء الراجعة `JS_ACTION::action::k=v&…` من `tool_results` الخاصّة باستجابة ما ويستدعي `window.melisReactActionMap[action](args)`. أمّا **الغلاف المضيف (melis-core)** فهو من *يسجّل* تلك المعالِجات ويملك تنقّل React-Router وإدراك DOM. وقد يُرجع المعالِج ملاحظة من النوع `Promise<string>`، تنتظرها `dispatchToolResults` وتعيد تغذيتها بوصفها `continuationContext.clientObservation` — ما يؤسّس لدور النموذج التالي. ويبقي هذا الحزمتين المبنيّتين بشكل مستقلّ منفصلتين: فلا يربطهما سوى عقد `window`.

## مثال (دالة مساعدة للعرض القديم)

لا تزال دالة المساعدة الكلاسيكية المعروضة من الخادم تعمل مع السياقات غير المبنية على React (`.phtml`):

```php
// Render the chat box for a named instance
echo $this->AIChatViewHelper($maiInstanceId);
```

سجّل خادم MCP مخصّصًا وصرّح بأدواته حتى يتمكّن وكيل من استدعائها:

```php
// In a module's config — register the MCP server
'mcp' => [
    'servers' => [
        'my-mcp-server' => [
            'enabled' => true,
            'command' => 'node',
            'args'    => ['/path/to/server.js'],
            'tools'   => ['my_tool'],
            'timeout' => 30,
        ],
    ],
],
// Declare the tool with mcp: true
'plugins' => [
    'melisaiengine' => [
        'datas' => [
            'function_declarations' => [
                [
                    'name'        => 'my_tool',
                    'description' => 'Does something useful',
                    'mcp'         => true,
                    // JSON schema for parameters…
                ],
            ],
        ],
    ],
],
```

## الملفات الرئيسية

| الشأن | المسار |
| --- | --- |
| عقد المزوّد (مجرّد) | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineModelService.php` |
| السجلّ + اختيار المزوّد | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| بيئة تشغيل الوكيل/السيناريو | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| جسر MCP/الأدوات | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| مخزن المحادثة المستمرّ | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineConversationStore.php` |
| الدوال المدمجة | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineFunctionService.php` |
| متحكّم الدردشة القديم | `vendor/melisplatform/melis-ai-engine/src/Controller/AIController.php` |
| واجهة الدردشة الخلفية المبنية على React | `vendor/melisplatform/melis-ai-engine/src/Controller/React/MelisReactApiAiEngineController.php` |
| مكتبة الدردشة المشتركة المبنية على React | `vendor/melisplatform/melis-ai-engine/ui-react/src/` (`AiChatContainer.tsx`، `api.ts`، `nav-actions.ts`…) |
| نماذج جداول قاعدة البيانات | `vendor/melisplatform/melis-ai-engine/src/Model/Tables/` |
| تهيئة الوحدة | `vendor/melisplatform/melis-ai-engine/config/module.config.php` |

انظر أيضًا: [MelisAI](/ar/reference/modules/melis-ai)، [MelisAIEngineClaude](/ar/reference/modules/melis-ai-engine-claude)، [MelisAIEngineGemini](/ar/reference/modules/melis-ai-engine-gemini)، [MelisAIToolCreator](/ar/reference/modules/melis-ai-tool-creator).
