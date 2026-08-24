# MelisCmsUserAccount

> نظام حسابات زوّار الموقع في الواجهة الأمامية — التسجيل وتسجيل الدخول والملفات الشخصية لكل موقع لأعضاء الموقع، تُدار من أداة واجهة خلفية أصلية مبنية على React. الحزمة `melisplatform/melis-cms-user-account`.

## الغرض

يدير MelisCmsUserAccount حسابات **زوّار الموقع** (الواجهة الأمامية) — الأشخاص الذين يسجّلون ويسجّلون الدخول
في مواقع نظام إدارة المحتوى الخاص بك. وهي تختلف عن حسابات موظفي الواجهة الخلفية التي يديرها MelisCore. تُحدَّد نطاقات الحسابات
**لكل موقع** (يمكن للشخص الواحد امتلاك حسابات في عدة مواقع). تشحن الوحدة إضافتَي صفحة قابلتين للإدراج
(نموذج تسجيل الدخول ونموذج التسجيل)، وأداة إدارة للواجهة الخلفية، ومسارًا كاملًا للامتثال للائحة GDPR
يغطّي معلومات البيانات، وتصدير البيانات، والحذف المُجهَّل الهوية، وسير عمل تلقائيًا لتطهير
الحسابات غير النشطة. عند الإقلاع، تضيف أيضًا أعمدة مفاتيح خارجية إلى جداول blog/news/comments بحيث تستطيع
عملية GDPR واحدة إظهار أو تصدير أو مسح كل ما يملكه المستخدم عبر تلك الوحدات.

في الإصدار v6، تكون أداة إدارة الواجهة الخلفية (**Users FO**) عبارة عن **لَبِنة React أصلية بالكامل** — واجهة CRUD
حقيقية مبنية على React تستدعي طبقة JSON عبر `react-api` — مع مبدّل **New / Old** يتراجع إلى
الأداة القديمة داخل iframe. أما إطار العمل والخدمات والجداول وآلية GDPR وإضافات الواجهة الأمامية فتبقى
دون تغيير؛ إذ انتقلت واجهة الإدارة فقط إلى React.

## تفعيلها

أضف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCmsUserAccount',
];
```

تبعيات Composer: `melisplatform/melis-core` (إطار GDPR، والجلسات، وأدوات الواجهة الخلفية) و
`melisplatform/melis-cms` (مضيف الصفحات/الإضافات). تُجلَب `melis-engine` و`melis-front` بشكل
انتقالي من أجل عرض الواجهة الأمامية. تُكتشَف أداة React تلقائيًا بمجرد أن تكون الوحدة
نشطة (تشحن ملف `brick.manifest.json`)؛ وإزالة الوحدة من `melis.module.load.php` تجعل
الأداة تختفي من واجهة React الخلفية.

## الخدمات الرئيسية

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `MelisCmsUserAccountService` | الخدمة الرئيسية — مُسمّاة أيضًا **`FrontUserAccountService`**. عمليات CRUD لمستخدمي الموقع إضافةً إلى المصادقة. |
| `MelisCmsUserAccountGdprAutoDeleteService` | منطق مسار الحذف التلقائي للحسابات غير النشطة (التحذيرات + تجهيل الهوية). |
| `FrontUserAccountTable` | بوابة الجدول لـ `melis_cms_user_account`. |
| `MelisCmsUserSitesTable` | بوابة الجدول لـ `melis_cms_user_account_sites`. |
| `MelisPasswordValidator` | مُتحقِّق سياسة كلمة المرور (8 أحرف كحد أدنى، حرف صغير واحد، رقم واحد) يُطبَّق عند التسجيل وحفظ الملف الشخصي. |

الطرق الرئيسية في `MelisCmsUserAccountService` (المُسمّى `FrontUserAccountService`):

```php
$svc = $sm->get('FrontUserAccountService');

// Authenticate a site visitor
$result = $svc->siteUserAuthenticate($login, $password, $siteId);

// Create a new account
$id = $svc->createUser($data);

// Fetch by various keys
$user = $svc->getUserById($id);
$user = $svc->getUserByLogin($login);
$user = $svc->getUserByEmailAndPassword($email, $password);

