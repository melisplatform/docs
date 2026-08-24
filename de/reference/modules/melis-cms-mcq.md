# MelisCmsMcq

> Back-office-Builder für MCQ (Multiple-Choice-Fragebogen / Quiz) für das Melis CMS, jetzt ein natives Full-React-Werkzeug im v6-Back-office. Paket `melisplatform/melis-cms-mcq`.

## Zweck

MelisCmsMcq ist die **UI-Hälfte** des MCQ-Systems. Es stellt die Arbeitsumgebung bereit, in der Sie
**Fragen** verfassen (mit Antworten, Typ, Schwierigkeitsgrad, Kategorie und Tags), sie in **Fragen-
kategorien** und **MCQ-Gruppen** organisieren und **MCQs** (Tests) zusammenstellen – entweder manuell
über einen benutzerspezifischen **Korb** oder automatisch über ein **Zufallsmodell**. Es besitzt keine
eigene Datenschicht: Sämtliche Persistenz (Tabellen, Dienste, Bewertung, XML-Snapshots und Front-
office-Rendering) wird an das begleitende Modul **MelisCmsMcqEngine** delegiert.

In v6 ist das Werkzeug ein **natives Full-React-Brick**: echte React-Seiten, die die modul-eigenen
JSON-Endpunkte `/melis/react-api/mcq*` aufrufen, ohne iframe in der Standardansicht. Das klassische
PHP-Werkzeug bleibt unangetastet und ist nur über einen werkzeugspezifischen Umschalter Neu / Alt
erreichbar.

## Aktivierung

Fügen Sie es zu `config/melis.module.load.php` hinzu:

```php
return [
    'MelisCmsMcq',
];
```

Erfordert `melisplatform/melis-cms-mcq-engine` (`^5.3`) und `laminas/laminas-paginator`. Außerdem
müssen **MelisCms**, **MelisCore** (Back-office) und **MelisCmsTags** (Verschlagwortung der Fragen)
geladen sein. Installationskette: `MelisCmsMcq` → `melis-cms-mcq-engine` → `melis-cms` + `melis-cms-tags`.

Der React-Brick wird über `GET /melis/react-api/react-modules` erkannt und erscheint nur, wenn das
Modul aktiv ist. `src/Module.php` fügt `config/react-api.php` (die JSON-Endpunkte) und
`config/react.capabilities.php` (die Zuordnung der erweiterten Rechte) in die Anwendungskonfiguration ein.

## Wo es sich im React-Back-office befindet

**Seitenleiste → MelisCms → MCQ**, Route **`/melis-cms/mcq`** (abgeleitet vom Menü-Forward
`MelisCmsMcq/MelisCmsMcq`). Der Brick ist unter der ID **`cms-mcq`** registriert und zeichnet das
gesamte Werkzeug in React – ohne eigene Seitenleiste/Kopfzeile.

![Der Tab MCQ (React): die Testliste mit KPI-Karten, Filtern, dem Umschalter Neu/Alt und dem Korb Questions Favorites.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-list.png)

Das Manifest (`public/ui-react/brick.manifest.json`) setzt `persistent: true` und `subTabs: true`,
sodass der Brick seine **eigene** werkzeuginterne Unter-Tab-Leiste besitzt und über Host-Navigationen
hinweg eingebunden bleibt: Das Öffnen eines MCQ oder einer Frage fügt einen Unter-Tab hinzu, und
Filter, Sortierung sowie halb ausgefüllte Formulare bleiben erhalten, wenn Sie zu einer Liste
zurückspringen. Die URL ist nur eine kosmetische Widerspiegelung (`history.replaceState`) des aktiven
Datensatzes.

| Eigenschaft | Wert |
| --- | --- |
| Brick-ID | `cms-mcq` |
| Route | `/melis-cms/mcq` |
| Bezeichnung | `MCQ` |
| forwardKey | `MelisCmsMcq/MelisCmsMcq` |
| melisKey | `meliscmsmcq_tool` (Zugriffsschutz **und** rechtetragender Schlüssel) |

