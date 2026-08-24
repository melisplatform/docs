# MelisCmsMcq

> أداة إنشاء الاختبارات متعددة الخيارات (استبيان/اختبار من متعدد) في الواجهة الخلفية لنظام Melis CMS، وهي الآن أداة React كاملة أصلية في الواجهة الخلفية للإصدار v6. الحزمة `melisplatform/melis-cms-mcq`.

## الغرض

يمثّل MelisCmsMcq **النصف الخاص بواجهة المستخدم** من نظام MCQ. فهو يوفّر مساحة العمل التي تُنشئ فيها **الأسئلة** (مع إجاباتها ونوعها ومستوى صعوبتها وفئتها ووسومها)، وتنظّمها في **فئات أسئلة** و**مجموعات MCQ**، وتُجمّع منها **اختبارات MCQ** إما يدويًا عبر **سلة** خاصة بكل مستخدم أو تلقائيًا عبر **نموذج عشوائي**. وليست له طبقة بيانات خاصة به: إذ يُفوَّض كل ما يتعلق بالتخزين (الجداول والخدمات والتصحيح ولقطات XML والعرض في الواجهة الأمامية) إلى الوحدة المرافقة **MelisCmsMcqEngine**.

في الإصدار v6 صارت الأداة **لبنة React كاملة أصلية**: صفحات React حقيقية تستدعي نقاط النهاية JSON الخاصة بالوحدة `/melis/react-api/mcq*`، دون أي iframe في العرض الافتراضي. أما الأداة القديمة المكتوبة بلغة PHP فتبقى دون تغيير ولا يمكن الوصول إليها إلا عبر مبدّل New / Old الخاص بكل أداة.

## تفعيلها

أضِفها إلى `config/melis.module.load.php`:

```php
return [
    'MelisCmsMcq',
];
```

تتطلّب `melisplatform/melis-cms-mcq-engine` (`^5.3`) و`laminas/laminas-paginator`. كما تتطلّب تحميل **MelisCms** و**MelisCore** (الواجهة الخلفية) و**MelisCmsTags** (وسم الأسئلة). سلسلة التثبيت: `MelisCmsMcq` ← `melis-cms-mcq-engine` ← `melis-cms` + `melis-cms-tags`.

يُكتشَف لبنة React عبر `GET /melis/react-api/react-modules` ولا تظهر إلا عندما تكون الوحدة نشطة. يدمج `src/Module.php` كلًّا من `config/react-api.php` (نقاط النهاية JSON) و`config/react.capabilities.php` (خريطة الحقوق المتقدمة) في إعدادات التطبيق.

## موقعها في الواجهة الخلفية React

**الشريط الجانبي ← MelisCms ← MCQ**، المسار **`/melis-cms/mcq`** (المشتقّ من توجيه القائمة `MelisCmsMcq/MelisCmsMcq`). تُسجَّل اللبنة تحت المعرّف **`cms-mcq`** وتَرسم الأداة بأكملها في React — دون شريط جانبي أو ترويسة خاصة بها.

![علامة تبويب MCQ (React): قائمة الاختبارات مع بطاقات مؤشرات الأداء والمرشّحات ومبدّل New/Old وسلة مفضّلة الأسئلة (Questions Favorites).](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-list.png)

يضبط الملف التعريفي (`public/ui-react/brick.manifest.json`) القيمتين `persistent: true` و`subTabs: true`، فتمتلك اللبنة **شريط علامات تبويب فرعية خاصًّا بها** داخل الأداة وتبقى محمّلة أثناء التنقّل في المضيف: فتْح اختبار MCQ أو سؤال يُضيف علامة تبويب فرعية، وتبقى المرشّحات والترتيب والنماذج المكتوبة جزئيًا كما هي عند عودتك إلى إحدى القوائم. ولا يُعبّر العنوان (URL) إلا تعبيرًا شكليًا (`history.replaceState`) عن السجلّ النشط.

| الخاصية | القيمة |
| --- | --- |
| معرّف اللبنة | `cms-mcq` |
| المسار | `/melis-cms/mcq` |
| التسمية | `MCQ` |
| forwardKey | `MelisCmsMcq/MelisCmsMcq` |
| melisKey | `meliscmsmcq_tool` (مفتاح حارس الوصول **وحامل الحقوق** في آنٍ واحد) |

