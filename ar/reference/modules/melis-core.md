# MelisCore

> الأساس الذي يبني عليه كل وحدة أخرى في الواجهة الخلفية — تسجيل الدخول، المستخدمون/الأدوار/الصلاحيات، إطار عمل
> القوائم والأدوات، لوحة التحكم، الإعدادات، البريد الإلكتروني، الامتثال للائحة GDPR، وطبقة الخدمات والأحداث الأساسية — والذي يُعرَض
> الآن عبر الواجهة الخلفية المبنية بـ **React** على المسار `/melis-react`. الحزمة `melisplatform/melis-core`.

## الغرض

يُعدّ `MelisCore` قلب الواجهة الخلفية في Melis Platform. فهو يوفّر هيكل التطبيق (الترويسة،
القائمة اليسرى، شجرة الأدوات، لوحة التحكم، التذييل)، وشجرة الإعدادات `MelisCoreConfig` التي تجمّع
ملفات `app.*.php` الخاصة بكل وحدة، والمصادقة والصلاحيات على مستوى كل أداة، وإدارة المستخدمين،
والتعامل مع المنصة/البيئة، ورسائل البريد الإلكتروني الخاصة بالمعاملات، وأدوات الامتثال للائحة GDPR، ونقطة نهاية للمصادقة عبر الخدمات المصغّرة،
وطبقة الخدمات/الأحداث المشتركة التي تمتدّ منها كل وحدة أخرى. تعتمد عليه كل وحدة من وحدات `melisplatform/*`.

في الإصدار v6، يُعدّ MelisCore أيضًا **تطبيق الواجهة الخلفية المبني بـ React**. إذ يُقدَّم الهيكل نفسه بوصفه تطبيق صفحة واحدة مبنيًا بـ React 19 +
TypeScript + Tailwind على المسار `/melis-react`، ويعمل بالتوازي مع الواجهة الخلفية القديمة القائمة على ملفات `.phtml`
على المسار `/melis`. يوفّر MelisCore الهيكل (التخطيط، التوجيه، عميل `react-api` العام،
مُحمّل الوحدات/اللبِنات، مُحلّل القدرات، مفتاح التبديل الجديد/القديم) **إضافةً إلى** أدواته الأصيلة المبنية بـ React
(المستخدمون، لوحة التحكم، الإعلانات، رسائل البريد، الامتثال للائحة GDPR، اللغات، السجلّات، الوحدات، إعدادات أخرى،
المنصّات، سِمة المنصّة، حسابي، تسجيل الدخول/المصادقة الثنائية 2FA). تندمج كل وحدة أخرى **داخل** هذا الهيكل.

## تفعيلها

أضِفها إلى `config/modules.config.php` — يجب تحميل MelisCore مبكرًا لأن كل وحدة أخرى تقريبًا
تستدعي خدماته:

```php
return [
    'MelisCore',
    // … other modules …
];
```

تُقدَّم الواجهة الخلفية المبنية بـ React من خلال ثلاث وحدات متعاونة:

| الوحدة | الدور |
| --- | --- |
| `MelisCore` | مصدر/بنية تطبيق React + مسارات `react-api` والمتحكّمات الخاصة بالأدوات الأصيلة. |
| [`MelisReactApi`](/ar/reference/modules/melis-react-api) | جسر `react-api` العام (`me`، `menu`، `assets`، `langs`، `react-modules`، `rights`، `i18n`، `dashboard`). |
| [`MelisReactOverride`](/ar/reference/modules/melis-react-override) | يقدّم هيكل تطبيق الصفحة الواحدة (SPA) على المسار `/melis-react` وآلية الـ iframe القديمة (`/melis/react-tool-page`). |

أما وحدات البنية التحتية المصاحبة له فتبقى [MelisAssetManager](/ar/reference/modules) (التي تقدّم
أصول React المُهشَّمة من المسار `/MelisCore/ui-react/`)، و[MelisDbDeploy](/ar/reference/modules)،
و[MelisComposerDeploy](/ar/reference/modules)، و[MelisInstaller](/ar/reference/modules).

## بنية الواجهة الخلفية المبنية بـ React

