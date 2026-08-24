# Modulreferenz

Melis Platform ist eine Sammlung von `melisplatform/*`-Composer-Paketen. Dies ist eine Übersicht
der **50 Module**, die mit dem v6-Skeleton ausgeliefert werden, gruppiert nach Bereichen. Jedes
davon ist ein standardmäßiges Laminas-Modul unter `vendor/melisplatform/`.

Melis v6 behält dasselbe Framework und dieselben Module wie v5 bei, **ersetzt jedoch das
Back-Office durch eine React-Oberfläche**, die unter `/melis-react` bereitgestellt wird. Werkzeuge
sind nun native React-**„Bricks"** — eigenständige React-Oberflächen, die ein Modul mitliefert und
die die Shell beim Start erkennt — mit einem Umschalter **New (React) / Old (iframe)**, sodass
jedes Werkzeug, das noch nicht neu geschrieben wurde, weiterhin als seine bisherige
jQuery/AJAX-Seite innerhalb der Shell läuft. Ein globaler **AI Assistant** steht als Overlay
überall zur Verfügung. Diese Ebene wird über zwei Infrastrukturmodule bereitgestellt:
[`melis-react-api`](/de/reference/modules/melis-react-api) (das Rückgrat der JSON-API — Benutzer,
Menü, Assets, Brick-Erkennung, Dashboard-Daten, Capability-Resolver) und
[`melis-react-override`](/de/reference/modules/melis-react-override) (die Route der SPA-Shell sowie
der iframe-Mechanismus für Altwerkzeuge). Wie all dies zusammenwirkt, erläutert der
[Architektur-Leitfaden](/de/guide/architecture).

::: tip Eine Seite pro Modul
Jedes Modul verfügt außerdem über eine **eigene Referenzseite** (Zweck, zentrale Dienste,
Werkzeuge, Plugins, Tabellen, wichtige Dateien) — öffnen Sie den Abschnitt **Modules** in der
Seitenleiste, z. B. [MelisCms](/de/reference/modules/melis-cms),
[MelisCommerce](/de/reference/modules/melis-commerce),
[MelisAIEngine](/de/reference/modules/melis-ai-engine).
:::

## Kern & Plattform

| Modul | Rolle |
| --- | --- |
| [`melis-core`](/de/reference/modules/melis-core) | Der Plattformkern: Back-Office-Shell, Konfigurationsbaum (`MelisCoreConfig`), Authentifizierung, Rechte, Benutzer, Dienste und Events. In v6 unverändert — lediglich die von ihm betriebene Shell wird nun von React gerendert. |
| [`melis-asset-manager`](/de/reference/modules/melis-asset-manager) | Liefert die `public/`-Assets (CSS/JS/Bilder) jedes Moduls über saubere URLs aus und stellt die kompilierten Bundles bereit. |
| [`melis-cache-internal`](/de/reference/modules/melis-cache-internal) | Vollseitiger HTTP-Cache für das CMS-Front-Office, mit partiellem (zonenbasiertem) Caching und Ausnahmen pro Seite. |
| [`melis-composerdeploy`](/de/reference/modules/melis-composerdeploy) | Bindet Composer ein, um Module programmatisch zu installieren, zu aktualisieren und zu entfernen. |
| [`melis-dbdeploy`](/de/reference/modules/melis-dbdeploy) | Headless-Ausführungswerkzeug für Datenbankmigrationen — wendet die SQL-Deltas jedes Moduls der Reihe nach an. |
| [`melis-marketplace`](/de/reference/modules/melis-marketplace) | Modul-Store im Back-Office zum Entdecken, Herunterladen, Aktualisieren und Entfernen von Modulen. |
| [`melis-phpinfo`](/de/reference/modules/melis-phpinfo) | Schreibgeschütztes Diagnosewerkzeug, das die native `phpinfo()`-Ausgabe von PHP im React-Back-Office darstellt. |
| [`melis-sql`](/de/reference/modules/melis-sql) | Schreibgeschütztes SQL-Abfragewerkzeug in den Dev Tools, ausgeliefert als native Full-React-Brick. |
| [`melis-react-api`](/de/reference/modules/melis-react-api) | JSON-API-Rückgrat des React-Back-Office — startet die Shell und beherbergt den Capability-Resolver. |
| [`melis-react-override`](/de/reference/modules/melis-react-override) | React-Infrastruktur — rendert Altwerkzeuge innerhalb der `/melis-react`-Shell und stellt die React-SPA bereit. |

## CMS & Front

