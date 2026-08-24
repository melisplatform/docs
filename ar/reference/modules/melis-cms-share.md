# MelisCmsShare

> يحقن وسوم المشاركة على وسائل التواصل الاجتماعي / وسوم Open Graph الوصفية داخل `<head>` الخاص بالواجهة الأمامية لصفحة CMS، ويُدار من خلال واجهة خلفية React أصلية. الحزمة `melisplatform/melis-cms-share`.

## الغرض

يتيح `MelisCmsShare` للمحرّر ضبط خمس قيم لكل صفحة — **العنوان والوصف والصورة والنوع وعنوان URL** —
ثم يكتبها في `<head>` الصفحة المُصيَّرة على شكل ثلاث مجموعات من الوسوم الوصفية: **Twitter Card**
(`twitter:title/description/image/card`)، و**schema.org / Google** (سمات `itemprop`)، و
**Facebook / Open Graph** (`og:title/description/image/type/url`). يُخزَّن صف بيانات واحد لكل
صفحة؛ فإذا كان وسمٌ موجودًا مسبقًا في القالب يُستبدَل، وإلا يُدرَج مباشرةً بعد
`<head>`. أما الصفحات التي لا يوجد لها صف مشاركة فتُترك دون تغيير.

في الإصدار v6 تأتي الوحدة مع **لبنة React أصلية بالكامل** (وليست لبنة iframe) تعرض هذه البيانات على
سطحين — أداة **Open Graph** مستقلة و**تبويب Open Graph داخل محرّر صفحة CMS** —
وكلاهما يقرأ ويكتب عبر طبقة JSON على المسار `/melis/react-api/cms-share…`. أما حاقن `<head>`
في الواجهة الأمامية ونموذج البيانات والخدمات فلم تتغيّر عمّا كانت عليه في الإصدار v5.

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCmsShare',
];
```

التبعيات: `melisplatform/melis-core` و`melisplatform/melis-engine` و`melisplatform/melis-front`
و`melisplatform/melis-cms`. تحتاج الوحدة إلى محرّر صفحة CMS (من أجل تبويب Open Graph وأحداث
دورة حياة الصفحة) وإلى مسار التصيير في الواجهة الأمامية (من أجل خطاف `MvcEvent::EVENT_FINISH`). ويظهر
سطحا React كلاهما **فقط طالما كانت الوحدة مُدرَجة هنا** (اكتشاف اللبنات المعيارية عبر
`GET /melis/react-api/react-modules`).

## الواجهة الخلفية بلغة React

اللبنة هي واجهة مستخدم **React أصلية بالكامل** مع **مبدِّل جديد / قديم**: *جديد* هو واجهة React
(الافتراضية)، و*قديم* يصيّر الأداة القديمة داخل iframe
(`/melis/react-tool-page?key=melis_cms_share_tool_display`).

| العنصر | القيمة |
| --- | --- |
| معرّف اللبنة | `cms-share` (المسار `/melis-cms-share/share`، التسمية `Partage`) |
| `forwardKey` | `MelisCmsShare/MelisCmsShareTool` |
| `melisKey` (الصلاحيات / iframe العرض القديم) | `melis_cms_share_tool_display` |
| مفتاح تبويب محرّر الصفحة | `melis_cms_share_page_edition_tab` (مُسجَّل تحت `meliscms_page`) |
| قاعدة الـ API | `/melis/react-api/cms-share` |

**أداة Open Graph** — الشريط الجانبي ← **Site Tools** ← **Open Graph**. تسرد صف المشاركة لكل صفحة مع
**بطاقات KPI** (إجمالي المشاركات، الصفحات المشمولة، الأنواع المميّزة)، وصندوق **بحث** (العنوان، عنوان URL، النوع،
الوصف، معرّف الصفحة)، ومرشّح **All types**، وزر **Reset filters**، ومدير **Columns**،
وزر **Export**، وزر تحديث، ومبدِّل جديد / قديم. انقر على ترويسة عمود (Page / Title / Type / URL /
Added on) للفرز؛ ويتضمّن كل صف زر تحرير (القلم) وزر حذف (سلّة المهملات).

![أداة Open Graph بلغة React: بطاقات KPI (Total / Pages covered / Distinct types)، والبحث، ومرشّح النوع، وReset filters، ومدير Columns، وExport، ومبدّل جديد / قديم، وزر تحديث — يعرض كل صف Page وTitle وType وURL وAdded on مع إجراءي تحرير وحذف لكل صف](/screenshots/react/melis-cms-share/meliscmsshare-tool-opengraph-list.png)

**نموذج التحرير** — Page ID (مطلوب)، وType (`article`، `website`…)، وTitle (`og:title`)، وURL
(`og:url`)، ولوحة صورة (معاينة + Replace / Remove؛ JPG، PNG، GIF، WEBP — بحدٍّ أقصى 15 ميغابايت) وحقل
Description (`og:description`). تُرفَع الصورة أولًا (multipart) إلى
`/media/melisCmsShare/<pageId>/…`، ثم يُخزَّن مسارها عند **Save**.

![نموذج المشاركة بلغة React — Page ID وType وTitle وURL، ولوحة صورة تعرض المسار المُخزَّن (`/media/melisCmsShare/<pageId>/…`) إضافةً إلى Replace/Remove، وحقل نصّي Description](/screenshots/react/melis-cms-share/meliscmsshare-tool-opengraph-edit.png)

**تبويب Open Graph داخل محرّر صفحة CMS** — افتح صفحة CMS واختر تبويب **Open Graph** لتحرير
بيانات مشاركة تلك الصفحة الوصفية مباشرةً (Title، Type، URL، Image، Description)؛ ويكون Page ID
ضمنيًا. لا يتضمّن التبويب **زر Save خاصًّا به** — إذ تُحفَظ القيم عبر
Save / Publish الخاص بمحرّر الصفحة من خلال خطاف حفظ، تمامًا مثل تبويب Share القديم.

![محرّر صفحة CMS مع تفعيل تبويب Open Graph (بجانب Edition وProperties وSEO وLanguages وHistoric وPage Analytics وغيرها) — Title وType وURL ولوحة صورة وDescription، تُحفَظ عبر زرَّي Save/Publish العلويَّين في الصفحة](/screenshots/react/melis-cms-share/meliscmsshare-pageedition-tab-opengraph.png)

## واجهة React البرمجية

توجد المسارات في `config/react-api.php` (مُدمَجة عبر `MelisCmsShare\Module::getConfig()`)؛ والمتحكّم
`MelisCmsShare\Controller\MelisReactApiShareController`. جميعها تحت `/melis/react-api/cms-share` مع
العقد `{ success, data, error }`.

| الطريقة وعنوان URL | الحماية | الغرض |
| --- | --- | --- |
| `GET /cms-share` | access + `list` | قائمة keyset (`limit`، `search`، `type`، `page`، `sort`، `dir`، `after`) ← `{items,total,nextCursor}` |
| `GET /cms-share/stats` | access + `list` | مؤشّرات KPI ‏`{total, pages, types}` |
| `GET /cms-share/types` | access + `list` | قيم `mcs_type` المميّزة (خيارات المرشّح) |
| `GET /cms-share/:id` | access + `edit` | صف مشاركة واحد |
| `GET /cms-share/by-page/:idPage` | المصادقة فقط | مشاركة الصفحة (لتبويب محرّر الصفحة)؛ ‏`data:null` إن لم تكن موجودة |
| `POST /cms-share/save` | access + `create`/`edit` | إنشاء / تحديث (`{id?, pageId, title, type, url, img, description}`)؛ يُفرَض المؤلّف على جانب الخادم؛ تُبطَل ذاكرة تخزين الصفحة المؤقتة |
| `POST /cms-share/upload-image` | access + `edit` | رفع multipart (`pageId`، `image`) ← `{path}` تحت `/media/melisCmsShare/<pageId>/…` |
| `DELETE /cms-share/delete/:id` | access + `delete` | حذف صف؛ تُبطَل ذاكرة تخزين الصفحة المؤقتة |

يتواصل المتحكّم مع `melis_cms_share` **مباشرةً عبر SQL معلَّم بالوسائط**، مُعيدًا إنتاج قواعد
العمل القديمة (معرّف الصفحة مطلوب، ويُفرَض المؤلّف على المستخدم الحالي عند الإنشاء، وقائمة السماح للصور
jpg/jpeg/png/gif/webp/ico/bmp بحدٍّ أقصى 15 ميغابايت تُحفَظ باعتبارها الملف الوحيد تحت `/media/melisCmsShare/<pageId>/`،
وإبطال ذاكرة تخزين الصفحة المؤقتة في الواجهة الأمامية حتى تتحدّث وسوم `<head>`). ولا يستخدم هذا المتحكّم خدمة
`MelisCmsShareService` الأعلى مستوى. ويرسل كل طلب جلب رأس `X-Requested-With: XMLHttpRequest` و
`credentials:'include'`.

## القدرات

مُصرَّح بها في `config/react.capabilities.php` تحت العقدة الحاملة للصلاحيات
`melis_cms_share_tool_display` (وهي العقدة نفسها التي تستخدمها حماية الوصول في المتحكّم):

```
melis_cms_share_tool_display → list · create · edit · delete · export
```

يتحكّم `MelisCan('melis_cms_share_tool_display', cap)` في أزرار واجهة المستخدم؛ وعلى جانب الخادم يستدعي كل إجراء
`denyUnlessAccess()` (المصادقة + `MelisCoreRights::canAccess(...)` ← 401/403) ثم `denyUnlessCan(cap)`.
أما تبويب محرّر الصفحة فهو مساهمة **معيارية** منفصلة: إذ يدمج الملف نفسه مدخل `tabs`
تحت `meliscms_page` (المفتاح `melis_cms_share_page_edition_tab`، المطابق لاستدعاء `registerPageTab(...)`
في اللبنة)، بحيث يعرض MelisCms زر التبويب.

## الخدمات الأساسية

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `MelisCmsShareService` | عمليات CRUD كاملة لسجلات المشاركة: `saveShare($data)`، `deleteShare()`، `getShareById()`، `getShareByPageId($idPage)`، `getAllShare()`، `searchShare()`، `countAllShare()`، `countFilteredShare()`. |
| `melisCmsShareTable` | بوابة جدول لـ `melis_cms_share` (`MelisCmsShareTable`). ابحث عن صف صفحة ما باستخدام `getEntryByField('mcs_page_id', $idPage)`. |

## الواجهة الأمامية

لا يوجد مساعد عرض أو مكوّن قوالب مكشوف. تُحقَن وسوم المشاركة بواسطة
`MelisCmsShare\Listener\MelisCmsShareMetaPageListener`، المرتبط في `src/Module.php` والذي يُطلَق على
**`MvcEvent::EVENT_FINISH`** بالأولوية **110**:

1. يتخطّى الطلبات غير PHP / طلبات الأصول (regex على URI) والطلبات التي لا تحمل `idpage`.
2. يحمّل صف مشاركة الصفحة عبر `melisCmsShareTable->getEntryByField('mcs_page_id', $idPage)`.
3. لكل حقل غير فارغ، إمّا أن يستبدل الوسم الموجود بـ `preg_replace` أو يُدرِجه بعد `<head>` —
   عبر المجموعات الثلاث جميعها (Twitter Card، ‏`itemprop`، ‏`og:`).
4. يهرّب القيم بـ `addslashes`، ويضيف `scheme://host` في مقدّمة عناوين URL للصور، ويكتبها مجددًا عبر
   `$response->setContent()`.

