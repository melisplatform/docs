# MelisCmsMcqEngine

> Daten, Services, XML-Snapshots, Bewertung und Front-Office-Quiz-Renderer für das MCQ-System (Quiz) — das Backend hinter dem React-MCQ-Tool. Paket `melisplatform/melis-cms-mcq-engine`.

## Zweck

MelisCmsMcqEngine ist die **Daten- und Serviceschicht** des MCQ-Systems: Es verwaltet die Datenbanktabellen,
die Services für Fragen, Antworten, MCQs, Gruppen und Kategorien, den **XML-Snapshot**, der jeden
zusammengestellten Test einfriert, den Fragen-Picker nach dem **Zufallsmodell**, die Auswertung von
**Antwortbewertung / Bestehensquote** sowie den **Front-Office-Quiz-Renderer**. Man kann sich das wie
MelisEngine ↔ MelisCms vorstellen, jedoch für Quizze.

Der zusammengestellte Test wird als `mcq_xml` gespeichert, sodass Rendering und Bewertung einen
in sich geschlossenen Snapshot lesen und keinen Live-Join. So bleibt genau das MCQ, das ein Benutzer
zusammengestellt hat, erhalten, selbst wenn die zugrunde liegenden Fragen später bearbeitet werden.

## Kein React-Baustein — verfügbar über MelisCmsMcq

Diese Engine besitzt **keine eigene Back-Office-Oberfläche** — weder Legacy noch React. Sie liefert **keine**
`brick.manifest.json`, **kein** `ui-react/`-Projekt, **keine** `config/react-api.php` und **keine**
`config/react.capabilities.php`. Sie wird **nicht** von `GET /melis/react-api/react-modules` aufgeführt,
erscheint in keinem React-Menü und steuert keinen Capability-Knoten bei.

In `/melis-react` befindet sich die MCQ-Funktion vollständig im **MelisCmsMcq**-Tool (Seitenleiste →
**MelisCms → MCQ**; Baustein `cms-mcq`, Route `/melis-cms/mcq`, `melisKey` `meliscmsmcq_tool`). Die
`react-api`-Controller dieses Tools lösen **die Services dieser Engine** auf und delegieren die gesamte
Geschäftslogik an sie — dieselben Services, die das Legacy-Tool verwendete. Der Pfad React → `react-api` →
**Engine-Service** ersetzt schlicht den Legacy-Pfad jQuery/AJAX → Controller → **Engine-Service**; es
existiert kein React-spezifischer Engine-Code. Zugriffsrechte und erweiterte Rechte-Capabilities befinden
sich allesamt auf dem **MelisCmsMcq**-Knoten (`meliscmsmcq_tool`), nicht hier — der `rightsDisplay` der
Engine ist `'none'`.

## Aktivieren

Zu `config/melis.module.load.php` hinzufügen:

```php
return [
    // …
    'MelisCmsMcqEngine',
];
```

Voraussetzungen: `melisplatform/melis-cms` (`^5.3`), `melisplatform/melis-cms-tags` (`^5.3`),
`laminas/laminas-paginator`, PHP `^8.1|^8.3`. Das Modul liefert `dbdeploy: true`, sodass seine Tabellen
automatisch erstellt/aktualisiert werden. Installationskette: `melis-cms-mcq` → **`melis-cms-mcq-engine`** →
`melis-cms` + `melis-cms-tags`.

## Wichtige Services

Alle Services erweitern den allgemeinen Service von MelisCore und lösen `*_start` / `*_end`-Events aus.
Aliase sind in `config/module.config.php` registriert und stellen genau die Einstiegspunkte dar, die die
React-Controller von MelisCmsMcq auflösen.

| Service-Alias | Rolle | Verwendet von (MelisCmsMcq React-Controller) |
| --- | --- | --- |
| `MelisCmsMcqService` | MCQs: speichern, löschen, auflisten, MCQ-XML generieren/abrufen, Reihenfolge mischen, Antworten auswerten (Bewertung). | `MelisReactApiMcqController` |
| `MelisCmsMcqQuestionsService` | Fragen: CRUD, XML-Generierung, Warenkorb, Zufallsmodell-Picker. | `MelisReactApiMcqQuestionController` |
| `MelisCmsMcqAnswersService` | Antworten: CRUD, Prüfung auf korrekte Antwort, Antwortanzahl pro Frage. | `MelisReactApiMcqQuestionController` |
| `MelisCmsMcqGroupsService` | MCQ-Gruppen: CRUD, Gruppen+Fragen für ein MCQ zusammenstellen, zugehörige MCQs deaktivieren. | `MelisReactApiMcqGroupController` |
| `MelisCmsMcqQuestionCategoryService` | Fragenkategorien (Tabelle `melis_cms_mcq_question_groups`): CRUD. | `MelisReactApiMcqCategoryController` |

