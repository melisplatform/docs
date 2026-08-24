# Créer votre premier tool

Un **tool** est un écran de backoffice (une liste, un formulaire, un dashboard…) packagé dans un
module et rattaché au menu de gauche. Cette page montre les deux façons d'en créer un et explique
l'anatomie d'un tool pour que vous puissiez l'étendre sereinement.

::: tip À lire d'abord
Survolez d'abord [Architecture & concepts](./concepts) — les tools reposent sur les **modules**,
l'**arbre de config**, les **forwards** et les **droits**.
:::

## La voie rapide : le Tool Creator

Melis fournit **MelisToolCreator**, un générateur graphique dans le backoffice qui scaffolde un
tool complet et fonctionnel (squelette de module, config, contrôleurs, service, modèle de table et
vues).

1. Dans le backoffice, ouvrez le **Tool Creator** (section *Designs* du menu de gauche).
2. Suivez l'assistant : nommez votre tool, choisissez la table gérée, sélectionnez colonnes/champs.
3. Il génère un nouveau module sous **`module/<VotreTool>/`**.
4. **Enregistrez-le** en ajoutant son nom à `config/melis.module.load.php`, puis rechargez.

Le générateur est le point de départ recommandé. La suite explique **ce qu'il génère** — pour que
vous puissiez lire, ajuster et écrire des tools à la main.

## Anatomie d'un tool (ce qui est généré)

Un module typique ressemble à ceci :

```
module/MyTool/
├── src/Module.php                 # fusionne les fichiers de config ci-dessous
├── config/
│   ├── module.config.php          # routes, services, contrôleurs, chemins de vues
│   ├── app.interface.php          # les zones d'UI internes du tool + forwards
│   ├── app.tools.php              # colonnes de table, filtres, boutons d'action
│   └── app.toolstree.php          # emplacement du tool dans le menu de gauche
├── src/MyTool/
│   ├── Controller/                # *Controller.php (étend MelisAbstractActionController)
│   ├── Service/                   # *Service.php   (étend MelisGeneralService)
│   └── Model/Tables/              # *Table.php      (wrappers Laminas TableGateway)
├── view/melis-my-tool/            # templates .phtml
└── language/{en_EN,fr_FR}.interface.php
```

> 📎 Les meilleures implémentations de référence à copier sont les vrais modules
> `vendor/melisplatform/melis-cms-news/` et `vendor/melisplatform/melis-cms-prospects/`.
> Gardez-les ouverts côte à côte pendant que vous construisez.

### 1. Enregistrer le module

`config/melis.module.load.php` :

```php
return [
  // … modules cœur …
  'MyTool',
];
```

### 2. `Module.php` — assembler la config

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

### 3. `app.toolstree.php` — l'afficher dans le menu de gauche

Ceci rattache votre tool à une section du menu de gauche et forwarde vers son contrôleur. La
`melisKey` est l'identifiant stable ; le `forward` pointe vers l'action qui rend le tool.

```php
return ['plugins' => ['meliscore' => ['interface' => ['meliscore_leftmenu' => ['interface' => [
  'meliscustom_toolstree_section' => ['interface' => [
    'mytool_tool' => [
      'conf' => [
        'id'       => 'id_mytool_tool',
        'melisKey' => 'mytool_tool',
        'name'     => 'tr_mytool_title',   // clé de traduction
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

### 4. Contrôleur + service

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
        return $view; // rend view/melis-my-tool/my-tool/render-mytool.phtml
    }

    public function getListAction()
    {
        $items = $this->getServiceManager()->get('MyToolService')->getList();
        return new JsonModel(['data' => $items]);
    }
}
```

Les services étendent `MelisGeneralService` et atteignent la base via un wrapper `TableGateway`
enregistré dans `module.config.php`.

### 5. Le rendre visible — les droits

Même correctement déclaré, un tool n'apparaît dans le menu de gauche que pour les utilisateurs
dont les **droits** l'incluent. Les droits sont stockés en liste blanche XML dans
`melis_core_user.usr_rights` : une section est visible quand son `*_toolstree_section` y figure.

Accordez l'accès depuis le backoffice via **Gestion des accès** (cochez votre tool pour le
rôle/l'utilisateur et enregistrez). Pour automatiser, vous pouvez aussi injecter la section dans
le XML des droits via une migration — voyez comment la plateforme le fait pour le menu IA dans
`flyway/sql/V3__add_melisai_rights.sql`.

## Récapitulatif

1. Générez avec le **Tool Creator** (ou copiez `melis-cms-news`).
2. **Enregistrez** le module dans `config/melis.module.load.php`.
3. Déclarez-le dans **`app.toolstree.php`** (menu) et **`app.interface.php`** (zones internes).
4. Implémentez **contrôleur + service + vue**.
5. Accordez les **droits** pour qu'il apparaisse dans le menu.

Vous avez maintenant un tool backoffice fonctionnel. Ensuite, explorez `app.tools.php` pour câbler
une table de données complète (colonnes, filtres, boutons d'action) comme le font les modules CMS.
