# MelisPhpinfo

> أداة تشخيص للقراءة فقط تعرض دالة `phpinfo()` الأصلية في PHP داخل واجهة الإدارة الخلفية المبنية على React في Melis. الحزمة `melisplatform/melis-phpinfo`.

## الغرض

MelisPhpinfo هي وحدة من أدوات المطوّرين (Dev Tools) تتكوّن من شاشة واحدة، تلتقط مُخرجات `phpinfo()` وتعرضها في واجهة إدارة Melis، مما يتيح للمسؤول فحص إصدار PHP على الخادم، والإضافات المُحمَّلة، وتوجيهات `php.ini`، ومتغيّرات البيئة والمسارات دون الحاجة إلى وصول عبر الطرفية (shell). لا تحتوي على قاعدة بيانات ولا خدمة ولا طبقة نماذج — بل على متحكّم واحد فقط وثلاث مناطق عرض. في الإصدار v6 تُشحَن على هيئة **قالب iframe (iframe brick)** ضمن الواجهة الخلفية المبنية على React: تُثبّت صفحة React إطار iframe دائمًا يُحمّل الأداة القديمة الموجودة داخل غلاف React. لا توجد طبقة React API ولا ملف قدرات (capabilities).

::: warning ملاحظة أمنية
تكشف الدالة `phpinfo()` تفاصيل حسّاسة — مسارات مطلقة، ووحدات مُحمَّلة، ومتغيّرات بيئة (قد تحتوي على بيانات اعتماد/مفاتيح API)، وأعلام البناء (build flags). وُضعت هذه الأداة تحت **Dev Tools** عن قصد؛ فاحرص على قصرها على المسؤولين الموثوقين، وقم بإخفاء الأسرار قبل مشاركة أي لقطة شاشة.
:::

## تفعيلها

أضِف إلى `config/melis.module.load.php`:

```php
return [
    'MelisPhpinfo',
];
```

يتطلّب تحميل `MelisCore` أولًا. يظهر قالب React فقط في حال تفعيل الوحدة — يسرد اكتشاف القوالب (`GET /melis/react-api/react-modules`) الوحدات النشطة التي تشحن ملف `brick.manifest.json`؛ ويؤدّي إلغاء تفعيل الوحدة إلى إزالة عقدة القائمة.

## الواجهة الخلفية (React)

تظهر الأداة في الشريط الجانبي الأيسر تحت **MelisCore → Dev Tools → PHP Info**. تُفتح على هيئة تبويب علوي باسم **PHP Info** وتعرض تقرير `phpinfo()` الكامل بتنسيق يتلاءم مع واجهة إدارة Melis؛ ويظهر مؤشّر تحميل مختصر أثناء تحميل الإطار iframe لأول مرة. قد يكون التقرير طويلًا، لذا مرّر داخل منطقة الأداة للوصول إلى قسم مُعيّن (Core، الإضافات، المسارات، البيئة). توجد واجهة عرض واحدة — دون مفتاح تبديل بين الجديد/القديم — ولا شيء قابل للتحرير.

## بنية القالب

حضور React يتمثّل في **قالب iframe (iframe brick)**: لا يُنفّذ `PhpinfoPage.tsx` أي واجهة React أصلية. فهو يُنشئ إطار iframe دائمًا (`id="melis-brick-frame-phpinfo"`) يكون مصدره `src` هو `/melis/react-tool-page?key=melis_phpinfo_tool`، ويُلحقه بعنصر `<body>` مرّة واحدة، ثم يقتصر عمله على تحديد موضعه/إظهاره وإخفائه فوق عنصر إرساء `<div>` عند التبديل بين التبويبات بحيث لا يُعاد تحميله أبدًا. وجهة الإطار iframe — التي تخدمها **MelisReactOverride** — تعرض أداة PHP Info القديمة الكلاسيكية.

