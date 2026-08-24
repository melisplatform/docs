# MelisCmsCategory2

> فئات محتوى متعددة المواقع ومتعددة اللغات لنظام إدارة المحتوى (CMS)، مع واجهة إدارة خلفية أصلية مبنية بـ React — الحزمة `melisplatform/melis-cms-category2`.

## الغرض

يوفّر MelisCmsCategory2 نظام فئات هرميًّا في واجهة الإدارة الخلفية لـ Melis. تشكّل الفئات
شجرة (كل عقدة تشير إلى أب)، وتحمل ترجمات لكل لغة (الاسم والوصف)، ويمكن
تحديد نطاقها بموقع واحد أو أكثر، ولها نافذة صلاحية وحالة، ويمكنها الاحتفاظ بملفات وسائط.
تأتي الوحدة مع إضافة قوالب للواجهة الأمامية لعرض شجرة الفئات على صفحة، ومنتقي فئات قابل
لإعادة الاستخدام تُضمّنه وحدات أخرى (مثل News وCommerce) لتصنيف سجلّاتها.

في واجهة الإدارة الخلفية v6 المبنية بـ React (‏`/melis-react`) تأتي الأداة كـ **مكوّن React كامل أصلي**:
واجهة رئيسية-تفصيلية حقيقية — شجرة الفئات على اليسار، ومحرّر بعلامات تبويب على اليمين — تقرأ وتكتب
عبر طبقة JSON الخاصة بها `react-api`. يتيح مبدّل **New / Old** الرجوع إلى الأداة القديمة داخل
إطار iframe. أما نموذج البيانات الأساسي والخدمات وإضافة الواجهة الأمامية فتبقى دون تغيير عن v5.

## تفعيلها

أضِفها إلى `config/melis.module.load.php`:

```php
return [
    'MelisCmsCategory2',
];
```

تتطلّب `melis-core` و`melis-cms`. الوحدة مفعّلة عبر `dbdeploy` لذا تُنشأ جداولها
عند النشر. وتلزم `melis-engine` لعرض الواجهة الأمامية. يظهر مكوّن React في الشريط الجانبي
فقط طالما أن الوحدة مدرجة هنا (اكتشاف المكوّنات المعياري).

## الإدارة الخلفية (React)

**أين:** الشريط الجانبي الأيسر ← مجموعة **MelisCms** ← **Categories** (‏`Catégories`). تُفتح كصفحة
رئيسية-تفصيلية واحدة — لا كشريط علامات تبويب متعدّد — على المسار `/melis-cms/category-v2`. يبدّل مبدّل
**New / Old** أعلى اليمين بين واجهة React (الافتراضية) والأداة الكلاسيكية داخل إطار iframe.

![أداة Categories المبنية بـ React — رئيسية-تفصيلية: شجرة الفئات على اليسار، محرّر بعلامات تبويب على اليمين، مبدّل New/Old أعلى اليمين](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-accordionsystem.png)

### شجرة الفئات (اللوحة اليسرى)

يعرض العمود الأيسر الشجرة بأكملها. يحتوي شريط أدواته على **قائمة منسدلة للّغة** (أعلام — تختار أي
لغة تُعرض بها أسماء العقد)، و**مرشّح موقع**، وزرّ **تحديث**، ومربّع **بحث**
(يقلّم الشجرة لكنه يُبقي على الأصول)، و**+ New category** (يُنشئ جذرًا/كتالوجًا). يعرض كل صف
**نقطة حالة** (أخضر = نشط، أحمر = غير نشط)، واسم العقدة، و — عند التمرير — علامة **+** (لإضافة
فئة فرعية) و**سلّة مهملات** (للحذف). اسحب مقبض العقدة لإعادة الترتيب أو تغيير الأب: قرب الحافة
العليا = إفلات قبل، الحافة السفلى = إفلات بعد (شقيق)، الوسط = إفلات بالداخل (آخر ابن). يُتاح السحب
فقط في العرض الكامل غير المرشّح. لا يمكن حذف عقدة لديها فئات فرعية.

