# Instalación

Melis Platform Community Edition es **gratuita y de código abierto** (OSL-3.0). Hay tres rutas de
instalación disponibles: elige la que mejor se adapte a tu flujo de trabajo.

Melis v6 mantiene el mismo framework, módulos y base de datos que la v5. Lo que cambió es el
**back-office**: una nueva interfaz React reside ahora en **`/melis-react`**, junto a las
herramientas clásicas. La instalación es idéntica —las secciones siguientes se aplican sin
cambios— y la sección [Descubre el back-office React](#descubre-el-back-office-react) explica lo que
verás una vez que inicies sesión.

## Dónde encontrar Melis Platform

Todos los repositorios oficiales se encuentran bajo la organización
**[melisplatform](https://github.com/melisplatform)** en GitHub:

| Repositorio | Qué es |
|---|---|
| [melis-docker-react](https://github.com/melisplatform/melis-docker-react) | Stacks Docker listos para ejecutar con el **back-office React habilitado por defecto** — la ruta más rápida hacia una plataforma v6 funcional |
| [melis-platform-skeleton](https://github.com/melisplatform/melis-platform-skeleton) | Esqueleto de proyecto para instalaciones con Composer y desde el código fuente |

El esqueleto también está disponible en **Packagist** como
[`melisplatform/melis-platform-skeleton`](https://packagist.org/packages/melisplatform/melis-platform-skeleton),
y las imágenes Docker se publican en **Docker Hub** — se descargan automáticamente cuando
levantas el stack de Compose.

::: tip Stack Docker clásico (v5)
El stack [`melis-docker`](https://github.com/melisplatform/melis-docker) anterior a React sigue
existiendo; se trata en la [guía de instalación heredada (v5)](/legacy/guide/getting-started).
:::

## Elige tu ruta de instalación

| Ruta | Comando | Ideal para |
|---|---|---|
| **Docker** | `git clone https://github.com/melisplatform/melis-docker-react.git` | Demos, desarrollo local, sin configuración de PHP local — **back-office React por defecto** |
| **Composer** | `composer create-project melisplatform/melis-platform-skeleton` | Nuevos proyectos sobre tu propio stack Apache/PHP |
| **Código fuente de GitHub** | `git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git` | Colaboradores, equipos que quieren el historial completo de Git |

---

## Requisitos

Para Docker, todo viene incluido — salta a la [Opción A](#opcion-a-docker-recomendada) más abajo.
Para instalaciones con Composer o desde el código fuente:

- **PHP 8.3 (recomendado)** u 8.4 (experimental) con las extensiones: `intl`, `mysqli`,
  `pdo_mysql`, `gd` (freetype/jpeg/webp), `zip`, `curl`, `mbstring`, `exif`, `xml` (y `opcache`
  recomendado). PHP 8.5 aún no es utilizable (las dependencias de Laminas llegan hasta 8.4).
- **MySQL 8** (el stack usa MySQL 8.4).
- **Composer 2** y **Git** (para las rutas de Composer y código fuente).
- **Apache o Nginx** con `mod_rewrite` / `try_files` apuntando a `public/`.

## Opción A — Docker (recomendada)

Melis incluye un **repositorio Docker dedicado a la edición React**,
[`melis-docker-react`](https://github.com/melisplatform/melis-docker-react), donde **cada stack
habilita el back-office React por defecto** (`WITH_REACT=1`) — obtienes `/melis` (clásico) **y**
`/melis-react` de forma inmediata. Clónalo una vez y luego elige un stack (cada carpeta es
autónoma, con su propio `docker-compose.yml`, `.env.example`, `conf/` y `README.md`):

```bash
git clone https://github.com/melisplatform/melis-docker-react.git
cd melis-docker-react
```

| Stack (carpeta)  | Qué obtienes | Ideal para |
|---|---|---|
| **`prebuilt/`**  | Descarga una imagen lista para ejecutar + MySQL — sin compilación local | Evaluación más rápida |
| **`install/`**   | Compila un esqueleto nuevo en `./melis` en tu host (editable) + un servidor de desarrollo Vite | Trabajar sobre el código / la interfaz React |
| **`fpm/`**       | nginx + PHP-FPM, esqueleto integrado en la imagen | Topología estilo producción |
| **`app/latest/`**| Monta un proyecto Melis **existente** (reescribe tu `composer.json` — confirma primero) | Proyectos que ya tienes |
| **`dev/`**       | Solo imágenes base por versión de PHP (Apache/FPM, PHP 8.1–8.5) | Compilar tus propias imágenes |

Todas las rutas terminan igual: el **instalador web nativo de Melis** en
<http://localhost:8080> (`/melis/setup`) configura el esquema de la base de datos, el usuario
administrador y el sitio de demostración opcional. La instalación **no** está automatizada — el
instalador web es la referencia autoritativa.

### Más rápido — imagen precompilada

```bash
cd prebuilt
cp .env.example .env
docker compose up -d
# Abre http://localhost:8080 y sigue el instalador web
```

Cuando el instalador solicite la base de datos, usa los valores por defecto de `.env`:

| Campo | Valor |
|---|---|
| Host | `melis-db` &nbsp;*(sin `:puerto`)* |
| Base de datos / Usuario / Contraseña | `melis` / `melis` / `melis` |

### Compilación llave en mano (código editable en tu host)

El primer arranque ejecuta `composer create-project` del esqueleto en `./melis` (unos minutos); el
código permanece en tu host, editable. Este stack también inicia un **servidor de desarrollo Vite**
para la recarga en caliente de la interfaz React:

```bash
cd install
cp .env.example .env
mkdir -p melis            # crea previamente el bind mount (WSL / Rancher Desktop)
docker compose up -d --build
```

El stack expone:

| Servicio | URL |
| --- | --- |
| Front office | <http://localhost:8080> |
| **Back-office React** | <http://localhost:8080/melis-react> |
| Herramientas clásicas | <http://localhost:8080/melis> |
| Interfaz React con recarga en caliente (Vite) | <http://localhost:5173> |

::: tip Valores por defecto y consejos
Host de la base de datos `melis-db` (sin puerto), base de datos / usuario / contraseña `melis` / `melis` / `melis`. Cambia
`HOST_PORT` en `.env` si el puerto 8080 está ocupado. **No se necesita token de GitHub** — cada paquete (los módulos
React y los forks de `laminas-*`) se resuelve desde Packagist. Atajos de `make`: `make up STACK=install`,
`make logs`, `make shell`, `make down`, `make up VITE=1`, `make adminer`.
:::

::: warning Cambia las credenciales antes de pasar a producción
Las credenciales `melis` / `melis` por defecto y la contraseña de la base de datos son solo para desarrollo local.
Cámbialas antes de exponer cualquier instancia públicamente.
:::

### Cómo se habilita el back-office React

Composer descarga las versiones estables **6.x** de tres módulos: [`melis-core`](/es/reference/modules/melis-core)
(incluye una compilación de producción confirmada de la app React, servida bajo `/MelisCore/ui-react/` — sin Node.js
en tiempo de ejecución), [`melis-react-api`](/es/reference/modules/melis-react-api) (la API JSON bajo
`/melis/react-api/*`) y [`melis-react-override`](/es/reference/modules/melis-react-override) (la
ruta SPA `/melis-react` + el puente iframe que muestra las herramientas aún no migradas dentro del
shell React). ¿Prefieres el Melis clásico sin más? Establece `WITH_REACT=0` en `.env` antes del primer `up`.

Para ejecutar varios stacks a la vez sin tener que malabarear los puertos, un `nginx-proxy` compartido y opcional en
`local-proxy/` enruta los nombres de host `*.local` — consulta el README del repositorio.

## Opción B — Composer (nuevo proyecto en tu stack)

```bash
# 1. Crea el proyecto a partir del esqueleto
composer create-project melisplatform/melis-platform-skeleton my-project
cd my-project
composer install

# 2. Crea la base de datos (utf8mb4)
mysql -u root -p -e "CREATE DATABASE myproject CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. Importa los datos base, luego ejecuta las migraciones
mysql -u root -p myproject < install/first_install.sql
flyway -configFiles=flyway/conf/flyway.conf migrate
```

Apunta un host virtual de Apache al directorio **`public/`** del proyecto y declara las dos
variables de entorno de Melis:

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

Añade `127.0.0.1 www.mysite.local` a tu archivo de hosts, recarga Apache y luego abre
`http://www.mysite.local/melis-react`.

## Opción C — Código fuente de GitHub (colaboradores)

Cada módulo reside en su propio repositorio, incluido como submódulo de Git:

```bash
git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git
# ¿Ya lo clonaste? Descarga todos los submódulos:
git submodule update --init --recursive

cd melis-platform-skeleton
composer install
```

Luego sigue la misma configuración de host virtual y base de datos que en la Opción B anterior.

## Las dos variables de entorno de Melis

Cada instalación de Melis se rige por dos variables (definidas en `docker-compose.yml` para Docker, o mediante
`SetEnv` para Apache):

- **`MELIS_PLATFORM`** — identifica el entorno. Selecciona el archivo de configuración
  `config/autoload/platforms/<MELIS_PLATFORM>.php`, que contiene la **conexión a la base de datos** (por lo que
  `MELIS_PLATFORM=local` carga `config/autoload/platforms/local.php`).
- **`MELIS_MODULE`** — identifica qué **módulo de sitio** se sirve como front office para este
  dominio.

## Descubre el back-office React

Abre **`/melis-react`** e inicia sesión — la app React muestra su propia pantalla de inicio de sesión y gestiona la
autenticación por sí misma. Una vez dentro, llegas al panel de control: burbujas de notificación, contadores KPI
(usuarios / sitios / páginas / idiomas), la actividad de inicios de sesión recientes y tu disposición de mosaicos guardada.

Algunas cosas que conviene saber en el primer contacto:

- **Menú izquierdo.** Todo el árbol de navegación está ahí, ya **filtrado según tus derechos** — una
  herramienta aparece solo si su módulo está habilitado y tienes permiso para usarla. Haz clic en una entrada para
  abrir la herramienta correspondiente en el panel principal.
- **Herramientas React nativas ("bricks").** Muchas herramientas se han reescrito como páginas React nativas para una
  experiencia más rápida y fluida. Cada una de ellas incluye un conmutador **New (React) / Old (iframe)** para
  que puedas cambiar a la versión clásica de la misma herramienta cuando lo necesites.
- **Las herramientas clásicas siguen funcionando.** Cualquier herramienta que aún no se haya reescrito se abre sin problemas dentro
  del shell — las mismas DataTables, formularios, pestañas, ventanas modales y botones de guardado que antes. Se ve y
  se comporta exactamente igual que el back-office clásico `/melis`, solo que enmarcada dentro de la interfaz React.
- **Dos URLs, una plataforma.** `/melis-react` es la nueva experiencia; el back-office clásico
  sigue disponible en **`/melis`** por si alguna vez lo prefieres. Ambos gestionan los mismos datos, derechos y
  módulos.

::: tip El Asistente de IA siempre está a un clic de distancia
Un botón flotante de **AI Assistant** se ubica en la esquina de cada pantalla del back-office. Ábrelo para
conversar con el asistente integrado de Melis sin salir de la herramienta en la que estás.

![El botón flotante del AI Assistant en el back-office React](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant.png)
:::

Consulta [Arquitectura y conceptos](./concepts) para el modelo mental que hay detrás del shell, los bricks y el
puente de herramientas clásicas, y la [referencia de módulos](/es/reference/modules/melis-core) para saber qué hace cada
herramienta.

## Próximos pasos

- [Arquitectura y conceptos](./concepts) — el modelo mental detrás de Melis.
- [Crear un sitio web (CMS)](./build-a-site) — páginas, plantillas y árboles de sitios.
- [Crea tu primera herramienta](./create-a-tool) — añade tu propia herramienta de back-office.
- [Trabajar con IA](./ai) — el asistente, los agentes y MCP dentro de Melis.
