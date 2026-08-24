# Dépannage & exploitation

Un guide de terrain pour les problèmes que vous rencontrerez vraiment, avec la cause et la solution.
Quand quelque chose « n'apparaît pas », la réponse est presque toujours **modules / droits / cache**.

## Activez d'abord les erreurs

Par défaut, Melis est discret sur les erreurs. Activez le **mode développement** pour les voir :

```bash
vendor/bin/laminas-development-mode enable     # status | enable | disable
```

Cela charge `config/development.config.php`, désactive les caches de config/modules et fixe
`error_reporting(E_ALL)`. Les warnings PHP sont aussi remontés dans l'UI par
`MelisCorePhpWarningListener`. Le reporting/affichage des erreurs peut aussi être piloté par la
config Melis sous `/meliscore/datas/errors`.

::: warning Page blanche, HTTP 200, sans erreur ?
Melis utilise l'output buffering ; une erreur fatale au bootstrap/rendu peut produire un **200
vide**. Pour voir l'exception avalée, attachez temporairement un listener à
`MvcEvent::EVENT_DISPATCH_ERROR` / `EVENT_RENDER_ERROR` dans `public/index.php` (entourez
`Application::init()` d'un try/catch et affichez le param `exception`), ou activez le mode
développement.
:::

## Cache

Le cache périmé est la cause n°1 de « j'ai changé la config mais rien ne change ». Les caches vivent
sous `cache/` :

```
cache/meliscore_platform_cache-*   # zones backoffice / config plateforme
cache/meliscms_page-*              # pages CMS rendues
cache/config/                      # config Laminas fusionnée (si activée)
```

Videz-les en supprimant les dossiers concernés, ou via l'API
`MelisCoreCacheSystemService::deleteCacheByPrefix('*', 'meliscore_platform_cache')`. Melis vide aussi
les caches automatiquement lors des changements de modules et de droits. Après avoir édité
`config/melis.module.load.php` ou un `app.*.php`, **videz `cache/melis*` et rechargez**.

## Pièges courants

### Un module n'apparaît pas
| Cause | Solution |
| --- | --- |
| Pas dans la liste de chargement | Ajoutez-le à `config/melis.module.load.php`. |
| Cache périmé | Videz `cache/melis*` et rechargez. |
| Chemin non mappé | Vérifiez qu'il est dans le `config/melis.modules.path.php` généré (régénéré par `MelisAssetManager`). |

### Un tool existe mais n'est pas visible / « You don't have access to this tool »
| Cause | Solution |
| --- | --- |
| L'utilisateur n'a pas les droits | Le menu gauche est gardé par `melis_core_user.usr_rights` (liste blanche XML). Accordez le `*_toolstree_section` du tool via la **Gestion des accès**, ou une migration (voir `flyway/sql/V3__add_melisai_rights.sql`). |
| Droits cachés en session | Les droits sont chargés à la connexion et rafraîchis périodiquement par `MelisCoreCheckUserRightsListener` — **déconnectez/reconnectez-vous** après les avoir changés. |
| Utilisateur inactif | `usr_status` doit valoir `1`. |

> Des `usr_rights` **vides** = accès total (`isAccessible()` renvoie true sur du vide) — mais pour
> un utilisateur normal avec une liste blanche explicite, une section manquante est masquée.

### Erreurs de connexion base de données
| Cause | Solution |
| --- | --- |
| Fichier plateforme manquant | `config/autoload/platforms/<MELIS_PLATFORM>.php` doit exister et matcher la variable `MELIS_PLATFORM`. |
| Mauvais identifiants | Vérifiez les variables `MYSQL_*` consommées par le fichier plateforme. |

### Assets (CSS/JS) en 404
| Cause | Solution |
| --- | --- |
| Module non mappé | Vérifiez `config/melis.modules.path.php`. |
| Bundles non construits | Reconstruisez les assets (build Webpack / `vendor/bin/phing`). |

### Les traductions affichent la clé brute `tr_…`
| Cause | Solution |
| --- | --- |
| Locale non définie | La locale active vient de la session (`melis-lang-locale`). |
| Fichier manquant | Ajoutez `language/<locale>.interface.php` ; `en_EN` est le fallback. |

## Schéma de base (dbdeploy & flyway)

- **dbdeploy** (`MelisDbDeploy`) s'exécute au `composer update` (hook post-update) pour appliquer les
  deltas SQL numérotés de chaque module, tracés dans la table `changelog`.
- **flyway** applique les migrations projet dans `flyway/sql/`
  (`flyway -configFiles=flyway/conf/flyway.conf migrate`).

## CLI & outils de build

```bash
vendor/bin/laminas-development-mode {status|enable|disable}   # mode dev
flyway -configFiles=flyway/conf/flyway.conf {migrate|info|repair}   # migrations DB
vendor/bin/phing                                             # build assets/bundles
```

`composer update` déclenche les hooks Melis (déploiement des modules + dbdeploy) via le
`post-update-cmd` de `composer.json`.

## Où regarder

| Sujet | Chemin |
| --- | --- |
| Template mode dev | `config/development.config.php.dist` |
| API de cache | `vendor/melisplatform/melis-core/src/Service/MelisCoreCacheSystemService.php` |
| Rafraîchissement des droits | `vendor/melisplatform/melis-core/src/Listener/MelisCoreCheckUserRightsListener.php` |
| Warnings PHP | `vendor/melisplatform/melis-core/src/Listener/MelisCorePhpWarningListener.php` |
| Assemblage des modules | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| Config flyway | `flyway/conf/flyway.conf`, migrations dans `flyway/sql/` |
