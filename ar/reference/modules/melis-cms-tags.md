# MelisCmsTags

> نظام وسوم/تصنيف مشترك لنظام إدارة المحتوى (CMS) — "التسميات" التي تُعلّق عليها وحدات المحتوى (مثل News) عناصرها، ويأتي الآن مع واجهة إدارة خلفية أصلية مبنية على React. الحزمة `melisplatform/melis-cms-tags`.

## الغرض

توفّر MelisCmsTags **نظام الوسوم (التصنيف)** الخاص بالمنصّة: وسوم متعدّدة اللغات (عنوان لكل لغة) تربط بها الوحدات الأخرى محتواها. ينشئ المحرّرون الوسوم ويترجمونها، ويرون كم عنصرًا يستخدم كل وسم، ويحذفون غير المستخدَمة منها. تندمج الوحدات الأخرى (مثل MelisCmsNews) في طبقة الربط عبر تصريح في الإعدادات واستدعاء خدمة واحد، مما يجعل عناصرها قابلة للوسم دون أي تغيير في مخطّط وحدة الوسوم. ويعرض مكوّن قوالب أمامي **List Tags** وسوم الموقع في الواجهة الأمامية.

في **Melis v6** تكون الواجهة الخلفية **لبنة أصلية كاملة مبنية على React** تُعرض داخل `/melis-react`، وتستدعي طبقة JSON مملوكة للوحدة باسم `react-api`. أما نموذج البيانات من جانب الخادم والخدمة والجداول وإعدادات الارتباطات والمكوّن الأمامي فتظل دون تغيير عن الإصدار v5 — تحوّلت طبقة العرض والتنقّل فقط إلى React.

## تفعيلها

أضِفها إلى `config/melis.module.load.php`:

```php
return [
    'MelisCmsTags',
];
```

تتطلّب `melis-core` و`melis-cms`. تأتي الوحدة مع `dbdeploy: true` — تُنشأ جداولها الثلاثة تلقائيًا عند أول نشر. لا تظهر لبنة React في الواجهة الخلفية **إلا إذا كانت الوحدة مفعّلة** (اكتشاف اللبنات المعياري).

## أين توجد في الواجهة الخلفية لـ React

الشريط الجانبي الأيسر ← مجموعة **Site Tools** ← **Tags** (`fa-tag`). تُفتح كتبويب علوي باسم **Tags**. يربط `forwardKey` الخاص بالقائمة `MelisCmsTags/TagsList` بمسار الشجرة `/melis-cms/tags` (و`/melis-cms/tags/:id` للمحرّر)، حيث يُعرض المكوّن `TagsPage`.

اللبنة واجهة **أصلية كاملة مبنية على React** مع **مبدّل New / Old** (أعلى اليمين): *New* هي واجهة React (الافتراضية)، و*Old* تعرض الأداة القديمة داخل إطار iframe (`/melis/react-tool-page?key=tags_left_menu`).

## الواجهة الخلفية — القائمة والمحرّر

**تبويب هيكل واحد (`Tags`) مع تبويبات فرعية داخل الأداة.** القائمة هي العرض الرئيسي؛ ويؤدي فتح وسم أو إنشاؤه إلى إضافة **تبويب فرعي للتحرير** (`subTabs: true`)، فيكون التبديل بين الوسوم المفتوحة فوريًا.

**القائمة** تعرض كل وسم على المنصّة، مع:

- **بطاقات مؤشّرات الأداء (KPI)** — الإجمالي · ذات ارتباطات · بدون ارتباط (من نقطة النهاية `stats`).
- **البحث** ("Search a tag…"، يطابق المعرّف أو عنوانًا بأي لغة)، و**إعادة تعيين الفلاتر**، ومدير **الأعمدة** (إخفاء/إعادة ترتيب)، وزر **تصدير** (`.xlsx` عبر `window.MelisXLSX` المضيف، مع رجوع احتياطي إلى CSV).
- أعمدة قابلة للفرز **ID / Title / Nb associations**، مع إجراءَي **تحرير** و**حذف** لكل صف.
- زر **+ New tag** يفتح محرّرًا فارغًا.

![قائمة وسوم React — بطاقات KPI (الإجمالي / ذات ارتباطات / بدون ارتباط)، البحث، إعادة تعيين الفلاتر، مدير الأعمدة، التصدير، مبدّل New/Old، "+ New tag"، وصفوف تعرض ID / Title / Nb associations مع إجراءَي التحرير والحذف](/screenshots/react/melis-cms-tags/meliscmstags-tool-tags-list.png)

