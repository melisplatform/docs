# MelisCmsBlog

> نظام مدوّنة لمواقع Melis، مع واجهة إدارة خلفية أصلية بلغة React لإدارة المنشورات وثلاثة
> ملحقات عرض للواجهة الأمامية. الحزمة `melisplatform/melis-cms-blog`.

## الغرض

يوفّر MelisCmsBlog أداة **Blog** في الواجهة الخلفية حيث ينشئ المحرّرون ويديرون منشورات مدوّنة
متعددة اللغات (العناوين، العنوان الفرعي، حتى أربع فقرات نصية غنية، الصور، المستندات، جدولة
النشر/إلغاء النشر، شريط تمرير اختياري، بالإضافة إلى عنوان URL خاص بتحسين محركات البحث + الوسوم الوصفية).
تُعرض المنشورات في الواجهة الأمامية عبر ثلاثة ملحقات قوالب جاهزة للاستخدام: عرض موجز لأحدث المنشورات،
وقائمة منشورات مقسّمة إلى صفحات وقابلة للتصفية، وعرض تفاصيل لمنشور واحد. تُدار عناوين URL الملائمة
لتحسين محركات البحث، والوسوم الوصفية لكل منشور، وعمليات إعادة التوجيه التلقائية 301 إلى عنوان URL
الأساسي، من خلال مستمعي أحداث مخصّصين.

في الواجهة الخلفية بلغة React ضمن الإصدار v6 (`/melis-react`)، تقدّم الوحدة **لبنة أصلية بالكامل بلغة
React** — واجهة React حقيقية لعرض المنشورات وتحريرها، مدعومة بطبقة JSON عبر `react-api` — مع مبدّل
**New / Old** يمكنه الرجوع إلى الأداة القديمة داخل إطار iframe. وهي التوأم المعماري لـ MelisCmsNews.
لم تتغيّر بنية العمل والخدمات ونموذج البيانات وتوجيه SEO وملحقات الواجهة الأمامية عن الإصدار v5؛
الجديد هو طبقة العرض في الواجهة الخلفية فقط.

## تفعيلها

