# MelisCmsSiteRobot

> تحرير `robots.txt` لكل نطاق وتقديمه ديناميكيًا، مع واجهة إدارة خلفية أصلية بالكامل مبنية على React. الحزمة `melisplatform/melis-cms-site-robot`.

## الغرض

يتيح لك `MelisCmsSiteRobot` إدارة ملف `robots.txt` الخاص بكل نطاق موقع من الواجهة الخلفية، ويقوم
بتقديمه ديناميكيًا على `https://<domain>/robots.txt` — مباشرةً من قاعدة البيانات، دون أي ملف
ثابت يحتاج إلى صيانة. تسري التغييرات فور الحفظ. يُخزَّن نص robots في صف واحد لكل نطاق داخل جدول
مخصص؛ ولا توجد نسخة خاصة بكل صفحة أو بكل لغة.

في الواجهة الخلفية v6 المبنية على React (`/melis-react`)، تُقدَّم الأداة على هيئة **لبنة أصلية بالكامل بلغة React** — قائمة
ومحرر React حقيقيان يستدعيان طبقة JSON من نوع `react-api` — مع مبدّل **New / Old** يعود
إلى الأداة القديمة داخل iframe. أما نموذج البيانات الأساسي، وبوابات جداول المحرك، ومسار الواجهة الأمامية
الديناميكي `/robots.txt` فتبقى دون تغيير عن الإصدار v5.

## تفعيلها