### Ausgewählte Methoden

**`MelisCmsMcqService`**

| Methode | Rolle |
| --- | --- |
| `getMcq($mcqId)` | Gibt das zusammengestellte MCQ-XML zurück; mischt die Fragenreihenfolge, wenn `mcq_random_order` gesetzt ist. |
| `generateMcqXml($mcqProperties, $mcqTrans, $groupsData)` | Erstellt das vollständige Test-XML aus Gruppen + Fragen und speichert es in `mcq_xml`. |
| `evaluateAnswers($mcqXml, $userAnswers, $passingPercentage)` | Bewertet eine Einreichung vom Typ MCQ; überspringt offene Fragen; gibt Punktzahl + bestanden/nicht bestanden zurück. |
| `xmlToArray($mcqXml)` | Parst den eingefrorenen `mcq_xml`-Snapshot in ein Array (von der React-Vorschau verwendet). |
| `getMcqList` / `saveMcqItem` / `deleteMcqById` | Standardmäßiges Auflisten/Speichern/Löschen. |

**`MelisCmsMcqQuestionsService`**

| Methode | Rolle |
| --- | --- |
| `generateQuestionXml()` | Erstellt beim Speichern den XML-Snapshot pro Frage. |
| `updateMcqQuestionDataXml()` | Aktualisiert den Fragen-Snapshot in jedem MCQ, das ihn verwendet. |
| `getRandomQuestionIds($difficultyId, $categoryId, $tagId, $numberOfQuestions, $excludedIds)` | Wählt automatisch N Frage-IDs nach Schwierigkeit / Kategorie / Tag aus. |
| `generateRandomQuestions($userId, $difficultyId, $categoryId, $tags, $numberOfQuestions, $langId, $alreadySelected)` | Übergeordneter Zufalls-Picker mit Ausschlussliste. |
| `getQuestionsBasketList` / `processBasketQuestions` | Verwaltet den Fragen-Warenkorb pro Benutzer. |

## Wie das React-MCQ-Tool diese Engine nutzt

Die React-MCQ-Controller verarbeiten JSON ein- und ausgehend und delegieren die gesamte Logik an die
Engine. Die wichtigsten serverseitigen Berührungspunkte (aus
`melis-cms-mcq/src/Controller/MelisReactApi*Controller.php`):

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

Die React-**Vorschau** rendert das geparste `mcq_xml` direkt (`getMcq` + `xmlToArray`); sie ruft
**nicht** den View-Helper `renderMcqQuestions` der Engine auf — dieser Helper ist ausschließlich der
Front-Office-/Website-Renderer und bleibt vom React-Back-Office unberührt.

## Front-Office

| Element | Rolle |
| --- | --- |
| View-Helper `renderMcqQuestions` (`McqQuestionRendererHelper`) | Wandelt `mcq_xml` in ein Array um und rendert das Quiz über das gewählte Template. Kein MelisTemplatingPlugin — das Host-Template entscheidet über die Platzierung. |
| Standard-Template | `view/templates/default-preview-template.phtml` |
| Formularelement-Factory `McqPreviewTemplatesSelect` | Befüllt ein Auswahlfeld mit Templates, die unter `mcq_preview_templates` in `app.interface.php` registriert sind. |

Zusätzliche Formularelement-Factories, die die Engine registriert: `McqQuestionCategoriesSelect`,
`McqQuestionsDifficultySelect`, `QuestionsTypesSelect`. Das React-Tool erstellt seine eigenen JSON-Referenzen
(Typen, Schwierigkeitsgrade, Kategorien), anstatt diese Laminas-Auswahlelemente zu rendern, doch die
zugrunde liegenden Engine-Daten (Typen 1=MCQ / 2=Open Ended, Schwierigkeiten Easy/Medium/Hard, Kategorien)
sind dieselben. Die `app.interface.php` der Engine registriert weiterhin das Plugin `meliscmsmcqengine` mit
`datas` (`mcq_groups.default_group_lists`, `mcq_preview_templates`) — Standardwerte, die das MCQ-Tool
unabhängig vom Frontend berücksichtigt.