![لوحة الشجرة المبنية بـ React — قائمة منسدلة للّغة، مرشّح موقع، تحديث، بحث، + New category، شجرة بنقاط حالة وإضافة/حذف لكل عقدة](/screenshots/react/melis-cms-category2/meliscmscategory2-page-plugin-categories-config-properties-search-category.png)

### المحرّر (اللوحة اليمنى)

يؤدّي اختيار عقدة — أو النقر على **+ New category** / علامة **+** في صف — إلى تحميل المحرّر. يعرض
الترويسة العنوان وسياقه ("عند الجذر" أو "تحت «الأب»")، وزرّي **Cancel** / **Save**.

- **علامة تبويب Properties** — الاسم والوصف لكل لغة (علامات تبويب اللغات مع نقطة ممتلئة/فارغة لكل
  لغة)، ومبدّل **Status**، وتواريخ **Validity** (البداية / النهاية)، و**Sites** التي تنتمي إليها الفئة.
  الاسم (بلغة واحدة على الأقل) وموقع واحد على الأقل مطلوبان؛ وإذا حُدّد التاريخان معًا،
  فيجب أن تسبق البداية النهاية.
- **علامة تبويب Media** — إرفاق **Images** و**Files** (عمودان، لكلٍّ منهما **+ Add** وحذف لكل عنصر).
  احفظ الفئة أولًا قبل إضافة الوسائط.

![فئة جديدة — علامة تبويب Properties: علامات تبويب اللغات، الاسم، الوصف، مبدّل Status، تواريخ Validity، Sites](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-new-tab-properties.png)

![محرّر الفئة — علامة تبويب Media: شبكة Images (‏+ Add an image) وقائمة Files (‏+ Add a file)](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-new-tab-media.png)

## واجهة React API

تقيم المسارات في `config/react-api.php`، ويقدّمها
`MelisCmsCategory2\Controller\MelisCmsCategoryReactApiController`، مُتداخلةً تحت قاعدة الإدارة الخلفية
للوحدة بحيث تكون البادئة الفعّالة `/melis/MelisCmsCategory2/react-api`. تتّبع كل استجابة
عقد `{ success, data, error }`. يتخاطب المتحكّم مع الجداول مباشرةً عبر
SQL مُعلَّم بالمعاملات، مُعيدًا إنتاج قواعد العمل القديمة (اسم في لغة واحدة على الأقل، وموقع واحد على الأقل، والبداية ≤ النهاية،
والترتيب تلقائيًّا = max+1، و`-1` = الأب الجذري، وعدم حذف عقدة لها أبناء، والحذف المتتابع
للترجمات/المواقع/الوسائط، وتحميل وسائط مُحصَّن).

| الطريقة والعنوان (نسبةً إلى القاعدة) | الغرض |
| --- | --- |
| `GET /tree?lang=` | شجرة الفئات الكاملة ← `{langId, nodes:[TreeNode]}` (الاسم مُحلَّل إلى اللغة، مع تعليم اللجوء الاحتياطي) |
| `GET /langs` | لغات الـ CMS ← `{langs:[{id,locale,name}]}` |
| `GET /sites` | المواقع (مرشّح + نموذج) ← `{sites:[{id,name}]}` |
| `GET /category/:id` | فئة واحدة ← `{id,parentId,status,dateStart,dateEnd,sites,translations}` |
| `POST /save` | إنشاء / تحديث فئة ← `{id}` |
| `DELETE /delete/:id` | حذف فئة (محظور إن كان لها أبناء) + إعادة ترتيب الأشقاء |
| `POST /reorder` | إعادة ترتيب أشقاء أب (`{parentId, orderedIds:[…]}`) — تغيّر الأب أيضًا |
| `GET /category/:id/media` | وسائط الفئة ← `{images:[MediaItem], files:[MediaItem]}` |
| `POST /media/upload` | تحميل متعدّد الأجزاء (`catId`، `type` image\|file، `file`) ← `{id,type,path,name}` |
| `DELETE /media/delete/:id` | حذف صف وسائط + ملفه على القرص |

## القدرات

