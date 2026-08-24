# MelisSmallBusiness

> إضافة مخصّصة لفريق التحرير في نظام إدارة المحتوى (CMS) — **أدوار المستخدمين**، وسير عمل **للتحقّق (workflow)**، و**إصدارات الصفحات**، و**التعليقات** و**قفل الصفحات**، إضافةً إلى **مكتبة وسائط** مبنية على TinyMCE، تُعرض جميعها عبر لوحة الإدارة الخلفية بـ React. الحزمة `melisplatform/melis-small-business`.

## الغرض

يضيف `MelisSmallBusiness` طبقة من أدوات التعاون للفرق الصغيرة فوق محرّر صفحات نظام إدارة المحتوى. فهو يحتفظ
بـ**إصدارات** الصفحات المنشورة (استعادة/معاينة حالة سابقة)، ويقود **سير عمل** للمحتوى
حيث يطلب المحرّر التحقّق ويقوم مراجع بالتحقّق منه أو رفضه، ويرفق **تعليقات** بـ
الصفحات، ويمنع مستخدمَين من تحرير الصفحة نفسها في آنٍ واحد عبر **قفل صفحة**، ويدير
أداة **دور مستخدم** مخصّصة، ويوفّر **مكتبة وسائط** مبنية على TinyMCE (MoxieManager). يبقى منطق الأعمال
في جانب الخادم (خدمات Laminas، وأحداث محرّر الـ CMS)؛ وفي الإصدار v6 تكون كامل الواجهة المرئية للمستخدم عبارة عن مجموعة
من لبنات React ومساهمات وحدية (modular).

## تفعيلها

هذه وحدة Laminas قياسية. أضِفها إلى `config/melis.module.load.php`:

```php
return [
    // …
    'MelisSmallBusiness',
];
```

تعتمد على `melis-core` و`melis-engine` و`melis-front` و`melis-cms`، وتُنشأ جداولها
عبر dbdeploy (`extra.dbdeploy = true`). تظهر كل واجهة React أدناه **فقط عندما تكون الوحدة
مفعّلة** (اكتشاف اللبنات عبر `GET /melis/react-api/react-modules`).

## واجهات React

في لوحة الإدارة الخلفية بـ React (`/melis-react`) توفّر الوحدة **لبنتين** و**مساهمتين وحديتين
(modular)** ليس لهما مسار خاص بهما.

| الواجهة | النوع | المسار / المضيف |
| --- | --- | --- |
| **أدوار المستخدمين** (`smallbusiness`) | React كامل أصلي (تبديل جديد/قديم) | `/melis-core/user-roles` |
| **مكتبة الوسائط** (`smallbusiness-medialib`) | لبنة iframe (MoxieManager) | `/melis-cms/media-library` |
| **نافذة سير العمل المنبثقة** | نافذة منبثقة مشتركة (`window.__melisWorkflowModal`) | تُعرض بواسطة محرّر News / Blog / صفحة CMS / Newsletter + عنصر لوحة المعلومات |
| **الإصدارات / التعليقات / القفل** | تبويبات + لافتة في محرّر صفحة الـ CMS | مُساهَم بها في عقدة القدرة `meliscms_page` |
| **الدور في المستخدمين** | عمود/مرشّح/محدّد الدور | أداة المستخدمين المضيفة، مقيّدة بـ `useModuleActive('MelisSmallBusiness')` |

يعلن `public/ui-react/brick.manifest.json` عن كلتا اللبنتين؛ ويسجّلهما `ui-react/src/brick.tsx`
وينشر نافذة سير العمل المنبثقة كمتغيّر عام على مستوى النافذة (window global) كي تتمكّن اللبنات الأخرى من عرض تطبيق
مشترك واحد.

## أداة أدوار المستخدمين

**الموقع:** الشريط الجانبي ← **MelisCore → User Roles** (`/melis-core/user-roles`).

