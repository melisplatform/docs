# MelisCmsSlider

> مدير شرائح العرض / الكاروسيل في الواجهة الخلفية — أصبح الآن لبنة React أصيلة في الواجهة الخلفية — مع مكوّن قوالب للواجهة الأمامية لعرض شرائح العرض على الصفحات. الحزمة `melisplatform/melis-cms-slider`.

## الغرض

يوفّر MelisCmsSlider أداةً في الواجهة الخلفية لبناء **شرائح العرض** (كاروسيلات مُسمّاة من شرائح مُرتّبة —
صورة، عنوان، عناوين فرعية، رابط) وكتلة محتوى `MelisCmsSliderShowSliderPlugin` تعرض
شريحة عرض مختارة على أي صفحة في الواجهة الأمامية. كما يوفّر عنصر نموذج **مُنتقي شرائح العرض** القابل لإعادة الاستخدام
والذي تدمجه وحدات أخرى (News، Blog) لربط شريحة عرض بعنصر محتوى.

في الإصدار v6 من Melis تُقدّم الأداة **لبنة React أصيلة بالكامل** لواجهة `/melis-react` الخلفية، مع
مبدّل **New / Old** يعود إلى الأداة الكلاسيكية داخل إطار iframe. أما إطار العمل والخدمات وجداول قاعدة
البيانات ومكوّن الواجهة الأمامية فتبقى دون تغيير عن الإصدار v5.

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    // …
    'MelisCmsSlider',
];
```

المتطلبات: `melis-core`، `melis-engine`، `melis-front`، `melis-cms`. تُقدّم الوحدة
`dbdeploy: true` لذلك تُنشأ جداولها/تُحدَّث بواسطة melis-dbdeploy. لبنة React
**مُقيَّدة بالتفعيل**: فهي تظهر في الواجهة الخلفية فقط طالما كانت الوحدة موجودة في
`melis.module.load.php` (اكتشاف اللبنات المعياري، انظر أدناه).

## الواجهة الخلفية بتقنية React

**المكان:** الشريط الجانبي الأيسر ← مجموعة **MelisCms** ← **Slider** (مسار الشجرة `/melis-cms/slider`). تُفتح
كتبويب علوي باسم **Slider**. يبدّل مبدّل **New / Old** (أعلى اليمين) بين واجهة React
(*New*، الافتراضية) والأداة القديمة داخل إطار iframe (*Old*).

الأداة عبارة عن **تعمّق ثلاثي المستويات**، يظهر كـ**تبويبات فرعية** أصيلة للمضيف: قائمة شرائح العرض ←
شرائح شريحة عرض معيّنة ← نموذج شريحة.

![قائمة Slider بتقنية React مع بطاقات KPI وبحث ومدير أعمدة وزر Export ومبدّل New/Old](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-list.png)

### المستوى 1 — قائمة شرائح العرض

تسرد كل شريحة عرض على المنصّة (شرائح العرض عامّة؛ ويمكن اختياريًا ربط شريحة عرض بصفحة).
تحتوي القائمة على **بطاقات KPI** (إجمالي شرائح العرض، إجمالي الشرائح، الشرائح النشطة)، ومربّع **بحث**،
ومدير **Columns**، وزر **Export**، وزر **Reset filters**؛ انقر على ترويسة للفرز. يتيح كل صف
**فتح** (شرائحها)، و**إعادة تسمية**، و**حذف**.

**+ New slider** يفتح نافذة منبثقة لإدخال **الاسم** و**صفحة مرتبطة** اختيارية تُختار من شجرة صفحات
الموقع؛ والنافذة نفسها تُعيد تسمية شريحة عرض موجودة.

![نافذة New slider المنبثقة — الاسم إضافةً إلى صفحة مرتبطة اختيارية من شجرة الصفحات](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-new.png)

### المستوى 2 — شرائح شريحة العرض

فتح شريحة عرض يضيف تبويبًا فرعيًا (مع **← Back**) يعرض شرائح تلك الشريحة: الترتيب، والحالة
(الأخضر = نشط)، والصورة المصغّرة، والعنوان، والعنوان الفرعي، والرابط. **اسحب صفًا لإعادة الترتيب**؛ **+ Add a
slide** يُنشئ شريحة جديدة؛ التعديل/الحذف لكل صف.

![شرائح شريحة عرض — قائمة بإعادة الترتيب بالسحب مع تعديل وحذف لكل صف](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-edit-slidelist-tab-properties.png)

### المستوى 3 — تعديل شريحة

تعديل (أو إضافة) شريحة يفتح تبويبًا فرعيًا متداخلًا فيه نموذج React: **Title**، و**Subtitle 1**، وحقلان من نوع
**Description (HTML)**، و**Link**، ومبدّل **Active**، ولوحة **Image** (معاينة،
**Choose an image** / **Remove image**؛ JPG، PNG، GIF أو WebP). يحفظ **Save** الشريحة. حقلا Title و
Subtitle 1 نصّان عاديّان؛ أما حقلا Description فهما HTML خام ويُطابقان `sub2`/`sub3`.

![نموذج شريحة React — العنوان والعنوان الفرعي ووصفان بصيغة HTML ورابط ومبدّل Active ولوحة صورة](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-edit-properties-slide-edit.png)

## واجهة React البرمجية

تقرأ اللبنة وتكتب عبر طبقة JSON تحت `/melis/react-api/sliders` (المسارات في
`config/react-api.php`، والمتحكّم `MelisReactApiCmsSliderController`). تتّبع جميع الاستجابات
عقد `{ success, data, error }`؛ ويرسل كل طلب جلب `X-Requested-With: XMLHttpRequest` مع
`credentials: 'include'`.

| الطريقة والعنوان | الغرض |
| --- | --- |
| `GET /sliders` | سرد شرائح العرض (keyset: `limit`، `search`، `sort`، `dir`، `after`) مع `slideCount`. |
| `GET /sliders/stats` | أعداد KPI ‏`{sliders, slides, active}`. |
| `GET /sliders/:id` | شريحة عرض واحدة ‏`{id, name, pageId, slideCount}`. |
| `POST /sliders/save` | إنشاء / إعادة تسمية شريحة عرض (`{id?, name, pageId?}`). |
| `DELETE /sliders/delete/:id` | حذف شريحة عرض وشرائحها وملفات صورها. |
| `GET /sliders/:id/slides` | الشرائح المرتّبة لشريحة عرض. |
| `POST /sliders/slides/reorder` | إعادة الترتيب (`{sliderId, ids:[…]}`). |
| `POST /sliders/slide/upload` | رفع صورة متعدد الأجزاء (الحقل `image`، `?sliderId=`) ← `{path}`. |
| `GET /sliders/slide/:id` | شريحة واحدة. |
| `POST /sliders/slide/save` | إنشاء / تحديث شريحة. |
| `DELETE /sliders/slide/delete/:id` | حذف شريحة، وإعادة تسلسل الترتيب، وإزالة صورتها. |

يتخاطب المتحكّم مع الجداول مباشرةً عبر SQL مُعامَل، مُعيدًا إنتاج قواعد العمل القديمة
(الاسم مطلوب ≤255، ترتيب الشريحة يُحسب تلقائيًا = max+1، والصور تحت `/media/sliders/<sliderId>/…` بامتدادات
jpg/jpeg/gif/png/webp، وفحص أمان الرابط، والحذف التتابعي للملفات). أما
`MelisCmsSliderService` الأعلى مستوًى فلا يزال يدعم الأداة القديمة ومكوّن الواجهة الأمامية.

## القدرات

تُعلَن الصلاحيات المتقدّمة في `config/react.capabilities.php` تحت العقدة الحاملة للصلاحيات
`meliscms_slider_tools_section`، بما يعكس المستويات الثلاثة. تُفحص سلاسل القدرات المسطّحة (مثل
`list`، `create`، `rename`، `export`، `slides`، `slides.create`، `slides.image.create`) في
React عبر `MelisCan(melisKey, cap)` وفي جانب الخادم عبر `denyUnlessCan(cap)`. يُحمى كل إجراء في المتحكّم
مرّتين — حارس وصول (`denyUnlessAccess()` ← 401/403) ثم فحص قدرة؛
ومُحلّل القدرات يعتمد سياسة **السماح افتراضيًا** للقدرات غير المُعلَنة.

## التكامل مع المضيف

| المسألة | الكيفية |
| --- | --- |
| الاكتشاف / التقييد | `GET /melis/react-api/react-modules` يسرد الوحدات النشطة التي تقدّم `brick.manifest.json`؛ ويحمّل المضيف `brick.js` ويركّب اللبنة. إزالة الوحدة تُخفي الأداة. |
| القائمة ← المسار | يربط `useNavMenu` مفتاح `forwardKey` من `MelisCmsSlider/MelisCmsSliderList` إلى `/melis-cms/slider`. |
| التبويبات الفرعية | `subTabs: true` — تقود اللبنة شريط التبويبات الفرعية الأصيل للمضيف عبر `window.__melisOpenSubTab` / `__melisCloseSubTab` / `__melisUpdateSubTabLabel`؛ وتبقى كل شاشة مُركَّبة (مخفية) لتُحفظ الحالة. |
| مبدّل New / Old | `window.__melisSetToolView(MELIS_KEY, mode)`؛ الوضع *Old* يعرض `/melis/react-tool-page?key=MelisCmsSlider_left_menu` داخل إطار iframe. |
| التدويل i18n | تقرأ اللبنة `document.documentElement.lang` وتقدّم قاموسًا داخليًا `{fr, en}`. |

معرّف اللبنة `slider` (يطابق `brick.tsx` ⇄ `brick.manifest.json`)؛ والحزمة عبارة عن Vite IIFE مع
تصدير React خارجيًا إلى متغيرات المضيف العامة، لذا تستخدم الواجهة أنماطًا مضمّنة وتدويلًا داخليًا بدلًا من
استيراد وحدات المضيف.

## الخدمات الرئيسية

لا تزال هذه تُشغّل الأداة القديمة والخدمات المُصغّرة ومكوّن الواجهة الأمامية.

| الاسم المستعار | الدور |
| --- | --- |
| `MelisCmsSliderService` | منطق العمل لشرائح العرض والشرائح؛ يُطلق أحداث `meliscmsslider_*`. |
| `MelisCmsSliderTable` | بوّابة الجدول لـ `melis_cms_slider`. |
| `MelisCmsSliderDetailTable` | بوّابة الجدول لـ `melis_cms_slider_details`. |

يمتدّ `MelisCmsSliderService` من `MelisGeneralService` ويُتيح:

| الطريقة | الدور |
| --- | --- |
| `getSlider($sliderId, $status)` | شريحة عرض واحدة مع شرائحها؛ مرّر `1` للشرائح النشطة فقط. |
| `getSliderByPageId($pageId, $status)` | شريحة العرض المرتبطة بمعرّف صفحة، مع شرائحها. |
| `getSliderList($start, $limit, $order, $search)` | قائمة شرائح العرض مُقسَّمة على صفحات وقابلة للبحث. |
| `getSliderDetails($sliderDetailId)` | صف شريحة واحد. |
| `saveSlider($data, $sliderId)` | إنشاء أو تحديث شريحة عرض؛ يُعيد معرّف شريحة العرض. |
| `saveSliderDetails($slideData, $detailId)` | إنشاء أو تحديث شريحة. |
| `updateSliderDetailsOrdering($detailId, $newOrder)` | إعادة ترتيب شريحة. |
| `deleteSlider($sliderId)` | حذف شريحة عرض وكل شرائحها. |
| `deleteSliderDetails($sliderDetailId)` | حذف شريحة واحدة. |

تُعيد `getSlider()` / `getSliderByPageId()` كيان `MelisCmsSlider\Entity\MelisCmsSlider` الذي
تُعيد فيه `getSlider()` صف الحاوية وتُعيد `getSliderDetails()` الشرائح.

**ملاحظة حول تسمية الأحداث:** تُطلق كل طريقة أحداث `meliscmsslider_service_*_start` / `_end`، لكن عدّة
طرق كتابة تُعيد استخدام أسماء أحداث طريقة أخرى في الشِفرة الحالية. تُطلق `saveSlider`
أحداث `get_slider_details`، وتُعيد `deleteSliderDetails` / `updateSliderDetailsOrdering` استخدام
أحداث `delete_details` الخاصة بـ `deleteSlider` — لذا فإن مُستمِعًا على
`meliscmsslider_service_delete_details_end` يُطلق أيضًا عند عمليات إعادة الترتيب.

**الخدمات المُصغّرة** (`config/app.microservice.php`) تُتيح `getSliderList`، و`getSlider`،
و`getSliderDetails`، و`getSliderByPageId`.

## الواجهة الأمامية

من **محرّر الصفحات بتقنية React** (MelisCms ← افتح صفحة ← Edition)، افتح لوحة المكوّنات وأفلِت
كتلة **Show Slider** على الصفحة؛ وتتيح لك **Properties** الخاصة بها اختيار قالب العرض
وشريحة العرض المراد عرضها.

![كتلة Show Slider في مُنتقي المكوّنات بمحرّر الصفحات React](/screenshots/react/melis-cms-slider/meliscmsslider-page-menu-plugins-selector.png)

![إعدادات مكوّن Show Slider — اختر القالب وشريحة العرض المراد عرضها](/screenshots/react/melis-cms-slider/meliscmsslider-page-plugin-slider-config-properties-tab.png)

| العنصر | الدور |
| --- | --- |
| `MelisCmsSliderShowSliderPlugin` (مكوّن متحكّم) | يجلب شريحة العرض المُهيّأة عبر `MelisCmsSliderService` ويعرضها من خلال القالب المختار. الإعداد: `config/plugins/MelisCmsSliderShowSliderPlugin.config.php` — تبويب **Properties** واحد يحوي `template_path` و`sliderId`. القالب الافتراضي: `view/melis-cms-slider/plugins/showslider.phtml`. |
| `MelisCmsSliderPlugin` (مُساعد عرض) | `MelisCmsSliderHelper` — يعرض المكوّن من قالب phtml. |
| `CmsSliderSelect` (عنصر نموذج) | قائمة اختيار تُملأ بشرائح العرض المتاحة؛ المصنع `src/Form/Factory/CmsSliderSelectFactory.php`. يُستخدم في نموذج خيارات المكوّن وتدمجه News / Blog. |

**واجهات المُنتقي القابلة لإعادة الاستخدام:** `meliscmsslider_select_slider` (`renderSelectSliderAction`) لـ News،
و`meliscmsslider_select_slider_blog` لـ Blog.

**المستهلكون:** يحفظ MelisCmsNews شريحة العرض المختارة في `cnews_slider_id` ويقدّم مُستمِعًا
يفصل شريحة العرض المحذوفة عن أي خبر يستخدمها؛ ويستخدم Blog الحقل `cblog_slider_id`.

## جداول قاعدة البيانات

| الجدول | يحتوي على |
| --- | --- |
| `melis_cms_slider` | شريحة عرض: `mcslide_id`، `mcslide_name`، `mcslide_page_id`، `mcslide_date`. |
| `melis_cms_slider_details` | شريحة: `mcsdetail_id`، المفتاح الأجنبي `mcsdetail_mcslider_id`، `mcsdetail_status`، `mcsdetail_title`، `mcsdetail_sub1`–`sub3`، `mcsdetail_link`، `mcsdetail_img`، `mcsdetail_order`. |

## مثال

```php
$slider = $this->getServiceManager()->get('MelisCmsSliderService');

