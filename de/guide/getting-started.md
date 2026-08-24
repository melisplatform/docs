# Installation

Die Melis Platform Community Edition ist **kostenlos und quelloffen** (OSL-3.0). Es stehen drei
Installationswege zur Verfügung — wählen Sie den, der zu Ihrem Workflow passt.

Melis v6 behält dasselbe Framework, dieselben Module und dieselbe Datenbank wie v5. Geändert hat
sich das **Back-Office**: Eine neue React-Oberfläche befindet sich nun unter **`/melis-react`** und
steht neben den klassischen Werkzeugen. Die Installation ist identisch — die folgenden Abschnitte
gelten unverändert, und der Abschnitt [Das React-Back-Office kennenlernen](#das-react-back-office-kennenlernen)
erläutert, was Sie nach der Anmeldung sehen.

## Wo Sie die Melis Platform finden

Alle offiziellen Repositorys liegen unter der Organisation
**[melisplatform](https://github.com/melisplatform)** auf GitHub:

| Repository | Was es ist |
|---|---|
| [melis-docker-react](https://github.com/melisplatform/melis-docker-react) | Sofort einsatzbereite Docker-Stacks mit **standardmäßig aktiviertem React-Back-Office** — der schnellste Weg zu einer lauffähigen v6-Plattform |
| [melis-platform-skeleton](https://github.com/melisplatform/melis-platform-skeleton) | Projektgerüst für Composer- und Quellcode-Installationen |

Das Skeleton ist außerdem auf **Packagist** als
[`melisplatform/melis-platform-skeleton`](https://packagist.org/packages/melisplatform/melis-platform-skeleton)
verfügbar, und die Docker-Images werden auf **Docker Hub** veröffentlicht — sie werden automatisch
heruntergeladen, wenn Sie den Compose-Stack starten.

::: tip Klassischer (v5) Docker-Stack
Der pre-React-Stack [`melis-docker`](https://github.com/melisplatform/melis-docker) existiert
weiterhin; er wird in der [Legacy-Installationsanleitung (v5)](/legacy/guide/getting-started)
behandelt.
:::

## Wählen Sie Ihren Installationsweg

| Weg | Befehl | Am besten geeignet für |
|---|---|---|
| **Docker** | `git clone https://github.com/melisplatform/melis-docker-react.git` | Demos, lokale Entwicklung, keine lokale PHP-Einrichtung — **React-Back-Office standardmäßig** |
| **Composer** | `composer create-project melisplatform/melis-platform-skeleton` | Neue Projekte auf Ihrem eigenen Apache/PHP-Stack |
| **GitHub-Quellcode** | `git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git` | Mitwirkende, Teams, die die vollständige Git-Historie möchten |

---

## Voraussetzungen

Bei Docker ist alles gebündelt — springen Sie unten direkt zu [Variante A](#variante-a-docker-empfohlen).
Für Composer- oder Quellcode-Installationen:

- **PHP 8.3 (empfohlen)** oder 8.4 (experimentell) mit den Erweiterungen: `intl`, `mysqli`,
  `pdo_mysql`, `gd` (freetype/jpeg/webp), `zip`, `curl`, `mbstring`, `exif`, `xml` (sowie
  empfohlenerweise `opcache`). PHP 8.5 ist noch nicht nutzbar (die Laminas-Abhängigkeiten sind auf
  8.4 begrenzt).
- **MySQL 8** (der Stack verwendet MySQL 8.4).
- **Composer 2** und **Git** (für die Composer- und Quellcode-Wege).
- **Apache oder Nginx** mit `mod_rewrite` / `try_files`, das auf `public/` verweist.

## Variante A — Docker (empfohlen)

Melis liefert ein dediziertes **React-Edition-Docker-Repository**,
[`melis-docker-react`](https://github.com/melisplatform/melis-docker-react), in dem **jeder Stack das
React-Back-Office standardmäßig aktiviert** (`WITH_REACT=1`) — Sie erhalten von Haus aus `/melis`
(klassisch) **und** `/melis-react`. Klonen Sie es einmal und wählen Sie dann einen Stack (jeder
Ordner ist in sich abgeschlossen und enthält seine eigene `docker-compose.yml`, `.env.example`,
`conf/` und `README.md`):

```bash
git clone https://github.com/melisplatform/melis-docker-react.git
cd melis-docker-react
```

| Stack (Ordner)  | Was Sie erhalten | Am besten geeignet für |
|---|---|---|
| **`prebuilt/`**  | Zieht ein sofort lauffähiges Image + MySQL — kein lokaler Build | Schnellste Evaluierung |
| **`install/`**   | Baut ein frisches Skeleton in `./melis` auf Ihrem Host (bearbeitbar) + einen Vite-Dev-Server | Arbeit am Code / an der React-UI |
| **`fpm/`**       | nginx + PHP-FPM, Skeleton fest ins Image eingebacken | Produktionsähnliche Topologie |
| **`app/latest/`**| Bindet ein **bestehendes** Melis-Projekt ein (schreibt Ihre `composer.json` um — vorher committen) | Bereits vorhandene Projekte |
| **`dev/`**       | Nur Basis-Images pro PHP-Version (Apache/FPM, PHP 8.1–8.5) | Erstellen eigener Images |

Jeder Weg endet auf dieselbe Weise: der **native Melis-Web-Installer** unter
<http://localhost:8080> (`/melis/setup`) richtet das DB-Schema, den Administrator-Benutzer und die
optionale Demo-Site ein. Die Installation ist **nicht** skriptgesteuert — maßgeblich ist der
Web-Installer.

### Am schnellsten — vorgefertigtes Image

```bash
cd prebuilt
cp .env.example .env
docker compose up -d
# Open http://localhost:8080 and follow the web installer
```

Wenn der Installer nach der Datenbank fragt, verwenden Sie die Standardwerte aus `.env`:

| Feld | Wert |
|---|---|
| Host | `melis-db` &nbsp;*(ohne `:port`)* |
| Datenbank / Benutzer / Passwort | `melis` / `melis` / `melis` |

### Schlüsselfertiger Build (bearbeitbarer Code auf Ihrem Host)

Beim ersten Start wird `composer create-project` des Skeletons in `./melis` ausgeführt (einige
Minuten); der Code verbleibt bearbeitbar auf Ihrem Host. Dieser Stack startet außerdem einen
**Vite-Dev-Server** für das Hot-Reloading der React-UI:

```bash
cd install
cp .env.example .env
mkdir -p melis            # pre-create the bind mount (WSL / Rancher Desktop)
docker compose up -d --build
```

Der Stack stellt Folgendes bereit:

| Dienst | URL |
| --- | --- |
| Front-Office | <http://localhost:8080> |
| **React-Back-Office** | <http://localhost:8080/melis-react> |
| Klassische Werkzeuge | <http://localhost:8080/melis> |
| React-UI mit Hot Reload (Vite) | <http://localhost:5173> |

::: tip Standardwerte & Tipps
Datenbank-Host `melis-db` (ohne Port), DB / Benutzer / Passwort `melis` / `melis` / `melis`. Ändern
Sie `HOST_PORT` in `.env`, falls Port 8080 belegt ist. **Kein GitHub-Token nötig** — jedes Paket
(die React-Module und die `laminas-*`-Forks) wird über Packagist aufgelöst. `make`-Kurzbefehle:
`make up STACK=install`, `make logs`, `make shell`, `make down`, `make up VITE=1`, `make adminer`.
:::

::: warning Zugangsdaten vor dem Produktivbetrieb ändern
Die Standard-Zugangsdaten `melis` / `melis` und das Datenbank-Passwort sind ausschließlich für die
lokale Entwicklung gedacht. Ändern Sie sie, bevor Sie eine Instanz öffentlich zugänglich machen.
:::

### Wie das React-Back-Office aktiviert wird

Composer zieht die stabilen **6.x**-Releases von drei Modulen: [`melis-core`](/de/reference/modules/melis-core)
(liefert einen committeten Produktions-Build der React-App, bereitgestellt unter
`/MelisCore/ui-react/` — kein Node.js zur Laufzeit), [`melis-react-api`](/de/reference/modules/melis-react-api)
(die JSON-API unter `/melis/react-api/*`) und [`melis-react-override`](/de/reference/modules/melis-react-override)
(die `/melis-react`-SPA-Route + die iframe-Brücke, die noch nicht migrierte Werkzeuge innerhalb der
React-Shell anzeigt). Bevorzugen Sie das klassische Legacy-Melis? Setzen Sie `WITH_REACT=0` in
`.env` vor dem ersten `up`.

Um mehrere Stacks gleichzeitig zu betreiben, ohne mit Ports jonglieren zu müssen, leitet ein
optionaler gemeinsamer `nginx-proxy` in `local-proxy/` `*.local`-Hostnamen weiter — siehe die
README des Repositorys.

## Variante B — Composer (neues Projekt auf Ihrem Stack)

```bash
# 1. Create the project from the skeleton
composer create-project melisplatform/melis-platform-skeleton my-project
cd my-project
composer install

# 2. Create the database (utf8mb4)
mysql -u root -p -e "CREATE DATABASE myproject CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. Import the base data, then run migrations
mysql -u root -p myproject < install/first_install.sql
flyway -configFiles=flyway/conf/flyway.conf migrate
```

Richten Sie einen virtuellen Apache-Host auf das Verzeichnis **`public/`** des Projekts und
deklarieren Sie die beiden Melis-Umgebungsvariablen:

```apache
<VirtualHost *:80>
    DocumentRoot "/path/to/my-project/public"
    <Directory "/path/to/my-project/public">
        Options -Indexes +FollowSymLinks +ExecCGI
        DirectoryIndex index.php
        AllowOverride All
        Require all granted
    </Directory>

    ServerName www.mysite.local
    SetEnv MELIS_PLATFORM "development"
    SetEnv MELIS_MODULE   "MelisDemoCms"
</VirtualHost>
```

Fügen Sie `127.0.0.1 www.mysite.local` zu Ihrer hosts-Datei hinzu, laden Sie Apache neu und öffnen
Sie dann `http://www.mysite.local/melis-react`.

## Variante C — GitHub-Quellcode (Mitwirkende)

Jedes Modul liegt in seinem eigenen Repository und wird als Git-Submodul eingebunden:

```bash
git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git
# Already cloned? Pull all submodules:
git submodule update --init --recursive

cd melis-platform-skeleton
composer install
```

Folgen Sie anschließend derselben Einrichtung des virtuellen Hosts und der Datenbank wie in
Variante B oben.

## Die beiden Melis-Umgebungsvariablen

Jede Melis-Installation wird von zwei Variablen gesteuert (in `docker-compose.yml` bei Docker oder
über `SetEnv` bei Apache gesetzt):

- **`MELIS_PLATFORM`** — identifiziert die Umgebung. Sie wählt die Konfigurationsdatei
  `config/autoload/platforms/<MELIS_PLATFORM>.php` aus, die die **Datenbankverbindung** enthält
  (sodass `MELIS_PLATFORM=local` die Datei `config/autoload/platforms/local.php` lädt).
- **`MELIS_MODULE`** — identifiziert, welches **Site-Modul** als Front-Office für diese Domain
  ausgeliefert wird.

## Das React-Back-Office kennenlernen

Öffnen Sie **`/melis-react`** und melden Sie sich an — die React-App zeigt ihren eigenen
Anmeldebildschirm und übernimmt die Authentifizierung selbst. Nach der Anmeldung landen Sie auf dem
Dashboard: Benachrichtigungs-Bubbles, KPI-Zähler (Benutzer / Sites / Seiten / Sprachen), die letzten
Anmeldeaktivitäten und Ihr gespeichertes Kachel-Layout.

Einige Dinge, die beim ersten Kontakt gut zu wissen sind:

- **Linkes Menü.** Der gesamte Navigationsbaum befindet sich dort, bereits **nach Ihren Rechten
  gefiltert** — ein Werkzeug erscheint nur, wenn dessen Modul aktiviert ist und Sie es verwenden
  dürfen. Klicken Sie auf einen Eintrag, um das entsprechende Werkzeug im Hauptbereich zu öffnen.
- **Native React-Werkzeuge („Bricks").** Viele Werkzeuge wurden als native React-Seiten neu
  geschrieben, um ein schnelleres, flüssigeres Erlebnis zu bieten. Jedes davon verfügt über einen
  **New (React) / Old (iframe)**-Umschalter, sodass Sie bei Bedarf jederzeit zur klassischen Version
  desselben Werkzeugs wechseln können.
- **Klassische Werkzeuge funktionieren weiterhin.** Jedes Werkzeug, das noch nicht neu geschrieben
  wurde, öffnet sich nahtlos innerhalb der Shell — dieselben DataTables, Formulare, Tabs, Modals und
  Speichern-Schaltflächen wie zuvor. Es sieht aus und verhält sich genau wie das klassische
  `/melis`-Back-Office, nur eingerahmt in die React-UI.
- **Zwei URLs, eine Plattform.** `/melis-react` ist das neue Erlebnis; das klassische Back-Office
  bleibt unter **`/melis`** verfügbar, falls Sie es einmal bevorzugen. Beide arbeiten mit denselben
  Daten, Rechten und Modulen.

::: tip Der KI-Assistent ist immer nur einen Klick entfernt
Eine schwebende **KI-Assistent**-Schaltfläche befindet sich in der Ecke jedes
Back-Office-Bildschirms. Öffnen Sie sie, um mit dem in Melis integrierten Assistenten zu chatten,
ohne das Werkzeug zu verlassen, an dem Sie gerade arbeiten.

![Die schwebende KI-Assistent-Schaltfläche im React-Back-Office](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant.png)
:::

Siehe [Architektur & Konzepte](./concepts) für das mentale Modell hinter der Shell, den Bricks und
der Brücke zu den klassischen Werkzeugen sowie die [Modulreferenz](/de/reference/modules/melis-core)
dafür, was jedes Werkzeug leistet.

## Nächste Schritte

- [Architektur & Konzepte](./concepts) — das mentale Modell hinter Melis.
- [Eine Website erstellen (CMS)](./build-a-site) — Seiten, Templates und Site-Bäume.
- [Ihr erstes Werkzeug erstellen](./create-a-tool) — fügen Sie Ihr eigenes Back-Office-Werkzeug hinzu.
- [Arbeiten mit KI](./ai) — der Assistent, Agenten und MCP innerhalb von Melis.
