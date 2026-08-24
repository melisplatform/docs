# Riferimento dei moduli

Melis Platform è un insieme di pacchetti Composer `melisplatform/*`. Questa è una mappa dei **50
moduli** forniti con lo skeleton v6, raggruppati per area. Ciascuno è un modulo Laminas standard
sotto `vendor/melisplatform/`.

Melis v6 mantiene lo stesso framework e gli stessi moduli della v5, ma **sostituisce il back-office
con una UI React** servita su `/melis-react`. I tool sono ora **«bricks»** React nativi — UI React
autonome che un modulo fornisce e che la shell rileva all'avvio — con un interruttore **New (React) /
Old (iframe)**, così che qualsiasi tool non ancora riscritto continui a funzionare come la sua pagina
legacy jQuery/AJAX all'interno della shell. Un overlay globale **AI Assistant** è disponibile ovunque.
Questo livello viene servito attraverso due moduli infrastrutturali:
[`melis-react-api`](/it/reference/modules/melis-react-api) (la struttura portante dell'API JSON —
utenti, menu, asset, rilevamento dei brick, dati della dashboard, capability resolver) e
[`melis-react-override`](/it/reference/modules/melis-react-override) (la rotta della shell SPA più il
meccanismo iframe per i tool legacy). Consulta la [guida all'architettura](/it/guide/architecture) per
capire come tutto si integra.

::: tip Una pagina per modulo
Ogni modulo dispone anche di una **pagina di riferimento dedicata** (scopo, servizi principali, tool,
plugin, tabelle, file chiave) — apri la sezione **Modules** nella barra laterale, ad es.
[MelisCms](/it/reference/modules/melis-cms), [MelisCommerce](/it/reference/modules/melis-commerce),
[MelisAIEngine](/it/reference/modules/melis-ai-engine).
:::

## Core e piattaforma

| Modulo | Ruolo |
| --- | --- |
| [`melis-core`](/it/reference/modules/melis-core) | Il core della piattaforma: shell del back-office, albero di configurazione (`MelisCoreConfig`), autenticazione, permessi, utenti, servizi ed eventi. Invariato in v6 — solo la shell che alimenta è ora renderizzata da React. |
| [`melis-asset-manager`](/it/reference/modules/melis-asset-manager) | Serve gli asset `public/` di ogni modulo (CSS/JS/immagini) tramite URL puliti e distribuisce i bundle compilati. |
| [`melis-cache-internal`](/it/reference/modules/melis-cache-internal) | Cache HTTP a pagina intera per il front-office del CMS, con cache parziale (per zona) ed esclusioni per singola pagina. |
| [`melis-composerdeploy`](/it/reference/modules/melis-composerdeploy) | Integra Composer per installare, aggiornare e rimuovere moduli in modo programmatico. |
| [`melis-dbdeploy`](/it/reference/modules/melis-dbdeploy) | Esecutore headless delle migrazioni di database — applica in ordine i delta SQL di ciascun modulo. |
| [`melis-marketplace`](/it/reference/modules/melis-marketplace) | Store dei moduli integrato nel back-office per scoprire, scaricare, aggiornare e rimuovere moduli. |
| [`melis-phpinfo`](/it/reference/modules/melis-phpinfo) | Strumento diagnostico in sola lettura che mostra il `phpinfo()` nativo di PHP all'interno del back-office React. |
| [`melis-sql`](/it/reference/modules/melis-sql) | Esecutore di query SQL in sola lettura nei Dev Tools, fornito come brick full-React nativo. |
| [`melis-react-api`](/it/reference/modules/melis-react-api) | Struttura portante dell'API JSON del back-office React — avvia la shell e ospita il capability resolver. |
| [`melis-react-override`](/it/reference/modules/melis-react-override) | Infrastruttura React — renderizza i tool legacy all'interno della shell `/melis-react` e serve la SPA React. |

## CMS e front

| Modulo | Ruolo |
| --- | --- |
| [`melis-cms`](/it/reference/modules/melis-cms) | Il back-office del CMS — siti, albero delle pagine, editor delle pagine, template, stili e SEO, come back-office React. |
| [`melis-engine`](/it/reference/modules/melis-engine) | Base dati condivisa del CMS — modello delle pagine, siti, lingue, classe base dei plugin di templating e cache di rendering. |
| [`melis-front`](/it/reference/modules/melis-front) | Sistema di rendering del front-office — trasforma un URL in una pagina finita e fornisce i blocchi di contenuto (page plugin). |
| [`melis-demo-cms`](/it/reference/modules/melis-demo-cms) | Il sito web ufficiale di riferimento/demo — un **modulo sito** pronto all'installazione. |
| [`melis-cms-blog`](/it/reference/modules/melis-cms-blog) | Sistema di blog con un back-office React nativo e tre plugin di visualizzazione per il front-office. |
| [`melis-cms-comments`](/it/reference/modules/melis-cms-comments) | Sistema di commenti per News e Blog — moderazione, flusso di approvazione e un plugin front; una scheda Comments nell'editor. |
| [`melis-cms-news`](/it/reference/modules/melis-cms-news) | Sistema di news/blog con un tool di redazione React e tre plugin di visualizzazione per il front-office. |
| [`melis-cms-prospects`](/it/reference/modules/melis-cms-prospects) | Gestione di lead/contatti — un form front cattura i messaggi; un tool React li sfoglia, filtra, esporta e classifica. |
| [`melis-cms-slider`](/it/reference/modules/melis-cms-slider) | Gestore di slider/carosello (brick React nativo) con un plugin di templating per il front-office. |
| [`melis-cms-category2`](/it/reference/modules/melis-cms-category2) | Categorie di contenuti multi-sito e multilingua, con un back-office React nativo. |
| [`melis-cms-mcq`](/it/reference/modules/melis-cms-mcq) | Costruttore di MCQ (quiz) nel back-office, ora un tool full-React nativo. |
| [`melis-cms-mcq-engine`](/it/reference/modules/melis-cms-mcq-engine) | Dati, calcolo dei punteggi e renderer front-office alla base del tool MCQ React. |
| [`melis-cms-page-historic`](/it/reference/modules/melis-cms-page-historic) | Log di audit per la modifica delle pagine — una scheda Historic nell'editor delle pagine React più un widget della dashboard. |
| [`melis-cms-page-analytics`](/it/reference/modules/melis-cms-page-analytics) | Analytics di base sulle visite alle pagine, estendibile con un provider (es. Google Analytics). |
| [`melis-cms-page-script-editor`](/it/reference/modules/melis-cms-page-script-editor) | Inietta `<script>`/`<style>`/HTML personalizzati per pagina o per sito (analytics, pixel, widget). |
| [`melis-cms-share`](/it/reference/modules/melis-cms-share) | Inietta i meta tag di condivisione sui social media / Open Graph, gestiti da un back-office React nativo. |
| [`melis-cms-site-robot`](/it/reference/modules/melis-cms-site-robot) | Modifica del `robots.txt` per dominio e distribuzione dinamica, con un back-office full-React nativo. |
| [`melis-cms-tags`](/it/reference/modules/melis-cms-tags) | Sistema condiviso di tag/tassonomia a cui i moduli di contenuto agganciano gli elementi, ora con un back-office React nativo. |
| [`melis-cms-user-account`](/it/reference/modules/melis-cms-user-account) | Sistema di account per i visitatori del front-office — registrazione, login e profili per sito, amministrati da un tool React. |
| [`melis-cms-google-analytics`](/it/reference/modules/melis-cms-google-analytics) | Provider GA4 che mostra curve delle sessioni, totali dei KPI e dati demografici nel back-office React. |
| [`melis-cms-link-check`](/it/reference/modules/melis-cms-link-check) | Tester dei link che analizza una pagina (e opzionalmente le sotto-pagine) e registra ogni link non funzionante. |

## Commerce

| Modulo | Ruolo |
| --- | --- |
| [`melis-commerce`](/it/reference/modules/melis-commerce) | Framework e-commerce completo — catalogo, clienti, carrello/checkout/ordini, coupon, spedizione e SEO — con un back-office React. |
| [`melis-commerce-order-invoice`](/it/reference/modules/melis-commerce-order-invoice) | Aggiunge la generazione delle fatture d'ordine in PDF, esposta all'interno del tool Orders React. |
| [`melis-commerce-group-discount-per-category`](/it/reference/modules/melis-commerce-group-discount-per-category) | Sconto sul prezzo per categoria (per paese e gruppo di clienti) come scheda nel tool Catalogs React. |

## Estensioni e utilità

| Modulo | Ruolo |
| --- | --- |
| [`melis-templating-plugin-creator`](/it/reference/modules/melis-templating-plugin-creator) | Wizard del back-office che genera lo scaffold di un **templating plugin** completo per il front-office. |
| [`melis-dashboard-plugin-creator`](/it/reference/modules/melis-dashboard-plugin-creator) | Wizard che genera lo scaffold di un nuovo **dashboard plugin** (widget) per il back-office, come brick React nativo. |
| [`melis-calendar`](/it/reference/modules/melis-calendar) | Strumento di pianificazione con un calendario mensile React nativo, eventi drag-and-drop e un widget della dashboard. |
| [`melis-cron`](/it/reference/modules/melis-cron) | Gestore di attività pianificate — definisci task CLI/HTTP, eseguili e ispeziona la cronologia delle esecuzioni, tramite un tool React nativo. |
| [`melis-document-upload`](/it/reference/modules/melis-document-upload) | Gestione dell'upload di documenti come tool React nativo — definisci i tipi, raccogli e distribuisci i file. |
| [`melis-messenger`](/it/reference/modules/melis-messenger) | Messaggistica interna tra utenti — un'icona di notifica nella barra superiore e una scheda in My Account. |
| [`melis-small-business`](/it/reference/modules/melis-small-business) | Add-on editoriale — ruoli, flusso di validazione, versioning delle pagine, commenti, blocco e una libreria multimediale. |

## Autenticazione

| Modulo | Ruolo |
| --- | --- |
| [`melis-login-2fa`](/it/reference/modules/melis-login-2fa) | Core dell'autenticazione a due fattori — richiede un codice monouso e delega la consegna ai moduli di canale. |
| [`melis-login-2fa-email`](/it/reference/modules/melis-login-2fa-email) | Canale di consegna via email — invia il codice di login monouso per email. |
| [`melis-login-2fa-primotexto`](/it/reference/modules/melis-login-2fa-primotexto) | Canale di consegna via SMS tramite il gateway Primotexto. |

## Notifiche

| Modulo | Ruolo |
| --- | --- |
| [`melis-newsletter`](/it/reference/modules/melis-newsletter) | Trasforma una pagina CMS in una newsletter email personalizzata e la consegna a gruppi di iscritti, da un back-office React. |

## AI

| Modulo | Ruolo |
| --- | --- |
| [`melis-ai`](/it/reference/modules/melis-ai) | Back-office React per la suite AI — connetti provider, progetta agent, distribuisci istanze, monitora l'utilizzo, chatta ovunque. |
| [`melis-ai-engine`](/it/reference/modules/melis-ai-engine) | Il motore AI astratto — contratto del provider, runtime di agent/scenari, archivio delle conversazioni, bridge MCP/tool e componenti chat React condivisi. |
| [`melis-ai-engine-claude`](/it/reference/modules/melis-ai-engine-claude) | Provider Anthropic Claude per il motore AI (backend, senza UI React propria). |
| [`melis-ai-engine-gemini`](/it/reference/modules/melis-ai-engine-gemini) | Provider Google Gemini per il motore AI (backend, senza back-office proprio). |
| [`melis-ai-community-extensions`](/it/reference/modules/melis-ai-community-extensions) | Inietta la generazione AI nelle superfici di editing esistenti del CMS (mini-template, news, zone drag-and-drop). |

::: tip I moduli solo-v5 si trovano sotto /legacy
Alcuni moduli del back-office v5 non hanno ancora una pagina v6 dedicata — ad es.
[`melis-tool-creator`](/legacy/reference/modules/melis-tool-creator),
[`melis-installer`](/legacy/reference/modules/melis-installer) e i moduli `form-*`.
La loro documentazione è congelata sotto `/legacy/reference/modules/`.
:::

::: tip Esplora il sorgente
Ogni modulo si trova in `vendor/melisplatform/<module-name>/`. Leggere le cartelle `config/` e
`src/` di un modulo è il modo più rapido per conoscere i suoi servizi pubblici e le sue convenzioni.
:::