يوجد مصدر تطبيق Vite + React في `vendor/melisplatform/melis-core/ui-react/`، ويُبنى إلى المجلّد
المُودَع `vendor/melisplatform/melis-core/public/ui-react/`. عند التشغيل:

- يُقدَّم **الهيكل (SPA)** على المسار **`/melis-react`** بواسطة `MelisReactOverride`؛ أما الواجهة الخلفية القديمة
  على المسار `/melis` فتبقى دون تغيير.
- تُحمَّل **الأصول المُهشَّمة** من المسار **`/MelisCore/ui-react/`** (قيمة `base` في Vite، وتقدّمها MelisAssetManager).
- تقع **واجهة JSON API** تحت المسار **`/melis/react-api/…`** وفق العقد `{ success, data, error }`.

تصل كل أداة يراها المستخدم إلى الشاشة عبر **إحدى ثلاث آليات**:

1. **أداة React أصيلة** — صفحة React فعلية مدعومة بمتحكّم `MelisReactApi*Controller` في MelisCore
   (المستخدمون، اللغات، رسائل البريد، الامتثال للائحة GDPR…). مُدرَجة في سجلّ الوحدات (`ui-react/src/lib/module-registry.ts`).
2. **لبِنة وحدة** — وحدة نشِطة أخرى تقدّم واجهة React الخاصة بها بوصفها *لبِنة*، تُحمَّل عند التشغيل
   (موجودة فقط إذا كانت الوحدة نشِطة). يجري اكتشافها عبر `GET /melis/react-api/react-modules`.
3. **مجمّع iframe** — أي أداة قديمة لا تملك مسار React مخصّصًا تُعرَض داخل الهيكل في
   iframe مُجمَّع عبر `/melis/react-tool-page?key=<melisKey>`.

**القائمة ديناميكية** (يُعيد `GET /melis/react-api/menu` شجرة الأدوات المُرشَّحة بحسب الصلاحيات)، وتُشتَقّ مسارات
الأدوات **من تلك الشجرة** (`/[section]/[tool]`، مثلًا `/melis-core/user`)، ولا شيء
مُثبَّت مسبقًا لكل وحدة. يمكن أن تحمل الأداة الأصيلة أيضًا مفتاح تبديل **جديد (React) / قديم (iframe)** لمقارنة
عرض React الخاص بها بالأداة الكلاسيكية.

## هيكل الواجهة الخلفية

يجمّع الهيكل (`ui-react/src/components/layout/Shell.tsx`) الشريط الجانبي، والشريط العلوي، والألسنة الفرعية،
وشريط ألسنة الأدوات القديمة، ومنطقة المحتوى. يُغلَّف كل تركيب أداة بحدّ خطأ خاص بكل أداة
`ToolErrorBoundary` كي لا يؤدّي تعطّل عرض أداة واحدة إلى تعطيل الواجهة الخلفية بأكملها.

### الشريط العلوي

يحتوي الجانب الأيمن من الشريط العلوي على مفتاح تبديل **السِّمة** (فاتح/داكن)، ومبدّل **اللغة**، وأيقونة
**Messenger** (عندما تكون تلك الوحدة نشِطة)، وجرس **الإشعارات**، و**صورة المستخدم الرمزية** (تفتح
*حسابي* وتحمل *تسجيل الخروج*). ويوجد زر إخفاء الشريط الجانبي في أقصى اليسار.

![أيقونات الجانب الأيمن من الشريط العلوي — مفتاح تبديل السِّمة، اللغة، Messenger، الإشعارات، الصورة الرمزية](/screenshots/react/melis-core/meliscore-header-righticons.png)

### الشريط الجانبي الأيسر والتذييل

يعرض الشريط الجانبي رابط **لوحة التحكم** إضافةً إلى **شجرة الأدوات**، مُجمَّعة حسب القسم (MelisCore،
MelisCms، MelisMarketing، MelisCommerce، Marketplace، Melis AI…). **ما تراه يعتمد على
صلاحياتك** — لا تظهر إلا الأدوات المسموح لك باستخدامها. يعرض التذييل **إصدار** المنصّة / MelisCore.

