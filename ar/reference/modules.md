# مرجع الوحدات

منصة Melis عبارة عن مجموعة من حزم Composer باسم `melisplatform/*`. هذا مخطط لـ **50 وحدة** تُشحن مع هيكل الإصدار v6، مُصنّفة حسب المجال. كل وحدة منها هي وحدة Laminas قياسية موجودة ضمن `vendor/melisplatform/`.

يحتفظ الإصدار v6 من Melis بنفس إطار العمل والوحدات الموجودة في v5، لكنه **يستبدل الواجهة الإدارية بواجهة React** تُقدَّم على المسار `/melis-react`. أصبحت الأدوات الآن **"لبنات" (bricks)** أصيلة مبنية بـ React — واجهات React قائمة بذاتها تشحنها الوحدة ويكتشفها القالب عند الإقلاع — مع مفتاح تبديل **جديد (React) / قديم (iframe)** بحيث تستمر أي أداة لم تُعَد كتابتها في العمل كصفحتها القديمة القائمة على jQuery/AJAX داخل القالب. وتتوفر طبقة **مساعد الذكاء الاصطناعي** العائمة في كل مكان. تُقدَّم هذه الطبقة عبر وحدتين للبنية التحتية: [`melis-react-api`](/ar/reference/modules/melis-react-api) (العمود الفقري لواجهة JSON API — المستخدم، القائمة، الأصول، اكتشاف اللبنات، بيانات لوحة التحكم، محلّل القدرات) و[`melis-react-override`](/ar/reference/modules/melis-react-override) (مسار قالب الـ SPA بالإضافة إلى آلية iframe للأدوات القديمة). راجع [دليل البنية المعمارية](/ar/guide/architecture) لمعرفة كيفية تكامل ذلك كله معًا.

::: tip صفحة واحدة لكل وحدة
لكل وحدة أيضًا **صفحة مرجعية مخصّصة** (الغرض، الخدمات الرئيسية، الأدوات، الإضافات، الجداول، الملفات الرئيسية) — افتح قسم **الوحدات (Modules)** في الشريط الجانبي، على سبيل المثال
[MelisCms](/ar/reference/modules/melis-cms) و[MelisCommerce](/ar/reference/modules/melis-commerce) و[MelisAIEngine](/ar/reference/modules/melis-ai-engine).
:::

## النواة والمنصة

| الوحدة | الدور |
| --- | --- |
| [`melis-core`](/ar/reference/modules/melis-core) | نواة المنصة: قالب الواجهة الإدارية، وشجرة الإعدادات (`MelisCoreConfig`)، والمصادقة، والصلاحيات، والمستخدمون، والخدمات والأحداث. لم تتغير في v6 — فقط القالب الذي تشغّله أصبح يُعرَض الآن بواسطة React. |
| [`melis-asset-manager`](/ar/reference/modules/melis-asset-manager) | يقدّم أصول `public/` الخاصة بكل وحدة (CSS/JS/الصور) عبر روابط نظيفة ويسلّم الحزم المُجمّعة. |
| [`melis-cache-internal`](/ar/reference/modules/melis-cache-internal) | تخزين مؤقت HTTP للصفحة الكاملة للواجهة الأمامية لنظام إدارة المحتوى، مع تخزين مؤقت جزئي (للمناطق) واستثناءات لكل صفحة. |
| [`melis-composerdeploy`](/ar/reference/modules/melis-composerdeploy) | يدمج Composer لتثبيت الوحدات وتحديثها وإزالتها برمجيًا. |
| [`melis-dbdeploy`](/ar/reference/modules/melis-dbdeploy) | مُشغّل ترحيل قواعد البيانات بلا واجهة — يطبّق فوارق SQL لكل وحدة بالترتيب. |
| [`melis-marketplace`](/ar/reference/modules/melis-marketplace) | متجر وحدات داخل الواجهة الإدارية لاكتشاف الوحدات وتنزيلها وتحديثها وإزالتها. |
| [`melis-phpinfo`](/ar/reference/modules/melis-phpinfo) | أداة تشخيصية للقراءة فقط تعرض دالة `phpinfo()` الأصلية في PHP داخل واجهة React الإدارية. |
| [`melis-sql`](/ar/reference/modules/melis-sql) | مُشغّل استعلامات SQL للقراءة فقط في أدوات المطوّرين (Dev Tools)، مشحون كلبنة React أصيلة كاملة. |
| [`melis-react-api`](/ar/reference/modules/melis-react-api) | العمود الفقري لواجهة JSON API الخاصة بواجهة React الإدارية — يُقلع القالب ويستضيف محلّل القدرات. |
| [`melis-react-override`](/ar/reference/modules/melis-react-override) | بنية React التحتية — تعرض الأدوات القديمة داخل قالب `/melis-react` وتقدّم تطبيق React أحادي الصفحة (SPA). |

