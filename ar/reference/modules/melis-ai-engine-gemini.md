# MelisAIEngineGemini

> مزوّد Google Gemini لمحرك Melis AI — محرك خلفي بلا واجهة إدارة خاصة به. الحزمة `melisplatform/melis-ai-engine-gemini`.

## الغرض

`MelisAIEngineGemini` هو التنفيذ الفعلي لـ Google Gemini لعقد
`MelisAIEngineModelService` الخاص بـ `MelisAIEngine`. فهو يوفّر إعداد عميل HTTP الخاص بـ Gemini، وشكل
حمولة `generateContent` (مخطط `contents` / `parts`)، وتخطيط استدعاء الأدوات/الدوال،
ومعالجة الملفات عبر File API أو التضمين المباشر (inline embed)، وتحليل استهلاك الرموز (tokens). الوحدة عديمة الحالة (stateless)
(لا جداول خاصة بها) ولا تشحن **أي واجهة مستخدم** — جميع شاشات الذكاء الاصطناعي توفّرها `melis-ai` /
`melis-ai-engine`.

## لا واجهة إدارة React

هذه الوحدة **لا تحتوي على أداة React** وليست معدّة لأن تحتوي عليها — فهي طبقة مزوّد خلفية،
وليست شاشة. لا تشحن أي لبنة `ui-react/`، ولا `config/react-api.php`، ولا
`config/react.capabilities.php`، ولا وحدة تحكّم، ولا تُظهر **أي مدخل في الشريط الجانبي أو عقدة قائمة** في
`/melis-react`. لا توجد لقطات شاشة.

في واجهة إدارة React، يظهر Gemini **بشكل غير مباشر** فقط، كمحرك/نموذج قابل للاختيار داخل
إدارة **MelisAI** (Platform AI / Instances / Models & keys). عندما ينشئ المسؤول نموذجًا
تكون شركته **Google** وتكون هذه الوحدة مثبّتة، يقوم `MelisAIEngine` بتوجيه محادثة ذلك النموذج
ووكلائه عبر محرك Gemini المُنفّذ هنا — دون صفحة Gemini مخصّصة.

## تفعيلها

أضف إلى `config/melis.module.load.php`:

```php
return [
    'MelisAIEngineGemini',
];
```

تتطلّب `melisplatform/melis-ai-engine` بإصدار `^6.0`. يختار المحرك هذا المزوّد تلقائيًا
في وقت التشغيل عندما يحتوي اسم شركة النموذج النشط على **`Google`** وتكون هذه الوحدة
مثبّتة؛ فيبني `MelisAIEngineModelGeminiService` عبر
`$serviceManager->build(MelisAIEngineModelGeminiService::class, ['modelId' => …, 'agentId' => …])`.

## الخدمات الرئيسية

| اسم الخدمة (Alias) | الدور |
| --- | --- |
| `MelisAIEngineModelGeminiService` | مزوّد Gemini — فئة فرعية من `MelisAIEngineModelService`، تُبنى لكل طلب مع `modelId` + `agentId` (عبر `MelisAIEngineModelGeminiServiceFactory`). |

الطرق (methods) البارزة في `MelisAIEngineModelGeminiService`:

| الطريقة | تنفيذ Gemini |
| --- | --- |
| `setClient()` | يبني `Laminas\Http\Client` يرسل POST إلى `{api_url}/models/{mam_generative_model}:generateContent`. يُرسَل مفتاح الـ API في ترويسة الطلب **`x-goog-api-key`** (بعيدًا عن الـ URL). مهلة طويلة. |
| `getMessageKey()` | يُرجع `'contents'`. |
| `addToolsToPayload()` | يجلب الأدوات عبر `getAgentFunctions()`، وينقّي كلًّا منها، ويعيد تسمية `input_schema` → `parameters`، ويغلّفها كـ `tools:[{functionDeclarations:[…]}]` مع `toolConfig.functionCallingConfig.mode='AUTO'`. يعود احتياطيًا إلى أداة `url_context` عند غياب أي دوال. |
| `constructContent()` / `addContentToPayload()` | يخطّط الدور `assistant` → `model`؛ ويبني مصفوفات `parts` تحتوي على `{text}`، أو `{fileData:{fileUri,mimeType}}` (File API)، أو `{inlineData:{mimeType,data}}` (base64). |
| `sendCustomAI()` | يرسل حمولة JSON عبر POST (مع إعادة المحاولة عند 5xx / 429)؛ ويحلّل `candidates[].content.parts[]` بحثًا عن النصوص ومدخلات `functionCall`؛ ويوزّع كل استدعاء أداة (MCP أو مدمج)؛ ويلحق النتائج كـ `{functionResponse:{name,response:{result}}}` ويكرّر حتى لا تبقى استدعاءات أدوات، أو حتى ظهور `finishReason`، أو بلوغ حدّ أمان. |
| `processFiles()` / `processContextFiles()` | يعالج رفع الملفات وفق `mam_file_upload_mode` (انظر [أوضاع رفع الملفات](#file-upload-modes))؛ كما يخزّن نسخة عبر `uploadDocument()` للعرض في الجلسة. |
| `setPromptTokenCount()` / `setResponseTokenCount()` / `setTotalTokenCount()` | تقرأ `usageMetadata.promptTokenCount` و`candidatesTokenCount` و`totalTokenCount`. |
| `getAllowedMimetypes()` | يُرجع أنواع MIME المسموح بها من كتلة إعدادات Gemini. |

## أوضاع رفع الملفات

يتحكّم `mam_file_upload_mode` الخاص بالنموذج في كيفية وصول الملفات إلى Gemini:

- **`fileapi`** (الافتراضي) — يرفع إلى **File API** الخاص بـ Gemini عبر طلب POST متعدّد الأجزاء (multipart)، ثم يستطلع (polls)
  حتى تصبح حالة الملف `ACTIVE`، ويشير إلى `fileApiUri` المُعاد.
- **`embed`** — يرسل بايتات الملف مباشرةً كـ base64 (`inlineData`)، مع استخراج النص
  للصيغ المدعومة.

## الإعداد

تقع إعدادات المزوّد الثابتة تحت `config['plugins']['melisaiengine']['datas']['AI']['Gemini']`
(في `config/app.interface.php`، دون واجهة مستخدم):

| المفتاح | الغرض |
| --- | --- |
| `api_url` | الـ URL الأساسي لطلبات `generateContent` (`https://generativelanguage.googleapis.com/v1beta`). |
| `upload_url` | نقطة نهاية رفع File API الخاصة بـ Gemini (`https://generativelanguage.googleapis.com/upload/v1beta/files`). |
| `allowed_mimetypes` | أنواع MIME المقبولة (يُرجعها `getAllowedMimetypes()`). |

تأتي القيم الخاصة بكل نموذج من **صف النموذج** المُعدّ في MelisAI، لا من هذه الوحدة:

- **`mam_generative_model`** — مُعرّف نموذج Gemini (مثل `gemini-…`)، ويُستخدم في URL الطلب.
- **`mapk_keys`** — **مفتاح Google API**، يُرسَل في ترويسة `x-goog-api-key`. يأتي من
  سجلّ مفتاح المنصّة الخاص بالنموذج، ولا يُخزَّن في ملفات الإعداد، وليس له **بديل احتياطي عبر متغيّر بيئة**.
- **`mam_file_upload_mode`** (`fileapi` افتراضيًا، أو `embed`) و`mam_internal_upload` — يحكمان
  كيفية رفع الملفات.

::: tip مفتاح الـ API في الترويسة
على خلاف الإصدارات السابقة التي كانت تُلحق المفتاح كمعامل استعلام `?key=…`، يرسل المصدر الحالي
مفتاح Google API في ترويسة الطلب **`x-goog-api-key`**، مبقيًا إياه بعيدًا عن الـ URLs
وسجلّات البروكسي.
:::

## تخطيط استدعاء الأدوات/الدوال

يستخدم Gemini المفتاح `parameters` حيث يستخدم عقد المحرك `input_schema`؛ ويجري `addToolsToPayload()`
عملية إعادة التسمية هذه قبل الإرسال. تصل استدعاءات الأدوات كـ `{functionCall:{name,args}}` مع
**غياب المُعرّف (id)** (وضعية/موضعية، بخلاف `tool_use_id` في Claude). توجّه الخدمة عبر `name` باستخدام
`MelisAIEngineMcpService::isMcpTool()` وتُرجع
`{functionResponse:{name,response:{result:…}}}`.

## الفروق مقابل مزوّد Claude

| الجانب | Gemini | Claude |
| --- | --- | --- |
| مفتاح الرسالة | `contents` | `messages` |
| تسمية دور المساعد | `model` | `assistant` |
| مفتاح مخطط الأداة | `parameters` | `input_schema` |
| مُعرّف استدعاء الأداة | لا يوجد (موضعي) | `tool_use_id` |
| طريقة المصادقة | ترويسة `x-goog-api-key` | ترويسة `x-api-key` |
| وضع الملف الافتراضي | `fileapi` | `embed` |

## الملفات الرئيسية

| الموضوع | المسار |
| --- | --- |
| خدمة المزوّد | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| مصنع الخدمة (Factory) | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/Factory/MelisAIEngineModelGeminiServiceFactory.php` |
| الإعداد الثابت | `vendor/melisplatform/melis-ai-engine-gemini/config/app.interface.php` |

## انظر أيضًا

- [MelisAIEngine](/ar/reference/modules/melis-ai-engine) — العقد المجرّد ووقت التشغيل المشترك.
- [MelisAIEngineClaude](/ar/reference/modules/melis-ai-engine-claude) — مزوّد Anthropic.
- [MelisAI](/ar/reference/modules/melis-ai) — واجهة الإدارة للوكلاء والمثيلات والنماذج.
