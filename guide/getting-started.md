# Installation

Melis Platform Community Edition is **free and open-source** (OSL-3.0). Three install paths are
available — pick the one that fits your workflow.

## Where to find Melis Platform

All official repositories live under the **[melisplatform](https://github.com/melisplatform)**
organisation on GitHub:

| Repository | What it is |
|---|---|
| [melis-docker](https://github.com/melisplatform/melis-docker) | Ready-to-run Docker stack — the fastest path to a working platform |
| [melis-platform-skeleton](https://github.com/melisplatform/melis-platform-skeleton) | Project skeleton for Composer & source installs |

The skeleton is also available on **Packagist** as
[`melisplatform/melis-platform-skeleton`](https://packagist.org/packages/melisplatform/melis-platform-skeleton),
and the Docker images are published on **Docker Hub** — they are pulled automatically when you
bring the Compose stack up.

## Choose your install path

| Path | Command | Best for |
|---|---|---|
| **Docker** | `git clone https://github.com/melisplatform/melis-docker.git` | Demos, local dev, no local PHP setup needed |
| **Composer** | `composer create-project melisplatform/melis-platform-skeleton` | New projects on your own Apache/PHP stack |
| **GitHub source** | `git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git` | Contributors, teams that want full Git history |

---

## Requirements

For Docker, everything is bundled — skip to [Option A](#option-a-docker-recommended) below.
For Composer or source installs:

- **PHP 8.1 or 8.3** with the extensions: `intl`, `mysqli`, `pdo_mysql`, `gd`
  (freetype/jpeg/webp), `zip`, `curl`, `mbstring`, `exif`, `xml` (and `opcache` recommended).
- **MySQL 8** (the stack uses MySQL 8.4).
- **Composer 2** and **Git** (for the Composer and source paths).
- **Apache or Nginx** with `mod_rewrite` / `try_files` pointing to `public/`.

## Option A — Docker (recommended)

### Standalone Docker (melis-docker)

The fastest path for anyone starting fresh:

```bash
git clone https://github.com/melisplatform/melis-docker.git
cd melis-docker/app/latest
docker-compose build --pull
docker-compose up -d
# Open http://localhost:8080
```

The PHP version and exposed port are configurable in `app/latest/.env`.

### Dev skeleton Docker (make-based)

If you already cloned the skeleton project, the `Makefile` wraps Docker Compose:

```bash
make build          # copies the local env file and builds the image
make start          # starts the containers (php, db, phpmyadmin)
make first_install  # creates & imports the database, runs migrations, unpacks media
```

That's it. The stack exposes:

| Service        | URL                          |
| -------------- | ---------------------------- |
| Front office   | <http://localhost>           |
| **Backoffice** | <http://localhost/melis>     |
| phpMyAdmin     | <http://localhost:8080>      |

::: tip Default credentials
Backoffice login: **`admin`** / **`password`**. phpMyAdmin: server `melis-db-dev`,
user `admin` / `password`, database `dev`.
:::

### Useful Make targets

```bash
make stop      # stop the stack
make start     # start it again
make ssh       # shell into the PHP container (melis-dev)
make logs      # tail the application logs
make down      # stop and remove containers + volumes
```

Under the hood, `make build` copies `iac/melis/docker/config/.env.local` to `.env` and builds
`iac/melis/docker/Dockerfile.local`; `make first_install` imports
`install/first_install.sql.tar.gz` and applies the Flyway migrations in `flyway/sql/`.

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
`http://www.mysite.local/melis`.

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

## Next steps

- [Architecture & concepts](./concepts) — the mental model behind Melis.
- [Build a website (CMS)](./build-a-site) — pages, templates and site trees.
- [Create your first tool](./create-a-tool) — add your own backoffice tool.