أضف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCmsBlog',
];
```

يتطلب `melis-core` و`melis-cms`، وإصدار PHP `^8.1|^8.3|^8.4`. تُفعَّل التكاملات الاختيارية عند تثبيت
`MelisCmsComments` أو `MelisCmsSlider` أو `MelisSmallBusiness` أو `MelisCmsUserAccount` أيضًا. تظهر
اللبنة في الشريط الجانبي لـ React فقط إذا كانت الوحدة موجودة (اكتشاف اللبنات المعياري عبر
`GET /melis/react-api/react-modules`).

## الخدمات الأساسية

مسجّلة كأسماء مستعارة ضمن `service_manager` في `config/module.config.php`. تعيد وحدة تحكّم React استخدام
قواعد العمل نفسها في جانب الخادم، مما يحافظ على التكافؤ مع الأداة القديمة.

| الاسم المستعار للخدمة | الدور |
| --- | --- |
| `MelisCmsBlogService` | خدمة CRUD/الاستعلام الرئيسية. قراءة المنشورات وإنشاؤها وتحديثها وحذفها؛ والاستعلام حسب الموقع واللغة والنطاق الزمني والحالة والمؤلف. تُطلق كل دالة أحداث `*_start` / `*_end` عبر `MelisEngineGeneralService`. |

الأسماء المستعارة لبوابات الجداول: `MelisCmsBlogTable`، `MelisCmsBlogTextsTable`.

## جداول قاعدة البيانات

البنية الأساسية في `install/sql/setup_structure.sql`؛ عمليات الترحيل في `install/dbdeploy/`.

| الجدول | يحتوي على |
| --- | --- |
| `melis_cms_blog` | صف المنشور الأساسي: الحالة، تواريخ النشر/إلغاء النشر، معرّف الموقع، image1-3، documents1-3، معرّف شريط التمرير |
| `melis_cms_blog_texts` | النصوص لكل لغة: العنوان، العنوان الفرعي، الفقرات 1-4، معرّف اللغة، عنوان URL الخاص بـ SEO، عنوان/وصف الوسوم الوصفية لـ SEO، حساب المؤلف |

> على عكس MelisCmsNews، لا تحتوي المدوّنة على **أي فئات ولا وسوم** — لا جدول ربط ولا دعم لـ
> `melis_cms_tag*`.

## الواجهة الخلفية بلغة React

الشريط الجانبي ← مجموعة **MelisCms** ← **Blog** (`fa-rss`). تُفتح اللبنة كعلامة تبويب علوية باسم
**Blog**، وترسم شريط علامات تبويب فرعية خاصًا بها داخل الأداة: علامة تبويب فرعية لكل منشور مفتوح،
بالإضافة إلى زر Back to the list. يبقى كل منشور مفتوح مُحمَّلاً، لذا يكون التبديل بين المنشورات فوريًا.

### قائمة المنشورات

تعرض قائمة React كل منشور على المنصة، مع **بطاقات مؤشرات أداء (KPI)** (إجمالي المنشورات، المنشورة،
غير المنشورة)، ومربع **بحث** مع مرشّحات **All / Active / Inactive**، ومدير **Columns**
(إخفاء/إعادة ترتيب)، وزر **Export** (xlsx/csv)، وتقسيم صفحات من نوع keyset، و**تحرير** / **حذف**
لكل صف. انقر على رأس عمود لفرزه. يبدأ **+ New post** محرّرًا فارغًا.

![قائمة مدوّنة React: بطاقات مؤشرات الأداء (إجمالي المنشورات / المنشورة / غير المنشورة)، مربع بحث مع مرشّحات All / Active / Inactive، مدير Columns، زر Export، مبدّل New/Old وزر "+ New post"، مع إجراءات تحرير وحذف لكل صف](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-list.png)

يبدّل مبدّل **New / Old** (أعلى اليمين) القائمة — والقائمة فقط — بين واجهة React والأداة القديمة
المعروضة داخل إطار iframe (`/melis/react-tool-page?key=meliscmsblog_left_menu`)، حتى يمكن مقارنة
الواجهتين جنبًا إلى جنب.

### محرّر المنشور

حيث كانت الأداة القديمة تستخدم علامات تبويب علوية منفصلة (Properties / Texts / Medias)، فإن محرّر
React عبارة عن صفحة واحدة قابلة للتمرير: **عمود محتوى** عريض على اليسار و**شريط جانبي للإعدادات**
قابل للطي على اليمين. يحتوي **مبدّل لغة** في الأعلى على كل الترجمات دفعة واحدة — تُحفظ جميع اللغات
معًا في استدعاء واحد.

**عمود المحتوى**

- **Title / Subtitle** — نص عادي، لكل لغة.

![مبدّل اللغة في محرّر المنشور (English / Français / Español)، وحقلا Title وSubtitle، وقسم BODY الذي يحتوي حتى 4 فقرات نصية غنية (TinyMCE) — كل منها في بطاقة خاصة بها قابلة لإعادة الترتيب بالسحب مع عدّاد فقرات](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-texts.png)

- **Body** — حتى **4 فقرات نصية غنية (TinyMCE)** (`cblog_paragraph1..4`)، قابلة لإعادة الترتيب بالسحب،
  مع **+ Add paragraph (max. 4)**.
- **Media** — حتى **3 صور** (Replace / Remove لكل خانة) وحتى **3 مرفقات ملفات**.
  تظهر فقط **بعد الحفظ الأول**، لأن التحميلات تتطلب وجود المنشور أولاً.

![منطقة Media — الصور (بحد أقصى 3، مع Replace/Remove لكل خانة) ومرفقات الملفات (بحد أقصى 3، "Click to attach a file")](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-medias.png)

- **Comments** — لوحة إشراف أصلية (إضافة/تحرير، موافقة/رفض/حذف، مقسّمة إلى صفحات)، تظهر فقط
  عند تثبيت **MelisCmsComments**.

**الشريط الجانبي للإعدادات** (أقسام قابلة للطي)

- **Status** — مبدّل Published / Unpublished، بالإضافة إلى زر **Workflow** (التحقق) عند تفعيل
  **MelisSmallBusiness**.

![الجزء العلوي من الشريط الجانبي للإعدادات — مبدّل Published مع زر Workflow، ومنتقيا تاريخ/وقت Publish on / Unpublish on ومنتقي Site](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-properties.png)
- **Publication** — منتقيا تاريخ/وقت **Publish on** / **Unpublish on**.
- **Site** — الموقع الذي ينتمي إليه المنشور (مطلوب).
- **Author** — منتقي مؤلف، يظهر فقط عندما يوفّر **MelisCmsUserAccount** العمود
  `cblog_author_account`.
- **Comments validation** — مبدّل "تبقى تعليقات الواجهة الأمامية مخفية حتى تتم الموافقة عليها"،
  بالإضافة إلى مفتاح خاص بالمدوّنة "Account required to comment"، يظهر عند تفعيل **MelisCmsComments**.
- **SEO** — Meta title وMeta description و**URL** ملائم، لكل لغة (مخزَّن في جدول النصوص،
  وليس في جدول SEO مخصّص).
- **Slider** — شريط تمرير يُعرض مع المنشور، يظهر فقط عند تفعيل **MelisCmsSlider**.

تُكتشف الأقسام الاختيارية عند التشغيل بحسب توفّر الميزة (نقاط النهاية المصاحبة تُرجع 404 بسلاسة؛ تُقرأ
حالة الوحدة من `/melis/react-api/react-modules`)، لذا فإن غياب وحدة مصاحبة لا يعطّل الحفظ أبدًا.
يحفظ **Save** (أعلى اليمين) كل ترجمة وSEO والتواريخ وروابط الوسائط وشريط التمرير والمؤلف في استدعاء
واحد. ثم تعرض منطقة **Preview** المنشور المحفوظ في صفحة تفاصيله داخل إطار iframe.

![الشريط الجانبي للإعدادات الموسّع — مبدّل Comments validation، والمبدّل الخاص بالمدوّنة "Account required to comment"، ثم قسما SEO وSlider القابلان للطي](/screenshots/react/melis-cms-blog/meliscmsblog-tool-blog-edit-tab-properties-with-overrides.png)

## واجهة React API

توجد المسارات في `config/react-api.php` (مدمجة عبر `MelisCmsBlog\Module::getConfig()`)، ومركّبة تحت
`/melis/react-api/…`. وحدة التحكّم: `MelisCmsBlog\Controller\MelisCmsBlogReactApiController`. العقد
`{ success, data, error }`؛ يرسل كل طلب جلب `X-Requested-With: XMLHttpRequest` و
`credentials:'include'`.

| الطريقة وعنوان URL | الغرض |
| --- | --- |
| `GET /blog` | سرد المنشورات (keyset: `limit`، `search`، `status`، `siteId`، `sort`، `dir`، `after`) ← `{items,total,nextCursor}` |
| `GET /blog/stats` | مؤشرات الأداء `{total, published, draft}` |
| `GET /blog/:id` | منشور واحد (`?langId=` ← تلك الترجمة؛ الحقول الأساسية + الفقرات + الوسائط + SEO + شريط التمرير/المؤلف) |
| `POST /blog/save` | إنشاء / تحديث (كل الترجمات، الحالة، siteId، التواريخ، sliderId، authorId، أعلام التعليقات، seo) |
| `DELETE /blog/delete/:id` | حذف منشور ونصوصه |
| `GET /blog/preview/:id` | عنوان URL للمعاينة + قائمة صفحات BLOG_DETAIL لموقع المنشور |
| `GET /blog/users` | مستخدمو الواجهة الأمامية كمؤلفين (`MelisCmsUserAccount`) |
| `GET /blog/:id/comments` | تعليقات منشور (404 إذا كان `MelisCmsComments` معطّلاً) |
| `POST /blog/comments/save` | إضافة/تحرير تعليق |
| `POST /blog/comments/approve/:cid` · `/refuse/:cid` | الإشراف على تعليق |
| `DELETE /blog/comments/delete/:cid` | حذف تعليق |
| `GET /blog-sites` | قائمة المواقع |
| `GET /blog-languages` | لغات CMS (`melis_cms_lang`) |

**لا توجد مسارات `/blog/categories` أو `/blog/tags`**. تأتي أشرطة التمرير من مسار اللبنة الخاص بـ
MelisCmsSlider نفسه `GET /melis/react-api/sliders`. تعيد عمليات تحميل/إزالة الوسائط والبحث عن مؤلف
التعليق استخدام نقاط النهاية **القديمة** (دون أي تغيير في الخلفية):

- `POST /melis/MelisCmsBlog/MelisCmsBlog/saveFileForm` — تحميل صورة/ملف متعدد الأجزاء
- `POST /melis/MelisCmsBlog/MelisCmsBlog/removeAttachFile` — يمسح العمود ويحذف الملف

### القدرات

مُعلَنة في `config/react.capabilities.php` تحت العقدة الحاملة للصلاحيات `meliscmsblog_left_menu`:

```
meliscmsblog_left_menu
└─ actions: list · create · edit · delete · export
```

تتحكّم React في بوابة واجهة المستخدم عبر `window.__melisUseCaps('meliscmsblog_left_menu').can(cap)`
(New post ← `create`، Export ← `export`، إجراءات الصف ← `edit`/`delete`، محتوى القائمة ← `list`).
في جانب الخادم، يُحمى كل إجراء في وحدة التحكّم بواسطة `denyUnlessAccess()` (المصادقة + `canAccess`)
ثم `denyUnlessCan(cap)`.

## بيان اللبنة (Brick manifest)

`public/ui-react/brick.manifest.json` (حزمة Vite IIFE، مع تصدير React/ReactDOM إلى الكائنات العامة للمضيف):

```json
{ "id": "blog", "route": "/melis-cms/blog", "label": "Blog",
  "forwardKey": "MelisCmsBlog/MelisCmsBlogList", "melisKey": "meliscmsblog_left_menu",
  "entry": "brick.js", "persistent": true, "subTabs": true }