الـ**دور** هو ملفّ صلاحيات مُسمّى يُخزَّن مرّة واحدة (`melis_core_user_role`) ويُسنَد إلى عدّة مستخدمين.
تعرض القائمة كل دور مع بطاقات مؤشّرات الأداء (Roles / Assigned)، وبحث، ومدير أعمدة، وتصدير، و
تبديل **جديد / قديم** (Old = الأداة الكلاسيكية داخل iframe). لكل صف (المعرّف، الاسم، تاريخ الإنشاء، عدد المستخدمين)
إجراءات تحرير/حذف؛ ولا يمكن **حذف** دور مُسنَد إلى مستخدمين.

![قائمة الأدوار في لوحة الإدارة الخلفية بـ React](/screenshots/react/melis-small-business/melissmallbusiness-tool-roles-list.png)

يفتح تحرير الدور تبويبًا فرعيًا يحتوي على حقل **Role name** وشجرة **Access rights** تعكس
شجرة صلاحيات المستخدمين (TOOLS مجمّعة حسب القسم، مع List/Create/Edit/Delete/Export لكل أداة، إضافةً إلى
قسمَي Pages وDashboard-plugins). يحفظ زر **Save** الاسم وملف `urole_rights` بصيغة XML.

![محرّر الدور وشجرة صلاحياته](/screenshots/react/melis-small-business/melissmallbusiness-tool-roles-edit-and-rights.png)

::: warning
تتطلّب كتابة ملف **الصلاحيات (rights)** بصيغة XML الخاصة بالدور مسؤول منصّة (`usr_admin`)؛ فإذا حرّر
مستخدم غير مسؤول دورًا حصل على خطأ 403 عند كتابة الصلاحيات. يمنع هذا مسارًا لتصعيد الامتيازات
(تزوير دور يمتلك كل الصلاحيات، ثم إسناده للنفس). يمكن تغيير **اسم** الدور لأي شخص يملك صلاحية `edit` للأداة.
:::

### الدور في أداة المستخدمين

عندما تكون الوحدة مفعّلة، تكتسب أداة **Users** في MelisCore عمود **Role** + مرشّحًا في القائمة
ومحدّد **Role** في نموذج المستخدم (إلى جانب Status وRights). تُغذَّى القائمة المنسدلة بواسطة
`GET /melis/react-api/roles` (قائمة المحدّد في MelisCore)؛ وعند الحفظ، يعيد مُستمع (listener) حقن
قدرات الدور كي لا تُفقد.

![نموذج المستخدم مع محدّد الدور](/screenshots/react/melis-small-business/melissmallbusiness-tooloverride-users-edit-withrole.png)

## مكتبة الوسائط

**الموقع:** الشريط الجانبي ← **MelisCms → Media library** (`/melis-cms/media-library`).

متصفّح الملفات المتقدّم TinyMCE / **MoxieManager**: المجلدات على اليسار، والملفات على اليمين
(الاسم، الحجم، النوع، التاريخ)، مع Create وUpload وعرض قائمة/شبكة وSort وFilter واختصارات
Favorites/History/Uploaded. صفحة React هي غلاف رفيع يعرض iframe بملء التبويب نحو
moxiemanager القديم (`/melis/MelisSmallBusiness/js/tinyMCE/moxiemanager/index.php?lang=xx`)، لذا يكون السلوك
مطابقًا للأداة الكلاسيكية — دون react-api خاص بها.

![مكتبة الوسائط — متصفّح MoxieManager داخل تبويب React](/screenshots/react/melis-small-business/melissmallbusiness-tool-medialibrary.png)

## سير العمل (التحقّق من الصفحة)

يتيح سير العمل للمحرّر أن **يطلب** التحقّق ولمُتحقِّق أن **يجيب**. تُفتح **النافذة المنبثقة نفسها**
من محرّر صفحة الـ CMS (زر **Workflow**)، ومن محرّري News وBlog، ومن عنصر لوحة المعلومات.
وهي عامة على نوع العنصر — `PAGE` و`NEWS` و`BLOG`.

تحت **Ask for validation**، اختر **Role** لإخطار كل من يحمل ذلك الدور، أو **"1 person
only"** لإظهار قائمة **User** المنسدلة واستهداف شخص واحد، ثم **Send request**.

