# MelisAICommunityExtensions

> Inyecta la generación por IA en las superficies de edición existentes del CMS: creador de mini-plantillas, creador de contenido de noticias y botones de IA en las zonas de arrastrar y soltar. En el back-office React se distribuye como un brick de extensión (inyección en el host) sin página propia. Paquete `melisplatform/melis-ai-community-extensions`.

## Propósito

MelisAICommunityExtensions es una capa de aplicación sobre la suite MelisAI que conecta la generación por IA directamente con las superficies de edición existentes. Registra dos instancias preconfiguradas (`minitemplatecreator` y `newscontentcreator`), un conjunto de herramientas MCP y un conjunto de escuchadores de eventos que gestionan el ciclo de vida de los recursos front-end generados por IA (CSS, JS, imágenes). **No tiene ninguna pantalla de herramienta independiente**; en su lugar, inyecta botones **Generar con IA** y ventanas modales de chat en el Gestor de mini-plantillas, en el editor de Noticias y en las zonas de arrastrar y soltar de las páginas. El propio chat de IA lo sirve MelisAI / MelisAIEngine; este módulo aporta únicamente la interfaz circundante y el cableado de entrada/salida.

## Activarlo

Añádelo a `config/melis.module.load.php`:

```php
return [
    'MelisAICommunityExtensions',
];
```

Requiere `melisplatform/melis-ai`. Ejecuta el dbdeploy tras activarlo: el módulo siembra las filas de agente/instancia `minitemplatecreator` y `newscontentcreator` en las tablas del motor MelisAI (`dbdeploy: true`). Se integra con MelisCms y MelisCmsNews.

## Dónde reside en el back-office React

El brick React es un **brick de extensión / inyección en el host**: no dibuja ninguna página ni añade ninguna entrada en la barra lateral. Al cargarse, registra **dos puntos de extensión de host** en `window` que las páginas React de otros módulos invocan para renderizar el botón *Generar con IA* en línea, además de un widget `Header` siempre montado (`MiniTemplateAiDialogHost`) que ancla el diálogo de edición de página por encima de los marcos de edición heredados.

Como no tiene ninguna ruta, no hay nada a lo que navegar: te lo encuentras *dentro de otras herramientas*:

- **Editor de noticias** (MelisCmsNews) → pestaña **Texts** → botón por párrafo.
- **Gestor de mini-plantillas** (MelisCms) → campo *Template's HTML* → botón.
- **Edición de página** (arrastrar y soltar de MelisCms) → botón del plugin de la zona / etiqueta HTML.

**Condicionado a la activación de dos módulos.** Los botones aparecen solo si **ambos** módulos `MelisAICommunityExtensions` y `MelisAI` están activos (comprobado en vivo a través de `__melisIsModuleActive` del host, respaldado por `GET /melis/react-api/react-modules`). MelisAI es obligatorio porque sirve el chat; si cualquiera de los dos módulos se desactiva a mitad de sesión, los botones desaparecen sin necesidad de recargar. El brick no aporta **ningún nodo de capacidad**: la visibilidad depende puramente de esta comprobación de dos módulos.

## Superficies de edición del back-office

Se extienden tres superficies de edición. En cada una, un botón de IA abre un chat acotado y el resultado se escribe de vuelta en el campo correcto.

### Creador de mini-plantillas con IA

En el Gestor de mini-plantillas, el campo *Template's HTML* lleva un botón **Generar con IA** renderizado por el punto de extensión `renderHtmlActions()`. Abre un diálogo a ventana completa: **chat de IA + lista de plantillas existentes a la izquierda, vista previa en vivo a la derecha** (los dos paneles se colapsan en pestañas segmentadas *AI & Templates / Preview* en anchos reducidos). El chat usa la instancia `minitemplatecreator`, empieza desde cero en cada apertura (`clearSession`) y vuelve a obtener el shell real del sitio en cada resultado de IA para que el CSS/JS recién escrito quede reflejado.

![El Gestor de mini-plantillas, lista por sitio con el punto de entrada Generar con IA](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-list.png)

