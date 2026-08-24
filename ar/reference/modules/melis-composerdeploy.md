# MelisComposerDeploy

> يُضمِّن Composer داخل المنصّة لتثبيت الوحدات وتحديثها وإزالتها برمجيًّا. الحزمة `melisplatform/melis-composerdeploy`.

## الغرض

يتيح MelisComposerDeploy للمنصّة **تشغيل Composer من داخل التطبيق** — لتثبيت الوحدات أو تحديثها أو إزالتها دون الحاجة إلى الوصول إلى الطرفية. وهو المحرّك عديم الواجهة الذي يقف خلف **أداة الوحدات / المتجر** في الواجهة الخلفية، وخلف معالج التشغيل الأوّل الخاص بـ MelisInstaller. يقع ضمن طبقة الأساس MelisCore جنبًا إلى جنب مع MelisAssetManager وMelisDbDeploy وMelisInstaller، ويعتمد فقط على `composer/composer` (دون أي ارتباط بـ MelisCore).

## لا واجهة خلفية React

لا يمتلك MelisComposerDeploy **أي واجهة React ولا أي أداة في الواجهة الخلفية** — سواء في الواجهة الخلفية القديمة أو في واجهة React الخلفية (`/melis-react`). فهو لا يشحن أي وحدة بناء `ui-react/`، ولا ملف `brick.manifest.json`، ولا ملف `config/react-api.php`، ولا أي متحكّم. ولا يظهر مطلقًا في الشريط الجانبي، وليس فيه شيء يمكن النقر عليه.

علاقته بواجهة React الخلفية **غير مباشرة**: فعندما تثبّت وحدة عبر المتجر، يقوم MelisComposerDeploy بتنزيل حزمة Composer. وإذا كانت تلك الحزمة تحمل وحدة بناء React مبنيّة مسبقًا، فإن غلاف React يكتشف وحدة البناء **بمجرّد أن تصبح الوحدة نشطة** — غير أنّ اكتشاف وحدات البناء يتولّاه `melis-react-api`، لا هذه الوحدة. لا يلمس MelisComposerDeploy أصول React ولا يبنيها ولا يخدمها إطلاقًا.

> في البيئات المنشورة حيث يكون كامل مجلّد `vendor/` مُودَعًا في المستودع (دون تنفيذ `composer install` على الخادم)، يكون MelisComposerDeploy هو محرّك *المتجر في وقت التشغيل* — لا الآلية التي تشحن تطبيق React المبني مسبقًا.

## تفعيله

أضِفه إلى `config/melis.module.load.php`:

```php
return [
    'MelisComposerDeploy',
];
```

## الخدمة الأساسية

تتألّف الوحدة كلّها من خدمة واحدة في جوهرها، ذات الاسم المستعار `MelisComposerService` (`config/module.config.php` ← `service_manager.aliases`)، والصنف `MelisComposerDeploy\Service\MelisComposerService`. تبني هذه الخدمة أمرًا من أوامر وحدة تحكّم Composer وتشغّله داخل العملية نفسها عبر Symfony Console، مُشغّلةً مكتبة Composer المُضمَّنة التي تُشحَن ضمن `bin/extracted-composer/`.

| الاسم المستعار للخدمة | الدور |
| --- | --- |
| `MelisComposerService` | مُشغّل Composer داخل العملية. يعرِض `download()` و`update()` و`remove()` و`dumpAutoload()`، إضافةً إلى `setDocumentRoot()` و`setDryRun()`. |

```php
$composer = $sm->get('MelisComposerService');

$composer->setDocumentRoot($projectRoot);            // composer working-dir (defaults to DOCUMENT_ROOT/../)
$composer->setDryRun(true);                           // simulate without writing (--dry-run)

$composer->download('melisplatform/melis-cms-news');  // composer require <pkg>[:version]
$composer->update('melisplatform/melis-cms-news');    // composer update --root-reqs
$composer->remove('melisplatform/melis-cms-news');    // composer remove --no-scripts
$composer->dumpAutoload();                             // composer dump-autoload
```

ملاحظات مستخلَصة من المصدر:

- **الأوامر المسموح بها فقط**: `install` و`update` و`dump-autoload` و`require` و`remove`. أمّا ما عدا ذلك فيُعيد استجابة "أمر غير معروف" (unknown command).
- **تشديد التحقّق من الوسائط**: يُتحقَّق من سلسلة `package[:version]` مقابل تعبير نمطي صارم يتبع صيغة `vendor/name` + شبه‑semver، ويرفض المسافات البيضاء، ما يمنع حقن الوسائط في سطر أوامر Composer.
- تُنفَّذ الأوامر مع `--ignore-platform-reqs --no-progress --no-scripts --prefer-dist` و`--working-dir=<docRoot>`.
- لا مسارات، ولا متحكّم، ولا أحداث، ولا عرض — إنّها خدمة تستدعيها وحدات أخرى.

## خطّ أنابيب النشر

يقود المستدعون الخدمة؛ وفيما يلي مسار تثبيت نموذجي في وقت التشغيل:

```text
MelisComposerService::download(pkg)   →  composer require (package downloaded into vendor/)
        ↓
MelisComposerService::dumpAutoload()  →  autoloader regenerated (new classes visible)
        ↓
MelisDbDeploy                          →  applies the new module's SQL deltas (extra.dbdeploy: true)
        ↓
module active                          →  MelisAssetManager serves its assets; if the module ships
                                          a React brick, the React shell discovers it (via
                                          melis-react-api /react-modules)
```

السهم الأخير هو نقطة التماس الوحيدة، والسلبيّة، مع واجهة React الخلفية: هذه الوحدة تجعل الوحدة موجودة ونشطة؛ أمّا اكتشاف وحدة بناء React فيعود بالكامل إلى `melis-react-api`.

انظر أيضًا: [MelisDbDeploy](/ar/reference/modules/melis-dbdeploy) و[MelisInstaller](/ar/reference/modules/melis-installer) و[MelisAssetManager](/ar/reference/modules/melis-asset-manager)
