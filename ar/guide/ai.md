# الذكاء الاصطناعي: الوكلاء والمحرّك

يأتي Melis مزوّدًا بـ **محرّك ذكاء اصطناعي** يتيح لك بناء **وكلاء** — سير عمل مبرمَج ومتعدّد الخطوات قائم على الذكاء الاصطناعي —
وإظهارها في أي مكان في لوحة الإدارة الخلفية أو في وحداتك الخاصة. تتصل مزوّدات مختلفة (Anthropic
Claude وGoogle Gemini وOllama وOCI) خلف محرّك واحد.

الوحدات المعنيّة: `melis-ai` (أدوات لوحة الإدارة الخلفية بتقنية React + مساعد الذكاء الاصطناعي العام)،
و`melis-ai-engine` (المحرّك وواجهة المحادثة المشتركة)،
و`melis-ai-engine-claude` / `melis-ai-engine-gemini` (المزوّدات)،
و`melis-ai-community-extensions` (وكلاء أمثلة جاهزة).

في الإصدار v6 يبقى إطار العمل والوحدات دون تغيير؛ ما تغيّر هو **لوحة الإدارة الخلفية**، التي أصبحت الآن واجهة React
على المسار `/melis-react`. يبقى منطق الذكاء الاصطناعي على جانب الخادم — أمّا React فهو العرض إضافةً إلى استدعاءات الواجهة البرمجية (API).

## المفاهيم الأساسية

| المفهوم | ما هو | الجدول |
| --- | --- | --- |
| **الشركة / المزوّد** | مورّد الذكاء الاصطناعي (Anthropic وGoogle…). | `melis_ai_companies` |
| **النموذج** | نموذج محدّد لشركة ما (مثل نموذج Claude أو Gemini). | `melis_ai_models` (`mam_generative_model`) |
| **مفتاح المنصّة** | مفتاح الواجهة البرمجية المستخدَم لاستدعاء مزوّد. | `melis_ai_platform_keys` |
| **الوكيل** | سير عمل = قائمة مرتّبة من **خطوات السيناريو**. | `melis_ai_agents` و`melis_ai_scenario_steps` |
| **النسخة (Instance)** | مقبض مسمّى وقابل لإعادة الاستخدام لتشغيل وكيل (يُستخدَم كمعرّف جلسة المحادثة). | `melis_ai_instances` (`mai_instance_id`) |
| **الاستخدام اليومي** | محاسبة الرموز/الاستخدام لكل نموذج/وكيل/نسخة. | `melis_ai_daily_usage` |

**الوكيل** هو *سيناريو*: تسلسل من الخطوات مثل `ENTRY PARAMS` و`AI CONTEXT`
و`AI CHAT` و`CODE` و`EXIT PARAMS`. يمرّ المحرّك عبر الخطوات، ويستدعي النموذج عند الحاجة،
وينتج إجابةً نهائية — مع إمكانية كتابتها مرّةً أخرى إلى الصفحة التي أطلقته (عبر *معاملات الخروج*).

## المزوّدات

يختار المحرّك مزوّدًا اعتمادًا على اسم **شركة** النموذج
(`MelisAIEngine\Service\MelisAIEngineService::getActiveModelClass()`):

- إذا احتوى اسم الشركة على **"Anthropic"** ← `MelisAIEngineModelClaudeService` (الوحدة `melis-ai-engine-claude`)
- إذا احتوى اسم الشركة على **"Google"** ← `MelisAIEngineModelGeminiService` (الوحدة `melis-ai-engine-gemini`)
- إضافةً إلى وحدتَي المزوّد **Ollama** (محلي) و**OCI** (OCI GenAI) اللتين تتبعان العقد نفسه

يوسّع كل مزوّد الصنف `MelisAIEngineModelService` الخاص بـ `melis-ai-engine` وينفّذ العقد نفسه
(`setClient()`، وتنسيق الحمولة/الرسائل، واستدعاءات الأدوات). إضافة مزوّد جديد تعني
إضافة وحدة بخدمة نموذج خاصة بها — من دون أي تغيير في المحرّك. ليست للمزوّدات **واجهة
خاصة بها**: تثبيت أحدها يزرع شركته + نماذجه في الكتالوج، فتظهر بعدها
كخيارات في إدارة MelisAI.

## أين يقع في لوحة الإدارة الخلفية بتقنية React

في `/melis-react`، تأتي MelisAI مزوّدةً بـ **حزمة لبنات واحدة** تعرض **ثلاث أدوات أصلية بتقنية React** في
الشريط الجانبي الأيسر ضمن قسم **Melis AI** — **Admin** و**AI Agents** و**MCP Inspector** — **إضافةً
إلى طبقة تراكب لمساعد ذكاء اصطناعي عام**. تحمل كل أداة في القائمة مبدّلًا بين **New / Old**: *New* هو واجهة
React، أمّا *Old* فيفتح الأداة الكلاسيكية داخل إطار iframe.

