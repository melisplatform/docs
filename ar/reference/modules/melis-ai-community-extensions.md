# MelisAICommunityExtensions

> يُدمج توليد الذكاء الاصطناعي داخل واجهات التحرير القائمة في نظام إدارة المحتوى — مُنشئ القوالب المصغّرة، ومُنشئ محتوى الأخبار، وأزرار الذكاء الاصطناعي في مناطق السحب والإفلات. في الواجهة الخلفية المبنية بـ React، يأتي على هيئة لبنة امتداد (حقن في المضيف) دون صفحة خاصة به. الحزمة `melisplatform/melis-ai-community-extensions`.

## الغرض

يُعدّ MelisAICommunityExtensions طبقة تطبيقية فوق مجموعة MelisAI تربط توليد الذكاء الاصطناعي مباشرةً بواجهات التحرير القائمة. يسجّل مثيلين مُهيّأين مسبقًا (`minitemplatecreator` و`newscontentcreator`)، ومجموعة أدوات MCP، ومجموعة من مستمعي الأحداث التي تدير دورة حياة أصول الواجهة الأمامية المولّدة بالذكاء الاصطناعي (CSS وJS والصور). ليس له **شاشة أداة مستقلة**؛ بل يحقن أزرار **Generate with AI** ونوافذ الدردشة الحوارية داخل مدير القوالب المصغّرة، ومحرّر الأخبار، ومناطق السحب والإفلات في الصفحات. أمّا دردشة الذكاء الاصطناعي نفسها فتُقدَّم عبر MelisAI / MelisAIEngine — ولا يوفّر هذا الوحدة سوى واجهة المستخدم المحيطة وتوصيلات الدخول والخروج.

## تفعيله

أضِفه إلى `config/melis.module.load.php`:

```php
return [
    'MelisAICommunityExtensions',
];
```

يتطلّب `melisplatform/melis-ai`. شغّل dbdeploy بعد التفعيل — إذ تُزرع الوحدة صفوف الوكيل/المثيل الخاصة بـ `minitemplatecreator` و`newscontentcreator` في جداول محرّك MelisAI (`dbdeploy: true`). يتكامل مع MelisCms وMelisCmsNews.

## موقعه في الواجهة الخلفية المبنية بـ React

لبنة React هي **لبنة امتداد / حقن في المضيف**: لا ترسم أي صفحة ولا تضيف أي مدخل في الشريط الجانبي. عند التحميل تسجّل **نقطتَي امتداد للمضيف** على `window` تستدعيهما صفحات React الخاصة بالوحدات الأخرى لعرض زر *Generate with AI* داخل السياق، إضافةً إلى أداة `Header` واحدة مثبّتة دائمًا (`MiniTemplateAiDialogHost`) تُرسي نافذة تحرير الصفحة الحوارية فوق إطارات التحرير القديمة.

ولأنه لا يمتلك مسارًا (route)، فليس هناك ما تنتقل إليه — بل تلتقيه *داخل أدوات أخرى*:

- **محرّر الأخبار** (MelisCmsNews) ← تبويب **Texts** ← زر لكل فقرة.
- **مدير القوالب المصغّرة** (MelisCms) ← حقل *Template's HTML* ← زر.
- **تحرير الصفحة** (السحب والإفلات في MelisCms) ← زر إضافة المنطقة / أداة وسم HTML.

**مشروط بتفعيل وحدتين.** لا تظهر الأزرار إلا إذا كانت كلٌّ من `MelisAICommunityExtensions` و`MelisAI` مُفعّلة (يُتحقّق من ذلك آنيًا عبر `__melisIsModuleActive` الخاص بالمضيف، والمدعوم بـ `GET /melis/react-api/react-modules`). ووجود MelisAI مطلوب لأنه هو من يقدّم الدردشة؛ فإذا عُطّلت أيٌّ من الوحدتين في أثناء الجلسة اختفت الأزرار دون إعادة تحميل. لا تُسهم اللبنة بأي **عقدة قدرة** (capability node) — فالظهور مرهون بحتًا بفحص الوحدتين هذا.

## واجهات التحرير في الواجهة الخلفية

تُوسَّع ثلاث واجهات تحرير. في كلٍّ منها، يفتح زر ذكاء اصطناعي دردشةً محصورة النطاق، ثم تُكتب النتيجة مجددًا في الحقل الصحيح.

### مُنشئ القوالب المصغّرة بالذكاء الاصطناعي

