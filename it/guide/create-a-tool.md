# Crea il tuo primo tool

Un **tool** è una schermata di backoffice (un elenco, un form, una dashboard…) racchiusa in un modulo e
collegata al menu di sinistra. Questa pagina mostra come crearne uno in **Melis v6** e ne illustra
l'anatomia, così potrai estenderlo con sicurezza.

::: tip Leggi prima questo
Assicurati di aver dato un'occhiata ad [Architettura e concetti](./concepts) — i tool si basano sui **moduli**,
sull'**albero di configurazione**, sui **forward** e sui **diritti**. Queste fondamenta restano invariate in v6.
:::

::: info La v6 mantiene il framework, sostituisce la UI
Melis v6 esegue lo **stesso** framework Laminas, gli stessi moduli e lo stesso albero di configurazione della v5. Ciò che è cambiato è il
back-office: la UI classica `/melis` è stata sostituita da una **shell React su `/melis-react`**.
Ora i tool compaiono lì come "bricks" React nativi, e qualsiasi tool che non sia stato riscritto in React
continua a funzionare, invariato, all'interno di un iframe. Quindi il modo in cui *crei* un tool qui sotto è lo stesso; è nuovo solo il
modo in cui lo *usi* nel back-office. Consulta
[MelisReactApi](/it/reference/modules/melis-react-api) e
[MelisReactOverride](/it/reference/modules/melis-react-override) per i dettagli tecnici.
:::

## La via rapida: i wizard di generazione del codice

Melis include generatori GUI che creano per te un tool completo e funzionante. In v6 i due più
comunemente utilizzati sono i **wizard React nativi** nella shell `/melis-react`:

- **[Dashboard Plugin Creator](/it/reference/modules/melis-dashboard-plugin-creator)** — genera un
  widget che compare nella home dashboard del back-office.
- **[Templating Plugin Creator](/it/reference/modules/melis-templating-plugin-creator)** — genera un
  blocco CMS front-end da inserire nelle pagine tramite l'editor delle pagine.

Entrambi si aprono dalla loro voce nel menu di sinistra come scheda in alto, con una **barra dei passaggi** nella parte superiore e un
toggle **New / Old** (in alto a destra, accanto a **Restart**): *New* è il wizard React (predefinito), *Old*
apre il tool classico in un iframe. Ogni passaggio viene validato **lato server** (riutilizzando i form Laminas
legacy) così le regole di business — parole chiave PHP riservate, nomi duplicati di moduli/plugin — sono
esattamente le stesse di prima.

![Dashboard Plugin Creator — Passaggio 1 (Plugin)](/screenshots/react/melis-dashboard-plugin-creator/melisdashboardcreator-tool-step1.png)
*Passaggio 1 del Dashboard Plugin Creator: **Plugin name**, **View type** (Single / Multi-tabs) e
**Plugin destination** (New module / Existing module), con **Next** in fondo.*

Percorri il wizard: dai un nome al tuo plugin, scegli un modulo **nuovo** o **esistente**, localizza i suoi titoli per
lingua, carica una miniatura, seleziona le icone, quindi rivedi un **Summary** in sola lettura. Il passaggio di **Finalization**
è l'unica azione che modifica i dati — scrive su disco i file PHP/view/config/lingua, e per il
ramo *new module* genera il modulo (tramite il servizio sottostante
[MelisToolCreator](/it/reference/modules/melis-tool-creator)), lo registra, lo **attiva**
e ricarica la piattaforma.

![Templating Plugin Creator — Passaggio 6 (Finalization)](/screenshots/react/melis-templating-plugin-creator/melistemplatingplugincreator-tool-step6.png)
*Il passaggio di **Finalization** del Templating Plugin Creator: scegli un **Site** su cui attivare, mantieni
**Activate plugin after creation** attivo, quindi **Finish and create the plugin** — il wizard esegue un conto alla rovescia
e ricarica la piattaforma.*

::: tip Restart / New vs Old
**Restart** (barra degli strumenti in alto) cancella la bozza e torna al passaggio 1. Passando a **Old** si apre il
tool classico in un iframe e si **azzera la bozza condivisa** — il wizard ti avverte prima.
:::

Per un semplice tool di back-office (una schermata elenco/form, non una dashboard o un blocco CMS), il
**MelisToolCreator** sottostante genera comunque uno scheletro completo del modulo (config, controller, servizio, table
model e view). Il resto di questa pagina spiega **cosa producono questi generatori** — così potrai
leggere, modificare e scrivere a mano anche i tool.