```

يربط `forwardKey` عقدة القائمة اليسرى القديمة بمسار الشجرة `/melis-cms/blog` (قابل للربط العميق باسم
`/melis-cms/blog/:id`، تستخدمه أيقونة عين Workflow). يعني `subTabs: true` أن اللبنة ترسم شريط علامات
التبويب الفرعية الخاص بها داخل الأداة. عند تفعيل MelisSmallBusiness، يعرض قسم Status نافذة
`window.__melisWorkflowModal` المشتركة مع `ctx.wfType = 'BLOG'`. يمكن لوحدة اختيارية إضافة إجراءات لكل
فقرة عبر `window.__melisBlogExtensions.renderParagraphActions(...)`.

## الواجهة الأمامية

ثلاثة ملحقات قوالب تمتدّ من `MelisTemplatingPlugin`، لكل منها ملحق وحدة تحكّم وملف تكوين تحت
`config/plugins/`. تقرأ جميعها معرّف المنشور النشط من معلمة الاستعلام `?blogId`. في محرّر صفحات React،
تُسحب من مجموعة **Melis Cms Blog** في لوحة الملحقات، ويفتح كل منها نافذة التكوين الكلاسيكية ذات علامات
التبويب.

![محرّر صفحات React مع لوحة الملحقات مفتوحة — مجموعة "Melis Cms Blog": Latest blog posts، Blog post list، Blog post details](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugins-menu.png)

| فئة الملحق | مفتاح التكوين | العرض | علامات تبويب التكوين |
| --- | --- | --- | --- |
| `MelisCmsBlogLatestBlogPlugin` | `MelisCmsBlogLatestBlog` | `MelisCmsBlog/latest-blog` | Properties، Filters |
| `MelisCmsBlogListBlogPlugin` | `MelisCmsBlogListBlog` | `MelisCmsBlog/blog-list` | Properties، Pagination، Filters |
| `MelisCmsBlogShowBlogPlugin` | `MelisCmsBlogShowBlog` | `MelisCmsBlog/blog-details` | Properties |

معلمات تكوين الملحق: `template_path`، `site_id`، `pageIdBlog` (رابط صفحة التفاصيل)، `column`،
`order`، `limit`، `date_min`، `date_max`، `search`؛ بالإضافة إلى `nbPerPage` / `nbPageBeforeAfter`
(لقائمة المدوّنة فقط). يصفّي ملحق قائمة المدوّنة أيضًا حسب `?authorId`. يرجع ملحق تفاصيل المدوّنة إلى
أحدث منشور منشور عندما لا يوجد `blogId` في الطلب، ويدعم وضع المعاينة
(`renderMode === 'previewtab'`).

أعمدة الفرز المتاحة: `cblog_id`، `cblog_title`، `cblog_publish_date`، `cblog_creation_date`.

![ملحق قائمة المدوّنة ← Properties — القالب MelisCmsBlog/blog-list، الموقع وصفحة تفاصيل المدوّنة](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-bloglist-config-properties.png)

![ملحق أحدث المدوّنات ← Filters — الفرز (Blog publish date)، الترتيب، الحد، تاريخ From/To والبحث الافتراضي](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-latestblog-config-filters.png)

![ملحق تفاصيل المدوّنة ← Properties — القالب MelisCmsBlog/blog-details ومنتقي منشور افتراضي](/screenshots/react/melis-cms-blog/meliscmsblog-page-plugin-blogdetails-config-properties.png)

### توجيه SEO

تُقدَّم المنشورات عبر صفحة من النوع **`BLOG_DETAIL`** تحمل ملحق تفاصيل المدوّنة، عند `cblog_seo_url`
الخاص بالمنشور. ينفّذ أربعة مستمعين خط أنابيب SEO الكامل:

| المستمع | الحدث | الدور |
| --- | --- | --- |
| `MelisCmsBlogSEOReformatToRoutePageUrlListener` | `EVENT_ROUTE` | يطابق عنوان URL الخاص بـ SEO ويبني مسارًا إلى صفحة BLOG_DETAIL |
| `MelisBlogSEODispatchRouterRegularUrlListener` | `EVENT_DISPATCH` | يعيد التوجيه 301 من عنوان URL غير أساسي إلى `cblog_seo_url` الخاص بالمنشور |
| `MelisCmsBlogRedirect301Listener` | `meliscmsblog_redirect_page` | يضبط الوسوم الوصفية لـ SEO الخاصة بالصفحة من حقول الوسوم الوصفية للمنشور |
| `MelisCmsBlogSEOMetaPageListener` | `EVENT_FINISH` | يعيد كتابة `<title>` / `<meta description>` المعروضين بالوسوم الوصفية لـ SEO الخاصة بالمنشور |

يسجّل `MelisCmsBlogPreviewTypeListener` نوع الصفحة **BLOG_DETAIL** في نموذج خصائص الصفحة
(الحدث `modify_page_properties_form_config`).

## مثال

```php
$blog = $this->getServiceManager()->get('MelisCmsBlogService');