// Fetch one slider with active slides only
$one    = $slider->getSlider($sliderId, 1);

// Fetch the slider tied to a page
$byPage = $slider->getSliderByPageId($pageId, 1);

// Paginated list
$list   = $slider->getSliderList(0, 10, 'mcslide_id', null);

// Create / update
$id     = $slider->saveSlider($data, $sliderId);
$did    = $slider->saveSliderDetails($slideData, $detailId);

// Reorder
$slider->updateSliderDetailsOrdering($detailId, $newOrder);

// Delete slider + all its slides
$slider->deleteSlider($sliderId);
```

الاستماع إلى حدث خدمة:

```php
$sharedEvents->attach(
    'MelisCmsSlider',
    'meliscmsslider_service_delete_details_end',
    $fn,
    50
);
```

## الملفات الرئيسية

| المسألة | المسار |
| --- | --- |
| ربط الوحدة | `vendor/melisplatform/melis-cms-slider/config/module.config.php` |
| مسارات واجهة React البرمجية | `vendor/melisplatform/melis-cms-slider/config/react-api.php` |
| قدرات React | `vendor/melisplatform/melis-cms-slider/config/react.capabilities.php` |
| متحكّم واجهة React البرمجية | `vendor/melisplatform/melis-cms-slider/src/Controller/MelisReactApiCmsSliderController.php` |
| لبنة React | `vendor/melisplatform/melis-cms-slider/ui-react/src/` · `public/ui-react/brick.manifest.json` |
| واجهة / أدوات الواجهة الخلفية | `vendor/melisplatform/melis-cms-slider/config/app.interface.php` · `app.tools.php` |
| نموذج الشريحة | `vendor/melisplatform/melis-cms-slider/config/app.forms.php` |
| إعداد الخدمة المُصغّرة | `vendor/melisplatform/melis-cms-slider/config/app.microservice.php` |
| إعداد مكوّن القوالب | `vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php` |
| الخدمة | `vendor/melisplatform/melis-cms-slider/src/Service/MelisCmsSliderService.php` |
| الكيان | `vendor/melisplatform/melis-cms-slider/src/Entity/MelisCmsSlider.php` |
| بوّابات الجداول | `vendor/melisplatform/melis-cms-slider/src/Model/Tables/` |
| مصنع مُنتقي شرائح العرض | `vendor/melisplatform/melis-cms-slider/src/Form/Factory/CmsSliderSelectFactory.php` |
| مُساعد العرض | `vendor/melisplatform/melis-cms-slider/src/View/Helper/MelisCmsSliderHelper.php` |
| القالب الأمامي الافتراضي | `vendor/melisplatform/melis-cms-slider/view/melis-cms-slider/plugins/showslider.phtml` |

انظر أيضًا: [مرجع الوحدات](/ar/reference/modules) · [صفحة الإصدار v5 القديم](/legacy/reference/modules/melis-cms-slider)