![قسم قائمة Melis AI](/screenshots/react/melis-ai/melisai-menu-section-melisai.png)

تظهر الأدوات فقط عندما تكون MelisAI مفعّلة. أمّا الإدخال الرابع — **AI Tool Creator** — فتساهم به
وحدة مختلفة (`melis-ai-tool-creator`).

## إعداده (Admin)

افتح **Melis AI ← Admin**. ينطبق مبدّل **New/Old** واحد على الأداة بأكملها؛ وعرض React هو
غلاف تبويبات — **Usage · Platform AI · Instances · MCP Server · Chat dev tool** — مع زرّ **Save** واحد
للتبويب النشط.

- **Platform AI** — اختر **Company + Model**، والصق **مفتاح/مفاتيح الواجهة البرمجية (API key(s))**
  (`melis_ai_platform_keys`)، واضبط المنصّة على **Active** + **Default**. يجب أن يمتلك النموذج مفتاحًا
  لكي يكون فعّالًا. تدير اللوحة اليمنى رفع الملفات — بما في ذلك **وضع الرفع: File API مقابل Embed in
  request** (يعتمد Gemini افتراضيًا File API، بينما يعتمد Claude التضمين).

  ![Admin ← Platform AI](/screenshots/react/melis-ai/melisai-tool-admin-tab-platformai.png)

- **Instances** — إدارة النسخ المسمّاة المستخدَمة لإطلاق الوكلاء. يسرد الجدول لكل
  نسخة **Name ID** الخاص بها (أي `mai_instance_id`) والوكيل المرتبط بها؛ ويفتح **+ New instance**
  نموذج React (الاسم، معرّف النسخة، الحالة، الوكيل، تسمية خاصة بكل لغة).

  ![Admin ← Instances](/screenshots/react/melis-ai/melisai-tool-admin-tab-instances.png)

- **Usage** — استهلاك الرموز/الاستعلامات، إجماليًا ولكل نسخة، عبر نطاق قابل للتحديد.
- **MCP Server** — اختر أي دوال MCP يعرضها الخادم، وحدِّد الجداول الحسّاسة.
- **Chat dev tool** — وحدة تحكّم محادثة للمطوّرين تعرض حمولة الذكاء الاصطناعي الخام والاستجابة جنبًا
  إلى جنب؛ وهي أسرع طريقة لرؤية ما تلقّاه النموذج فعليًا وما أجاب به.

## بناء وكيل (AI Agents)

ضمن **Melis AI ← AI Agents** تبني **سيناريو** الوكيل. تعرض القائمة الوكلاء المشحونة
مع عدد خطواتها وعدد استدعاءاتها طوال العمر؛ ويضيف فتح أحدها تبويبًا فرعيًا بمحرّر من خمسة تبويبات —
**Config · AI Tools · DB Rights · Scenario · Run**.

![قائمة AI Agents](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents.png)

- **Config** — الاسم والرمز والوصف وتجاوز اختياري للنموذج ومبدّلات رفع الملفات.
- **AI Tools** — حدِّد الأدوات التي يجوز لهذا الوكيل استدعاؤها، مجمّعةً ضمن **MCP tools** و**Local tools**؛
  ثم يقدّم المحرّك تلك الأدوات تحديدًا إلى النموذج.
- **DB Rights** — القراءة / الكتابة / الحذف / الإسقاط (drop) لكل جدول، إضافةً إلى مفتاح عام *Allow table creation*.
  الكتابة وحذف الصفوف والإسقاط عمليات لا يمكن التراجع عنها.
- **Scenario** — الخطوات المرتّبة والمصنّفة: **ENTRY PARAMS** ← خطوة أو أكثر من **AI CONTEXT**
  (نظام/معرفة صامتة) ← **AI CHAT** (الدور المرئي) ← **EXIT PARAMS**، مع خطوات **CODE** اختيارية.
  اسحب لإعادة الترتيب؛ ولكل خطوة **Code** تشير إليه عبر `[CODE]` لسحب إجابة خطوة سابقة
  إلى مطالبة (prompt) لاحقة.

  ![Agent ← Scenario](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-scenario.png)

- **Run** — محادثة اختبار حيّة مع الوكيل (النسخة `agenttool`)، بحيث يمكنك تكرار العمل على
  السيناريو والأدوات دون مغادرة المحرّر.

## مساعد الذكاء الاصطناعي

**مساعد الذكاء الاصطناعي** العام هو زرّ عائم في أسفل يمين كل شاشة (وليس له إدخال في القائمة).
يفتح لوحة محادثة تشغّل **Main Chat Assistant** العام (النسخة
`mainchatassistantgeneral`)، ويمكنه قيادة لوحة الإدارة الخلفية — فتح أداة، فتح صفحة — مباشرةً من
المحادثة. يبقى مثبَّتًا عبر عمليات التنقّل، فتصمد الجلسة المفتوحة عند التبديل بين الأدوات.

