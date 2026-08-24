---
layout: home

hero:
  name: Melis Platform v6
  text: Documentação para programadores
  tagline: Construa, expanda e opere sites e aplicações na plataforma open-source baseada em Laminas — agora com um back-office moderno em React.
  actions:
    - theme: brand
      text: Começar →
      link: /pt/guide/getting-started
    - theme: alt
      text: Referência de módulos →
      link: /pt/reference/modules

features:
  - icon:
      light: /icons/bolt-light.svg
      dark: /icons/bolt-dark.svg
    title: Instale em minutos
    details: Três caminhos — Docker, Composer ou código-fonte do GitHub. Escolha o que melhor se adequa ao seu fluxo de trabalho e tenha um back-office funcional em minutos.
    link: /pt/guide/getting-started
    linkText: Guia de instalação
  - icon:
      light: /icons/layers-light.svg
      dark: /icons/layers-dark.svg
    title: Arquitetura e conceitos
    details: Módulos, a árvore de configuração, chaves melis, zonas e forwards — cinco conceitos que desbloqueiam todas as partes da plataforma.
    link: /pt/guide/concepts
    linkText: Ler os conceitos
  - icon:
      light: /icons/globe-light.svg
      dark: /icons/globe-dark.svg
    title: Construir um site (CMS)
    details: Páginas, templates, árvores de sites, slugs, multilingue — tudo o que precisa para entregar um site orientado a conteúdo com MelisCms.
    link: /pt/guide/build-a-site
    linkText: Construir um site
  - icon:
      light: /icons/wrench-light.svg
      dark: /icons/wrench-dark.svg
    title: Crie as suas próprias ferramentas
    details: Adicione uma ferramenta de back-office completa — controladores, serviços, vistas Laminas, gestão de permissões e muito mais.
    link: /pt/guide/create-a-tool
    linkText: Criar uma ferramenta
  - icon:
      light: /icons/bag-light.svg
      dark: /icons/bag-dark.svg
    title: Comércio
    details: Produtos, encomendas, clientes, faturas — o MelisCommerce oferece-lhe uma camada de e-commerce modular sobre o CMS.
    link: /pt/guide/commerce
    linkText: Guia de comércio
  - icon:
      src: /icons/melis-ai.svg
    title: IA e MCP
    details: O MelisAI inclui uma framework de agentes integrada e um servidor MCP para que as ferramentas de LLM possam ler e escrever na sua plataforma através de APIs estruturadas.
    link: /pt/guide/ai
    linkText: Guia de IA
  - icon:
      light: /icons/cube-light.svg
      dark: /icons/cube-dark.svg
    title: 50 módulos documentados
    details: Todos os módulos da Community Edition — propósito, serviços, ferramentas de back-office, helpers de front-end, tabelas de BD e exemplos de código reais.
    link: /pt/reference/modules
    linkText: Referência de módulos
  - icon:
      light: /icons/sliders-light.svg
      dark: /icons/sliders-dark.svg
    title: Referência de configuração
    details: Todas as chaves de configuração que a plataforma lê, com tipo, valor por defeito e exemplos — uma única fonte de verdade para MELIS_PLATFORM e afins.
    link: /pt/reference/configuration
    linkText: Referência de configuração
---

## O que é a Melis Platform?

A **Melis Platform** é um CMS e uma plataforma de aplicações open-source construída sobre
**[Laminas](https://getlaminas.org/)** (o sucessor do Zend Framework / ZF2). Inclui um
**back-office** modular para gerir sites, páginas, e-commerce, conteúdo e muito mais — e foi concebida
para ser **expandida** com os seus próprios módulos e ferramentas.

Esta documentação abrange a **v6**, que mantém a mesma framework, os mesmos módulos e as mesmas APIs, ao mesmo tempo que
substitui o back-office por uma **interface React moderna** em `/melis-react`. As ferramentas são reconstruídas como
"bricks" nativos em React, cada um com um botão de alternância Novo/Antigo que remete para a ferramenta clássica num iframe, e um
**Assistente de IA** flutuante e global está disponível em toda a interface.

Destina-se a **programadores**: desde a primeira instalação, passando pela arquitetura, construção de sites e ferramentas,
integração de comércio, adição de capacidades de IA, até à referência completa da API dos módulos.
Para o produto, visite **[melisplatform.com](https://www.melisplatform.com/)**.

> A documentação da v5 continua disponível em **[/legacy/](/legacy/)**.

> 🇫🇷 Cette documentation est aussi disponible en **[français](/fr/)**.