![التذييل — إصدار MelisCore / المنصّة](/screenshots/react/melis-core/meliscore-footer-version-meliscore.png)

### لوحة التحكم

هي الصفحة التي تصل إليها بعد تسجيل الدخول. وتعرض **فقاعات** علوية (أعداد أخبار Melis / التحديثات / الإشعارات /
الرسائل) وشبكةً من **الودجات** (إضافات لوحة التحكم). تُضاف الودجات من
لوحة **"Add a widget"** وتُرتَّب بالسحب والإفلات؛ ويعتمد توفّرها على صلاحياتك.

![لوحة التحكم المبنية بـ React — الفقاعات العلوية، شبكة ودجات فارغة، ولوحة "Add a widget"](/screenshots/react/melis-core/meliscore-dashboard-empty.png)

![لوحة "Add a widget" — اختَر ودجت (مُجمَّعًا حسب الوحدة) لإفلاته على لوحة التحكم](/screenshots/react/melis-core/meliscore-dashboardplugins-menu.png)

## المصادقة

يوجد تسجيل الدخول على المسار `/melis-react/login` (React) — اسم المستخدم + كلمة المرور، وخيار **Remember me** الاختياري،
ومُحدِّد لغة. عند النجاح تصل إلى لوحة التحكم. أما الحسابات ذات **المصادقة الثنائية 2FA** فتُوجَّه إلى
`/verify-2fa` (يمكن إعادة طلب رمز جديد عند إرساله بالبريد). ويرسل رابط **Lost password**
(`/forgot-password`) رسالة تحتوي رابط إعادة تعيين يفتح `/reset-password/:hash`. ويمكن ضبط علامة لوحة تسجيل الدخول
عبر أداة **Platform theme**.

خلف الكواليس تبقى طبقة PHP دون تغيير: يرسل تسجيل الدخول طلب POST إلى المسار القديم `POST /melis/authenticate`،
ويستخدم استطلاع الجلسة `GET /melis/islogin`، وتأتي الصلاحيات من `MelisCoreAuth` / `MelisCoreRights`.

## المستخدمون والأدوار والصلاحيات

**المكان:** MelisCore ← Administration ← **User management** (`/melis-core/user`). تُدير كل
حساب في الواجهة الخلفية. تحتوي القائمة على بطاقات مؤشّرات الأداء (الإجمالي / النشِط / غير النشِط / المديرون)، وبحث، ومرشّحات الحالة
والدور، ومدير أعمدة، وتصدير، ومفتاح التبديل الجديد/القديم، و**+ New user**.

![أداة المستخدمين — بطاقات مؤشّرات الأداء، المرشّحات، مدير الأعمدة، التصدير، مفتاح التبديل الجديد/القديم، "+ New user"](/screenshots/react/melis-core/meliscore-tool-users-list.png)

يمنحك فتح مستخدم أربعة ألسنة:

- **Profile** — الهوية، الوسوم، مفتاح تبديل الحالة، الدور، علامة **Administrator** وقسم كلمة مرور
  مع تغذية راجعة حيّة عن مدى تعقيدها.

  ![لسان Profile — الهوية، الوسوم، بطاقات الحالة/الدور/الصلاحيات، وحقل كلمة مرور مع متطلّبات حيّة](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-profile.png)

- **Rights** — **شجرة الوصول** (حدّد الأدوات/الأقسام المسموح للمستخدم باستخدامها)، إضافةً إلى لوحة **Dashboard
  Plugins** ولوحة **Pages**. يُخفى عن قائمة المستخدم كل ما لم يُمنَح له. أما الأدوات
  التي تُصرِّح عن **قدرات** فتُظهِر مربّعات اختيار فرعية (List / Create / Edit / Delete / Export).

  ![شجرة الصلاحيات — إجماليات لكل قسم ومربّعات اختيار للقدرات لكل أداة](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-rights-1.png)

  ![في الجزء الأسفل من لسان Rights — لوحة Dashboard Plugins ولوحة Pages](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-rights-2.png)

