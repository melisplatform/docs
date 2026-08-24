# MelisAIEngineClaude

> مزوّد Anthropic Claude لمحرّك Melis AI — محرّك خلفي بلا واجهة React خاصة به. الحزمة `melisplatform/melis-ai-engine-claude`.

## الغرض

‏`MelisAIEngineClaude` هو مزوّد Anthropic Claude الفعلي لمجموعة MelisAI. يوسّع عقد `MelisAIEngineModelService` الخاص بالمحرّك ويوفّر إعداد عميل HTTP الخاص بـ Claude، وشكل حمولة واجهة Anthropic Messages API، ومعالجة الملفات، وربط الأدوات/الدوال، وتحليل الاستجابة. الوحدة عديمة الحالة — فهي لا تملك أي جداول قاعدة بيانات؛ إذ تقيم كل حالة التشغيل في جداول المحرّك نفسه.

يختار المحرّك هذا المزوّد تلقائيًا أثناء التشغيل عندما تحتوي شركة النموذج النشط على `Anthropic` (وتكون هذه الوحدة مثبّتة).

## الدور في الواجهة الخلفية بلغة React

هذه الوحدة **ليس لها أداة واجهة خلفية بلغة React ولا واجهة خاصة بها**: لا توجد لبنة `ui-react/`، ولا `config/react-api.php`، ولا قدرات، ولا وحدة تحكّم. ولا تظهر أبدًا كأداة أو عقدة قائمة أو مدخل في الشريط الجانبي داخل `/melis-react`. إنها مجرد سباكة داخلية — مسار الكود الذي يتيح لـ Melis التحدّث إلى Claude.

يقتصر أثرها الظاهر الوحيد في الواجهة الخلفية بلغة React على أثر **انتقالي، عبر [MelisAI](/ar/reference/modules/melis-ai)**:

- تعمل نصوص `install/dbdeploy/*.sql` الخاصة بها على بذر الشركة **`Anthropic`** وعدة **نماذج Claude** في كتالوج النماذج الخاص بالمحرّك.
- تظهر تلك النماذج بعد ذلك كخيارات في إدارة MelisAI (Platform AI / إعدادات النماذج)، تحت شركة **Anthropic**.
- لاستخدام أحدها، تخزّن **مفتاح Anthropic API** الخاص بك في صف ذلك النموذج (`mapk_*`)، ثم توجّه **مثيلًا / وكيلًا** إلى نموذج Claude.
- من تلك اللحظة فصاعدًا تُوجَّه كل محادثة على ذلك الوكيل — بما في ذلك **مساعد الذكاء الاصطناعي** بلغة React — عبر هذا المزوّد.

> أنت لا تفتح هذه الوحدة أبدًا. في `/melis-react` لا تكون سوى سطر في قائمة منسدلة للنماذج يظهرها MelisAI، بالإضافة إلى المحرّك الذي يقف خلف محادثات الذكاء الاصطناعي التي تستخدمه. إذا فشلت محادثات Claude، فالسبب عادةً هو غياب **مفتاح API** في صف النموذج أو نموذج **غير نشط** — وكلاهما يُضبَط في MelisAI، لا هنا.

## تفعيلها

أضِف إلى `config/melis.module.load.php` بعد محرّك الذكاء الاصطناعي:

```php
return [
    'MelisAIEngine',
    'MelisAIEngineClaude',
];
```

التبعية: `melisplatform/melis-ai-engine` `^6.0`. يُخزَّن مفتاح Anthropic API لكل نموذج في الواجهة الخلفية لـ Melis AI (صف مفتاح النموذج `mapk_*`) — لا في ملف إعدادات ولا في متغيّر بيئة.

## الخدمات الرئيسية

| اسم الخدمة | الدور |
| --- | --- |
| `MelisAIEngineModelClaudeService` | مزوّد Claude. يوسّع `MelisAIEngineModelService` وينفّذ عقد واجهة Anthropic Messages API. يبنيه مدير الخدمات بخيارات المصنع `['modelId' => …, 'agentId' => …]`. |

طرق بارزة على `MelisAIEngineModelClaudeService`:

