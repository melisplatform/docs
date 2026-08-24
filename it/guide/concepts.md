# Architettura e concetti

Melis Platform è un'**applicazione MVC Laminas (di derivazione ZF2)**. Sopra lo standard Laminas
aggiunge una manciata di convenzioni che alimentano il backoffice. Comprendere questi cinque
concetti è sufficiente per leggere — ed estendere — quasi ogni parte della piattaforma.

Nella **v6**, il framework e i moduli sono invariati: gli stessi moduli Laminas, lo stesso albero
di configurazione, gli stessi servizi ed eventi. Ciò che è cambiato è la **UI del back-office**: la
v6 introduce un nuovo **back-office React su `/melis-react`** sopra queste stesse fondamenta
invariate (vedi §6). I cinque concetti seguenti descrivono ancora come funziona tutto al di sotto.

## 1. Moduli

Tutto in Melis è un **modulo** (un modulo Laminas standard). L'elenco dei moduli di backoffice
caricati dall'applicazione risiede in:

```
config/melis.module.load.php
```

```php
return [
  'MelisAssetManager',
  'MelisDbDeploy',
  'MelisCore',
  'MelisCms',
  'MelisFront',
  // … i tuoi moduli vanno qui
];
```

Al bootstrap, `config/application.config.php` assembla l'elenco finale dei moduli tramite
`MelisCore\MelisModuleManager` (che unisce questi moduli con i moduli componente e il modulo del
sito selezionato da `MELIS_MODULE`).

Un modulo raggruppa i propri controller, servizi, viste, traduzioni **e** un insieme di file di
configurazione specifici di Melis (vedi sotto). Il suo `Module::getConfig()` li unisce tra loro.
Nella v6 un modulo può **anche** fornire un "brick" React (una piccola UI React) e i propri
endpoint `react-api` — anche questi sono semplicemente configurazione e sorgenti aggiuntivi
all'interno dello stesso modulo (vedi §6).

## 2. L'albero di configurazione e le "melis keys"

Oltre al consueto `module.config.php`, ogni modulo di backoffice pubblica **file di configurazione
dell'app** che vengono uniti in un unico albero interrogabile sotto una radice `plugins`:

| File                  | Dichiara                                                      |
| --------------------- | ------------------------------------------------------------ |
| `app.interface.php`   | Zone/sezioni della UI e i loro **forward** (vedi §3)         |
| `app.tools.php`       | Strumenti: tabelle dati, colonne, filtri, pulsanti di azione |
| `app.toolstree.php`   | Dove uno strumento si aggancia nel **menu di sinistra**      |
| `app.forms.php`       | Definizioni dei form                                         |

Si interroga questo albero attraverso il servizio **`MelisCoreConfig`**
(`vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php`):

```php
$config = $sm->get('MelisCoreConfig');

// Recupera un nodo tramite percorso:
$node = $config->getItem('meliscore_leftmenu');

// Risolve tutte le "melis keys" → percorsi di configurazione completi:
$keys = $config->getMelisKeys();
```

Una **melis key** è un alias stabile e leggibile per un percorso di configurazione profondamente
annidato, dichiarato su un nodo tramite `'conf' => ['melisKey' => 'my_key']`. Consente ai moduli di
riferirsi reciprocamente alla UI senza un accoppiamento rigido a un percorso. Questa stessa
**melisKey** è ciò che il back-office React usa per identificare uno strumento — sia per
instradarvi sia per limitarne l'accesso in base ai diritti (vedi §6).

## 3. Zone e forward (come si esegue il rendering del backoffice)

La UI del backoffice è **guidata dalla configurazione**. Una pagina è un albero di **zone**;
ciascuna zona può dichiarare un **forward** — una terna `module / controller / action` che esegue
il rendering di quella zona:

```php
'forward' => [
  'module'     => 'MelisCms',
  'controller' => 'PageTree',
  'action'     => 'render-page-tree',
],
```

`MelisCore\Controller\PluginViewController` percorre l'albero di configurazione, invia ciascun
forward e assembla l'HTML risultante. È per questo che il menu di sinistra, le intestazioni e gli
strumenti sono tutti dichiarati nella configurazione anziché codificati in modo fisso — ed è per
questo che aggiungere uno strumento è per lo più una questione di **dichiarare la configurazione
corretta** e fornire un controller + una vista.

Nella v6 questo meccanismo di zone/forward è ancora la fonte di verità e alimenta la shell React in
due modi: qualsiasi strumento classico che non ha una schermata React nativa viene reso come
**zona autonoma** e mostrato all'interno della shell in un iframe, e il menu di sinistra che la
shell visualizza è costruito dalla stessa configurazione dell'interfaccia, filtrato in base ai
diritti (vedi §6).

## 4. Servizi e factory

Melis si basa sul **service manager di Laminas**. I servizi sono registrati nel
`module.config.php` di ciascun modulo (`service_manager` → `aliases` / `factories`) e risolti per
nome:

```php
$svc = $this->getServiceManager()->get('MelisCoreConfig');
```

I servizi core comuni includono `MelisCoreConfig`, `MelisCoreAuth`, `MelisCoreRights`,
`MelisCoreUser`, `MelisCoreTool`. I servizi di business tipicamente estendono `MelisGeneralService`
(che aggiunge il dispatching degli eventi); l'accesso al database avviene tramite i wrapper
`TableGateway` di Laminas. Le schermate React della v6 non cambiano questo: un brick React è
semplicemente presentazione — ogni azione che compie richiama gli **stessi servizi lato server**
attraverso gli endpoint `react-api` (vedi §6).

## 5. Eventi

