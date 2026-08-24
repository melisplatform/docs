# Référence de configuration

Tout ce que vous pouvez configurer dans Melis, au même endroit : variables d'environnement, fichier
plateforme, la famille `app.*.php`, les melis keys, les traductions, les assets et les caches.

## Variables d'environnement

Deux variables pilotent chaque installation (définies dans `docker-compose.yml`, ou via Apache
`SetEnv`) :

| Variable | Rôle |
| --- | --- |
| **`MELIS_PLATFORM`** | Sélectionne la config plateforme `config/autoload/platforms/<MELIS_PLATFORM>.php` (la connexion DB). P. ex. `local`, `dev1`. |
| **`MELIS_MODULE`** | Le **module de site** servi comme front office pour ce domaine (p. ex. `MelisDemoCms`). |
| `MYSQL_HOSTNAME` / `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` | Connexion DB, généralement lue par le fichier plateforme via `getenv()`. |

## Le fichier plateforme

`config/autoload/platforms/<MELIS_PLATFORM>.php` contient la **connexion base de données** (et
quelques réglages d'hôte). Il est fusionné en dernier, donc il surcharge les défauts par
environnement :

```php
return [
    'db' => [
        'driver'   => 'Mysqli',
        'hostname' => getenv('MYSQL_HOSTNAME') ?: 'localhost',
        'database' => getenv('MYSQL_DATABASE'),
        'username' => getenv('MYSQL_USER'),
        'password' => getenv('MYSQL_PASSWORD'),
        'port'     => '3306',
        'charset'  => 'utf8mb4',
    ],
    'melis_platform'       => getenv('MELIS_PLATFORM'),
    'melis_http_host'      => 'localhost',
    'melis_request_scheme' => 'http',
];
```

Le fichier chargé est choisi dans `config/application.config.php` (`config_glob_paths`) depuis
`getenv('MELIS_PLATFORM')`.

## Fichiers de config projet

| Fichier | Rôle |
| --- | --- |
| `config/melis.module.load.php` | La liste ordonnée des **modules backoffice** à charger. |
| `config/melis.modules.path.php` | Map généré : nom de module → chemin filesystem (construit par `MelisAssetManager`). |
| `config/application.config.php` | Entrée de l'app : assemblage des modules, glob paths, flags de cache. |
| `config/autoload/{global,local}.php` | Config autoload Laminas standard. |
| `config/autoload/platforms/<env>.php` | Config DB/plateforme par environnement (ci-dessus). |
| `config/development.config.php` | Surcharges de dev (créé par `laminas-development-mode enable`). |

## La famille `app.*.php`

Chaque module backoffice fusionne ces fichiers spécifiques à Melis dans `Module::getConfig()`. Ils
construisent tous un arbre unique sous une racine `plugins`, interrogeable via
[`MelisCoreConfig`](../guide/concepts#_2-l-arbre-de-config-les-melis-keys) :

| Fichier | Déclare |
| --- | --- |
| `app.interface.php` | Les **zones** d'UI et leur `forward` (module/controller/action). Chaque nœud : `conf` (id, name, icon, `melisKey`, `rightsDisplay`), `forward`, `interface` imbriqué. |
| `app.toolstree.php` | L'emplacement d'un tool dans le **menu gauche** (`*_toolstree_section`). |
| `app.tools.php` | Les **tools** : tables de données (colonnes, filtres, boutons d'action), formulaires. |
| `app.forms.php` | Définitions de **formulaires** réutilisables (spec Laminas form + `input_filter`). |
| `app.emails.php` | Configs de templates d'email. |
| `app.microservice.php` | APIs de méthodes de service appelables (formulaires entrée/sortie). |
| `excluded.routes.php` | Routes qui contournent le contrôle d'auth. |

### Conventions

- **Clés de traduction** : `tr_<module>_<section>_<item>` (p. ex. `tr_meliscore_tool_users`).
- **Ids de config** : `id_<module>_<item>`.
- **Melis keys** : alias courts déclarés comme `'conf' => ['melisKey' => '…']` → résolus en chemins
  de config complets par `MelisCoreConfig::getMelisKeys()`.
- **Tables** : `melis_<domaine>_<entité>` (p. ex. `melis_core_user`, `melis_cms_page_published`,
  `melis_ecom_product`).
- **Routes** : `<slug-module>/<nom>` (p. ex. `melis-backoffice/login`).

## Traductions

Tableaux PHP par locale, sous le `language/` de chaque module :

```
language/en_EN.interface.php
language/fr_FR.interface.php   // 'tr_key' => 'Texte'
```

Chargés par `Module::createTranslations()` pour la locale active (session `melis-lang-locale`), avec
`en_EN` en fallback. Les types incluent `interface`, `forms`, `install`, `setup`.

## Assets

`MelisAssetManager` sert le dossier `public/` de chaque module sous `/<NomModule>/…` et génère
`config/melis.modules.path.php`. Un **module de site** liste ses CSS/JS front office dans
`config/assets.config.php`. Le bundling Webpack est disponible (outil de build / action backoffice).

## Caches

Le comportement du cache est configuré dans le `module.config.php` de `melis-core` (section
`caches`) et utilisé via `MelisCoreCacheSystemService`. Chaque cache a un flag `active`, un
`cache_dir` sous `cache/`, et des TTL par clé. Le **cache de config** Laminas est gouverné par
`config_cache_enabled` dans `application.config.php` (désactivé par défaut dans ce skeleton). Voir
[Dépannage](../guide/troubleshooting#cache) pour vider les caches.

## Configuration du back-office React

Le back-office React v6 (`/melis-react`) tourne sur le **même framework et le même arbre de
config** que le back-office classique (`/melis`) — tout ce qui précède s'applique encore. Deux
modules d'infrastructure supplémentaires assurent son câblage. Les deux sont chargés via
`config/application.config.php` (`module_paths` / `modules`, pas via l'autoload composer) et
aucun des deux n'a de config de niveau projet à éditer : activer le BO React se résume à charger
ces modules.

| Module | Rôle |
| --- | --- |
| `MelisReactApi` | L'ossature de l'API JSON. Déclare les endpoints génériques `/melis/react-api/…` (dans son propre `config/module.config.php`) et héberge le résolveur de capabilities. Ne produit aucune UI. |
| `MelisReactOverride` | Sert le shell React et rend les tools legacy sous forme d'iframes. Surcharge le contrôleur `PluginView` de MelisCore et déclare les routes du shell/des tools. |

### Servir le shell

La SPA React est servie par le `SpaController` de `MelisReactOverride` à **`/melis-react`** et
chaque lien profond en dessous (route regex `meliscore-melis-react-spa`, `priority => 1000`). Le
`index.html` du shell est lu depuis le `public/ui-react/index.html` de **melis-core**, servi à
`/MelisCore/ui-react/` — le build React vit donc avec `melis-core`, pas dans ces modules.

Parce que l'application React gère sa propre authentification, `MelisReactOverride` ajoute
quelques routes à `plugins.meliscore.datas.excluded_routes` de MelisCore (publiques, sans
redirection de connexion) : la route de la SPA elle-même, `melis-backoffice/react-platform-bundle`,
et les deux endpoints de boot en lecture seule
`melis-backoffice/melis-react-api/platformscheme-react-get` et
`melis-backoffice/melis-react-api/langs`.

### Découverte des bricks / modules

Le shell découvre les tools au démarrage via **`GET /melis/react-api/react-modules`**, qui scanne
les modules **actifs** à la recherche d'un `public/ui-react/brick.manifest.json` (un objet unique
ou un tableau `bricks: [...]`) et renvoie les définitions de bricks plus une URL de bundle unique
concaténée (`GET /melis/react-api/bricks-bundle.js`). Un brick apparaît donc **si et seulement si
son module est actif** — c'est la règle de modularité ; il n'y a pas de registre séparé à
maintenir. Un module qui livre un tool React le fournit comme brick sous son propre
`public/ui-react/`.

### Clés de config React par module

Les modules de tools individuels (pas ces deux modules d'infrastructure) peuvent déclarer une
config React, fusionnée dans l'arbre de config via leur `Module::getConfig()` :

| Fichier / clé | Déclare |
| --- | --- |
| `config/react-api.php` | Les propres routes de données `/melis/react-api/…` d'un module de tool (p. ex. `users`, `roles` vivent dans MelisCore / MelisSmallBusiness — **pas** dans MelisReactApi). |
| `config/react.capabilities.php` (`melisReactToolCapabilities`) | Les « droits avancés » fins (`list` / `create` / `edit` / `delete`, ou un arbre imbriqué `{ actions, tabs }`) qui existent par `melisKey` de tool. Le défaut est **autoriser** ; les refus sont stockés dans une section dédiée `<meliscore_tool_capabilities>` du XML des droits utilisateur/rôle. |
| `melis_react_override.toolpage_extensions[]` | Noms de services implémentant `PluginViewToolPageExtensionInterface` — les particularités par tool d'un module (ajustements HTML/assets) pour les tools legacy affichés dans le shell React. Les contributions s'accumulent quel que soit l'ordre de chargement. |

Les modules d'infrastructure eux-mêmes ne déclarent **aucune** de ces clés : `MelisReactApi` est le
moteur qui *lit* les déclarations de capabilities des autres modules, et `MelisReactOverride` ne
livre aucun brick, aucun `react-api.php` et aucun `react.capabilities.php`.

## Où regarder

| Sujet | Chemin |
| --- | --- |
| Liste des modules | `config/melis.module.load.php` |
| DB plateforme | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| Service de config | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Config de cache | `vendor/melisplatform/melis-core/config/module.config.php` (`caches`) |
| Asset manager | `vendor/melisplatform/melis-asset-manager/` |
| Routes d'API React / résolveur de capabilities | `vendor/melisplatform/melis-react-api/` |
| Shell React + iframe des tools legacy / route SPA | `vendor/melisplatform/melis-react-override/` |
| Build du shell React (`index.html`, bricks) | `vendor/melisplatform/melis-core/public/ui-react/` |
