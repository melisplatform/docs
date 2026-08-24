# MelisCmsMcq

> Builder di MCQ (questionari a scelta multipla / quiz) per il back-office di Melis CMS, ora uno strumento nativo full-React nel back-office v6. Pacchetto `melisplatform/melis-cms-mcq`.

## Scopo

MelisCmsMcq è la **metà UI** del sistema MCQ. Fornisce il banco di lavoro dove creare
**domande** (con risposte, tipo, difficoltà, categoria e tag), organizzarle in **categorie
di domande** e **gruppi MCQ**, e assemblare **MCQ** (test) sia manualmente tramite un
**cestino** per utente, sia automaticamente tramite un **modello casuale**. Non ha un proprio
livello dati: tutta la persistenza (tabelle, servizi, calcolo del punteggio, snapshot XML e
rendering front-office) è delegata al modulo compagno **MelisCmsMcqEngine**.

In v6 lo strumento è un **brick nativo full-React**: vere pagine React che richiamano gli
endpoint JSON `/melis/react-api/mcq*` del modulo stesso, senza iframe nella vista predefinita. Lo
strumento PHP legacy resta intatto ed è raggiungibile solo tramite un interruttore New / Old per
strumento.

## Abilitarlo

Aggiungere a `config/melis.module.load.php`:

```php
return [
    'MelisCmsMcq',
];
```

Richiede `melisplatform/melis-cms-mcq-engine` (`^5.3`) e `laminas/laminas-paginator`. Richiede
inoltre che siano caricati **MelisCms**, **MelisCore** (back-office) e **MelisCmsTags** (tagging
delle domande). Catena di installazione: `MelisCmsMcq` → `melis-cms-mcq-engine` → `melis-cms` +
`melis-cms-tags`.

Il brick React viene individuato tramite `GET /melis/react-api/react-modules` e compare solo quando
il modulo è attivo. `src/Module.php` unisce `config/react-api.php` (gli endpoint JSON) e
`config/react.capabilities.php` (la mappa dei diritti avanzati) nella configurazione
dell'applicazione.

## Dove si trova nel back-office React

**Sidebar → MelisCms → MCQ**, rotta **`/melis-cms/mcq`** (derivata dal forward di menu
`MelisCmsMcq/MelisCmsMcq`). Il brick è registrato con id **`cms-mcq`** e disegna l'intero strumento
in React — senza Sidebar/Header propri.

![La scheda MCQ (React): l'elenco dei test con schede KPI, filtri, l'interruttore New/Old e il cestino Questions Favorites.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-list.png)

Il manifest (`public/ui-react/brick.manifest.json`) imposta `persistent: true` e `subTabs: true`,
quindi il brick possiede una **propria** barra di sotto-schede interna allo strumento e rimane
montato durante la navigazione dell'host: aprire un MCQ o una domanda aggiunge una sotto-scheda, e
filtri, ordinamento e moduli compilati a metà sopravvivono quando si torna a un elenco. L'URL è solo
un riflesso cosmetico (`history.replaceState`) del record attivo.

| Proprietà | Valore |
| --- | --- |
| Brick id | `cms-mcq` |
| Rotta | `/melis-cms/mcq` |
| Etichetta | `MCQ` |
| forwardKey | `MelisCmsMcq/MelisCmsMcq` |
| melisKey | `meliscmsmcq_tool` (chiave di access-guard **e** portatrice dei diritti) |

> **Interruttore New / Old.** Nella vista elenco un utente senza restrizioni ottiene un interruttore
> **New (React) / Old (iframe legacy)**; la vista "Old" è lo strumento classico servito su
> `/melis/react-tool-page?key=meliscmsmcq_tool`. Gli utenti con restrizioni vedono sempre e solo la
> vista React.

## Banco di lavoro del back-office

Un banco di lavoro React a quattro schede, più un cestino **Questions Favorites** (una lista breve
di preferiti salvati per utente) nell'intestazione dello strumento. Regola generale: creare
**domande** → raggrupparle (**gruppi MCQ** / **categorie**) → assemblare un **MCQ** → **Preview**
per svolgerlo e leggere la correzione.

