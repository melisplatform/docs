# MelisCmsComments

> نظام تعليقات لمنشورات الأخبار والمدوّنة — الإشراف، وسير عمل اختياري للموافقة على مستوى كل منشور، وإضافة "Post comments" للواجهة الأمامية، وأداة (widget) للوحة التحكم. في الإصدار v6 تكون واجهة الإشراف عبارة عن تبويب **Comments** داخل محرّر الأخبار/المدوّنة المبني على React. الحزمة `melisplatform/melis-cms-comments`.

## الغرض

يُلحِق MelisCmsComments نظام تعليقات بمنشورات **MelisCmsNews** و**MelisCmsBlog**. وهو يوفّر
الواجهة الخلفية للتعليقات (جدول `melis_cms_comments` + `MelisCmsCommentsService`)، وإضافة قوالب
للواجهة الأمامية (قائمة التعليقات + نموذج "leave a comment")، وسير عمل **تحقّق (validation)** على مستوى كل منشور
يُبقي تعليقات الواجهة الأمامية معلّقة إلى أن يوافق عليها المشرف، وأداة **Latest comments** للوحة التحكم.
وبالاقتران مع **MelisCmsUserAccount**، يمكن أن تشترط التعليقات وجود حساب موقع مسجّل الدخول.

في الواجهة الخلفية المبنية على React (`/melis-react`) لا يوفّر هذا الوحدة **أي لبنة (brick) خاصة بها** — لا `ui-react/`،
ولا `react-api.php`، ولا `react.capabilities.php`. فهي وحدة **خلفية + مساهِمة (contribution)** ذات ثلاثة
أسطح مملوكة للمُضيف:

1. **تبويب إشراف على التعليقات** داخل محرّر الأخبار/المدوّنة — واجهة تبويب React ونقاط النهاية `/comments…` الخاصة به
   **مملوكة للبنتَي الأخبار والمدوّنة**، اللتين تفوّضان العمل إلى خدمة هذه الوحدة؛
2. **إضافة صفحة أمامية "Post comments"** يتم إسقاطها وتهيئتها في محرّر صفحات CMS المبني على React؛
3. **أداة لوحة تحكم "Latest comments"** — إضافة لوحة تحكم **قديمة (legacy) بصيغة PHP/phtml** تُعرَض داخل
   مُضيف الأدوات (widget host) في لوحة تحكم React (دون إعادة كتابة بـ React).

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCmsComments',
];
```

تبعيات Composer: `melis-core ^6.0` و`melis-cms ^6.0`. وتتطلّب وظيفيًا وجود وحدة منشورات واحدة على الأقل
— **MelisCmsNews** أو **MelisCmsBlog** — لكي تكون مفيدة. أما **MelisCmsUserAccount** فهي تكامل اختياري
للتعليقات المقيّدة بالحساب. جميع الأسطح مقيّدة بالتفعيل: عندما تكون الوحدة غائبة،
تُعيد نقاط نهاية تعليقات الأخبار/المدوّنة رمز **404** وتُخفي لوحة الإشراف نفسها.

## الخدمات الرئيسية

| اسم الخدمة (alias) | الدور |
| --- | --- |
| `MelisCmsCommentsService` | خدمة CRUD/الإشراف الرئيسية (تمتد من `MelisEngineGeneralService`). تُطلِق زوجَي الأحداث `*_start`/`*_end` عند كل دالة. تستدعيها متحكّمات react-api الخاصة بالأخبار/المدوّنة. |

الدوال الرئيسية في `MelisCmsCommentsService`:

```php
$svc = $sm->get('MelisCmsCommentsService');

// Create or update a comment (BO comments are approved immediately)
$id = $svc->saveComment($text, $postId, $commentId, 'NEWS', $name, $authorId, 'front');

// Fetch a single comment
$comment = $svc->getCommentById($id);

// Front-office list for a post (ordered)
$list = $svc->getCommentsByPostId($postId, 'BLOG', 'mccom_date_creation', 'DESC');

// Back-office query — omit 'validated' to return pending + approved + refused
$rows = $svc->getComments([
    'postType'     => 'NEWS',
    'postId'       => $postId,
    'withUserInfo' => true,
    'limit'        => 10,
]);

// Moderation
$svc->approveComment($id);          // mccom_validated=1, status=1 (shown)
$svc->refuseComment($id);           // mccom_validated=2, status=0 (hidden)
$svc->deleteCommentById($id);