| Modul | Rolle |
| --- | --- |
| [`melis-cms`](/de/reference/modules/melis-cms) | Das CMS-Back-Office — Sites, Seitenbaum, Seiteneditor, Templates, Styles und SEO, als React-Back-Office. |
| [`melis-engine`](/de/reference/modules/melis-engine) | Gemeinsame Datenbasis des CMS — Seitenmodell, Sites, Sprachen, Basisklasse für Templating-Plugins und Render-Cache. |
| [`melis-front`](/de/reference/modules/melis-front) | Front-Office-Rendering-System — wandelt eine URL in eine fertige Seite um und liefert die Inhaltsblöcke (Seiten-Plugins). |
| [`melis-demo-cms`](/de/reference/modules/melis-demo-cms) | Die offizielle Referenz-/Demo-Website — ein installationsbereites **Site-Modul**. |
| [`melis-cms-blog`](/de/reference/modules/melis-cms-blog) | Blog-System mit einem nativen React-Back-Office und drei Front-Office-Anzeige-Plugins. |
| [`melis-cms-comments`](/de/reference/modules/melis-cms-comments) | Kommentarsystem für News und Blog — Moderation, Freigabe-Workflow und ein Front-Plugin; ein Comments-Tab im Editor. |
| [`melis-cms-news`](/de/reference/modules/melis-cms-news) | News-/Blog-System mit einem React-Redaktionswerkzeug und drei Front-Office-Anzeige-Plugins. |
| [`melis-cms-prospects`](/de/reference/modules/melis-cms-prospects) | Lead-/Kontaktverwaltung — ein Front-Formular erfasst Nachrichten; ein React-Werkzeug durchsucht, filtert, exportiert und klassifiziert sie. |
| [`melis-cms-slider`](/de/reference/modules/melis-cms-slider) | Slider-/Karussell-Manager (native React-Brick) mit einem Front-Office-Templating-Plugin. |
| [`melis-cms-category2`](/de/reference/modules/melis-cms-category2) | Mehrsprachige Inhaltskategorien über mehrere Sites hinweg, mit einem nativen React-Back-Office. |
| [`melis-cms-mcq`](/de/reference/modules/melis-cms-mcq) | Back-Office-Werkzeug zum Erstellen von MCQ (Quizzen), nun ein natives Full-React-Werkzeug. |
| [`melis-cms-mcq-engine`](/de/reference/modules/melis-cms-mcq-engine) | Daten, Auswertung und Front-Office-Renderer hinter dem React-MCQ-Werkzeug. |
| [`melis-cms-page-historic`](/de/reference/modules/melis-cms-page-historic) | Audit-Protokoll für die Seitenbearbeitung — ein Historic-Tab im React-Seiteneditor sowie ein Dashboard-Widget. |
| [`melis-cms-page-analytics`](/de/reference/modules/melis-cms-page-analytics) | Einfache Analyse der Seitenaufrufe, erweiterbar über einen Provider (z. B. Google Analytics). |
| [`melis-cms-page-script-editor`](/de/reference/modules/melis-cms-page-script-editor) | Einbindung von benutzerdefiniertem `<script>`/`<style>`/HTML pro Seite oder pro Site (Analytics, Pixel, Widgets). |
| [`melis-cms-share`](/de/reference/modules/melis-cms-share) | Fügt Social-Media-Share-/Open-Graph-Meta-Tags ein, verwaltet über ein natives React-Back-Office. |
| [`melis-cms-site-robot`](/de/reference/modules/melis-cms-site-robot) | Bearbeitung und dynamische Auslieferung der `robots.txt` pro Domain, mit einem nativen Full-React-Back-Office. |
| [`melis-cms-tags`](/de/reference/modules/melis-cms-tags) | Gemeinsames Tag-/Taxonomiesystem, an das Inhaltsmodule ihre Elemente anhängen, nun mit einem nativen React-Back-Office. |
| [`melis-cms-user-account`](/de/reference/modules/melis-cms-user-account) | Front-Office-Kontosystem für Besucher — Registrierung, Anmeldung und Profile pro Site, administriert über ein React-Werkzeug. |
| [`melis-cms-google-analytics`](/de/reference/modules/melis-cms-google-analytics) | GA4-Provider, der Sitzungskurven, KPI-Summen und Demografie im React-Back-Office darstellt. |
| [`melis-cms-link-check`](/de/reference/modules/melis-cms-link-check) | Link-Prüfer, der eine Seite (und optional Unterseiten) durchsucht und jeden defekten Link erfasst. |

## Commerce

| Modul | Rolle |
| --- | --- |
| [`melis-commerce`](/de/reference/modules/melis-commerce) | Vollständiges E-Commerce-Framework — Katalog, Kunden, Warenkorb/Checkout/Bestellungen, Gutscheine, Versand und SEO — mit einem React-Back-Office. |
| [`melis-commerce-order-invoice`](/de/reference/modules/melis-commerce-order-invoice) | Ergänzt die Erzeugung von PDF-Bestellrechnungen, eingebunden im React-Orders-Werkzeug. |
| [`melis-commerce-group-discount-per-category`](/de/reference/modules/melis-commerce-group-discount-per-category) | Preisnachlass pro Kategorie (nach Land und Kundengruppe) als Tab im React-Catalogs-Werkzeug. |

