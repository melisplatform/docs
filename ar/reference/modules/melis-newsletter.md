# MelisNewsletter

> يحوّل صفحة CMS إلى نشرة بريدية مخصّصة ويسلّمها إلى مجموعات المشتركين، وهو الآن مُدار من واجهة إدارة خلفية أصلية مبنية على React. الحزمة `melisplatform/melis-newsletter`.

## الغرض

يعيد MelisNewsletter استخدام نظام صفحات CMS بوصفه قالب النشرة البريدية: تُعرض الصفحة المُعلَّمة بالنوع
**NEWSLETTER** بصيغة HTML، وتُخصَّص لكل مستلِم عبر رموز BB (`[NAME]`،
`[FIRSTNAME]`، `[EMAIL]`، `[UNSUBSCRIBELINK]`)، ثم تُرسَل إلى المشتركين و/أو المجموعات المحدَّدة
عبر ناقل بريد قابل للتهيئة. يُنظَّم المشتركون في قائمة خاصة بكل موقع ويمكن
تقسيمهم إلى مجموعات. تُؤرشَف كل عملية إرسال بلقطة HTML كاملة وسجلّ لكل مستلِم؛
ويتضمّن المنتج جاهزًا إضافة إلغاء الاشتراك في الواجهة الأمامية وتكاملًا كاملًا مع اللائحة العامة لحماية البيانات (GDPR).

