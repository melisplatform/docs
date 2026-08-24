# MelisSql

> أداة لتشغيل استعلامات SQL للقراءة فقط ضمن أدوات المطوّر في واجهة الإدارة الخلفية بتقنية React، تُشحن كلبنة React كاملة أصيلة. الحزمة `melisplatform/melis-sql`.

## الغرض

MelisSql هي أداة صغيرة للمطوّرين: **أداة لتشغيل استعلامات SQL للقراءة فقط**. تكتب عبارة `SELECT`
واحدة، وتضغط **Run**، فتعود الصفوف المطابقة في جدول ديناميكي — من دون مغادرة
واجهة الإدارة الخلفية أو فتح عميل قاعدة بيانات خارجي. تتصل باستخدام بيانات اعتماد
`config['db']` المُهيّأة على المنصّة، لذا لا تُدخَل أي تفاصيل اتصال.

في Melis v6 تُشحن الأداة كـ **لبنة React كاملة أصيلة** ضمن `/melis-react`: صفحة React حقيقية
تستدعي نقطة نهاية `react-api` واحدة بصيغة JSON، مع مِفتاح تبديل **New / Old** يمكنه العودة إلى
الأداة القديمة داخل إطار iframe. إنها أداة تشخيص وفحص مخصّصة للمشرفين فقط، وليست ميزة للمستخدم النهائي.

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisSql',
];
```

تظهر الأداة في واجهة الإدارة الخلفية بتقنية React **فقط إذا كان الوحدة مُفعّلة** (اكتشاف اللبنات
المعياري). تتطلّب `melisplatform/melis-core` وإصدار PHP `^8.1|^8.3|^8.4`.

## أين توجد ضمن /melis-react

الشريط الجانبي الأيسر ← مجموعة **Dev Tools** ← **SQL**. تُفتح كعلامة تبويب علوية باسم **SQL**. يُعلن
بيان اللبنة عن المسار `/melis-core/sql` ويربط مِفتاح القائمة `forwardKey` `MelisSql/List` به.

إنها **أداة أحادية الشاشة**: صفحة واحدة تحتوي على صندوق استعلام وزرّ **Run** وجدول نتائج
ديناميكي. لا علامات تبويب فرعية، ولا تنقّل تفصيلي.

![أداة SQL بتقنية React: ترويسة بعنوان/عنوان فرعي، ومِفتاح تبديل New/Old (أعلى اليمين)، ومنطقة نصّ للاستعلام تحمل النائب `SELECT * FROM my_table LIMIT 10;`، وتلميح "One SELECT statement only, ending with « ; »"، وزرّ Run أحمر، وبطاقة نتائج فارغة.](/screenshots/react/melis-sql/melissql-tool-sql.png)

## استخدام أداة React

1. اكتب عبارة `SELECT` **واحدة** في منطقة نصّ الاستعلام.
2. أنهِها بفاصلة منقوطة `;`.
3. انقر **Run** (أو اضغط **Ctrl/Cmd + Enter**).

بمجرّد أن يُعيد الاستعلام نتائجه، تظهر بطاقة نتائج تحتوي على:

- **عدد الصفوف** (مثل `12 row(s)`؛ وعند البحث، `matches / total`).
- صندوق **بحث** يُرشّح الصفوف المُعادة عبر **كل** الأعمدة (حتى المخفيّة منها).
- زرّ **Columns** يفتح مدير أعمدة: قائمتان (**Visible** / **Hidden**)، اسحب
  للإخفاء/إعادة الترتيب، و**Reset** لإظهارها جميعًا. يُحفَظ التخطيط لكل متصفّح
  (`localStorage`، بالمفتاح `melis-sql-cols-v1`).
- **الجدول** نفسه: انقر على ترويسة عمود لـ **الفرز** (تصاعدي ← تنازلي)؛ وتُعرَض كائنات الصور
  الثنائية المُتعرَّف عليها (مثل صورة رمزية لمستخدم) مباشرةً كصور مصغّرة.

### مِفتاح تبديل New / Old

يُبدّل مِفتاح **New / Old** في أعلى اليمين الأداة بأكملها بين العرضين. **New** (الافتراضي) هو
واجهة React؛ أما **Old** فيعرض الأداة القديمة في إطار iframe مُفرد
(`/melis/react-tool-page?key=melissql_tool`)، مُموضَعًا فوق نقطة ارتساء عبر `ResizeObserver`.

## قواعد الاستعلام

ترفض الأداة أي شيء ليس عبارة واحدة للقراءة فقط، وتُظهر السبب في شريط أحمر:

| الحالة | ما يحدث |
| --- | --- |
| العبارة لا تبدأ بـ `SELECT` | مرفوضة — *only SELECT queries are allowed*. |
| لا فاصلة منقوطة في النهاية | مرفوضة — *a query should end with ';'*. |
| أكثر من عبارة واحدة (عدّة `;`) | مرفوضة — *only one query is allowed*. |
| أنت **لست** مشرف منصّة | مرفوضة — **403 Forbidden** (للمشرفين فقط). |
| تعذّر تحضير الاستعلام / فشله | يُعرَض خطأ قاعدة البيانات في الشريط. |

## نقطة نهاية React API

**لا يوجد** ملفّ `config/react-api.php` لهذه الوحدة. يُوصَل إلى نقطة النهاية الوحيدة عبر
مسار الإدارة الخلفية الشامل الخاص بالوحدة (`config/module.config.php`،
`/melis/MelisSql[/:controller[/:action]]`)، الذي يحلّ الاسم المستعار
`MelisSql\Controller\MelisSqlReactApi` ← `MelisSqlReactApiController` (المُعلَن ضمن
`controllers.invokables`). العقد: `{ success, data, error }`.

| الأسلوب وعنوان URL | إجراء المتحكّم | الغرض |
| --- | --- | --- |
| `POST /melis/MelisSql/MelisSqlReactApi/run` | `runAction` | التحقّق من عبارة `SELECT` واحدة للقراءة فقط وتنفيذها، وإعادة `{ columns, rows, rowCount }` |

جسم الطلب: `{ "query": "SELECT … ;" }`.

```ts
// runSqlQuery(query) — the only call the brick makes (ui-react/src/sql-api.ts)
const res = await fetch('/melis/MelisSql/MelisSqlReactApi/run', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'SELECT * FROM melis_cms_page_tree;' }),
})
// → { success: true, data: { columns: string[], rows: Record<string,unknown>[], rowCount: number } }
```

يُوسّع `MelisSqlReactApiController` **المتحكّم القديم `ListController`** لإعادة استخدام حارس `runQuery()`
الخاص به حرفيًا (نفس اتصال `mysqli` من `config['db']`، ونفس التحقّق من العبارة الواحدة / `SELECT`
حصريًا، ونفس رسائل الخطأ المُترجَمة). ولا يضيف سوى إعادة تشكيل JSON إضافةً إلى الضمانات أدناه.
تُعيد أخطاء التحقّق/قاعدة البيانات رمز HTTP **200** مع `{ success:false, error }`؛ وتُعيد إخفاقات المصادقة
401/403؛ ويُعيد أي طلب غير `POST` الرمز 405.

## القدرات

مُعلَنة في `config/react.capabilities.php` (مدمجة عبر `MelisSql\Module::getConfig()`)، مُفهرَسة تحت
melisKey الخاص بالأداة `melissql_tool`:

```php
return ['melisReactToolCapabilities' => [
    'melissql_tool' => ['run'],   // one internal cap: the Run (execute-query) action
]];
```

- **`run`** قدرة مخصّصة (ليست إحدى القدرات القياسية `list/create/edit/delete/export`).
  فهي تتيح للمشرف *رؤية/الاطّلاع على* الأداة من دون أن يكون بالضرورة مسموحًا له بـ **تنفيذ** الاستعلامات.
- **التقييد على الواجهة الأمامية.** يستدعي `SqlPage` الدالّة `useCaps('melissql_tool')` ← `can('run')`، وعندئذٍ فقط يعرض
  زرّ **Run** ويُفعّل اختصار Ctrl/Cmd + Enter.
- هذا الملفّ **تصريحي فقط** (يُشغّل مربّعات الاختيار في Users ← Rights)؛ أما **الإنفاذ الفعلي**
  فهو حارس الوصول + بوّابة `usr_admin` في المتحكّم.

## ملاحظات الأمان

- **للمشرفين فقط.** يُشغّل المتحكّم `denyUnlessAccess()` (401 إن لم تكن مُصادَقًا، و403 إن فشل
  `MelisCoreRights::canAccess('melissql_tool')`)، ثم يتطلّب إضافةً `usr_admin`. صلاحية
  `melissql_tool` قابلة للتفويض، لذا فإن **الصلاحيات وحدها لا تكفي** — يحصل غير المشرف على
  **403 Forbidden**.
- **للقراءة فقط بحكم التصميم.** يرفض `runQuery()` أي شيء ليس عبارة واحدة بالضبط تنتهي
  بـ `;` وتبدأ بـ `SELECT` — لا مسار إلى `INSERT`/`UPDATE`/`DELETE`/DDL. عامِل أي
  تغيير على `runAction`/`runQuery` باعتباره حسّاسًا أمنيًا.
- **إخفاء الأعمدة الحسّاسة.** تُخفي `maskSensitiveColumns()` *قيم* الأعمدة التي يطابق اسمها
  `password|passwd|pwd|mot_de_passe|secret|token|api_key` بـ `••••••••`، على الخادم، بحيث لا
  يصل أي تجزئة (hash) إلى المتصفّح عند تنفيذ `SELECT *`. إنها حاجز وقائي، وليست حدًّا فاصلًا.
- **JSON آمن للبيانات الثنائية.** يُرمّز `sanitizeForJson()` البيانات الثنائية غير المتوافقة مع UTF-8 بترميز base64 ويُصدر كائنات
  الصور الثنائية المُتعرَّف عليها (مثل `melis_core_user.usr_image`) كعناوين `data:<mime>;base64,…` للعرض المباشر.
- تجنّب عبارات `SELECT *` غير المحدودة على الجداول الضخمة جدًّا: لا يوجد ترقيم صفحات من جهة الخادم.

## الملفات الرئيسية

| المجال | المسار |
| --- | --- |
| المسار الشامل، وقابلية استدعاء المتحكّم، وامتداد صفحة أداة العرض القديم | `config/module.config.php` |
| القدرات (`melisReactToolCapabilities` ← `melissql_tool` ← `run`) | `config/react.capabilities.php` |
| الأداة القديمة وحارس `runQuery()` (المُعاد استخدامه في متحكّم الـ API) | `src/Controller/ListController.php` |
| متحكّم React API (بوّابة المشرف + إعادة استخدام `runQuery` + الإخفاء + JSON آمن) | `src/Controller/MelisSqlReactApiController.php` |
| خصوصية `toolPageAction()` في إطار iframe للعرض القديم | `src/Controller/React/PluginViewToolPageExtension.php` |
| مصدر لبنة React (Vite IIFE) | `ui-react/src/` — `brick.tsx`, `SqlPage.tsx`, `ViewToggle.tsx`, `sql-api.ts` |
| اللبنة المبنية والبيان | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |

اطّلع أيضًا على: [MelisCore](/ar/reference/modules/melis-core)
