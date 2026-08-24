# MelisPhpinfo

> Strumento diagnostico in sola lettura che visualizza la funzione nativa `phpinfo()` di PHP all'interno del back office React di Melis. Pacchetto `melisplatform/melis-phpinfo`.

## Scopo

MelisPhpinfo è un modulo Dev Tools a schermata singola che cattura l'output di `phpinfo()` e lo visualizza nell'area di amministrazione di Melis, consentendo a un amministratore di ispezionare la versione di PHP del server, le estensioni caricate, le direttive di `php.ini`, le variabili d'ambiente e i percorsi senza accesso alla shell. Non ha database, service o model layer — solo un controller e tre zone di vista. In v6 viene distribuito come **iframe brick** nel back office React: la pagina React monta un iframe persistente che carica lo strumento legacy esistente all'interno della shell React. Non è presente alcun livello API React né alcun file di capabilities.

::: warning Nota sulla sicurezza
`phpinfo()` espone dettagli sensibili — percorsi assoluti, moduli caricati, variabili d'ambiente (potenzialmente credenziali/chiavi API) e flag di compilazione. Lo strumento risiede intenzionalmente sotto **Dev Tools**; mantienilo riservato agli amministratori fidati e oscura i segreti prima di condividere qualsiasi screenshot.
:::

## Abilitazione

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisPhpinfo',
];
```

Richiede che `MelisCore` sia caricato per primo. Il brick React compare solo se il modulo è attivato — il rilevamento dei brick (`GET /melis/react-api/react-modules`) elenca i moduli attivi che distribuiscono un `brick.manifest.json`; disattivando il modulo si rimuove il nodo di menu.

## Back office (React)

Lo strumento compare nella barra laterale sinistra sotto **MelisCore → Dev Tools → PHP Info**. Si apre come scheda superiore denominata **PHP Info** e mostra il report completo di `phpinfo()` con uno stile adattato all'area di amministrazione di Melis; al primo caricamento dell'iframe compare per un breve momento uno spinner. Il report può essere lungo, quindi scorri all'interno dell'area dello strumento per raggiungere una determinata sezione (Core, estensioni, percorsi, ambiente). È presente un'unica vista — nessun toggle Nuovo/Vecchio — e nulla è modificabile.

## Anatomia del brick

La presenza React è un **iframe brick**: `PhpinfoPage.tsx` non implementa alcuna UI React nativa. Crea un iframe persistente (`id="melis-brick-frame-phpinfo"`) il cui `src` è `/melis/react-tool-page?key=melis_phpinfo_tool`, lo aggiunge una sola volta a `<body>`, quindi si limita a posizionarlo/attivarlo sopra un `<div>` di ancoraggio ai cambi di scheda, in modo che non venga mai ricaricato. La destinazione dell'iframe — servita da **MelisReactOverride** — visualizza il classico strumento PHP Info legacy.

| Elemento | Valore |
| --- | --- |
| Brick id | `phpinfo` |
| `route` del manifest | `/melis-core/phpinfo` |
| `label` | `PHP Info` |
| `forwardKey` | `MelisPhpinfo/List` |
| `melisKey` (destinazione iframe) | `melis_phpinfo_tool` |
| `entry` | `brick.js` |
| API React | nessuna (nessun `config/react-api.php`) |
| Capabilities | nessuna (nessun `config/react.capabilities.php`) — accesso regolato dal diritto `melis_phpinfo_tool` |

Manifest (`public/ui-react/brick.manifest.json`):

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

## Accesso

Non esistono capabilities granulari: l'accesso è tutto-o-niente, regolato dal diritto dello strumento `melis_phpinfo_tool`. Il menu React emette il nodo solo se l'utente `canAccess('melis_phpinfo_tool')` (super-amministratori con `usr_admin=1` o utenti a cui è stato concesso il diritto). La vista contenuto legacy ricontrolla lo stesso diritto lato server prima di eseguire `phpinfo()`, così anche una richiesta costruita manualmente verso la zona contenuto restituisce una risposta vuota agli altri.

```php
// src/Controller/ListController.php — renderToolContentAction()
$view->accessAllowed = $this->isPhpinfoAccessAllowed(); // only then does the view run phpinfo()
// isPhpinfoAccessAllowed(): authenticated identity + MelisCoreRights::canAccess('melis_phpinfo_tool')
```

## Zone di vista

Lo strumento legacy (caricato nell'iframe) è composto da tre zone, invariate in v6:

| Identificatore zona | Ruolo |
| --- | --- |
| `melis_phpinfo_tool` | Container — inoltra a `MelisPhpinfo/List/render-tool` |
| `melis_phpinfo_header` | Barra del titolo (`render-tool-header`) |
| `melis_phpinfo_content` | Il report di `phpinfo()` (`render-tool-content`) |

## Dettaglio implementativo

L'output di `phpinfo()` viene prodotto interamente nel view layer. Le azioni del controller restituiscono un `ViewModel` vuoto senza dati passati da PHP alla vista; la vista del report cattura e sanifica l'output:

```php
ob_start();
phpinfo();
$phpInfoContent = ob_get_clean();
// Strip phpinfo()'s own <style> so the page inherits Melis admin CSS
$filtredPhpInfoContent = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $phpInfoContent);
echo $filtredPhpInfoContent;
```

La logica di business rimane lato server: il brick React è soltanto lo strumento PHP Info legacy incorporato nella shell React.

## File chiave

| Ambito | Percorso |
| --- | --- |
| Punto di ingresso del brick | `ui-react/src/brick.tsx` (registra l'id `phpinfo` → `PhpinfoPage`) |
| Pagina React (wrapper iframe) | `ui-react/src/PhpinfoPage.tsx` |
| Bundle compilato / manifest | `public/ui-react/brick.js` · `public/ui-react/brick.manifest.json` |
| Registrazione menu / zone | `config/app.toolstree.php` |
| Configurazione dello strumento | `config/app.tools.php` · `config/app.interface.php` |
| Registrazione route + controller | `config/module.config.php` |
| Controller (3 azioni leggere, con accesso regolato) | `src/Controller/ListController.php` |
| Vista del report | `view/melis-phpinfo/list/render-tool-content.phtml` |

Vedi anche: [MelisCore](/it/reference/modules/melis-core)
