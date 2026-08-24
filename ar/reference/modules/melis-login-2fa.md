# MelisLogin2fa

> نواة/منسّق المصادقة الثنائية لعمليات تسجيل الدخول في Melis — بعد اسم المستخدم وكلمة المرور، يطلب رمزًا لمرة واحدة ويفوّض تسليمه إلى وحدات قنوات قابلة للتوصيل. الحزمة `melisplatform/melis-login-2fa`.

## الغرض

‏MelisLogin2fa هو **منسّق المصادقة الثنائية (2FA)** في Melis. بعد أن يجتاز المستخدم اسم المستخدم/كلمة المرور، يعترض عملية تسجيل الدخول (عبر `melis_core_auth_pre_success`)، ويتحقق مما إذا كانت المصادقة الثنائية مفعّلة للمنصة والموقع/الوحدة الحاليين، ويختار قناة تسليم، ويُبقي الجلسة غير منتهية حتى يُدخَل رمز صحيح مكوّن من 6 أرقام. وهو **لا يرسل** الرمز بنفسه — إذ يُفوَّض التسليم إلى وحدات قنوات قابلة للتوصيل (البريد الإلكتروني، الرسائل النصية) عبر عقد الأحداث `canSend` / `sendUserCode`. قناة البريد الإلكتروني المضمّنة (`melis-login-2fa-email`) هي اعتمادية إلزامية ومتوفرة دائمًا كخيار احتياطي مقفل.

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisLogin2fa',
];
```

‏`melisplatform/melis-login-2fa-email` هي اعتمادية إلزامية ويجب تحميلها أيضًا (تُثبَّت كزوج مع هذه الوحدة). ‏PHP `^8.1|^8.3`.

## في الواجهة الخلفية React

تشحن هذه الوحدة **لَبِنة مساهمة فقط** — فليس لها **أداة في القائمة اليسرى ولا مسار خاص بها**. بدلًا من ذلك تسجّل `OtherConfigSection` تعرضها صفحة **Other config** الأصلية في MelisCore بعد بطاقاتها الخاصة. تجد المصادقة الثنائية في **System configuration → Other config**، كبطاقة **"Two-factor authentication (2FA)"** في الأسفل. تظهر البطاقة فقط عندما تكون الوحدة مفعّلة (يُكتشَف ذلك عبر `GET /melis/react-api/react-modules`، ثم تُجلَب الحزمة مسبقًا وتُقيَّم عند الإقلاع).

![بطاقة "Two-factor authentication (2FA)" داخل أداة React Other config: كتلة "Melis, sites & other modules" مع تبويبات الأهداف، ومفتاح Activate 2FA وقائمة ترتيب التسليم، إضافة إلى كتلة "Per environment" مع مفتاح Activate 2FA لكل منصة](/screenshots/react/melis-login-2fa/melislogin2fa-tooloverride-otherconfig-tab-2fa.png)

تحتوي البطاقة على كتلتين:

| الكتلة | ما تتحكم فيه |
| --- | --- |
| **Melis, sites & other modules** | عمود تبويبات على اليسار للأهداف (**Melis Platform BO**، إضافة إلى كل **موقع** عندما يكون MelisCms مفعّلًا). للهدف المحدَّد: مفتاح **Activate 2FA** وقائمة **"Delivery order (drag to reorder)"**. يكون **Default BO Email** مثبّتًا (وسم Default + أيقونة بريد، مفعّل دائمًا، لا يمكن إيقافه). أما الطرق الأخرى (مثل **Primotexto**/SMS) فلها مفتاح تشغيل/إيقاف. اسحب الصفوف لتحديد سلسلة الأولوية/الاحتياطي. |
| **Per environment** | عمود تبويبات للمنصات (**local**، **prod** …)، ولكل منها مفتاح **Activate 2FA** خاص بها يكتب `plf_2fa_active`. |

كل مفتاح وتبديل وإعادة ترتيب **يُحفَظ فورًا**. لا تعمل المصادقة الثنائية إلا عندما يكون كل من الهدف والبيئة الحالية مفعّلين. لا يحمل قسم React أي إعلان صلاحيات متقدّمة (capability) — إذ يتطلب الوصول إليه مسبقًا الوصولَ إلى أداة Other config.

![قائمة طرق "Delivery order (drag to reorder)": Default BO Email (وسم Default + أيقونة بريد، مقفل ومفعّل دائمًا) فوق Primotexto (مفتاح تشغيل/إيقاف)؛ اسحب مقبض القبضة لتحديد سلسلة الأولوية/الاحتياطي](/screenshots/react/melis-login-2fa/melislogin2fa-tooloverride-otherconfig-tab-2fa-order.png)

أما **تحدّي تسجيل الدخول نفسه فليس لَبِنة React**: عندما تنطبق المصادقة الثنائية، تُحجَب عملية تسجيل الدخول عند صفحة مستقلّة لإدخال الرمز يقدّمها `Login2faController` (الصفحة نفسها لكل من `/melis` و `/melis-react`). يرى المستخدم الهدف المُقنَّع (مثل `jo****@…`)، ويُدخِل الرمز المكوّن من 6 أرقام، ويمكنه **Resend** بعد فترة تهدئة. الرموز الخاطئة محدودة أيضًا، وكثرة حالات الفشل تُقفِل الحساب، وتنتهي صلاحية الرموز بعد 10 دقائق.

## الخدمات الرئيسية

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `MelisLogin2faService` | يولّد الرمز المكوّن من 6 أرقام (`generate2faCode()`)، وتجزئة تتبّع سداسية عشرية بطول 64 (`generateHash()`)، وطوابع زمنية للصلاحية (`getValidityDate($minutes)`). |
| `MelisLogin2faConfigService` | يقرأ ويكتب إعدادات المصادقة الثنائية لكل BO / لكل موقع. الطرق الرئيسية: `getModuleConfig()`، `getAllModuleConfigs()`، `getAllSiteConfigs()`، `getAvailable2faModules()` (يُطلِق `melis_login_2fa.collect_available_modules`)، `mergeAvailableModulesWithConfig()`، `filterOnlyInstalledModules()`، `saveItem()`. |
| `MelisLogin2faTranslationService` | مساعِدات ترجمة واعية باللغة المحلية (`translateByLocale`، `boTranslate`، …) لتطابق رسائلُ تسليم الرمز لغةَ المستخدم. |
| `MelisLogin2faControllerPlugin` | يكشف `verifyUserCode($userId, $code)` — يمسح الرموز المنتهية، ويفرض حد المحاولات، ويقفل الحساب عند كثرة الإخفاقات، ويمسح السجل عند النجاح. |
| `MelisLogin2faVerifierPlugin` (الاسم المستعار `melisLogin2faVerifier`) | مكوّن حجب (Gate plugin) — يُبقي الجلسة غير منتهية حتى يُقدَّم رمز صحيح. |

## واجهة React API

توجد المسارات في **`config/react-api.php`** (تُدمَج عبر `Module::getConfig()` تحت مسار `melis-react-api` الخاص بـ MelisReactApi). المتحكّم **`MelisLogin2faReactApiSettingsController`** (الاسم المستعار القابل للاستدعاء `MelisLogin2faReactApiSettings`)، وكلها تحت `/melis/react-api/login2fa-settings`، بعقد `{ success, data, error }`.

| الطريقة والعنوان (Method & URL) | الغرض |
| --- | --- |
| `GET /melis/react-api/login2fa-settings` | جميع الإعدادات → `{ moduleConfigs[], sites[], siteConfigs[], platforms[] }`. يُمرَّر `module_list` لكل صف عبر `mergeAvailableModulesWithConfig()` بحيث يظل الصف الذي لم يُحفَظ قط يسرد كل طريقة مثبّتة. تظهر صفوف المواقع فقط إذا كان MelisCms مفعّلًا. |
| `POST /melis/react-api/login2fa-settings/save-config` | حفظ صف واحد في `melis_core_login_2fa_config`: `{ mcl2cf_id?, mcl2cf_module_name, mcl2cf_site_id, mcl2cf_activate_2fa, module_list[] }` → يفوّض إلى `MelisLogin2faConfigService::saveItem()`. |
| `POST /melis/react-api/login2fa-settings/save-platform` | حفظ علَم منصة واحدة: `{ plf_id, plf_2fa_active }`. يكتب `MelisCoreTablePlatform`؛ ويعيد `422` إذا كان `plf_id` مفقودًا. |

هذه الـ react-api مرآة JSON خفيفة لتبويبات Other-config القديمة — الصفوف نفسها، و `saveItem` نفسه، لكن بصيغة JSON بدلًا من phtml المعروض. تُحجَب الإجراءات بواسطة **المصادقة فقط** (`denyUnlessAuthenticated()`، وإلا `401`)؛ لا تشحن الوحدة أي **`config/react.capabilities.php`** ولا تعلن أي صلاحيات متقدّمة، لذا لا تخترع سلاسل صلاحيات لها.

## جداول قاعدة البيانات

| الجدول | ما يحتويه |
| --- | --- |
| `melis_core_login_2fa_codes` | الرموز لمرة واحدة: معرّف المستخدم، والبريد الإلكتروني، والنوع (`melis-backoffice` أو معرّف الموقع)، والرمز المكوّن من 6 أرقام، وتجزئة الجلسة، وتاريخ الانتهاء، وعدّاد المحاولات الفاشلة مع طوابعها الزمنية (`mcl2c_try`، `mcl2c_try1/2/3_date`). |
| `melis_core_login_2fa_config` | صفوف الإعدادات لكل BO / لكل موقع: `mcl2cf_module_name` أو `mcl2cf_site_id`، و `mcl2cf_activate_2fa`، و `mcl2cf_module_list` (قائمة قنوات مرتّبة بصيغة JSON). |

يكتسب `melis_core_platform` عمود `plf_2fa_active` (يضيفه dbdeploy الخاص بالوحدة).

## معلمات التهيئة القابلة للضبط

مُعلَنة تحت مفتاح التهيئة `melis_login_2fa`:

| المفتاح | الافتراضي | الوصف |
| --- | --- | --- |
| `max_tries` | `3` | عدد محاولات الرمز الفاشلة قبل قفل الحساب (`usr_status = 0`). |
| `code_validity_minutes` | `10` | عدد الدقائق حتى تنتهي صلاحية الرمز. |
| `request_code_cooldown_seconds` | `60` | الحد الأدنى من الثواني بين طلبات إعادة الإرسال. |

## عقد أحداث القناة

لا تستدعي النواة أي قناة مباشرة — بل تُطلِق أحداثًا تجيب عليها القنوات. لإضافة طريقة تسليم، نفّذ مستمِعات لـ:

| الحدث | الاتجاه | الغرض |
| --- | --- | --- |
| `melis_login_2fa.collect_available_modules` | النواة → القنوات | تُلحِق القنوات `['module'=>'…', 'label'=>'…']` كي تظهر في قائمة الطرق في لوحة الإدارة. |
| `canSend` | النواة → القنوات | تُرجِع كل قناة `['<module-name>' => bool]` للإشارة إلى ما إذا كانت تستطيع الوصول إلى المستخدم. |
| `sendUserCode` | النواة → القنوات | تقوم أول قناة في `orderedModules` قادرة على الإرسال بإنشاء/إعادة استخدام الرمز وتسليمه، ثم تضبط `sent=true` وتستدعي `stopPropagation`. |

## مثال

```php
// Building a custom delivery channel — attach these two listeners in your module:

