# بناء موقع ويب (نظام إدارة المحتوى CMS)

Melis هو، في المقام الأول، **نظام إدارة محتوى (CMS)**. تشرح هذه الصفحة نموذج المحتوى — **المواقع**
و**الصفحات** و**القوالب** و**الإضافات** — وكيفية عرض الصفحة في الواجهة الأمامية. إنه
النموذج الذهني الذي تحتاجه قبل تعديل القوالب أو بناء وحدة موقع.

::: tip v6 — الواجهة الخلفية بلغة React
تحتفظ النسخة v6 من Melis بإطار العمل نفسه والوحدات ونموذج البيانات الموصوف هنا. ما تغيّر هو
**واجهة الواجهة الخلفية**: فهي تعمل الآن بوصفها **تطبيق React على المسار `/melis-react`**. يُقدَّم نظام إدارة المحتوى بوصفه
أدوات "لبنات" أصلية بلغة React — **شريط جانبي لشجرة الصفحات** إلى جانب **محرّر صفحات مبوّب** ومجموعة من
الأدوات الجانبية (المواقع، القوالب، الأنماط، اللغات…). الاستثناء الوحيد هو تبويب **Edition** الخاص بالصفحة،
الذي لا يزال يحمّل محرّر السحب والإفلات الكلاسيكي **داخل iframe**. تحمل كل أداة جانبية مبدّل
**New / Old** حتى تتمكن من التبديل إلى الأداة الكلاسيكية إذا احتجت إليها. المفاهيم أدناه
لم تتغيّر؛ ما تغيّر هو *مكان النقر* فقط.
:::

## نموذج المحتوى

| المفهوم | ما هو | الجدول (الجداول) الرئيسية |
| ------------ | ---------- | ------------- |
| **الموقع (Site)** | موقع ويب. له صفحة رئيسية ولغات ونطاق واحد أو أكثر لكل بيئة. | `melis_cms_site`، `melis_cms_site_domain` |
| **الصفحة (Page)** | عقدة في شجرة صفحات الموقع. لها نوع (موقع/مجلد/صفحة) وقالب ومحتوى. | `melis_cms_page_tree`، `melis_cms_page_published`، `melis_cms_page_saved` |
| **القالب (Template)** | التخطيط الذي تستخدمه الصفحة — يشير إلى متحكّم/إجراء/عرض في وحدة موقع. | `melis_cms_template` |
| **تحسين محركات البحث (SEO)** | مقطع عنوان URL لكل صفحة ووسوم الميتا. | `melis_cms_page_seo` |
| **اللغة (Language)** | يمكن أن تحتوي الصفحة على ترجمات مرتبطة ببعضها. | `melis_cms_lang`، `melis_cms_page_lang` |

هذه الجداول مملوكة لـ **MelisEngine**، محرّك نظام إدارة المحتوى — المصدر الوحيد للحقيقة الخاص بنموذج
الصفحة/الموقع. تقرأ الواجهة الخلفية بلغة React هذه الجداول وتكتب فيها فقط عبر خدمات المحرّك
وبوّابات الجداول؛ ولا تلمس المخطط مباشرةً أبدًا. راجع
[MelisEngine](/ar/reference/modules/melis-engine).

### الصفحات مُصدَّرة بنُسخ

توجد كل صفحة في نسختين:

- **المحفوظة (Saved)** (`melis_cms_page_saved`) — المسودّة قيد العمل التي تحرّرها في الواجهة الخلفية.
- **المنشورة (Published)** (`melis_cms_page_published`) — النسخة الحيّة التي تُقدَّم في الواجهة الأمامية.

أنت تحرّر المسودّة، ثم **تنشر** عندما تكون جاهزًا. يُخزَّن محتوى الصفحة القابل للتحرير (راجع *المناطق* و
*الإضافات* أدناه) في سجلّ الصفحة.

## القوالب

**القالب** (`melis_cms_template`) هو الجسر بين الصفحة والشيفرة التي تعرضها.
بالنسبة لنوع القالب الشائع `ZF2`، فإنه يخزّن:

- `tpl_zf2_website_folder` — **وحدة الموقع** (مثل `MelisDemoCms`)،
- `tpl_zf2_controller`، `tpl_zf2_action` — أي متحكّم/إجراء يعرض الصفحة،
- `tpl_zf2_layout` — التخطيط الذي يُلَف حوله.