| Scheda | Cosa gestisce |
| --- | --- |
| **MCQ** | Elenco dei test assemblati (Id, Stato, Codice, nome, data di creazione, gruppi, domande) con schede KPI, ricerca, filtri per stato/data, gestore di colonne ed esportazione. **Add** apre il builder MCQ come sotto-scheda. |
| **Questions** | Elenco delle domande con filtri per categoria / tipo / stato / difficoltà / tag e ricerca; un'azione **bookmark** aggiunge o rimuove la domanda da Questions Favorites. |
| **MCQ groups** | Insiemi di domande riutilizzabili (Id, Stato, Codice, Nome). Schede KPI, esportazione, **modale** di aggiunta/modifica. |
| **Question categories** | Raggruppamenti di domande con nome (Id, Stato, Codice, Nome). Schede KPI, esportazione, **modale** di aggiunta/modifica. |

![La scheda Questions (React): elenco di domande filtrabile, con l'azione di bookmark del cestino.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions.png)

### Editor delle domande

**Add / edit** nella scheda Questions apre l'editor come sotto-scheda, in due schede:

| Scheda editor | Contenuto |
| --- | --- |
| **Properties** | Codice, **Type** (MCQ / Open Ended), **Category**, **Tags**, **Difficulty**, Status |
| **Texts / Answers** | Testo della domanda per lingua, più ogni **answer** con il relativo flag **Correct answer (Yes/No)**, un codice e uno stato; trascinare la maniglia per riordinare le risposte |

![Editor delle domande — Properties (Type, Category, Tags, Difficulty, Status).](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-properties.png)

![Editor delle domande — testi per lingua ed elenco delle risposte (interruttore della risposta corretta).](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-texts.png)

![Maniglia di trascinamento per riordinare su una riga di risposta.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-dragdroporderingicon.png)

### Builder MCQ

Scheda **MCQ** → **Add** (o modifica di una riga) apre il builder come sotto-scheda, in tre schede:

| Scheda builder | Contenuto |
| --- | --- |
| **Properties** | Nome, codice, stato, **Minimum score required (%)** (soglia di superamento) e un interruttore di mescolamento casuale **"change questions order at every MCQ creation"** |
| **Composition (Questions)** | Aggiungere **gruppi**, poi riempire ogni gruppo trascinando le domande dai pannelli laterali **Questions Favorites** / **Search Questions**, oppure fare clic su **Configure a random MCQ** per la selezione automatica per gruppo |
| **Preview** | Svolgere il quiz assemblato, poi inviarlo per vedere la **Correction** calcolata dall'engine (punteggio, superato/non superato, per ogni domanda le risposte dell'utente vs. quelle corrette). L'interfaccia React si limita a visualizzarla |

![Builder MCQ Properties — nome, minimum score required (%), interruttore di ordine casuale.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-properties.png)

![Composizione del builder MCQ — gruppi con le relative domande, più i pannelli Favorites / Search.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-questions.png)

![Preview del builder MCQ — il quiz assemblato, pronto per essere svolto.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-preview.png)