![نافذة سير العمل المنبثقة — طلب شخص واحد](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-workflow-demand-1person.png)

يسرد تبويب **History** في النافذة المنبثقة كل طلب وإجابة (Date، Status، To/Role، From، Action). ويحصل
مستلم طلبٍ مفتوح على زرَّي **Validate** / **Refuse** ويمكنه إرفاق ملاحظة.

![نافذة سير العمل المنبثقة — السجل مع Validate/Refuse](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-workflow-demand-to-validated.png)

تعرض **لوحة المعلومات** في الإدارة الخلفية عنصر **Workflow** يسرد الطلبات، مقسّمًا إلى *Users' demands*
/ *My demands* مع تبويبات فرعية PAGE / NEWS؛ ويعرض كل صف شارة حالة (VALIDATED / REFUSED / Demand)
ويوفّر إجراءات التحقّق (✓) / الرفض (✗) والمعاينة ضمن الصف على الطلبات الموجّهة إليك.

![عنصر Workflow في لوحة المعلومات](/screenshots/react/melis-small-business/melissmallbusiness-dashboardplugins-workflow.png)

## الإصدارات والتعليقات (محرّر صفحة الـ CMS)

يضيف فتح صفحة في محرّر الـ CMS تبويبَي SmallBusiness بعد التبويبات الأصلية:

- **Versioning** — قائمة مصفّحة بلقطات الصفحة (No.، Name، Modified on، By) مع إجراءات
  View / Restore / Rename لكل صف. تُلتقط لقطة عند كل نشر.

  ![محرّر الصفحة — تبويب Versioning](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-edit-tab-versionning.png)

- **Comments** — الجدول الزمني لنشاط الصفحة الذي يمزج تعليقات المستخدمين وأحداث سير العمل (الأحدث
  أولًا)، مع صندوق "Add a comment".

  ![محرّر الصفحة — تبويب Comments](/screenshots/react/melis-small-business/melissmallbusiness-pageoverride-tab-comments.png)

تظهر لافتة **قفل الصفحة** + زر **Unlock** عندما يحوز مستخدم آخر قفل الصفحة.

## نقاط النهاية في react-api

جميعها تحت `/melis/react-api/…`، بعقد `{ success, data, error }`. تقع وحدات التحكّم في هذه
الوحدة (`config/react-api.php` + `src/Controller/MelisReactApi*Controller.php`).

| وحدة التحكّم | المسارات الأساسية | الحارس |
| --- | --- | --- |
| `MelisReactApiRoleController` | `GET /user-roles`, `/user-roles/stats`, `/user-roles/:id`; `POST /user-roles/save`; `DELETE /user-roles/delete/:id` | وصول `melissb_tool_userrole` + قدرة (كتابة صلاحيات XML = للمسؤول فقط) |
| `MelisReactApiWorkflowController` | `GET /workflow/roles`, `/workflow/users`, `/workflow/history`; `POST /workflow/ask` | مصادَقة فقط |
| `MelisReactApiPageVersioningController` | `GET /cms-page/versioning` | مصادَقة فقط |
| `MelisReactApiPageCommentsController` | `GET /cms-page/comments`, `/cms-page/timeline`; `POST /cms-page/comments/save` | مصادَقة فقط |
| `MelisReactApiPageLockController` | `GET /cms-page/lock`; `POST /cms-page/unlock` | مصادَقة فقط |

تُعيد **عمليات التعديل (mutations)** في سير العمل استخدام نقاط النهاية القديمة المُجرَّبة بدلًا من react-api:
`GET /melis/MelisSmallBusiness/MelisWorkflow/saveWorkflowActions` (تحقّق / رفض) و
`POST /melis/MelisSmallBusiness/MelisWorkflow/addWorkflowComments` (إضافة ملاحظة). ويُنقّى نص التعليق
بواسطة HTMLPurifier عند الحفظ.

## القدرات (Capabilities)