> **Umschalter Neu / Alt.** In der Listenansicht erhält ein uneingeschränkter Benutzer einen Umschalter
> **Neu (React) / Alt (Legacy-iframe)**; die Ansicht „Alt" ist das klassische Werkzeug, ausgeliefert unter
> `/melis/react-tool-page?key=meliscmsmcq_tool`. Eingeschränkte Benutzer sehen ausschließlich die React-Ansicht.

## Back-office-Arbeitsumgebung

Eine React-Arbeitsumgebung mit vier Tabs sowie einem Korb **Questions Favorites** (eine
benutzerspezifische Merkliste mit Lesezeichen) in der Werkzeug-Kopfzeile. Faustregel: **Fragen**
verfassen → gruppieren (**MCQ-Gruppen** / **Kategorien**) → ein **MCQ** zusammenstellen → **Vorschau**,
um es durchzuführen und die Korrektur zu lesen.

| Tab | Was er verwaltet |
| --- | --- |
| **MCQ** | Liste zusammengestellter Tests (Id, Status, Code, Name, Erstellungsdatum, Gruppen, Fragen) mit KPI-Karten, Suche, Status-/Datumsfiltern, Spaltenverwaltung und Export. **Hinzufügen** öffnet den MCQ-Builder als Unter-Tab. |
| **Questions** | Fragenliste mit Filtern für Kategorie / Typ / Status / Schwierigkeitsgrad / Tags und Suche; eine **Lesezeichen**-Aktion schaltet die Frage in Questions Favorites um. |
| **MCQ groups** | Wiederverwendbare Fragenbündel (Id, Status, Code, Name). KPI-Karten, Export, **Modal** zum Hinzufügen/Bearbeiten. |
| **Question categories** | Benannte Fragen-Gruppierungen (Id, Status, Code, Name). KPI-Karten, Export, **Modal** zum Hinzufügen/Bearbeiten. |

![Der Tab Questions (React): filterbare Fragenliste mit der Korb-Lesezeichenaktion.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions.png)

### Fragen-Editor

**Hinzufügen / Bearbeiten** im Tab Questions öffnet den Editor als Unter-Tab, in zwei Tabs:

| Editor-Tab | Inhalt |
| --- | --- |
| **Properties** | Code, **Type** (MCQ / Open Ended), **Category**, **Tags**, **Difficulty**, Status |
| **Texts / Answers** | Fragentext je Sprache sowie jede **Antwort** mit ihrem Kennzeichen **Correct answer (Yes/No)**, einem Code und einem Status; ziehen Sie den Greifpunkt, um Antworten neu anzuordnen |

![Fragen-Editor – Properties (Type, Category, Tags, Difficulty, Status).](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-properties.png)

![Fragen-Editor – Texte je Sprache und die Antwortliste (Umschalter für die richtige Antwort).](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-texts.png)

![Greifpunkt zum Neuanordnen per Ziehen in einer Antwortzeile.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-dragdroporderingicon.png)

### MCQ-Builder

Tab **MCQ** → **Add** (oder eine Zeile bearbeiten) öffnet den Builder als Unter-Tab, in drei Tabs:

| Builder-Tab | Inhalt |
| --- | --- |
| **Properties** | Name, Code, Status, **Minimum score required (%)** (Bestehensquote) und ein Umschalter **„change questions order at every MCQ creation"** zur zufälligen Durchmischung |
| **Composition (Questions)** | Fügen Sie **Gruppen** hinzu und füllen Sie dann jede Gruppe, indem Sie Fragen aus den Seitenpanels **Questions Favorites** / **Search Questions** ziehen, oder klicken Sie auf **Configure a random MCQ**, um je Gruppe automatisch auszuwählen |
| **Preview** | Führen Sie das zusammengestellte Quiz durch und übermitteln Sie es anschließend, um die von der Engine berechnete **Correction** anzuzeigen (Punktzahl, bestanden/nicht bestanden, Benutzerantworten je Frage im Vergleich zu den richtigen Antworten). Die React-UI zeigt sie nur an |

