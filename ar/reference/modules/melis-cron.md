# MelisCron

> مدير المهام المجدولة في الواجهة الخلفية: عرِّف مهام CLI أو HTTP بجداول زمنية مرنة، وشغِّلها عند الطلب أو عبر مشغِّل CLI يعمل كل دقيقة، واطّلع على سجل التنفيذ الكامل — مدعوم الآن بأداة React أصلية. الحزمة `melisplatform/melis-cron`.

## الغرض

يستبدل MelisCron أسطر crontab المكتوبة يدويًا بقائمة مهام مُدارة. تشير كل مهمة إلى **أمر CLI** أو **عنوان HTTP** وتُحدِّد موعد التشغيل (كل N دقيقة/ساعة/يوم، أو كل ساعة، أو يوميًا، أو أسبوعيًا، أو شهريًا). يُسجَّل كل تنفيذ في جدول سجل يتضمن الحالة والمدة والمخرجات الملتقَطة. لا يزال التنفيذ المجدول يتطلب إدخالًا واحدًا في crontab على مستوى نظام التشغيل يستدعي مشغِّل `melis:cronexec` كل دقيقة؛ أما أداة React فتقوم فقط بتعريف المهام وتسجيلها وتشغيلها (عند الطلب).

## تفعيله

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCron',
];
```

يتطلب **MelisCore** (يوفره النظام الأساسي). تبعيات Composer: PHP `^8.1|^8.3`، و`ext-curl`، و`composer/composer ^2.9.6`، و`laminas/laminas-cli ^1.5`. تظهر أداة React فقط في حال تفعيل الوحدة (اكتشاف اللبنات المعيارية).

## الواجهة الخلفية (React)

**الشريط الجانبي → MelisCore → Dev Tools → Scheduled Tasks**، بجانب Melis Phpinfo وأداة SQL. تُفتح كعلامة تبويب علوية باسم **Scheduled Tasks** وتُشحن كـ**لبنة React أصلية بالكامل** (معرِّف اللبنة `cron`، وmelisKey `cron_tool`)، مع مبدِّل **New / Old**: *New* هي واجهة React (الافتراضية)؛ و*Old* تعرض الأداة القديمة المبنية على jQuery داخل iframe.

بما أن مهمة cron تُشغِّل أوامر CLI عشوائية واستدعاءات HTTP، فإن عمليات **الإنشاء / التعديل / التشغيل** مقصورة على **مسؤولي** النظام الأساسي من جهة الخادم، إضافةً إلى فحوص الصلاحيات.

### قائمة المهام

تعرض القائمة كل مهمة مجدولة مع **بطاقات مؤشرات الأداء الرئيسية (KPI)** (الإجمالي / النشطة / غير النشطة)، وحقل **بحث** (بالاسم والهدف)، ومرشِّحات **الحالة** (الكل / نشطة / غير نشطة) و**النوع** (CLI / HTTP)، وزر **Reset filters**، ومدير **Columns** (محفوظ)، وزر **Export** وزر **refresh**. انقر على رأس عمود للترتيب. لكل صف ثلاثة إجراءات: **Run now** (▶)، و**edit**، و**delete** (الحذف يزيل أيضًا سجل المهمة). أزرار أعلى اليمين: **History**، ومبدِّل **New / Old**، و**+ New task**. تُفتح صفحتا النموذج والسجل كـ**علامات تبويب فرعية** أصلية داخل علامة تبويب Scheduled Tasks، وتحتفظ كل منها بحالتها.

![أداة Cron في React: بطاقات مؤشرات الأداء، والبحث، ومرشِّحات الحالة والنوع، وColumns، وExport، ومبدِّل New/Old، وHistory، و+ New task، مع إجراءات Run/edit/delete لكل صف](/screenshots/react/melis-cron/meliscron-tool-cron-list.png)

### إنشاء / تعديل مهمة

يفتح زر **+ New task** (أو قلم التعديل في أحد الصفوف) نموذج React من لوحتين في علامة تبويب فرعية:

- **الهوية + الهدف** — **Name**، و**Type** (مبدِّل مقطّع CLI / HTTP)، و**Target** (أمر CLI مثل `cache:clear`، أو عنوان HTTP)، مع تلميح يتوافق مع النوع.
- **الخيارات** — مبدِّل **Active** ومُحدِّد **Schedule**. اختيار جدول زمني يكشف مُحرِّره: *Interval* = قيمة + وحدة (دقائق/ساعات/أيام)؛ *Hourly* = دقيقة الساعة؛ *Daily* = ساعة + دقيقة؛ *Weekly* = أزرار أيام الأسبوع + ساعة + دقيقة؛ *Monthly* = يوم الشهر + ساعة + دقيقة.

![نموذج المهمة الجديدة في React — Name، وType (CLI/HTTP)، وTarget مع تلميح يتوافق مع النوع، ولوحة الخيارات مع مبدِّل Active ومُحرِّر Schedule (Interval — كل 15 دقيقة)](/screenshots/react/melis-cron/meliscron-tool-cron-new.png)

يحفظ زر **Save** المهمة. التحقق (المُطبَّق على جهتَي العميل والخادم): الاسم مطلوب (≤ 100 حرف)، والهدف مطلوب (≤ 255 حرفًا)، والنوع يجب أن يكون CLI/HTTP، وخيارات الجدول الزمني صالحة للنوع المُختار.

![تعديل "CRON 1" (مهمة HTTP هدفها /my-url، كل 15 دقيقة) — النموذج نفسه من لوحتين، مملوء مسبقًا من المهمة](/screenshots/react/melis-cron/meliscron-tool-cron-edit.png)

### التشغيل الفوري والسجل

يطلب زر **Run** (▶) في كل صف تأكيدًا، ثم **يُنفِّذ المهمة فورًا** (بشكل متزامن، ضمن الطلب) ويُبلِّغ عن النتيجة — الحالة، وحالة HTTP لمهام HTTP، والمدة — كإشعار، ويكتب مدخلًا في السجل. وهذا يتجاوز الجدول الزمني.

![مربع حوار تأكيد "Run task" — "Are you sure you want to perform 'CRON 1' now?" مع Cancel / Run](/screenshots/react/melis-cron/meliscron-tool-cron-run.png)

يفتح زر **History** صفحة **Execution history** في علامة تبويب فرعية: بطاقات مؤشرات الأداء (عمليات التنفيذ / الناجحة / الفاشلة / قيد التشغيل)، ومرشِّحات (بحث بالاسم والسجلات، وقائمة منسدلة للمهمة، وقائمة منسدلة للحالة، ونطاق تاريخ From/To)، وجدول بعمليات التشغيل (المهمة، والنوع، والحالة، والمدة، وتاريخ التشغيل، وشارة إعادة التشغيل). تعرض نافذة **Logs** المنبثقة في كل صف تفاصيل التنفيذ (الهدف، وتواريخ الانتظار/التشغيل، والمدة، ورمز HTTP) والسجلات الخام الملتقَطة.

## واجهة برمجة تطبيقات React

المسارات في `config/react-api.php`، والمتحكِّم `MelisCron\Controller\MelisReactApiCronController`. جميعها تحت `/melis/react-api/crons`، بالعقد `{ success, data, error }`.

| الطريقة والعنوان | الإجراء | الغرض |
| --- | --- | --- |
| `GET /crons` | `list` | سرد المهام (keyset: `limit`، `search`، `active`، `type`، `sort`، `dir`، `after`) |
| `GET /crons/stats` | `stats` | مؤشرات الأداء `{total, active, inactive}` |
| `GET /crons/:id` | `get` | مهمة واحدة |
| `POST /crons/save` | `save` | إنشاء / تحديث مهمة (مُتحقَّق منها) — **للمسؤولين فقط** |
| `DELETE /crons/delete/:id` | `delete` | حذف مهمة وسجلها |
| `POST /crons/run/:id` | `run` | تنفيذ مهمة **الآن** (متزامن) — **للمسؤولين فقط** |
| `GET /crons/history` | `history` | سجل التشغيل (المرشِّحات `cronId`، `state`، `search`، `startDate`، `endDate`، `page`، `limit`) |
| `GET /crons/history/:id` | `historyDetail` | عملية تنفيذ واحدة + سجلات كاملة |

يستدعي كل إجراء أولًا `denyUnlessAccess()` (المصادقة + `MelisCoreRights::canAccess('cron_tool')`). وتضيف الإجراءات المعدِّلة `denyUnlessAdmin()` (تحظر غير `usr_admin`) و`denyUnlessCan(cap)`. تتعامل عمليات القراءة وCRUD مع الجدولين عبر SQL مُعامَل؛ ويفوِّض `run` إلى `MelisCronService::runTaskNow($id)`.

### الصلاحيات

مُعلَنة في `config/react.capabilities.php` ضمن عقدة `cron_tool` — قائمة CRUD مسطّحة:

```php
'melisReactToolCapabilities' => [
    'cron_tool' => ['list', 'create', 'edit', 'delete', 'export', 'run'],
],
```

في React، يتحكم `useCaps('cron_tool').can(cap)` في الواجهة (يُخفي **+ New task** وإجراءات الصفوف وExport). النموذج **يسمح افتراضيًا** مع **تجاوز للمسؤول**؛ وفوق ذلك، تُقيَّد عمليات الإنشاء/التعديل/التشغيل بشكل صارم على المسؤولين.

## الخدمة الأساسية — `MelisCronService`

```php
$cron = $sm->get('MelisCronService');