في مدير القوالب المصغّرة، يحمل حقل *Template's HTML* زر **Generate with AI** الذي تعرضه نقطة الامتداد `renderHtmlActions()`. يفتح نافذة حوارية بملء النافذة: **دردشة الذكاء الاصطناعي وقائمة القوالب الموجودة على اليسار، والمعاينة الحيّة على اليمين** (تنطوي اللوحتان إلى تبويبَين مجزّأين *AI & Templates / Preview* عند العروض الضيّقة). تستخدم الدردشة المثيل `minitemplatecreator`، وتبدأ من جديد عند كل فتح (`clearSession`)، وتُعيد جلب هيكل الموقع الحقيقي عند كل نتيجة من الذكاء الاصطناعي بحيث ينعكس ما كُتب حديثًا من CSS/JS.

![مدير القوالب المصغّرة، قائمة خاصة بكل موقع مع نقطة دخول Generate with AI](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-list.png)

![دردشة minitemplatecreator وهي تولّد قالبًا، مُعايَنًا على هيكل الموقع الحقيقي](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-createwithai.png)

يُظهر كل صف في قائمة القوالب **أيقونة Melis-AI**: انقرها لتوليد قالب جديد باستخدام ذلك القالب مرجعًا أساسيًا (تُعاد الدردشة مزوّدةً بترميز القالب المحدّد). ويلتقط زر **Insert** صورة مصغّرة بصيغة PNG للمعاينة (html2canvas) ويملأ النموذج؛ ثم يحفظه زر الإرسال الخاص بالنموذج.

![أيقونة Melis-AI على صف قالب — نوّع قالبًا موجودًا أو كرّره بالذكاء الاصطناعي](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-duplicatewithai.png)

![نموذج Add mini-template — زر Generate with AI بجوار حقل HTML](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-addminitpl.png)

### مُنشئ محتوى الأخبار

في تبويب **Texts** بمحرّر **الأخبار**، تحصل كل **Paragraph** على زر **Generate with AI** (لكل لغة) تعرضه نقطة الامتداد `renderParagraphActions()`. يفتح نافذةً حوارية مُدمجة بدردشة `newscontentcreator`، **محصورة النطاق بالمقال** (مزوّدة بالعنوان والعنوان الفرعي وبقية الفقرات وصور المقال). ويحلّ الجواب محلّ نص تلك الفقرة ويضع عليها علامة التحقّق. وتُعزل الجلسات لكل مقال عبر مُعرّف مثيل `newscontentcreator|<newsId>`.

![تبويب News Texts — يحمل شريط رأس كل فقرة إجراء Generate with AI](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-news-edit-tab-texts.png)

![دردشة newscontentcreator، وهي مُدركة لسياق المقال](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-news-edit-tab-texts-aicreator.png)

### Generate with AI في مناطق السحب والإفلات

عند تحرير صفحة في نظام إدارة المحتوى، تحصل **مناطق السحب والإفلات** الفارغة (وأدوات وسم HTML) على زر **Generate with AI** محقون. ولأنّ تحرير الصفحة يجري داخل إطار iframe قديم أسفل هيكل React، يطلب الزر من مضيف React فتح *نفس* النافذة الحوارية للقالب المصغّر المذكورة أعلاه. وعند القبول، تُعرض ثلاثة خيارات للتثبيت: **Close**، أو **Insert** (الإفلات في هذه المنطقة فقط)، أو **Save & Insert** (الإفلات مع ترقية الكتلة إلى قالب مصغّر دائم قابل لإعادة الاستخدام).

![منطقة سحب وإفلات فارغة مع زر Generate with AI المحقون](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-1.png)

![كتلة كاملة مُنسّقة مولّدة مباشرةً داخل منطقة الصفحة](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-2.png)

![خيار التثبيت Close / Insert / Save & Insert لكتلة مولّدة](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-differentinserts.png)

## اللبنة

`ui-react/` هي مكتبة Vite بصيغة IIFE (الاسم `MelisAiCommunityExtensionsBrick`، والمخرج `public/ui-react/brick.js`). وتُخرَج React وreact-dom وreact-router-dom إلى المتغيّرات العامة للمضيف؛ ويستورد الاسم المستعار `@melis-ai-engine` مكوّن الدردشة المشترك `AiChatContainer`.

| الملف | الدور |
| --- | --- |
| `src/brick.tsx` | يسجّل نقطتَي الامتداد + الـ `Header`؛ ويحقن Tailwind مرةً واحدة. |
| `src/NewsAiExtension.tsx` | `renderParagraphActions()` ← زر لكل فقرة + نافذة حوارية (المثيل `newscontentcreator`). |
| `src/MiniTemplateAiExtension.tsx` | `renderHtmlActions()` ← النافذة الحوارية `MiniTemplateAiDialog` بملء النافذة (دردشة + قائمة + معاينة؛ Insert / Save & Insert؛ صورة مصغّرة بـ html2canvas). |
| `src/MiniTemplateAiDialogHost.tsx` | مِرساة الـ `Header` لأجل **تحرير الصفحة**؛ تستمع للحدث `melis-ai-minitemplate-open` وتُثبّت النافذة الحوارية. |