## نظام إدارة المحتوى والواجهة الأمامية

| الوحدة | الدور |
| --- | --- |
| [`melis-cms`](/ar/reference/modules/melis-cms) | الواجهة الإدارية لنظام إدارة المحتوى — المواقع، وشجرة الصفحات، ومحرّر الصفحات، والقوالب، والأنماط، وتحسين محركات البحث (SEO)، كواجهة React إدارية. |
| [`melis-engine`](/ar/reference/modules/melis-engine) | الأساس المشترك لبيانات نظام إدارة المحتوى — نموذج الصفحة، والمواقع، واللغات، والصنف الأساسي لإضافات القوالب، وذاكرة التخزين المؤقت للعرض. |
| [`melis-front`](/ar/reference/modules/melis-front) | نظام عرض الواجهة الأمامية — يحوّل عنوان URL إلى صفحة مكتملة ويشحن كتل المحتوى (إضافات الصفحة). |
| [`melis-demo-cms`](/ar/reference/modules/melis-demo-cms) | موقع الويب المرجعي/التجريبي الرسمي — **وحدة موقع** جاهزة للتثبيت. |
| [`melis-cms-blog`](/ar/reference/modules/melis-cms-blog) | نظام مدوّنات بواجهة React إدارية أصيلة وثلاث إضافات عرض للواجهة الأمامية. |
| [`melis-cms-comments`](/ar/reference/modules/melis-cms-comments) | نظام تعليقات للأخبار والمدوّنات — الإشراف، وسير عمل الموافقة، وإضافة للواجهة الأمامية؛ وتبويب "التعليقات" في المحرّر. |
| [`melis-cms-news`](/ar/reference/modules/melis-cms-news) | نظام أخبار/مدوّنات بأداة تأليف مبنية بـ React وثلاث إضافات عرض للواجهة الأمامية. |
| [`melis-cms-prospects`](/ar/reference/modules/melis-cms-prospects) | إدارة العملاء المحتملين/جهات الاتصال — نموذج في الواجهة الأمامية يلتقط الرسائل؛ وأداة React لتصفّحها وفلترتها وتصديرها وتصنيفها. |
| [`melis-cms-slider`](/ar/reference/modules/melis-cms-slider) | مدير شرائح/عرض دوّار (لبنة React أصيلة) مع إضافة قوالب للواجهة الأمامية. |
| [`melis-cms-category2`](/ar/reference/modules/melis-cms-category2) | فئات محتوى متعددة المواقع ومتعددة اللغات، مع واجهة React إدارية أصيلة. |
| [`melis-cms-mcq`](/ar/reference/modules/melis-cms-mcq) | مُنشئ اختبارات (MCQ) في الواجهة الإدارية، أصبح الآن أداة React أصيلة كاملة. |
| [`melis-cms-mcq-engine`](/ar/reference/modules/melis-cms-mcq-engine) | البيانات والتقييم وعارض الواجهة الأمامية خلف أداة MCQ المبنية بـ React. |
| [`melis-cms-page-historic`](/ar/reference/modules/melis-cms-page-historic) | سجل تدقيق لتحرير الصفحات — تبويب "السجل التاريخي" في محرّر صفحات React بالإضافة إلى أداة (widget) في لوحة التحكم. |
| [`melis-cms-page-analytics`](/ar/reference/modules/melis-cms-page-analytics) | تحليلات أساسية لزيارات الصفحات، قابلة للتوسّع عبر مزوّد (مثل Google Analytics). |
| [`melis-cms-page-script-editor`](/ar/reference/modules/melis-cms-page-script-editor) | حقن `<script>`/`<style>`/HTML مخصّص لكل صفحة أو لكل موقع (تحليلات، بكسلات، أدوات مصغّرة). |
| [`melis-cms-share`](/ar/reference/modules/melis-cms-share) | يحقن وسوم مشاركة وسائل التواصل الاجتماعي / وسوم Open Graph الوصفية، تُدار من واجهة React إدارية أصيلة. |
| [`melis-cms-site-robot`](/ar/reference/modules/melis-cms-site-robot) | تحرير ملف `robots.txt` لكل نطاق وتقديمه ديناميكيًا، بواجهة React أصيلة كاملة إدارية. |
| [`melis-cms-tags`](/ar/reference/modules/melis-cms-tags) | نظام وسوم/تصنيف مشترك تعلّق عليه وحدات المحتوى عناصرها، أصبح الآن بواجهة React إدارية أصيلة. |
| [`melis-cms-user-account`](/ar/reference/modules/melis-cms-user-account) | نظام حسابات الزوار للواجهة الأمامية — التسجيل، وتسجيل الدخول، والملفات الشخصية لكل موقع، يُدار من أداة React. |
| [`melis-cms-google-analytics`](/ar/reference/modules/melis-cms-google-analytics) | مزوّد GA4 يعرض منحنيات الجلسات، وإجماليات مؤشرات الأداء الرئيسية (KPI)، والبيانات الديموغرافية في واجهة React الإدارية. |
| [`melis-cms-link-check`](/ar/reference/modules/melis-cms-link-check) | أداة اختبار الروابط تزحف عبر صفحة (والصفحات الفرعية اختياريًا) وتسجّل كل رابط معطوب. |