// Cascade-delete when a post is removed
$svc->deletePostComments('NEWS', $postId);
```

تقرأ `saveComment()` علامة `c{type}_validate_comments` الخاصة بالمنشور: فعندما تكون مفعّلة ويأتي التعليق
من الواجهة الأمامية، يُخزَّن على أنه معلّق (`validated=0`)؛ أما تعليقات الواجهة الخلفية فتُخزَّن
على أنها موافَق عليها فورًا. ويمرّ كل نص محفوظ عبر **HTMLPurifier 4.12** لتنقية XSS.

## تبويب إشراف التعليقات (React، مملوك للأخبار/المدوّنة)

افتح مقالًا إخباريًا أو منشور مدوّنة في المحرّر وانتقل إلى تبويب **Comments**. يعرض هذا التبويب
تعليقات هذا المنشور مع **نقطة حالة (status dot)** لكل صف (أزرق = معلّق، أخضر = معروض، أحمر = مرفوض)،
والكاتب، ونص التعليق والوقت، وصندوق مضمّن **Name + write-a-comment + Add a comment** لنشر
تعليق مباشرة، وإجراءات **approve / refuse / delete** لكل صف (لا يظهر approve/refuse إلا عندما
يكون التحقّق مفعّلًا على المنشور).

![تبويب Comments في محرّر الأخبار المبني على React: لوحة COMMENTS تحتوي حقل Name مضمّنًا وصندوق "Write a comment…" وزرًّا أحمر + Add a comment، ثم صف تعليق يتضمّن نقطة حالة ونص التعليق وأيقونتَي refuse/delete](/screenshots/react/melis-cms-comments/meliscmscomments-tooloverride-news-edit-tab-comments.png)

يعود مكوّن تبويب React إلى **لبنتَي الأخبار/المدوّنة**، لا إلى هذه الوحدة. فلا يوجد
**`react-api.php` في MelisCmsComments** — إذ تُعرَض التعليقات عبر react-api الخاص بوحدتَي الأخبار
والمدوّنة، اللتين تفوّضان كل عملية إلى `MelisCmsCommentsService`:

| الدالة والرابط (URL) | متحكّم/إجراء المالك | الغرض |
| --- | --- | --- |
| `GET /melis/react-api/news/:id/comments` | `MelisCmsNewsReactApiController::commentsAction` | كل التعليقات (بجميع الحالات) لمقال إخباري |
| `POST /melis/react-api/news/comments/save` | `commentSaveAction` | إنشاء/تعديل تعليق (BO → موافَق عليه) |
| `POST /melis/react-api/news/comments/approve/:cid` | `commentApproveAction` | الموافقة (`mccom_validated=1`, status=1) |
| `POST /melis/react-api/news/comments/refuse/:cid` | `commentRefuseAction` | الرفض (`mccom_validated=2`, status=0) |
| `POST /melis/react-api/news/comments/delete/:cid` | `commentDeleteAction` | حذف التعليق |
| `GET /melis/react-api/blog/:id/comments` | `MelisCmsBlog…ReactApiController::commentsAction` | كل تعليقات منشور المدوّنة |
| `POST /melis/react-api/blog/comments/{save,approve,refuse,delete}[/:cid]` | إجراءات تعليقات Blog | العمليات نفسها للمدوّنة |

تبني `commentsAction` استعلام `getComments(['postId' => …, 'postType' => 'NEWS'])` دون مفتاح
`validated`، فتُعيد التعليقات **المعلّقة + الموافَق عليها + المرفوضة**. ويُعيد كل إجراء رمز **404
عندما تكون الوحدة غير متاحة**؛ والعقد (contract) هو `{ success, data|error }`.

```ts
// list a post's comments (all statuses)
const res = await fetch(`/melis/react-api/news/${idNews}/comments`, {
  credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
}).then(r => r.json());          // → { success: true, data: [ { …comment… } ] }

// approve one
await fetch(`/melis/react-api/news/comments/approve/${commentId}`, {
  method: 'POST', credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});