**المحرّر** نموذج مُدمج (فالوسم ما هو إلا عنوان لكل لغة): **مبدّل لغة** (English / Français…) تغذّيه نقطة النهاية `languages`، وحقل **Label** للّغة المحدَّدة. تُحفظ جميع الترجمات دفعة واحدة ومعًا — **يُشترط وجود عنوان واحد غير فارغ على الأقل**. ويُرفض حذف الوسم **ما دامت له ارتباطات**، حمايةً للمحتوى الموسوم.

![محرّر وسم React — مبدّل لغة (English / Français) وحقل "LABEL" الخاص بكل لغة مع التلميح "At least one title is required"](/screenshots/react/melis-cms-tags/meliscmstags-tool-tags-edit-texts.png)

## وسم المحتوى — منتقي الوسوم

الوسوم مُعدّة لكي *تستخدمها* الوحدات الأخرى. في **محرّر News المبني على React** (Site Tools ← News ← افتح مقالًا)، يعرض الشريط الجانبي للإعدادات لوحة **TAGS**: قائمة تحقّق بالوسوم المتاحة. وتأشير الوسوم وحفظ المقال يخزّن الارتباطات، التي تُحتسب بعد ذلك ضمن **Nb associations** لكل وسم.

![لوحة TAGS داخل محرّر مقالات News المبني على React — قائمة تحقّق بالوسوم (Art, Business, Design, Development, Education…) التي تسِم المقال](/screenshots/react/melis-cms-tags/meliscmstags-tooloverride-news-tags.png)

هذا المنتقي وحفظه مملوكان للبنة **News** (تقرأ `GET /melis/react-api/news/tags` وتكتب في جدول الربط المشترك بقيمة `entity_type = 'NEWS'`)؛ أما MelisCmsTags فلا تملك سوى بيانات الوسوم وجدول `melis_cms_tag_entity` المشترك. ولا تظهر اللوحة إلا عند تفعيل MelisCmsTags.

## واجهة React API — نقاط النهاية

لا يوجد **`config/react-api.php`**: تُصرَّح المسارات **مضمّنةً داخل `config/module.config.php`** كعقدة فرعية `react-api-cms-tags` تحت `melis-backoffice`، لذا تقع عناوين URL تحت **`/melis/react-api-cms-tags`** (مملوكة للوحدة، *وليست* ضمن مساحة الأسماء المشتركة `/melis/react-api/…`). المتحكّم: `MelisCmsTags\Controller\MelisCmsTagsReactApiController`. تستخدم جميع الاستجابات عقد `{ success, data, error }`؛ وترسل الطلبات `X-Requested-With: XMLHttpRequest` و`credentials: 'include'`.

| الطريقة وعنوان URL | الإجراء | الغرض |
| --- | --- | --- |
| `GET /melis/react-api-cms-tags` | `list` | سرد الوسوم (keyset: `search`، `limit`، `sort`، `dir`، `after`، و`lang` اختياريًا) ← `{items,total,nextCursor}`؛ يحمل كل عنصر `id` و`title` و`associationsCount` |
| `GET /melis/react-api-cms-tags/stats` | `stats` | مؤشّرات الأداء `{total, withAssociations, orphan}` |
| `GET /melis/react-api-cms-tags/languages` | `languages` | لغات CMS ‏`{languages:[{id,locale,name}]}` (تُشغّل مبدّل لغة المحرّر) |
| `GET /melis/react-api-cms-tags/:id` | `get` | وسم واحد `{id, creationDate, titles:{langId:title}, associationsCount}` |
| `POST /melis/react-api-cms-tags/save` | `save` | إنشاء / تحديث (`{id?, titles:{langId:title}}`) ← `{id}` |
| `DELETE /melis/react-api-cms-tags/delete/:id` | `delete` | حذف وسم (يُرفض إن كانت له ارتباطات) |

> ترتيب المسارات مهم: تُصرَّح `stats` / `languages` / `save` **قبل** الملتقِط الشامل `:id` كي تُحلّ إلى إجراءاتها الخاصة بدلًا من `get`.