في الإصدار v6 تُشحن الأداة بوصفها **قالبًا (brick) أصليًا مبنيًا بالكامل على React** ضمن واجهة الإدارة الخلفية `/melis-react`. أما منطق العمل
(الخدمات، آلية الإرسال، GDPR، الجداول) فبقي دون تغيير؛ وانتقلت طبقة العرض وحدها إلى React،
مُقدَّمة عبر طبقة JSON من نوع `react-api` تعرضها الوحدة.

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisNewsletter',
];
```

تتطلّب `melis-core` و`melis-cms`؛ وتعتمد وظيفيًا أيضًا على `melis-engine` و`melis-front`
لعرض الصفحة وإضافة إلغاء الاشتراك. تظهر أداة React في القائمة **فقط عند تفعيل
الوحدة** (اكتشاف القوالب النمطية عبر `GET /melis/react-api/react-modules`). وإزالة
`MelisNewsletter` من `melis.module.load.php` تُخفي القالب (brick).

## واجهة الإدارة الخلفية (React)

الشريط الجانبي الأيسر ← **MelisMarketing ← Newsletter** (`fa fa-newspaper-o`)، ومسار التركيب
`/melis-marketing/melis-newsletter-tool-config`. تُفتح بوصفها أداة واحدة يحمل ترويستها
العنوان *Newsletters*، والعنوان الفرعي *"Subscribers, groups, history and send configuration"* ومفتاح تبديل
**New / Old** (أعلى اليمين). و*New* هي واجهة React (الافتراضية)؛ أما *Old* فتعرض الأداة القديمة داخل
إطار iframe (`/melis/react-tool-page?key=melis_newsletter_tool_display`).

بخلاف الأداة ذات التبويبات الفرعية المستضافة، تعرض Newsletter شاشاتها الأربع بوصفها **تبويبات React خاصة بها**:

| التبويب | المحتوى |
| --- | --- |
| Subscribers | بطاقات مؤشرات الأداء (Total / Active / Inactive)، بحث، مرشِّحات الحالة + الموقع، مدير الأعمدة، **Import** من CSV، **Export**، **Add selection to group(s)**، **+ New subscriber**. الجدول: Status / Email / First name / Last name / Site / Groups مع تحرير/حذف لكل صف |
| Groups | بطاقات مؤشرات الأداء، بحث، مرشِّح الحالة، Export، **+ New group**. الجدول: Status / Name / Created / Members (العدد) مع تحرير/حذف |
| History | أرشيف للقراءة فقط. بطاقات مؤشرات الأداء (Sends / Sites / Today)، بحث، مرشِّح الموقع، Export. الجدول: Page / Site / Version / Sent on مع أيقونة **عين** لكل صف لعرض HTML المؤرشَف بدقّة |
| Configuration | تهيئة **Transport configuration** العالمية الوحيدة لـ SMTP: Host / Username / Password (+ تأكيد). الحقل الفارغ = ناقل Melis الافتراضي |

![تبويب Subscribers في أداة Newsletter المبنية على React](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-subscribers.png)

فتح أو إنشاء **مشترك** أو **مجموعة** لا يفتح تبويبًا رئيسيًا جديدًا — بل يفتح محرّر السجل
(SubscriberForm / GroupForm) في **تبويب فرعي مستضاف** أصلي (تنقّل تفصيلي، بمفتاح `s-<id>` /
`g-<id>`). يحتوي نموذج المشترك على الاسم الأول/الأخير والبريد الإلكتروني والموقع ومفتاح تبديل Active
والعضويات في المجموعات؛ ويحتوي نموذج المجموعة على الاسم ومفتاح تبديل Active وأعضاء المجموعة (إضافة/إزالة +
منتقي المشتركين).

![تبويب Groups في أداة Newsletter المبنية على React](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-groups.png)

![تبويب History في أداة Newsletter المبنية على React](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-history.png)

![تبويب Configuration في أداة Newsletter المبنية على React](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-config.png)

لأغراض الأمان، **لا تُعاد كلمة مرور SMTP المخزّنة إلى المتصفّح مطلقًا** — إذ تعرض الحقول
عنصرًا نائبًا مُقنَّعًا، وتركها فارغة عند الحفظ يُبقي كلمة المرور الحالية.

### إرسال نشرة بريدية

إجراء **Send** ليس تبويبًا. بل هو نافذة منبثقة (`NewsletterSendModal`) معروضة عبر
`window.__melisNewsletterSendModal`، **يعرضها محرّر صفحات React** للصفحات من النوع
**NEWSLETTER**. حدِّد موضوعًا، واختر مجموعات و/أو مشتركين، ونفِّذ **Test** إلى مشترك مختار أو
عنوان بريد إلكتروني حرّ أولًا، ثم **Send**. عند النجاح يُطلِق حدث `melis:newsletter-sent` كي
يتحدّث تبويب History الدائم. متغيّرات التخصيص في المحتوى: `[NAME]`، `[FIRSTNAME]`،
`[EMAIL]`، `[UNSUBSCRIBELINK]`. انشُر الصفحة قبل الإرسال.

## واجهة React البرمجية (React API)

توجد المسارات في `config/react-api.php` (مدمجة عبر `MelisNewsletter\Module::getConfig()`)، وتُقدَّم بوصفها
مسارات فرعية لجسر `melis-react-api` العام تحت `/melis/react-api/newsletter`. المتحكِّم
`MelisNewsletter\Controller\MelisReactApiNewsletterController`؛ وعقد JSON هو `{ success, data, error }`؛
ويحمل كل طلب `X-Requested-With: XMLHttpRequest` + بيانات الاعتماد. نقاط نهاية مختارة:

| الطريقة والعنوان (بالنسبة إلى `/melis/react-api/newsletter`) | الغرض |
| --- | --- |
| `GET /subscribers` · `/subscribers/stats` · `/subscribers/:id` | قائمة بمفتاح keyset (`search`، `active`، `site`، `group`، `sort`، `dir`، `after`)، مؤشر الأداء، سجلّ واحد |
| `POST /subscribers/save` · `/subscribers/import` | إنشاء/تحديث؛ استيراد مجمّع من CSV ← `{imported,skipped,errors}` |
| `DELETE /subscribers/delete/:id` | حذف |
| `GET /groups` · `/groups/stats` · `/groups/:id` · `/groups/:id/members` | قائمة المجموعات، مؤشر الأداء، السجلّ، الأعضاء |
| `POST /groups/save` · `/groups/:id/members/add` · `/groups/members/bulk-add` | حفظ؛ إضافة عضو؛ إسناد مجمّع لـ `subscriberIds[]` إلى `groupIds[]` |
| `DELETE /groups/delete/:id` · `/groups/members/remove/:mid` | حذف مجموعة؛ إزالة عضوية (`mid` = `nlgu_id`) |
| `GET /history` · `/history/stats` · `/history/:id` | قائمة أرشيف الإرسال، مؤشر الأداء، HTML المؤرشَف لعملية إرسال واحدة |
| `GET /config` · `POST /config/save` | تهيئة SMTP (كلمة المرور لا تُعاد؛ فقط `hasPassword`) / حفظ |
| `GET /send-options` · `POST /send` · `POST /test` | خيارات نافذة الإرسال؛ الإرسال؛ الإرسال التجريبي |

يعيد متحكِّم React **استخدام خدمة Laminas الخاصة بالوحدة** (`MelisNewsletterService`) للعمليات
الثقيلة — إذ يمرّ الإرسال/الاختبار عبر `sendNewsletter()` / `testNewsletter()` / `testNewsletterCustomMail()`،
وتعكس عمليات التحقّق `saveSubscriber` / `importFileValidator` / `saveConfig` — بحيث يعيد مسار React
إنتاج قواعد العمل القديمة نفسها بدقّة.

## القدرات (الحقوق المتقدّمة)

مُعلَنة في `config/react.capabilities.php` تحت العقدة الحاملة للحقوق
**`melis_newsletter_tools_section`** (وليس مفتاح البيان/المنطقة `melis_newsletter_tool_display`). شجرة
لكل تبويب مع إجراء `send` واحد مشترك بين التبويبات، مُسطَّحة إلى سلاسل بنقاط:

```
melis_newsletter_tools_section
├─ action: send                              (Send / Test — the page-editor modal)
├─ tab subscribers: list · create · edit · delete · export
├─ tab groups:      list · create · edit · delete · export
├─ tab history:     list                     (read-only)
└─ tab config:      edit                     (SMTP transport)
```

يقرأها React عبر `useCaps('melis_newsletter_tools_section').can('…')` ويتحكّم في إظهار أزرار
الإجراءات؛ وعلى جانب الخادم يُحرَس كل إجراء مُعدِّل (`denyUnlessAccess()` ثم `denyUnlessCan()`).
كما يدمج `react.capabilities.php` إجراء `newsletter` تحت العقدة المشتركة `meliscms_page` بحيث
يصبح زرّ Send في محرّر الصفحات قابلًا للتحكّم في Users ← Rights.

## الخدمات الرئيسية

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `MelisNewsletterService` | الخدمة المركزية للمشتركين والمجموعات والإرسال/الاختبار والأرشفة والتهيئة. تُطلِق أحداث `*_start` / `*_end`. |
| `MelisNewsletterGdprAutoDeleteService` | يُنفِّذ `MelisCoreGdprAutoDeleteInterface`؛ يقود سير عمل التحذير/الحذف المجدول لـ GDPR للمشتركين الراكدين. |

الأسماء المستعارة لبوابات الجداول (table gateway): `MelisNewsletterSubscribersTable`، `MelisNewsletterGroupsTable`،
`MelisNewsletterGroupsPeopleTable`، `MelisNewsletterArchiveTable`،
`MelisNewsletterRecipientsTable`، `MelisNewsletterConfigTable`.

## آلية الإرسال

`MelisNewsletterService::sendNewsletter($pageId, $subscribers, $groups, $mailSubject)`:

1. **تحديد المستلمين** — المشتركون الصريحون + أعضاء المجموعات عبر `getSubscribersInGroup()`،
   مُرشَّحون إلى النشِطين فقط، ومُزال منهم التكرار.
2. **عرض المحتوى** — تُجلَب صفحة CMS بصيغة HTML؛ وتُعاد كتابة `href`/`src` النسبية إلى عناوين URL مطلقة.
3. **التخصيص** — تُستبدَل رموز BB لكل مستلِم؛ ويحمل `[UNSUBSCRIBELINK]` الرمز المُجزّأ (hashed token).
4. **الإرسال** — عبر ناقل SMTP المُهيّأ أو الافتراضي للمنصّة.
5. **الأرشفة** — صفّ `nlan_*` واحد لكل عملية إرسال (الموقع، الصفحة، الإصدار، HTML كامل، تاريخ الإرسال) وصفّ
   `nlus_*` واحد لكل مستلِم.

**الإرسال التجريبي** (`testNewsletter()` / `testNewsletterCustomMail()`) يسلّم إلى مشترك واحد أو
بريد إلكتروني عشوائي دون أرشفة، وهو مطلوب قبل أن يُفتَح الإرسال الحقيقي.

## الواجهة الأمامية

| الإضافة | مفتاح التهيئة | الوصف |
| --- | --- | --- |
| `MelisNewsletterUnsubscribePlugin` | `melisnewsletter` / `MelisNewsletterUnsubscribePlugin` | ضَعها على صفحة `unsubscribe`. تقرأ الرمز `?s={hashed_id}` المُضمَّن في `[UNSUBSCRIBELINK]`، وتستدعي `deactivateSubscriberById()`، وتعرض رسالة نجاح/فشل. تعرض إعداد `unsubscribe_data_salt` المستخدَم في تجزئة الرمز. |

العروض: `plugins/unsubscribe.phtml` + `unsubscribe-modal-form.phtml`.

## تكامل GDPR

يربط إطار GDPR الخاص بـ MelisCore لكلٍّ من السير عند الطلب والمجدول:

- **عند الطلب:** يعثر كلٌّ من `MelisNewsletterGdprUserInfoListener` و`…UserExtractListener` و`…UserDeleteListener`
  على بيانات مشترك شخص ما ويصدّرها ويحذفها عند الطلب. الأعمدة: `nlu_firstname`، `nlu_name`،
  `nlu_email`، `nlu_date_creation` (مُعلَنة في `config/app.gdpr.php`).
- **الحذف التلقائي المجدول:** `MelisNewsletterGdprAutoDeleteService` مع تسعة مستمعين يغطّون تسجيل الوحدة،
  وإعلان وسم GDPR، وبناء قائمة التحذير، ورسائل التحذير، والحذف النهائي
  للمشتركين غير النشطين الذين لا يستجيبون.

## جداول قاعدة البيانات

| الجدول (الاسم المستعار ← بادئة الأعمدة) | يحتوي |
| --- | --- |
| `MelisNewsletterSubscribersTable` (`nlu_*`) | صفوف المشتركين لكل موقع: البريد الإلكتروني، الاسم الأول/الأخير، الحالة، تاريخ الإنشاء |
| `MelisNewsletterGroupsTable` (`nlg_*`) | تعريفات المجموعات: الاسم، الحالة، تاريخ الإنشاء |
| `MelisNewsletterGroupsPeopleTable` (`nlgu_*`) | رابط العضوية بين المشترك ↔ المجموعة |
| `MelisNewsletterArchiveTable` (`nlan_*`) | أرشيف لكل إرسال: الموقع، الصفحة، الإصدار، جسم HTML الكامل، تاريخ الإرسال |
| `MelisNewsletterRecipientsTable` (`nlus_*`) | سجلّ الإرسال لكل مستلِم: لقطة الاسم/الاسم الأول/البريد الإلكتروني، مفتاح خارجي للأرشيف |
| `MelisNewsletterConfigTable` (`nlc_*`) | تهيئة ناقل SMTP لكل موقع: المضيف، اسم المستخدم، كلمة المرور |

## مثال

```php
$nl = $serviceManager->get('MelisNewsletterService');

