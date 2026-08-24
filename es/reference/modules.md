# Referencia de módulos

Melis Platform es un conjunto de paquetes Composer `melisplatform/*`. Este es un mapa de los **50
módulos** que se incluyen con el esqueleto v6, agrupados por área. Cada uno es un módulo estándar
de Laminas ubicado en `vendor/melisplatform/`.

Melis v6 conserva el mismo framework y los mismos módulos que la v5, pero **reemplaza el back-office
por una interfaz React** servida en `/melis-react`. Las herramientas ahora son **«bricks»** nativas
de React — interfaces React autónomas que un módulo incluye y que el shell descubre al arrancar — con
un conmutador **Nuevo (React) / Antiguo (iframe)** para que cualquier herramienta que aún no se haya
reescrito siga ejecutándose como su página jQuery/AJAX heredada dentro del shell. Una superposición
global de **Asistente de IA** está disponible en cualquier lugar. Esta capa se sirve a través de
dos módulos de infraestructura: [`melis-react-api`](/es/reference/modules/melis-react-api) (la
columna vertebral de la API JSON — usuario, menú, activos, descubrimiento de bricks, datos del
panel, resolutor de capacidades) y
[`melis-react-override`](/es/reference/modules/melis-react-override) (la ruta del shell SPA más el
mecanismo de iframe para herramientas heredadas). Consulta la [guía de arquitectura](/es/guide/architecture)
para ver cómo encaja todo.

::: tip Una página por módulo
Cada módulo también tiene una **página de referencia dedicada** (propósito, servicios clave,
herramientas, plugins, tablas, archivos clave) — abre la sección **Módulos** en la barra lateral,
p. ej. [MelisCms](/es/reference/modules/melis-cms), [MelisCommerce](/es/reference/modules/melis-commerce),
[MelisAIEngine](/es/reference/modules/melis-ai-engine).
:::

## Núcleo y plataforma

| Módulo | Función |
| --- | --- |
| [`melis-core`](/es/reference/modules/melis-core) | El núcleo de la plataforma: shell del back-office, árbol de configuración (`MelisCoreConfig`), autenticación, permisos, usuarios, servicios y eventos. Sin cambios en la v6 — solo el shell que impulsa ahora se renderiza con React. |
| [`melis-asset-manager`](/es/reference/modules/melis-asset-manager) | Sirve los activos `public/` (CSS/JS/imágenes) de cada módulo mediante URLs limpias y entrega los bundles compilados. |
| [`melis-cache-internal`](/es/reference/modules/melis-cache-internal) | Caché HTTP de página completa para el front-office del CMS, con caché parcial (por zona) y exclusiones por página. |
| [`melis-composerdeploy`](/es/reference/modules/melis-composerdeploy) | Integra Composer para instalar, actualizar y eliminar módulos mediante programación. |
| [`melis-dbdeploy`](/es/reference/modules/melis-dbdeploy) | Ejecutor headless de migraciones de base de datos — aplica en orden los deltas SQL de cada módulo. |
| [`melis-marketplace`](/es/reference/modules/melis-marketplace) | Tienda de módulos dentro del back-office para descubrir, descargar, actualizar y eliminar módulos. |
| [`melis-phpinfo`](/es/reference/modules/melis-phpinfo) | Herramienta de diagnóstico de solo lectura que renderiza el `phpinfo()` nativo de PHP dentro del back-office React. |
| [`melis-sql`](/es/reference/modules/melis-sql) | Ejecutor de consultas SQL de solo lectura en las Herramientas de desarrollo, incluido como brick nativo full-React. |
| [`melis-react-api`](/es/reference/modules/melis-react-api) | Columna vertebral de la API JSON del back-office React — arranca el shell y aloja el resolutor de capacidades. |
| [`melis-react-override`](/es/reference/modules/melis-react-override) | Infraestructura React — renderiza las herramientas heredadas dentro del shell `/melis-react` y sirve la SPA React. |

## CMS y front

