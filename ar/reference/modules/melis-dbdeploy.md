# MelisDbDeploy

> مُشغِّل ترحيل قواعد البيانات بلا واجهة لمنصّة Melis — يطبّق دلتا SQL الخاصة بكل وحدة بالترتيب. الحزمة `melisplatform/melis-dbdeploy`.

## الغرض

يُبقي `MelisDbDeploy` مخطّط قاعدة بيانات كل وحدة متزامنًا مع الشيفرة المثبّتة. فكل وحدة
تختار المشاركة تشحن تغييرات مخطّطها على هيئة ملفات SQL مرتّبة (**deltas**) ضمن
`install/dbdeploy/`. يكتشف MelisDbDeploy تلك الدلتا عبر جميع الوحدات، ويطبّق ما لم
يُنفَّذ منها بعد، ويسجّل كلًّا منها في جدول سجلّ التغييرات حتى يُطبَّق مرّة واحدة بالضبط — مبنيًّا
فوق مَهمّة `DbDeployTask` الخاصة بـ [Phing](https://www.phing.info/).

وليست له **أي واجهة موجّهة للمستخدم**.

## علاقته بالمكتب الخلفي React

لا يملك MelisDbDeploy **أي أداة React، ولا صفحة، ولا مدخل قائمة، ولا مسارًا**. ولا يظهر أبدًا في أي مكان ضمن
`/melis-react`. لا توجد لبنة `ui-react/`، ولا `config/react-api.php`، ولا
`config/react.capabilities.php`، ولا `src/Controller/` — فهو وحدة بلا واجهة، خدميّة فقط.

وصلته بالمكتب الخلفي React **غير مباشرة بالكامل**، عبر حقيقتين:

- **إنّه يُنشئ الجداول والأعمدة التي تقرأ منها أدوات React وتكتب فيها.** فكل أداة React (المستخدمون،
  صفحات CMS، المواقع، الوسائط، …) تستعلم عن جداول قاعدة البيانات. تلك الجداول — والأعمدة التي تضيفها
  ميزات React الأحدث — تُنشَأ عبر دلتا `install/dbdeploy/*.sql` الخاصة بالوحدة المالكة، والتي
  يطبّقها MelisDbDeploy. فإذا أخفقت أداة React برسالة "table/column not found" مباشرةً بعد
  تثبيت أو تحديث، فالسبب المعتاد هو ترحيل لم يُشغَّل.
- **إنّه يعمل ضمن مسار النشر الذي يشحن بنية React.** فبنية React المُودَعة
  (`melis-core/public/ui-react/`، التطبيق على `/melis-react`) تُشحَن عبر نفس عملية النشر التي
  تشغّل ترحيلات المخطّط. يتولّى MelisDbDeploy دلتا SQL **المشحونة مع الوحدات**؛ بينما يتولّى **Flyway**
  ترحيلات المنصّة المُصدَّرة بأرقام إصدارات (`V*.sql`). وهما آليّتان متكاملتان ضمن
  خطوة النشر ذاتها.

## تفعيله

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisDbDeploy',
];
```

يعتمد `MelisDbDeploy` على `phing/phing` فقط. وليست له **أي** تبعية على `melis-core` — فهو أداة
قائمة بذاتها يستدعيها MelisInstaller وتدفّقات تثبيت/تحديث الوحدات، ولا تُستدعى أبدًا
من React.

## اختيار مشاركة وحدة

تُشارك الوحدة في نظام الترحيل بإعلان ما يلي في ملف `composer.json` الخاص بها:

```json
"extra": {
    "dbdeploy": true
}
```

وتُوضَع دلتا SQL الخاصة بها في `install/dbdeploy/*.sql`. ويبدأ كل اسم ملف ببادئة رقمية
تحدّد ترتيب التنفيذ (مثل `23051701_create_my_table.sql`).

## الخدمات الرئيسية

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `MelisDbDeployDiscoveryService` | يعثر على دلتا كل حزمة `melisplatform/*` مختارة للمشاركة وينسخها إلى ذاكرة العمل المؤقتة (`dbdeploy/data/`)، ثم يفوّض الأمر إلى خدمة النشر. |
| `MelisDbDeployDeployService` | يتّصل بقاعدة البيانات، ويتأكّد من وجود جدول سجلّ التغييرات، ويطبّق الدلتا المعلّقة عبر `DbDeployTask` + `PDOSQLExecTask` الخاصة بـ Phing. |

## جدول سجلّ التغييرات

تُسجَّل كل دلتا مطبَّقة في جدول `changelog` ثابت (الاسم مطلوب من مَهمّة Phing)،
والذي يعمل بوصفه سجلّ "التطبيق مرّة واحدة":

```sql
CREATE TABLE IF NOT EXISTS changelog (
  `change_number` BIGINT NOT NULL,
  `delta_set`     VARCHAR(10) NOT NULL,
  `start_dt`      TIMESTAMP NOT NULL,
  `complete_dt`   TIMESTAMP NULL,
  `applied_by`    VARCHAR(100) NOT NULL,
  `description`   VARCHAR(500) NOT NULL,
  PRIMARY KEY `Pkchangelog` (`change_number`, `delta_set`)
);
```

يتمّ الوصول إلى النموذج عبر `MelisDbDeploy\Model\Table\ChangelogTable` (باسم مستعار `ChangelogTable`).

## مثال

```php
// Discovery — gather deltas from all dbdeploy modules
$discovery = $sm->get(\MelisDbDeploy\Service\MelisDbDeployDiscoveryService::class);
$discovery->setComposer($composer);
$discovery->processing();   // discovers modules and copies their *.sql deltas

// Deploy — apply pending deltas
$deploy = new \MelisDbDeploy\Service\MelisDbDeployDeployService(/* db params */);
if (!$deploy->isInstalled()) {
    $deploy->install();                  // creates the changelog table on first run
}
$count = $deploy->changeLogCount();      // number of deltas applied so far
$deploy->applyDeltaPath($pathToDeltas);  // run any not-yet-applied deltas
```

## متى يعمل

يُستدعى MelisDbDeploy تلقائيًّا في سيناريوهين، لا يتضمّن أيٌّ منهما واجهة React:

- **التثبيت الأول** — عبر **MelisInstaller** أثناء معالج إعداد المنصّة.
- **تثبيت / تحديث وحدة** — عبر أداة الوحدات / المتجر في المكتب الخلفي وخطّاف ما بعد التحديث في Composer
  (`DbDeployOnComposerUpdate::postUpdate()`)، الذي ينسخ دلتا كل وحدة
  ويعيد تطبيقها حتى يطابق عدد سجلّ التغييرات عدد ملفات الدلتا (تقارب مُتَّسِق مع إعادة التطبيق).

وهو لا يعرض أي متحكّمات.

## استكشاف الأخطاء وإصلاحها

إذا أظهرت أداة React بيانات فارغة أو خطأ 500 / "table doesn't exist" مباشرةً بعد تثبيت وحدة
أو تحديثها أو نشرها، فالسبب الجذري النمطي هو **دلتا dbdeploy لم تُشغَّل** (أو ترحيل Flyway مفقود)
— لا شيفرة React. وإعادة تشغيل تدفّق الترحيل تُصلح ذلك.

## الملفات الرئيسية

| المجال | المسار |
| --- | --- |
| خدمة الاكتشاف | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDiscoveryService.php` |
| خدمة النشر | `vendor/melisplatform/melis-dbdeploy/src/Service/MelisDbDeployDeployService.php` |
| خطّاف ما بعد التحديث في Composer | `vendor/melisplatform/melis-dbdeploy/src/DbDeployOnComposerUpdate.php` |
| تعريف بنية سجلّ التغييرات (DDL) | `vendor/melisplatform/melis-dbdeploy/data/changelog.sql` |
| النماذج | `vendor/melisplatform/melis-dbdeploy/src/Model/` |
| دلتا الوحدة (أي وحدة) | `vendor/melisplatform/<module>/install/dbdeploy/*.sql` |

انظر أيضًا: [MelisCore](/ar/reference/modules/melis-core) · [MelisInstaller](/ar/reference/modules/melis-installer) · [MelisComposerDeploy](/ar/reference/modules/melis-composerdeploy) · [مفاهيم المنصّة](/ar/guide/concepts)
