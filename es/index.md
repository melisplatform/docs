---
layout: home

hero:
  name: Melis Platform v6
  text: Documentación para desarrolladores
  tagline: Cree, extienda y opere sitios web y aplicaciones sobre la plataforma de código abierto basada en Laminas, ahora con un back-office moderno en React.
  actions:
    - theme: brand
      text: Comenzar →
      link: /es/guide/getting-started
    - theme: alt
      text: Referencia de módulos →
      link: /es/reference/modules

features:
  - icon:
      light: /icons/bolt-light.svg
      dark: /icons/bolt-dark.svg
    title: Instale en minutos
    details: Tres vías — Docker, Composer o el código fuente de GitHub. Elija la que se adapte a su flujo de trabajo y tenga un back-office funcional en minutos.
    link: /es/guide/getting-started
    linkText: Guía de instalación
  - icon:
      light: /icons/layers-light.svg
      dark: /icons/layers-dark.svg
    title: Arquitectura y conceptos
    details: Módulos, el árbol de configuración, las claves melis, zonas y forwards — cinco conceptos que abren cada parte de la plataforma.
    link: /es/guide/concepts
    linkText: Leer los conceptos
  - icon:
      light: /icons/globe-light.svg
      dark: /icons/globe-dark.svg
    title: Cree un sitio web (CMS)
    details: Páginas, plantillas, árboles de sitio, slugs, multilingüe — todo lo que necesita para entregar un sitio basado en contenidos con MelisCms.
    link: /es/guide/build-a-site
    linkText: Cree un sitio
  - icon:
      light: /icons/wrench-light.svg
      dark: /icons/wrench-dark.svg
    title: Cree sus propias herramientas
    details: Añada una herramienta de back-office completa — controladores, servicios, vistas Laminas, gestión de permisos y mucho más.
    link: /es/guide/create-a-tool
    linkText: Cree una herramienta
  - icon:
      light: /icons/bag-light.svg
      dark: /icons/bag-dark.svg
    title: Commerce
    details: Productos, pedidos, clientes, facturas — MelisCommerce le ofrece una capa de comercio electrónico modular sobre el CMS.
    link: /es/guide/commerce
    linkText: Guía de Commerce
  - icon:
      src: /icons/melis-ai.svg
    title: IA y MCP
    details: MelisAI incluye un framework de agentes integrado y un servidor MCP para que las herramientas LLM puedan leer y escribir en su plataforma mediante APIs estructuradas.
    link: /es/guide/ai
    linkText: Guía de IA
  - icon:
      light: /icons/cube-light.svg
      dark: /icons/cube-dark.svg
    title: 50 módulos documentados
    details: Cada módulo de la Community Edition — propósito, servicios, herramientas de back-office, helpers de front, tablas de BD y ejemplos de código reales.
    link: /es/reference/modules
    linkText: Referencia de módulos
  - icon:
      light: /icons/sliders-light.svg
      dark: /icons/sliders-dark.svg
    title: Referencia de configuración
    details: Cada clave de configuración que lee la plataforma, con tipo, valor por defecto y ejemplos — una única fuente de verdad para MELIS_PLATFORM y afines.
    link: /es/reference/configuration
    linkText: Referencia de configuración
---

## ¿Qué es Melis Platform?

**Melis Platform** es un CMS y una plataforma de aplicaciones de código abierto construida sobre
**[Laminas](https://getlaminas.org/)** (el sucesor de Zend Framework / ZF2). Incluye un
**back-office** modular para gestionar sitios, páginas, comercio electrónico, contenidos y más — y está diseñada
para ser **extendida** con sus propios módulos y herramientas.

Esta documentación cubre la **v6**, que conserva el mismo framework, módulos y APIs mientras
reemplaza el back-office por una **interfaz React moderna** en `/melis-react`. Las herramientas se reconstruyen como
"bricks" nativos de React, cada uno con un conmutador New/Old que regresa a la herramienta clásica en un iframe, y hay
una superposición global y flotante de **Asistente de IA** disponible en toda la interfaz.

Está dirigida a **desarrolladores**: desde la primera instalación hasta la arquitectura, la creación de sitios y herramientas,
la integración de commerce, la incorporación de capacidades de IA y la referencia completa de la API de módulos.
Para conocer el producto, visite **[melisplatform.com](https://www.melisplatform.com/)**.

> La documentación de la v5 sigue disponible en **[/legacy/](/legacy/)**.

> 🇫🇷 Cette documentation est aussi disponible en **[français](/fr/)**.