تسجّل اللبنة **دون أي `Component`** و**دون أي `Sidebar`** — بل بنقاط امتداد محروسة ومِرساة `Header` فقط:

```ts
window.__melisNewsExtensions.renderParagraphActions = /* guarded by isModuleActive() */
window.__melisMiniTemplateExtensions.renderHtmlActions = /* guarded by isModuleActive() */
window.__melisRegisterBrick?.({ id: 'melis-ai-community-extensions', Header: MiniTemplateAiDialogHost })
```

## نقاط النهاية التي تستدعيها اللبنة

لا تمتلك اللبنة أي **`config/react-api.php`**. فهي تستهلك نقاط نهاية مملوكة لوحدات أخرى، إضافةً إلى إجراء MVC قديم واحد خاص بها:

| الاستدعاء | المالك |
| --- | --- |
| `GET /melis/react-api/cms-mini-templates?site=<m>&limit=9999` | MelisCms (قائمة القوالب) |
| `GET /melis/react-api/cms-mini-templates/item?site=<m>&name=<n>` | MelisCms (ترميز HTML لقالب واحد) |
| `GET /melis/MelisAICommunityExtensions/MiniTemplate/getMiniTemplatePreviewShell?siteModule=<m>` | هذه الوحدة (MVC قديم؛ يعيد ترميز HTML لهيكل الموقع) |
| حركة التشغيل/الخروج لـ `AiChatContainer` | MelisAI / MelisAIEngine |

يعود جواب الدردشة إلى حقل المضيف عبر ردّ نداء (callback) على `window` مُعلَن في معطيات الخروج (`masse_exit_js_callback`): `__melisNewsAiCallback_<paraIdx>` للأخبار، و`__melisMiniTemplateAiCallback` للقوالب المصغّرة.

## التكامل مع المضيف (جسر تحرير الصفحة)

يجري تحرير الصفحة داخل عدّة إطارات أسفل هيكل React، لذا يضبط `MiniTemplateAiDialogHost` القيمة `window.__melisAiMiniTemplateDialogReady = true` ويستمع للحدث `melis-ai-minitemplate-open`. وتشغّل الصفحة قيد التحرير الملف `public/js/minitemplate/react-bridge.js`، الذي يمشي **صعودًا في سلسلة الإطارات** بحثًا عن `__melisAiMiniTemplateDialogReady`؛ فإذا وجده أطلق حدث الفتح مع ردّي النداء `onInsert` / `onSaveInsert` من المصدر نفسه (same-origin). وإذا لم يُعثر على مضيف React (النسخة القديمة `/melis`)، يرتدّ الجسر إلى النافذة الحوارية التاريخية في Bootstrap — دون أي تغيير هناك.

أمّا الأدوات القديمة المعروضة في عرض **"Old"** ضمن React، فيسجّل الملف `config/module.config.php` القيمة `melis_react_override.toolpage_extensions` ← `PluginViewToolPageExtension`، التي تحقن `tool.js` / `style.css` الخاصَّين بهذه الوحدة كي تجد ردود النداء JavaScript المطعّمة على أدوات MelisCms / MelisCmsNews متغيّراتها العامة.

## مستمعو الأحداث

| المستمِع | الحدث | الأثر |
| --- | --- | --- |
| `…TinyMCEConfigurationListener` | `meliscore_tinymce_config` | يوجّه إضافة TinyMCE المسمّاة `minitemplate` إلى JavaScript الخاص بهذه الوحدة. |
| `…CreateMiniTemplateListener` | `meliscms_mini_template_manager_create_end` | ينقل ملفات CSS/JS/الصور المؤقتة إلى التخزين الدائم؛ ويعيد تسمية ملف JS التمهيدي لكل قالب. |
| `…PublishPageListener` | `meliscms_page_publish_start` | يرقّي الأصول المؤقتة التي تشير إليها صفحة منشورة؛ ويحدّث `page_content`. |
| `…SanitizeSavedPluginHtmlListener` | `meliscms_page_savesession_plugin_start` | ينظّف ترميز التشغيل للكاروسيل/المنزلق (بقايا Owl/Slick/Swiper) قبل الحفظ. |
| `…DeleteMiniTemplateAssetsListener` | `meliscms_mini_template_manager_delete_end` | يحذف CSS/JS/الصور الخاصة بالقالب. |
| `…AttachAIGeneratedCssListener` | `MvcEvent::EVENT_FINISH` (الواجهة الأمامية + الخلفية) | يحقن CSS/JS المولّد بالذكاء الاصطناعي في الصفحات المعروضة. |
| `…InjectDndAiButtonListener` | `MvcEvent::EVENT_FINISH` | يحقن زر **Generate with AI** في مناطق السحب والإفلات القديمة. |