// Latest 10 published posts for site 1, newest first:
$list = $blog->getBlogList([
    'siteId'   => 1,
    'langId'   => 1,
    'limit'    => 10,
    'orderBy'  => 'cblog_publish_date',
    'orderDir' => 'DESC',
]);

// Fetch one post (with its texts for a given language):
$post = $blog->getBlogById($blogId, $langId);
$txt  = $blog->getPostText($blogId);

// Create / update / delete:
$id = $blog->saveBlog(['cblog_site_id' => 1, 'cblog_status' => 1, ...], $blogId); // null → create
$blog->deleteBlogById($blogId);  // also removes its texts

// Utility:
$pages  = $blog->getBlogDetailsPagesBySite($siteId);       // BLOG_DETAIL-type pages for a site
$isDupe = $blog->checkSeoUrlDuplication($seoUrl, $blogId); // SEO URL uniqueness check
$slug   = $blog->cleanURL($title);                         // slugify (handles accents)

// Posts by a front-account author:
$posts  = $blog->getBlogListByAuthorId($authorId);
```

## مستمعون آخرون

| المستمع | الحدث | الغرض |
| --- | --- | --- |
| `MelisCmsBlogSliderDeletedListener` | `meliscmsslider_delete_slider_end` | يزيل شريط تمرير محذوف من المنشورات (`cblog_slider_id`) |
| `MelisCmsBlogGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | GDPR: يضبط `cblog_author_account` على null لحساب مستخدم محذوف |
| `MelisCmsBlogServiceMicroServiceListener` | `melis_core_microservice_amend_data` | يحوّل مسارات الصور إلى عناوين URL مطلقة في نتائج `getBlogList` لمخرجات API/الخدمات المصغّرة |
| `SiteMenuBlogDataListener` | `MelisFrontMenuPlugin_melistemplating_plugin_end` | يغذّي المنشورات (مجمّعة حسب الشهر/السنة) إلى ملحق قائمة الواجهة الأمامية |
| `MelisCmsBlogFlashMessengerListener` | `meliscmsblog_delete_blog_end`، `meliscmsblog_save_blog_*_end` | ملاحظات flash-messenger لإجراءات المدوّنة |