| الطريقة | الدور |
| --- | --- |
| `setClient()` | يبني `Laminas\Http\Client` يرسل POST إلى عنوان Claude Messages المُعدّ. يضبط الترويسات `Content-Type/Accept: application/json` و`x-api-key` (من مفتاح API الخاص بالنموذج) و`anthropic-version: 2023-06-01` وترويسة `anthropic-beta` تفعّل نسخ prompt-caching وweb-fetch التجريبية. يستخدم مهلة طويلة لاستيعاب حلقات استخدام الأدوات. |
| `getMessageKey()` | يُرجِع `'messages'`. |
| `addToolsToPayload()` | يقرأ دوال الوكيل عبر `getAgentFunctions()`، ويجرّد المفاتيح الداخلية للمحرّك (`mcp`، `type`، `server`، `module`، `max_silence`، `operation_timeout`) عبر `sanitizeToolForClaudeAPI()`، ويلحق الأدوات بشكل Anthropic (`name`، `description`، `input_schema`)، ويلحق أداة `web_fetch` المدمجة، ويزيل التكرار بحسب الاسم. |
| `constructContent()` / `addContentToPayload()` | يربط الدور `model` بـ `assistant`؛ ويبني كتل محتوى Anthropic (`{type:text}`، `{type:image, source:{url\|base64,…}}`، `{type:document, source:{…, media_type:application/pdf}}`)؛ ويلحقها بـ `payload['messages']`. |
| `sendCustomAI()` | يحقن `model` (`mam_generative_model`) و`max_tokens`؛ ويرسل JSON عبر POST مع إعادة المحاولة عند أخطاء 5xx؛ ويحلّل `content[]` إلى كتل نصّية وكتل `tool_use`؛ ويوزّع كل أداة (MCP عبر `MelisAIEngineMcpService::invokeTool`، وإلا فمدمجة)؛ ويلحق النتائج بصيغة `{type:tool_result, tool_use_id, content}` داخل رسالة `user`؛ ويكرّر الحلقة حتى `stop_reason === 'end_turn'` أو بلوغ حدّ أمان لعدد القفزات. يفعّل تخزين المطالبات المؤقت (prompt caching). |
| `processFiles()` / `processContextFiles()` | يحوّل الملفات المرفوعة وفق `mam_file_upload_mode` الخاص بالنموذج (الافتراضي: `embed`): DOCX/XLSX ← نص مستخرَج، الصور/PDF ← base64، أو عبر `uploadDocument()` عند تفعيل الرفع الداخلي. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | يقرأ حقول `responseData['usage']` (`input_tokens`، `output_tokens`، بالإضافة إلى عدّادات قراءة/إنشاء الذاكرة المؤقتة)؛ الإجمالي = المدخلات + المخرجات. |
| `getAllowedMimetypes()` | يُرجِع أنواع MIME المسموح رفعها من كتلة إعدادات Claude. |
| `continueConversation()` | يعيد ترطيب سجل الرسائل من الحالة المحفوظة ويستدعي `sendCustomAI()` مجددًا لمواصلة استخدام الأدوات عبر قفزات متعددة. |

## استدعاء الأدوات / الدوال

تستخدم أدوات المحرّك مسبقًا شكل `input_schema` الخاص بـ Anthropic، لذا فإن `addToolsToPayload()` يقوم أساسًا بتنقيتها وتمريرها. يصل استدعاء أداة من النموذج بصيغة `{type:'tool_use', name, id, input}`؛ وتستخرج الخدمة `name` / `input` / `id`، وتوجّه عبر `MelisAIEngineMcpService::isMcpTool()` (‏`invokeTool` الخاص بـ MCP مقابل دالة مدمجة)، وتُرجِع النتيجة بصيغة `{type:'tool_result', tool_use_id:<id>, content:<json>}` داخل رسالة `user`، ثم تواصل الحلقة. يربط الحقل `id` الاستدعاء بالنتيجة كما تتطلّب واجهة Anthropic API.

## الإعدادات

تقيم إعدادات المزوّد تحت:

```
config['plugins']['melisaiengine']['datas']['AI']['Claude']
```

| المفتاح | الغرض |
| --- | --- |
| `api_url` | عنوان نقطة نهاية Anthropic Messages API (`https://api.anthropic.com/v1/messages`). |
| `allowed_mimetypes` | أنواع MIME المقبولة لرفع الملفات. |

تعلن كتلة شقيقة `['AI']['Anthropic']` عن أنماط رفع الملفات (`embed`) ودعم الرفع الداخلي. لا يُقرأ مفتاح API **من** الإعدادات أو البيئة — إذ يأتي حصرًا من صف مفتاح النموذج في قاعدة البيانات (`mapk_*`)، الذي يُدخِله مسؤول في إدارة MelisAI.

## النماذج المبذورة

تُثبَّت عبر `install/dbdeploy/*.sql` تحت شركة `Anthropic`؛ وتحدّد راية `mam_status` أيّها يُعرَض:

| `mam_generative_model` | النموذج |
| --- | --- |
| `claude-opus-4-8` | Claude Opus 4.8 |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 |
| `claude-sonnet-4-5-20250929` | Claude Sonnet 4.5 |
| `claude-sonnet-4-20250514` | Claude Sonnet 4 |
| `claude-opus-4-1-20250805` | Claude Opus 4.1 |

## جداول قاعدة البيانات

لا تملك هذه الوحدة أي جداول. تُخزَّن كل حالة المحادثة والاستخدام في جداول المحرّك (`melis_ai_conversation_state`، `melis_ai_daily_usage`).

## الملفات الرئيسية

| المجال | المسار |
| --- | --- |
| خدمة المزوّد | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| مصنع الخدمة | `vendor/melisplatform/melis-ai-engine-claude/src/Service/Factory/MelisAIEngineModelClaudeServiceFactory.php` |
| كتلة الإعدادات | `vendor/melisplatform/melis-ai-engine-claude/config/app.interface.php` |

## انظر أيضًا

- [MelisAIEngine](/ar/reference/modules/melis-ai-engine) — المحرّك المجرّد، والجداول المشتركة وجسر MCP؛ يحتوي على التوجيه الذي يختار هذا المزوّد بحسب اسم الشركة.
- [MelisAIEngineGemini](/ar/reference/modules/melis-ai-engine-gemini) — مزوّد Google Gemini.
- [MelisAI](/ar/reference/modules/melis-ai) — الواجهة الخلفية بلغة React لإدارة المثيلات والوكلاء والأدوات والنماذج ومفاتيح API؛ الواجهة الوحيدة التي يظهر فيها Claude.
- [مرجع الوحدات](/ar/reference/modules) — خريطة الوحدات الكاملة.