كما تسجّل الوحدة `MelisPluginRendererOverride` بحيث تُحقن أصول الذكاء الاصطناعي بشكل صحيح في أثناء عرض الإضافة (plugin).

## خادم MCP

يُسجَّل خادم MCP بصيغة stdio باسم `minitemplate_creator` (نقطة الدخول `mcp/minitemplatecreator/bin/server.php`) في `config['mcp']['servers']`. والأدوات أدناه مُعلَنة بـ `mcp: true`:

| الأداة | المعطيات | الغرض |
| --- | --- | --- |
| `readSiteAssets` | `siteModule`، `templateRequest` | تعيد ملفات CSS/JS/العرض ذات الصلة الخاصة بالموقع كي يطابق الذكاء الاصطناعي التصميم الحقيقي. |
| `getSitePublicUrl` | `siteModule` | تعيد عنوان URL/النطاق العام للموقع لأجل الفحص البصري قبل التوليد. |
| `uploadMinitemplateImages` | `siteModule`، `image`، `filename` | تحفظ صورة (base64/data-URL/HTTP) ضمن مجلّد الذكاء الاصطناعي المؤقت وتعيد مسار ويب لأجل `<img src>`. |
| `renderMinitemplatePreview` | `siteModule` | تُطلق معاينة المحرّر للقالب المولّد. |

يمتلك الوكيل `minitemplatecreator` أيضًا أدوات نظام الملفات الخاصة بالمحرّك (`createFile` / `readFile` / `updateFiles` / …) في قائمة السماح الخاصة به. وفي أثناء المحادثة، تسجّل نافذة React الحوارية القيمة `window.melisReactActionMap.preview_minitemplate` كي يتمكّن المحرّك من دفع كتلة `html` المولّدة إلى المعاينة الحيّة عند عودة `render_minitemplate_preview`.

## جداول قاعدة البيانات

لا تُنشئ هذه الوحدة أي جداول خاصة بها. وتُدخِل دلتات dbdeploy الخاصة بها صفوفًا في جداول مملوكة لـ `melis-ai`:

| الجدول | يحتوي على |
| --- | --- |
| `melis_ai_instances` | المثيلان المزروعان `minitemplatecreator` و`newscontentcreator`. |
| `melis_ai_agents` | الوكيلان المزروعان للمثيلين. |

في وقت التشغيل، يُصل إلى بيانات الأخبار عبر `NewsTable` (‏`getNewsData($newsId)`)، الذي يضم جدول الموقع لاستنتاج `siteModule` اللازم لوضع الصور المولّدة.

## الملفات الأساسية

| الجانب | المسار |
| --- | --- |
| إعداد الوحدة (مسار MVC، toolpage_extensions) | `vendor/melisplatform/melis-ai-community-extensions/config/module.config.php` |
| مصدر اللبنة | `vendor/melisplatform/melis-ai-community-extensions/ui-react/src/` |
| اللبنة المبنية | `vendor/melisplatform/melis-ai-community-extensions/public/ui-react/{brick.js, brick.manifest.json}` |
| جسر إطار تحرير الصفحة | `vendor/melisplatform/melis-ai-community-extensions/public/js/minitemplate/react-bridge.js` |
| إعلان أدوات MCP | `vendor/melisplatform/melis-ai-community-extensions/config/mcp.tools.php` |
| متحكّم القالب المصغّر | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/MiniTemplateController.php` |
| متحكّم الأخبار | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` |
| حاقن عرض "Old" | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/React/PluginViewToolPageExtension.php` |
| المستمعون | `vendor/melisplatform/melis-ai-community-extensions/src/Listener/` |
| مساعِد زر Generate-with-AI | `vendor/melisplatform/melis-ai-community-extensions/src/View/Helper/MelisGenerateWithAIBtnHelper.php` |
| بوّابة جدول الأخبار | `vendor/melisplatform/melis-ai-community-extensions/src/Model/Tables/NewsTable.php` |
| نقطة دخول خادم MCP | `vendor/melisplatform/melis-ai-community-extensions/mcp/minitemplatecreator/bin/server.php` |
| مجلّد أصول الذكاء الاصطناعي | `public/miniTemplatesTinyMce/AI/{siteModule}/{temp\|css\|js\|images}/` |
| دلتات التثبيت (زرع الوكلاء) | `vendor/melisplatform/melis-ai-community-extensions/install/dbdeploy/` |

انظر أيضًا: [MelisAIEngine](/ar/reference/modules/melis-ai-engine)، [MelisAI](/ar/reference/modules/melis-ai)، [MelisAIToolCreator](/ar/reference/modules/melis-ai-tool-creator)، [MelisCms](/ar/reference/modules/melis-cms)، [MelisCmsNews](/ar/reference/modules/melis-cms-news)
