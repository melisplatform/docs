# MelisCmsSiteRobot

> Modifica e distribuzione dinamica del `robots.txt` per dominio, con un back-office nativo full-React. Pacchetto `melisplatform/melis-cms-site-robot`.

## Scopo

`MelisCmsSiteRobot` consente di gestire il `robots.txt` di ciascun dominio del sito dal back-office e
lo distribuisce dinamicamente su `https://<domain>/robots.txt` — direttamente dal database, senza alcun
file statico da mantenere. Le modifiche hanno effetto immediato dopo il salvataggio. Il testo del robots
è memorizzato con una riga per dominio in una tabella dedicata; non esiste alcuna variante per pagina o
per lingua.

Nel back-office React v6 (`/melis-react`) lo strumento è distribuito come **brick nativo full-React** — una
vera lista + editor React che richiama un livello JSON `react-api` — con un interruttore **New / Old** che
ripiega sullo strumento legacy in un iframe. Il modello dati sottostante, i table gateway del motore e la
rotta front dinamica `/robots.txt` sono invariati rispetto alla v5.

## Attivazione

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisCmsSiteRobot',
];
```

Dipendenze: `melis-core` e `melis-cms`. Il modulo è `dbdeploy: true`, quindi la sua tabella viene creata
automaticamente, e riutilizza i table gateway forniti da `melis-engine` a runtime. Il brick React
compare **solo se il modulo è attivato** — l'host lo individua tramite `brick.manifest.json`
(`GET /melis/react-api/react-modules`); rimuovendo il modulo da `melis.module.load.php` esso scompare
dal menu.

## Back-office (React)

**Dove:** barra laterale sinistra → gruppo **MelisCms** → **Robots.txt** (rotta ad albero `/melis-cms/site-robot`).
Si apre come scheda principale denominata **Robots.txt**, con due livelli esposti come sotto-schede native dell'host:
**lista dei domini del sito → l'editor del robots.txt di un dominio**.

![Lista Robots.txt React — schede KPI (Domini / Con robots.txt / Senza robots.txt), una casella "Search a domain…", un filtro "All sites", Reset filters / Columns / Export, l'interruttore New/Old e un aggiornamento, con per ogni riga Domain / Site / Env. e un badge Set/None più un'azione di modifica](/screenshots/react/melis-cms-site-robot/meliscmssiterobot-tool-robots-list.png)

### Livello 1 — la lista dei domini

La lista mostra **ogni dominio del sito presente sulla piattaforma** (una riga per dominio, alimentata dallo
strumento **Sites**). Offre **schede KPI** (Domini / Con robots.txt / Senza robots.txt), una casella di
**ricerca** (corrisponde al nome del dominio o del sito), un filtro **All sites**, un gestore di **colonne**,
un pulsante **Export** e **Reset filters**. La lista scorre in modo infinito (keyset) con ordinamento
lato server. Colonne: **ID**, **Domain**, **Site**, **Env.**, **robots.txt** (un badge per riga **Set / None**).
Ogni riga dispone di un'azione di **modifica** (matita) e, quando è presente del contenuto, di un'azione di
**eliminazione** (svuota).

Non c'è **alcun "+ New" e nessuna eliminazione di dominio** — i domini provengono dallo strumento Sites;
puoi soltanto modificare o svuotare il robots.txt di ciascun dominio.

### Livello 2 — modifica del robots.txt di un dominio

L'apertura di un dominio aggiunge una **sotto-scheda** (con un pulsante **← Back**). L'editor mostra il
**Domain** e il **Site** in sola lettura, più una grande area di testo monospazio **robots.txt content** per
il corpo. **Save** (in alto a destra) lo rende persistente, e viene distribuito in tempo reale sul `/robots.txt`
di quel dominio. Lasciarlo vuoto non distribuisce nulla.

![Editor robots.txt React — campi Domain e Site in sola lettura, un'area di testo monospazio "robots.txt content", la sotto-scheda ← Back e un pulsante Save in alto a destra](/screenshots/react/melis-cms-site-robot/meliscmssiterobot-tool-robots-edit.png)

### Interruttore New / Old

L'interruttore **New / Old** in alto a destra commuta l'intero strumento tra l'interfaccia React (**New**,
predefinita) e lo strumento classico renderizzato in un iframe (**Old**, su
`/melis/react-tool-page?key=site_robot_tool_display`).

## Brick React

| Elemento | Valore |
| --- | --- |
| Tipo di brick | Nativo full-React (con fallback legacy-iframe New/Old) |
| Id del brick | `siterobot` (`brick.tsx` ⇄ `brick.manifest.json`) |
| `route` del manifest | `/melis-cms/site-robot` |
| `label` | `Robots.txt` |
| `forwardKey` | `MelisCmsSiteRobot/ToolSiteRobot` |
| `melisKey` (iframe / renderable zone) | `site_robot_tool_display` |
| `subTabs` / `persistent` | `true` / `true` |
| melisKey delle capability | `meliscms_site_robot_tools_section` |
| Base API | `/melis/react-api/site-robots` |

Il brick è un bundle Vite IIFE (React esternalizzato verso i global dell'host). `SiteRobotPage.tsx` è il
contenitore: analizza `/[section]/site-robot[/:id]` e commuta tra `DomainList` (nessun id) e
`RobotForm` (id presente), mantenendo il `mode` New/Old, le schede KPI, i filtri, il gestore di colonne, l'Export e
la modale di conferma eliminazione. Le sotto-schede sono gestite tramite il bridge della window
(`window.__melisOpenSubTab` / `__melisUpdateSubTabLabel`).

## API React

Le rotte risiedono in `config/react-api.php`; controller
`MelisCmsSiteRobot\Controller\MelisReactApiSiteRobotController`. Tutte sotto
`/melis/react-api/site-robots`, contratto JSON `{ success, data, error }`. Il controller comunica con
le tabelle **direttamente tramite SQL parametrizzato** (nessun servizio di modulo — come lo strumento legacy).

| Metodo & URL | Azione | Scopo |
| --- | --- | --- |
| `GET /site-robots` | `list` | Elenca i domini del sito (keyset: `limit`, `search`, `site`, `sort`, `dir`, `after`); ogni elemento porta `hasRobots` |
| `GET /site-robots/stats` | `stats` | KPI `{ total, withRobots, withoutRobots }` |
| `GET /site-robots/sites` | `sites` | Opzioni dei siti per il filtro |
| `GET /site-robots/:id` | `get` | Un dominio (`sdom_id`) + il suo `robotText` |
| `POST /site-robots/save` | `save` | Upsert del robots.txt di un dominio (`{ id, robotText }`) |
| `DELETE /site-robots/delete/:id` | `delete` | Svuota il robots.txt di un dominio (il dominio rimane) |

`list` esegue una LEFT-JOIN di `melis_cms_site_domain` con `melis_cms_site` e `melis_cms_domain_robots` (uniti sul
nome del dominio, `robot_site_domain = sdom_domain`). `save` esegue l'upsert della riga robots con chiave il nome del
dominio e limita il corpo memorizzato a **65535 caratteri**. L'ordine delle rotte è importante: `/stats`, `/sites`,
`/save`, `/delete/:id` sono dichiarate **prima** della catch-all `/:id` (vincolata a `[0-9]+`).

### Capability

Dichiarate in `config/react.capabilities.php` sotto il nodo portatore di diritti
`meliscms_site_robot_tools_section`:

```php
return [
    'melisReactToolCapabilities' => [
        'meliscms_site_robot_tools_section' => ['list', 'edit', 'delete', 'export'],
    ],
];
```

- **`list`** — visualizza la lista dei domini (regola anche `stats` + `sites`).
- **`edit`** — apre (`get`) e salva (`save`) il robots.txt di un dominio.
- **`delete`** — svuota il robots.txt di un dominio.
- **`export`** — il pulsante Export (controllo UI, riutilizza la lista).

Non esiste alcuna capability **`create`** — non puoi aggiungere un dominio da questo strumento. Ogni azione del
controller è protetta due volte: `denyUnlessAccess()` (auth + `MelisCoreRights::canAccess`) poi `denyUnlessCan(cap)`
(default-allow; il server resta il punto di enforcement).

## Servizi principali

Il modulo non registra alcun servizio proprio. Lo strumento legacy e l'API React condividono lo stesso modello
dati; i gateway del motore restano disponibili:

| Alias del servizio | Ruolo |
| --- | --- |
| `MelisEngineTableRobot` | Table gateway su `melis_cms_domain_robots` — legge e scrive `robot_text` per dominio. |
| `MelisEngineTableSiteDomain` | Alimenta la lista dei domini del sito (`sdom_id`, `site_label`, `sdom_domain`). |

## Front office

Una rotta pubblica in `config/module.config.php` (`melis-cms-site-robot-special-urls`) mappa `/robots.txt`
a `ToolSiteRobotController::toolRobotsTxtAction`. L'azione cerca `melis_cms_domain_robots` in base
all'host richiedente e restituisce il `robot_text` memorizzato. Invariata nella v6.

| Rotta | Handler | Risultato |
| --- | --- | --- |
| `/robots.txt` | `ToolSiteRobotController::toolRobotsTxtAction` | Distribuisce il `robot_text` memorizzato per il dominio richiedente. |

## Tabelle del database

| Tabella | Contiene |
| --- | --- |
| `melis_cms_domain_robots` | Una voce robots.txt per dominio: `robot_id` (PK), `robot_site_domain`, `robot_text`. |

## File principali

| Ambito | Percorso |
| --- | --- |
| Rotte API React | `vendor/melisplatform/melis-cms-site-robot/config/react-api.php` |
| Capability React | `vendor/melisplatform/melis-cms-site-robot/config/react.capabilities.php` |
| Manifest del brick React | `vendor/melisplatform/melis-cms-site-robot/public/ui-react/brick.manifest.json` |
| Controller API React | `vendor/melisplatform/melis-cms-site-robot/src/Controller/MelisReactApiSiteRobotController.php` |
| Strumento legacy + rotta `/robots.txt` | `vendor/melisplatform/melis-cms-site-robot/src/Controller/ToolSiteRobotController.php` |
| Rotte (back-office + `/robots.txt`) | `vendor/melisplatform/melis-cms-site-robot/config/module.config.php` |
| SQL di installazione | `vendor/melisplatform/melis-cms-site-robot/install/` |

Vedi anche: [Riferimento moduli](/it/reference/modules), [melis-cms](/it/reference/modules/melis-cms), [melis-core](/it/reference/modules/melis-core)
