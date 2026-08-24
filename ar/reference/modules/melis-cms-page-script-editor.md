# MelisCmsPageScriptEditor

> حقن وسوم `<script>`/`<style>`/HTML مخصّصة (التحليلات، بكسلات التتبّع، أدوات الطرف الثالث) داخل
> `<head>` و`<body>` لصفحات الواجهة الأمامية، لكل صفحة ولكل موقع، دون تعديل القوالب.
> الحزمة `melisplatform/melis-cms-page-script-editor`.

## الغرض

يتيح لك MelisCmsPageScriptEditor إضافة وسوم خام يتم حقنها تلقائيًا في شيفرة HTML المُصيَّرة
لصفحاتك. تتوفّر ثلاث فتحات حقن: **أعلى الرأس** (مباشرةً بعد
`<head>`)، و**أسفل الرأس** (قُبيل `</head>`)، و**أسفل الجسم** (قُبيل `</body>`).
يمكن تحديد نطاق النصوص البرمجية ليشمل موقعًا كاملًا أو صفحة واحدة؛ ويمكن وسم الصفحة بأنها **استثناء**
لإلغاء الاشتراك في النصوص البرمجية على مستوى الموقع.

في الواجهة الخلفية v6 القائمة على React تُشحن الوحدة على هيئة **لبنة مساهمة فقط** — فهي لا تملك
أداةً خاصةً بها في القائمة اليسرى. بدلًا من ذلك تضيف **علامة تبويب Scripts في موضعين**: **محرّر صفحات
CMS** (نصوص برمجية لكل صفحة) و**تحرير أداة المواقع** (نصوص برمجية على مستوى الموقع + الاستثناءات).
نموذج البيانات والخدمة ومستمعو الحقن لم تتغيّر عن v5؛ إذ انتقلت واجهة الواجهة الخلفية فقط إلى React.

## تفعيلها

أضف إلى `config/melis.module.load.php`:

```php
return [
    'MelisCmsPageScriptEditor',
];
```

تتطلّب `melis-core ^6.0` و`melis-cms ^6.0` (PHP `^8.3|^8.5`). الوحدة موسومة
بـ `dbdeploy: true`، لذا تُنشأ جداولها تلقائيًا عبر melis-dbdeploy.

> **التفعيل لكل موقع:** لا يسري الحقن على موقع ما إلا بعد تحميل الوحدة لذلك
> الموقع في MelisCms ← Sites ← Module loading. يمكن تحرير النصوص البرمجية في الواجهة الخلفية قبل ذلك،
> لكن لا يُحقن شيء على الواجهة الأمامية حتى تُفعَّل الوحدة على الموقع.

## الواجهة الخلفية في React

لا توجد **أداة مخصّصة في القائمة اليسرى** — تعيش علامة تبويب Scripts داخل أداتين قائمتين، كلتاهما
من React الأصيل. لا تظهر علامتا التبويب إلا عندما تكون الوحدة نشطة (تُكتشَف عبر
`GET /melis/react-api/react-modules`، ثم تُجلَب حزمة اللبنة مسبقًا عند الإقلاع).

| السطح | الموضع | المحتوى | الحفظ |
| --- | --- | --- | --- |
| **محرّر الصفحة ← علامة تبويب Scripts** | MelisCms ← افتح **صفحة** ← *Scripts* | ثلاثة محرّرات شيفرة لكل صفحة (Head top / Head bottom / Body bottom) لـ**هذه الصفحة فقط**. | زرّ **Save scripts** الخاص بها. |
| **أداة المواقع ← علامة تبويب Scripts** | MelisCms ← **Sites** ← افتح موقعًا ← *Scripts* | ثلاثة محرّرات على مستوى الموقع + قائمة **Current Exceptions** + **Add an exception** (إدخال page-id أو منتقي شجرة الصفحات). | يُحفظ بزرّ **Save** العام لمحرّر الموقع؛ وتُثبَّت إضافة/إزالة الاستثناءات فورًا. |

![محرّر صفحات CMS في React، علامة تبويب Scripts: محرّرات الشيفرة الثلاثة لكل صفحة (Head top / Head bottom / Body bottom) مع زرّ Save scripts](/screenshots/react/melis-cms-page-script-editor/meliscmspagescripteditor-page-tab-scripts.png)

![تحرير المواقع في React، علامة تبويب Scripts: المحرّرات الثلاثة على مستوى الموقع، وقائمة Current Exceptions، وكتلة Add an exception، مع الحفظ بزرّ Save العام لمحرّر الموقع](/screenshots/react/melis-cms-page-script-editor/meliscmspagescripteditor-tooloverride-sites-edit-tab-scripts.png)

على الصفحة المُقدَّمة، تحصل كل فتحة على **نصوص الموقع أولًا، ثم النصوص الخاصة بالصفحة** — إلا إذا كانت
الصفحة استثناءً، وفي هذه الحالة تُحقن نصوص الصفحة الخاصة فقط.