| Módulo | Función |
| --- | --- |
| [`melis-cms`](/es/reference/modules/melis-cms) | El back-office del CMS — sitios, árbol de páginas, editor de páginas, plantillas, estilos y SEO, como back-office React. |
| [`melis-engine`](/es/reference/modules/melis-engine) | Base de datos compartida del CMS — modelo de página, sitios, idiomas, clase base de plugins de plantilla y caché de renderizado. |
| [`melis-front`](/es/reference/modules/melis-front) | Sistema de renderizado del front-office — convierte una URL en una página terminada y aporta los bloques de contenido (plugins de página). |
| [`melis-demo-cms`](/es/reference/modules/melis-demo-cms) | El sitio web oficial de referencia/demostración — un **módulo de sitio** listo para instalar. |
| [`melis-cms-blog`](/es/reference/modules/melis-cms-blog) | Sistema de blog con un back-office React nativo y tres plugins de visualización en el front-office. |
| [`melis-cms-comments`](/es/reference/modules/melis-cms-comments) | Sistema de comentarios para Noticias y Blog — moderación, flujo de aprobación y un plugin de front; una pestaña de Comentarios en el editor. |
| [`melis-cms-news`](/es/reference/modules/melis-cms-news) | Sistema de noticias/blog con una herramienta de redacción React y tres plugins de visualización en el front-office. |
| [`melis-cms-prospects`](/es/reference/modules/melis-cms-prospects) | Gestión de leads/contactos — un formulario en el front captura mensajes; una herramienta React los explora, filtra, exporta y clasifica. |
| [`melis-cms-slider`](/es/reference/modules/melis-cms-slider) | Gestor de slider/carrusel (brick React nativo) con un plugin de plantilla en el front-office. |
| [`melis-cms-category2`](/es/reference/modules/melis-cms-category2) | Categorías de contenido multisitio y multilingües, con un back-office React nativo. |
| [`melis-cms-mcq`](/es/reference/modules/melis-cms-mcq) | Constructor de MCQ (cuestionarios) en el back-office, ahora una herramienta full-React nativa. |
| [`melis-cms-mcq-engine`](/es/reference/modules/melis-cms-mcq-engine) | Datos, puntuación y renderizador de front-office detrás de la herramienta MCQ React. |
| [`melis-cms-page-historic`](/es/reference/modules/melis-cms-page-historic) | Registro de auditoría para la edición de páginas — una pestaña Historial en el editor de páginas React más un widget del panel. |
| [`melis-cms-page-analytics`](/es/reference/modules/melis-cms-page-analytics) | Analítica básica de visitas a las páginas, ampliable con un proveedor (p. ej. Google Analytics). |
| [`melis-cms-page-script-editor`](/es/reference/modules/melis-cms-page-script-editor) | Inyecta `<script>`/`<style>`/HTML personalizado por página o por sitio (analítica, píxeles, widgets). |
| [`melis-cms-share`](/es/reference/modules/melis-cms-share) | Inyecta metaetiquetas de compartición en redes sociales / Open Graph, gestionadas desde un back-office React nativo. |
| [`melis-cms-site-robot`](/es/reference/modules/melis-cms-site-robot) | Edición del `robots.txt` por dominio y entrega dinámica, con un back-office full-React nativo. |
| [`melis-cms-tags`](/es/reference/modules/melis-cms-tags) | Sistema compartido de etiquetas/taxonomía del que los módulos de contenido cuelgan sus elementos, ahora con un back-office React nativo. |
| [`melis-cms-user-account`](/es/reference/modules/melis-cms-user-account) | Sistema de cuentas de visitantes en el front-office — registro, inicio de sesión y perfiles por sitio, administrado desde una herramienta React. |
| [`melis-cms-google-analytics`](/es/reference/modules/melis-cms-google-analytics) | Proveedor GA4 que renderiza curvas de sesiones, totales de KPI y datos demográficos en el back-office React. |
| [`melis-cms-link-check`](/es/reference/modules/melis-cms-link-check) | Comprobador de enlaces que rastrea una página (y, opcionalmente, las subpáginas) y registra cada enlace roto. |

## Commerce

| Módulo | Función |
| --- | --- |
| [`melis-commerce`](/es/reference/modules/melis-commerce) | Framework completo de comercio electrónico — catálogo, clientes, carrito/pago/pedidos, cupones, envío y SEO — con un back-office React. |
| [`melis-commerce-order-invoice`](/es/reference/modules/melis-commerce-order-invoice) | Añade la generación de facturas de pedido en PDF, expuesta dentro de la herramienta de Pedidos React. |
| [`melis-commerce-group-discount-per-category`](/es/reference/modules/melis-commerce-group-discount-per-category) | Descuento de precio por categoría (por país y grupo de clientes) como pestaña en la herramienta de Catálogos React. |

