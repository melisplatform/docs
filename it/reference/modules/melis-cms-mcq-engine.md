# MelisCmsMcqEngine

> Dati, servizi, snapshot XML, punteggio e renderer front-office dei quiz per il sistema MCQ (quiz) — il backend dietro lo strumento MCQ React. Pacchetto `melisplatform/melis-cms-mcq-engine`.

## Scopo

MelisCmsMcqEngine è il **livello dati e servizi** del sistema MCQ: possiede le tabelle del database,
i servizi per domande, risposte, MCQ, gruppi e categorie, lo **snapshot XML** che congela
ogni test assemblato, il selezionatore di domande del **modello casuale**, la valutazione del
**punteggio delle risposte / tasso di superamento**, e il **renderer front-office dei quiz**.
Immagina MelisEngine ↔ MelisCms, ma per i quiz.

Il test assemblato viene memorizzato come `mcq_xml`, in modo che rendering e punteggio leggano uno
snapshot autonomo, non una join dal vivo, garantendo che l'esatto MCQ assemblato da un utente venga
preservato anche se le domande sottostanti vengono modificate in seguito.

## Nessun brick React — esposto tramite MelisCmsMcq

Questo motore **non ha una propria interfaccia back-office** — né legacy né React. Non include **alcun**
`brick.manifest.json`, **nessun** progetto `ui-react/`, **nessun** `config/react-api.php` e **nessun**
`config/react.capabilities.php`. **Non** è elencato da `GET /melis/react-api/react-modules`,
non compare in alcun menu React e non contribuisce con alcun nodo di capability.

In `/melis-react` la funzionalità MCQ risiede interamente nello strumento **MelisCmsMcq** (barra laterale →
**MelisCms → MCQ**; brick `cms-mcq`, rotta `/melis-cms/mcq`, `melisKey` `meliscmsmcq_tool`). I
controller `react-api` di quello strumento risolvono **i servizi di questo motore** e delegano ad essi tutta
la logica di business — gli stessi servizi che usava lo strumento legacy. Il percorso React → `react-api` →
**servizio del motore** sostituisce semplicemente il percorso legacy jQuery/AJAX → controller →
**servizio del motore**; non esiste alcun codice del motore specifico per React. I diritti di accesso e le
capability dei diritti avanzati risiedono tutti sul nodo **MelisCmsMcq** (`meliscmsmcq_tool`), non qui —
il `rightsDisplay` del motore è `'none'`.

## Come abilitarlo

Aggiungi a `config/melis.module.load.php`:

```php
return [
    // …
    'MelisCmsMcqEngine',
];
```

Richiede: `melisplatform/melis-cms` (`^5.3`), `melisplatform/melis-cms-tags` (`^5.3`),
`laminas/laminas-paginator`, PHP `^8.1|^8.3`. Il modulo include `dbdeploy: true`, quindi le sue tabelle
vengono create/aggiornate automaticamente. Catena di installazione: `melis-cms-mcq` → **`melis-cms-mcq-engine`** →
`melis-cms` + `melis-cms-tags`.

## Servizi principali

Tutti i servizi estendono il servizio generale di MelisCore e generano gli eventi `*_start` / `*_end`. Gli alias sono
registrati in `config/module.config.php` e sono gli esatti punti di ingresso che i controller React di MelisCmsMcq
risolvono.

| Alias del servizio | Ruolo | Consumato da (controller React MelisCmsMcq) |
| --- | --- | --- |
| `MelisCmsMcqService` | MCQ: salvataggio, eliminazione, elenco, generazione/recupero dell'XML MCQ, mescolamento dell'ordine, valutazione delle risposte (punteggio). | `MelisReactApiMcqController` |
| `MelisCmsMcqQuestionsService` | Domande: CRUD, generazione XML, cestello, selezionatore del modello casuale. | `MelisReactApiMcqQuestionController` |
| `MelisCmsMcqAnswersService` | Risposte: CRUD, verifica della risposta corretta, conteggio risposte per domanda. | `MelisReactApiMcqQuestionController` |
| `MelisCmsMcqGroupsService` | Gruppi MCQ: CRUD, assemblaggio gruppi+domande per un MCQ, disattivazione degli MCQ correlati. | `MelisReactApiMcqGroupController` |
| `MelisCmsMcqQuestionCategoryService` | Categorie di domande (tabella `melis_cms_mcq_question_groups`): CRUD. | `MelisReactApiMcqCategoryController` |

### Metodi selezionati

**`MelisCmsMcqService`**

