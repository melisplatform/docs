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

## Où regarder

| Sujet | Chemin |
| --- | --- |
| Liste des modules | `config/melis.module.load.php` |
| DB plateforme | `config/autoload/platforms/<MELIS_PLATFORM>.php` |
| Service de config | `vendor/melisplatform/melis-core/src/Service/MelisCoreConfigService.php` |
| Config de cache | `vendor/melisplatform/melis-core/config/module.config.php` (`caches`) |
| Asset manager | `vendor/melisplatform/melis-asset-manager/` |