- **Connections** — سِجلّ تسجيل دخول المستخدم (التاريخ، وقت الدخول/الخروج، المدّة).
- **Microservices** — أنشِئ **مفتاح API** كي تتمكّن أطراف ثالثة من المصادقة بصفة هذا المستخدم مقابل
  نقاط نهاية الخدمة المصغّرة.

  ![مفتاح API مُنشَأ — مفتاح تبديل التفعيل/التعطيل، مفتاح مُقنَّع مع إظهار/نسخ/إعادة توليد، ورابط الخدمة المصغّرة](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-microservices-generated.png)

تُحدِّد **الأدوار** مجموعة من الصلاحيات مرّة واحدة وتُسنِدها إلى عدّة مستخدمين؛ وأداة الأدوار تُساهِم بها
**MelisSmallBusiness**، لذا لا يظهر مُحدِّد *Role* في لسان Profile إلا عندما تكون تلك الوحدة نشِطة.

> قاعدة عامّة: إذا كان أحدهم "لا يستطيع رؤية أداة"، فإن شجرة **Rights** الخاصة به لا تمنحها — عدّل المستخدم
> (أو دوره) ← Rights ← علّم على الأداة.

## حسابي

**المكان:** الصورة الرمزية في الشريط العلوي ← **My account** (`/melis-core/account`). عدّل بريدك الإلكتروني، وغيّر
كلمة مرورك، واضبط لغة واجهتك، وارفع صورة ملفّ شخصي. يمكن للوحدات إضافة ألسنة هنا (مثل
Melis Messenger). وهذه هي الأداة الأصيلة الوحيدة التي لا تخضع لحارس قدرات — فهي متاحة لأي مستخدم مُصادَق عليه.

![صفحة "My account" — الصورة الرمزية، ملخّص الهوية، ولسان Profile (البريد / كلمة المرور / اللغة)](/screenshots/react/melis-core/meliscore-tool-profile-tab-profile.png)

## الإعلانات

**المكان:** MelisCore ← Administration ← **Announcement** (`/melis-core/announcement`). إعلانات المنصّة
التي تُعرَض على لوحة التحكم، مع بطاقات مؤشّرات الأداء، وبحث، ومرشّح حالة، و**+ New
announcement**. أما المحرّر فهو عنوان + متن **نصّ منسّق (TinyMCE)**، ومفتاح تبديل **Active**، و**Date**.

![قائمة الإعلانات — بطاقات مؤشّرات الأداء، مرشّح Active/Inactive، تحرير/حذف لكل صف](/screenshots/react/melis-core/meliscore-tool-announcement-list.png)

![محرّر الإعلان — Title، نصّ HTML (TinyMCE)، مفتاح تبديل Active، وDate](/screenshots/react/melis-core/meliscore-tool-announcement-edit.png)

## لغات الواجهة الخلفية

**المكان:** MelisCore ← System configuration ← **Back-Office languages** (`/melis-core/language`).
الإعدادات المحلّية (المحلّية + الاسم) المتاحة لمستخدمي الواجهة الخلفية. و`en_EN` هو **الإعداد الافتراضي المحمي** (لا يمكن
إعادة تسميته أو حذفه). ويُعيد الحفظ توليد ملفات الترجمة عبر `MelisCoreTranslation`.

![قائمة اللغات — المحلّية + الاسم، مع تعليم الافتراضي (en_EN)، تحرير لكل صف](/screenshots/react/melis-core/meliscore-tool-bolanguages-list.png)

## إدارة رسائل البريد

**المكان:** MelisCore ← System configuration ← **Emails management** (`/melis-core/emails`). **رسائل البريد الخاصة بالمعاملات** في المنصّة
(إنشاء الحساب، فقدان كلمة المرور، سير العمل…). تعرض القائمة الاسم،
والرمز، والمُرسِل/بريد المُرسِل، وشارة **Source** (Default مقابل Custom).

![قائمة إدارة رسائل البريد — قوالب المعاملات مع الرمز، والمُرسِل، ومصدر Default/Custom](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-list.png)