يمزج المتحكّم بين استعلامات keyset SQL المباشرة ذات المعاملات (list، stats) وبين جداول الوحدة وخدمتها (`TagTable` و`TagTextsTable` و`TagEntityTable` لـ `get`/`save`؛ و`MelisCmsTagsService` لـ `delete` — يمنع `getAssociationsByTagId()` الحذف، ثم يقوم `deleteTagById()` + `TagTextsTable::deleteByField()` بالتنظيف). يُعيد `save` إنتاج القواعد القديمة (عنوان واحد غير فارغ على الأقل، ‏255 حرفًا كحدّ أقصى، تفرّد لكل لغة) ويُطلق الأحداث نفسها (`meliscmstags_save_tag_end`، `meliscmstags_delete_tag_end`).

مثال (`tags-api.ts`):

```ts
const BASE = '/melis/react-api-cms-tags'
await apiFetch<TagListResult>(`${BASE}?search=art&limit=25&sort=id&dir=desc`) // list
await apiFetch<TagDetail>(`${BASE}/42`)                                       // one tag
await apiFetch<{ id: number }>(`${BASE}/save`, {                              // save all translations
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: null, titles: { 1: 'Art', 2: 'Art' } }),        // langId → title
})
await apiFetch<null>(`${BASE}/delete/42`, { method: 'DELETE' })              // delete
```

## القدرات

مُصرَّحة في `config/react.capabilities.php` تحت عقدة القائمة **`tags_left_menu`** (عقدة الأداة القابلة للعرض؛ يدمج `MelisCmsTags\Module::getConfig()` الملف). الإجراءات: `list` · `create` · `edit` · `delete` · `export`. في React، يقرأ `can(cap)` الخاص بـ `TagsPage` القيمة `window.MelisCan('tags_left_menu', cap)` للتحكّم في إتاحة زر **+ New tag** وتحرير/حذف الصفوف والتصدير. ومن جانب الخادم، يستدعي كل إجراء `denyUnlessAccess()` (المصادقة + `MelisCoreRights::canAccess('tags_left_menu')` ← 401/403)؛ وهنا يتطابق مفتاح القدرات مع `MELIS_KEY` الخاص بحارس الوصول (`tags_left_menu`).

## الخدمات الرئيسية

| اسم الخدمة المستعار | الدور |
| --- | --- |
| `MelisCmsTagsService` | عمليات CRUD كاملة للوسوم إضافةً إلى واجهة الارتباطات. تُطلق كل طريقة أحداث `*_start` / `*_end` عبر `MelisGeneralService`. |

الأسماء المستعارة لبوّابات الجداول: `TagTable`، `TagTextsTable`، `TagEntityTable` (مسجَّلة في `module.config.php`).

## الواجهة الأمامية

يوسّع `ListTagsPlugin` (`Controller\Plugin\ListPublicationsPlugin.php`) الصنف `MelisTemplatingPlugin`.

| الإعداد | التفاصيل |
| --- | --- |
| مفتاح إعداد المكوّن | `tags` · مفتاح XML DB ‏`TagsList` |
| ملف الإعداد | `config/plugins/ListPublicationsPlugin.config.php` |
| العرض الأمامي | `MelisCmsTags/listtags` |
| تبويبات الإعدادات | **Template** (اختيار القالب والموقع) · **Filters** (العمود / الترتيب / التاريخ الأدنى / التاريخ الأقصى / البحث) |

> **انزياح في التسمية.** يقع صنف المكوّن في `ListPublicationsPlugin.php` وتُشحن ملفات Phtml باسم `listpublications.phtml` / `showpublication.phtml` — وهو أثر تاريخي؛ أما الميزة الفعّالة فهي مكوّن **List Tags** أعلاه.

## جداول قاعدة البيانات

البنية الأساسية في `install/sql/setup_structure.sql`؛ وعمليات الترحيل في `install/dbdeploy/`.

| الجدول | يحتوي على |
| --- | --- |
| `melis_cms_tag` | صف الوسم الأساسي: `tag_id`، `tag_creation_date`، `tag_site_id`، `tag_type` |
| `melis_cms_tag_texts` | النصوص لكل لغة: `tag_text_id`، `tag_id`، `tag_title`، `tag_lang_id` |
| `melis_cms_tag_entity` | ربط الوسم ↔ عنصر المحتوى: `id`، `tag_id`، `entity_id`، `entity_type` (مثل `NEWS`) |

## مثال على الخدمة

