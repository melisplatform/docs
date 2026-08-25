# MCP (بروتوكول سياق النموذج)

يدمج Melis **[بروتوكول سياق النموذج (Model Context Protocol)](https://modelcontextprotocol.io/)** بحيث يستطيع
[الوكلاء](./ai) الذكاء الاصطناعي استدعاء **أدوات** — قراءة/كتابة الملفات، تنفيذ عمليات قواعد البيانات، توليد هياكل الوحدات —
أثناء التشغيل. كما أن Melis هو **خادم** MCP أيضًا: يمكن كشف الأدوات نفسها عبر HTTP لعملاء MCP خارجيين.
تشرح هذه الصفحة كيفية عمل ذلك، وكيفية إضافة أداة MCP خاصة بك، وكيفية كشفها.

::: info المحرك نفسه، مكتب خلفي جديد
حافظ Melis v6 على محرك الذكاء الاصطناعي ووحداته دون تغيير؛ واستبدل المكتب الخلفي بـ **واجهة React
على `/melis-react`**. كل ما في هذه الصفحة حول كيفية عمل MCP — العميل، وإعداد `mcp.tools.php`،
وإطلاق الخوادم عبر stdio، والأمان — مطابق تمامًا لـ v5. الأجزاء الوحيدة التي انتقلت هي *أماكن النقر*
التي أصبحت ضمن أدوات React الجديدة (**Melis AI ← Admin ← MCP Server**، وقائمة السماح **AI Tools**
الخاصة بالوكيل، و**MCP Inspector**). وهذه مذكورة أدناه.
:::

::: info عميل *وخادم*
يعمل Melis كـ **عميل MCP**: فهو يُطلق **خوادم** MCP محلية (عمليات PHP، نقل عبر stdio)
ويستدعي أدواتها عندما يطلبها النموذج.

وأصبح Melis قادرًا الآن على العمل كـ **خادم MCP** أيضًا — إذ يمكن كشف الأدوات نفسها عبر
**Streamable HTTP** لعملاء MCP خارجيين (Claude Desktop، وMCP Inspector، وتكاملاتك الخاصة).
لا شيء يكون قابلًا للوصول قبل أن تكشفه صراحةً: راجع **كشف الأدوات للعملاء الخارجيين** أدناه.
:::

## خوادم MCP المُضمّنة

تشحن المنصة افتراضيًا **ستة** خوادم MCP موزَّعة على ثلاث وحدات (مُعلَنة في
`melis-ai-engine/config/app.interface.php` وفي ملفات `mcp.tools.php` الخاصة بالوحدات):

| الخادم (مفتاح الإعداد) | المجلد | الوحدة | الأدوات |
| --- | --- | --- | --- |
| `file_operations` | `mcp/filemcp` | `melis-ai` | `createFile`, `createDirectory`, `pathExists`, `readFile`, `updateFiles`, `deleteFile`, `deleteDirectory` |
| `database_operations` | `mcp/dbmcp` | `melis-ai` | `get_table_structure`, `create_database_table`, `add_db_table_columns`, `update_db_table_columns`, `drop_db_table_columns`, `drop_database_table`, `selectData`, `insertData`, `updateData`, `deleteData`, `bulkInsertData` |
| `module_documents` | `mcp/documentationmcp` | `melis-ai` | `getDocModuleList`, `getModuleDoc`, `getModuleDocImage` |
| `navigation_operations` | `mcp/navigationmcp` | `melis-ai` | `listBackOfficeTools`, `openBackOfficeTool`, `listCmsPages`, `resolveHomepage`, `openCmsPage`, `navStep` |
| `tool_creator` | `mcp/toolcreator` | `melis-ai-tool-creator` | `createModule`, `activateModule`, `deactivateModule`, `generateBundle` |
| `minitemplate_creator` | `mcp/minitemplatecreator` | `melis-ai-community-extensions` | `readSiteAssets`, `getSitePublicUrl`, `uploadMinitemplateImages`, `renderMinitemplatePreview` |

يوفّر كل خادم **وضعَي تشغيل** انطلاقًا من تنفيذ الأدوات نفسه:

- **stdio** — `bin/server.php`، مثل `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php`.
  هذا ما يُطلقه المحرك أثناء تشغيل الوكلاء داخل المنصة، وما يمكن لعميل سطح مكتب محلي الاتصال به.
  غير قابل للوصول عبر الشبكة.
- **HTTP** — `public/index.php`، يُقدَّم عبر `bin/serve.php` (غلاف حول `php -S`).
  هذا هو الوضع القابل للكشف على الشبكة، وهو الوحيد الذي يطبّق قائمة السماح أدناه.

::: tip الخوادم موزَّعة على عدة وحدات
ليست كلها ضمن `melis-ai`. لحصر ما تحتويه نسخة تثبيت معيّنة فعليًا:
```bash
ls -d vendor/melisplatform/melis-ai*/mcp/*/
```
`navigationmcp` حالة خاصة — إذ ليس له مجلد `vendor/` خاص به، بل يستعير مُحمِّل `dbmcp`.
:::
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

## كشف الأدوات للعملاء الخارجيين (وضع الخادم)

تشغيل خادم في **وضع HTTP** يجعل أدواته قابلة للاستدعاء من أي عميل MCP يستطيع الوصول إليه،
لذلك جرى تقييد الكشف عمدًا على عدة طبقات. يأتي الدليل التشغيلي الكامل (Docker محليًا ثم Kubernetes)
مرفقًا مع الحزمة في `vendor/melisplatform/melis-ai/mcp/MCP-EXPOSURE-GUIDE.md`؛ وما يلي ملخّصه.

### قائمة الأدوات المكشوفة

يقرأ ملف `public/index.php` في كل خادم جدول **`melis_ai_mcp_exposed_tools`** عند الإقلاع،
ولا يسجّل *سوى* الأدوات المدرجة فيه:

```php
$names        = $pdo->query('SELECT met_tool_name FROM melis_ai_mcp_exposed_tools')
                    ->fetchAll(PDO::FETCH_COLUMN);
$exposedNames = array_flip($names);

foreach ($allTools as $toolName => $callable) {
    if (isset($exposedNames[$toolName])) {
        $builder->addTool($callable);
    }
}
```

**الجدول الفارغ — أو قاعدة بيانات غير قابلة للوصول — لا يكشف شيئًا**. وهذا هو الضمان الأساسي:
الأدوات المُدمِّرة مثل `deleteData` أو `drop_database_table` تبقى ببساطة خارج الجدول.
ويجب أن تطابق القيم مفاتيح camelCase في `$allTools` داخل `public/index.php` لكل خادم.

أدِر القائمة من مكتب React الخلفي عبر **Melis AI ← Admin ← MCP Server ← MCP Exposition** —
وهي قائمة مراجعة بكل الدوال المُعلَنة؛ تحديد أداة يُدرِج سطرها، وإلغاء التحديد يحذفه.
ويستند ذلك إلى `MelisReactApiAiMcpServerController` (`GET /melis/react-api/ai-mcp-server/data`،
و`POST …/save-tools`) وإلى النموذج `MelisAIMcpExposedToolTable`.

::: warning تحقّق من نقطة الدخول قبل الكشف
وجود `public/index.php` ضمن الحزمة لا يعني أنه آمن تلقائيًا. فبعض الخوادم تشحن سلسلة
`Server::builder()->addTool(…)->build()` بسيطة تسجّل **كل** الأدوات دون أي ترشيح من قاعدة البيانات.
افتح الملف وتأكّد من وجود حلقة `$allTools` مع PDO المذكورة أعلاه قبل وضعه على الشبكة.
:::

### تشغيل خادم عبر HTTP

يُشغِّل `bin/serve.php` خادم الويب المدمج في PHP على `public/`، قارئًا `MCP_HOST` و`MCP_PORT`:

```bash
MCP_HOST=0.0.0.0 MCP_PORT=6276 php vendor/melisplatform/melis-ai/mcp/dbmcp/bin/serve.php
```

في بيئة Docker يعمل كل خادم كبرنامج **supervisord** طويل الأمد.
توزيع المنافذ المرجعي (داخلي فقط — أما خارجيًا فكل شيء على 443):

| Port | الخادم |
| --- | --- |
| 6274 | UI MCP Inspector |
| 6275 | `filemcp` |
| 6276 | `dbmcp` |
| 6277 | Proxy MCP Inspector |
| 6278 | `documentationmcp` |
| 6279 | `navigationmcp` |
| 6280 | `toolcreator` |
| 6281 | `minitemplatecreator` |

تحتاج نقطة دخول HTTP إلى `nyholm/psr7` و`nyholm/psr7-server` و`laminas/laminas-httphandlerrunner`.
الخوادم ضمن `melis-ai/mcp/*` تشحنها بالفعل؛ أما خوادم الوحدات الأخرى فتحتاج عادةً إلى إضافتها.

### التحقّق

يستجيب كل خادم لـ `GET /healthz` بـ `ok`، لكن **healthz وحده لا يثبت شيئًا** — فهو يعود قبل
إقلاع PSR-7، ما يعني أن خادمًا بمُحمِّل Composer قديم سيجتاز healthz ثم ينهار عند أول طلب حقيقي.
أرسِل دائمًا مصافحة حقيقية أيضًا:

```bash
curl -s -X POST http://127.0.0.1:6276/ \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```

وجود `"result"` بصيغة JSON-RPC في الاستجابة يعني أن الخادم يعمل فعلًا.

### النشر عن بُعد

في Kubernetes تقع الخوادم خلف nginx ingress مع TLS على المنفذ 443 وقائمة سماح لعناوين IP
(`whitelist-source-range`)، بحيث لا تكون منافذ `627x` قابلة للوصول مباشرةً أبدًا.
وهناك استراتيجيتان للتوجيه: اسم مضيف لكل خادم (`https://dbmcp.<domain>/`)، أو — وهو المُوصى به عند
كشف عدة خوادم — مضيف واحد مع توجيه بالمسار (`https://mcp.<domain>/dbmcp`)، حيث يزيل
`use-regex` مع `rewrite-target` البادئة ليظل كل خادم خلفي يرى `/` و`/healthz`.
والتحويل بينهما لاحقًا يقتصر على ingress وحده.

::: danger `composer update` يمحو التعديلات داخل vendor
تقع نقاط الدخول هذه ضمن `vendor/`. وتشغيل `composer update melisplatform/melis-ai`
(أو الوحدات الأخرى الحاملة لـ MCP) يعيد استخراج الحزمة وقد يُرجع ملف `public/index.php` المُرشَّح
من قاعدة البيانات إلى كشف كل شيء. أعِد التحقّق بعد كل تحديث، واعتمد التغييرات الدائمة في مستودعات
الحزم الأصلية بدلًا من `vendor/`.
:::

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

وفي **وضع الخادم** تتراكم الطبقات: يجب أن تكون الأداة موجودة في `melis_ai_mcp_exposed_tools`
كي تُسجَّل أصلًا، ويقيّد ingress المتصلين بحسب عنوان IP المصدر فوق TLS، وتظل بيئة عزل
الملفات/قاعدة البيانات سارية على كل ما يُنفَّذ. اكشف أصغر مجموعة مفيدة — الأدوات للقراءة فقط أولًا —
وأبقِ الأدوات المُدمِّرة خارج القائمة.

## الملفات الرئيسية

| الغرض | المسار |
| --- | --- |
| خدمة عميل MCP | `vendor/melisplatform/melis-ai-engine/src/Service/MelisAIEngineMcpService.php` |
| سِمة إدارة الأدوات | `vendor/melisplatform/melis-ai-engine/src/Service/Traits/Mcp/McpToolManagementTrait.php` |
| إعداد الخادم | `vendor/melisplatform/melis-ai-engine/config/app.interface.php` |
| مثال `mcp.tools.php` | `vendor/melisplatform/melis-ai-tool-creator/config/mcp.tools.php` |
| مثال خادم (stdio) | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/server.php` |
| مثال خادم (HTTP) | `vendor/melisplatform/melis-ai/mcp/dbmcp/public/index.php` |
| مُطلِق HTTP | `vendor/melisplatform/melis-ai/mcp/dbmcp/bin/serve.php` |
| دليل الكشف | `vendor/melisplatform/melis-ai/mcp/MCP-EXPOSURE-GUIDE.md` |
| نموذج الأدوات المكشوفة | `vendor/melisplatform/melis-ai/src/Model/Tables/MelisAIMcpExposedToolTable.php` |
| تبويب MCP Server (واجهة React) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiAiMcpServerController.php` |
| Inspector (الكلاسيكي) | `vendor/melisplatform/melis-ai/src/Controller/McpInspectorController.php` |
| Inspector (واجهة React) | `vendor/melisplatform/melis-ai/src/Controller/React/MelisReactApiMcpInspectorController.php` |