## التجارة الإلكترونية

| الوحدة | الدور |
| --- | --- |
| [`melis-commerce`](/ar/reference/modules/melis-commerce) | إطار عمل كامل للتجارة الإلكترونية — الكتالوج، والعملاء، والسلة/الدفع/الطلبات، والقسائم، والشحن، وتحسين محركات البحث — بواجهة React إدارية. |
| [`melis-commerce-order-invoice`](/ar/reference/modules/melis-commerce-order-invoice) | يضيف توليد فواتير الطلبات بصيغة PDF، تظهر داخل أداة الطلبات المبنية بـ React. |
| [`melis-commerce-group-discount-per-category`](/ar/reference/modules/melis-commerce-group-discount-per-category) | خصم سعري لكل فئة (حسب الدولة ومجموعة العملاء) كتبويب في أداة الكتالوجات المبنية بـ React. |

## التوسيع والأدوات المساعدة

| الوحدة | الدور |
| --- | --- |
| [`melis-templating-plugin-creator`](/ar/reference/modules/melis-templating-plugin-creator) | معالج في الواجهة الإدارية يولّد هيكل **إضافة قوالب** كاملة للواجهة الأمامية. |
| [`melis-dashboard-plugin-creator`](/ar/reference/modules/melis-dashboard-plugin-creator) | معالج يولّد هيكل **إضافة لوحة تحكم** جديدة (أداة مصغّرة) للواجهة الإدارية، كلبنة React أصيلة. |
| [`melis-calendar`](/ar/reference/modules/melis-calendar) | أداة جدولة بتقويم شهري أصيل مبني بـ React، وأحداث بالسحب والإفلات، وأداة مصغّرة في لوحة التحكم. |
| [`melis-cron`](/ar/reference/modules/melis-cron) | مدير المهام المجدولة — عرّف مهام CLI/HTTP، وشغّلها، وافحص سجل التشغيل، عبر أداة React أصيلة. |
| [`melis-document-upload`](/ar/reference/modules/melis-document-upload) | إدارة رفع المستندات كأداة React أصيلة — عرّف الأنواع، واجمع الملفات وقدّمها. |
| [`melis-messenger`](/ar/reference/modules/melis-messenger) | مراسلة داخلية بين المستخدمين — أيقونة إشعار في الشريط العلوي وتبويب في "حسابي". |
| [`melis-small-business`](/ar/reference/modules/melis-small-business) | إضافة تحريرية — الأدوار، وسير عمل التحقق، وإصدارات الصفحات، والتعليقات، والقفل، ومكتبة وسائط. |