> **مبدّل New / Old.** في عرض القائمة يحصل المستخدم غير المقيّد على مبدّل **New (React) / Old (iframe قديم)**؛ ويُقدَّم عرض "Old" وهو الأداة الكلاسيكية عبر `/melis/react-tool-page?key=meliscmsmcq_tool`. أما المستخدمون المقيّدون فلا يرَون إلا عرض React.

## مساحة عمل الواجهة الخلفية

مساحة عمل React مكوّنة من أربع علامات تبويب، إضافةً إلى سلة **مفضّلة الأسئلة** (Questions Favorites) (قائمة مختصرة من المحفوظات خاصة بكل مستخدم) في ترويسة الأداة. القاعدة العامة: أنشئ **الأسئلة** ← جمّعها (**مجموعات MCQ** / **الفئات**) ← جمّع **اختبار MCQ** ← **معاينة** (Preview) لخوضه وقراءة التصحيح.

| علامة التبويب | ما تديره |
| --- | --- |
| **MCQ** | قائمة الاختبارات المجمّعة (المعرّف، الحالة، الرمز، الاسم، تاريخ الإنشاء، المجموعات، الأسئلة) مع بطاقات مؤشرات الأداء والبحث ومرشّحات الحالة/التاريخ ومدير الأعمدة والتصدير. يفتح زر **Add** أداة إنشاء MCQ كعلامة تبويب فرعية. |
| **Questions** | قائمة الأسئلة مع مرشّحات حسب الفئة / النوع / الحالة / الصعوبة / الوسوم إضافةً إلى البحث؛ ويبدّل إجراء **إشارة مرجعية** (bookmark) إدراج السؤال في مفضّلة الأسئلة. |
| **MCQ groups** | حزم أسئلة قابلة لإعادة الاستخدام (المعرّف، الحالة، الرمز، الاسم). بطاقات مؤشرات الأداء والتصدير و**نافذة منبثقة** للإضافة/التعديل. |
| **Question categories** | تجميعات أسئلة مُسمّاة (المعرّف، الحالة، الرمز، الاسم). بطاقات مؤشرات الأداء والتصدير و**نافذة منبثقة** للإضافة/التعديل. |

![علامة تبويب Questions (React): قائمة أسئلة قابلة للتصفية، مع إجراء الإشارة المرجعية للسلة.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions.png)

### محرّر الأسئلة

يفتح زر **Add / edit** في علامة تبويب Questions المحرّر كعلامة تبويب فرعية، ضمن علامتَي تبويب:

| علامة تبويب المحرّر | المحتوى |
| --- | --- |
| **Properties** | الرمز، **Type** (MCQ / Open Ended)، **Category**، **Tags**، **Difficulty**، الحالة |
| **Texts / Answers** | نصّ السؤال لكل لغة إضافةً إلى كل **إجابة** مع علامة **Correct answer (Yes/No)** ورمز وحالة؛ اسحب مقبض المسك لإعادة ترتيب الإجابات |

![محرّر الأسئلة — Properties (Type، Category، Tags، Difficulty، الحالة).](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-properties.png)

![محرّر الأسئلة — النصوص لكل لغة وقائمة الإجابات (مبدّل الإجابة الصحيحة).](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-texts.png)

![مقبض السحب لإعادة الترتيب في صفّ إجابة.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-dragdroporderingicon.png)

### أداة إنشاء MCQ

علامة تبويب **MCQ** ← **Add** (أو تعديل صفّ) تفتح أداة الإنشاء كعلامة تبويب فرعية، ضمن ثلاث علامات تبويب:

| علامة تبويب أداة الإنشاء | المحتوى |
| --- | --- |
| **Properties** | الاسم، الرمز، الحالة، **Minimum score required (%)** (نسبة النجاح) ومبدّل خلط عشوائي **"change questions order at every MCQ creation"** |
| **Composition (Questions)** | أضِف **مجموعات**، ثم املأ كل مجموعة بسحب الأسئلة من اللوحتين الجانبيتين **Questions Favorites** / **Search Questions**، أو انقر **Configure a random MCQ** للاختيار التلقائي لكل مجموعة |
| **Preview** | اخُض الاختبار المجمّع، ثم أرسِله لعرض **Correction** التي يحسبها المحرّك (النتيجة، النجاح/الرسوب، إجابات المستخدم مقابل الإجابات الصحيحة لكل سؤال). واجهة React تعرضه فقط |