```

أما المتحكّم القديم `MelisCmsCommentsTabController` (getComments / save / approve / refuse / delete،
المحمي بـ `hasAccess('meliscms_page')`) فما زال مستخدَمًا في المسار الكلاسيكي/iframe — راجع
[التوثيق القديم](/legacy/reference/modules/melis-cms-comments).

## إضافة الصفحة الأمامية "Post comments"

`Controller\Plugin\MelisCmsCommentsPlugin` هي `MelisTemplatingPlugin` (مفتاح التهيئة `meliscmscomments`،
القسم **MelisCms**، التهيئة في `config/plugins/MelisCmsCommentsPlugin.config.php`). في لوحة **PLUGINS**
لمحرّر صفحات CMS المبني على React، وتحت **Melis Cms Comments**، اسحب **Post comments** إلى منطقة إسقاط
في قالب صفحة أخبار/مدوّنة.

![محرّر صفحات CMS مع لوحة PLUGINS: مجموعة Melis Cms Comments موسّعة لإظهار إضافة Post comments وقد سُحبت إلى DRAG & DROP ZONE؛ ويُظهر النموذج الأمامي المعروض حقل Name وصندوق "Add a comment:" وزرًّا أحمر Submit](/screenshots/react/melis-cms-comments/meliscmscomments-page-plugin-postcomments-menu-selector.png)

- تختار **نافذة الإعدادات (Settings modal)** كلًّا من **Template** (الافتراضي `MelisCmsComments/comments`) و**Post Type**
  (NEWS / BLOG)، ويُحفَظان في XML الخاص بإضافة الصفحة على شكل `template_path` و`mccplugin_post_type` و
  `registration_page_page_id` (للتعليقات المقيّدة بالحساب عبر MelisCmsUserAccount).

![نافذة إعدادات إضافة Post comments: قائمة اختيار Template (MelisCmsComments/comments) وقائمة اختيار Post Type (News / Blog)، مع زرَّي Cancel / Apply؛ وتُحفَظ هذه الإعدادات في XML الخاص بإضافة الصفحة](/screenshots/react/melis-cms-comments/meliscmscomments-page-plugin-postcomments-config-settings.png)

- **العرض الأمامي** (`front()`) يحدّد المنشور من معامل الاستعلام `newsId` / `blogId`، ويحمّل
  التعليقات عبر `getCommentsByPostId()`، ويبني نموذج إضافة التعليق (Name + comment + Submit).
  وعندما يشترط المنشور وجود حساب، يُطلِق `melis_cms_user_account_login_form` لتضمين إضافة
  تسجيل الدخول.
- العرض الافتراضي `MelisCmsComments/comments`؛ الأصول (assets) `plugins/css/commentsPlugin.css` و
  `plugins/js/commentsPlugin.js`.

## أداة لوحة التحكم "Latest comments" (قديمة)

`Controller\DashboardPlugins\MelisCmsCommentsLatestCommentsPlugin` تمتد من
`MelisCoreDashboardTemplatingPlugin`؛ وتُعيد دالّتها `latestCommentsAction()` كائن `ViewModel` من Laminas
(القالب `melis-cms-comments/dashboard/latest-comments`، وهو ملف `.phtml`)، مُسجَّلًا في
`config/dashboard-plugins/dashboard.config.php` (معرّف الإضافة `MelisCmsCommentsLatest`). ويعرض
**مُضيف الأدوات (widget host)** في لوحة تحكم React هذه الإضافة القديمة كما هي — **دون إعادة كتابة بـ React**.
وهي تسرد أحدث التعليقات لكل نوع منشور (تبويبا Blog / News) مع مرشّحات **All sites / All users / limit**،
وتُظهر لكل تعليق الكاتب، وشارة الحالة، وعنوان المنشور والتاريخ. أما مرشّحات الموقع/المستخدم
وإعادة تحميل المنطقة فيخدمها `MelisCmsCommentsViewHelperController::listAction`
(`melis-cms-comments/dashboard/list`، المنطقة `dashboard_latest_comments_list`).

![أداة Latest comments في لوحة تحكم React: تبويب "Blog comments" مع محدّدات All sites وAll users وlimit، ثم قائمة بالتعليقات الحديثة (الكاتب + شارة معرّف المستخدم + شارة عين خضراء "shown"، وعنوان المنشور بين قوسين، ونص التعليق، و"on: date")](/screenshots/react/melis-cms-comments/meliscmscomments-dashboardplugins-latestcomments.png)

## جداول قاعدة البيانات

| الجدول | يحفظ |
| --- | --- |
| `melis_cms_comments` | كل التعليقات: `mccom_id`, `mccom_post_id`, `mccom_type` (NEWS/BLOG), `mccom_comment_text`, `mccom_name`, `mccom_validated`, `mccom_status`, `mccom_date_creation`, `mccom_author_account`. |

يُضاف عمودان تلقائيًا إلى جداول وحدات المنشورات عند الإقلاع (bootstrap) (دون الحاجة إلى تغيير المخطط هناك):

| العمود | الجدول | الغرض |
| --- | --- | --- |
| `cnews_validate_comments` | `melis_cms_news` | علامة "Validate comments" على مستوى كل منشور للأخبار. |
| `cblog_validate_comments` | `melis_cms_blog` | علامة "Validate comments" على مستوى كل منشور للمدوّنة. |

**نموذج الحالة.** `mccom_validated`: `0` = جديد/معلّق (أزرق)، `1` = موافَق عليه/معروض (أخضر)،
`2` = مرفوض/مخفي (أحمر). ويعكس `mccom_status` ظهور الموقع (`1` معروض / `0` مخفي).

## المستمِعات (Listeners) والربط بين الوحدات

مُلحَقة في `Module.php` عند الإقلاع:

| المستمِع | الحدث | الغرض |
| --- | --- | --- |
| `MelisCmsCommentsFlashMessengerListener` | `melis_cms_comments_flash_messenger` | ملاحظات flash-messenger وسجلّ النشاط (`CMS_COMMENT_ADD / UPDATE / DELETE`). |
| `MelisCmsCommentsSaveValidateCommentListener` | `meliscmsnews_get_postvalues` | يحفظ `cnews_validate_comments` عند حفظ منشور إخباري. |
| `MelisCmsCommentsGdprAutoDeleteActionDeleteListener` | `melis_cms_user_account_gdpr_auto_delete_action_delete` | GDPR: يضبط `mccom_author_account` على null لحساب محذوف، ثم يعيد إطلاق حدث GDPR الخاص بالوحدة. |

تتحقّق `Module::addValidateCommentsField()` (إقلاع الواجهة الخلفية) من وحدات المنشورات النشطة
وتضيف العمود `c{news,blog}_validate_comments` إلى جداولها إن كان مفقودًا.

## الملفات الرئيسية

| الموضوع | المسار |
| --- | --- |
| تهيئة الوحدة (الخدمات، المتحكّمات، الإضافات) | `vendor/melisplatform/melis-cms-comments/config/module.config.php` |
| تهيئة الإضافة الأمامية | `vendor/melisplatform/melis-cms-comments/config/plugins/MelisCmsCommentsPlugin.config.php` |
| تهيئة إضافة لوحة التحكم | `vendor/melisplatform/melis-cms-comments/config/dashboard-plugins/dashboard.config.php` |
| الخدمة الرئيسية | `vendor/melisplatform/melis-cms-comments/src/Service/MelisCmsCommentsService.php` |
| متحكّم التبويب القديم | `vendor/melisplatform/melis-cms-comments/src/Controller/MelisCmsCommentsTabController.php` |
| إضافة قوالب الواجهة الأمامية | `vendor/melisplatform/melis-cms-comments/src/Controller/Plugin/MelisCmsCommentsPlugin.php` |
| أداة لوحة التحكم | `vendor/melisplatform/melis-cms-comments/src/Controller/DashboardPlugins/MelisCmsCommentsLatestCommentsPlugin.php` |
| المستمِعات | `vendor/melisplatform/melis-cms-comments/src/Listener/` |
| نموذج قاعدة البيانات / بوّابة الجدول | `vendor/melisplatform/melis-cms-comments/src/Model/Tables/MelisCmsCommentsTable.php` |
| الإقلاع / حقن الأعمدة | `vendor/melisplatform/melis-cms-comments/src/Module.php` |
| HTMLPurifier (مضمّن) | `vendor/melisplatform/melis-cms-comments/library/htmlpurifier-4.12.0/` |

> واجهة تبويب Comments المبنية على React ونقاط النهاية `/comments…` الخاصة به تقع في لبنتَي الأخبار/المدوّنة
> (`MelisCmsNewsReactApiController`, `MelisCmsBlog…ReactApiController`)؛ وكلتاهما تفوّضان إلى
> `MelisCmsCommentsService`. أما نموذج البيانات والخدمة والأداة الكلاسيكية:
> [التوثيق القديم](/legacy/reference/modules/melis-cms-comments).

راجع أيضًا: [MelisCmsNews](/ar/reference/modules/melis-cms-news) · [MelisCmsBlog](/ar/reference/modules/melis-cms-blog) · [MelisCms](/ar/reference/modules/melis-cms) · [MelisEngine](/ar/reference/modules/melis-engine) · [MelisCore](/ar/reference/modules/melis-core)