![MCQ-Builder Properties – Name, Minimum score required (%), Umschalter für Zufallsreihenfolge.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-properties.png)

![MCQ-Builder Composition – Gruppen mit ihren Fragen sowie die Panels Favorites / Search.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-questions.png)

![MCQ-Builder Preview – das zusammengestellte Quiz, bereit zur Durchführung.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-preview.png)

![Preview-Korrektur – Punktzahl, bestanden/nicht bestanden und Benutzerantworten je Frage im Vergleich zu den richtigen Antworten.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-preview-corrected.png)

Das Modal **Random Model** definiert Kriterienzeilen je Gruppe (Difficulty / Category / Tag / Number);
beim Speichern werden die passenden Fragen-IDs serverseitig über `getRandomQuestionIds` der Engine aufgelöst.

![Das Modal Random Model – automatische Auswahl von Fragen je Gruppe nach Kriterien.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-questions-randommcq-modal.png)

> Ein Speichervorgang schlägt fehl, wenn kein Name, keine Gruppe oder **irgendeine leere Gruppe**
> vorhanden ist – dieselben Regeln wie beim klassischen Werkzeug. Der XML-Snapshot des MCQ (`mcq_xml`)
> wird bei jedem Speichern von der Engine neu erzeugt, niemals von Hand geschrieben. Das Erstellen oder
> Löschen einer Kategorie aktualisiert die gemeinsam genutzten Referenzdaten, sodass sie sofort im
> Kategorie-Auswahlfeld des Fragen-Editors erscheint.

## React-API – Endpunkte

Alle Routen sind untergeordnete Routen von `melis-react-api` (zusammengeführt aus `config/react-api.php`),
ausgeliefert von vier invokable Controllern. Überall geltender Antwortvertrag:
`{ success: bool, data: T, error?: string, fields?: string[] }`. Jede Aktion ruft
`denyUnlessAccess()` auf (Auth + `MelisCoreRights::canAccess('meliscmsmcq_tool')`), gefolgt von einem
Capability-Schutz `denyUnlessCan(<cap>)`.

**MCQ** – `MelisReactApiMcqController`:

| Methode · URL | Aktion · Cap | Zweck |
| --- | --- | --- |
| `GET /melis/react-api/mcq` | `list` · `mcq` | Keyset-Liste |
| `GET /melis/react-api/mcq/stats` | `stats` · `mcq` | KPI-Karten |
| `GET /melis/react-api/mcq/groups` | `groups` · `mcq` | im Builder auswählbare Gruppen |
| `GET /melis/react-api/mcq/:id` | `get` · `mcq` | vollständige Details (Eigenschaften, Namen, geordnete Gruppen + Fragen) |
| `POST /melis/react-api/mcq/save` | `save` · `mcq.create` \| `mcq.edit` | Erstellen/Aktualisieren (erzeugt `mcq_xml` neu) |
| `POST /melis/react-api/mcq/evaluate` | `evaluate` · `mcq.preview.test` | eine Reihe von Antworten bewerten |
| `GET /melis/react-api/mcq/:id/preview` | `preview` · `mcq.preview` | das MCQ wie durchgeführt (aus XML) |
| `DELETE /melis/react-api/mcq/delete/:id` | `delete` · `mcq.delete` | löschen (kaskadierend) |

**Questions** (+ Antworten, Korb, Zufallsziehung) – `MelisReactApiMcqQuestionController`, unter
`/melis/react-api/mcq-questions[…]`: `list`/`stats`/`refs`/`get`/`save` (Cap `questions`),
`delete` (`questions.delete`) sowie die Kompositions-Endpunkte `basket`, `basket/toggle`,
`basket/clear`, `search`, `random`, `random-model` (alle Cap `mcq.composition`). `refs` liefert die
gemeinsam genutzten Referenzdaten – Typen, Schwierigkeitsgrade, Kategorien, Tags, Sprachen, `nextCode`.

