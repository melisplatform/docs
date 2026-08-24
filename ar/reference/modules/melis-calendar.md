# MelisCalendar

> أداة جدولة في الواجهة الخلفية مع تقويم شهري أصلي مبني على React، وأحداث تُنقل بالسحب والإفلات، وأداة مصغّرة للوحة التحكم. الحزمة `melisplatform/melis-calendar`.

## الغرض

MelisCalendar هي أداة التقويم / جدولة الأحداث في المنصة: أحداث مؤرَّخة على شبكة شهرية تفاعلية، مع السحب للجدولة والسحب لإعادة الجدولة. في الواجهة الخلفية v6 المبنية على React (`/melis-react`) تأتي على هيئة **لبنة كاملة أصلية بـ React** — شبكة شهرية مخصّصة مع سحب وإفلات أصلي (ولمسي) — تقرأ وتكتب عبر طبقة JSON من نوع `react-api`. ويتيح مبدّل **New / Old** للمستخدمين العودة إلى أداة FullCalendar القديمة داخل إطار iframe. الأحداث **عامة على مستوى المنصة** (أجندة فريق مشتركة، غير مرتبطة بموقع).

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCalendar',
];
```

التبعية الوحيدة المطلوبة هي `melisplatform/melis-core`. تظهر الأداة في الواجهة الخلفية React فقط أثناء تفعيل الوحدة (اكتشاف اللبنات النمطية عبر `GET /melis/react-api/react-modules`).

## الواجهة الخلفية (React)

الشريط الجانبي الأيسر ← **MelisMarketing** ← **Calendar** (أيقونة التقويم). تُفتح كعلامة تبويب علوية دائمة باسم **Calendar**. وهي أداة ذات مستوى واحد (بلا علامات تبويب فرعية) مع نافذة منبثقة للإنشاء/التحرير.

![أداة التقويم React: مبدّل New/Old و"+ New event" (أعلى اليمين)، بطاقات مؤشرات الأداء الرئيسية (Total / Upcoming)، كتلة السحب "New event" وقائمة "This month's events" (على اليسار)، وشبكة شهرية مخصّصة مع تظليل اليوم الحالي](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-display.png)

| المنطقة | الوصف |
| --- | --- |
| شبكة شهرية مخصّصة | شبكة من 6 أسابيع (من الإثنين إلى الأحد)، `‹ / ›` لتغيير الشهر، **Today** للعودة، مع تظليل اليوم الحالي. تُعرَض الأحداث كشرائح على يومها (أو أيامها)؛ والأحداث الممتدّة لعدّة أيام تمتد عبر الخلايا. |
| كتلة السحب "New event" | كتلة متقطّعة في اللوحة اليسرى: اكتب عنوانًا، ثم اسحبها إلى يومٍ ما لإنشاء الحدث هناك (النقر للتفعيل على الأجهزة اللمسية). |
| "+ New event" | زر أعلى اليمين يفتح النافذة المنبثقة مع منتقيات تاريخ صريحة **Title / Start / End**. |
| بطاقات مؤشرات الأداء الرئيسية | عدّادا **Total** و**Upcoming** (القادمة = تاريخ البدء اليوم أو بعده). |
| قائمة "This month's events" | قائمة في اللوحة اليسرى بأحداث الشهر الحالي؛ انقر على أحدها للتحرير. |
| إعادة الجدولة | اسحب شريحة حدث إلى يومٍ آخر؛ مع الحفاظ على مدّته. |
| مبدّل New / Old | مبدّل أعلى اليمين ينقل الأداة بأكملها بين واجهة React (**New**، الافتراضي) وأداة FullCalendar القديمة داخل إطار iframe (**Old**). |

![لوحة "New event" اليسرى: حقل إدخال عنوان بالإضافة إلى كتلة السحب المتقطّعة مع التلميح "Drag this block onto a calendar day"](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-new-event.png)

![نافذة الحدث المنبثقة — Title و Start و End منتقيات التاريخ، Cancel / Save؛ فتح حدث موجود يُظهر النافذة نفسها مع زر Delete](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-event-edition.png)

القواعد المطبَّقة عند الحفظ: العنوان مطلوب (‏≤ 255 حرفًا)؛ وإذا كان **End** قبل **Start** يُثبَّت عند **Start**، بحيث يكون تاريخ انتهاء الحدث دائمًا ≥ تاريخ بدئه.

## واجهة برمجة تطبيقات React

تقع المسارات في `config/react-api.php` (تُدمَج عبر `MelisCalendar\Module::getConfig()`)، وتُقدَّم بواسطة `MelisCalendar\Controller\MelisReactApiCalendarController`. جميعها تحت `/melis/react-api/calendar-events`، بعقد استجابة `{ success, data, error }`، والتواريخ بصيغة `YYYY-MM-DD` (بلا وقت). يرسل كل طلب `X-Requested-With: XMLHttpRequest` مع `credentials: 'include'`.

| الطريقة والعنوان | الإجراء | الغرض |
| --- | --- | --- |
| `GET /calendar-events[?from=&to=]` | `list` | الأحداث المتداخلة مع النافذة ← `{ items: [{id,title,start,end}] }` |
| `GET /calendar-events/stats` | `stats` | مؤشرات الأداء `{ total, ongoing, upcoming }` |
| `GET /calendar-events/:id` | `get` | حدث واحد `{id,title,start,end}` |
| `POST /calendar-events/save` | `save` | إنشاء (بلا `id`) / تحديث (مع `id`)؛ يُستخدَم أيضًا لإعادة الجدولة |
| `DELETE /calendar-events/delete/:id` | `delete` | حذف حدث |

ترتيب المسارات مهم: يُصرَّح عن `/stats` و`/save` و`/delete/:id` قبل المسار الشامل `/:id`.

```ts
// create OR reschedule/edit (omit id = create, include id = update)
await fetch('/melis/react-api/calendar-events/save', {
  method: 'POST', credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: null, title: 'Kickoff', start: '2026-08-19', end: '2026-08-19' }),
})
```

> يتواصل المتحكّم مع `melis_calendar` مباشرةً عبر استعلامات SQL ذات معاملات (`Laminas\Db\Adapter\AdapterInterface`)، مستنسخًا قواعد الإصدار القديم وحقول التدقيق (`cal_created_by` / `cal_last_update_by` من `MelisCoreAuth`). وهو **لا** يستدعي `MelisCalendarService`.

## القدرات (الصلاحيات المتقدّمة)

مُصرَّح عنها في `config/react.capabilities.php` تحت عقدة الأداة الطرفية `meliscalendar_tool` (المفتاح نفسه هو melisKey لحارس الوصول في المتحكّم ومفتاح `can()` في الواجهة الأمامية):

```php
return [
    'melisReactToolCapabilities' => [
        'meliscalendar_tool' => ['create', 'edit'],
    ],
];
```

توجد قدرتان فقط:

- **`create`** — إنشاء حدث (سحب عنوان جديد إلى يومٍ ما / "+ New event").
- **`edit`** — نقل / إعادة جدولة (بالسحب)، أو تحرير **أو** حذف حدث موجود.

يتطلّب عرض التقويم `create` **أو** `edit` (أيّهما يكفي): إذ يُحرَس `list` / `stats` من جهة الخادم بواسطة `denyUnlessCanAny(['create','edit'])`، وفي الواجهة بواسطة `can('create') || can('edit')`. يتطلّب `save` صلاحية `create` عند غياب المعرّف، و`edit` عند وجود معرّف؛ ويتطلّب `delete` صلاحية `edit`. الحرّاس افتراضهم السماح (القدرة غير المصرَّح عنها مسموح بها) مع تجاوز للمشرف.

## الخدمات والأحداث (الأساس القديم)

لا تزال الوحدة تعرض `MelisCalendarService` للوصول البرمجي — تستخدمه الأداة القديمة والوحدات الأخرى، لكن لا يستخدمه متحكّم React:

| الطريقة | الدور |
| --- | --- |
| `addCalendarEvent()` | ينشئ حدثًا جديدًا. |
| `reschedCalendarEvent()` | يحدّث تواريخ حدث موجود. |
| `deleteCalendarEvent()` | يزيل حدثًا. |

يُطلَق حدث `meliscalendar_save_event_end` بعد كل عملية حفظ. ويمكن للوحدات الأخرى الارتباط به للإشعارات أو مزامنة التقويم الخارجي:

```php
$sharedEvents->attach('MelisCalendar', 'meliscalendar_save_event_end', function ($e) {
    $params = $e->getParams();
    // custom notification or sync logic
}, 10);
```

## الأداة المصغّرة للوحة التحكم

تعرض الأداة المصغّرة **Calendar** الأحداث نفسها على لوحة تحكم الواجهة الخلفية دون فتح الأداة. تُضاف من محدِّد الإضافات في لوحة التحكم (قسم MELIS CALENDAR) وتُقدَّم بواسطة `MelisCalendarEventsPlugin` القديمة.

![الأداة المصغّرة Calendar على لوحة تحكم React — شبكة شهرية مضغوطة مع تظليل اليوم الحالي، بالإضافة إلى عناصر التحكم الترس / التحديث / الإغلاق](/screenshots/react/melis-calendar/meliscalendar-dashboardplugins-calandar.png)

![لوحة "Add a widget" في لوحة التحكم — الأداة المصغّرة Calendar تحت قسم MELIS CALENDAR](/screenshots/react/melis-calendar/meliscalendar-dashboardplugins-menu-selector.png)

## جداول قاعدة البيانات

| الجدول | يحتوي على |
| --- | --- |
| `melis_calendar` | صف واحد لكل حدث؛ يتضمّن حقول تدقيق تتتبّع الإنشاء وآخر تعديل. |

انظر أيضًا: [melis-core](/ar/reference/modules/melis-core)
