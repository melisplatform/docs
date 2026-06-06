# Create your first tool

A **tool** is a backoffice screen (a list, a form, a dashboard…) packaged inside a module and
attached to the left-hand menu. This page shows the two ways to create one and explains the
anatomy of a tool so you can extend it confidently.

::: tip Read this first
Make sure you've skimmed [Architecture & concepts](./concepts) — tools are built on **modules**,
the **config tree**, **forwards** and **rights**.
:::

## The fast path: the Tool Creator

Melis ships **MelisToolCreator**, a GUI generator in the backoffice that scaffolds a complete,
working tool (module skeleton, config, controllers, service, table model and views).

1. In the backoffice, open the **Tool Creator** (under the *Designs* section of the left menu).
2. Follow the wizard: name your tool, pick the database table it manages, choose columns/fields.
3. It generates a new module under **`module/<YourTool>/`**.
4. **Register it** by adding its name to `config/melis.module.load.php`, then reload.

The generator is the recommended starting point. The rest of this page explains **what it
generates** — so you can read, tweak and hand-write tools too.

## Anatomy of a tool (what gets generated)

A typical module looks like this:

```
module/MyTool/
├── src/Module.php                 # merges the config files below
├── config/
│   ├── module.config.php          # routes, services, controllers, view paths
│   ├── app.interface.php          # the tool's internal UI zones + forwards
│   ├── app.tools.php              # table columns, filters, action buttons
│   └── app.toolstree.php          # where the tool sits in the left menu
├── src/MyTool/
│   ├── Controller/                # *Controller.php (extend MelisAbstractActionController)
│   ├── Service/                   # *Service.php   (extend MelisGeneralService)
│   └── Model/Tables/              # *Table.php      (Laminas TableGateway wrappers)
├── view/melis-my-tool/            # .phtml templates
└── language/{en_EN,fr_FR}.interface.php
```

> 📎 The best reference implementations to copy from are the real modules
> `vendor/melisplatform/melis-cms-news/` and `vendor/melisplatform/melis-cms-prospects/`.
> Open them side by side as you build.

### 1. Register the module

`config/melis.module.load.php`:

```php
return [
  // … core modules …
  'MyTool',
];
```

### 2. `Module.php` — assemble the config

```php
namespace MyTool;

use Laminas\ModuleManager\Feature\ConfigProviderInterface;
use Laminas\Stdlib\ArrayUtils;

class Module implements ConfigProviderInterface
{
    public function getConfig()
    {
        $config = [];
        foreach ([
            __DIR__ . '/../config/module.config.php',
            __DIR__ . '/../config/app.interface.php',
            __DIR__ . '/../config/app.tools.php',
            __DIR__ . '/../config/app.toolstree.php',
        ] as $file) {
            $config = ArrayUtils::merge($config, include $file);
        }
        return $config;
    }
}
```

### 3. `app.toolstree.php` — show it in the left menu

This attaches your tool under a left-menu section and forwards to its controller. The `melisKey`
is the stable identifier; the `forward` points at the action that renders the tool.

```php
return ['plugins' => ['meliscore' => ['interface' => ['meliscore_leftmenu' => ['interface' => [
  'meliscustom_toolstree_section' => ['interface' => [
    'mytool_tool' => [
      'conf' => [
        'id'       => 'id_mytool_tool',
        'melisKey' => 'mytool_tool',
        'name'     => 'tr_mytool_title',   // translation key
        'icon'     => 'fa fa-puzzle-piece',
      ],
      'forward' => [
        'module'     => 'MyTool',
        'controller' => 'MyTool',
        'action'     => 'render-mytool',
      ],
    ],
  ]],
]]]]]];
```

### 4. Controller + service

```php
// src/MyTool/Controller/MyToolController.php
namespace MyTool\Controller;

use Laminas\View\Model\ViewModel;
use Laminas\View\Model\JsonModel;
use MelisCore\Controller\MelisAbstractActionController;

class MyToolController extends MelisAbstractActionController
{
    public function renderMytoolAction()
    {
        $view = new ViewModel();
        $view->melisKey = $this->params()->fromRoute('melisKey', '');
        return $view; // renders view/melis-my-tool/my-tool/render-mytool.phtml
    }

    public function getListAction()
    {
        $items = $this->getServiceManager()->get('MyToolService')->getList();
        return new JsonModel(['data' => $items]);
    }
}
```

Services extend `MelisGeneralService` and reach the database through a `TableGateway` wrapper
registered in `module.config.php`.

### 5. Make it visible — rights

Even when a tool is correctly declared, the left-menu section only appears for users whose
**rights** include it. Rights are stored as an XML allow-list in `melis_core_user.usr_rights`:
a section is visible when its `*_toolstree_section` is listed there.

Grant access from the backoffice via **Access management** (check your tool for the role/user and
save). For automation, you can also inject the section into the rights XML with a migration — see
how the platform does it for the AI menu in `flyway/sql/V3__add_melisai_rights.sql`.

## Recap

1. Generate with the **Tool Creator** (or copy `melis-cms-news`).
2. **Register** the module in `config/melis.module.load.php`.
3. Declare it in **`app.toolstree.php`** (menu) and **`app.interface.php`** (internal zones).
4. Implement **controller + service + view**.
5. Grant **rights** so it shows up in the menu.

You now have a working backoffice tool. From here, explore `app.tools.php` to wire a full data
table (columns, filters, action buttons) like the CMS modules do.