إذًا الصفحة → تشير إلى قالب → يوجّه إلى عرض `.phtml` داخل وحدة موقع.

في الواجهة الخلفية بلغة React، تُدير القوالب في الأداة الجانبية **Templates** (§ *إنشاء موقع
جديد*) — قائمة ونموذج أصليان بلغة React للاسم والنوع والموقع والتخطيط والمتحكّم والإجراء.

## المحتوى القابل للتحرير: المناطق والإضافات

تُظهر القوالب نوعين من المناطق القابلة للتحرير، عبر **مساعِدات العرض (view helpers)**:

### `MelisTag` — مناطق قابلة للتحرير بسيطة

منطقة HTML/نص/وسائط مسمّاة يحرّرها المحرّر في مكانها (TinyMCE) في الواجهة الخلفية:

```php
<?= $this->MelisTag($this->idPage, 'home-html-1', 'html', '<h1>Default heading</h1>') ?>
```

يُعرَض المحتوى الافتراضي حتى يتجاوزه المحرّر؛ وتُخزَّن القيمة المحفوظة في الصفحة.
المساعِد: `vendor/melisplatform/melis-front/src/View/Helper/MelisTagsHelper.php`.

### `MelisDragDropZone` — إضافات القوالب

منطقة إفلات يسحب إليها المحرّرون **إضافات القوالب** — كتل محتوى قابلة لإعادة الاستخدام (شريط تمرير،
قائمة أخبار، نموذج اتصال):

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

المساعِد: `vendor/melisplatform/melis-front/src/View/Helper/MelisDragDropZoneHelper.php`.

تمتدّ إضافة القالب من `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` وتنفّذ:

- **`front()`** — تُعيد البيانات/العرض المعروض على الموقع الحيّ،
- **`back()`** — نموذج الإعدادات المعروض في محرّر الواجهة الخلفية.

يُعدّ `MelisCmsSlider` و`MelisCmsNews` إضافتين مرجعيتين جيدتين؛ استخدم **MelisTemplatingPluginCreator**
لتوليد هيكل إضافتك الخاصة. يُفلِت المحرّرون هذه الكتل في تبويب **Edition** لمحرّر الصفحة — انظر أدناه.

## كيف تُعرَض الصفحة في الواجهة الأمامية

تُقدَّم الواجهة الأمامية بواسطة **MelisFront** (المحرّك الذي يعرض المواقع) فوق
**MelisEngine** (خدمات الصفحة/البيانات). هذا العرض بالكامل من جانب الخادم ولم يتغيّر في v6 —
تكتفي الواجهة الخلفية بلغة React بـ *استضافة* المعاينة القابلة للتحرير، ولا تُعيد عرض الصفحة في
المتصفّح. بإيجاز:

1. يضبط الـ vhost القيمة **`MELIS_MODULE`** ← تحدّد **وحدة الموقع** المراد تقديمها.
2. عنوان URL مثل `…/id/5` يُحلَّل إلى **الصفحة ذات المعرّف 5** (المسار في
   `vendor/melisplatform/melis-front/config/module.config.php`). تُربَط عناوين URL الخاصة بالـ SEO بمعرّفات الصفحات أيضًا.
3. يحمّل **MelisEngine** الصفحة + قالبها
   (`vendor/melisplatform/melis-engine/src/Service/MelisPageService.php`).
4. يعرض متحكّم/إجراء `ZF2` الخاص بالقالب عرض `.phtml` لوحدة الموقع.
5. تُملأ مناطق `MelisTag` وإضافات `MelisDragDropZone` من محتوى الصفحة المنشور.
6. تُلَف النتيجة داخل تخطيط الموقع.

::: tip أوضاع التحرير / المعاينة
يمكن طلب الصفحة نفسها بأوضاع مختلفة: `…/id/5` (حيّ)، `…/id/5/preview` (المسودّة
المحفوظة)، `…/id/5/renderMode/melis` (التحرير داخل الواجهة الخلفية — وهذا ما يعرضه iframe الخاص بتبويب Edition).
:::

## تشريح وحدة موقع