![لوحة مساعد الذكاء الاصطناعي مفتوحة](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)

## استخدام وكيل من داخل شيفرتك

أبسط تكامل على جانب الخادم يبقى **مساعد العرض `AIChatViewHelper`**
(`melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php`). ضعه داخل عرض `.phtml`
لعرض محادثة جاهزة للاستخدام مرتبطة بنسخة:

```php
<?= $this->AIChatViewHelper(
    $maiInstanceId,        // instance id from melis_ai_instances.mai_instance_id
    $agentId = null,       // optional explicit agent id
    $extraEntryParams = [],// custom_text / custom_files / custom_data
    $debugMode = false,
    $exitParamArr = []     // where to write the result back (fields, js/route callbacks)
) ?>
```

من الأنماط الشائعة **حصر الجلسة لكل كائن** بإلحاق معرّف بمعرّف النسخة،
مثل `"newscontentcreator|".$newsId` — بحيث يحتفظ كل عنصر خبر بمحادثته الخاصة.

في لوحة الإدارة الخلفية بتقنية React، المكافئ هو المكوّن **`AiChatContainer`** المصدَّر من
`melis-ai-engine` (عبر اسم Vite المستعار `@melis-ai-engine`). ركّبه بتمرير `maiInstanceId` فيشغّل
حلقة `init → run → (continue×N) → validate` كاملةً مقابل
نقاط النهاية `/melis/react-api/ai-engine/*` — من دون أي عمل على الواجهة الخلفية:

```tsx
import { AiChatContainer } from '@melis-ai-engine'

<AiChatContainer maiInstanceId="newscontentcreator|42" clearSession autoRun />
```

::: tip مثال واقعي
تأتي `melis-ai-community-extensions` بوكلاء عاملين — مثل *منشئ محتوى الأخبار* الذي يأخذ
مطالبة + صورًا ويكتب النص المُولَّد مرّةً أخرى في نموذج الأخبار عبر ردّ استدعاء خروج. اقرأ
`vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` لترى
استخدام المساعد من البداية إلى النهاية.
:::

برمجيًا، يُقاد المحرّك عبر
`MelisAIEngine\Service\MelisAIEngineAgentService` (`runAgent()` و`validateAnswer()`
و`continueConversation()` و`restartAgent()` و`getFinalAnswer()`)، ويُبنى لكل وكيل + نسخة، مع
استمرار حالة المحادثة في مخزن مدعوم بقاعدة بيانات (`MelisAIEngineConversationStore`) بدلًا من جلسات
PHP. يستدعي كلٌّ من مساعد العرض الكلاسيكي وحاوية محادثة React الخدمة نفسها.

## الأدوات

يمكن للوكلاء استدعاء **أدوات** (دوال) أثناء التشغيل — بما في ذلك **أدوات MCP** لعمليات الملفات وقواعد
البيانات. استخدم **MCP Inspector** (Melis AI ← MCP Inspector) للتأكّد من أن الخادم يعمل وأن أدواته
قابلة للاكتشاف قبل أن تسمح بها لوكيل. راجع صفحة [MCP](./mcp) المخصّصة.

## الملفات الرئيسية

| الموضوع | المسار |
| --- | --- |
| خدمة المحرّك | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineService.php` |
| تنفيذ الوكيل | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineAgentService.php` |
| مساعد عرض المحادثة | `vendor/melisplatform/melis-ai-engine/src/View/Helper/MelisAIChatViewHelper.php` |
| حاوية محادثة React | `vendor/melisplatform/melis-ai-engine/ui-react/src/AiChatContainer.tsx` |
| الواجهة الخلفية لمحادثة React | `vendor/melisplatform/melis-ai-engine/src/Controller/React/MelisReactApiAiEngineController.php` |
| مزوّد Claude | `vendor/melisplatform/melis-ai-engine-claude/src/Service/MelisAIEngineModelClaudeService.php` |
| مزوّد Gemini | `vendor/melisplatform/melis-ai-engine-gemini/src/Service/MelisAIEngineModelGeminiService.php` |
| لبنات لوحة الإدارة الخلفية بتقنية React | `vendor/melisplatform/melis-ai/ui-react/src/` |
| وكلاء أمثلة | `vendor/melisplatform/melis-ai-community-extensions/` |

> للوصول إلى لوحة الإدارة الخلفية الكلاسيكية (iframe) لأي من هذه الأدوات، استخدم مبدّل **Old** الخاص بكل أداة —
> السلوك القديم موثَّق ضمن [/legacy](/legacy/guide/ai). اقرأ شيفرة الوحدات لمعرفة
> الواجهة البرمجية الحالية الدقيقة — راجع [مرجع الوحدات](../reference/modules).
