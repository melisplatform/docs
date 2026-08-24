# Installazione

Melis Platform Community Edition è **gratuita e open-source** (OSL-3.0). Sono disponibili tre
percorsi di installazione: scegli quello più adatto al tuo flusso di lavoro.

Melis v6 mantiene lo stesso framework, gli stessi moduli e lo stesso database della v5. Ciò che è
cambiato è il **back-office**: una nuova interfaccia React ora risiede su **`/melis-react`**, accanto
agli strumenti classici. L'installazione è identica: le sezioni seguenti si applicano invariate, e la
sezione [Scopri il back-office React](#scopri-il-back-office-react) spiega cosa vedrai una volta
effettuato l'accesso.

## Dove trovare Melis Platform

Tutti i repository ufficiali risiedono nell'organizzazione
**[melisplatform](https://github.com/melisplatform)** su GitHub:

| Repository | Che cos'è |
|---|---|
| [melis-docker-react](https://github.com/melisplatform/melis-docker-react) | Stack Docker pronti all'uso con il **back-office React abilitato per impostazione predefinita**: il percorso più rapido per una piattaforma v6 funzionante |
| [melis-platform-skeleton](https://github.com/melisplatform/melis-platform-skeleton) | Scheletro di progetto per le installazioni tramite Composer e sorgente |

Lo scheletro è disponibile anche su **Packagist** come
[`melisplatform/melis-platform-skeleton`](https://packagist.org/packages/melisplatform/melis-platform-skeleton),
e le immagini Docker sono pubblicate su **Docker Hub**: vengono scaricate automaticamente quando
avvii lo stack Compose.

::: tip Stack Docker classico (v5)
Lo stack pre-React [`melis-docker`](https://github.com/melisplatform/melis-docker) esiste ancora ed è
trattato nella [guida all'installazione legacy (v5)](/legacy/guide/getting-started).
:::

## Scegli il tuo percorso di installazione

| Percorso | Comando | Ideale per |
|---|---|---|
| **Docker** | `git clone https://github.com/melisplatform/melis-docker-react.git` | Demo, sviluppo locale, nessuna configurazione PHP locale — **back-office React per impostazione predefinita** |
| **Composer** | `composer create-project melisplatform/melis-platform-skeleton` | Nuovi progetti sul proprio stack Apache/PHP |
| **Sorgente GitHub** | `git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git` | Contributori, team che desiderano l'intera cronologia Git |

---

## Requisiti

Per Docker è tutto incluso: passa direttamente all'[Opzione A](#opzione-a-docker-consigliata) qui sotto.
Per le installazioni tramite Composer o sorgente:

- **PHP 8.3 (consigliato)** o 8.4 (sperimentale) con le estensioni: `intl`, `mysqli`,
  `pdo_mysql`, `gd` (freetype/jpeg/webp), `zip`, `curl`, `mbstring`, `exif`, `xml` (e `opcache`
  consigliato). PHP 8.5 non è ancora utilizzabile (le dipendenze Laminas si fermano a 8.4).
- **MySQL 8** (lo stack utilizza MySQL 8.4).
- **Composer 2** e **Git** (per i percorsi Composer e sorgente).
- **Apache o Nginx** con `mod_rewrite` / `try_files` che puntano a `public/`.

## Opzione A — Docker (consigliata)

Melis fornisce un **repository Docker dedicato all'edizione React**,
[`melis-docker-react`](https://github.com/melisplatform/melis-docker-react), in cui **ogni stack
abilita il back-office React per impostazione predefinita** (`WITH_REACT=1`): ottieni `/melis` (classico)
**e** `/melis-react` da subito. Clonalo una volta, poi scegli uno stack (ogni cartella è autonoma, con
il proprio `docker-compose.yml`, `.env.example`, `conf/` e `README.md`):

```bash
git clone https://github.com/melisplatform/melis-docker-react.git
cd melis-docker-react
```

| Stack (cartella)  | Cosa ottieni | Ideale per |
|---|---|---|
| **`prebuilt/`**  | Scarica un'immagine pronta all'uso + MySQL — nessuna build locale | Valutazione più rapida |
| **`install/`**   | Crea uno scheletro nuovo in `./melis` sul tuo host (modificabile) + un server di sviluppo Vite | Lavorare sul codice / sull'interfaccia React |
| **`fpm/`**       | nginx + PHP-FPM, scheletro incorporato nell'immagine | Topologia in stile produzione |
| **`app/latest/`**| Monta un progetto Melis **esistente** (riscrive il tuo `composer.json` — esegui prima il commit) | Progetti che hai già |
| **`dev/`**       | Solo immagini di base per versione di PHP (Apache/FPM, PHP 8.1–8.5) | Creare le proprie immagini |

Ogni percorso si conclude allo stesso modo: il **web installer nativo di Melis** all'indirizzo
<http://localhost:8080> (`/melis/setup`) configura lo schema del DB, l'utente amministratore e il sito
demo facoltativo. L'installazione **non** è automatizzata via script: il web installer è la fonte
autorevole.

### Il più rapido — immagine pre-compilata

```bash
cd prebuilt
cp .env.example .env
docker compose up -d
# Apri http://localhost:8080 e segui il web installer
```

Quando l'installer chiede i dati del database, usa i valori predefiniti di `.env`:

| Campo | Valore |
|---|---|
| Host | `melis-db` &nbsp;*(nessun `:port`)* |
| Database / Utente / Password | `melis` / `melis` / `melis` |

### Build chiavi in mano (codice modificabile sul tuo host)

Al primo avvio viene eseguito `composer create-project` dello scheletro in `./melis` (alcuni minuti);
il codice rimane sul tuo host, modificabile. Questo stack avvia anche un **server di sviluppo Vite** per
l'hot-reload dell'interfaccia React:

```bash
cd install
cp .env.example .env
mkdir -p melis            # pre-crea il bind mount (WSL / Rancher Desktop)
docker compose up -d --build
```

Lo stack espone:

| Servizio | URL |
| --- | --- |
| Front office | <http://localhost:8080> |
| **Back-office React** | <http://localhost:8080/melis-react> |
| Strumenti classici | <http://localhost:8080/melis> |
| Interfaccia React con hot reload (Vite) | <http://localhost:5173> |

::: tip Valori predefiniti e suggerimenti
Host del database `melis-db` (nessuna porta), db / utente / password `melis` / `melis` / `melis`. Modifica
`HOST_PORT` in `.env` se la porta 8080 è occupata. **Nessun token GitHub necessario**: ogni pacchetto (i
moduli React e i fork `laminas-*`) viene risolto da Packagist. Scorciatoie `make`: `make up STACK=install`,
`make logs`, `make shell`, `make down`, `make up VITE=1`, `make adminer`.
:::

::: warning Modifica le credenziali prima di andare in produzione
Le credenziali predefinite `melis` / `melis` e la password del database sono destinate esclusivamente allo
sviluppo locale. Modificale prima di esporre pubblicamente qualsiasi istanza.
:::

### Come viene abilitato il back-office React

Composer scarica le release stabili **6.x** di tre moduli: [`melis-core`](/it/reference/modules/melis-core)
(include una build di produzione dell'app React, servita sotto `/MelisCore/ui-react/` — nessun Node.js
a runtime), [`melis-react-api`](/it/reference/modules/melis-react-api) (l'API JSON sotto
`/melis/react-api/*`) e [`melis-react-override`](/it/reference/modules/melis-react-override) (la
rotta SPA `/melis-react` + il bridge iframe che mostra gli strumenti non ancora migrati all'interno della
shell React). Preferisci il Melis legacy semplice? Imposta `WITH_REACT=0` in `.env` prima del primo `up`.

Per eseguire più stack contemporaneamente senza dover gestire le porte, un `nginx-proxy` condiviso opt-in
in `local-proxy/` instrada gli hostname `*.local` — consulta il README del repository.

## Opzione B — Composer (nuovo progetto sul tuo stack)

```bash
# 1. Crea il progetto a partire dallo scheletro
composer create-project melisplatform/melis-platform-skeleton my-project
cd my-project
composer install

# 2. Crea il database (utf8mb4)
mysql -u root -p -e "CREATE DATABASE myproject CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. Importa i dati di base, poi esegui le migrazioni
mysql -u root -p myproject < install/first_install.sql
flyway -configFiles=flyway/conf/flyway.conf migrate
```

Fai puntare un virtual host Apache alla directory **`public/`** del progetto e dichiara le due variabili
d'ambiente di Melis:

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

Aggiungi `127.0.0.1 www.mysite.local` al tuo file hosts, ricarica Apache, poi apri
`http://www.mysite.local/melis-react`.

## Opzione C — Sorgente GitHub (contributori)

Ogni modulo risiede nel proprio repository, incluso come submodule Git:

```bash
git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git
# Hai già clonato? Scarica tutti i submodule:
git submodule update --init --recursive

cd melis-platform-skeleton
composer install
```

Poi segui la stessa configurazione del virtual host e del database dell'Opzione B qui sopra.

## Le due variabili d'ambiente di Melis

Ogni installazione Melis è guidata da due variabili (impostate in `docker-compose.yml` per Docker, oppure
tramite `SetEnv` per Apache):

- **`MELIS_PLATFORM`** — identifica l'ambiente. Seleziona il file di configurazione
  `config/autoload/platforms/<MELIS_PLATFORM>.php`, che contiene la **connessione al database** (quindi
  `MELIS_PLATFORM=local` carica `config/autoload/platforms/local.php`).
- **`MELIS_MODULE`** — identifica quale **modulo del sito** viene servito come front office per questo
  dominio.

## Scopri il back-office React

Apri **`/melis-react`** ed effettua l'accesso: l'app React mostra la propria schermata di login e gestisce
l'autenticazione autonomamente. Una volta dentro, arrivi alla dashboard: bolle di notifica, contatori KPI
(utenti / siti / pagine / lingue), attività di accesso recente e il layout dei riquadri salvato.

Alcune cose utili da sapere al primo contatto:

- **Menu di sinistra.** L'intero albero di navigazione è lì, già **filtrato in base ai tuoi diritti**: uno
  strumento appare solo se il suo modulo è abilitato e sei autorizzato a utilizzarlo. Fai clic su una voce
  per aprire lo strumento corrispondente nel pannello principale.
- **Strumenti React nativi ("bricks").** Molti strumenti sono stati riscritti come pagine React native per
  un'esperienza più rapida e fluida. Ciascuno di essi presenta un interruttore **New (React) / Old (iframe)**
  che ti permette di passare alla versione classica dello stesso strumento ogni volta che ne hai bisogno.
- **Gli strumenti classici funzionano ancora.** Qualsiasi strumento non ancora riscritto si apre senza
  interruzioni all'interno della shell — stessi DataTables, form, schede, modali e pulsanti di salvataggio di
  prima. Ha l'aspetto e il comportamento esattamente del back-office classico `/melis`, semplicemente
  incorniciato all'interno dell'interfaccia React.
- **Due URL, una piattaforma.** `/melis-react` è la nuova esperienza; il back-office classico rimane
  disponibile su **`/melis`** se dovessi preferirlo. Entrambi gestiscono gli stessi dati, diritti e moduli.

::: tip L'Assistente AI è sempre a un clic di distanza
Un pulsante **Assistente AI** fluttuante si trova nell'angolo di ogni schermata del back-office. Aprilo per
chattare con l'assistente integrato di Melis senza lasciare lo strumento su cui stai lavorando.

![Il pulsante fluttuante dell'Assistente AI nel back-office React](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant.png)
:::

Consulta [Architettura e concetti](./concepts) per il modello mentale alla base della shell, dei bricks e del
bridge verso gli strumenti classici, e il [riferimento dei moduli](/it/reference/modules/melis-core) per
sapere cosa fa ciascuno strumento.

## Prossimi passi

- [Architettura e concetti](./concepts) — il modello mentale alla base di Melis.
- [Creare un sito web (CMS)](./build-a-site) — pagine, template e alberi dei siti.
- [Crea il tuo primo strumento](./create-a-tool) — aggiungi il tuo strumento di back-office.
- [Lavorare con l'AI](./ai) — l'assistente, gli agenti e MCP all'interno di Melis.