**وحدة الموقع** هي وحدة Laminas عادية تحتوي على قوالب موقع الويب وعروضه وأصوله.
المرجع هو `vendor/melisplatform/melis-demo-cms/` (راجع
[MelisDemoCms](/ar/reference/modules/melis-demo-cms))؛ عادةً ما توجد المواقع المخصّصة تحت
`module/MelisSites/<YourSite>/`:

```
MelisDemoCms/
├── config/
│   ├── module.load.php           # modules this site needs (MelisEngine, MelisFront, plugins…)
│   ├── module.config.php         # routes / controllers / services
│   ├── assets.config.php         # front-office CSS & JS
│   └── melis.plugins.config.php  # templating plugins available to templates
├── src/Controller/               # Home, Contact… (render the template views)
├── view/
│   ├── layout/                   # site layouts
│   └── melis-demo-cms/home/index.phtml   # a page template (uses MelisTag / MelisDragDropZone)
└── public/                       # css / js / images
```

## العمل في الواجهة الخلفية بلغة React

في v6 تبني المواقع من **الواجهة الخلفية بلغة React** على المسار `/melis-react`. افتح قسم **MelisCms**
في الشريط الجانبي الأيسر: يُظهر لوحة **شجرة الصفحات** (مواقعك وصفحاتها) إلى جانب
مجموعة **Site Tools**.

![قسم MelisCms في الشريط الجانبي لـ React — شجرة الصفحات إلى جانب Site Tools.](/screenshots/react/melis-cms/meliscms-menu-entry.png)

### شجرة الصفحات

شجرة الصفحات هي خريطة مواقعك وكل صفحة داخلها. توجد في **الشريط الجانبي الأيسر**،
لذا تبقى مرئية أثناء عملك. انقر على صفحة لفتحها في المحرّر؛ اكتب اسمًا للبحث؛
انقر بزر الفأرة الأيمن على عقدة لإضافة صفحة فرعية، أو رؤية التفاصيل، أو تكرارها، أو نقلها، أو حذفها. يمكنك أيضًا نقل
صفحة بالسحب والإفلات (الصلاحيات من جانب الخادم تحدّد ما يمكنك نقله).

![شجرة الصفحات في React — المواقع والصفحات؛ انقر للفتح، انقر بالزر الأيمن للإجراءات.](/screenshots/react/melis-cms/meliscms-menu-site-treeview.png)

### محرّر الصفحة — ضع المحتوى على الصفحة

يُظهر فتح صفحة المحرّر: **إطار (chrome) أصلي بلغة React** (عنوان الصفحة + الحالة، وأزرار الإجراءات،
وشريط التبويبات) يحيط بمحتوى التبويب الحالي. التبويبات هي **Properties · Edition · SEO · Languages**
(بالإضافة إلى تبويبات تساهم بها وحدات أخرى — Historic، Analytics، Scripts…). تتضمّن أزرار الإجراءات
**Save** و**Publish** و**See** (Preview / See online) و**Duplicate** و**Erase draft** و**Delete**.

- **Properties** *(أصلي بلغة React)* — اسم الصفحة، والنوع (Page / Folder / Site)، والقالب (التخطيط)،
  واللغة، وعرض القائمة، والنمط، والتصنيف.

  ![تبويب Properties في React.](/screenshots/react/melis-cms/meliscms-page-tab-properties.png)

- **Edition** *(المحرّر الكلاسيكي داخل iframe)* — املأ الصفحة. تُعرَض بشكل حيّ وأنت **تسحب
  كتل المحتوى (الإضافات)** إلى مناطق القالب (مناطق `MelisDragDropZone`). هذا التبويب
  هو محرّر السحب والإفلات الكلاسيكي المحمّل داخل إطار React، لذا فإن لوحة الإضافات وتخطيطات
  مناطق الإفلات ومحرّرات النص الغني هي تمامًا كما كانت من قبل.

  ![تبويب Edition — صفحة حيّة مع تراكب السحب والإفلات، داخل إطار React.](/screenshots/react/melis-cms/meliscms-page-tab-edition.png)

  ![لوحة الإضافات — كتل المحتوى التي يمكنك إفلاتها على الصفحة.](/screenshots/react/melis-cms/meliscms-page-tab-edition-menu-templating-plugins.png)

- **SEO** *(أصلي بلغة React)* — عنوان URL الودّي، وعنوان/وصف الميتا، وحقول إعادة التوجيه.
- **Languages** *(أصلي بلغة React)* — أنشئ وأدر نسخ لغات الصفحة.