// Persist profile changes
$svc->saveUserAccountData($id, $data);

// Site memberships for a user
$sites = $svc->getUsersSitesByUserId($id);

// Record a login timestamp (used by the auto-delete pipeline)
$svc->updateUserConnectionDate($id);
```

بدلًا من ذلك، أطلق الحدث `site_user_account_authentication` ودع
`MelisCmsUserAccountSiteUserAuthenticationListener` يستدعي `siteUserAuthenticate()`؛ ثم يُخزَّن
المستخدم المُصادَق عليه في `Laminas\Session\Container` مُفهرَس حسب الموقع.

## الواجهة الخلفية (React) — Users FO

تقع أداة **Users FO** في واجهة React الخلفية (`/melis-react`) ضمن مجموعة **MelisCms**
في الشريط الجانبي ← **Utilisateurs FO** ("FO Users"). وهي **لَبِنة React أصلية بالكامل** (وليست iframe) مُركَّبة
على مسار الشجرة `/melis-cms/user-account`؛ ويتحكّم مفتاح القائمة `melis_cms_user_account_tool_display`
في الوصول والصلاحيات وiframe عرض Old. تدير الأداة **مستخدمي الموقع** فقط — ولا تدير أبدًا
موظفي الواجهة الخلفية (أولئك يخصّهم أداة **Users** في MelisCore).

وهي تعمق تدريجي من مستويين يُعرَض عبر **علامات التبويب الفرعية الأصلية** للمضيف (`subTabs: true`): **قائمة**
مسطّحة لمستخدمي الموقع، ونموذج **User** واحد يُفتَح لكل علامة تبويب فرعية.

![قائمة React Users FO — بطاقات مؤشرات الأداء (Total / Active / Inactive / Admins)، والبحث، ومرشِّحات الحالة/المشرف/الموقع، وReset filters، ومدير Columns، وExport، ومبدّل New / Old، وزر + New user؛ يعرض كل صف إجراءات View sites وEdit وDelete](/screenshots/react/melis-cms-user-account/meliscmsuseraccount-tool-usersfo-list.png)

**القائمة (المستوى 1)** — جدول قابل للبحث والفرز والتصفية لكل حساب في الواجهة الأمامية على
المنصّة، مع **بطاقات مؤشرات الأداء** (Total / Active / Inactive / Admins). عناصر التحكّم:

- **Search** (يطابق اسم الدخول والبريد الإلكتروني والاسم الأول واسم العائلة)
- مرشِّح **Status** (All / Active / Inactive) ومرشِّح **Admin** (All / Admin / Non-admin)
- محدِّد **Site** (All sites) و**Reset filters**
- مدير **Columns** (إخفاء الأعمدة / إعادة ترتيبها بالسحب والإفلات)
- **Export** إلى Excel أو CSV (يعمل على جانب العميل داخل اللَبِنة عبر SheetJS)
- مبدّل **New / Old** (أعلى اليمين) وزر **+ New user**

الأعمدة: **Id · Status · Admin · Picture · Email · Login · Full Name · Creation date · Action** (عمود
Picture للعرض فقط؛ انقر على أي ترويسة أخرى للفرز). يعرض كل صف ثلاثة إجراءات:

| الإجراء | الوصف |
| --- | --- |
| View sites (🔍) | نافذة منبثقة تسرد، لكل موقع ينتمي إليه المستخدم، تاريخ التسجيل، ووقت آخر تسجيل دخول، وما إذا كانت العضوية **مُجهَّلة الهوية** (GDPR)، ونطاقات الموقع. |
| Edit (✏️) | يفتح المستخدم في علامة تبويب فرعية (انظر أدناه). |
| Delete (🗑) | يزيل الحساب (بلا رجعة). |

**نموذج User (المستوى 2)** — يؤدي فتح صف أو **+ New user** إلى إضافة علامة تبويب فرعية بنموذج **User** واحد:
**Login** (للقراءة فقط عند التحرير)، و**Email**، و**First name**، و**Last name**، و**Birthday** (تقويم
بلغة الجلسة)، و**Language**، و**Creation date** للقراءة فقط، ولوحة **Picture**
(معاينة + Choose an image / Remove picture)، و**Password** / **Confirm password**. على اليمين،
مبدّلا **Active** و**Administrator** وقائمة مربّعات اختيار **Sites** المطلوبة. يحفظ **Save**
الحساب.

![نموذج تحرير المستخدم في React — Login (للقراءة فقط عند التحرير)، وEmail، وFirst/Last name، وBirthday، وLanguage، وCreation date للقراءة فقط، ولوحة Picture، وPassword / Confirm password، إضافةً إلى مبدّلي Active وAdministrator وقائمة مربّعات اختيار Sites المطلوبة](/screenshots/react/melis-cms-user-account/meliscmsuseraccount-tool-usersfo-edit-tab-user.png)

> تحمل حقول كلمة المرور التلميح *"Leave empty to keep unchanged"* — إذ لا يفرض تحرير الملف الشخصي أبدًا
> تغيير كلمة المرور. وعندما **تُكتَب** كلمة مرور فعلًا يجب أن تستوفي `MelisPasswordValidator` (8 أحرف كحد أدنى،
> حرف صغير واحد، رقم واحد). **يلزم موقع واحد على الأقل**؛ ويُستبعَد بصمت من الإرسال أي موقع سبق أن جُهِّلت
> هويته (GDPR) لذلك المستخدم.

**مبدّل New / Old** — تتبدّل الأداة بأكملها بين واجهة React (**New**، الافتراضية) والأداة الكلاسيكية
المعروضة داخل iframe (**Old**، `/melis/react-tool-page?key=melis_cms_user_account_tool_display`).
لا تزال أداة الواجهة الخلفية القديمة تُقدَّم بواسطة **`MelisCmsUserAccountToolController`**، دون تغيير.

## نقاط نهاية React API

تقع المسارات في `config/react-api.php`، ويقدّمها المتحكّم
`MelisReactApiUserAccountController` (الاسم المستعار القابل للاستدعاء
`MelisCmsUserAccount\Controller\MelisReactApiUserAccount`). وجميعها تحت `/melis/react-api/user-account`،
وتُرجِع عقد `{ success, data, error }`.

| الطريقة والعنوان | الغرض |
| --- | --- |
| `GET /user-account` | سرد المستخدمين (keyset: `limit`، `search`، `siteId`، `admin`، `status`، `sort`، `dir`، `after`) ← `{items,total,nextCursor}`؛ يحمل كل عنصر `hasPicture` |
| `GET /user-account/stats` | مؤشرات الأداء `{total, active, inactive, admins}` |
| `GET /user-account/sites` | قائمة مواقع المنصّة (المرشِّح + مربّعات اختيار النموذج) ← `[{id,label}]` |
| `GET /user-account/langs` | قائمة اللغات (قائمة اختيار النموذج) ← `[{id,label}]` |
| `GET /user-account/:id` | مستخدم واحد (يضيف `siteIds[]` + `pictureDataUrl`) — للتحرير |
| `GET /user-account/:id/picture` | صورة الصف بصيغة `image/jpeg` (تتراجع إلى الصورة الرمزية الافتراضية) |
| `GET /user-account/:id/sites` | تفاصيل "View sites" لكل موقع: التسمية، وتواريخ التسجيل/آخر تسجيل دخول، و`anonymized`، والنطاقات |
| `POST /user-account/save` | إنشاء / تحديث الحساب |
| `DELETE /user-account/delete/:id` | حذف الحساب |

يستعلم `list`/`stats` عن `melis_cms_user_account` مباشرةً باستخدام SQL مُعامَل؛ أما `get`/`save`/`delete`/
`userSites` **فتُفوِّض إلى الخدمات القديمة** (`FrontUserAccountTable`، `FrontUserAccountService`) —
وهي الخدمات نفسها التي تستخدمها الأداة القديمة، بحيث تُحفَظ جميع قواعد العمل (تفرُّد اسم الدخول/البريد، وتجزئة
كلمة المرور، وروابط الموقع، وحارس المواقع المُجهَّلة الهوية في GDPR) وأحداث سجلّ النشاط
(`meliscms_user_account_tooluser_save` / `_delete`).

## الصلاحيات

مُعلَنة في `config/react.capabilities.php` تحت عقدة الحقوق
`melis_cms_user_account_tool_display`. الأداة هي CRUD مسطّحة، لذا فالإعلان قائمة مسطّحة:

```php
return [
  'melisReactToolCapabilities' => [
    'melis_cms_user_account_tool_display' => ['list', 'create', 'edit', 'delete', 'export'],
  ],
];
```

يستدعي كل إجراء API أولًا `denyUnlessAccess()` (المصادقة +
`MelisCoreRights::canAccess('melis_cms_user_account_tool_display')` ← 401/403)، ثم فحص الصلاحية:

| الصلاحية | تُفرَض على |
| --- | --- |
| `list` | `list`، `stats`، `picture` |
| `edit` | `get`، `userSites`، و`save` عند وجود `id` (تحديث) |
| `create` | `save` عند غياب `id` (إنشاء) |
| `delete` | `delete` |
| `export` | تعريفية فقط — يعمل التصدير على جانب العميل داخل اللَبِنة |

## الواجهة الأمامية

تُسجَّل إضافتا قوالب تحت `config/plugins/` (دون تغيير في v6 — يقدّمهما عارض الواجهة الأمامية،
لا أداة React):

| الإضافة | تعرض | الخيارات الرئيسية |
| --- | --- | --- |
| `MelisCmsUserAccountLoginPlugin` | نموذج تسجيل الدخول (وعنصر تحكّم بتسجيل الخروج عند المصادقة مسبقًا). | `template_path`، `page_id_registration_page` |
| `MelisCmsUserAccountUserRegisterPlugin` | نموذج التسجيل (اسم المستخدم، البريد الإلكتروني، كلمة المرور ×2، الاسم الأول/العائلة، الصورة، اللغة). | `template_path`، `page_id_login_page`، `force_joint_accounts` |

يعيد `force_joint_accounts` في إضافة التسجيل استخدام حساب موجود عبر عدة مواقع؛ وتُخزَّن عضوية الموقع
في `melis_cms_user_account_sites`.

تُقدَّم كلتا الإضافتين بواسطة **`MelisCmsUserAccountPluginController`**:

| الإجراء | الدور |
| --- | --- |
| `authenticateUserAction()` | مصادقة `login`/`password`/`siteId` وفتح الجلسة. |
| `logoutUserAction()` | إغلاق جلسة مستخدم الموقع. |
| `createUserAction()` | التحقّق من مستخدم وإنشاؤه (يشمل رفع الصورة). |
| `getRegistrationFormAction()` | إرجاع نموذج التسجيل (للتبديل بين تسجيل الدخول↔التسجيل). |
| `getTranslationsAction()` | سلاسل الترجمة على الجانب الأمامي. |

> لا يوجد إجراء مدمج لنسيان/إعادة تعيين كلمة المرور أو تفعيل البريد الإلكتروني في متحكّم الإضافة.
> ابنِ ذلك فوق `FrontUserAccountService` إن لزم الأمر.

## جداول قاعدة البيانات

| الجدول | المفتاح الأساسي | يحمل |
| --- | --- | --- |
| `melis_cms_user_account` | `uac_id` | مستخدم الموقع: `uac_login`، `uac_email`، `uac_password`، `uac_firstname`، `uac_lastname`، `uac_picture`، `uac_status`، `uac_admin`، `uac_birthday`، `uac_lang_id`، `uac_date_creation`. |
| `melis_cms_user_account_sites` | `uacs_id` | جدول وصل المستخدم ↔ الموقع: `uacs_uac_id`، معرّف الموقع، `uacs_anonymized` (علم GDPR لكل موقع). |

يضيف `MelisCmsUserAccountAddCustomFieldsTableListener` (يُطلَق عند الإقلاع) أعمدة مفاتيح خارجية
`*_author_account` إلى جداول blog/news/comments، وينشئ `melis_cms_user_account_sites`، ويرحّل
عمود `uac_site_id` القديم. والعملية مُتماثِلة الأثر (تتحقّق من وجود العمود).

## GDPR

### المعلومات / الاستخراج / الحذف اليدوي (المجموعة 1+2)

تجيب تسعة مستمعين على ثلاثة أحداث في MelisCore:

| الحدث | مستمع الحساب | مستمع Blog | مستمع Comments |
| --- | --- | --- | --- |
| `melis_core_gdpr_user_info_event` | `…GdprUserInfoListener` | `…BlogGdprUserInfoListener` | `…CommentsGdprUserInfoListener` |
| `melis_core_gdpr_user_extract_event` | `…GdprUserExtractListener` | `…BlogGdprUserExtractListener` | `…CommentsGdprUserExtractListener` |
| `melis_core_gdpr_user_delete_event` | `…GdprUserDeleteListener` | `…BlogGdprUserDeleteListener` | `…CommentsGdprUserDeleteListener` |

يكون مستمعا Blog وComments نشطين فقط عند تثبيت `MelisCmsBlog` / `MelisCmsComments`.
يُجهِّل الحذف هوية صف الحساب ويضبط `uacs_anonymized`. وتقع تعيينات الحقول وعتبات الاحتفاظ
في `config/app.gdpr.php`.

### المسار التلقائي للحسابات غير النشطة (المجموعة 3)

يتّصل ستة مستمعين بمُجدوِل الحذف التلقائي في MelisCore:

| الخطوة | المستمع | الحدث | الأثر |
| --- | --- | --- | --- |
| 1. التسجيل | `…GdprAutoDeleteModuleListListener` | `melis_core_gdpr_auto_delete_modules_list` | إعلان الوحدة للمُجدوِل. |
| 2. الوسوم | `…GdprAutoDeleteTagsListListener` | `MelisCoreGdprAutoDeleteService::TAGS_EVENT` | تسجيل وسوم/فئات عدم النشاط. |
| 3. التحذير الأول | `…GdprAutoDeleteWarningListUsersListener` | `MelisCoreGdprAutoDeleteService::WARNING_EVENT` | إرسال بريد التحذير الأول للمستخدمين الخاملين. |
| 4. التحذير الثاني | `…GdprAutoDeleteSecondWarningListUsersListener` | `MelisCoreGdprAutoDeleteService::SECOND_WARNING_EVENT` | إرسال بريد التحذير الثاني للمستخدمين الذين ما زالوا خاملين. |
| 5. الحذف | `…GdprAutoDeleteActionDeleteUserListener` | `MelisCoreGdprAutoDeleteService::DELETE_ACTION_EVENT` | تجهيل هوية الحسابات التي لا تستجيب. |
| (سجلّ) | `…GdprAutoDeleteGetEmailListener` | `melis_core_gdpr_auto_delete_log_get_user_email` | حلّ البريد الإلكتروني لسجلّ التدقيق (يتخطّى المُجهَّلة الهوية مسبقًا). |

يُتتبَّع "آخر نشاط" بواسطة `updateUserConnectionDate()`.

## المستمعون عبر الوحدات

مُسجَّلون في `Module.php` عند الإقلاع:

| المستمع | الحدث | الغرض |
| --- | --- | --- |
| `MelisCmsUserAccountSiteUserAuthenticationListener` | `site_user_account_authentication` | نقطة دخول مصادقة الواجهة الأمامية ← `siteUserAuthenticate()`؛ يخزّن المستخدم في `Laminas\Session\Container` مُفهرَس حسب الموقع. (الأولوية `-1001`) |
| `MelisCmsUserAccountLoginFormListener` | `melis_cms_user_account_login_form` | حقن العضو المُسجَّل الدخول في نموذج التعليق (`mccom_user_acct`/`mccom_site_id` مخفيان، وزر تسجيل الخروج، والاسم من الحساب)؛ وإزالة حقلي الاسم/البريد للمستخدمين المجهولين. |
| `MelisCmsUserAccountCommentsFormModificationListener` | `meliscmsuseraccount_comments_form_modification_listener` | إعادة ترتيب عناصر نموذج التعليق حسب ترتيب مطلوب. |
| `MelisCmsUserAccountAddAuthorPicture` | `melis_cms_user_account_add_user_picture` | عرض `uac_picture` للعضو بجانب تعليقه (data URI بترميز base64). |
| `MelisCmsUserAccountSaveUserAccountListenter` | `meliscmsnews_get_postvalues` | حفظ `cnews_author_account` / `cnews_comments_require_account` عند حفظ الأخبار. |
| `MelisCmsUserAccountAddCustomFieldsTableListener` | `meliscms_user_account_add_custom_fields_table` | ترحيل عند الإقلاع: إضافة أعمدة مفاتيح خارجية إلى جداول blog/news/comments، وإنشاء جدول وصل المواقع، وترحيل البيانات القديمة. |
| `MelisCmsUserAccountFlashMessengerListener` | `meliscms_user_account_tooluser_save`، `meliscms_user_account_tooluser_delete` | رسائل فلاش في الواجهة الخلفية عند الحفظ/الحذف (الأداة القديمة). |

## الملفات الرئيسية

| المجال | المسار |
| --- | --- |
| بيان لَبِنة React | `vendor/melisplatform/melis-cms-user-account/public/ui-react/brick.manifest.json` |
| مسارات React API + القابل للاستدعاء | `vendor/melisplatform/melis-cms-user-account/config/react-api.php` |
| صلاحيات React | `vendor/melisplatform/melis-cms-user-account/config/react.capabilities.php` |
| متحكّم React API | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisReactApiUserAccountController.php` |
| متحكّم أداة الواجهة الخلفية القديمة (عرض Old) | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountToolController.php` |
| متحكّم إضافة الواجهة الأمامية | `vendor/melisplatform/melis-cms-user-account/src/Controller/MelisCmsUserAccountPluginController.php` |
| مدخل قائمة الواجهة الخلفية | `vendor/melisplatform/melis-cms-user-account/config/app.interface.php` |
| جدول بيانات الواجهة الخلفية القديمة (الأعمدة، المرشِّحات، النوافذ المنبثقة) | `vendor/melisplatform/melis-cms-user-account/config/app.tools.php` |
| جميع النماذج (الواجهة الأمامية + الواجهة الخلفية القديمة) | `vendor/melisplatform/melis-cms-user-account/config/app.forms.php` |
| تعيينات حقول GDPR + عتبات الاحتفاظ | `vendor/melisplatform/melis-cms-user-account/config/app.gdpr.php` |
| نقاط تكامل Comments | `vendor/melisplatform/melis-cms-user-account/config/comments.php` |
| المسارات، والأسماء المستعارة للخدمات، والإضافات، والمتحقّقون | `vendor/melisplatform/melis-cms-user-account/config/module.config.php` |
| إعداد إضافة تسجيل الدخول | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountLoginPlugin.config.php` |
| إعداد إضافة التسجيل | `vendor/melisplatform/melis-cms-user-account/config/plugins/MelisCmsUserAccountUserRegisterPlugin.config.php` |
| الخدمة الرئيسية | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountService.php` |
| خدمة الحذف التلقائي | `vendor/melisplatform/melis-cms-user-account/src/Service/MelisCmsUserAccountGdprAutoDeleteService.php` |
| مُتحقِّق كلمة المرور | `vendor/melisplatform/melis-cms-user-account/src/Validator/MelisPasswordValidator.php` |
| بوابات جداول قاعدة البيانات | `vendor/melisplatform/melis-cms-user-account/src/Model/Tables/` |
| المستمعون | `vendor/melisplatform/melis-cms-user-account/src/Listener/` |
| الإقلاع / حقن الأعمدة | `vendor/melisplatform/melis-cms-user-account/src/Module.php` |

انظر أيضًا: [MelisCore](/ar/reference/modules/melis-core) · [MelisCms](/ar/reference/modules/melis-cms) · [MelisCmsComments](/ar/reference/modules/melis-cms-comments) · [MelisCmsBlog](/ar/reference/modules/melis-cms-blog) · [MelisCmsNews](/ar/reference/modules/melis-cms-news)