![Correzione del Preview — punteggio, superato/non superato e, per ogni domanda, le risposte dell'utente vs. quelle corrette.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-preview-corrected.png)

La modale **Random Model** definisce righe di criteri per gruppo (Difficulty / Category / Tag /
Number); al salvataggio gli ID delle domande corrispondenti vengono risolti lato server tramite
`getRandomQuestionIds` dell'engine.

![La modale Random Model — selezione automatica delle domande per gruppo in base a criteri.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-questions-randommcq-modal.png)

> Un salvataggio fallisce se non c'è un nome, nessun gruppo, o **un qualsiasi gruppo vuoto** — le
> stesse regole dello strumento legacy. Lo snapshot XML dell'MCQ (`mcq_xml`) viene rigenerato
> dall'engine a ogni salvataggio, mai scritto a mano. Creare o eliminare una categoria aggiorna i
> dati di riferimento condivisi, così che compaia immediatamente nel selettore di categoria
> dell'editor delle domande.

## React API — endpoint

Tutte le rotte sono rotte figlie di `melis-react-api` (unite da `config/react-api.php`), servite da
quattro controller invokable. Contratto di risposta ovunque:
`{ success: bool, data: T, error?: string, fields?: string[] }`. Ogni azione chiama
`denyUnlessAccess()` (auth + `MelisCoreRights::canAccess('meliscmsmcq_tool')`) poi una guardia di
capability `denyUnlessCan(<cap>)`.

**MCQ** — `MelisReactApiMcqController`:

| Metodo · URL | Azione · cap | Scopo |
| --- | --- | --- |
| `GET /melis/react-api/mcq` | `list` · `mcq` | elenco keyset |
| `GET /melis/react-api/mcq/stats` | `stats` · `mcq` | schede KPI |
| `GET /melis/react-api/mcq/groups` | `groups` · `mcq` | gruppi selezionabili nel builder |
| `GET /melis/react-api/mcq/:id` | `get` · `mcq` | dettaglio completo (proprietà, nomi, gruppi ordinati + domande) |
| `POST /melis/react-api/mcq/save` | `save` · `mcq.create` \| `mcq.edit` | crea/aggiorna (rigenera `mcq_xml`) |
| `POST /melis/react-api/mcq/evaluate` | `evaluate` · `mcq.preview.test` | calcola il punteggio di un insieme di risposte |
| `GET /melis/react-api/mcq/:id/preview` | `preview` · `mcq.preview` | l'MCQ come viene svolto (da XML) |
| `DELETE /melis/react-api/mcq/delete/:id` | `delete` · `mcq.delete` | elimina (a cascata) |

**Questions** (+ risposte, cestino, estrazione casuale) — `MelisReactApiMcqQuestionController`, su
`/melis/react-api/mcq-questions[…]`: `list`/`stats`/`refs`/`get`/`save` (cap `questions`),
`delete` (`questions.delete`), e gli endpoint di composizione `basket`, `basket/toggle`,
`basket/clear`, `search`, `random`, `random-model` (tutti cap `mcq.composition`). `refs` restituisce
i dati di riferimento condivisi — tipi, difficoltà, categorie, tag, lingue, `nextCode`.

**MCQ groups** — `MelisReactApiMcqGroupController`: `list`/`stats`/`save`/`delete`/`related`/`get`
su `/melis/react-api/mcq-groups[…]` (cap `groups`, `groups.delete`).

**Question categories** — `MelisReactApiMcqCategoryController`:
`list`/`stats`/`save`/`delete`/`related`/`get` su `/melis/react-api/mcq-categories[…]`
(cap `categories`, `categories.delete`).

> ⚠ L'ordine delle rotte è importante: i segmenti letterali (`/stats`, `/save`, `/groups`,
> `/basket`, `/random`, `/evaluate`, `/refs`) sono dichiarati **prima** del catch-all `/:id`, e tutti
> i nomi hanno il prefisso `mcq-*` per evitare collisioni con le rotte generiche `melis-react-api`.

**La logica di business resta lato server.** Questi controller si limitano a validare l'input,
eseguire una transazione e formattare il JSON; il lavoro vero è nei servizi dell'engine che
risolvono.

## Capability (diritti avanzati)

`config/react.capabilities.php` è indicizzato sotto il nodo di menu portatore dei diritti
**`meliscmsmcq_tool`** — la stessa melisKey che i controller proteggono. L'accesso allo strumento
stesso rimane `MelisCoreRights::canAccess('meliscmsmcq_tool')`; queste capability controllano i
**componenti all'interno** di uno strumento già autorizzato. Default-allow: un utente/ruolo senza la
sezione delle capability mantiene tutto.

Stringhe di capability appiattite:

- **`mcq`**, `mcq.create`, `mcq.edit`, `mcq.delete`, `mcq.export`; `mcq.composition` (pagina di
  composizione — controlla anche gli endpoint del cestino + search/random), `mcq.properties`,
  `mcq.preview`, `mcq.preview.test`
- **`questions`**, `questions.create`, `questions.edit`, `questions.delete`, `questions.export`;
  `questions.properties`, `questions.answers`
- **`groups`**, `groups.create`, `groups.edit`, `groups.delete`, `groups.export`
- **`categories`**, `categories.create`, `categories.edit`, `categories.delete`, `categories.export`

Le quattro chiavi di primo livello (`mcq`, `questions`, `groups`, `categories`) sono le quattro
schede di elenco. React le legge tramite `useCaps(MELIS_KEY)` e nasconde schede/pulsanti di
conseguenza; il `denyUnlessCan()` lato server è l'applicazione reale delle regole.

## Servizi dell'engine utilizzati

MelisCmsMcq non registra servizi propri — i suoi controller React risolvono a runtime gli alias di
**MelisCmsMcqEngine**:

| Alias del servizio engine | Utilizzato da questo modulo per |
| --- | --- |
| `MelisCmsMcqQuestionsService` | CRUD delle domande, elenco del cestino, selezione casuale (`getRandomQuestionIds`) |
| `MelisCmsMcqAnswersService` | CRUD delle risposte (editor delle domande) |
| `MelisCmsMcqQuestionCategoryService` | CRUD delle categorie di domande |
| `MelisCmsMcqGroupsService` | CRUD dei gruppi MCQ |
| `MelisCmsMcqService` | CRUD degli MCQ, generazione XML (`generateMcqXml`), fetch (`getMcq`), calcolo del punteggio (`evaluateAnswers`), eliminazione (`deleteMcqById`) |

## Tabelle del database

Tutte le tabelle appartengono a **MelisCmsMcqEngine**. Le superfici BO di questo modulo vi
corrispondono come segue:

| Tabella engine | Superficie BO che vi scrive |
| --- | --- |
| `melis_cms_mcq_questions` + `_trans` | Scheda Questions + editor delle domande |
| `melis_cms_mcq_answers` + `_trans` | Editor delle risposte (dentro l'editor delle domande) |
| `melis_cms_mcq_question_groups` + `_trans` | Scheda Question categories |
| `melis_cms_mcq_groups` + `_trans` | Scheda MCQ groups (legata a un MCQ tramite `mcqg_mcq_id`) |
| `melis_cms_mcq` + `_trans` | Scheda MCQ; test assemblato memorizzato come XML in `mcq_xml` |
| `melis_cms_mcq_questions_list` | Appartenenza domanda-a-gruppo-MCQ |
| `melis_cms_mcq_baskets` | Questions Favorites per utente |

> **Attenzione ai nomi.** Le "Question categories" della UI corrispondono a
> `melis_cms_mcq_question_groups`; gli "MCQ groups" della UI corrispondono a `melis_cms_mcq_groups`.
> Due tabelle "group" separate con scopi diversi — vedere la documentazione di MelisCmsMcqEngine.

## Integrazione con i tag

`config/app.interface.php` registra un'associazione **MelisCmsTags** in modo che le domande siano
taggabili (tipo di associazione `MCQ_QUESTION`, tabella entità `melis_cms_mcq_questions`, chiave
primaria `mcqq_id`). L'elenco Questions mostra una colonna **tags** e un **filtro per tag** guidati
da questa registrazione; nello strumento React i tag fanno anche parte del payload `refs` della
domanda.

## Front office

MelisCmsMcq non ha un proprio output front-office. Il renderer del quiz è un view helper
(`renderMcqQuestions`) registrato in **MelisCmsMcqEngine**; la scheda Preview lo usa tramite
l'engine. Vedere il [riferimento a MelisCmsMcqEngine](/legacy/reference/modules/melis-cms-mcq-engine)
per i dettagli sul rendering front-office.

## File chiave

| Ambito | Percorso |
| --- | --- |
| Rotte React API + 4 controller invokable | `config/react-api.php` |
| Mappa delle capability (diritti avanzati) | `config/react.capabilities.php` |
| Bootstrap del modulo (unisce le due configurazioni sopra) | `src/Module.php` |
| Trait condiviso del controller (MELIS_KEY, denyUnlessAccess, json/error/tr) | `src/Controller/McqReactApiTrait.php` |
| MCQ list/get/save/preview/evaluate/delete | `src/Controller/MelisReactApiMcqController.php` |
| Questions + risposte + cestino + estrazione casuale | `src/Controller/MelisReactApiMcqQuestionController.php` |
| MCQ groups | `src/Controller/MelisReactApiMcqGroupController.php` |
| Question categories | `src/Controller/MelisReactApiMcqCategoryController.php` |
| Sorgente del brick React (Vite IIFE) | `ui-react/src/` (`brick.tsx`, `McqPage.tsx`, `McqBuilder.tsx`, `QuestionEditor.tsx`, `mcq-api.ts`, …) |
| Bundle del brick compilato + manifest | `public/ui-react/{brick.js, brick.manifest.json}` |
| Strumento legacy (albero, schede, DataTables, viste, JS) | `config/app.interface.php`, `config/app.tools.php`, `src/Controller/`, `view/`, `public/js/` |

Vedere anche: [melis-cms-mcq-engine](/legacy/reference/modules/melis-cms-mcq-engine),
[melis-cms-tags](/legacy/reference/modules/melis-cms-tags),
[melis-cms](/legacy/reference/modules/melis-cms),
[melis-core](/legacy/reference/modules/melis-core)
