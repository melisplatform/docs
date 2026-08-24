---
layout: home

hero:
  name: Melis Platform v6
  text: Documentation développeur
  tagline: Construisez, étendez et exploitez sites & applications sur la plateforme open-source basée sur Laminas — désormais avec un back-office React moderne.
  actions:
    - theme: brand
      text: Démarrer →
      link: /fr/guide/getting-started
    - theme: alt
      text: Référence des modules →
      link: /fr/reference/modules

features:
  - icon:
      light: /icons/bolt-light.svg
      dark: /icons/bolt-dark.svg
    title: Installé en quelques minutes
    details: Trois chemins — Docker, Composer ou source GitHub. Choisissez celui qui vous convient et ayez un backoffice fonctionnel en minutes.
    link: /fr/guide/getting-started
    linkText: Guide d'installation
  - icon:
      light: /icons/layers-light.svg
      dark: /icons/layers-dark.svg
    title: Architecture & concepts
    details: Modules, arbre de config, melis keys, zones & forwards — cinq concepts qui débloquent toute la plateforme.
    link: /fr/guide/concepts
    linkText: Lire les concepts
  - icon:
      light: /icons/globe-light.svg
      dark: /icons/globe-dark.svg
    title: Construire un site (CMS)
    details: Pages, templates, arbres de sites, slugs, multilingue — tout ce qu'il faut pour livrer un site de contenu avec MelisCms.
    link: /fr/guide/build-a-site
    linkText: Guide CMS
  - icon:
      light: /icons/wrench-light.svg
      dark: /icons/wrench-dark.svg
    title: Créer vos propres tools
    details: Ajoutez un vrai tool backoffice — contrôleurs, services, vues Laminas, gestion des droits et plus.
    link: /fr/guide/create-a-tool
    linkText: Créer un tool
  - icon:
      light: /icons/bag-light.svg
      dark: /icons/bag-dark.svg
    title: Commerce
    details: Produits, commandes, clients, factures — MelisCommerce vous offre une couche e-commerce modulaire par-dessus le CMS.
    link: /fr/guide/commerce
    linkText: Guide Commerce
  - icon:
      src: /icons/melis-ai.svg
    title: IA & MCP
    details: MelisAI embarque un framework d'agents et un serveur MCP pour que les outils LLM lisent et écrivent votre plateforme via des APIs structurées.
    link: /fr/guide/ai
    linkText: Guide IA
  - icon:
      light: /icons/cube-light.svg
      dark: /icons/cube-dark.svg
    title: 50 modules documentés
    details: Chaque module de la Community Edition — rôle, services, tools backoffice, helpers front, tables DB et vrais exemples de code.
    link: /fr/reference/modules
    linkText: Référence des modules
  - icon:
      light: /icons/sliders-light.svg
      dark: /icons/sliders-dark.svg
    title: Référence de configuration
    details: Chaque clé de configuration lue par la plateforme, avec type, défaut et exemples — source de vérité pour MELIS_PLATFORM et ses pairs.
    link: /fr/reference/configuration
    linkText: Référence de configuration
---

## Qu'est-ce que Melis Platform ?

**Melis Platform** est un CMS et une plateforme applicative open-source bâtis sur
**[Laminas](https://getlaminas.org/)** (le successeur de Zend Framework / ZF2). Elle fournit un
**backoffice** modulaire pour gérer sites, pages, e-commerce, contenus… et est conçue pour être
**étendue** avec vos propres modules et tools.

Cette documentation couvre la **v6**, qui conserve le même framework, les mêmes modules et les
mêmes APIs tout en remplaçant le back-office par une **UI React moderne** sur `/melis-react`. Les
tools sont reconstruits en « bricks » natifs React, chacun avec une bascule Nouveau/Ancien
ramenant au tool classique dans une iframe, et un **Assistant IA** flottant global est disponible
dans toute l'interface.

Elle s'adresse aux **développeurs** : de la première installation jusqu'à l'architecture, la
construction de sites et de tools, l'intégration du commerce, l'ajout de capacités IA, et la
référence complète de l'API des modules. Pour le produit, rendez-vous sur
**[melisplatform.com](https://www.melisplatform.com/)**.

> La documentation v5 reste disponible sous **[/fr/legacy/](/fr/legacy/)**.

> 🇬🇧 This documentation is also available in **[English](/)**.