// Subscriber / group management (same service the react-api reuses)
$nl->saveSubscriber($data, $id);           // $id null → create
$nl->deactivateSubscriberById($id);
$nl->saveGroup($data, $id);
$nl->getSubscribersInGroup($grpId);

// Send flow
$nl->testNewsletter($pageId, $subId, $subject);
$nl->sendNewsletter($pageId, $subscribers, $groups, $subject);

// History & config
$nl->getNewsletterRecipients($archiveId);
$nl->saveNewsletterConfig($cfg);
```

## الملفات الرئيسية

| المجال | المسار |
| --- | --- |
| مسارات React API + المتحكِّم القابل للاستدعاء | `vendor/melisplatform/melis-newsletter/config/react-api.php` |
| قدرات React (بمفتاح `melis_newsletter_tools_section`) | `vendor/melisplatform/melis-newsletter/config/react.capabilities.php` |
| متحكِّم React API (يعيد استخدام `MelisNewsletterService`) | `vendor/melisplatform/melis-newsletter/src/Controller/MelisReactApiNewsletterController.php` |
| قالب React (بناء Vite) + البيان | `vendor/melisplatform/melis-newsletter/public/ui-react/brick.js` · `brick.manifest.json` |
| تهيئة الوحدة (الخدمات، بوابات الجداول، المتحكِّمات، الإضافة) | `vendor/melisplatform/melis-newsletter/config/module.config.php` |
| الخدمة الرئيسية | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterService.php` |
| خدمة الحذف التلقائي لـ GDPR | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterGdprAutoDeleteService.php` |
| إضافة إلغاء الاشتراك في الواجهة الأمامية | `vendor/melisplatform/melis-newsletter/src/Controller/Plugin/MelisNewsletterUnsubscribePlugin.php` |
| بوابات الجداول | `vendor/melisplatform/melis-newsletter/src/Model/Tables/` |
| تثبيت قاعدة البيانات + الترحيلات | `vendor/melisplatform/melis-newsletter/install/dbdeploy/` |

انظر أيضًا: [melis-core](/legacy/reference/modules/melis-core)، [melis-cms](/legacy/reference/modules/melis-cms)،
[melis-front](/legacy/reference/modules/melis-front)، [melis-engine](/legacy/reference/modules/melis-engine)