## Erweiterungen & Dienstprogramme

| Modul | Rolle |
| --- | --- |
| [`melis-templating-plugin-creator`](/de/reference/modules/melis-templating-plugin-creator) | Back-Office-Assistent, der ein vollständiges Front-Office-**Templating-Plugin** erstellt. |
| [`melis-dashboard-plugin-creator`](/de/reference/modules/melis-dashboard-plugin-creator) | Assistent, der ein neues Back-Office-**Dashboard-Plugin** (Widget) erstellt, als native React-Brick. |
| [`melis-calendar`](/de/reference/modules/melis-calendar) | Terminplanungswerkzeug mit einem nativen React-Monatskalender, Drag-and-Drop-Terminen und einem Dashboard-Widget. |
| [`melis-cron`](/de/reference/modules/melis-cron) | Manager für geplante Aufgaben — CLI-/HTTP-Aufgaben definieren, ausführen und den Ausführungsverlauf einsehen, über ein natives React-Werkzeug. |
| [`melis-document-upload`](/de/reference/modules/melis-document-upload) | Verwaltung von Dokument-Uploads als natives React-Werkzeug — Typen definieren, Dateien sammeln und ausliefern. |
| [`melis-messenger`](/de/reference/modules/melis-messenger) | Interne Benutzer-zu-Benutzer-Nachrichten — ein Benachrichtigungssymbol in der Topbar und ein Tab in My Account. |
| [`melis-small-business`](/de/reference/modules/melis-small-business) | Redaktionelle Erweiterung — Rollen, Validierungs-Workflow, Seitenversionierung, Kommentare, Sperren und eine Medienbibliothek. |

## Authentifizierung

| Modul | Rolle |
| --- | --- |
| [`melis-login-2fa`](/de/reference/modules/melis-login-2fa) | Kern der Zwei-Faktor-Authentifizierung — verlangt einen Einmalcode und delegiert die Zustellung an Kanalmodule. |
| [`melis-login-2fa-email`](/de/reference/modules/melis-login-2fa-email) | E-Mail-Zustellkanal — versendet den einmaligen Anmeldecode per E-Mail. |
| [`melis-login-2fa-primotexto`](/de/reference/modules/melis-login-2fa-primotexto) | SMS-Zustellkanal über das Primotexto-Gateway. |

## Benachrichtigungen

| Modul | Rolle |
| --- | --- |
| [`melis-newsletter`](/de/reference/modules/melis-newsletter) | Verwandelt eine CMS-Seite in einen personalisierten E-Mail-Newsletter und stellt ihn Abonnentengruppen zu, aus einem React-Back-Office. |

## KI

| Modul | Rolle |
| --- | --- |
| [`melis-ai`](/de/reference/modules/melis-ai) | React-Back-Office für die KI-Suite — Provider verbinden, Agenten entwerfen, Instanzen bereitstellen, Nutzung überwachen, überall chatten. |
| [`melis-ai-engine`](/de/reference/modules/melis-ai-engine) | Die abstrakte KI-Engine — Provider-Vertrag, Laufzeitumgebung für Agenten/Szenarien, Konversationsspeicher, MCP-/Tool-Bridge und gemeinsame React-Chat-Komponenten. |
| [`melis-ai-engine-claude`](/de/reference/modules/melis-ai-engine-claude) | Anthropic-Claude-Provider für die KI-Engine (Backend, ohne eigene React-Oberfläche). |
| [`melis-ai-engine-gemini`](/de/reference/modules/melis-ai-engine-gemini) | Google-Gemini-Provider für die KI-Engine (Backend, ohne eigenes Back-Office). |
| [`melis-ai-community-extensions`](/de/reference/modules/melis-ai-community-extensions) | Bindet KI-Generierung in bestehende CMS-Bearbeitungsoberflächen ein (Mini-Templates, News, Drag-and-Drop-Zonen). |

::: tip Nur-v5-Module liegen unter /legacy
Einige Module aus dem v5-Back-Office haben noch keine eigene v6-Seite — z. B.
[`melis-tool-creator`](/legacy/reference/modules/melis-tool-creator),
[`melis-installer`](/legacy/reference/modules/melis-installer) sowie die `form-*`-Module.
Ihre Dokumentation ist unter `/legacy/reference/modules/` eingefroren.
:::

::: tip Quellcode durchstöbern
Jedes Modul liegt unter `vendor/melisplatform/<module-name>/`. Das Lesen des `config/`- und
`src/`-Verzeichnisses eines Moduls ist der schnellste Weg, seine öffentlichen Dienste und
Konventionen kennenzulernen.
:::
