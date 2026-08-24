# MelisLogin2faPrimotexto

> قناة توصيل الرسائل النصية القصيرة (SMS) لنظام المصادقة الثنائية 2FA في Melis عبر بوابة Primotexto. الحزمة `melisplatform/melis-login-2fa-primotexto`.

## الغرض

MelisLogin2faPrimotexto هي قناة اختيارية للمصادقة الثنائية 2FA تُرسل رمز تسجيل الدخول لمرة واحدة عبر رسالة نصية باستخدام واجهة برمجة تطبيقات الرسائل القصيرة **Primotexto**. تتصل بعقد الأحداث الأساسي لـ `MelisLogin2fa` (`canSend` / `sendUserCode`). فعندما تكون مرتبة أولًا بين القنوات النشطة ويمتلك المستخدم رقم هاتف صالحًا، تُوصّل الرمز عبر رسالة نصية؛ وإذا لم يُعثر على رقم هاتف صالح لكن كانت هناك قناة بريد إلكتروني نشطة أيضًا، فإنها تتراجع إلى البريد الإلكتروني وتُعلم المستخدم بذلك.

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisLogin2faPrimotexto',
];
```

تتطلب `melisplatform/melis-login-2fa` (`^5.3`) و PHP `^8.1|^8.3`. يجب تحميل الوحدة الأساسية `MelisLogin2fa` أولًا.

بمجرد تحميلها، فعّل **SMS (Primotexto)** في **إعدادات المصادقة الثنائية 2FA** المشتركة (System config ← 2FA) ورتّبها أولًا لجعلها القناة الأساسية. زوّد بيانات اعتماد واجهة برمجة تطبيقات Primotexto ضمن مفتاح الإعداد `melis_login_2fa_primotexto` (راجع [الإعداد](#configuration)).

## في الواجهة الخلفية React

هذه الوحدة هي **مكوّن إضافي لطريقة مصادقة ثنائية 2FA يعمل من جانب الخادم**، وليست أداة للواجهة الخلفية. في الواجهة الخلفية React (`/melis-react`) ليس لها **صفحة ولا مسار ولا مدخل قائمة**. يقتصر أثرها في React بالكامل على **قالب اكتشاف يحمل معرّفًا فقط (id-only)**: ملف `public/ui-react/brick.manifest.json` مبسّط (مع `route` و`forwardKey` و`melisKey` جميعها `null`) وملف `brick.tsx` يسجّل معرّفه فقط.

```tsx
// ui-react/src/brick.tsx — the entire React contribution (id only, no UI).
window.__melisRegisterBrick?.({ id: 'melis-login-2fa-primotexto' })
```

تسجيل ذلك المعرّف هو ما يجعل الوحدة تظهر في `GET /melis/react-api/react-modules`، وهي قائمة اكتشاف الوحدات النشطة التي تشحن قالبًا (brick). يعتمد استدعاء `useModuleActive('MelisLogin2faPrimotexto')` في MelisCore على تلك القائمة لكي **يُظهر الحقل `usr_phone` في نموذج المستخدمين الأصلي (Users)** — إذ يحتاج المستخدمون إلى رقم هاتف من أجل المصادقة الثنائية 2FA عبر الرسائل النصية. لا تُسهم هذه الوحدة **بأي نقاط نهاية `react-api` ولا بأي قدرات (capabilities)** خاصة بها؛ فإعدادات واجهة برمجة تطبيقات Primotexto (`url` و`api_key` و`sender`) يعرضها قسم إعدادات المصادقة الثنائية 2FA المشترك المملوك للنواة الأساسية للمصادقة الثنائية 2FA، وليس هذه الوحدة.

## الإعداد

```php
// config/autoload/primotexto.local.php  (do NOT commit real keys)
return [
    'melis_login_2fa_primotexto' => [
        'url'     => 'https://api.primotexto.com/v2/notification/messages/send',
        'api_key' => 'YOUR_API_KEY',   // override per environment
        'sender'  => 'Melis',
    ],
];
```

> **تحذير.** يشحن ملف `config/module.config.php` المُلتزَم به قيمة نائبة حرفية لـ `api_key`. تجاوَزها دائمًا في ملف إعداد محلي/خاص بالبيئة، ودوّر أي مفتاح حقيقي قد يكون تم الالتزام به.

## الخدمات الأساسية

| اسم مستعار للخدمة | الدور |
| --- | --- |
| `SmsService` | يستدعي واجهة برمجة تطبيقات Primotexto عبر HTTP لتوصيل رسالة OTP النصية؛ يُطبّع الأرقام الفرنسية `0…` إلى `+33…`؛ يسجّل إخفاقات curl/HTTP في `CmaErrorLogsTable` |
| `MelisLogin2faPrimotextoControllerPlugin` | مكوّن إضافي للمتحكّم (controller plugin) يُتيح `canSend($userData)` و`sendUserCode($user, $code)`؛ يقود `SmsService` |

## مستمعو الأحداث

| المستمع | الحدث | السلوك |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | يُرجع `['melis-login-2fa-primotexto' => bool]`؛ إذا تعذّر الإرسال لكن البريد الإلكتروني هو التالي في الترتيب، يخزّن `twofa_fallback_message` في جلسة `melis_login_2fa` |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | يعمل فقط عندما لم يُرسَل الرمز بعد وتكون هذه القناة هي `orderedModules[0]`؛ يعيد استخدام/ينشئ صف `melis_core_login_2fa_codes`، ويرسل عبر `SmsService`، ويضبط `sent=true`، ويستدعي `stopPropagation` |

## جداول قاعدة البيانات

| الجدول | يحتوي على |
| --- | --- |
| `melis_core_user` | يكتسب عمودًا `usr_phone` قابلًا لأن يكون فارغًا (يضيفه `dbdeploy` الخاص بهذه الوحدة) — رقم الهاتف الذي تُرسَل إليه رموز OTP |
| `melis_core_login_2fa_codes` | رموز OTP (مملوكة للنواة `MelisLogin2fa`؛ تعيد هذه القناة استخدام/إنشاء الصفوف عبر `MelisLogin2faService` + `MelisLogin2faCodesTable`) |

## مثال

```php
// Primotexto API call assembled by SmsService::sendSms()
$url = $config['url'] . '?' . http_build_query([
    'apiKey'     => $config['api_key'],
    'identifier' => $number,           // normalised to +33… for French numbers
    'sender'     => trim($config['sender']),
    'message'    => $message,
]);
// Sent via curl (GET). HTTP >= 400 or curl failure → logged + returns false.
```

## محاذير

- **الاعتماد على `CmaErrorLogsTable`.** يسجّل `SmsService` الإخفاقات في `CmaErrorLogsTable` من وحدة عميل CMA. إذا لم يكن ذلك الجدول/الخدمة مسجّلًا في تثبيت عام، فسيفشل مسار تسجيل الأخطاء. اجعل هذا الاعتماد اختياريًا عند النشر خارج سياق العميل الأصلي.
- **التراجع إلى البريد الإلكتروني.** إذا كانت Primotexto أولًا لكن المستخدم لا يملك رقم هاتف صالحًا، وكانت قناة بريد إلكتروني نشطة ومرتبة بعدها، فيُوصَّل الرمز عبر البريد الإلكتروني مع رسالة توضيحية.
- **رقم الهاتف المُقنّع في الواجهة.** تعرض شاشة إدخال الرمز نسخة مُقنّعة فقط من رقم الهاتف (مثل `+3…**…07`).

## الملفات الأساسية

| الموضوع | المسار |
| --- | --- |
| تمهيد الوحدة (bootstrap) | `vendor/melisplatform/melis-login-2fa-primotexto/src/Module.php` |
| مستمع `canSend` | `vendor/melisplatform/melis-login-2fa-primotexto/src/Listener/MelisCoreCanSendListener.php` |
| مستمع `sendUserCode` | `vendor/melisplatform/melis-login-2fa-primotexto/src/Listener/MelisCoreSendUserCodeListener.php` |
| خدمة واجهة برمجة تطبيقات الرسائل القصيرة | `vendor/melisplatform/melis-login-2fa-primotexto/src/Service/SmsService.php` |
| المكوّن الإضافي للمتحكّم | `vendor/melisplatform/melis-login-2fa-primotexto/src/Controller/Plugin/MelisLogin2faPrimotextoControllerPlugin.php` |
| قالب React (brick) | `vendor/melisplatform/melis-login-2fa-primotexto/ui-react/src/brick.tsx` |
| بيان React (manifest) | `vendor/melisplatform/melis-login-2fa-primotexto/public/ui-react/brick.manifest.json` |
| إعداد الوحدة | `vendor/melisplatform/melis-login-2fa-primotexto/config/module.config.php` |
| ترحيل قاعدة البيانات (DB migration) | `vendor/melisplatform/melis-login-2fa-primotexto/install/dbdeploy/` |

انظر أيضًا: [MelisLogin2fa](/ar/reference/modules/melis-login-2fa) · [MelisLogin2faEmail](/ar/reference/modules/melis-login-2fa-email) · [MelisCore](/ar/reference/modules/melis-core)
