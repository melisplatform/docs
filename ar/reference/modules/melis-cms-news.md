# MelisCmsNews

> نظام أخبار / مدوّنة لمواقع Melis، مع أداة تحرير في الواجهة الخلفية مبنية بتقنية React وثلاث إضافات للعرض في الواجهة الأمامية. الحزمة `melisplatform/melis-cms-news`.

## الغرض

يوفّر MelisCmsNews أداة **News** في الواجهة الخلفية حيث يكتب المحرّرون ويديرون مقالات الأخبار
متعددة اللغات (العناوين، الفقرات ذات النص المنسّق، الصور، المستندات، جدولة النشر / إلغاء النشر
وتحسين محركات البحث). تُعرض المقالات في الواجهة الأمامية عبر ثلاث إضافات قوالب جاهزة للاستخدام:
شارة لأحدث الأخبار، وقائمة أخبار مقسّمة إلى صفحات، وصفحة تفاصيل لمقال مفرد. تُعالَج عناوين URL
الملائمة لمحركات البحث ووسوم الميتا الخاصة بكل مقال تلقائياً عبر مستمعين مخصّصين.

في الإصدار Melis v6 تأتي الأداة بصفتها **لبنة أصيلة كاملة بتقنية React** في الواجهة الخلفية الجديدة
(`/melis-react`): واجهة React حقيقية لعرض المقالات وتحريرها، تستدعي طبقة JSON عبر `react-api`،
مع مبدّل **New / Old** يمكنه العودة إلى الأداة الكلاسيكية داخل إطار iframe. أما إطار العمل والخدمات
والأحداث والجداول وإضافات الواجهة الأمامية فتظل كما هي دون تغيير منذ الإصدار v5 — الطبقة الجديدة
وحدها هي طبقة العرض.

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCmsNews',
];
```

تتطلّب `melis-core` و`melis-engine` و`melis-front` و`melis-cms` (`^5.2`)، بالإضافة إلى
`laminas/laminas-paginator`. تُفعَّل عمليات التكامل الاختيارية عند تثبيت `MelisCmsSlider` أو
وحدة التصنيفات في Melis أو `MelisCmsTags` أو `MelisCmsUserAccount` (المؤلّفون) أو `MelisCmsComments`
أيضاً. لا تظهر لبنة React إلا أثناء وجود الوحدة في `melis.module.load.php` (اكتشاف اللبنات المعياري
عبر `GET /melis/react-api/react-modules`).

## الواجهة الخلفية بتقنية React

الشريط الجانبي الأيسر ← **Site Tools** ← **News** (`Actualités`). تفتح كتبويب علوي باسم **News**
يستضيف كل شيء عبر **تبويبات فرعية** داخل الأداة: قائمة المقالات، وتبويب فرعي لكل مقال مفتوح / جديد
مع المحرّر الكامل. يظل كل تبويب فرعي محمّلاً بحيث يكون التبديل بين المقالات فورياً. مسار الشجرة هو
`/melis-cms/news` (مع `/melis-cms/news/:id` للروابط المباشرة، مثل عين سير العمل Workflow).

### قائمة المقالات

![قائمة News بتقنية React — بطاقات مؤشرات الأداء (إجمالي المقالات / المنشورة / غير المنشورة)، ومربع بحث مع مرشّحات All / Active / Inactive، ومدير أعمدة، وزر تصدير، ومبدّل New/Old وزر "+ New article"، مع إجراءات تحرير وحذف لكل صف](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-list.png)

تعرض القائمة كل مقال على المنصّة، مع:

- **بطاقات مؤشرات الأداء** — إجمالي المقالات، المنشورة، غير المنشورة.
- **بحث** مع مرشّحات الحالة **All / Active / Inactive**، وأعمدة قابلة للترتيب، ومدير **أعمدة**
  (إخفاء / إعادة ترتيب)، و**تصدير** (xlsx) و**إعادة تعيين المرشّحات**.
- **تحرير** لكل صف (يفتح المقال كتبويب فرعي) و**حذف**؛ **+ New article** يفتح محرّراً فارغاً.
- مبدّل **New / Old** (أعلى اليمين) يبدّل القائمة بين واجهة React والأداة القديمة داخل إطار iframe
  (`/melis/react-tool-page?key=meliscmsnews_left_menu`).

### محرّر المقالات

نموذج واحد قابل للتمرير: عمود محتوى عريض على اليسار، وشريط جانبي للإعدادات على اليمين، و**مبدّل
لغة** (English / Français) في الأعلى — تُحفظ كل الترجمات دفعةً واحدة وتُخزَّن معاً في استدعاء واحد.

![محرّر المقال الجديد — مبدّل لغة، وحقلا Title وSubtitle، وقسم BODY مع محرّر فقرات WYSIWYG وخيار "Generate with AI"، ومنطقة MEDIA مقفلة، والشريط الجانبي للإعدادات (Status وPublication وSite وAuthor وSEO وCategories وTags وSlider)](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-new.png)

| المنطقة | المحتوى |
| --- | --- |
| Title / Subtitle | نص عادي، لكل لغة |
| Body | حتى **10 فقرات ذات نص منسّق (WYSIWYG)**، قابلة لإعادة الترتيب بالسحب، لكل منها مساعد **Generate with AI** |
| Media | حتى **3 صور** و**3 ملفات مستندات** — مقفلة حتى أول حفظ للمقال |
| Status | مبدّل **Published / Unpublished**، بالإضافة إلى زر **Workflow** عند تفعيل MelisSmallBusiness |
| Publication | منتقيا تاريخ ووقت **Publish on** / **Unpublish on** |
| Site | الموقع الذي ينتمي إليه المقال |
| Author | منتقي المؤلّف — فقط عندما يوفّر `MelisCmsUserAccount` العمود `cnews_author_account` |
| SEO | **URL** ملائم، و**URL redirect**، و**URL 301**، و**Meta title**، و**Meta description**، و**Canonical URL** (لكل لغة) |
| Categories / Tags / Slider | أقسام اختيارية تظهر فقط عند تفعيل الوحدة المطابقة |
| Comments | لوحة إشراف أصيلة (إضافة / موافقة / رفض / حذف) تظهر فقط عند تفعيل `MelisCmsComments` |

![تحرير نصوص مقال — العنوان والعنوان الفرعي ومحرّر فقرات ذي نص منسّق (بأسلوب TinyMCE)؛ يمكن إضافة الفقرات وإعادة ترتيبها](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-texts.png)

![أعلى الشريط الجانبي للإعدادات — مبدّل Published مع Workflow، وتاريخا Publish on / Unpublish on، ومنتقي Site](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-properties.png)

![منطقة Media — الصور (بحد أقصى 3، مع Replace/Remove) ومرفقات الملفات (بحد أقصى 3)، بالإضافة إلى لوحة إشراف Comments الأصيلة عند تفعيل MelisCmsComments](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-medias.png)

![قسم SEO — Meta title وMeta description وURL وURL redirect وURL 301 وCanonical URL، لكل لغة](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-seo.png)

بمجرد الحفظ، تعرض منطقة **Preview** المقال داخل صفحة NEWS_DETAIL الخاصة به في إطار iframe، مع خيار
**Display in new tab** ومنتقي صفحة عندما يمتلك الموقع عدة صفحات تفاصيل.

![منطقة Preview — المقال المحفوظ معروضاً داخل صفحة NEWS_DETAIL الخاصة به، مع زر "Display in new tab"](/screenshots/react/melis-cms-news/meliscmsnews-tool-news-edit-preview.png)

### عرض الأخبار في صفحة

من محرّر الصفحات بتقنية React (افتح صفحة ← Edition)، افتح لوحة الإضافات وأسقِط **Latest News** أو
**News List** أو **News Detail** على الصفحة؛ يفتح كل منها نافذة إعداد إضافة Melis الكلاسيكية
(المعروضة داخل محرّر React) بنفس التبويبات الموجودة في v5 — انظر [الواجهة الأمامية](#front-office).

![محرّر الصفحات بتقنية React مع فتح لوحة الإضافات — كتل محتوى News جاهزة للإسقاط على الصفحة](/screenshots/react/melis-cms-news/meliscmsnews-page-menu-plugins-selector.png)

![إضافة Latest News ← Properties — Template وSite وNews detail page (مع منتقي شجرة صفحات)](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-latestnews-config-tab-properties.png)

![إضافة News List ← Pagination — عدد الأخبار في الصفحة وعدد روابط الصفحات المراد عرضها](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-newslist-tab-pagination.png)

![إضافة News Detail ← Properties — Template‏ (news-details) ومنتقي Default news مع اختصار إلى أداة News](/screenshots/react/melis-cms-news/meliscmsnews-page-plugin-newsdetail-config-tab-properties.png)

## واجهة برمجة React

لا يوجد **`config/react-api.php`**: تُعلَن المسارات **مباشرةً داخل `config/module.config.php`**،
متداخلة تحت عقدة `melis-react-api` المشتركة بحيث تُثبَّت تحت `/melis/react-api/…`. المتحكّم:
`MelisCmsNews\Controller\MelisCmsNewsReactApiController` (الاسم البديل القابل للاستدعاء
`MelisCmsNews\Controller\MelisCmsNewsReactApi`). العقد `{ success, data, error }`.

| الطريقة وعنوان URL | الغرض |
| --- | --- |
| `GET /news` | عرض المقالات (keyset: `limit`، `search`، `status`، `siteId`، `sort`، `dir`، `after`، `langId`) |
| `GET /news/stats` | مؤشرات الأداء `{total, published, draft}` |
| `GET /news/:id` | مقال واحد (`?langId=` ← تلك الترجمة؛ الأساس + الفقرات + الوسائط + SEO + معرّفات التصنيف / الوسم) |
| `POST /news/save` | إنشاء / تحديث (كل الترجمات وSEO والتصنيفات والوسوم في استدعاء واحد) |
| `DELETE /news/delete/:id` | حذف مقال (+ نصوصه + SEO) |
| `GET /news/categories` | التصنيفات المتاحة (`?langId=&siteId=`) |
| `GET /news/tags` | الوسوم المتاحة (`MelisCmsTags`؛ فارغة عند غيابها) |
| `GET /news/users` | مستخدمو الواجهة الأمامية بصفتهم مؤلّفين (`MelisCmsUserAccount`؛ فارغة عند غيابها) |
| `GET /news/preview/:id` | عنوان URL للمعاينة + صفحات NEWS_DETAIL لموقع المقال |
| `GET /news/:id/comments` | تعليقات مقال (404 إذا كان `MelisCmsComments` معطّلاً) |
| `POST /news/comments/save` | إضافة / تحرير تعليق (BO ← موافَق عليه) |
| `POST /news/comments/approve/:cid` · `/refuse/:cid` | الإشراف على تعليق |
| `DELETE /news/comments/delete/:cid` | حذف تعليق |
| `GET /news-sites` · `GET /news-languages` | قائمة المواقع · لغات CMS |

يعيد رفع / حذف الوسائط استخدام **نقاط النهاية القديمة** (دون تغيير في الخلفية):
`POST /melis/MelisCmsNews/MelisCmsNews/saveFileForm` و`.../removeAttachFile`.

يمزج المتحكّم بين `MelisCmsNewsService` الخاص بالوحدة (`getNewsById`، `saveNews`،
`deleteNewsById`، `getNewsDetailsPagesBySite`) وبين SQL معلَّم مباشر (keyset للقائمة، والإحصاءات،
وSEO، وجداول ربط التصنيف / الوسم) و`MelisCmsCategory2Service` المشترك؛ ويُكتشَف وجود الأعمدة /
الجداول الاختيارية آلياً بحيث لا تعطّل وحدةٌ اختيارية مفقودة عملية حفظٍ أبداً.

### القدرات

مُعلَنة في `config/react.capabilities.php` تحت العقدة الحاملة للصلاحيات
`meliscmsnews_tools_section` (وليس مفتاح البيان / المنطقة `meliscmsnews_left_menu` المستخدم في
إطار iframe للعرض القديم Old):

```
meliscmsnews_tools_section
└─ actions: list · create · edit · delete · export
```

كل إجراء متحكّم محمي مرتين — `denyUnlessAccess()` (المصادقة +
`MelisCoreRights::canAccess`) ثم `denyUnlessCan(<cap>)`. يختار `saveAction` بين `create` و`edit`
بناءً على وجود معرّف. تتحكّم React في زر **+ New article** عبر `create` وفي القائمة عبر
`list` بواسطة `window.__melisUseCaps(melisKey)`.

## الخدمات الرئيسية

مسجّلة كأسماء بديلة في `service_manager` ضمن `config/module.config.php`.

| الاسم البديل للخدمة | الدور |
| --- | --- |
| `MelisCmsNewsService` | خدمة CRUD / الاستعلام الرئيسية. قراءة المقالات وإنشاؤها وتحديثها وحذفها؛ الاستعلام حسب الموقع واللغة والنطاق الزمني والحالة. كل دالّة تطلق حدثي `*_start` / `*_end` عبر `MelisGeneralService`. |

الأسماء البديلة لبوابات الجداول: `MelisCmsNewsTable`، `MelisCmsNewsTextsTable`، `MelisCmsNewsSeoTable`،
`MelisCmsNewsCategoryTable`، `MelisCmsNewsTagsTable`.

## الواجهة الأمامية

توسّع ثلاث إضافات قوالب `MelisTemplatingPlugin`؛ لكل منها إضافة متحكّم ومساعد عرض وملف إعداد تحت
`config/plugins/`.

| الإضافة | إضافة المتحكّم | مساعد العرض | تبويبات الإعداد |
| --- | --- | --- | --- |
| Latest News | `MelisCmsNewsLatestNewsPlugin` | `MelisCmsNewsLatestPlugin` | Properties، Filters |
| News List | `MelisCmsNewsListNewsPlugin` | `MelisCmsNewsListPlugin` | Properties، Pagination، Filters |
| News Detail | `MelisCmsNewsShowNewsPlugin` | `MelisCmsNewsShowNewsPlugin` | Properties |

معاملات إعداد الإضافة: `template_path`، `site_id`، `pageIdNews` (رابط صفحة التفاصيل)، `column`،
`order`، `limit`، `date_min`، `date_max`، `search`، بالإضافة إلى `nbPerPage` / `nbPageBeforeAfter`
(في News List فقط). يُخزَّن الإعداد في XML الصفحة عبر `loadDbXmlToPluginConfig()` /
`savePluginConfigToXml()`.

يُوصَّل توجيه SEO ووسوم الميتا الخاصة بكل مقال في `src/Module.php` عبر:
`MelisCmsNewsSEORouteListener`، `MelisCmsNewsRenderPageListener`، `MelisCmsNewsMetaPageListener`،
`MelisCmsNewsSeoRedirectUrlListener`.

## جداول قاعدة البيانات

البنية الأساسية في `install/sql/setup_structure.sql`؛ عمليات الترحيل في `install/dbdeploy/`.

| الجدول | يحتوي على |
| --- | --- |
| `melis_cms_news` | صف المقال الأساسي: الحالة، وتواريخ النشر / إلغاء النشر، والموقع، وimage1-3، وdocuments1-3، ومعرّف الشريط المنزلق |
| `melis_cms_news_texts` | النصوص لكل لغة: العنوان، والعنوان الفرعي، والفقرات 1-10، وترتيب الفقرات، واللغة |
| `melis_cms_news_seo` | SEO لكل لغة: URL، وإعادة التوجيه، وعلامة 301، وعنوان / وصف الميتا، والرابط الأساسي |
| `melis_cms_news_category` | ربط المقال ↔ التصنيف (ميزة التصنيف الاختيارية) |

## مثال

```php
$news = $this->getServiceManager()->get('MelisCmsNewsService');

