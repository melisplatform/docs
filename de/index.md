---
layout: home

hero:
  name: Melis Platform v6
  text: Entwicklerdokumentation
  tagline: Erstellen, erweitern und betreiben Sie Websites und Anwendungen auf der quelloffenen, Laminas-basierten Plattform — jetzt mit einem modernen React-Backoffice.
  actions:
    - theme: brand
      text: Erste Schritte →
      link: /de/guide/getting-started
    - theme: alt
      text: Modulreferenz →
      link: /de/reference/modules

features:
  - icon:
      light: /icons/bolt-light.svg
      dark: /icons/bolt-dark.svg
    title: In wenigen Minuten installiert
    details: Drei Wege — Docker, Composer oder GitHub-Quellcode. Wählen Sie den passenden für Ihren Workflow und erhalten Sie in wenigen Minuten ein funktionierendes Backoffice.
    link: /de/guide/getting-started
    linkText: Installationsanleitung
  - icon:
      light: /icons/layers-light.svg
      dark: /icons/layers-dark.svg
    title: Architektur & Konzepte
    details: Module, der Konfigurationsbaum, melis-Schlüssel, Zonen & Forwards — fünf Konzepte, die jeden Teil der Plattform erschließen.
    link: /de/guide/concepts
    linkText: Konzepte lesen
  - icon:
      light: /icons/globe-light.svg
      dark: /icons/globe-dark.svg
    title: Eine Website erstellen (CMS)
    details: Seiten, Templates, Site-Bäume, Slugs, Mehrsprachigkeit — alles, was Sie benötigen, um mit MelisCms eine inhaltsgetriebene Website bereitzustellen.
    link: /de/guide/build-a-site
    linkText: Eine Website erstellen
  - icon:
      light: /icons/wrench-light.svg
      dark: /icons/wrench-dark.svg
    title: Eigene Tools erstellen
    details: Fügen Sie ein vollwertiges Backoffice-Tool hinzu — Controller, Services, Laminas-Views, Rechteverwaltung und mehr.
    link: /de/guide/create-a-tool
    linkText: Ein Tool erstellen
  - icon:
      light: /icons/bag-light.svg
      dark: /icons/bag-dark.svg
    title: Commerce
    details: Produkte, Bestellungen, Kunden, Rechnungen — MelisCommerce bietet Ihnen eine modulare E-Commerce-Schicht auf Basis des CMS.
    link: /de/guide/commerce
    linkText: Commerce-Leitfaden
  - icon:
      src: /icons/melis-ai.svg
    title: KI & MCP
    details: MelisAI liefert ein integriertes Agenten-Framework und einen MCP-Server, sodass LLM-Tools Ihre Plattform über strukturierte APIs lesen und schreiben können.
    link: /de/guide/ai
    linkText: KI-Leitfaden
  - icon:
      light: /icons/cube-light.svg
      dark: /icons/cube-dark.svg
    title: 50 dokumentierte Module
    details: Jedes Modul der Community Edition — Zweck, Services, Backoffice-Tools, Frontend-Helper, DB-Tabellen und echte Codebeispiele.
    link: /de/reference/modules
    linkText: Modulreferenz
  - icon:
      light: /icons/sliders-light.svg
      dark: /icons/sliders-dark.svg
    title: Konfigurationsreferenz
    details: Jeder Konfigurationsschlüssel, den die Plattform liest, mit Typ, Standardwert und Beispielen — eine einzige Quelle der Wahrheit für MELIS_PLATFORM und Verwandte.
    link: /de/reference/configuration
    linkText: Konfigurationsreferenz
---

## Was ist Melis Platform?

**Melis Platform** ist ein quelloffenes CMS und eine Anwendungsplattform, die auf
**[Laminas](https://getlaminas.org/)** (dem Nachfolger von Zend Framework / ZF2) aufbaut. Sie liefert ein
modulares **Backoffice** für die Verwaltung von Websites, Seiten, E-Commerce, Inhalten und mehr — und ist darauf ausgelegt,
mit Ihren eigenen Modulen und Tools **erweitert** zu werden.

Diese Dokumentation behandelt **v6**, das dasselbe Framework, dieselben Module und APIs beibehält und dabei
das Backoffice durch eine **moderne React-Oberfläche** unter `/melis-react` ersetzt. Tools werden als
native React-„Bricks“ neu aufgebaut, jeweils mit einem Neu/Alt-Umschalter zurück zum klassischen Tool in einem iframe, und ein
globales, schwebendes **KI-Assistent**-Overlay steht in der gesamten Oberfläche zur Verfügung.

Sie richtet sich an **Entwickler**: von der ersten Installation über die Architektur, das Erstellen von Websites und Tools,
die Integration von Commerce, das Hinzufügen von KI-Funktionen bis hin zur vollständigen Referenz der Modul-APIs.
Für das Produkt besuchen Sie **[melisplatform.com](https://www.melisplatform.com/)**.

> Die v5-Dokumentation bleibt weiterhin unter **[/legacy/](/legacy/)** verfügbar.

> 🇫🇷 Cette documentation est aussi disponible en **[français](/fr/)**.
