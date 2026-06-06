# Installation

Melis Platform Community Edition est **libre et open-source** (OSL-3.0). Trois chemins
d'installation sont disponibles — choisissez celui qui correspond à votre workflow.

## Où trouver Melis Platform

Tous les dépôts officiels se trouvent sous l'organisation
**[melisplatform](https://github.com/melisplatform)** sur GitHub :

| Dépôt | Description |
|---|---|
| [melis-docker](https://github.com/melisplatform/melis-docker) | Stack Docker prête à l'emploi — le chemin le plus rapide vers une plateforme fonctionnelle |
| [melis-platform-skeleton](https://github.com/melisplatform/melis-platform-skeleton) | Skeleton de projet pour les installs Composer et source |

Le skeleton est aussi disponible sur **Packagist** sous
[`melisplatform/melis-platform-skeleton`](https://packagist.org/packages/melisplatform/melis-platform-skeleton),
et les images Docker sont publiées sur **Docker Hub** — elles sont téléchargées automatiquement
au démarrage de la stack Compose.

## Choisir votre chemin d'installation

| Chemin | Commande | Recommandé pour |
|---|---|---|
| **Docker** | `git clone https://github.com/melisplatform/melis-docker.git` | Démos, dev local, sans PHP installé localement |
| **Composer** | `composer create-project melisplatform/melis-platform-skeleton` | Nouveaux projets sur votre stack Apache/PHP |
| **Source GitHub** | `git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git` | Contributeurs, équipes qui veulent l'historique Git complet |

---

## Prérequis

Pour Docker, tout est inclus — passez directement à [l'Option A](#option-a-docker-recommande).
Pour Composer ou source :

- **PHP 8.1 ou 8.3** avec les extensions : `intl`, `mysqli`, `pdo_mysql`, `gd`
  (freetype/jpeg/webp), `zip`, `curl`, `mbstring`, `exif`, `xml` (et `opcache` recommandé).
- **MySQL 8** (la stack utilise MySQL 8.4).
- **Composer 2** et **Git** (pour les chemins Composer et source).
- **Apache ou Nginx** avec `mod_rewrite` / `try_files` pointant vers `public/`.

## Option A — Docker (recommandé) {#option-a-docker-recommande}

### Docker autonome (melis-docker)

Le chemin le plus rapide pour démarrer de zéro :

```bash
git clone https://github.com/melisplatform/melis-docker.git
cd melis-docker/app/latest
docker-compose build --pull
docker-compose up -d
# Ouvrir http://localhost:8080
```

La version PHP et le port exposé sont configurables dans `app/latest/.env`.

### Docker du skeleton dev (basé sur make)

Si vous avez déjà cloné le projet skeleton, le `Makefile` enveloppe Docker Compose :

```bash
make build          # copie le fichier d'env local et build l'image
make start          # démarre les conteneurs (php, db, phpmyadmin)
make first_install  # crée et importe la base, applique les migrations, déballe les médias
```

C'est tout. La stack expose :

| Service        | URL                          |
| -------------- | ---------------------------- |
| Front office   | <http://localhost>           |
| **Backoffice** | <http://localhost/melis>     |
| phpMyAdmin     | <http://localhost:8080>      |

::: tip Identifiants par défaut
Connexion backoffice : **`admin`** / **`password`**. phpMyAdmin : serveur `melis-db-dev`,
utilisateur `admin` / `password`, base `dev`.
:::

::: warning À changer avant la mise en production
Les identifiants `admin`/`password` sont réservés au développement local.
Modifiez-les — ainsi que le mot de passe de la base de données — avant d'exposer une instance publiquement.
:::

### Cibles Make utiles

```bash
make stop      # arrêter la stack
make start     # la relancer
make ssh       # shell dans le conteneur PHP (melis-dev)
make logs      # suivre les logs applicatifs
make down      # arrêter et supprimer conteneurs + volumes
```

En coulisses, `make build` copie `iac/melis/docker/config/.env.local` vers `.env` et build
`iac/melis/docker/Dockerfile.local` ; `make first_install` importe
`install/first_install.sql.tar.gz` et applique les migrations Flyway de `flyway/sql/`.

## Option B — Composer (nouveau projet sur votre stack)

```bash
# 1. Créer le projet à partir du skeleton
composer create-project melisplatform/melis-platform-skeleton my-project
cd my-project
composer install

# 2. Créer la base (utf8mb4)
mysql -u root -p -e "CREATE DATABASE myproject CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. Importer les données de base, puis migrer
mysql -u root -p myproject < install/first_install.sql
flyway -configFiles=flyway/conf/flyway.conf migrate
```

Faites pointer un virtual host Apache vers le dossier **`public/`** du projet et déclarez les
deux variables d'environnement Melis :

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

Ajoutez `127.0.0.1 www.mysite.local` à votre fichier hosts, rechargez Apache, puis ouvrez
`http://www.mysite.local/melis`.

## Option C — Source GitHub (contributeurs)

Chaque module vit dans son propre dépôt, inclus comme submodule Git :

```bash
git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git
# Déjà cloné ? Mettez à jour tous les submodules :
git submodule update --init --recursive

cd melis-platform-skeleton
composer install
```

Ensuite, suivez la même configuration de virtual host et de base de données que l'Option B.

## Les deux variables d'environnement Melis

Chaque installation Melis est pilotée par deux variables (définies dans `docker-compose.yml` pour
Docker, ou via `SetEnv` pour Apache) :

- **`MELIS_PLATFORM`** — identifie l'environnement. Elle sélectionne le fichier de configuration
  `config/autoload/platforms/<MELIS_PLATFORM>.php`, qui contient la **connexion base de données**
  (`MELIS_PLATFORM=local` charge donc `config/autoload/platforms/local.php`).
- **`MELIS_MODULE`** — identifie quel **module de site** est servi comme front office pour ce
  domaine.

## Étapes suivantes

- [Architecture & concepts](./concepts) — le modèle mental de Melis.
- [Construire un site (CMS)](./build-a-site) — pages, templates et arbres de sites.
- [Créer votre premier tool](./create-a-tool) — ajoutez votre propre tool backoffice.