| العنصر | القيمة |
| --- | --- |
| مُعرِّف القالب (Brick id) | `phpinfo` |
| `route` في البيان (Manifest) | `/melis-core/phpinfo` |
| `label` | `PHP Info` |
| `forwardKey` | `MelisPhpinfo/List` |
| `melisKey` (وجهة الإطار iframe) | `melis_phpinfo_tool` |
| `entry` | `brick.js` |
| React API | لا يوجد (بلا `config/react-api.php`) |
| القدرات (Capabilities) | لا يوجد (بلا `config/react.capabilities.php`) — محكوم بالوصول عبر صلاحية `melis_phpinfo_tool` |

البيان (`public/ui-react/brick.manifest.json`):

```json
{
  "id": "phpinfo",
  "route": "/melis-core/phpinfo",
  "label": "PHP Info",
  "forwardKey": "MelisPhpinfo/List",
  "melisKey": "melis_phpinfo_tool",
  "entry": "brick.js"
}
```

## الوصول

لا توجد قدرات دقيقة التفصيل: الوصول إمّا كامل أو معدوم، ومحكوم بصلاحية الأداة `melis_phpinfo_tool`. لا تُصدر قائمة React العقدة إلا إذا كان المستخدم `canAccess('melis_phpinfo_tool')` (المسؤولون الأعلى ممن لديهم `usr_admin=1`، أو المستخدمون الممنوحون هذه الصلاحية). تُعيد واجهة عرض المحتوى القديمة التحقّق من الصلاحية نفسها على جانب الخادم قبل تشغيل `phpinfo()`، بحيث إن أي طلب مُصاغ يدويًا إلى منطقة المحتوى يُنتج استجابة فارغة للآخرين.

```php
// src/Controller/ListController.php — renderToolContentAction()
$view->accessAllowed = $this->isPhpinfoAccessAllowed(); // only then does the view run phpinfo()
// isPhpinfoAccessAllowed(): authenticated identity + MelisCoreRights::canAccess('melis_phpinfo_tool')
```

## مناطق العرض

تتكوّن الأداة القديمة (المُحمَّلة داخل الإطار iframe) من ثلاث مناطق، لم تتغيّر في الإصدار v6:

| مُعرِّف المنطقة | الدور |
| --- | --- |
| `melis_phpinfo_tool` | الحاوية — تُمرِّر إلى `MelisPhpinfo/List/render-tool` |
| `melis_phpinfo_header` | شريط العنوان (`render-tool-header`) |
| `melis_phpinfo_content` | تقرير `phpinfo()` (`render-tool-content`) |

## تفصيل التنفيذ

تُنتَج مُخرجات `phpinfo()` بالكامل في طبقة العرض. تُعيد إجراءات المتحكّم كائن `ViewModel` فارغًا دون تمرير أي بيانات من PHP إلى الواجهة؛ وتلتقط واجهة عرض التقرير المُخرجات وتُنقّيها:

```php
ob_start();
phpinfo();
$phpInfoContent = ob_get_clean();
// Strip phpinfo()'s own <style> so the page inherits Melis admin CSS
$filtredPhpInfoContent = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $phpInfoContent);
echo $filtredPhpInfoContent;
```

يبقى منطق الأعمال على جانب الخادم: فقالب React ليس سوى أداة PHP Info القديمة مُضمَّنة داخل غلاف React.

## الملفات الرئيسية

| الموضوع | المسار |
| --- | --- |
| نقطة دخول القالب | `ui-react/src/brick.tsx` (تُسجّل المُعرِّف `phpinfo` ← `PhpinfoPage`) |
| صفحة React (غلاف الإطار iframe) | `ui-react/src/PhpinfoPage.tsx` |
| الحزمة المبنية / البيان | `public/ui-react/brick.js` · `public/ui-react/brick.manifest.json` |
| تسجيل القائمة / المنطقة | `config/app.toolstree.php` |
| إعدادات الأداة | `config/app.tools.php` · `config/app.interface.php` |
| تسجيل المسار + المتحكّم | `config/module.config.php` |
| المتحكّم (3 إجراءات مُبسَّطة، محكومة بالوصول) | `src/Controller/ListController.php` |
| واجهة عرض التقرير | `view/melis-phpinfo/list/render-tool-content.phtml` |

انظر أيضًا: [MelisCore](/ar/reference/modules/melis-core)
