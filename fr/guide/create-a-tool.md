# Créer votre premier tool

Un **tool** est un écran de backoffice (une liste, un formulaire, un dashboard…) packagé dans un
module et rattaché au menu de gauche. Cette page montre comment en créer un dans **Melis v6** et
explique l'anatomie d'un tool pour que vous puissiez l'étendre sereinement.

::: tip À lire d'abord
Assurez-vous d'avoir survolé [Architecture & concepts](./concepts) — les tools reposent sur les
**modules**, l'**arbre de config**, les **forwards** et les **droits**. Ces fondations sont
inchangées en v6.
:::

::: info v6 conserve le framework, remplace l'UI
Melis v6 fait tourner le **même** framework Laminas, les mêmes modules et le même arbre de config
que v5. Ce qui a changé, c'est le backoffice : l'UI classique `/melis` a été remplacée par un
**shell React sur `/melis-react`**. Les tools y apparaissent désormais sous forme de « briques »
natives React, et tout tool qui n'a pas été réécrit en React continue de tourner, inchangé, à
l'intérieur d'une iframe. Ainsi, la façon de *construire* un tool ci-dessous reste la même ; seule
la façon de l'*utiliser* dans le backoffice est nouvelle. Voir
[MelisReactApi](/fr/reference/modules/melis-react-api) et
[MelisReactOverride](/fr/reference/modules/melis-react-override) pour la tuyauterie.
:::

## La voie rapide : les assistants de génération de code

Melis fournit des générateurs graphiques qui scaffoldent pour vous un tool complet et fonctionnel.
En v6, les deux plus couramment utilisés sont des **assistants natifs React** dans le shell
`/melis-react` :

- **[Dashboard Plugin Creator](/fr/reference/modules/melis-dashboard-plugin-creator)** — scaffolde
  un widget qui s'affiche sur le dashboard d'accueil du backoffice.
- **[Templating Plugin Creator](/fr/reference/modules/melis-templating-plugin-creator)** —
  scaffolde un bloc CMS front-end que vous déposez sur vos pages dans l'éditeur de page.

Les deux s'ouvrent depuis leur entrée du menu de gauche sous forme d'onglet principal, avec une
**barre d'étapes** en haut et un bascule **New / Old** (en haut à droite, à côté de **Restart**) :
*New* est l'assistant React (par défaut), *Old* ouvre le tool classique dans une iframe. Chaque
étape est validée **côté serveur** (en réutilisant les formulaires Laminas historiques), de sorte
que les règles métier — mots-clés PHP réservés, noms de module/plugin en doublon — sont exactement
les mêmes qu'avant.

![Dashboard Plugin Creator — Étape 1 (Plugin)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)
*Étape 1 du Dashboard Plugin Creator : **Plugin name**, **View type** (Single / Multi-tabs) et
**Plugin destination** (New module / Existing module), avec **Next** en bas.*

Parcourez l'assistant : nommez votre plugin, choisissez un module **nouveau** ou **existant**,
localisez ses titres par langue, uploadez une vignette, choisissez des icônes, puis relisez un
**Summary** en lecture seule. L'étape **Finalization** est la seule action mutante — elle écrit les
fichiers PHP/vue/config/langue sur disque, et pour la branche *nouveau module* elle scaffolde le
module (via le service sous-jacent [MelisToolCreator](/fr/reference/modules/melis-tool-creator)),
l'enregistre, l'**active** et recharge la plateforme.

![Templating Plugin Creator — Étape 6 (Finalization)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)
*L'étape **Finalization** du Templating Plugin Creator : choisissez un **Site** sur lequel activer,
gardez **Activate plugin after creation** coché, puis **Finish and create the plugin** — l'assistant
décompte et recharge la plateforme.*