## Datenbanktabellen

> **Hinweis zur Benennung.** Die Back-Office-„Fragenkategorien“ entsprechen `melis_cms_mcq_question_groups`
> (Service `MelisCmsMcqQuestionCategoryService`). Die Back-Office-„MCQ-Gruppen“ entsprechen
> `melis_cms_mcq_groups` (Service `MelisCmsMcqGroupsService`). Zwei unterschiedliche „group“-Tabellen —
> nicht verwechseln.

| Tabelle | Enthält |
| --- | --- |
| `melis_cms_mcq` | Ein MCQ/Test: `mcq_status`, `mcq_code`, `mcq_random_order`, **`mcq_xml`** (Snapshot des zusammengestellten Tests), `mcq_passing_rate`, Daten/Benutzer. |
| `melis_cms_mcq_trans` | MCQ-Name pro Sprache (`mcqt_name`). |
| `melis_cms_mcq_questions` | Eine Frage: `mcqq_status`, `mcqq_code`, `mcqq_type`, `mcqq_group_id`, `mcqq_difficulty_id`, **`mcqq_xml`** (Snapshot von Frage+Antworten). |
| `melis_cms_mcq_questions_trans` | Fragentext, `mcqqt_candidate_note`, `mcqqt_corrector_note` pro Sprache. |
| `melis_cms_mcq_answers` | Eine Antwort: `mcqa_question_id`, `mcqa_status`, `mcqa_correct_answer`, `mcqa_code`. |
| `melis_cms_mcq_answers_trans` | Antworttext pro Sprache (`mcqat_answer_text`). |
| `melis_cms_mcq_question_types` | Fragetypen: 1 = MCQ, 2 = Open Ended. |
| `melis_cms_mcq_questions_difficulty` (+`_trans`) | Schwierigkeitsgrade: 1 = Easy, 2 = Medium, 3 = Hard. |
| `melis_cms_mcq_question_groups` (+`_trans`) | Fragenkategorien (`mcqqg_id`, `mcqqg_code`, `mcqqgt_name`). |
| `melis_cms_mcq_groups` (+`_trans`) | MCQ-Gruppen (`mcqg_id`, `mcqg_mcq_id`, `mcqg_code`, `mcqgt_name`), an ein bestimmtes MCQ gebunden. |
| `melis_cms_mcq_questions_list` | Verknüpft Fragen ↔ ein MCQ (`mcmql_mcq_id`, `mcmql_question_id`). |
| `melis_cms_mcq_groups_list` | Verknüpft Gruppen innerhalb eines MCQ (durch Migration hinzugefügt). |
| `melis_cms_mcq_questions_tags_list` | Verknüpfungen Frage ↔ Tag (MelisCmsTags). |
| `melis_cms_mcq_baskets` | Fragen-Warenkorb pro Benutzer. |

## Beispiel

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

## Wichtige Dateien

| Bereich | Pfad |
| --- | --- |
| Modulverdrahtung + Service-Aliase | `vendor/melisplatform/melis-cms-mcq-engine/config/module.config.php` |
| Plugin-Konfiguration (Standardgruppen, Vorschau-Templates) | `vendor/melisplatform/melis-cms-mcq-engine/config/app.interface.php` |
| MCQ-Service (XML, Bewertung) | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqService.php` |
| Fragen-Service (Warenkorb, Zufallsmodell) | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqQuestionsService.php` |
| Antworten-Service | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqAnswersService.php` |
| Gruppen-Service | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqGroupsService.php` |
| Fragenkategorie-Service | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqQuestionCategoryService.php` |
| Table Gateways | `vendor/melisplatform/melis-cms-mcq-engine/src/Model/Tables/` |
| Formularelement-Factories | `vendor/melisplatform/melis-cms-mcq-engine/src/Form/Factory/` |
| View-Helper | `vendor/melisplatform/melis-cms-mcq-engine/src/View/Helper/McqQuestionRendererHelper.php` |
| Standard-Front-Template | `vendor/melisplatform/melis-cms-mcq-engine/view/templates/default-preview-template.phtml` |
| DB-Installation + Migrationen | `vendor/melisplatform/melis-cms-mcq-engine/install/dbdeploy/` |

Siehe auch: [Modulreferenz](/de/reference/modules) · [MelisCmsMcq](/de/reference/modules/melis-cms-mcq) ·
[MelisCms](/de/reference/modules/melis-cms)
