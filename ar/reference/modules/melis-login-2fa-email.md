# MelisLogin2faEmail

> قناة تسليم عبر البريد الإلكتروني لنظام المصادقة الثنائية (2FA) في Melis — تُرسل رمز تسجيل الدخول لمرة واحدة عبر البريد الإلكتروني. الحزمة `melisplatform/melis-login-2fa-email`.

## الغرض

MelisLogin2faEmail هي قناة البريد الإلكتروني **الافتراضية والمُضمّنة** الخاصة بـ [MelisLogin2fa](/ar/reference/modules/melis-login-2fa). تتعامل مع الحدثين `canSend` و`sendUserCode` اللذين تطلقهما نواة المصادقة الثنائية، فتقرر ما إذا كان بالإمكان الوصول إلى المستخدم عبر البريد الإلكتروني، ثم تُرسل الرمز المكوّن من 6 أرقام. ولأن النواة تتطلب هذه الوحدة وهذه الوحدة تتطلب النواة، فإنهما تُثبَّتان كزوج واحد — إذ يظل البريد الإلكتروني دائمًا قناة الاحتياط المتاحة.

## الحضور في الواجهة الخلفية React

هذه الوحدة هي **إضافة أسلوب مصادقة ثنائية (2FA method plugin)**، وليست أداة: فليس لها **أي لبنة React، ولا مسار `react-api`، ولا قدرات، ولا واجهة مستخدم خاصة بها**. ولا تظهر أبدًا كمدخل في الشريط الجانبي أو القائمة `/melis-react`. بدلًا من ذلك، تظهر قناة البريد الإلكتروني *داخل* الشاشات التي تملكها MelisLogin2fa / MelisCore فقط:

- **كأسلوب مصادقة ثنائية قابل للاختيار وإعادة الترتيب** في **قسم إعدادات المصادقة الثنائية** الذي تساهم به النواة في أداة *Other config*. يُفعّله المسؤولون ويحدّدون ترتيبه هناك؛ والترتيب هو ما يقرر أيّ قناة نشطة تُجرَّب أولًا.
- **كخطوة البريد الإلكتروني وإدخال الرمز عند تسجيل الدخول** — عندما تكون المصادقة الثنائية مُفعّلة والبريد الإلكتروني هو القناة المختارة، يُرسل مسار تسجيل الدخول الرمز المكوّن من 6 أرقام بالبريد الإلكتروني ويعرض شاشة إدخال الرمز. ويعرض التأكيد عنوانًا **مُقنّعًا** (مثل `jo****@…`).

**لا توجد لقطات شاشة React** لهذه الوحدة، لأنه ليس لها شاشة خاصة بها.

## تفعيلها

هذه الوحدة مطلوبة من قبل `melis-login-2fa` وتُثبَّت تلقائيًا إلى جانبها. ولا حاجة إلى أي مدخل منفصل في ملف تحميل الوحدات أبعد من تحميل `MelisLogin2fa`.

لتفعيل قناة البريد الإلكتروني، افتح إعدادات المصادقة الثنائية الظاهرة في الواجهة الخلفية React:

**System config → Other config → 2FA** — فعّل **Email** كأسلوب تسليم وحدّد ترتيبه بين القنوات النشطة.

يجب أيضًا أن يكون البريد الإلكتروني للواجهة الخلفية (BO) في المنصة نشطًا (مُهيّأً عبر إعدادات البريد الإلكتروني في MelisCore).

## الخدمات الرئيسية

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `Melis2faBOEmailService` | يوسّع `MelisCoreBOEmailService`؛ ويتجاوز `sendBoEmailByCode()` / `sendEmail()` لتعيين مُرسِل المغلّف الصحيح (`email_from` بدلًا من عنوان المستلم). يحمّل قالب البريد الإلكتروني حسب الاسم الرمزي (codename)، ويستبدل العناصر النائبة `[TAG]`، ويغلّفه ضمن التخطيط، ثم يرسله عبر `Laminas\Mail`. |
| `MelisLogin2faEmailControllerPlugin` | إضافة تحكّم (Controller plugin) — نقطة الدخول التي يستدعيها كلا المستمعَين؛ تُتيح `canSend($userData)` و`sendUserCode($user, $code)`. |

## المستمعون