ولأنه يعمل على سلسلة HTML المُصيَّرة بالفعل في نهاية دورة حياة MVC، فبإمكانه
استبدال وسوم سبق أن أصدرها القالب.

> **تنبيه حول النوع:** يغذّي حقل `mcs_type` الواحد كلًّا من `twitter:card` و`og:type`، اللذين يتوقّعان
> مفردات مختلفة (`summary`/`summary_large_image` مقابل `website`/`article`). استخدم قيمة
> مقبولة لدى الاثنين، أو تقبّل أن تكون إحداها غير قياسية.

## مستمعو دورة حياة الصفحة

| المستمع | الحدث/الأحداث | الغرض |
| --- | --- | --- |
| `MelisCmsSavePageListener` | `meliscms_page_save_start`، `meliscms_page_publish_start` | يحافظ على اتساق سجل المشاركة عند حفظ صفحة CMS أو نشرها. |
| `MelisCmsShareDeletePageListener` | `meliscms_page_delete_end` | يحذف صف `melis_cms_share` عند حذف صفحته (لا بيانات مشاركة يتيمة). |
| `MelisCmsShareFlashMessengerListener` | أحداث حفظ / حذف الواجهة الخلفية | تغذية راجعة فورية في الواجهة الخلفية بعد الحفظ أو الحذف. |