```php
$tags = $this->getServiceManager()->get('MelisCmsTagsService');

// Tag CRUD
$list = $tags->getTagsList($status, $langId, $start, $limit, $orderCol, $order, $siteId, $search);
$tag  = $tags->getTagById($tagId, $langId);
$id   = $tags->saveTag(['tag_site_id' => $siteId, ...], $tagId); // $tagId null → create
$tags->deleteTagById($tagId);

// Associations — the integration surface for other modules
$tags->saveTagEntity([$tagId1, $tagId2], $entityId, 'NEWS'); // (re)attach a tag set to an item
$set   = $tags->loadTagByEntityIdType($entityId, 'NEWS');    // tags of one item
$items = $tags->loadEntityByTagsId($tagIds, 'NEWS');         // items carrying given tags
$tags->deleteEntities($entityId, 'NEWS');                    // clear an item's tags
$assoc = $tags->getAssociationsByTagId($tagId, $langId);     // items associated to a tag
```

يحذف `saveTagEntity()` روابط الكيان الحالية ثم يعيد حفظ المجموعة المزوَّدة — استدعِه من تدفّق حفظ وحدة المحتوى لإبقاء وسومها متزامنة.

## جعل وحدة قابلة للوسم (ارتباطات مدفوعة بالإعدادات)

صرّح التعيين تحت `plugins.melis_cms_tag.datas.associations` في `config/associations.config.php`. مثال MelisCmsNews المشحون:

```php
'associations' => [
    'meliscmsnews' => [
        'module'           => 'MelisCmsNews',       // skipped if module not loaded
        'entity_type'      => 'NEWS',               // stored in melis_cms_tag_entity.entity_type
        'entity_table'     => 'melis_cms_news',
        'entity_primary_id'=> 'cnews_id',
        'trans' => [
            'trans_table'      => 'melis_cms_news_texts',
            'trans_foreign_id' => 'cnews_id',
            'trans_lang_key'   => 'cnews_lang_id',
        ],
        'association_title_key' => 'cnews_title',   // shown in the Associations grid "Title" column
    ],
],
```

ثم استدعِ `saveTagEntity()` في إجراء الحفظ الخاص بوحدة المحتوى. في لبنة News المبنية على React يجري توصيل ذلك عبر واجهتها الخاصة `/melis/react-api/news/tags`؛ أما MelisCmsTags فلا تملك سوى بيانات الوسوم وجدول الربط المشترك.

## الملفات الرئيسية

| الشأن | المسار |
| --- | --- |
| إعداد الوحدة (المسارات، مسارات react-api المضمّنة، الخدمات، عناصر النموذج) | `vendor/melisplatform/melis-cms-tags/config/module.config.php` |
| قدرات React | `vendor/melisplatform/melis-cms-tags/config/react.capabilities.php` |
| تعيين الارتباطات | `vendor/melisplatform/melis-cms-tags/config/associations.config.php` |
| إعداد مكوّن List Tags | `vendor/melisplatform/melis-cms-tags/config/plugins/ListPublicationsPlugin.config.php` |
| متحكّم React API | `vendor/melisplatform/melis-cms-tags/src/Controller/MelisCmsTagsReactApiController.php` |
| الخدمة الرئيسية | `vendor/melisplatform/melis-cms-tags/src/Service/MelisCmsTagsService.php` |
| المكوّن الأمامي | `vendor/melisplatform/melis-cms-tags/src/Controller/Plugin/ListPublicationsPlugin.php` |
| بوّابات الجداول | `vendor/melisplatform/melis-cms-tags/src/Model/Tables/` |
| مصدر لبنة React | `vendor/melisplatform/melis-cms-tags/ui-react/src/` (`TagsPage`، `tags-api.ts`، `ViewToggle`، `ExportModal`) |
| بناء لبنة React + البيان (manifest) | `vendor/melisplatform/melis-cms-tags/public/ui-react/brick.js` · `brick.manifest.json` |
| SQL التثبيت | `vendor/melisplatform/melis-cms-tags/install/sql/setup_structure.sql` |
| عمليات ترحيل قاعدة البيانات | `vendor/melisplatform/melis-cms-tags/install/dbdeploy/` |

انظر أيضًا: [melis-cms](/ar/reference/modules/melis-cms)،
[melis-cms-news](/ar/reference/modules/melis-cms-news)،
[melis-front](/ar/reference/modules/melis-front)،
[melis-engine](/ar/reference/modules/melis-engine)،
[melis-core](/ar/reference/modules/melis-core)