| المستمع | الحدث | السلوك |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | يُرجع `['melis-login-2fa-email' => <bool>]` — يكون `true` عندما يمتلك المستخدم `usr_email` صالحًا للاستخدام (غير فارغ ويجتاز `Laminas\Validator\EmailAddress`). |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | يعمل فقط عندما لا يكون الرمز قد أُرسل بعد **و** تكون هذه القناة هي الأولى في `orderedModules` (`orderedModules[0] === 'melis-login-2fa-email'`). يعيد استخدام صفٍّ في `melis_core_login_2fa_codes` أو يُنشئ صفًّا جديدًا، ويحدّد اللغة المحلية (locale)، ويرسل الرمز، ثم يعيّن `sent=true`، ويستدعي `stopPropagation`، ويُرجع `['sent'=>true, 'hash'=>…, 'message'=>'<sent-to> '.maskEmail($email)]`. |

المُعرّف المستخدم في كامل عملية اختيار الأسلوب والترتيب هو السلسلة النصية `melis-login-2fa-email`.

## اللغة المحلية ورابط الاسترجاع

تحدّد `sendUserCode()` **اللغة المحلية (locale)** الخاصة بالمستلم (قيمة `usr_lang_id` الخاصة بالمستلم نفسه في سياق الواجهة الخلفية BO، مع الرجوع إلى لغة الجلسة كخيار احتياطي؛ ولغة الصفحة الرئيسية للموقع في سياق الواجهة الأمامية FO) بحيث يكون موضوع البريد الإلكتروني ونصّه بلغة المستلم.

يتكيّف رابط *forgot-password* في البريد الإلكتروني مع الواجهة الخلفية التي أتى منها المستخدم: فالمستخدم في الواجهة الخلفية الذي طلب رمزه **من واجهة React** يحصل على رابط يشير إلى **`/melis-react/forgot-password`** بدلًا من الرابط القديم `/melis/lost-password`. ويُتحكَّم بذلك عبر `($user['ui_origin'] ?? null) === 'react'`، حيث يُشتقّ `ui_origin` (استنادًا إلى Referer، مع القيمة الافتراضية `'legacy'`) بواسطة `Login2faController::request2faCodeAction()` الخاص بالنواة. ولا شيء آخر في المسار خاص بـ React.

## التهيئة

مُعرَّفة تحت مفتاح التهيئة `melis_login_2fa_email`:

| المفتاح | القيمة الافتراضية | الوصف |
| --- | --- | --- |
| `email_from` | `noreply@melistechnology.com` | عنوان مُرسِل المغلّف |
| `from_name` | `Melis Platform` | الاسم المعروض للمُرسِل |
| `reply_to` | — | عنوان الرد (Reply-to) |

## جداول قاعدة البيانات

| الجدول | ما يحتويه |
| --- | --- |
| `melis_core_login_2fa_codes` | الرموز لمرة واحدة (مشتركة مع نواة المصادقة الثنائية)؛ تُعاد الصفوف عندما تكون لا تزال صالحة أو تُنشأ من جديد بواسطة `MelisLogin2faService::generate2faCode()`. |

## الملفات الرئيسية

| الجانب | المسار |
| --- | --- |
| تمهيد الوحدة (Module bootstrap) | `vendor/melisplatform/melis-login-2fa-email/src/Module.php` |
| تهيئة الوحدة | `vendor/melisplatform/melis-login-2fa-email/config/module.config.php` |
| مستمع `canSend` | `vendor/melisplatform/melis-login-2fa-email/src/Listener/MelisCoreCanSendListener.php` |
| مستمع `sendUserCode` | `vendor/melisplatform/melis-login-2fa-email/src/Listener/MelisCoreSendUserCodeListener.php` |
| إضافة التحكّم | `vendor/melisplatform/melis-login-2fa-email/src/Controller/Plugin/MelisLogin2faEmailControllerPlugin.php` |
| خدمة البريد الإلكتروني | `vendor/melisplatform/melis-login-2fa-email/src/Service/Melis2faBOEmailService.php` |

## البيانات الوصفية

| العنصر | القيمة |
| --- | --- |
| الحزمة | `melisplatform/melis-login-2fa-email` |
| النوع | `melisplatform-module` · الفئة `core` · `dbdeploy: true` |
| مساحة الأسماء | `MelisLogin2faEmail\` (PSR-4 → `src/`) |
| المتطلبات | `melisplatform/melis-login-2fa` `^5.3` · PHP `^8.1\|^8.3` |
| الحضور في React | لا شيء — لا لبنة، ولا `react-api`، ولا قدرات، ولا واجهة مستخدم |

انظر أيضًا: [MelisLogin2fa](/ar/reference/modules/melis-login-2fa) · [MelisCore](/ar/reference/modules/melis-core)