$cron->getActiveTasks();
$cron->saveItem($data, $id);   // fires events
$cron->deleteItem($id);

// Job queue
$cron->addJob($cronId, $forceRun);       // inserts a 'pending' row in melis_cron_history
$cron->getPendingJobs();
$cron->updateProcessingJob($jobId);      // claims job: pending → processing
$cron->finishJob($jobId, $data);         // writes state/duration/logs/status
$cron->runTaskNow($id);                  // synchronous execution used by the React Run action

// Helpers
$cron->getDateLastRunByCron($cronId);
$cron->getWordingScheduleType($type, $optionsJson);
```

**الأحداث المُطلَقة:** `cron_service_get_list_start`، و`meliscron_service_get_list_end`، و`meliscron_service_get_listhistory_end`، و`meliscron_service_save_item_start`/`_end`، و`meliscron_service_delete_item_start`/`_end`.

## جداول قاعدة البيانات

| الجدول | يحتوي على |
| --- | --- |
| `melis_cron` | تعريفات المهام: `cron_id`، `cron_name`، `cron_active`، `cron_target`، `cron_type` (ENUM `CLI\|HTTP`)، `cron_schedule_type` (ENUM `every\|hourly\|daily\|weekly\|monthly`)، `cron_schedule_options` (JSON) |
| `melis_cron_history` | سجلات التشغيل: `id`، `cron_id`، `state` (ENUM `pending\|processing\|success\|error`)، `date_add`، `rerun`، `date_run`، `duration`، `logs`، `status` |

### أشكال JSON لـ `cron_schedule_options`

| `cron_schedule_type` | بنية JSON |
| --- | --- |
| `every` | `{ "everyItem": "minutes\|hours\|days", "everyValue": N }` |
| `hourly` | `{ "hourlyValue": MM }` |
| `daily` | `{ "dailyHour": HH, "dailyMinute": MM }` |
| `weekly` | `{ "weeklyDays": [1..7], "atHour": HH, "atMinute": MM }` (يوم الأسبوع بمعيار ISO، الإثنين=1) |
| `monthly` | `{ "monthlyDay": D, "atHour": HH, "atMinute": MM }` |

## إعداد المشغِّل

يُدار التنفيذ المجدول بواسطة `MelisCron\Command\ExecCommand`، المُسجَّل مع laminas-cli باسم **`melis:cronexec`**. أضِف سطرًا واحدًا إلى crontab الخادم:

```cron
* * * * * cd /path/to/project && php vendor/bin/laminas melis:cronexec --env=production >/dev/null 2>&1
```

تُشغِّل كل نبضة مرحلتين:

1. **`scheduleTasks()`** — تُقيِّم الجدول الزمني لكل مهمة نشطة مقابل الوقت الحالي؛ وتستدعي `addJob()` لأي مهمة حان موعدها.
2. **`runJobs()`** — تحجز كل مهمة قيد الانتظار (`pending → processing`) ثم تُنفِّذها داخل **PHP Fiber** لتحقيق التزامن:
   - **HTTP** — طلب `curl` GET لـ`cron_target`؛ يُسجِّل حالة HTTP ونص الاستجابة.
   - **CLI** — استدعاء `exec()` لـ`cron_target`؛ رمز الخروج غير الصفري يضبط الحالة على `error`.

يتوفر مُطلِق احتياطي عبر HTTP على `/melis/MelisCron/Cron/execute` للبيئات التي لا يتوفر فيها crontab على مستوى CLI.

> دقة الجدولة دقيقة واحدة (وتيرة النبضة). بدون سطر crontab، تُعرَّف المهام لكنها تعمل فقط عند تشغيلها يدويًا عبر **Run now**.

انظر أيضًا: [MelisCore](/ar/reference/modules/melis-core)