مُعلَنة في `config/react.capabilities.php` تحت العقدة **الحاملة للصلاحيات**
`melis_cms_category_v2_tools_section` (وهي أيضًا `MELIS_KEY` الخاصة بالمتحكّم — لا مفتاح منطقة البيان
`melis_cms_categories_v2`، الذي يستهدف فقط إطار *Old*). تحرس كل عملية في المتحكّم
الوصول بـ `canAccess(MELIS_KEY)`. تحوّل `Capabilities::flatten()` الشجرة إلى سلاسل
مفصولة بنقاط تُمرَّر إلى `makeCan(...)` في React:

| القدرة | تتحكّم في |
| --- | --- |
| `tree.create` | زرّ "+ New category" وأزرار "+" لكل عقدة |
| `tree.order` | مقبض السحب لإعادة الترتيب (يتطلّب أيضًا العرض غير المرشّح) |
| `tree.delete` | سلّة المهملات لكل عقدة |
| `edition` | تحميل المحرّر لفئة موجودة (يبقى الإنشاء مسموحًا) |
| `edition.properties` | علامة تبويب Properties |
| `edition.media` | علامة تبويب Media |

## المكوّن

الواجهة مكتوبة في `ui-react/` (‏Vite IIFE، مع تصدير React / ReactRouter خارجيًّا إلى المتغيّرات
العامة للمضيف، والإخراج إلى `public/ui-react/brick.js` بجوار `brick.manifest.json`). يسجّل `brick.tsx`
مكوّنًا موجّهًا واحدًا تحت معرّف المكوّن `category2`.

```json
{
  "id": "category2",
  "route": "/melis-cms/category-v2",
  "label": "Catégories",
  "forwardKey": "MelisCmsCategory2/MelisCmsCategoryList",
  "melisKey": "melis_cms_categories_v2",
  "entry": "brick.js",
  "persistent": true
}
```

| المكوّن | الدور |
| --- | --- |
| `CategoryPage.tsx` | الحاوية: تحمّل اللغات + المواقع، وتحمّل (تعيد تحميل) الشجرة لكل لغة، وتملك العقدة المحدّدة ووضع `mode` الخاص بـ New/Old، وتعرض التخطيط الرئيسي-التفصيلي + إطار *Old* iframe |
| `CategoryTree.tsx` | اللوحة اليسرى — الشجرة، القائمة المنسدلة للّغة، مرشّح الموقع، البحث، الإضافة/الحذف لكل عقدة، السحب لإعادة الترتيب / تغيير الأب |
| `CategoryEditor.tsx` | اللوحة اليمنى — علامتا تبويب Properties + Media، التحقّق من جهة العميل، أخطاء مضمّنة/شريطية |
| `ViewToggle.tsx` | مبدّل New (‏React) / Old (‏iframe) |
| `category-api.ts` | عميل API مُنمَّط للنقاط الطرفية أعلاه |

يكتشف المضيف المكوّن عبر `GET /melis/react-api/react-modules` ويثبّته؛ ويربط `useNavMenu`
مفتاح `forwardKey` بمسار الشجرة. يقرأ المكوّن اللغة النشطة من
`document.documentElement.lang` ويأتي بقاموس `{fr,en}` مضمّن في الملف. يبقى منطق العمل
في جهة الخادم (توافقًا مع الأداة القديمة)؛ وReact هي عرض + استدعاءات API.

## الخدمات الرئيسية

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `MelisCmsCategory2Service` | خدمة الفئات الرئيسية: إنشاء/قراءة عقد الفئات، واسترجاع الشجرة، والترجمات وروابط المواقع. |
| `MelisCmsCategory2MediaService` | تخزين ملفات كل فئة على القرص وفي قاعدة البيانات. |

طرق بارزة في `MelisCmsCategory2Service`:

- `getCategoryTreeview($fatherId, $langId, $onlyValid, $siteId)` — شجرة تعاودية.
- `getCategoryById($categoryId, $langId, $onlyValid)` — عقدة فئة كاملة.
- `getCategoryNameById($categoryId, $langId)` — البحث عن الاسم.
- `getCategoriesPerSite($siteId, $langId)`، ‏`getFirstLevelCategoriesPerSite($siteId, $langId)`.
- `saveCategory(...)`، ‏`saveCategoryTexts(...)`، ‏`saveCategorySites(...)` — حفظ العقدة/الترجمة/الموقع.
- `reOrderCategories($parentId, $currentOrder)` — حفظ إعادة الترتيب بالسحب.
- `validateDates($dateStart, $dateEnd)`.