// Latest 10 published articles for site 1, French, newest first:
$list = $news->getNewsList(
    status: 1, langId: 1, start: 0, limit: 10,
    orderColumn: 'cnews_publish_date', order: 'DESC', siteId: 1
);

// Fetch one article (all languages, or one language):
$all = $news->getNewsById(42);
$fr  = $news->getNewsById(42, 1);

// Create / update / delete:
$id = $news->saveNews($data, $newsId);   // $newsId null → create
$ok = $news->deleteNewsById(42);         // also removes texts + SEO rows

// Utility:
$txt  = $news->getPostText(42);
$pages = $news->getNewsDetailsPagesBySite(1);  // NEWS_DETAIL-type pages for a site
```

اربط نفسك بحدث خدمة لتوسيع السلوك (مثلاً إرسال إشعار إلى فهرس بحث بعد الحفظ):

```php
$sharedEvents->attach('MelisCmsNews', 'melis_cms_news_save_news_end', function ($e) {
    $params = $e->getParams(); // includes 'news', 'newsId', 'results'
}, 50);
```

تتبع معرّفات الأحداث الأخرى النمط ذاته `melis_cms_news_[method]_start/end`:
`melis_cms_news_get_news_list_*`، `melis_cms_news_get_news_by_id_*`،
`melis_cms_news_get_news_by_id_array_*`، `melis_cms_news__delete_news_by_id_*` (شرطة سفلية
مزدوجة)، `melis_cms_news_get_post_text_*`، `melis_cms_news_get_news_details_pages_*`.

## الخدمات المصغّرة

يُتيح `config/app.microservice.php` الدالّتين `getNewsList` و`getNewsById` عبر ناقل الخدمات
المصغّرة في Melis مع نماذج ومرشّحات إدخال مُولَّدة آلياً. مصانع النماذج `MelisCmsNewsSelect`
و`MelisCmsNewsBOSelect` موجودة في `src/Form/Factory/`.

## الملفات الرئيسية

| المجال | المسار |
| --- | --- |
| إعداد الوحدة + مسارات react-api المضمّنة | `vendor/melisplatform/melis-cms-news/config/module.config.php` |
| قدرات React | `vendor/melisplatform/melis-cms-news/config/react.capabilities.php` |
| شجرة أداة الواجهة الخلفية | `vendor/melisplatform/melis-cms-news/config/app.interface.php` |
| إعداد جدول القائمة | `vendor/melisplatform/melis-cms-news/config/app.tools.php` |
| إعداد الخدمة المصغّرة | `vendor/melisplatform/melis-cms-news/config/app.microservice.php` |
| متحكّم واجهة React | `vendor/melisplatform/melis-cms-news/src/Controller/MelisCmsNewsReactApiController.php` |
| لبنة React (مصدر Vite IIFE) | `vendor/melisplatform/melis-cms-news/ui-react/src/` |
| اللبنة المبنية + البيان | `vendor/melisplatform/melis-cms-news/public/ui-react/brick.js` · `brick.manifest.json` |
| الخدمة الرئيسية | `vendor/melisplatform/melis-cms-news/src/Service/MelisCmsNewsService.php` |
| إضافات الواجهة الأمامية | `vendor/melisplatform/melis-cms-news/src/Controller/Plugin/` |
| مساعدات العرض | `vendor/melisplatform/melis-cms-news/src/View/Helper/` |
| المستمعون (SEO وGDPR وتنظيف الشريط المنزلق) | `vendor/melisplatform/melis-cms-news/src/Listener/` |
| بوابات الجداول | `vendor/melisplatform/melis-cms-news/src/Model/Tables/` |
| ملف SQL للتثبيت | `vendor/melisplatform/melis-cms-news/install/sql/setup_structure.sql` |
| عمليات ترحيل قاعدة البيانات | `vendor/melisplatform/melis-cms-news/install/dbdeploy/` |

انظر أيضاً: [melis-cms](/ar/reference/modules/melis-cms)، [melis-front](/ar/reference/modules/melis-front)،
[melis-engine](/ar/reference/modules/melis-engine)، [melis-core](/ar/reference/modules/melis-core)