'canSend' => fn($e) => ['my-channel' => $canIReach($e->getParam('user'))],

'sendUserCode' => function ($e) {
    if (!empty($e->getParam('sent'))) return;                              // already sent
    if (($e->getParam('orderedModules')[0] ?? null) !== 'my-channel') return; // not my turn

    // Create/reuse the code via the core's service + table:
    // MelisLogin2faService::generate2faCode() + MelisLogin2faCodesTable

    // Deliver via your transport, then signal completion:
    $e->setParam('sent', true);
    $e->stopPropagation(true);
    return ['sent' => true, 'hash' => $hash, 'message' => 'sent to ' . $maskedTarget];
},

// Also respond to collect_available_modules so the admin can enable/order your channel.
```

## الملفات الرئيسية

| الموضوع | المسار |
| --- | --- |
| إقلاع الوحدة | `vendor/melisplatform/melis-login-2fa/src/Module.php` (`getConfig()` يدمج `react-api.php`) |
| تهيئة الوحدة (الخدمات، المسارات، المعلمات القابلة للضبط) | `vendor/melisplatform/melis-login-2fa/config/module.config.php` |
| مسارات React-api | `vendor/melisplatform/melis-login-2fa/config/react-api.php` |
| قائمة مسارات تجاوز الحجب | `vendor/melisplatform/melis-login-2fa/config/excluded.routes.php` |
| مستمِع تسجيل الدخول الرئيسي (`melis_core_auth_pre_success`) | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faMainListener.php` |
| مستمِع حفظ التهيئة | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faListener.php` |
| مستمِع إعادة الإرسال | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faRequestCodeListener.php` |
| متحكّم React-api | `vendor/melisplatform/melis-login-2fa/src/Controller/ReactApi/MelisLogin2faReactApiSettingsController.php` |
| المتحكّم (مسارات التحقق) | `vendor/melisplatform/melis-login-2fa/src/Controller/Login2faController.php` |
| مكوّن التحقق | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faControllerPlugin.php` |
| مكوّن الحجب (المُتحقِّق) | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faVerifierPlugin.php` |
| الخدمة الأساسية | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faService.php` |
| خدمة التهيئة | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faConfigService.php` |
| جدول الرموز | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faCodesTable.php` |
| جدول التهيئة | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faConfigTable.php` |
| مصدر لَبِنة React | `vendor/melisplatform/melis-login-2fa/ui-react/src/` (`brick.tsx`، `Login2faOtherConfigSection.tsx`) |
| اللَّبِنة المبنيّة + البيان (manifest) | `vendor/melisplatform/melis-login-2fa/public/ui-react/brick.js` · `brick.manifest.json` |
| نشر قاعدة البيانات (DB deploy) | `vendor/melisplatform/melis-login-2fa/install/dbdeploy/` |

## البيانات الوصفية

| العنصر | القيمة |
| --- | --- |
| الحزمة | `melisplatform/melis-login-2fa` |
| النوع | `melisplatform-module` · الفئة `core` · `dbdeploy: true` |
| مساحة الأسماء | `MelisLogin2fa\` (PSR-4 → `src/`) · اسم الوحدة `MelisLogin2fa` |
| لَبِنة React | مساهمة فقط (المعرّف `melis-login-2fa`، و `route`/`forwardKey`/`melisKey` = `null`)؛ تسجّل `OtherConfigSection` |
| المتطلبات | `melisplatform/melis-login-2fa-email` `^5.3` · PHP `^8.1\|^8.3` |

انظر أيضًا: [MelisLogin2faEmail](/ar/reference/modules/melis-login-2fa-email) · [MelisCore](/ar/reference/modules/melis-core)
