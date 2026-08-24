# Installation

Melis Platform Community Edition est **libre et open-source** (OSL-3.0). Trois chemins
d'installation sont disponibles — choisissez celui qui correspond à votre workflow.

Melis v6 conserve le même framework, les mêmes modules et la même base de données que la v5. Ce
qui a changé, c'est le **backoffice** : une nouvelle interface React vit désormais sous
**`/melis-react`**, aux côtés des outils classiques. L'installation est identique — les sections
ci-dessous s'appliquent sans changement, et la section
[Découvrir le backoffice React](#decouvrir-le-backoffice-react) explique ce que vous verrez une
fois connecté.

## Où trouver Melis Platform

Tous les dépôts officiels se trouvent sous l'organisation
**[melisplatform](https://github.com/melisplatform)** sur GitHub :

| Dépôt | Description |
|---|---|
| [melis-docker-react](https://github.com/melisplatform/melis-docker-react) | Stacks Docker prêtes à l'emploi avec le **backoffice React activé par défaut** — le chemin le plus rapide vers une plateforme v6 fonctionnelle |
| [melis-platform-skeleton](https://github.com/melisplatform/melis-platform-skeleton) | Skeleton de projet pour les installs Composer et source |

Le skeleton est aussi disponible sur **Packagist** sous
[`melisplatform/melis-platform-skeleton`](https://packagist.org/packages/melisplatform/melis-platform-skeleton),
et les images Docker sont publiées sur **Docker Hub** — elles sont téléchargées automatiquement
au démarrage de la stack Compose.

::: tip Stack Docker classique (v5)
La stack pré-React [`melis-docker`](https://github.com/melisplatform/melis-docker) existe toujours ;
elle est décrite dans le [guide d'installation legacy (v5)](/fr/legacy/guide/getting-started).
:::

## Choisir votre chemin d'installation

| Chemin | Commande | Recommandé pour |
|---|---|---|
| **Docker** | `git clone https://github.com/melisplatform/melis-docker-react.git` | Démos, dev local, sans PHP installé localement — **backoffice React par défaut** |
| **Composer** | `composer create-project melisplatform/melis-platform-skeleton` | Nouveaux projets sur votre stack Apache/PHP |
| **Source GitHub** | `git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git` | Contributeurs, équipes qui veulent l'historique Git complet |

---

## Prérequis

Pour Docker, tout est inclus — passez directement à [l'Option A](#option-a-docker-recommande)
ci-dessous. Pour Composer ou source :

- **PHP 8.3 (recommandé)** ou 8.4 (expérimental) avec les extensions : `intl`, `mysqli`,
  `pdo_mysql`, `gd` (freetype/jpeg/webp), `zip`, `curl`, `mbstring`, `exif`, `xml` (et `opcache`
  recommandé). PHP 8.5 n'est pas encore utilisable (les dépendances Laminas plafonnent à 8.4).
- **MySQL 8** (la stack utilise MySQL 8.4).
- **Composer 2** et **Git** (pour les chemins Composer et source).
- **Apache ou Nginx** avec `mod_rewrite` / `try_files` pointant vers `public/`.

## Option A — Docker (recommandé) {#option-a-docker-recommande}

Melis fournit un **dépôt Docker dédié à l'édition React**,
[`melis-docker-react`](https://github.com/melisplatform/melis-docker-react), où **chaque stack
active le backoffice React par défaut** (`WITH_REACT=1`) — vous obtenez `/melis` (classique) **et**
`/melis-react` d'emblée. Clonez-le une fois, puis choisissez une stack (chaque dossier est
autonome, avec son propre `docker-compose.yml`, `.env.example`, `conf/` et `README.md`) :

```bash
git clone https://github.com/melisplatform/melis-docker-react.git
cd melis-docker-react
```

| Stack (dossier)  | Ce que vous obtenez | Recommandé pour |
|---|---|---|
| **`prebuilt/`**  | Récupère une image prête à l'emploi + MySQL — aucun build local | Évaluation la plus rapide |
| **`install/`**   | Construit un skeleton neuf dans `./melis` sur votre hôte (éditable) + un serveur de dev Vite | Travailler sur le code / l'UI React |
| **`fpm/`**       | nginx + PHP-FPM, skeleton intégré à l'image | Topologie de type production |
| **`app/latest/`**| Monte un projet Melis **existant** (réécrit votre `composer.json` — committez d'abord) | Projets que vous avez déjà |
| **`dev/`**       | Uniquement des images de base par version de PHP (Apache/FPM, PHP 8.1–8.5) | Construire vos propres images |

Chaque chemin se termine de la même façon : le **web installer natif de Melis** à
<http://localhost:8080> (`/melis/setup`) met en place le schéma de la base, l'utilisateur admin et
le site de démo optionnel. L'installation n'est **pas** scriptée — le web installer fait foi.

### Le plus rapide — image pré-buildée

```bash
cd prebuilt
cp .env.example .env
docker compose up -d
# Open http://localhost:8080 and follow the web installer
```

Lorsque l'installer demande la base de données, utilisez les valeurs par défaut du `.env` :

| Champ | Valeur |
|---|---|
| Hôte | `melis-db` &nbsp;*(sans `:port`)* |
| Base / Utilisateur / Mot de passe | `melis` / `melis` / `melis` |

### Build clé en main (code éditable sur votre hôte)

Le premier démarrage lance `composer create-project` du skeleton dans `./melis` (quelques
minutes) ; le code reste sur votre hôte, éditable. Cette stack démarre aussi un **serveur de dev
Vite** pour le rechargement à chaud de l'UI React :

```bash
cd install
cp .env.example .env
mkdir -p melis            # pre-create the bind mount (WSL / Rancher Desktop)
docker compose up -d --build
```

La stack expose :

| Service | URL |
| --- | --- |
| Front office | <http://localhost:8080> |
| **Backoffice React** | <http://localhost:8080/melis-react> |
| Outils classiques | <http://localhost:8080/melis> |
| UI React avec rechargement à chaud (Vite) | <http://localhost:5173> |

::: tip Valeurs par défaut & astuces
Hôte de la base `melis-db` (sans port), base / utilisateur / mot de passe `melis` / `melis` /
`melis`. Changez `HOST_PORT` dans `.env` si le port 8080 est déjà pris. **Aucun token GitHub
nécessaire** — chaque paquet (les modules React et les forks `laminas-*`) se résout depuis
Packagist. Raccourcis `make` : `make up STACK=install`, `make logs`, `make shell`, `make down`,
`make up VITE=1`, `make adminer`.
:::

::: warning Changez les identifiants avant la mise en production
Les identifiants par défaut `melis` / `melis` et le mot de passe de la base de données sont
réservés au développement local. Changez-les avant d'exposer une instance publiquement.
:::

### Comment le backoffice React est activé

Composer récupère les versions stables **6.x** de trois modules :
[`melis-core`](/fr/reference/modules/melis-core) (fournit un build de production commité de
l'application React, servi sous `/MelisCore/ui-react/` — pas de Node.js à l'exécution),
[`melis-react-api`](/fr/reference/modules/melis-react-api) (l'API JSON sous `/melis/react-api/*`)
et [`melis-react-override`](/fr/reference/modules/melis-react-override) (la route SPA
`/melis-react` + le pont iframe qui affiche les outils pas encore migrés dans le shell React).
Vous préférez le Melis legacy pur ? Définissez `WITH_REACT=0` dans `.env` avant le premier `up`.

Pour lancer plusieurs stacks à la fois sans jongler avec les ports, un `nginx-proxy` partagé
optionnel dans `local-proxy/` route les noms d'hôte `*.local` — voir le README du dépôt.

## Option B — Composer (nouveau projet sur votre stack)

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
`http://www.mysite.local/melis-react`.

## Option C — Source GitHub (contributeurs)

Chaque module vit dans son propre dépôt, inclus comme submodule Git :

```bash
git clone --recursive https://github.com/melisplatform/melis-platform-skeleton.git
# Already cloned? Pull all submodules:
git submodule update --init --recursive

cd melis-platform-skeleton
composer install
```

Ensuite, suivez la même configuration de virtual host et de base de données que l'Option B
ci-dessus.

## Les deux variables d'environnement Melis

Chaque installation Melis est pilotée par deux variables (définies dans `docker-compose.yml` pour
Docker, ou via `SetEnv` pour Apache) :

- **`MELIS_PLATFORM`** — identifie l'environnement. Elle sélectionne le fichier de configuration
  `config/autoload/platforms/<MELIS_PLATFORM>.php`, qui contient la **connexion base de données**
  (`MELIS_PLATFORM=local` charge donc `config/autoload/platforms/local.php`).
- **`MELIS_MODULE`** — identifie quel **module de site** est servi comme front office pour ce
  domaine.

## Découvrir le backoffice React {#decouvrir-le-backoffice-react}

Ouvrez **`/melis-react`** et connectez-vous — l'application React affiche son propre écran de
connexion et gère elle-même l'authentification. Une fois à l'intérieur, vous arrivez sur le
tableau de bord : bulles de notification, compteurs de KPI (utilisateurs / sites / pages /
langues), activité de connexion récente et votre disposition de tuiles enregistrée.

Quelques points utiles à connaître dès le premier contact :

- **Menu de gauche.** Tout l'arbre de navigation est là, déjà **filtré selon vos droits** — un
  outil n'apparaît que si son module est activé et que vous êtes autorisé à l'utiliser. Cliquez
  sur une entrée pour ouvrir l'outil correspondant dans le panneau principal.
- **Outils React natifs (« bricks »).** De nombreux outils ont été réécrits en pages React
  natives pour une expérience plus rapide et plus fluide. Chacun d'eux dispose d'un bascule
  **Nouveau (React) / Ancien (iframe)** qui vous permet de revenir à la version classique du même
  outil quand vous en avez besoin.
- **Les outils classiques fonctionnent toujours.** Tout outil qui n'a pas encore été réécrit
  s'ouvre de façon transparente à l'intérieur du shell — mêmes DataTables, formulaires, onglets,
  modales et boutons d'enregistrement qu'avant. Il se présente et se comporte exactement comme le
  backoffice classique `/melis`, simplement encadré dans l'interface React.
- **Deux URLs, une seule plateforme.** `/melis-react` est la nouvelle expérience ; le backoffice
  classique reste disponible sous **`/melis`** si vous le préférez. Les deux pilotent les mêmes
  données, droits et modules.

::: tip L'assistant IA est toujours à un clic
Un bouton **Assistant IA** flottant se trouve dans le coin de chaque écran du backoffice. Ouvrez-le
pour discuter avec l'assistant intégré de Melis sans quitter l'outil sur lequel vous travaillez.

![Le bouton flottant de l'assistant IA dans le backoffice React](/screenshots/react/melis-ai/melisai-footer-icon-generalassistant.png)
:::

Consultez [Architecture & concepts](./concepts) pour le modèle mental derrière le shell, les
bricks et le pont vers les outils classiques, et la
[référence des modules](/fr/reference/modules/melis-core) pour savoir ce que fait chaque outil.

## Étapes suivantes

- [Architecture & concepts](./concepts) — le modèle mental de Melis.
- [Construire un site (CMS)](./build-a-site) — pages, templates et arbres de sites.
- [Créer votre premier tool](./create-a-tool) — ajoutez votre propre outil backoffice.
- [Travailler avec l'IA](./ai) — l'assistant, les agents et MCP dans Melis.