يحتوي المحرّر على **General properties** (الاسم، الرمز، المُرسِل، الرد إلى، وسوم الاستبدال، مسار التخطيط)
وقسم **Content per language** (الموضوع + متن HTML/نصّي لكل لغة) مع وسوم قابلة للاستبدال
مثل `[NAME]` و`[EMAIL]` و`[LOGIN]`. وتُفوَّض عمليات الحفظ إلى `MelisCoreBOEmailService::saveBoEmailByCode`.

![خصائص البريد — الاسم، الرمز، المُرسِل، الرد إلى، وسوم الاستبدال، ومسار التخطيط](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-edit-properties.png)

![المحتوى لكل لغة — الموضوع، متن HTML عبر TinyMCE مع وسوم `[NAME]`/`[EMAIL]`/`[LOGIN]`، ونسخة نصّية عادية](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-edit-language.png)

## الامتثال للائحة GDPR

**المكان:** MelisCore ← Administration ← **GDPR** (`/melis-core/gdpr`). أربعة ألسنة:

- **Data** — ابحث عن شخص بالاسم/البريد؛ عبر جميع الوحدات، اطّلع على البيانات المحفوظة عنه، ثم
  **استخرِج** (تصدير XML) أو **احذف** السجلّات المُحدَّدة.

  ![لسان GDPR Data — ابحث عن شخص؛ تُعيد الوحدات البيانات المطابقة للاستخراج أو الحذف](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-data.png)

- **Banners** — اضبط نصوص لافتة ملفّات تعريف الارتباط/الموافقة الخاصة بلائحة GDPR لكل موقع + لغة.
- **Anonymization** — إعدادات **الحذف التلقائي / الاحتفاظ بالبيانات** المجدولة (واحدة لكل موقع + وحدة)،
  مع **Run** و**Logs**.

  ![لسان Anonymization — إعدادات الحذف التلقائي، مع Logs وRun و"+ New config"](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-anonymization.png)

- **SMTP** — خادم البريد المُستخدَم لإرسال رسائل تنبيه إخفاء الهوية.

  ![لسان SMTP — المضيف / اسم المستخدم / كلمة المرور لرسائل تنبيه إخفاء الهوية](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-smtp.png)

## السجلّات

**المكان:** MelisCore ← System configuration ← **Logs** (`/melis-core/logs`). **سِجلّ نشاط** للقراءة فقط
وقابل للبحث — رشِّح حسب النوع والعنوان والمستخدم والنطاق الزمني، مع بطاقات مؤشّرات الأداء (الإجمالي / اليوم / الأنواع).
لا يرى غير المديرين سوى إجراءاتهم الخاصة.

![عارض السجلّات — بطاقات مؤشّرات الأداء، مرشّحات النوع/العنوان/المستخدم/التاريخ، وصفوف النشاط](/screenshots/react/melis-core/meliscore-tool-logs-list.png)

## الوحدات

**المكان:** MelisCore ← System configuration ← **Modules** (`/melis-core/modules`). فعّل/عطّل و**أعِد
ترتيب** (بالسحب والإفلات) وحدات المنصّة؛ يعرض كل صف الوحدة وحزمتها وإصدارها
وتبعيّاتها. يُعيد **Save** كتابة `config/melis.module.load.php` ويُطلِق الحدث
`meliscore_module_management_save_end`.

![أداة الوحدات — بحث، عدد النشِطة، سحب لإعادة ترتيب التحميل، مفتاح تبديل لكل وحدة، شارات المتطلّبات/الإصدار](/screenshots/react/melis-core/meliscore-tool-modules-list.png)

## إعدادات أخرى (سياسة تسجيل الدخول وكلمة المرور)

**المكان:** MelisCore ← System configuration ← **Other Config** (`/melis-core/other-config`). سياسة
الأمان: **قفل الحساب بعد الإخفاقات**، و**مدّة صلاحية كلمة المرور**، و**إعادة استخدام كلمة
المرور**، و**تعقيد كلمة المرور** (الحد الأدنى للطول + متطلّبات الأحرف الصغيرة/الكبيرة/الأرقام/الرموز الخاصة). تُكتَب إلى
`app.login.php` عبر `MelisPasswordSettingsService`.