**Save مقابل Publish.** يكتب *Save* المسودّة (Properties + SEO + محتوى السحب والإفلات، كلها في إجراء
واحد)؛ ويعرض *See → Preview* المسودّة؛ ويجعل *Publish* المسودّة الحالية حيّة؛ ويعيد *Erase draft*
إلى النسخة المنشورة. القاعدة العامة: حرّر بحرّية، و**احفظ (Save)** أثناء عملك، و**عايِن (Preview)** للتحقق،
ثم **انشر (Publish)**.

### كتل المحتوى القياسية

الكتل التي تُفلِتها على الصفحة في تبويب Edition تأتي من **MelisFront**. أكثرها شيوعًا:
كتلة **HTML (Text)** وكتلة **Media** (كلتاهما تُحرَّران **في مكانهما**)، بالإضافة إلى كتل إعدادات تُهيّأ
عبر نافذة **Properties** منبثقة صغيرة — **Menu** و**Breadcrumb** و**List-from-folder** و
**GDPR banner**. راجع [MelisFront](/ar/reference/modules/melis-front) للاطلاع على الكتالوج الكامل.

![كتلة HTML (Text) مُحرَّرة في مكانها، مع شريط أدوات WYSIWYG على الصفحة.](/screenshots/react/melis-front/melisfront-page-plugin-html-tag.png)

## إنشاء موقع جديد (نظرة عامة)

على مستوى عالٍ:

1. **أنشئ الموقع** في الواجهة الخلفية — الشريط الجانبي ← **Site Tools → Sites → + New site**، ثم
   **معالج الخطوات الخمس** (Multilingual → Languages → Domains → Module → Summary)، الذي يُنشئ الموقع
   وصفحته الرئيسية.

   ![أداة Sites في React — كل صف هو موقع ويب كامل، مع "+ New site".](/screenshots/react/melis-cms/meliscms-tool-sites-list.png)

2. **وفّر وحدة موقع** تحت `module/MelisSites/<YourSite>/` (المتحكّمات + قوالب `.phtml`
   + الأصول).
3. **أعلِن عن القوالب** (`melis_cms_template`) بحيث تشير إلى متحكّم/إجراء وحدتك — Site
   Tools → **Templates**.
4. **ابنِ شجرة الصفحات** وعيّن القوالب؛ أضف `MelisTag`/`MelisDragDropZone` إلى عروضك.
5. **وجّه vhost** إلى `public/` مع `SetEnv MELIS_MODULE "<YourSite>"` (راجع
   [التثبيت](/ar/guide/getting-started)).
6. **انشر** وتصفّح الواجهة الأمامية.

بمجرّد وجود موقع، افتحه من أداة Sites لإدارته عبر تبويبات React الأصلية: **Properties
· Module Loading · Domains · Languages · Site Config · Translations · Scripts**. تبويب **Module
Loading** هو المكان الذي تُفعِّل فيه ميزة لموقع معيّن (مع إعادة ترتيب ترتيب التحميل بالسحب).

> ابدأ بقراءة `vendor/melisplatform/melis-demo-cms/` من أوله إلى آخره — فهو المثال المرجعي
> العملي لكل مفهوم في هذه الصفحة.

## الملفات الرئيسية

| الجانب | المسار |
| --- | --- |
| خدمات نظام إدارة المحتوى (الصفحات/المواقع) | `vendor/melisplatform/melis-cms/src/Service/` |
| لبنات CMS بلغة React (محرّر الصفحة + الأدوات الجانبية) | `vendor/melisplatform/melis-cms/ui-react/src/` |
| خدمة الصفحة (المحرّك) | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| عرض الواجهة الأمامية | `vendor/melisplatform/melis-front/` |
| مساعِدات المناطق القابلة للتحرير | `vendor/melisplatform/melis-front/src/View/Helper/` |
| الأساس لإضافة القالب | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| موقع العرض التوضيحي المرجعي | `vendor/melisplatform/melis-demo-cms/` |

> وحدات React التي تملك الواجهة — [MelisCms](/ar/reference/modules/melis-cms)،
> و[MelisFront](/ar/reference/modules/melis-front) و[MelisEngine](/ar/reference/modules/melis-engine) —
> توثّق الأدوات والإضافات ونموذج البيانات بالكامل.