**MCQ groups** – `MelisReactApiMcqGroupController`: `list`/`stats`/`save`/`delete`/`related`/`get`
unter `/melis/react-api/mcq-groups[…]` (Caps `groups`, `groups.delete`).

**Question categories** – `MelisReactApiMcqCategoryController`:
`list`/`stats`/`save`/`delete`/`related`/`get` unter `/melis/react-api/mcq-categories[…]`
(Caps `categories`, `categories.delete`).

> ⚠ Die Reihenfolge der Routen ist wichtig: literale Segmente (`/stats`, `/save`, `/groups`, `/basket`,
> `/random`, `/evaluate`, `/refs`) werden **vor** dem Catch-all `/:id` deklariert, und alle Namen sind mit
> `mcq-*` präfixiert, um Kollisionen mit den generischen `melis-react-api`-Routen zu vermeiden.

**Die Geschäftslogik bleibt serverseitig.** Diese Controller validieren nur die Eingabe, führen eine
Transaktion aus und formen JSON; die eigentliche Arbeit findet in den Engine-Diensten statt, die sie auflösen.

## Capabilities (erweiterte Rechte)

`config/react.capabilities.php` ist unter dem rechtetragenden Menüknoten **`meliscmsmcq_tool`**
verschlüsselt – demselben melisKey, den die Controller schützen. Der Zugriff auf das Werkzeug selbst
bleibt `MelisCoreRights::canAccess('meliscmsmcq_tool')`; diese Capabilities steuern **Komponenten
innerhalb** eines bereits autorisierten Werkzeugs. Standardmäßig erlaubt: Ein Benutzer/eine Rolle ohne
Capabilities-Abschnitt behält alles.

Abgeflachte Capability-Strings:

- **`mcq`**, `mcq.create`, `mcq.edit`, `mcq.delete`, `mcq.export`; `mcq.composition` (Kompositionsseite –
  steuert auch die Endpunkte Korb + Suche/Zufall), `mcq.properties`, `mcq.preview`,
  `mcq.preview.test`
- **`questions`**, `questions.create`, `questions.edit`, `questions.delete`, `questions.export`;
  `questions.properties`, `questions.answers`
- **`groups`**, `groups.create`, `groups.edit`, `groups.delete`, `groups.export`
- **`categories`**, `categories.create`, `categories.edit`, `categories.delete`, `categories.export`

Die vier Schlüssel der obersten Ebene (`mcq`, `questions`, `groups`, `categories`) sind die vier
Listen-Tabs. React liest sie über `useCaps(MELIS_KEY)` aus und blendet Tabs/Schaltflächen entsprechend
aus; die serverseitige `denyUnlessCan()` ist die eigentliche Durchsetzung.

## Verwendete Engine-Dienste

MelisCmsMcq registriert keine eigenen Dienste – seine React-Controller lösen zur Laufzeit Aliase aus
**MelisCmsMcqEngine** auf:

| Alias des Engine-Dienstes | Wofür dieses Modul ihn verwendet |
| --- | --- |
| `MelisCmsMcqQuestionsService` | Fragen-CRUD, Korbliste, Zufallsauswahl (`getRandomQuestionIds`) |
| `MelisCmsMcqAnswersService` | Antworten-CRUD (Fragen-Editor) |
| `MelisCmsMcqQuestionCategoryService` | Fragenkategorien-CRUD |
| `MelisCmsMcqGroupsService` | MCQ-Gruppen-CRUD |
| `MelisCmsMcqService` | MCQ-CRUD, XML-Erzeugung (`generateMcqXml`), Abruf (`getMcq`), Bewertung (`evaluateAnswers`), Löschen (`deleteMcqById`) |

## Datenbanktabellen

Alle Tabellen gehören zu **MelisCmsMcqEngine**. Die BO-Oberflächen in diesem Modul ordnen sich ihnen
wie folgt zu:

| Engine-Tabelle | BO-Oberfläche, die darauf schreibt |
| --- | --- |
| `melis_cms_mcq_questions` + `_trans` | Tab Questions + Fragen-Editor |
| `melis_cms_mcq_answers` + `_trans` | Antworten-Editor (innerhalb des Fragen-Editors) |
| `melis_cms_mcq_question_groups` + `_trans` | Tab Question categories |
| `melis_cms_mcq_groups` + `_trans` | Tab MCQ groups (über `mcqg_mcq_id` an ein MCQ gebunden) |
| `melis_cms_mcq` + `_trans` | Tab MCQ; zusammengestellter Test als XML in `mcq_xml` gespeichert |
| `melis_cms_mcq_questions_list` | Zugehörigkeit von Frage zu MCQ-Gruppe |
| `melis_cms_mcq_baskets` | Questions Favorites je Benutzer |

> **Vorsicht bei der Benennung.** Die „Question categories" der UI entsprechen
> `melis_cms_mcq_question_groups`; die „MCQ groups" der UI entsprechen `melis_cms_mcq_groups`. Zwei
> getrennte „group"-Tabellen mit unterschiedlichen Zwecken – siehe die MelisCmsMcqEngine-Dokumentation.

## Tags-Integration

`config/app.interface.php` registriert eine **MelisCmsTags**-Zuordnung, sodass Fragen verschlagwortbar
sind (Zuordnungstyp `MCQ_QUESTION`, Entitätstabelle `melis_cms_mcq_questions`, Primärschlüssel `mcqq_id`).
Die Fragenliste zeigt eine **Tags**-Spalte und einen **Tags-Filter**, die von dieser Registrierung
angetrieben werden; im React-Werkzeug sind Tags außerdem Teil der `refs`-Nutzlast der Frage.

## Front-office

MelisCmsMcq hat keine eigene Front-office-Ausgabe. Der Quiz-Renderer ist ein View-Helper
(`renderMcqQuestions`), registriert in **MelisCmsMcqEngine**; der Tab Preview verwendet ihn über die
Engine. Einzelheiten zum Front-office-Rendering finden Sie in der
[MelisCmsMcqEngine-Referenz](/legacy/reference/modules/melis-cms-mcq-engine).

## Wichtige Dateien

| Anliegen | Pfad |
| --- | --- |
| React-API-Routen + 4 invokable Controller | `config/react-api.php` |
| Zuordnung der erweiterten Rechte (Capabilities) | `config/react.capabilities.php` |
| Modul-Bootstrap (führt die beiden obigen Konfigurationen zusammen) | `src/Module.php` |
| Gemeinsames Controller-Trait (MELIS_KEY, denyUnlessAccess, json/error/tr) | `src/Controller/McqReactApiTrait.php` |
| MCQ list/get/save/preview/evaluate/delete | `src/Controller/MelisReactApiMcqController.php` |
| Fragen + Antworten + Korb + Zufallsziehung | `src/Controller/MelisReactApiMcqQuestionController.php` |
| MCQ-Gruppen | `src/Controller/MelisReactApiMcqGroupController.php` |
| Fragenkategorien | `src/Controller/MelisReactApiMcqCategoryController.php` |
| React-Brick-Quelle (Vite IIFE) | `ui-react/src/` (`brick.tsx`, `McqPage.tsx`, `McqBuilder.tsx`, `QuestionEditor.tsx`, `mcq-api.ts`, …) |
| Gebautes Brick-Bundle + Manifest | `public/ui-react/{brick.js, brick.manifest.json}` |
| Klassisches Werkzeug (Baum, Tabs, DataTables, Views, JS) | `config/app.interface.php`, `config/app.tools.php`, `src/Controller/`, `view/`, `public/js/` |

Siehe auch: [melis-cms-mcq-engine](/legacy/reference/modules/melis-cms-mcq-engine),
[melis-cms-tags](/legacy/reference/modules/melis-cms-tags),
[melis-cms](/legacy/reference/modules/melis-cms),
[melis-core](/legacy/reference/modules/melis-core)