## Anatomia di un tool (cosa viene generato)

Questa parte è invariata rispetto alla v5: un tool è ancora un modulo Laminas. Uno tipico si presenta così:

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

> 📎 Le migliori implementazioni di riferimento da cui copiare sono i moduli reali
> `vendor/melisplatform/melis-cms-news/` e `vendor/melisplatform/melis-cms-prospects/`.
> Aprili affiancati mentre costruisci.

### 1. Registra il modulo

`config/melis.module.load.php`:

```php
return [
  // … core modules …
  'MyTool',
];
```

### 2. `Module.php` — assembla la configurazione

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

### 3. `app.toolstree.php` — mostralo nel menu di sinistra

Questo collega il tuo tool a una sezione del menu di sinistra e lo inoltra al suo controller. Il `melisKey`
è l'identificatore stabile; il `forward` punta all'action che effettua il rendering del tool. La shell React
legge questo stesso albero (tramite `GET /melis/react-api/menu`), **filtrato in base ai diritti**, per costruire la sua sidebar —
quindi dichiarare qui il tuo tool è ciò che lo fa comparire in `/melis-react`.

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

### 4. Controller + servizio

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

I servizi estendono `MelisGeneralService` e accedono al database tramite un wrapper `TableGateway`
registrato in `module.config.php`.

::: info Come viene renderizzato il tuo tool in /melis-react
Un tool dichiarato in questo modo non necessita di **alcun codice React** per comparire in v6. La shell React mostra semplicemente la tua
UI `.phtml` esistente all'interno di un iframe servito su `/melis/react-tool-page?key=<melisKey>` — con le sue
DataTables, form, modali e pulsanti di salvataggio che si comportano esattamente come nel classico `/melis`. Tutto questo è
gestito interamente da [MelisReactOverride](/it/reference/modules/melis-react-override); tu non devi toccarlo. Riscrivere un tool come **brick React nativo** (con un `brick.manifest.json` e
endpoint `/melis/react-api/…`) è un upgrade facoltativo — i due wizard creator qui sopra ne sono esempi —
non un requisito.
:::

### 5. Rendilo visibile — i diritti

Anche quando un tool è dichiarato correttamente, la sezione del menu di sinistra compare solo per gli utenti i cui
**diritti** la includono. I diritti sono memorizzati come allow-list XML in `melis_core_user.usr_rights`:
una sezione è visibile quando la sua `*_toolstree_section` è elencata lì. Il menu `/melis-react` è
filtrato esattamente in base a questi diritti, quindi una sezione non elencata è nascosta anche nella shell React.

Concedi l'accesso dall'editor di back-office **Users → Rights** (seleziona il tuo tool per il ruolo/utente e
salva). Per l'automazione, puoi anche iniettare la sezione nell'XML dei diritti tramite una migration — vedi
come la piattaforma lo fa per il menu AI in `flyway/sql/V3__add_melisai_rights.sql`.

::: tip La v6 ha anche i "diritti avanzati" (capabilities)
Oltre all'*accesso* al tool, la v6 aggiunge **capabilities** granulari (`list` / `create` / `edit` /
`delete`, o schede annidate) che regolano le parti interne di un tool già autorizzato. Sono
**default-allow** — un tool che non ne dichiara nessuna mantiene il CRUD completo, quindi è opt-in. Se lo desideri,
dichiara un `config/react.capabilities.php` nel tuo modulo e proteggi le tue action React-API con
`denyUnlessCan('edit')`. Il contratto completo è descritto in
[MelisReactApi](/it/reference/modules/melis-react-api).
:::

## Riepilogo

1. Genera con un **wizard** (Dashboard / Templating Plugin Creator) oppure copia `melis-cms-news`.
2. **Registra** il modulo in `config/melis.module.load.php`.
3. Dichiaralo in **`app.toolstree.php`** (menu) e **`app.interface.php`** (zone interne).
4. Implementa **controller + servizio + view**.
5. Concedi i **diritti** affinché compaia nel menu.

Ora hai un tool funzionante che compare nel back-office `/melis-react` — come iframe per un
tool `.phtml` classico, o come brick nativo se lo hai riscritto in React. Da qui, esplora
`app.tools.php` per collegare una tabella dati completa (colonne, filtri, pulsanti di azione) come fanno i moduli
CMS.