## الملفات الأساسية

| الشأن | المسار |
| --- | --- |
| تكوين الوحدة (الخدمات، البوابات، الملحقات) | `vendor/melisplatform/melis-cms-blog/config/module.config.php` |
| مسارات React API | `vendor/melisplatform/melis-cms-blog/config/react-api.php` |
| قدرات React | `vendor/melisplatform/melis-cms-blog/config/react.capabilities.php` |
| شجرة أداة الواجهة الخلفية (القديمة / عرض Old) | `vendor/melisplatform/melis-cms-blog/config/app.interface.php` |
| حقن علامة تبويب التعليقات | `vendor/melisplatform/melis-cms-blog/config/comments.config.php` |
| تكوينات الملحقات | `vendor/melisplatform/melis-cms-blog/config/plugins/` |
| الخدمة الرئيسية | `vendor/melisplatform/melis-cms-blog/src/Service/MelisCmsBlogService.php` |
| وحدة تحكّم React API | `vendor/melisplatform/melis-cms-blog/src/Controller/MelisCmsBlogReactApiController.php` |
| ملحقات الواجهة الأمامية | `vendor/melisplatform/melis-cms-blog/src/Controller/Plugin/` |
| المستمعون (SEO، GDPR، شريط التمرير، القائمة، flash) | `vendor/melisplatform/melis-cms-blog/src/Listener/` |
| مصدر لبنة React | `vendor/melisplatform/melis-cms-blog/ui-react/src/` |
| اللبنة المبنية + البيان | `vendor/melisplatform/melis-cms-blog/public/ui-react/` |
| ملف SQL للتثبيت | `vendor/melisplatform/melis-cms-blog/install/sql/setup_structure.sql` |

انظر أيضًا: [melis-cms](/ar/reference/modules/melis-cms)، [melis-front](/ar/reference/modules/melis-front)،
[melis-engine](/ar/reference/modules/melis-engine)، [melis-core](/ar/reference/modules/melis-core)،
[melis-cms-slider](/ar/reference/modules/melis-cms-slider)،
[melis-small-business](/ar/reference/modules/melis-small-business)