![El chat minitemplatecreator generando una plantilla, previsualizada contra el shell real del sitio](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-createwithai.png)

Cada fila de la lista de plantillas muestra un **icono de Melis-AI**: haz clic en él para generar una nueva plantilla usando esa como referencia base (el chat se vuelve a ejecutar sembrado con el marcado de la plantilla seleccionada). **Insert** captura una miniatura PNG de la vista previa (html2canvas) y rellena el formulario; el propio envío del formulario la guarda.

![El icono de Melis-AI en una fila de plantilla: varía o duplica una plantilla existente con IA](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-duplicatewithai.png)

![El formulario Add mini-template: Generar con IA junto al campo HTML](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-minitplmanager-addminitpl.png)

### Creador de contenido de noticias

En la pestaña **Texts** del editor de **Noticias**, cada **Paragraph** obtiene un botón **Generar con IA** (por idioma) renderizado por el punto de extensión `renderParagraphActions()`. Abre una ventana modal compacta con el chat `newscontentcreator`, **acotado al artículo** (sembrado con el título, el subtítulo, los demás párrafos y las imágenes del artículo). La respuesta reemplaza el texto de ese párrafo y lo marca como validado. Las sesiones se aíslan por artículo mediante un id de instancia `newscontentcreator|<newsId>`.

![La pestaña Texts de Noticias: la barra de encabezado de cada párrafo lleva la acción Generar con IA](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-news-edit-tab-texts.png)

![El chat newscontentcreator, consciente del contexto del artículo](/screenshots/react/melis-ai-community-extensions/melisaicomext-tooloverride-news-edit-tab-texts-aicreator.png)

### Generar con IA en las zonas de arrastrar y soltar

Al editar una página del CMS, las **zonas de arrastrar y soltar** vacías (y los plugins de etiqueta HTML) obtienen un botón **Generar con IA** inyectado. Como la edición de página es un iframe heredado por debajo del shell React, el botón pide al host React que abra el *mismo* diálogo de mini-plantilla que el anterior. Al aceptar, se ofrecen tres opciones de confirmación: **Close**, **Insert** (soltar solo en esta zona) o **Save & Insert** (soltar y además promover el bloque a mini-plantilla reutilizable permanente).

![Una zona de arrastrar y soltar vacía con el botón Generar con IA inyectado](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-1.png)

![Un bloque completo con estilos generado directamente en la zona de la página](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-2.png)

![La elección de confirmación Close / Insert / Save & Insert para un bloque generado](/screenshots/react/melis-ai-community-extensions/melisaicomext-pageoverride-dragdropzone-generateaibutton-differentinserts.png)

## El brick

`ui-react/` es una biblioteca Vite IIFE (nombre `MelisAiCommunityExtensionsBrick`, salida `public/ui-react/brick.js`). React, react-dom y react-router-dom se externalizan a los globales del host; un alias `@melis-ai-engine` importa el componente de chat compartido `AiChatContainer`.

| Archivo | Función |
| --- | --- |
| `src/brick.tsx` | Registra los dos puntos de extensión + el `Header`; inyecta Tailwind una sola vez. |
| `src/NewsAiExtension.tsx` | `renderParagraphActions()` → botón por párrafo + modal (instancia `newscontentcreator`). |
| `src/MiniTemplateAiExtension.tsx` | `renderHtmlActions()` → el `MiniTemplateAiDialog` a ventana completa (chat + lista + vista previa; Insert / Save & Insert; miniatura con html2canvas). |
| `src/MiniTemplateAiDialogHost.tsx` | El ancla `Header` para la **edición de página**; escucha `melis-ai-minitemplate-open` y monta el diálogo. |

El brick se registra **sin `Component`** y **sin `Sidebar`**: solo con puntos de extensión protegidos y el ancla `Header`:

```ts
window.__melisNewsExtensions.renderParagraphActions = /* guarded by isModuleActive() */
window.__melisMiniTemplateExtensions.renderHtmlActions = /* guarded by isModuleActive() */
window.__melisRegisterBrick?.({ id: 'melis-ai-community-extensions', Header: MiniTemplateAiDialogHost })
```