يتولّى `MelisCmsCategory2MediaService` جانب نظام الملفات: ‏`uploadFile`، ‏`deleteFile`،
‏`getMediaFilesByCategoryId`، ‏`getFilesInDir`، ‏`removeCategoryDir`.

> يستخدم متحكّم `react-api` المبني بـ React لغة SQL المباشرة بدلًا من هذه الخدمات، لكن إضافة الواجهة الأمامية
> ومنتقي الفئات القابل لإعادة الاستخدام ما زالا يستدعيان `MelisCmsCategory2Service`.

## الواجهة الأمامية

- **إضافة القوالب** `MelisCmsCategoryDisplayCategoriesPlugin` — تعرض شجرة فئات على
  صفحة. يكشف إعدادها علامة تبويب Properties واحدة بثلاثة حقول: ‏`template_path`، ‏`site_id`،
  ‏`category_start`. القالب الافتراضي: `MelisCmsCategory2/default`. في محرّر الصفحات المبني بـ React، أفلِت
  كتلة **Display Categories** واضبط القالب، وفئة البداية (منتقي شجرة) والموقع.
- **مساعد العرض** `renderTreeRec` — يعرض تعاوديًّا مصفوفة شجرة فئات داخل عرض.

![إعدادات إضافة Display Categories — Template، ‏Category start (منتقي شجرة)، ‏Site](/screenshots/react/melis-cms-category2/meliscmscategory2-page-plugin-categories-config-properties.png)

استخدام مُبرمَج بقيمة ثابتة:

```php
$display = $this->MelisCmsCategoryDisplayCategoriesPlugin();
echo $display->render([
    'template_path' => ['MelisCmsCategory2/default'],
    'site_id'        => 1,
    'category_start' => 1,
]);
```

## جداول قاعدة البيانات

| الجدول | يحتوي على |
| --- | --- |
| `melis_cms_category2` | عقدة الفئة: `cat2_id`، ‏`cat2_father_cat_id`، الترتيب، الحالة، المرجع، تواريخ الصلاحية، التدقيق. |
| `melis_cms_category2_trans` | الترجمة لكل لغة: الاسم والوصف، مُفهرسة بـ `catt2_id`. |
| `melis_cms_category2_sites` | رابط الفئة بالموقع، مُفهرس بـ `cats2_id`. |
| `melis_cms_category2_media` | الوسائط المرفقة بفئة: `catm2_type`، ‏`catm2_path`، ‏`catm2_cat_id`. |

تُدرَج عقدة جذرية أوّلية (`cat2_id = 1`، "My catalog" / "Mon catalogue") عند التثبيت.

## الملفات الرئيسية

| الموضوع | المسار |
| --- | --- |
| مسارات React API + المتحكّم القابل للاستدعاء | `vendor/melisplatform/melis-cms-category2/config/react-api.php` |
| إعلان قدرات React | `vendor/melisplatform/melis-cms-category2/config/react.capabilities.php` |
| متحكّم React API (‏10 عمليات، SQL مباشر، تحصين التحميل) | `vendor/melisplatform/melis-cms-category2/src/Controller/MelisCmsCategoryReactApiController.php` |
| مكوّن React (‏Vite IIFE) | `vendor/melisplatform/melis-cms-category2/ui-react/` والمبنيّ `public/ui-react/` |
| بيان المكوّن | `vendor/melisplatform/melis-cms-category2/public/ui-react/brick.manifest.json` |
| الخدمة الرئيسية | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryService.php` |
| خدمة الوسائط | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryMediaService.php` |
| إضافة القوالب | `vendor/melisplatform/melis-cms-category2/src/Controller/Plugin/MelisCmsCategoryDisplayCategoriesPlugin.php` |
| SQL التثبيت | `vendor/melisplatform/melis-cms-category2/install/sql/` |

انظر أيضًا: [melis-cms](/ar/reference/modules/melis-cms)، [melis-core](/ar/reference/modules/melis-core)، [melis-cms-news](/ar/reference/modules/melis-cms-news)