::: tip Restart / New vs Old
**Restart** (barre d'outils du haut) efface le brouillon et revient à l'étape 1. Basculer sur
**Old** ouvre le tool classique dans une iframe et **réinitialise le brouillon partagé** —
l'assistant vous avertit au préalable.
:::

Pour un simple tool backoffice (un écran liste/formulaire, pas un dashboard ni un bloc CMS), le
service sous-jacent **MelisToolCreator** scaffolde toujours un squelette de module complet (config,
contrôleurs, service, modèle de table et vues). La suite de cette page explique **ce que produisent
ces générateurs** — pour que vous puissiez lire, ajuster et écrire des tools à la main aussi.

## Anatomie d'un tool (ce qui est généré)

Cette partie est inchangée depuis v5 : un tool reste un module Laminas. Un module typique ressemble
à ceci :

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
`melisKey` est l'identifiant stable ; le `forward` pointe vers l'action qui rend le tool. Le shell
React lit ce même arbre (via `GET /melis/react-api/menu`), **filtré par les droits**, pour
construire sa barre latérale — déclarer votre tool ici est donc ce qui le fait apparaître dans
`/melis-react`.

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

::: info Comment votre tool s'affiche dans /melis-react
Un tool déclaré ainsi ne nécessite **aucun code React** pour apparaître en v6. Le shell React
affiche simplement votre UI `.phtml` existante à l'intérieur d'une iframe servie sur
`/melis/react-tool-page?key=<melisKey>` — avec ses propres DataTables, formulaires, modales et
boutons d'enregistrement se comportant exactement comme sous le `/melis` classique. Tout cela est
géré intégralement par [MelisReactOverride](/fr/reference/modules/melis-react-override) ; vous n'y
touchez pas. Réécrire un tool en **brique native React** (avec un `brick.manifest.json` et des
endpoints `/melis/react-api/…`) est une évolution optionnelle — les deux assistants créateurs
ci-dessus en sont des exemples — pas une obligation.
:::

### 5. Le rendre visible — les droits

Même correctement déclaré, un tool n'apparaît dans la section du menu de gauche que pour les
utilisateurs dont les **droits** l'incluent. Les droits sont stockés en liste blanche XML dans
`melis_core_user.usr_rights` : une section est visible quand son `*_toolstree_section` y figure. Le
menu `/melis-react` est filtré exactement par ces mêmes droits, donc une section non listée est
également masquée dans le shell React.

Accordez l'accès depuis l'éditeur **Utilisateurs → Droits** du backoffice (cochez votre tool pour
le rôle/l'utilisateur et enregistrez). Pour automatiser, vous pouvez aussi injecter la section dans
le XML des droits via une migration — voyez comment la plateforme le fait pour le menu IA dans
`flyway/sql/V3__add_melisai_rights.sql`.

::: tip v6 ajoute aussi des « droits avancés » (capabilities)
En plus de l'*accès* au tool, v6 ajoute des **capabilities** fines (`list` / `create` / `edit` /
`delete`, ou onglets imbriqués) qui verrouillent les parties internes d'un tool déjà autorisé. Elles
sont **permissives par défaut** — un tool qui n'en déclare aucune conserve le CRUD complet, c'est
donc de l'opt-in. Si vous en voulez, déclarez un `config/react.capabilities.php` dans votre module
et protégez vos actions React-API avec `denyUnlessCan('edit')`. Le contrat complet se trouve dans
[MelisReactApi](/fr/reference/modules/melis-react-api).
:::

## Récapitulatif

1. Générez avec un **assistant** (Dashboard / Templating Plugin Creator) ou copiez `melis-cms-news`.
2. **Enregistrez** le module dans `config/melis.module.load.php`.
3. Déclarez-le dans **`app.toolstree.php`** (menu) et **`app.interface.php`** (zones internes).
4. Implémentez **contrôleur + service + vue**.
5. Accordez les **droits** pour qu'il apparaisse dans le menu.

Vous avez maintenant un tool fonctionnel qui apparaît dans le backoffice `/melis-react` — sous forme
d'iframe pour un tool `.phtml` classique, ou de brique native si vous l'avez réécrit en React. À
partir de là, explorez `app.tools.php` pour câbler une table de données complète (colonnes, filtres,
boutons d'action) comme le font les modules CMS.