يعيش **مكوّن علامة تبويب محرّر الصفحة** في MelisCms (`PageTabs.tsx`، المفتاح
`meliscms_page_script_editor`)؛ ويعيش **مكوّن علامة تبويب الموقع** (`ScriptsTab.tsx`) في هذه الوحدة
ويسجّل نفسه ذاتيًا عبر سجلّ `window.__melisSiteTabs` العام (الترتيب `55`). تملك هذه الوحدة
نقاط النهاية والقدرة الكامنة خلف كلتا علامتي التبويب.

## القدرات (الصلاحيات المتقدّمة)

علامة تبويب الصفحة هي **قدرة من قدرات أداة صفحات CMS**، مُعلَنة في `config/react.capabilities.php`
ضمن العقدة المشتركة `meliscms_page`:

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'meliscms_page_script_editor', 'label' => 'tr_meliscmspagescripteditor_title'],
      ],
    ],
  ],
];
```

بدون هذا الإعلان، تخفي قائمة قدرات صفحة CMS البيضاء زرَّ علامة تبويب **Scripts** في محرّر
الصفحة، حتى بالنسبة إلى المسؤول. لا تملك علامة تبويب Scripts في **أداة المواقع** قدرةً خاصةً بها: إذ
يحكمها الوصول إلى أداة المواقع (`meliscms_tool_sites`).

## واجهة React البرمجية

متحكّمان تملكهما هذه الوحدة، كلاهما يفوّض إلى `MelisCmsPageScriptEditorService`. العقد
`{ success, data, error }`، مع `X-Requested-With: XMLHttpRequest` و`credentials: 'include'`.

**علامة تبويب الصفحة** — `MelisReactApiPageScriptEditorController`، المسارات في `config/react-api.php`. محميّة
بالمصادقة + `MelisCoreRights::canAccess('meliscms_page_script_editor')`:

| الطريقة والعنوان | الغرض |
| --- | --- |
| `GET /melis/react-api/cms-page/scripts?idPage=<id>` | قراءة نصوص صفحةٍ ما ← `{ idPage, headTop, headBottom, bodyBottom, editDate }`. |
| `POST /melis/react-api/cms-page/scripts/save` | حفظ نصوص صفحةٍ ما (`{ idPage, headTop, headBottom, bodyBottom }`). |

**علامة تبويب الموقع** — `MelisCmsPageScriptEditorReactController`، المسار العام
`/melis/MelisCmsPageScriptEditor/:controller/:action` في `config/module.config.php`. محميّة بالمصادقة
+ `MelisCoreRights::canAccess('meliscms_tool_sites')`:

| الطريقة والعنوان (نسبةً إلى `.../MelisCmsPageScriptEditorReact`) | الغرض |
| --- | --- |
| `GET /site-script?siteId=<id>` | نصوص الموقع + عدد الاستثناءات ← `{ siteId, script, exceptionCount }`. |
| `POST /save-site-script` | حفظ نصوص الموقع (إذا كانت جميعها فارغة ⇐ يُحذف السجلّ). |
| `GET /exceptions?siteId=<id>` | استثناءات الموقع ← `{ items:[{id,pageId,pageName}], total }`. |
| `POST /add-exception` | إضافة استثناء (`{ siteId, pageId }`؛ يفرض نفس الموقع + عدم التكرار). |
| `POST /delete-exception` | إزالة استثناء (`{ id }`). |

> **ملاحظة أمنية.** تحقن نقاط نهاية الصفحة وسوم `<script>`/HTML مخصّصة في التصيير **العام**
> لصفحةٍ ما، لذا يتطلّب كلٌّ من `get` و`save` صلاحية أداة محرّر نصوص الصفحة (لا مجرّد
> جلسة)، ما يمنع مستخدم واجهة خلفية بلا صلاحيات من زرع XSS دائم. تستخدم عمليات الكتابة
> SQL مُعامَلًا مباشرةً على `melis_cms_scripts`.

## الخدمات الرئيسية

| الاسم المستعار | الدور |
| --- | --- |
| `MelisCmsPageScriptEditorService` | كل منطق أعمال النصوص البرمجية: الحفظ والقراءة والدمج والحقن. مُعاد استخدامها من كلا متحكّمَي React. |
| `MelisCmsScriptTable` | بوّابة جدول لـ `melis_cms_scripts`. |
| `MelisCmsScriptExceptionTable` | بوّابة جدول لـ `melis_cms_scripts_exceptions`. |

يكشف `MelisCmsPageScriptEditorService`:

| الطريقة | الدور |
| --- | --- |
| `addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId)` | إدراج أو تحديث صفّ نصوص برمجية لموقع أو صفحة. |
| `addScriptException($siteId, $pageId)` | وسم صفحة بأنها تستبعد النصوص البرمجية على مستوى الموقع. |
| `getScriptExceptions($siteId, $sortCol, $sortOrder)` | سرد الصفحات التي تلغي الاشتراك في نصوص الموقع. |
| `getScriptsPerSite($siteId)` / `getScriptsPerPage($pageId)` | استرجاع صفّ (صفوف) النصوص البرمجية لموقع / صفحة. |
| `getScriptsExceptionPerPage($pageId)` | استرجاع صفّ (صفوف) الاستثناء لصفحة. |
| `getMixedScriptsPerPage($pageId)` | حلّ النصوص البرمجية النهائية لصفحة — دمج الموقع + الصفحة، أو الصفحة فقط عندما تكون الصفحة استثناءً. يستخدمها مستمع تصيير الواجهة الأمامية. |
| `updatePageScripts($pageId, $html)` | يحقن النصوص البرمجية المدموجة في شيفرة HTML المُصيَّرة (بعد `<head>`، وقبل `</head>`، وقبل `</body>`). |
| `getSiteId($pageId)` | حلّ معرّف الموقع لصفحة معيّنة. |

## الواجهة الأمامية

يحدث الحقن عبر مستمع MVC، لا عبر مكوّن قالب إضافي:

| المستمع | المُشغِّل | الدور |
| --- | --- | --- |
| `MelisCmsPageScriptEditorScriptTagListener` | تصيير الصفحة (الواجهة الأمامية) | يستدعي `getMixedScriptsPerPage()` ويحقن النصوص البرمجية المحلولة: أعلى الرأس بعد `<head>`، وأسفل الرأس قبل `</head>`، وأسفل الجسم قبل `</body>`. |

يبقى الحفظ والتكرار قائمَين على الأحداث (`Module.php::onBootstrap`): تحفظ مستمعات save-page
وsave-site-script وduplicate-page النصوص البرمجية واستثناء استبعاد الموقع عند حفظ الصفحات/المواقع
أو تكرارها في الواجهة الخلفية. يوفّر مساعد العرض `melisCmsPageScriptEditorAddScript`
(`src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php`) وصولًا برمجيًا لحفظ
صفّ نصوص برمجية عبر الخدمة.

## جداول قاعدة البيانات

| الجدول | ما يحتويه |
| --- | --- |
| `melis_cms_scripts` | مجموعة نصوص برمجية واحدة لكل موقع أو لكل صفحة: `mcs_id`, `mcs_site_id`, `mcs_page_id`, `mcs_head_top`, `mcs_head_bottom`, `mcs_body_bottom`, `mcs_date_edition`, `mcs_user_id`. |
| `melis_cms_scripts_exceptions` | الصفحات التي تتجاهل نصوص الموقع: `mcse_id`, `mcse_site_id`, `mcse_page_id`, `mcse_date_creation`, `mcse_user_id`. |

## مثال

```php
$scripts = $this->getServiceManager()->get('MelisCmsPageScriptEditorService');

