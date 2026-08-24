# Installation

Melis Platform Community Edition is **free and open-source** (OSL-3.0). Three install paths are
available — pick the one that fits your workflow.

Melis v6 keeps the same framework, modules and database as v5. What changed is the
**back-office**: a new React interface now lives at **`/melis-react`**, sitting alongside the
classic tools. Installation is identical — the sections below apply unchanged, and the
[Meet the React back-office](#meet-the-react-back-office) section explains what you'll see once
you log in.

## Where to find Melis Platform

All official repositories live under the **[melisplatform](https://github.com/melisplatform)**
organisation on GitHub:

| Repository | What it is |
|---|---|
| [melis-docker-react](https://github.com/melisplatform/melis-docker-react) | Ready-to-run Docker stacks with the **React back-office enabled by default** — the fastest path to a working v6 platform |
| [melis-platform-skeleton](https://github.com/melisplatform/melis-platform-skeleton) | Project skeleton for Composer & source installs |

The skeleton is also available on **Packagist** as
[`melisplatform/melis-platform-skeleton`](https://packagist.org/packages/melisplatform/melis-platform-skeleton),
and the Docker images are published on **Docker Hub** — they are pulled automatically when you
bring the Compose stack up.

::: tip Classic (v5) Docker stack
The pre-React [`melis-docker`](https://github.com/melisplatform/melis-docker) stack still exists; it
is covered in the [legacy (v5) installation guide](/legacy/guide/getting-started).
:::

## Choose your install path

| Path | Command | Best for |
|---|---|---|
| **Docker** | `git clone https://github.com/melisplatform/melis-docker-react.git` | Demos, local dev, no local PHP setup — **React back-office by default** |
| **Composer** | `composer create-project melisplatform/melis-platform-skeleton` | New projects on your own Apache/PHP stack |
| **GitHub source** | `git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git` | Contributors, teams that want full Git history |

---

## Requirements

For Docker, everything is bundled — skip to [Option A](#option-a-docker-recommended) below.
For Composer or source installs:

- **PHP 8.3 (recommended)** or 8.4 (experimental) with the extensions: `intl`, `mysqli`,
  `pdo_mysql`, `gd` (freetype/jpeg/webp), `zip`, `curl`, `mbstring`, `exif`, `xml` (and `opcache`
  recommended). PHP 8.5 is not usable yet (Laminas dependencies cap at 8.4).
- **MySQL 8** (the stack uses MySQL 8.4).
- **Composer 2** and **Git** (for the Composer and source paths).
- **Apache or Nginx** with `mod_rewrite` / `try_files` pointing to `public/`.

## Option A — Docker (recommended)

Melis ships a dedicated **React-edition Docker repository**,
[`melis-docker-react`](https://github.com/melisplatform/melis-docker-react), where **every stack
enables the React back-office by default** (`WITH_REACT=1`) — you get `/melis` (classic) **and**
`/melis-react` out of the box. Clone it once, then pick a stack (each folder is self-contained, with
its own `docker-compose.yml`, `.env.example`, `conf/` and `README.md`):

```bash
git clone https://github.com/melisplatform/melis-docker-react.git
cd melis-docker-react
```

| Stack (folder)  | What you get | Best for |
|---|---|---|
| **`prebuilt/`**  | Pulls a ready-to-run image + MySQL — no local build | Fastest evaluation |
| **`install/`**   | Builds a fresh skeleton into `./melis` on your host (editable) + a Vite dev server | Working on the code / React UI |
| **`fpm/`**       | nginx + PHP-FPM, skeleton baked into the image | Production-style topology |
| **`app/latest/`**| Mounts an **existing** Melis project (rewrites your `composer.json` — commit first) | Projects you already have |
| **`dev/`**       | Per-PHP-version base images only (Apache/FPM, PHP 8.1–8.5) | Building your own images |

Every path finishes the same way: the **native Melis web installer** at
<http://localhost:8080> (`/melis/setup`) sets up the DB schema, admin user and the optional demo
site. The install is **not** scripted — the web installer is authoritative.

### Fastest — pre-built image

```bash
cd prebuilt
cp .env.example .env
docker compose up -d
# Open http://localhost:8080 and follow the web installer
```

When the installer asks for the database, use the `.env` defaults:

| Field | Value |
|---|---|
| Host | `melis-db` &nbsp;*(no `:port`)* |
| Database / User / Password | `melis` / `melis` / `melis` |

### Turnkey build (editable code on your host)

First boot runs `composer create-project` of the skeleton into `./melis` (a few minutes); the code
stays on your host, editable. This stack also starts a **Vite dev server** for hot-reloading the
React UI:

```bash
cd install
cp .env.example .env
mkdir -p melis            # pre-create the bind mount (WSL / Rancher Desktop)
docker compose up -d --build
```

The stack exposes:

| Service | URL |
| --- | --- |
| Front office | <http://localhost:8080> |
| **React back-office** | <http://localhost:8080/melis-react> |
| Classic tools | <http://localhost:8080/melis> |
| React UI with hot reload (Vite) | <http://localhost:5173> |

::: tip Defaults & tips
Database host `melis-db` (no port), db / user / password `melis` / `melis` / `melis`. Change
`HOST_PORT` in `.env` if port 8080 is taken. **No GitHub token needed** — every package (the React
modules and the `laminas-*` forks) resolves from Packagist. `make` shortcuts: `make up STACK=install`,
`make logs`, `make shell`, `make down`, `make up VITE=1`, `make adminer`.
:::

::: warning Change credentials before going to production
The default `melis` / `melis` credentials and the database password are for local development only.
Change them before exposing any instance publicly.
:::

### How the React back-office is enabled

Composer pulls the stable **6.x** releases of three modules: [`melis-core`](/reference/modules/melis-core)
(ships a committed production build of the React app, served under `/MelisCore/ui-react/` — no Node.js
at runtime), [`melis-react-api`](/reference/modules/melis-react-api) (the JSON API under
`/melis/react-api/*`) and [`melis-react-override`](/reference/modules/melis-react-override) (the
`/melis-react` SPA route + the iframe bridge that shows not-yet-migrated tools inside the React
shell). Prefer plain legacy Melis? Set `WITH_REACT=0` in `.env` before the first `up`.

To run several stacks at once without juggling ports, an opt-in shared `nginx-proxy` in
`local-proxy/` routes `*.local` hostnames — see the repo README.

## Option B — Composer (new project on your stack)

```bash
# 1. Create the project from the skeleton
composer create-project melisplatform/melis-platform-skeleton my-project
cd my-project
composer install

# 2. Create the database (utf8mb4)
mysql -u root -p -e "CREATE DATABASE myproject CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. Import the base data, then run migrations
mysql -u root -p myproject < install/first_install.sql
flyway -configFiles=flyway/conf/flyway.conf migrate
```

Point an Apache virtual host at the project's **`public/`** directory and declare the two Melis
environment variables:

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

Add `127.0.0.1 www.mysite.local` to your hosts file, reload Apache, then open
`http://www.mysite.local/melis-react`.

## Option C — GitHub source (contributors)

Each module lives in its own repository, included as a Git submodule:

```bash
git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git
# Already cloned? Pull all submodules:
git submodule update --init --recursive

cd melis-platform-skeleton
composer install
```

Then follow the same virtual host and database setup as Option B above.

## The two Melis environment variables

Every Melis install is driven by two variables (set in `docker-compose.yml` for Docker, or via
`SetEnv` for Apache):

- **`MELIS_PLATFORM`** — identifies the environment. It selects the configuration file
  `config/autoload/platforms/<MELIS_PLATFORM>.php`, which holds the **database connection** (so
  `MELIS_PLATFORM=local` loads `config/autoload/platforms/local.php`).
- **`MELIS_MODULE`** — identifies which **site module** is served as the front office for this
  domain.

## Meet the React back-office

Open **`/melis-react`** and sign in — the React app shows its own login screen and handles
authentication itself. Once in, you land on the dashboard: notification bubbles, KPI counters
(users / sites / pages / languages), recent-login activity and your saved tile layout.

A few things worth knowing on first contact:

- **Left menu.** The whole navigation tree is there, already **filtered by your rights** — a
  tool appears only if its module is enabled and you're allowed to use it. Click an entry to
  open the corresponding tool in the main panel.
- **Native React tools ("bricks").** Many tools have been rewritten as native React pages for a
  faster, smoother experience. Each of these carries a **New (React) / Old (iframe)** toggle so
  you can switch to the classic version of the same tool whenever you need to.
- **Classic tools still work.** Any tool that hasn't been rewritten yet opens seamlessly inside
  the shell — same DataTables, forms, tabs, modals and save buttons as before. It looks and
  behaves exactly like the classic `/melis` back-office, just framed inside the React UI.
- **Two URLs, one platform.** `/melis-react` is the new experience; the classic back-office
  remains available at **`/melis`** if you ever prefer it. Both drive the same data, rights and
  modules.

::: tip The AI Assistant is always one click away
A floating **AI Assistant** button sits in the corner of every back-office screen. Open it to
chat with Melis' built-in assistant without leaving the tool you're on.

![The floating AI Assistant button in the React back-office](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant.png)
:::

See [Architecture & concepts](./concepts) for the mental model behind the shell, bricks and the
classic-tool bridge, and the [module reference](/reference/modules/melis-core) for what each
tool does.

## Next steps

- [Architecture & concepts](./concepts) — the mental model behind Melis.
- [Build a website (CMS)](./build-a-site) — pages, templates and site trees.
- [Create your first tool](./create-a-tool) — add your own back-office tool.
- [Working with AI](./ai) — the assistant, agents and MCP inside Melis.