![Properties في أداة إنشاء MCQ — الاسم، الحد الأدنى للنتيجة المطلوبة (%)، مبدّل الترتيب العشوائي.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-properties.png)

![تركيب MCQ في أداة الإنشاء — المجموعات مع أسئلتها، إضافةً إلى لوحتَي Favorites / Search.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-questions.png)

![Preview في أداة إنشاء MCQ — الاختبار المجمّع جاهزًا لخوضه.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-preview.png)

![تصحيح المعاينة — النتيجة، النجاح/الرسوب، وإجابات المستخدم مقابل الإجابات الصحيحة لكل سؤال.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-preview-corrected.png)

تحدّد النافذة المنبثقة **Random Model** صفوف معايير لكل مجموعة (Difficulty / Category / Tag / Number)؛ ويؤدي الحفظ إلى تحليل معرّفات الأسئلة المطابِقة من جانب الخادم عبر دالة `getRandomQuestionIds` في المحرّك.

![النافذة المنبثقة Random Model — اختيار الأسئلة تلقائيًا لكل مجموعة حسب المعايير.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-questions-randommcq-modal.png)

> يفشل الحفظ إذا لم يكن هناك اسم، أو لم تكن هناك مجموعة، أو وُجدت **أي مجموعة فارغة** — وهي القواعد نفسها المعمول بها في الأداة القديمة. يُعاد توليد لقطة XML الخاصة بالاختبار (`mcq_xml`) بواسطة المحرّك عند كل عملية حفظ، ولا تُكتَب يدويًا أبدًا. ويؤدي إنشاء فئة أو حذفها إلى تحديث بيانات المرجع المشتركة بحيث تظهر فورًا في محدّد الفئات ضمن محرّر الأسئلة.

## واجهة React البرمجية — نقاط النهاية

جميع المسارات هي مسارات فرعية لـ `melis-react-api` (مدمجة من `config/react-api.php`)، وتخدمها أربعة متحكّمات قابلة للاستدعاء (invokable). وعقد الاستجابة في كل مكان: `{ success: bool, data: T, error?: string, fields?: string[] }`. ويستدعي كل إجراء الدالة `denyUnlessAccess()` (المصادقة + `MelisCoreRights::canAccess('meliscmsmcq_tool')`) ثم حارس الأهلية `denyUnlessCan(<cap>)`.

**MCQ** — `MelisReactApiMcqController`:

| الطريقة · العنوان | الإجراء · الأهلية | الغرض |
| --- | --- | --- |
| `GET /melis/react-api/mcq` | `list` · `mcq` | قائمة keyset |
| `GET /melis/react-api/mcq/stats` | `stats` · `mcq` | بطاقات مؤشرات الأداء |
| `GET /melis/react-api/mcq/groups` | `groups` · `mcq` | المجموعات القابلة للاختيار في أداة الإنشاء |
| `GET /melis/react-api/mcq/:id` | `get` · `mcq` | التفاصيل الكاملة (الخصائص، الأسماء، المجموعات المرتّبة + الأسئلة) |
| `POST /melis/react-api/mcq/save` | `save` · `mcq.create` \| `mcq.edit` | إنشاء/تحديث (يعيد توليد `mcq_xml`) |
| `POST /melis/react-api/mcq/evaluate` | `evaluate` · `mcq.preview.test` | تسجيل نتيجة مجموعة من الإجابات |
| `GET /melis/react-api/mcq/:id/preview` | `preview` · `mcq.preview` | الاختبار كما يُخاض (من XML) |
| `DELETE /melis/react-api/mcq/delete/:id` | `delete` · `mcq.delete` | الحذف (متسلسل) |

**Questions** (+ الإجابات، السلة، السحب العشوائي) — `MelisReactApiMcqQuestionController`، على `/melis/react-api/mcq-questions[…]`: `list`/`stats`/`refs`/`get`/`save` (الأهلية `questions`)، و`delete` (`questions.delete`)، ونقاط نهاية التركيب `basket` و`basket/toggle` و`basket/clear` و`search` و`random` و`random-model` (كلّها بالأهلية `mcq.composition`). وتُرجِع `refs` بيانات المرجع المشتركة — الأنواع، مستويات الصعوبة، الفئات، الوسوم، اللغات، `nextCode`.