![صفحة Other Configurations — قفل الحساب، صلاحية كلمة المرور، إعادة الاستخدام، ومفاتيح تبديل التعقيد](/screenshots/react/melis-core/meliscore-tool-other-config.png)

## المنصّات

**المكان:** MelisCore ← System configuration ← **Platforms** (`/melis-core/platforms`). أدِر
**البيئات** (dev/staging/prod)، مع بطاقات مؤشّرات الأداء، وبحث، و**+ New platform**. تُعلَّم المنصّة
**الحالية** ولا يمكن تغيير اسمها.

![قائمة المنصّات — تعليم المنصّة "current"، أعمدة Marketplace/Cache، تحرير/حذف لكل صف](/screenshots/react/melis-core/meliscore-tool-platforms-list.png)

![محرّر المنصّة — الاسم (مقفل للمنصّة الحالية)، تحديثات Marketplace ومفاتيح تبديل Cache](/screenshots/react/melis-core/meliscore-tool-platforms-edit.png)

## سِمة المنصّة

**المكان:** MelisCore ← System configuration ← **Platform Scheme** (`/melis-core/platform-scheme`).
اضبط **علامة** الواجهة الخلفية: شعار الترويسة، و**اللوحة اليسرى لتسجيل الدخول** (الشعار، الخلفية،
العنوان/العنوان الفرعي لكل لغة)، والأيقونة المفضّلة (favicon). ويُعيد **Restore to Default** ضبطها.

![صفحة سِمة المنصّة — شعار ترويسة الواجهة الخلفية وعلامة اللوحة اليسرى لتسجيل الدخول](/screenshots/react/melis-core/meliscore-tool-platformscheme.png)

> في React يوجد متحكّمان للسِّمة مفهرَسان تحت عقدة الصلاحيات نفسها
> `meliscore_tool_platform_scheme`: صفحة **Platform theme** هذه (علامة React — الشعارات، تسجيل الدخول،
> الأيقونة المفضّلة) و**نظام الألوان** القديم (ألوان الواجهة الخلفية، يُعيد توليد `schemes.css`).

## الأدوات الأصيلة ← المتحكّمات والقدرات

تُربَط كل أداة React أصيلة بمتحكّم `MelisReactApi*Controller` (في `src/Controller/`) مُصرَّح به في
`config/react-api.php`، ويحرسه `melisKey` حامل للصلاحيات. أما **القدرات** المتقدّمة لكل إجراء
فتُصرَّح في `config/react.capabilities.php` وتُفرَض من جانب الخادم (السماح الافتراضي في الواجهة).

| الأداة (المسار) | المتحكّم | melisKey / الحارس | القدرات |
| --- | --- | --- | --- |
| Users (`/melis-core/user`) | `MelisReactApiUserController` | `meliscore_tool_user` | list, create, edit, delete, export |
| My account (`/melis-core/account`) | `MelisReactApiUserProfileController` | `meliscore_user_profile` (المصادقة فقط) | — |
| Announcement | `MelisReactApiAnnouncementController` | `melis_core_announcement_tool` | list, create, edit, delete, export |
| Emails | `MelisReactApiEmailsController` | `meliscore_tool_emails_mngt` | list, create, edit, delete |
| GDPR | `MelisReactApiGdprController` | `melis_core_gdpr` | مفروضة، غير مُصرَّحة ← السماح الافتراضي |
| Languages | `MelisReactApiLanguageController` | `meliscore_tool_language` | list, create, edit, delete |
| Logs | `MelisReactApiLogController` | `meliscore_logs_tool` (للقراءة فقط) | list |
| Modules | `MelisReactApiModulesController` | `meliscore_tool_user_module_management` | list, edit |
| Other config | `MelisReactApiOtherConfigController` | `meliscore_tool_other_config` | list, edit |
| Platforms | `MelisReactApiPlatformController` | `meliscore_tool_platform` | list, create, edit, delete |
| Platform theme | `MelisReactApiPlatformScheme(React)Controller` | `meliscore_tool_platform_scheme` | list, edit |
| Auth (عام) | `MelisReactApiAuthController` | لا شيء (forgot/reset/i18n) | — |

يُشغّل كل إجراء محروس البوّابة نفسها المكوّنة من سطرين:

```php
private const MELIS_KEY = 'meliscore_tool_user';
if ($deny    = $this->denyUnlessAccess())    { return $deny; }    // 401 unauth / 403 canAccess(MELIS_KEY)
if ($denyCap = $this->denyUnlessCan('list')) { return $denyCap; } // capability (CapabilityGuardTrait)
```

## واجهة react-api

يستهلك الهيكل واجهة `react-api` **عامّة** (من الوحدة `MelisReactApi`) إضافةً إلى مسارات الأدوات
**الأصيلة** (من MelisCore). القاعدة `/melis/react-api`، والعقد `{ success, data, error }`؛ ويرسل كل
نداء `X-Requested-With: XMLHttpRequest` و`credentials: 'include'`.

| الطريقة والرابط | الغرض |
| --- | --- |
| `GET /melis/react-api/me` | المستخدم الحالي (id، name، login، email، picture، isAdmin، capabilities). |
| `GET /melis/react-api/menu[?full=1]` | شجرة الأدوات المُرشَّحة بحسب الصلاحيات (`full=1` = غير مُرشَّحة، لمحرّر الصلاحيات فقط). |
| `GET /melis/react-api/react-modules` | الوحدات النشِطة التي تقدّم لبِنة + رابط الحزمة المتسلسلة. |
| `GET /melis/react-api/langs` · `/assets` · `/i18n?locale=…` | لغات الواجهة الخلفية، أصول المنصّة، الترجمات العامّة. |
| `GET /melis/react-api/dashboard/{bubbles,stats,layout}` · `POST …/layout` | بيانات لوحة التحكم + التخطيط المشترك. |
| `GET/POST /melis/react-api/{users\|languages\|platforms\|emails\|…}` | عمليات CRUD للأدوات الأصيلة (لكل متحكّم أعلاه). |

مثال — قائمة بمجموعة مفاتيح أصيلة وعملية حفظ:

```ts
// GET a keyset page of platforms
const r = await fetch('/melis/react-api/platforms?limit=25&sort=plf_id&dir=desc', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
})
const { success, data } = await r.json()   // { success, data: { items, total, nextCursor } }

// POST save a language
await fetch('/melis/react-api/languages/save', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ id: null, locale: 'de_DE', name: 'Deutsch' }),
})
```

## الخدمات الأساسية (دون تغيير)

مُسجَّلة بوصفها أسماء مستعارة في `service_manager` ضمن `config/module.config.php` — وهي العمود الفقري لـ PHP الذي تنفذ الأدوات المبنية بـ React
مكالماتها من خلاله:

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `MelisCoreConfig` | شجرة الإعدادات عند التشغيل فوق ملفات `app.*` المُجمَّعة: `getItem('/meliscore/interface/…')`، `getItemPerPlatform('/meliscore/datas/')`، `getFormMergedAndOrdered(…)`. |
| `MelisCoreAuth` | مصادقة الواجهة الخلفية: `hasIdentity()`، `getIdentity()`، `getAuthRights()`، `encryptPassword()`، `isPasswordCorrect()`. |
| `MelisCoreRights` | التحكّم في الوصول لكل أداة: `canAccess($melisKey)`، `getRightsValues($id, $isRole)`، `createXmlRightsValues(…)`. |
| `MelisCoreTool` | مساعد أدوات الواجهة الخلفية (الأعمدة، النماذج، إعدادات DataTable) للأدوات القديمة/التي تعمل عبر iframe. |
| `MelisCoreBOEmailService` | قوالب المعاملات: `sendBoEmailByCode()`، `getBoEmailByCode()`، `saveBoEmailByCode()`، `deleteEmail()`. |
| `MelisCoreGdprService` / `MelisCoreGdprAutoDeleteService` | وصول/محو بيانات صاحب البيانات وفق GDPR ومحرّك الاحتفاظ المجدول. |
| `MelisCoreTranslation` | يُحمِّل ويدمج ترجمات `tr_*` لكل محلّية (يُعاد توليدها عند حفظ اللغة). |
| `MelisGeneralService` | الفئة الأساسية التي تمتدّ منها معظم الخدمات — `sendEvent()`، `makeArrayFromParameters()`، `getServiceManager()`. |