أضف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCmsSiteRobot',
];
```

التبعيات: `melis-core` و`melis-cms`. الوحدة `dbdeploy: true`، لذا يُنشأ جدولها
تلقائيًا، وتعيد استخدام بوابات الجداول التي يوفرها `melis-engine` أثناء التشغيل. تظهر لبنة React
**فقط إذا كانت الوحدة مُفعّلة** — يكتشفها المضيف عبر `brick.manifest.json`
(`GET /melis/react-api/react-modules`)؛ وإزالة الوحدة من `melis.module.load.php` تجعلها
تختفي من القائمة.

## الواجهة الخلفية (React)

**الموقع:** الشريط الجانبي الأيسر ← مجموعة **MelisCms** ← **Robots.txt** (مسار الشجرة `/melis-cms/site-robot`).
تُفتح على هيئة تبويب علوي باسم **Robots.txt**، مع مستويين يظهران كتبويبات فرعية أصلية داخل المضيف:
**قائمة نطاقات المواقع ← محرر robots.txt لنطاق واحد**.

![قائمة Robots.txt في React — بطاقات مؤشرات الأداء (Domains / With robots.txt / Without robots.txt)، وصندوق "Search a domain…"، ومرشّح "All sites"، وأزرار Reset filters / Columns / Export، ومبدّل New/Old وزر تحديث، مع Domain / Site / Env. لكل صف وشارة Set/None بالإضافة إلى إجراء تحرير](/screenshots/react/melis-cms-site-robot/meliscmssiterobot-tool-robots-list.png)

### المستوى 1 — قائمة النطاقات

تعرض القائمة **كل نطاق موقع على المنصة** (صف واحد لكل نطاق، يُغذّى من أداة **Sites**).
وتوفر **بطاقات مؤشرات الأداء** (Domains / With robots.txt / Without robots.txt)، وصندوق **بحث**
(يطابق اسم النطاق أو اسم الموقع)، ومرشّح **All sites**، ومدير **Columns**، وزر **Export**
و**Reset filters**. تنتقل القائمة بتمرير لا نهائي (keyset) مع فرز من جانب الخادم. الأعمدة: **ID**،
**Domain**، **Site**، **Env.**، **robots.txt** (شارة **Set / None** لكل صف). لكل صف
إجراء **تحرير** (قلم رصاص)، وعند وجود محتوى إجراء **حذف** (مسح).

**لا يوجد "+ New" ولا حذف للنطاق** — تأتي النطاقات من أداة Sites؛ أنت فقط تحرّر أو
تمسح ملف robots.txt الخاص بكل نطاق.

### المستوى 2 — تحرير robots.txt لنطاق

يؤدي فتح نطاق إلى إضافة **تبويب فرعي** (مع زر **← Back**). يعرض المحرر حقلي **Domain**
و**Site** للقراءة فقط، بالإضافة إلى منطقة نص كبيرة بخط ثابت العرض لـ **robots.txt content** تحتوي على المتن. يؤدي **Save**
(أعلى اليمين) إلى حفظه، ويُقدَّم مباشرةً على `/robots.txt` الخاص بذلك النطاق. وترك المنطقة فارغة
لا يقدّم شيئًا.

![محرر robots.txt في React — حقلا Domain وSite للقراءة فقط، ومنطقة نص "robots.txt content" بخط ثابت العرض، والتبويب الفرعي ← Back وزر Save في أعلى اليمين](/screenshots/react/melis-cms-site-robot/meliscmssiterobot-tool-robots-edit.png)

### مبدّل New / Old

يبدّل مبدّل **New / Old** في أعلى اليمين الأداة بأكملها بين واجهة React (**New**، الافتراضية)
والأداة الكلاسيكية المعروضة داخل iframe (**Old**، على
`/melis/react-tool-page?key=site_robot_tool_display`).

## لبنة React

| العنصر | القيمة |
| --- | --- |
| نوع اللبنة | أصلية بالكامل بلغة React (مع احتياطي iframe قديم عبر New/Old) |
| معرّف اللبنة | `siterobot` (`brick.tsx` ⇄ `brick.manifest.json`) |
| `route` في البيان | `/melis-cms/site-robot` |
| `label` | `Robots.txt` |
| `forwardKey` | `MelisCmsSiteRobot/ToolSiteRobot` |
| `melisKey` (iframe / المنطقة القابلة للعرض) | `site_robot_tool_display` |
| `subTabs` / `persistent` | `true` / `true` |
| melisKey للصلاحيات | `meliscms_site_robot_tools_section` |
| أساس API | `/melis/react-api/site-robots` |

اللبنة عبارة عن حزمة Vite IIFE (يُستخرَج React إلى المتغيرات العامة للمضيف). `SiteRobotPage.tsx` هو
الحاوية: فهو يحلّل `/[section]/site-robot[/:id]` ويبدّل بين `DomainList` (بلا id) و
`RobotForm` (مع وجود id)، محتفظًا بوضع `mode` الخاص بـ New/Old، وبطاقات مؤشرات الأداء، والمرشحات، ومدير الأعمدة، وExport
ونافذة تأكيد الحذف المنبثقة. تُدار التبويبات الفرعية عبر جسر النافذة
(`window.__melisOpenSubTab` / `__melisUpdateSubTabLabel`).

## واجهة React API

تُوجد المسارات في `config/react-api.php`؛ والمتحكم
`MelisCmsSiteRobot\Controller\MelisReactApiSiteRobotController`. جميعها تحت
`/melis/react-api/site-robots`، وفق عقد JSON `{ success, data, error }`. يتعامل المتحكم مع
الجداول **مباشرةً عبر SQL ذي معاملات** (دون خدمة وحدة — بما يماثل الأداة القديمة).

| الطريقة والعنوان | الإجراء | الغرض |
| --- | --- | --- |
| `GET /site-robots` | `list` | سرد نطاقات المواقع (keyset: `limit`، `search`، `site`، `sort`، `dir`، `after`)؛ يحمل كل عنصر `hasRobots` |
| `GET /site-robots/stats` | `stats` | مؤشرات الأداء `{ total, withRobots, withoutRobots }` |
| `GET /site-robots/sites` | `sites` | خيارات المواقع للمرشّح |
| `GET /site-robots/:id` | `get` | نطاق واحد (`sdom_id`) مع `robotText` الخاص به |
| `POST /site-robots/save` | `save` | إدراج/تحديث ملف robots.txt لنطاق (`{ id, robotText }`) |
| `DELETE /site-robots/delete/:id` | `delete` | مسح ملف robots.txt لنطاق (يبقى النطاق نفسه) |

يقوم `list` بربط LEFT-JOIN بين `melis_cms_site_domain` و`melis_cms_site` و`melis_cms_domain_robots` (مرتبطة عبر
اسم النطاق، `robot_site_domain = sdom_domain`). ويقوم `save` بإدراج/تحديث صف robots المفهرس باسم النطاق
ويحدّ المتن المخزَّن عند **65535 حرفًا**. ترتيب المسارات مهم: تُعلَن `/stats` و`/sites` و
`/save` و`/delete/:id` **قبل** المسار الشامل `/:id` (المقيَّد بـ `[0-9]+`).

### الصلاحيات

مُعلَنة في `config/react.capabilities.php` تحت العقدة الحاملة للحقوق
`meliscms_site_robot_tools_section`:

```php
return [
    'melisReactToolCapabilities' => [
        'meliscms_site_robot_tools_section' => ['list', 'edit', 'delete', 'export'],
    ],
];
```

- **`list`** — عرض قائمة النطاقات (يتحكم أيضًا في `stats` + `sites`).
- **`edit`** — فتح (`get`) وحفظ (`save`) ملف robots.txt لنطاق.
- **`delete`** — مسح ملف robots.txt لنطاق.
- **`export`** — زر Export (تحكّم على مستوى الواجهة، يعيد استخدام القائمة).

**لا توجد** صلاحية `create` — لا يمكنك إضافة نطاق من هذه الأداة. كل إجراء في المتحكم
محمي مرتين: `denyUnlessAccess()` (المصادقة + `MelisCoreRights::canAccess`) ثم `denyUnlessCan(cap)`
(السماح افتراضيًا؛ يبقى الخادم نقطة الإنفاذ).

## الخدمات الرئيسية

لا تسجّل الوحدة أي خدمة خاصة بها. تتشارك الأداة القديمة وواجهة React API نفس نموذج
البيانات؛ وتبقى بوابات المحرك متاحة:

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `MelisEngineTableRobot` | بوابة جدول فوق `melis_cms_domain_robots` — تقرأ وتكتب `robot_text` حسب النطاق. |
| `MelisEngineTableSiteDomain` | تغذّي قائمة نطاقات المواقع (`sdom_id`، `site_label`، `sdom_domain`). |

## الواجهة الأمامية

يقوم مسار عام في `config/module.config.php` (`melis-cms-site-robot-special-urls`) بتعيين `/robots.txt`
إلى `ToolSiteRobotController::toolRobotsTxtAction`. يبحث الإجراء في `melis_cms_domain_robots` حسب
المضيف المُرسِل للطلب ويُخرج `robot_text` المخزَّن. دون تغيير في v6.

| المسار | المعالِج | النتيجة |
| --- | --- | --- |
| `/robots.txt` | `ToolSiteRobotController::toolRobotsTxtAction` | يقدّم `robot_text` المخزَّن للنطاق المُرسِل للطلب. |

## جداول قاعدة البيانات

| الجدول | يحتوي على |
| --- | --- |
| `melis_cms_domain_robots` | إدخال robots.txt واحد لكل نطاق: `robot_id` (PK)، `robot_site_domain`، `robot_text`. |

## الملفات الرئيسية

| المجال | المسار |
| --- | --- |
| مسارات React API | `vendor/melisplatform/melis-cms-site-robot/config/react-api.php` |
| صلاحيات React | `vendor/melisplatform/melis-cms-site-robot/config/react.capabilities.php` |
| بيان لبنة React | `vendor/melisplatform/melis-cms-site-robot/public/ui-react/brick.manifest.json` |
| متحكم React API | `vendor/melisplatform/melis-cms-site-robot/src/Controller/MelisReactApiSiteRobotController.php` |
| الأداة القديمة + مسار `/robots.txt` | `vendor/melisplatform/melis-cms-site-robot/src/Controller/ToolSiteRobotController.php` |
| المسارات (الواجهة الخلفية + `/robots.txt`) | `vendor/melisplatform/melis-cms-site-robot/config/module.config.php` |
| SQL التثبيت | `vendor/melisplatform/melis-cms-site-robot/install/` |

انظر أيضًا: [مرجع الوحدات](/ar/reference/modules)، [melis-cms](/ar/reference/modules/melis-cms)، [melis-core](/ar/reference/modules/melis-core)