## Extender y utilidades

| Módulo | Función |
| --- | --- |
| [`melis-templating-plugin-creator`](/es/reference/modules/melis-templating-plugin-creator) | Asistente del back-office que genera un **plugin de plantilla** completo para el front-office. |
| [`melis-dashboard-plugin-creator`](/es/reference/modules/melis-dashboard-plugin-creator) | Asistente que genera un nuevo **plugin de panel** (widget) para el back-office, como brick React nativo. |
| [`melis-calendar`](/es/reference/modules/melis-calendar) | Herramienta de planificación con un calendario mensual React nativo, eventos con arrastrar y soltar y un widget del panel. |
| [`melis-cron`](/es/reference/modules/melis-cron) | Gestor de tareas programadas — define tareas CLI/HTTP, ejecútalas e inspecciona el historial de ejecuciones, mediante una herramienta React nativa. |
| [`melis-document-upload`](/es/reference/modules/melis-document-upload) | Gestión de subida de documentos como herramienta React nativa — define tipos, recopila y sirve archivos. |
| [`melis-messenger`](/es/reference/modules/melis-messenger) | Mensajería interna entre usuarios — un icono de notificación en la barra superior y una pestaña en Mi cuenta. |
| [`melis-small-business`](/es/reference/modules/melis-small-business) | Complemento editorial — roles, flujo de validación, versionado de páginas, comentarios, bloqueo y una biblioteca de medios. |

## Autenticación

| Módulo | Función |
| --- | --- |
| [`melis-login-2fa`](/es/reference/modules/melis-login-2fa) | Núcleo de autenticación de dos factores — requiere un código de un solo uso y delega su envío en los módulos de canal. |
| [`melis-login-2fa-email`](/es/reference/modules/melis-login-2fa-email) | Canal de envío por correo electrónico — envía el código de inicio de sesión de un solo uso por email. |
| [`melis-login-2fa-primotexto`](/es/reference/modules/melis-login-2fa-primotexto) | Canal de envío por SMS a través de la pasarela Primotexto. |

## Notificaciones

| Módulo | Función |
| --- | --- |
| [`melis-newsletter`](/es/reference/modules/melis-newsletter) | Convierte una página del CMS en un boletín de correo electrónico personalizado y lo entrega a grupos de suscriptores, desde un back-office React. |

## IA

| Módulo | Función |
| --- | --- |
| [`melis-ai`](/es/reference/modules/melis-ai) | Back-office React para la suite de IA — conecta proveedores, diseña agentes, despliega instancias, supervisa el uso y chatea en cualquier lugar. |
| [`melis-ai-engine`](/es/reference/modules/melis-ai-engine) | El motor de IA abstracto — contrato de proveedor, runtime de agentes/escenarios, almacén de conversaciones, puente MCP/herramientas y componentes de chat React compartidos. |
| [`melis-ai-engine-claude`](/es/reference/modules/melis-ai-engine-claude) | Proveedor Anthropic Claude para el motor de IA (backend, sin interfaz React propia). |
| [`melis-ai-engine-gemini`](/es/reference/modules/melis-ai-engine-gemini) | Proveedor Google Gemini para el motor de IA (backend, sin back-office propio). |
| [`melis-ai-community-extensions`](/es/reference/modules/melis-ai-community-extensions) | Inyecta la generación con IA en las superficies de edición del CMS existentes (mini-plantillas, noticias, zonas de arrastrar y soltar). |

::: tip Los módulos exclusivos de la v5 viven en /legacy
Algunos módulos del back-office v5 aún no tienen una página v6 dedicada — p. ej.
[`melis-tool-creator`](/legacy/reference/modules/melis-tool-creator),
[`melis-installer`](/legacy/reference/modules/melis-installer) y los módulos `form-*`.
Su documentación está congelada en `/legacy/reference/modules/`.
:::

::: tip Explora el código fuente
Cada módulo vive en `vendor/melisplatform/<module-name>/`. Leer el `config/` y el `src/` de un
módulo es la forma más rápida de conocer sus servicios públicos y sus convenciones.
:::