I moduli si agganciano al ciclo di vita della richiesta in `Module::onBootstrap()` e tramite
listener sullo **shared event manager**. Il comportamento core (autenticazione, controllo dei
diritti, messaggi flash, caching…) è collegato in questo modo, e puoi pubblicare/sottoscrivere
eventi Melis personalizzati — ad esempio `melis_core_auth_login_ok` si attiva dopo un login
riuscito.

## 6. Il back-office React (v6)

La v6 mantiene il framework e i moduli ma **sostituisce la UI del back-office** con
un'applicazione React a pagina singola servita su **`/melis-react`** (la UI classica `/melis` è
ancora presente al di sotto). Due idee bastano per farsene un'immagine:

- **Brick** — uno strumento React nativo. Un modulo fornisce un
  `public/ui-react/brick.manifest.json` e un bundle compilato; la shell **scopre** i brick di ogni
  modulo attivo e li monta. Un brick appare **se e solo se** il suo modulo è abilitato — la stessa
  regola di modularità che vale ovunque.
- **Interruttore New / Old** — la maggior parte degli strumenti presenta un selettore in alto a
  destra: **New** = la schermata React nativa, **Old** = lo strumento classico reso all'interno di
  un iframe. Così nulla va perso mentre i moduli vengono progressivamente riscritti in React.

Tutto ciò che la shell mostra attorno ai tuoi strumenti — chi sei, il **menu di sinistra** (già
filtrato in base ai tuoi diritti), il selettore di lingua, i riquadri della **dashboard**, la
scoperta degli strumenti — è assemblato al boot da un piccolo insieme di **endpoint JSON** generici
sotto `/melis/react-api/…`, ciascuno dei quali restituisce un payload `{ success, data, error? }`.
Un overlay globale fluttuante di **Assistente AI** è disponibile su ogni schermata.

![L'overlay dell'Assistente AI React](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant-deployed.png)
*L'Assistente AI fluttuante è disponibile da ogni schermata del back-office React.*

Tre moduli rendono tutto questo possibile, e nessuno di essi è uno strumento a cui navigare:

- **MelisReactApi** — la spina dorsale dell'API JSON. Non disegna alcuna UI; serve l'insieme di
  boot (`/me`, `/menu`, `/langs`, `/assets`, `/react-modules`) più gli endpoint della dashboard e
  dei diritti, e ospita il motore delle **capability** (vedi sotto). Gli endpoint dei dati *propri*
  di uno strumento risiedono nel modulo di quello strumento, non qui.
- **MelisReactOverride** — l'infrastruttura che (a) serve la shell React per `/melis-react` e i suoi
  deep link, e (b) esegue il rendering di qualsiasi strumento classico come pagina autonoma
  (`/melis/react-tool-page?key=<melisKey>`) affinché l'interruttore **Old** e qualsiasi strumento
  non ancora riscritto continuino a funzionare all'interno della shell.
- Ciascun **modulo di funzionalità** (ad esempio `MelisCms`) fornisce i propri brick, le rotte
  `react-api` e le capability.

Le **capability** sono i "diritti avanzati" a grana fine della v6: *all'interno* di uno strumento
già autorizzato, singole azioni (`list`, `create`, `edit`, `delete`, o una scheda annidata) possono
essere negate per utente/ruolo. Sono **default-allow** e **subordinate** al controllo classico di
accesso allo strumento (`MelisCoreRights::canAccess`, invariato) — uno strumento senza dichiarazione
di capability mantiene il CRUD completo. Un modulo dichiara le capability che esistono per la
`melisKey` del suo strumento in `config/react.capabilities.php`; i suoi controller limitano ciascuna
azione con `denyUnlessCan($cap)`.

> Regola pratica: se la shell React lo mostra (menu, intestazione, dashboard, elenco strumenti,
> matrice dei diritti) ma non è la schermata propria di uno strumento specifico, proviene da un
> endpoint MelisReactApi. Se stai guardando uno strumento classico in stile Bootstrap all'interno di
> `/melis-react`, stai vedendo MelisReactOverride rendere quello strumento in un iframe.

Per il contratto completo e i dettagli interni consulta i riferimenti dei moduli:
[MelisReactApi](/it/reference/modules/melis-react-api) e
[MelisReactOverride](/it/reference/modules/melis-react-override); per un esempio pratico di un
modulo multi-brick, [MelisCms](/it/reference/modules/melis-cms).

## Bonus: modifiche al database (dbdeploy e flyway)

Le modifiche allo schema e ai dati iniziali sono versionate:

- **dbdeploy** (`MelisDbDeploy`): ogni modulo fornisce delta SQL numerati; i delta applicati sono
  tracciati in una tabella `changelog` in modo che vengano eseguiti una sola volta. I delta dei
  moduli sono pubblicati in `dbdeploy/`.
- **flyway** (`flyway/sql/`): migrazioni a livello di progetto (ad esempio
  `V3__add_melisai_rights.sql`), applicate con `flyway migrate`.

## Dove guardare nel codice

| Aspetto             | Percorso |
| ------------------- | -------- |
| Elenco moduli       | `config/melis.module.load.php` |
| Bootstrap dell'app  | `config/application.config.php` |
| Config DB piattaforma | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| Servizio di config  | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Rendering zona/forward | `vendor/melisplatform/melis-core/src/Controller/PluginViewController.php` |
| Gestore dei moduli  | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| Shell React (SPA)   | `vendor/melisplatform/melis-core/public/ui-react/` |
| API React + capability | `vendor/melisplatform/melis-react-api/` |
| Infrastruttura shell React e iframe | `vendor/melisplatform/melis-react-override/` |

Prossimo passo: metti tutto insieme [creando il tuo primo strumento](./create-a-tool).