## Endpoints que llama el brick

El brick **no tiene `config/react-api.php`**. Consume endpoints propiedad de otros módulos más una acción MVC heredada propia:

| Llamada | Propietario |
| --- | --- |
| `GET /melis/react-api/cms-mini-templates?site=<m>&limit=9999` | MelisCms (lista de plantillas) |
| `GET /melis/react-api/cms-mini-templates/item?site=<m>&name=<n>` | MelisCms (HTML de una plantilla) |
| `GET /melis/MelisAICommunityExtensions/MiniTemplate/getMiniTemplatePreviewShell?siteModule=<m>` | este módulo (MVC heredado; devuelve el HTML del shell del sitio) |
| Tráfico de ejecución/salida de `AiChatContainer` | MelisAI / MelisAIEngine |

La respuesta del chat se enruta de vuelta al campo del host mediante una devolución de llamada de `window` declarada en los parámetros de salida (`masse_exit_js_callback`): `__melisNewsAiCallback_<paraIdx>` para noticias, `__melisMiniTemplateAiCallback` para mini-plantillas.

## Integración con el host (puente de edición de página)

La edición de página se ejecuta varios marcos por debajo del shell React, por lo que `MiniTemplateAiDialogHost` establece `window.__melisAiMiniTemplateDialogReady = true` y escucha un evento `melis-ai-minitemplate-open`. La página editada ejecuta `public/js/minitemplate/react-bridge.js`, que recorre **hacia arriba la cadena de marcos** en busca de `__melisAiMiniTemplateDialogReady`; cuando lo encuentra, despacha el evento de apertura con devoluciones de llamada `onInsert` / `onSaveInsert` del mismo origen. Si no se encuentra ningún host React (`/melis` heredado), el puente recurre a la ventana modal histórica de Bootstrap: allí no cambia nada.

Para las herramientas heredadas mostradas en la vista React **"Old"**, `config/module.config.php` registra `melis_react_override.toolpage_extensions` → `PluginViewToolPageExtension`, que inyecta el `tool.js` / `style.css` de este módulo para que las jsCallbacks injertadas en las herramientas MelisCms / MelisCmsNews encuentren sus globales.

## Escuchadores de eventos

| Escuchador | Evento | Efecto |
| --- | --- | --- |
| `…TinyMCEConfigurationListener` | `meliscore_tinymce_config` | Apunta el plugin `minitemplate` de TinyMCE al JS de este módulo. |
| `…CreateMiniTemplateListener` | `meliscms_mini_template_manager_create_end` | Mueve el CSS/JS/imágenes temporales al almacenamiento permanente; renombra el JS de init por plantilla. |
| `…PublishPageListener` | `meliscms_page_publish_start` | Promueve los recursos temporales que referencia una página publicada; actualiza `page_content`. |
| `…SanitizeSavedPluginHtmlListener` | `meliscms_page_savesession_plugin_start` | Limpia el marcado de runtime de carrusel/slider (artefactos de Owl/Slick/Swiper) antes de guardar. |
| `…DeleteMiniTemplateAssetsListener` | `meliscms_mini_template_manager_delete_end` | Elimina el CSS/JS/imágenes de la plantilla. |
| `…AttachAIGeneratedCssListener` | `MvcEvent::EVENT_FINISH` (front + back) | Inyecta el CSS/JS de IA en las páginas renderizadas. |
| `…InjectDndAiButtonListener` | `MvcEvent::EVENT_FINISH` | Inyecta el botón **Generar con IA** en las zonas de arrastrar y soltar heredadas. |

El módulo también registra un `MelisPluginRendererOverride` para que los recursos de IA se inyecten correctamente durante el renderizado de plugins.

## Servidor MCP

Un servidor MCP stdio `minitemplate_creator` (punto de entrada `mcp/minitemplatecreator/bin/server.php`) se registra en `config['mcp']['servers']`. Las herramientas de abajo se declaran con `mcp: true`:

| Herramienta | Parámetros | Propósito |
| --- | --- | --- |
| `readSiteAssets` | `siteModule`, `templateRequest` | Devuelve los archivos CSS/JS/vista relevantes del sitio para que la IA se ajuste al diseño real. |
| `getSitePublicUrl` | `siteModule` | Devuelve la URL/dominio público del sitio para la inspección visual antes de generar. |
| `uploadMinitemplateImages` | `siteModule`, `image`, `filename` | Guarda una imagen (base64/data-URL/HTTP) en el directorio temporal de IA y devuelve una ruta web para `<img src>`. |
| `renderMinitemplatePreview` | `siteModule` | Activa la vista previa en el editor de la plantilla generada. |

El agente `minitemplatecreator` también dispone de las herramientas del sistema de archivos del motor (`createFile` / `readFile` / `updateFiles` / …) en su lista de permitidos. A mitad de conversación, el diálogo React registra `window.melisReactActionMap.preview_minitemplate` para que el motor pueda enviar el bloque `html` generado a la vista previa en vivo cuando `render_minitemplate_preview` retorna.

## Tablas de base de datos

Este módulo no crea tablas propias. Sus deltas de dbdeploy insertan filas en tablas propiedad de `melis-ai`:

| Tabla | Contiene |
| --- | --- |
| `melis_ai_instances` | Las instancias sembradas `minitemplatecreator` y `newscontentcreator`. |
| `melis_ai_agents` | Los agentes sembrados para las dos instancias. |

En tiempo de ejecución, los datos de noticias se acceden a través de `NewsTable` (`getNewsData($newsId)`), que hace un join con la tabla del sitio para resolver el `siteModule` necesario para ubicar las imágenes generadas.

## Archivos clave

| Aspecto | Ruta |
| --- | --- |
| Configuración del módulo (ruta MVC, toolpage_extensions) | `vendor/melisplatform/melis-ai-community-extensions/config/module.config.php` |
| Código fuente del brick | `vendor/melisplatform/melis-ai-community-extensions/ui-react/src/` |
| Brick compilado | `vendor/melisplatform/melis-ai-community-extensions/public/ui-react/{brick.js, brick.manifest.json}` |
| Puente de marcos de edición de página | `vendor/melisplatform/melis-ai-community-extensions/public/js/minitemplate/react-bridge.js` |
| Declaración de herramientas MCP | `vendor/melisplatform/melis-ai-community-extensions/config/mcp.tools.php` |
| Controlador de mini-plantillas | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/MiniTemplateController.php` |
| Controlador de noticias | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/NewsController.php` |
| Inyector de la vista "Old" | `vendor/melisplatform/melis-ai-community-extensions/src/Controller/React/PluginViewToolPageExtension.php` |
| Escuchadores | `vendor/melisplatform/melis-ai-community-extensions/src/Listener/` |
| Ayudante del botón Generar con IA | `vendor/melisplatform/melis-ai-community-extensions/src/View/Helper/MelisGenerateWithAIBtnHelper.php` |
| Gateway de la tabla de noticias | `vendor/melisplatform/melis-ai-community-extensions/src/Model/Tables/NewsTable.php` |
| Punto de entrada del servidor MCP | `vendor/melisplatform/melis-ai-community-extensions/mcp/minitemplatecreator/bin/server.php` |
| Directorio de recursos de IA | `public/miniTemplatesTinyMce/AI/{siteModule}/{temp\|css\|js\|images}/` |
| Deltas de instalación (siembra de agentes) | `vendor/melisplatform/melis-ai-community-extensions/install/dbdeploy/` |

Consulta también: [MelisAIEngine](/es/reference/modules/melis-ai-engine), [MelisAI](/es/reference/modules/melis-ai), [MelisAIToolCreator](/es/reference/modules/melis-ai-tool-creator), [MelisCms](/es/reference/modules/melis-cms), [MelisCmsNews](/es/reference/modules/melis-cms-news)