| Metodo | Ruolo |
| --- | --- |
| `getMcq($mcqId)` | Restituisce l'XML MCQ assemblato; mescola l'ordine delle domande se `mcq_random_order` è impostato. |
| `generateMcqXml($mcqProperties, $mcqTrans, $groupsData)` | Costruisce l'XML completo del test a partire da gruppi + domande e lo memorizza in `mcq_xml`. |
| `evaluateAnswers($mcqXml, $userAnswers, $passingPercentage)` | Assegna il punteggio a una consegna di tipo MCQ; salta le domande a risposta aperta; restituisce punteggio + superato/non superato. |
| `xmlToArray($mcqXml)` | Analizza lo snapshot congelato `mcq_xml` trasformandolo in un array (usato dall'anteprima React). |
| `getMcqList` / `saveMcqItem` / `deleteMcqById` | Elenco/salvataggio/eliminazione standard. |

**`MelisCmsMcqQuestionsService`**

| Metodo | Ruolo |
| --- | --- |
| `generateQuestionXml()` | Costruisce lo snapshot XML per singola domanda al salvataggio. |
| `updateMcqQuestionDataXml()` | Aggiorna lo snapshot della domanda all'interno di ogni MCQ che la utilizza. |
| `getRandomQuestionIds($difficultyId, $categoryId, $tagId, $numberOfQuestions, $excludedIds)` | Seleziona automaticamente N ID di domande per difficoltà / categoria / tag. |
| `generateRandomQuestions($userId, $difficultyId, $categoryId, $tags, $numberOfQuestions, $langId, $alreadySelected)` | Selezionatore casuale di livello superiore con elenco di esclusioni. |
| `getQuestionsBasketList` / `processBasketQuestions` | Gestisce il cestello di domande per utente (carrello). |

## Come lo strumento MCQ React utilizza questo motore

I controller MCQ React gestiscono lo scambio di JSON in ingresso/uscita e delegano tutta la logica al motore. I principali
punti di contatto lato server (da `melis-cms-mcq/src/Controller/MelisReactApi*Controller.php`):

```php
// POST /melis/react-api/mcq/save  → MelisReactApiMcqController::saveAction()
$mcqService = $this->getServiceManager()->get('MelisCmsMcqService');
$mcqXml = $mcqService->generateMcqXml($mcqProperties, $mcqTrans, $groupsData); // engine assembles snapshot

// POST /melis/react-api/mcq/evaluate  → evaluateAction()
$result = $mcqService->evaluateAnswers($xml, $answers, $passing);              // engine scores; React displays

// GET  /melis/react-api/mcq/:id/preview  → previewAction()
$xml    = $mcqService->getMcq($id);            // frozen test XML (shuffled if mcq_random_order)
$parsed = (array) $mcqService->xmlToArray($xml);

// POST /melis/react-api/mcq-questions/random  → MelisReactApiMcqQuestionController::randomAction()
$ids = $questionService->getRandomQuestionIds($difficulty, $category, $tagId, $count, $exclude);
```

L'**anteprima** React esegue direttamente il rendering dell'`mcq_xml` analizzato (`getMcq` + `xmlToArray`); **non**
richiama il view helper `renderMcqQuestions` del motore — quel helper è unicamente il renderer front-office /
del sito web, ed è invariato rispetto al back-office React.

## Front office

| Elemento | Ruolo |
| --- | --- |
| View helper `renderMcqQuestions` (`McqQuestionRendererHelper`) | Converte `mcq_xml` in un array ed esegue il rendering del quiz tramite il template scelto. Nessun MelisTemplatingPlugin — il template ospitante decide il posizionamento. |
| Template predefinito | `view/templates/default-preview-template.phtml` |
| Factory dell'elemento di form `McqPreviewTemplatesSelect` | Popola un menu a tendina con i template registrati sotto `mcq_preview_templates` in `app.interface.php`. |

Ulteriori factory di elementi di form registrate dal motore: `McqQuestionCategoriesSelect`,
`McqQuestionsDifficultySelect`, `QuestionsTypesSelect`. Lo strumento React costruisce i propri riferimenti JSON
(tipi, difficoltà, categorie) anziché eseguire il rendering di questi elementi select di Laminas, ma i dati
sottostanti del motore (tipi 1=MCQ / 2=Open Ended, difficoltà Easy/Medium/Hard, categorie) sono
gli stessi. L'`app.interface.php` del motore registra ancora il plugin `meliscmsmcqengine` con
`datas` (`mcq_groups.default_group_lists`, `mcq_preview_templates`) — impostazioni predefinite che lo strumento MCQ rispetta
indipendentemente dal front-end.

## Tabelle del database

> **Nota sulla denominazione.** Le "Categorie di domande" del back-office corrispondono a `melis_cms_mcq_question_groups`
> (servizio `MelisCmsMcqQuestionCategoryService`). I "Gruppi MCQ" del back-office corrispondono a
> `melis_cms_mcq_groups` (servizio `MelisCmsMcqGroupsService`). Due tabelle "group" distinte —
> non confonderle.

| Tabella | Contiene |
| --- | --- |
| `melis_cms_mcq` | Un MCQ/test: `mcq_status`, `mcq_code`, `mcq_random_order`, **`mcq_xml`** (snapshot del test assemblato), `mcq_passing_rate`, date/utenti. |
| `melis_cms_mcq_trans` | Nome dell'MCQ per lingua (`mcqt_name`). |
| `melis_cms_mcq_questions` | Una domanda: `mcqq_status`, `mcqq_code`, `mcqq_type`, `mcqq_group_id`, `mcqq_difficulty_id`, **`mcqq_xml`** (snapshot domanda+risposte). |
| `melis_cms_mcq_questions_trans` | Testo della domanda, `mcqqt_candidate_note`, `mcqqt_corrector_note` per lingua. |
| `melis_cms_mcq_answers` | Una risposta: `mcqa_question_id`, `mcqa_status`, `mcqa_correct_answer`, `mcqa_code`. |
| `melis_cms_mcq_answers_trans` | Testo della risposta per lingua (`mcqat_answer_text`). |
| `melis_cms_mcq_question_types` | Tipi di domanda: 1 = MCQ, 2 = Open Ended. |
| `melis_cms_mcq_questions_difficulty` (+`_trans`) | Difficoltà: 1 = Easy, 2 = Medium, 3 = Hard. |
| `melis_cms_mcq_question_groups` (+`_trans`) | Categorie di domande (`mcqqg_id`, `mcqqg_code`, `mcqqgt_name`). |
| `melis_cms_mcq_groups` (+`_trans`) | Gruppi MCQ (`mcqg_id`, `mcqg_mcq_id`, `mcqg_code`, `mcqgt_name`), legati a uno specifico MCQ. |
| `melis_cms_mcq_questions_list` | Collega domande ↔ un MCQ (`mcmql_mcq_id`, `mcmql_question_id`). |
| `melis_cms_mcq_groups_list` | Collega i gruppi all'interno di un MCQ (aggiunta da migrazione). |
| `melis_cms_mcq_questions_tags_list` | Collegamenti domanda ↔ tag (MelisCmsTags). |
| `melis_cms_mcq_baskets` | Cestello di domande per utente (carrello). |

## Esempio

```php
$sm = $this->getServiceLocator();

// --- Fetch and render a quiz on a website ---
$mcqSvc = $sm->get('MelisCmsMcqService');
$mcqXml = $mcqSvc->getMcq($mcqId); // shuffles if mcq_random_order is set

// In a phtml template:
echo $this->renderMcqQuestions(
    'MelisCmsMcqEngine/default-template',
    $mcqXml,
    $langId
);

// --- Score a submission ---
$result = $mcqSvc->evaluateAnswers($mcqXml, $userAnswers, 50);
// $result['global']  => ['score', 'pass', 'total', 'checked', 'skipped']
// $result['details'] => per-question outcome

// --- Random model: auto-select N questions ---
$qSvc = $sm->get('MelisCmsMcqQuestionsService');
$ids  = $qSvc->getRandomQuestionIds($difficultyId, $categoryId, $tagId, $numberOfQuestions, $excludedIds);
```

## File principali

| Ambito | Percorso |
| --- | --- |
| Wiring del modulo + alias dei servizi | `vendor/melisplatform/melis-cms-mcq-engine/config/module.config.php` |
| Configurazione del plugin (gruppi predefiniti, template di anteprima) | `vendor/melisplatform/melis-cms-mcq-engine/config/app.interface.php` |
| Servizio MCQ (XML, punteggio) | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqService.php` |
| Servizio domande (cestello, modello casuale) | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqQuestionsService.php` |
| Servizio risposte | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqAnswersService.php` |
| Servizio gruppi | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqGroupsService.php` |
| Servizio categoria di domande | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqQuestionCategoryService.php` |
| Table gateway | `vendor/melisplatform/melis-cms-mcq-engine/src/Model/Tables/` |
| Factory degli elementi di form | `vendor/melisplatform/melis-cms-mcq-engine/src/Form/Factory/` |
| View helper | `vendor/melisplatform/melis-cms-mcq-engine/src/View/Helper/McqQuestionRendererHelper.php` |
| Template front predefinito | `vendor/melisplatform/melis-cms-mcq-engine/view/templates/default-preview-template.phtml` |
| Installazione DB + migrazioni | `vendor/melisplatform/melis-cms-mcq-engine/install/dbdeploy/` |

Vedi anche: [Riferimento dei moduli](/it/reference/modules) · [MelisCmsMcq](/it/reference/modules/melis-cms-mcq) ·
[MelisCms](/it/reference/modules/melis-cms)
