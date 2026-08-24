# MCP (بروتوكول سياق النموذج)

يدمج Melis **[بروتوكول سياق النموذج (Model Context Protocol)](https://modelcontextprotocol.io/)** بحيث يستطيع
[الوكلاء](./ai) الذكاء الاصطناعي استدعاء **أدوات** — قراءة/كتابة الملفات، تنفيذ عمليات قواعد البيانات، توليد هياكل الوحدات —
أثناء التشغيل. تشرح هذه الصفحة كيفية عمل ذلك وكيفية إضافة أداة MCP خاصة بك.

::: info المحرك نفسه، مكتب خلفي جديد
حافظ Melis v6 على محرك الذكاء الاصطناعي ووحداته دون تغيير؛ واستبدل المكتب الخلفي بـ **واجهة React
على `/melis-react`**. كل ما في هذه الصفحة حول كيفية عمل MCP — العميل، وإعداد `mcp.tools.php`،
وإطلاق الخوادم عبر stdio، والأمان — مطابق تمامًا لـ v5. الأجزاء الوحيدة التي انتقلت هي *أماكن النقر*
التي أصبحت ضمن أدوات React الجديدة (**Melis AI ← Admin ← MCP Server**، وقائمة السماح **AI Tools**
الخاصة بالوكيل، و**MCP Inspector**). وهذه مذكورة أدناه.
:::

::: info عميل، وليس خادمًا (حاليًا)
يعمل Melis كـ **عميل MCP**: فهو يُطلق **خوادم** MCP محلية (عمليات PHP، نقل عبر stdio)
ويستدعي أدواتها عندما يطلبها النموذج. أما كشف أدوات Melis الخاصة *للعملاء الخارجيين* لـ
MCP (وضع الخادم) فهو **غير** مُنفّذ بعد، والنقل عبر stdio فقط.
الميزة مستخدمة في الإنتاج داخليًا لكنها في تطور نشط — راجع الشيفرة للاطلاع على الحالة الحالية.
:::

## خوادم MCP المُضمّنة

يأتي المحرك جاهزًا بأربعة خوادم MCP (مُعلَنة في
`melis-ai-engine/config/app.interface.php` وفي ملفات `mcp.tools.php` الخاصة بالوحدات):

| الخادم | الوحدة | الأدوات (أمثلة) |
| --- | --- | --- |
| `file_operations` | `melis-ai` | `readFile`، `createFile`، `updateFiles`، `createDirectory`، `deleteFile`… |
| `database_operations` | `melis-ai` | `getTableStructure`، `createDatabaseTable`، `selectData`، `insertData`، `updateData`… |
| `tool_creator` | `melis-ai-tool-creator` | `createModule`، `activateModule`، `deactivateModule` |
| `minitemplate_creator` | `melis-ai-community-extensions` | `readSiteAssets`، `getSitePublicUrl`، `renderMinitemplatePreview`… |

يعمل كل خادم كملف تنفيذي مستقل، على سبيل المثال
`vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php`.

## كيف يسير استدعاء الأداة

عندما يطلب نموذج (Claude/Gemini) استدعاء دالة أثناء تشغيل وكيل:

1. تسأل خدمة المزوّد خدمة MCP عمّا إذا كانت أداة MCP —
   `MelisAIEngineMcpService::isMcpTool($name)` (الأدوات المُعلَّمة بـ `'mcp' => true`، أو المعروفة لخادمٍ ما).
2. إذا كان الجواب نعم، فإن `invokeTool($name, $args)` يعثر على الخادم الصحيح، ويعيد استخدام عمليته (أو يُنشئها)، ويرسل
   طلب JSON-RPC `tools/call` عبر stdio.
3. يشغّل الخادم الأداة ويعيد النتيجة، التي تُغذّى بدورها إلى النموذج.

يقع عميل MCP في `melis-ai-engine/src/Service/MelisAIEngineMcpService.php` (مُكوَّن من
سِمات (traits) للتواصل، وإدارة الخادم، وإدارة الأدوات، واكتشاف المخطط، وقاطع الدارة (circuit-breaking)
والتسجيل).

## إعداد `mcp.tools.php`

تكشف الوحدة أدوات MCP عبر توفير ملف `config/mcp.tools.php` يُعلن **(أ)** مخططات
الأدوات لمحرك الذكاء الاصطناعي و**(ب)** الخادم الذي يتعامل معها. مثال (مُختصر، من
`melis-ai-tool-creator/config/mcp.tools.php`):

```php
return [
    'plugins' => ['melisaiengine' => ['datas' => [
        'function_declarations' => [
            [
                'name' => 'createModule',
                'description' => 'Create a Laminas module with all components.',
                'mcp' => true,                  // routed to an MCP server
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'moduleName'    => ['type' => 'string'],
                        'functionality' => ['type' => 'string'],
                        'needDBTable'   => ['type' => 'boolean'],
                    ],
                    'required' => ['moduleName', 'functionality', 'needDBTable'],
                ],
            ],
        ],
    ]]],
    'mcp' => ['servers' => [
        'tool_creator' => [
            'enabled'  => true,
            'module'   => 'melis-ai-tool-creator',
            'args'     => [__DIR__ . '/../mcp/toolcreator/bin/server.php'],
            'timeout'  => 600,
            'tools'    => ['createModule', 'activateModule', 'deactivateModule'],
        ],
    ]],
];
```

## أضف أداة MCP خاصة بك

### 1. اكتب الخادم

`vendor/.../your-module/mcp/yourserver/bin/server.php`:

```php
#!/usr/bin/env php
<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Mcp\Server;
use Mcp\Server\Transport\StdioTransport;
use YourNs\YourOperations;

$server = Server::builder()
    ->setServerInfo('your-mcp', '1.0.0')
    ->addTool([YourOperations::class, 'doSomething'])
    ->build();

$server->run(new StdioTransport());
```

### 2. نفّذ العمليات

```php
namespace YourNs;

use Mcp\Capability\Attribute\McpTool;

class YourOperations
{
    #[McpTool(name: 'doSomething', description: 'What this tool does')]
    public function doSomething(string $param1): array
    {
        return ['success' => true, 'result' => /* … */];
    }
}
```

### 3. أعلِنها وحمِّل الإعداد

أضف ملف `config/mcp.tools.php` (كما ورد أعلاه) يُعلن `function_declarations` ومدخل
`mcp.servers`، ثم `include` له من `Module::getConfig()` الخاص بوحدتك.

يتولّى المحرك عنك إنشاء العمليات، وJSON-RPC عبر stdio، والمُهَل الزمنية، وإعادة المحاولات، وقاطع الدارة.
عندئذٍ تستطيع النماذج التي تدعم استدعاء الأدوات استدعاء أداتك أثناء تشغيل الوكيل.

## السماح بأداة على وكيل (React)

يجعل إعلانُ الأداة إياها *متاحة*؛ لكن [الوكيل](./ai) لا يرى سوى الأدوات التي تُؤشّرها له.
في المكتب الخلفي React، افتح **Melis AI ← AI Agents**، وافتح (أو أنشئ) وكيلًا، وانتقل إلى
تبويب **AI Tools** — قائمة مرجعية مقسّمة إلى **MCP tools** (تُقدَّم عبر خوادم MCP) و**Local tools**
(PHP مُضمّن). أشّر على الأدوات التي يجوز لهذا الوكيل استدعاؤها، فيقدّم المحرك تلك الأدوات بالضبط للنموذج
في كل تشغيل. كما تحترم أدوات قاعدة بيانات MCP حقوقَ القراءة/الكتابة/الحذف لكل جدول في تبويب
**DB Rights** الخاص بالوكيل.

![قائمة السماح لأدوات AI الخاصة بالوكيل](/screenshots/react/melis-ai/melisai-tool-aiagents-tab-aiagents-edit-tab-aitools.png)
*Melis AI ← AI Agents ← وكيل ← AI Tools: أدوات MCP (getTableStructure، createDatabaseTable، selectData، insertData…) وأدوات Local التي يجوز للوكيل استدعاؤها.*

تُعدّ الدوال التي *يكشفها* خادم MCP المُضمّن ضمن **Melis AI ← Admin ← MCP
Server** (التبويب الفرعي **MCP Exposition**)؛ ولا تُتاح سوى الأدوات المُؤشَّرة. راجع
[دليل الذكاء الاصطناعي](./ai) للاطلاع على نموذج الوكيل/النسخة الكامل و
[مرجع `melis-ai`](/ar/reference/modules/melis-ai) للأدوات والنقاط الطرفية.

## فحص خوادم MCP (MCP Inspector)

يأتي المكتب الخلفي React بأداة **MCP Inspector** ضمن **Melis AI ← MCP Inspector** (المسار
`/melis-ai/mcp-inspector`). تسرد هذه الأداة خوادم MCP المتصلة وتتيح لك **الإطلاق / فحص
الحالة / قراءة السجلات** حتى تتأكد من أن الخادم يعمل ومن أن الأدوات المتوقّعة قابلة للاكتشاف
*قبل* أن تسمح بها على وكيل. كما هو حال كل أداة React، تحمل مبدّل **New / Old**
(**New** = صفحة React؛ **Old** = الأداة الكلاسيكية داخل إطار iframe)، الذي يُطلق واجهة
MCP Inspector الرسمية على خادم مُختار عبر
`vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php`.

تقع نقاط React الطرفية الخاصة بـ Inspector (`servers`، `launch`، `status`، `log`) في
`MelisReactApiMcpInspectorController` — راجع [مرجع `melis-ai`](/ar/reference/modules/melis-ai).

## الأمان

تُعزَل عمليات MCP على الملفات/قواعد البيانات ضمن بيئة معزولة عبر `allowed_paths` / `forbidden_paths` المُعدَّة في
`melis-ai-engine/config/app.interface.php` (على سبيل المثال `module`، `public`، `config`، `/tmp` مسموح بها؛
و`/etc`، `/bin`، `/root`… ممنوعة). راجعها قبل تفعيل أدوات الكتابة. وفوق البيئة المعزولة،
يكون نطاق الوكيل محدودًا بقائمة السماح **AI Tools** و**DB Rights** (أعلاه)، بحيث لا يستطيع
النموذج المساس إلا بما منحته له صراحةً.

## الملفات الرئيسية

| الغرض | المسار |
| --- | --- |
| خدمة عميل MCP | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| سِمة إدارة الأدوات | `vendor/melisplatform/melis-ai-engine/src/Service/Traits/Mcp/McpToolManagementTrait.php` |
| إعداد الخادم | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| مثال `mcp.tools.php` | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| مثال خادم | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php` |
| Inspector (الكلاسيكي) | `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php` |
| Inspector (واجهة React) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiMcpInspectorController.php` |