## جداول قاعدة البيانات

| الجدول | ما يحتويه |
| --- | --- |
| `melis_cms_share` | تكوين مشاركة واحد لكل صفحة. المفتاح الأساسي `mcs_id`. الأعمدة: `mcs_page_id`، `mcs_title`، `mcs_description`، `mcs_img`، `mcs_type`، `mcs_url`، `mcs_add_user_id`، `mcs_date_added`. يربط الجدول مستخدم الواجهة الخلفية لعرض `mcs_share_added_by` (الاسم الكامل). |

## مثال

```php
// Read the share config for a given page
$share = $serviceManager->get('MelisCmsShareService')->getShareByPageId($pageId);

// Persist a share config for a page (create or update)
$serviceManager->get('MelisCmsShareService')->saveShare([
    'mcs_page_id'      => $pageId,
    'mcs_title'        => 'My page title for social',
    'mcs_description'  => 'A short description shown in link previews.',
    'mcs_img'          => '/path/to/preview-image.jpg',
    'mcs_type'         => 'summary_large_image',
    'mcs_url'          => 'https://example.com/my-page',
    'mcs_add_user_id'  => $currentUserId,
]);
```

## الملفات الأساسية

| الغرض | المسار |
| --- | --- |
| الوحدة / الإقلاع | `vendor/melisplatform/melis-cms-share/src/Module.php` |
| مسارات واجهة React البرمجية + القابل للاستدعاء | `vendor/melisplatform/melis-cms-share/config/react-api.php` |
| قدرات React + تبويب الصفحة | `vendor/melisplatform/melis-cms-share/config/react.capabilities.php` |
| متحكّم واجهة React البرمجية | `vendor/melisplatform/melis-cms-share/src/Controller/MelisReactApiShareController.php` |
| متحكّم الواجهة الخلفية القديم (العرض القديم) | `vendor/melisplatform/melis-cms-share/src/Controller/MelisCmsShareToolController.php` |
| مصدر لبنة React | `vendor/melisplatform/melis-cms-share/ui-react/src/` (`brick.tsx`، `SharePage.tsx`، …) |
| اللبنة المبنية + البيان | `vendor/melisplatform/melis-cms-share/public/ui-react/` (`brick.js`، `brick.manifest.json`) |
| حاقن `<head>` في الواجهة الأمامية | `vendor/melisplatform/melis-cms-share/src/Listener/MelisCmsShareMetaPageListener.php` |
| الخدمة | `vendor/melisplatform/melis-cms-share/src/Service/MelisCmsShareService.php` |
| الجدول | `vendor/melisplatform/melis-cms-share/src/Model/Tables/MelisCmsShareTable.php` |

انظر أيضًا: [MelisCms](/ar/reference/modules/melis-cms) · [MelisCmsPageAnalytics](/ar/reference/modules/melis-cms-page-analytics) · [مرجع الوحدات](/ar/reference/modules)
