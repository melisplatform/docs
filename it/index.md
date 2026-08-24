---
layout: home

hero:
  name: Melis Platform v6
  text: Documentazione per sviluppatori
  tagline: Crea, estendi e gestisci siti web e applicazioni sulla piattaforma open source basata su Laminas — ora con un back-office React moderno.
  actions:
    - theme: brand
      text: Inizia →
      link: /it/guide/getting-started
    - theme: alt
      text: Riferimento moduli →
      link: /it/reference/modules

features:
  - icon:
      light: /icons/bolt-light.svg
      dark: /icons/bolt-dark.svg
    title: Installazione in pochi minuti
    details: Tre percorsi — Docker, Composer o codice sorgente da GitHub. Scegli quello più adatto al tuo flusso di lavoro e avrai un back-office funzionante in pochi minuti.
    link: /it/guide/getting-started
    linkText: Guida all'installazione
  - icon:
      light: /icons/layers-light.svg
      dark: /icons/layers-dark.svg
    title: Architettura e concetti
    details: Moduli, l'albero di configurazione, le chiavi melis, zone e forward — cinque concetti che sbloccano ogni parte della piattaforma.
    link: /it/guide/concepts
    linkText: Leggi i concetti
  - icon:
      light: /icons/globe-light.svg
      dark: /icons/globe-dark.svg
    title: Crea un sito web (CMS)
    details: Pagine, template, alberi di siti, slug, multilingua — tutto ciò che serve per realizzare un sito basato sui contenuti con MelisCms.
    link: /it/guide/build-a-site
    linkText: Crea un sito
  - icon:
      light: /icons/wrench-light.svg
      dark: /icons/wrench-dark.svg
    title: Crea i tuoi strumenti
    details: Aggiungi uno strumento di back-office completo — controller, servizi, viste Laminas, gestione dei permessi e altro ancora.
    link: /it/guide/create-a-tool
    linkText: Crea uno strumento
  - icon:
      light: /icons/bag-light.svg
      dark: /icons/bag-dark.svg
    title: Commerce
    details: Prodotti, ordini, clienti, fatture — MelisCommerce ti offre un livello e-commerce modulare sopra il CMS.
    link: /it/guide/commerce
    linkText: Guida a Commerce
  - icon:
      src: /icons/melis-ai.svg
    title: AI e MCP
    details: MelisAI include un framework di agenti integrato e un server MCP, così gli strumenti LLM possono leggere e scrivere sulla tua piattaforma tramite API strutturate.
    link: /it/guide/ai
    linkText: Guida all'AI
  - icon:
      light: /icons/cube-light.svg
      dark: /icons/cube-dark.svg
    title: 50 moduli documentati
    details: Ogni modulo della Community Edition — scopo, servizi, strumenti di back-office, helper front-end, tabelle DB ed esempi di codice reali.
    link: /it/reference/modules
    linkText: Riferimento moduli
  - icon:
      light: /icons/sliders-light.svg
      dark: /icons/sliders-dark.svg
    title: Riferimento di configurazione
    details: Ogni chiave di configurazione letta dalla piattaforma, con tipo, valore predefinito ed esempi — un'unica fonte di verità per MELIS_PLATFORM e affini.
    link: /it/reference/configuration
    linkText: Riferimento di configurazione
---

## Che cos'è Melis Platform?

**Melis Platform** è un CMS e una piattaforma applicativa open source costruita su
**[Laminas](https://getlaminas.org/)** (il successore di Zend Framework / ZF2). Include un
**back-office** modulare per gestire siti, pagine, e-commerce, contenuti e altro ancora — ed è progettato
per essere **esteso** con i tuoi moduli e strumenti.

Questa documentazione riguarda la **v6**, che mantiene lo stesso framework, gli stessi moduli e le stesse API,
sostituendo il back-office con una **moderna UI React** su `/melis-react`. Gli strumenti sono ricostruiti come
"brick" React nativi, ciascuno con un interruttore Nuovo/Vecchio per tornare allo strumento classico in un iframe, ed è
disponibile in tutta l'interfaccia un **Assistente AI** flottante globale in overlay.

È rivolta agli **sviluppatori**: dalla prima installazione all'architettura, dalla creazione di siti e strumenti,
all'integrazione del commerce, all'aggiunta di funzionalità di AI, fino al riferimento completo delle API dei moduli.
Per il prodotto, visita **[melisplatform.com](https://www.melisplatform.com/)**.

> La documentazione della v5 rimane disponibile in **[/legacy/](/legacy/)**.

> 🇫🇷 Cette documentation est aussi disponible en **[français](/fr/)**.