**يُساهم** `config/react.capabilities.php` بزر محرّر الصفحة + التبويبات تحت المفتاح المشترك
`meliscms_page` المملوك لـ MelisCms (مُدمَج، بحيث لا تحتاج MelisCms إلى معرفة SB):

| النوع | المفتاح | التسمية |
| --- | --- | --- |
| action | `workflow` | زر Workflow |
| action | `unlock` | زر Unlock |
| tab | `melissb_page_versioning` | تبويب Versioning |
| tab | `melissb_page_comments` | تبويب Comments |

يرشّح `CmsPage.tsx` تلك التبويبات / يخفي تلك الأزرار عبر `useCaps('meliscms_page').can(cap)`. وأداة
الأدوار نفسها مفتاحها `melissb_tool_userrole` ومكتبة الوسائط مفتاحها
`melissb_medialib`.

## جداول قاعدة البيانات

تُنشأ بواسطة `install/dbdeploy/126618_melis_sb_install.sql`.

| الجدول | الدور |
| --- | --- |
| `melis_sb_page_versioning` | نسخ مؤرشفة من الصفحات المنشورة (تدعم تبويب Versioning). |
| `melis_sb_workflow` | سجلات سير العمل لكل عنصر. |
| `melis_sb_workflow_events` | أحداث سير العمل (طلب / تحقّق / رفض). |
| `melis_sb_page_comment` | التعليقات المرفقة بصفحة (نوع التعليق 1 = PAGE، 2 = WORKFLOW). |
| `melis_sb_page_comment_type` | أنواع التعليقات. |
| `melis_sb_page_locked` | أقفال الصفحات النشطة (أي مستخدم يحرّر أي صفحة). |
| `melis_core_user_role` | الأدوار المُسمّاة (`urole_id`، `urole_name`، `urole_creation_date`، `urole_rights` بصيغة XML). |

## الخدمات الرئيسية

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `MelisEnginePage` | **تتجاوز** الوحدة خدمة صفحة المحرّك بـ `MelisSBPageService`؛ فعلى مسار معاينة الإصدار تُعيد الشجرة المؤرشفة من `melis_sb_page_versioning`، وإلا فإنها تتصرّف كالخدمة الأصلية. |
| `MelisSBPageCommentService` | تعليقات الصفحة: `getPageComments()` / `setPageComments()`. |

::: warning
بجعل `MelisEnginePage` اسمًا مستعارًا لصنفها الخاص، تستبدل هذه الوحدة خدمة الصفحة الأساسية لكامل
التطبيق طالما كانت مفعّلة. ضع ذلك في الحسبان عند ترتيب الوحدات.
:::

يرسل سير العمل ثلاث رسائل بريد إلكتروني للإدارة الخلفية (`app.emails.php`): `WF_DEMAND` و`WF_VALIDATED`
و`WF_REFUSED` (الوسوم `USER_TO` و`USER_FROM` و`TYPE` و`DETAILS`).

## الملفّات الرئيسية

| المجال | المسار |
| --- | --- |
| تمهيد الوحدة والمستمعات | `src/Module.php`, `src/Listener/` |
| مسارات react-api + العناصر القابلة للاستدعاء | `config/react-api.php` |
| وحدات تحكّم react-api | `src/Controller/MelisReactApi{Role,Workflow,PageVersioning,PageComments,PageLock}Controller.php` |
| مساهمة القدرات | `config/react.capabilities.php` |
| خدمة الصفحة (تجاوز المحرّك) | `src/Service/MelisSBPageService.php` |
| خدمة التعليقات | `src/Service/MelisSBPageCommentService.php` |
| لبنات React (المصدر) | `ui-react/src/` (`brick.tsx`, `UserRolePage.tsx`, `MediaLibraryPage.tsx`, `WorkflowModal.tsx`, `RolesRightsTree.tsx`) |
| الحزمة المبنية | `public/ui-react/brick.js` + `brick.manifest.json` |
| SQL التثبيت | `install/dbdeploy/126618_melis_sb_install.sql` |