**MCQ groups** — `MelisReactApiMcqGroupController`: `list`/`stats`/`save`/`delete`/`related`/`get` على `/melis/react-api/mcq-groups[…]` (الأهليات `groups` و`groups.delete`).

**Question categories** — `MelisReactApiMcqCategoryController`: `list`/`stats`/`save`/`delete`/`related`/`get` على `/melis/react-api/mcq-categories[…]` (الأهليات `categories` و`categories.delete`).

> ⚠ ترتيب المسارات مهم: تُعلَن المقاطع الحرفية (`/stats` و`/save` و`/groups` و`/basket` و`/random` و`/evaluate` و`/refs`) **قبل** المسار الشامل `/:id`، وتُسبَق جميع الأسماء بالبادئة `mcq-*` تجنّبًا للتعارض مع مسارات `melis-react-api` العامة.

**منطق الأعمال يبقى من جانب الخادم.** لا تفعل هذه المتحكّمات سوى التحقق من المدخلات وتشغيل معاملة (transaction) وتشكيل JSON؛ أما العمل الفعلي فيقع في خدمات المحرّك التي تحلّها.

## الأهليات (الحقوق المتقدمة)

يُفهرَس `config/react.capabilities.php` تحت عقدة القائمة حاملة الحقوق **`meliscmsmcq_tool`** — وهو ذاته المفتاح melisKey الذي تحرسه المتحكّمات. ويبقى الوصول إلى الأداة نفسها عبر `MelisCoreRights::canAccess('meliscmsmcq_tool')`؛ أما هذه الأهليات فتضبط **المكوّنات داخل** أداة مُصرَّح بها مسبقًا. والإعداد الافتراضي هو السماح: فأي مستخدم/دور بلا قسم أهليات يحتفظ بكل شيء.

سلاسل الأهليات المسطّحة:

- **`mcq`**، `mcq.create`، `mcq.edit`، `mcq.delete`، `mcq.export`؛ و`mcq.composition` (صفحة التركيب — تضبط أيضًا نقاط نهاية السلة + البحث/العشوائي)، و`mcq.properties`، و`mcq.preview`، و`mcq.preview.test`
- **`questions`**، `questions.create`، `questions.edit`، `questions.delete`، `questions.export`؛ و`questions.properties`، و`questions.answers`
- **`groups`**، `groups.create`، `groups.edit`، `groups.delete`، `groups.export`
- **`categories`**، `categories.create`، `categories.edit`، `categories.delete`، `categories.export`

المفاتيح الأربعة عالية المستوى (`mcq` و`questions` و`groups` و`categories`) هي علامات تبويب القوائم الأربع. وتقرؤها React عبر `useCaps(MELIS_KEY)` وتُخفي علامات التبويب/الأزرار تبعًا لذلك؛ أما الحارس `denyUnlessCan()` من جانب الخادم فهو الإنفاذ الفعلي.

## خدمات المحرّك المستخدَمة

لا يُسجّل MelisCmsMcq أي خدمات خاصة به — إذ تحلّ متحكّمات React الخاصة به أسماءً مستعارة من **MelisCmsMcqEngine** أثناء التشغيل:

| الاسم المستعار لخدمة المحرّك | استخدامه في هذه الوحدة |
| --- | --- |
| `MelisCmsMcqQuestionsService` | عمليات CRUD للأسئلة، وقائمة السلة، والاختيار العشوائي (`getRandomQuestionIds`) |
| `MelisCmsMcqAnswersService` | عمليات CRUD للإجابات (محرّر الأسئلة) |
| `MelisCmsMcqQuestionCategoryService` | عمليات CRUD لفئات الأسئلة |
| `MelisCmsMcqGroupsService` | عمليات CRUD لمجموعات MCQ |
| `MelisCmsMcqService` | عمليات CRUD لاختبارات MCQ، وتوليد XML (`generateMcqXml`)، والجلب (`getMcq`)، والتصحيح (`evaluateAnswers`)، والحذف (`deleteMcqById`) |

## جداول قاعدة البيانات

جميع الجداول مملوكة لـ **MelisCmsMcqEngine**. وترتبط واجهات الواجهة الخلفية في هذه الوحدة بها على النحو التالي:

| جدول المحرّك | واجهة الواجهة الخلفية التي تكتب إليه |
| --- | --- |
| `melis_cms_mcq_questions` + `_trans` | علامة تبويب Questions + محرّر الأسئلة |
| `melis_cms_mcq_answers` + `_trans` | محرّر الإجابات (داخل محرّر الأسئلة) |
| `melis_cms_mcq_question_groups` + `_trans` | علامة تبويب Question categories |
| `melis_cms_mcq_groups` + `_trans` | علامة تبويب MCQ groups (مرتبطة باختبار MCQ عبر `mcqg_mcq_id`) |
| `melis_cms_mcq` + `_trans` | علامة تبويب MCQ؛ ويُخزَّن الاختبار المجمّع بصيغة XML في `mcq_xml` |
| `melis_cms_mcq_questions_list` | عضوية السؤال في مجموعة MCQ |
| `melis_cms_mcq_baskets` | مفضّلة الأسئلة لكل مستخدم |

> **تنبيه بشأن التسمية.** ترتبط "Question categories" في واجهة المستخدم بالجدول `melis_cms_mcq_question_groups`؛ بينما ترتبط "MCQ groups" في واجهة المستخدم بالجدول `melis_cms_mcq_groups`. جدولا "group" منفصلان بغرضين مختلفين — راجع مستند MelisCmsMcqEngine.

## تكامل الوسوم

يُسجّل `config/app.interface.php` ارتباط **MelisCmsTags** بحيث تصبح الأسئلة قابلة للوسم (نوع الارتباط `MCQ_QUESTION`، جدول الكيان `melis_cms_mcq_questions`، المفتاح الأساسي `mcqq_id`). وتُظهِر قائمة Questions عمود **وسوم** و**مرشّح وسوم** يقوده هذا التسجيل؛ وفي أداة React تُعدّ الوسوم أيضًا جزءًا من حمولة `refs` الخاصة بالسؤال.

## الواجهة الأمامية

ليس لـ MelisCmsMcq أي إخراج خاص به في الواجهة الأمامية. فمُصيِّر الاختبار هو مساعد عرض (`renderMcqQuestions`) مُسجَّل في **MelisCmsMcqEngine**؛ وتستخدمه علامة تبويب Preview عبر المحرّك. راجع [مرجع MelisCmsMcqEngine](/legacy/reference/modules/melis-cms-mcq-engine) للاطلاع على تفاصيل العرض في الواجهة الأمامية.

## الملفات الأساسية

| الشأن | المسار |
| --- | --- |
| مسارات واجهة React البرمجية + 4 متحكّمات قابلة للاستدعاء | `config/react-api.php` |
| خريطة أهليات الحقوق المتقدمة | `config/react.capabilities.php` |
| تمهيد الوحدة (يدمج الإعدادَين أعلاه) | `src/Module.php` |
| سمة المتحكّم المشتركة (MELIS_KEY، denyUnlessAccess، json/error/tr) | `src/Controller/McqReactApiTrait.php` |
| list/get/save/preview/evaluate/delete لاختبارات MCQ | `src/Controller/MelisReactApiMcqController.php` |
| الأسئلة + الإجابات + السلة + السحب العشوائي | `src/Controller/MelisReactApiMcqQuestionController.php` |
| مجموعات MCQ | `src/Controller/MelisReactApiMcqGroupController.php` |
| فئات الأسئلة | `src/Controller/MelisReactApiMcqCategoryController.php` |
| مصدر لبنة React (Vite IIFE) | `ui-react/src/` (`brick.tsx`، `McqPage.tsx`، `McqBuilder.tsx`، `QuestionEditor.tsx`، `mcq-api.ts`، …) |
| حزمة اللبنة المبنيّة + الملف التعريفي | `public/ui-react/{brick.js, brick.manifest.json}` |
| الأداة القديمة (الشجرة، علامات التبويب، DataTables، العروض، JS) | `config/app.interface.php`، `config/app.tools.php`، `src/Controller/`، `view/`، `public/js/` |

انظر أيضًا: [melis-cms-mcq-engine](/legacy/reference/modules/melis-cms-mcq-engine)،
[melis-cms-tags](/legacy/reference/modules/melis-cms-tags)،
[melis-cms](/legacy/reference/modules/melis-cms)،
[melis-core](/legacy/reference/modules/melis-core)