## نظام الأحداث

لا يزال `MelisGeneralService` يُطلِق أحداث `*_start` / `*_end` حول كل طريقة خدمة، بحيث يمكن لأي وحدة
اعتراضها. اربطها عبر مدير الأحداث المشترك:

```php
$sm->get('SharedEventManager')->attach(
    'MelisCore',
    'meliscore_tooluser_savenew_end',
    function ($e) { $p = $e->getParams(); /* react */ },
    100
);
```

أحداث أساسية شائعة: `meliscore_tooluser_savenew_start/end`، و`…delete_start/end`، و`…save_start/end`،
و`melis_core_check_user_rights`، و`meliscore_install_create_new_user`، و`melis_core_new_platform`،
و`meliscore_module_management_save_end`، وأحداث GDPR (`melis_core_gdpr_user_info_event`،
`…_extract_event`، `…_delete_event`، `melis_core_gdpr_auto_delete*`).

## جداول قاعدة البيانات

| الجدول | يحفظ |
| --- | --- |
| `melis_core_user` | مستخدمو الواجهة الخلفية (login، هاش كلمة المرور، `usr_rights` بصيغة XML، علامة المدير، اللغة، الدور). |
| `melis_core_user_role` | الأدوار وصلاحياتها `urole_rights` بصيغة XML. |
| `melis_core_user_connection_date` | سِجلّ تسجيل الدخول. |
| `melis_core_lang` | لغات الواجهة الخلفية. |
| `melis_core_platform` | البيئات/المنصّات. |
| `melis_core_bo_emails` / `_details` | قوالب رسائل بريد المعاملات والمتون لكل لغة. |
| `melis_core_log` / `_log_type` / `_log_type_trans` | سِجلّ الإجراءات، الأنواع، والترجمات. |
| `melis_core_lost_password` | رموز إعادة تعيين كلمة المرور. |
| `melis_core_microservice_auth` | مفاتيح API لنقاط نهاية الخدمة المصغّرة. |
| `melis_core_dashboards` / `_dashboard_schema` | تخطيط لوحة التحكم لكل مستخدم. |
| `melis_core_plugins` | الإضافات المُسجَّلة. |
| `melis_core_gdpr_delete_config` / `_delete_emails_logs` | قواعد الحذف التلقائي وفق GDPR ومسار التدقيق. |
| `melis_user_password_history` | سِجلّ كلمات المرور (منع إعادة الاستخدام). |
| `melis_announcement` | إعلانات الواجهة الخلفية. |

## الملفات الأساسية

| الشأن | المسار |
| --- | --- |
| تمهيد الوحدة | `vendor/melisplatform/melis-core/src/Module.php` |
| المسارات، الخدمات، المتحكّمات، مساعدات العرض | `vendor/melisplatform/melis-core/config/module.config.php` |
| هيكل الواجهة الخلفية القديم وشجرة الأدوات (الواجهة) | `vendor/melisplatform/melis-core/config/app.interface.php` |
| تصريحات أدوات DataTable | `vendor/melisplatform/melis-core/config/app.tools.php` |
| نقاط نهاية الخدمة المصغّرة | `vendor/melisplatform/melis-core/config/app.microservice.php` |
| مسارات react-api الأصيلة + المتحكّمات | `config/react-api.php` + `src/Controller/MelisReactApi*Controller.php` |
| قدرات الأدوات الأصيلة | `config/react.capabilities.php` |
| مصدر تطبيق React | `vendor/melisplatform/melis-core/ui-react/src/` |
| تطبيق React المبني (المُودَع) | `vendor/melisplatform/melis-core/public/ui-react/` |
| الخدمات · المتحكّمات · بوّابات الجداول | `src/Service/` · `src/Controller/` · `src/Model/Tables/` |
| SQL التثبيت والترحيلات · الترجمات | `install/` · `language/` |

انظر أيضًا: [مرجع الوحدات](/ar/reference/modules)، [إنشاء أداة](/ar/guide/create-a-tool)،
[الإضافات](/ar/guide/plugins)