// Resolve the final scripts for a page (site + page merged, or page-only if exception)
$resolved = $scripts->getMixedScriptsPerPage($pageId);
// $resolved contains headTopScript, headBottomScript, bodyBottomScript

// Save scripts for a site or page
$scripts->addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId);

// Mark a page as an exception (it will no longer receive site-wide scripts)
$scripts->addScriptException($siteId, $pageId);

// List all pages that opted out of the site scripts
$exceptions = $scripts->getScriptExceptions($siteId, $sortCol, $sortOrder);
```

## الملفات الرئيسية

| الاهتمام | المسار |
| --- | --- |
| إقلاع الوحدة وربط المستمع | `vendor/melisplatform/melis-cms-page-script-editor/src/Module.php` |
| ربط الخدمة والمسارات | `vendor/melisplatform/melis-cms-page-script-editor/config/module.config.php` |
| مسارات واجهة React لعلامة تبويب الصفحة | `vendor/melisplatform/melis-cms-page-script-editor/config/react-api.php` |
| إعلان قدرة علامة تبويب الصفحة | `vendor/melisplatform/melis-cms-page-script-editor/config/react.capabilities.php` |
| متحكّمات React (صفحة / موقع) | `vendor/melisplatform/melis-cms-page-script-editor/src/Controller/` |
| لبنة علامة تبويب الموقع (Vite IIFE) | `vendor/melisplatform/melis-cms-page-script-editor/ui-react/src/` (`brick.tsx`, `ScriptsTab.tsx`, `site-scripts-api.ts`) |
| الخدمة | `vendor/melisplatform/melis-cms-page-script-editor/src/Service/MelisCmsPageScriptEditorService.php` |
| مستمع حقن الواجهة الأمامية | `vendor/melisplatform/melis-cms-page-script-editor/src/Listener/MelisCmsPageScriptEditorScriptTagListener.php` |
| مساعد العرض | `vendor/melisplatform/melis-cms-page-script-editor/src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php` |
| بوّابات الجداول | `vendor/melisplatform/melis-cms-page-script-editor/src/Model/Tables/` |
| SQL التثبيت | `vendor/melisplatform/melis-cms-page-script-editor/install/dbdeploy/` |

اطّلع أيضًا على: [مرجع الوحدات](/ar/reference/modules) · [melis-cms](/ar/reference/modules/melis-cms) ·
[melis-core](/ar/reference/modules/melis-core)