## المصادقة

| الوحدة | الدور |
| --- | --- |
| [`melis-login-2fa`](/ar/reference/modules/melis-login-2fa) | نواة المصادقة الثنائية — تتطلب رمزًا لمرة واحدة وتفوّض توصيله إلى وحدات القنوات. |
| [`melis-login-2fa-email`](/ar/reference/modules/melis-login-2fa-email) | قناة توصيل عبر البريد الإلكتروني — ترسل رمز تسجيل الدخول لمرة واحدة بالبريد الإلكتروني. |
| [`melis-login-2fa-primotexto`](/ar/reference/modules/melis-login-2fa-primotexto) | قناة توصيل عبر الرسائل النصية القصيرة (SMS) من خلال بوّابة Primotexto. |

## الإشعارات

| الوحدة | الدور |
| --- | --- |
| [`melis-newsletter`](/ar/reference/modules/melis-newsletter) | يحوّل صفحة من نظام إدارة المحتوى إلى نشرة بريدية إلكترونية مخصّصة ويسلّمها إلى مجموعات المشتركين، من واجهة React إدارية. |

## الذكاء الاصطناعي

| الوحدة | الدور |
| --- | --- |
| [`melis-ai`](/ar/reference/modules/melis-ai) | واجهة React إدارية لمجموعة الذكاء الاصطناعي — اربط المزوّدين، وصمّم الوكلاء، وانشر النُسخ، وراقب الاستخدام، وحادِث في أي مكان. |
| [`melis-ai-engine`](/ar/reference/modules/melis-ai-engine) | محرّك الذكاء الاصطناعي المجرّد — عقد المزوّد، وبيئة تشغيل الوكيل/السيناريو، ومخزن المحادثات، وجسر MCP/الأدوات، ومكوّنات محادثة React المشتركة. |
| [`melis-ai-engine-claude`](/ar/reference/modules/melis-ai-engine-claude) | مزوّد Anthropic Claude لمحرّك الذكاء الاصطناعي (خلفية فقط، بلا واجهة React خاصة به). |
| [`melis-ai-engine-gemini`](/ar/reference/modules/melis-ai-engine-gemini) | مزوّد Google Gemini لمحرّك الذكاء الاصطناعي (خلفية فقط، بلا واجهة إدارية خاصة به). |
| [`melis-ai-community-extensions`](/ar/reference/modules/melis-ai-community-extensions) | يحقن توليد الذكاء الاصطناعي في أسطح تحرير نظام إدارة المحتوى القائمة (القوالب المصغّرة، والأخبار، ومناطق السحب والإفلات). |

::: tip الوحدات الخاصة بـ v5 فقط موجودة ضمن /legacy
بعض الوحدات من الواجهة الإدارية للإصدار v5 ليس لها بعد صفحة مخصّصة في v6 — مثل
[`melis-tool-creator`](/legacy/reference/modules/melis-tool-creator) و
[`melis-installer`](/legacy/reference/modules/melis-installer) ووحدات `form-*`.
توثيقها مجمّد ضمن `/legacy/reference/modules/`.
:::

::: tip تصفّح الكود المصدري
كل وحدة موجودة في `vendor/melisplatform/<module-name>/`. إن قراءة مجلدي `config/` و`src/` الخاصين بوحدة ما هي أسرع طريقة لتعلّم خدماتها العامة واصطلاحاتها.
:::
