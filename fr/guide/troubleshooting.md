# Dépannage & exploitation

Un guide de terrain pour les problèmes que vous rencontrerez vraiment, avec la cause et la solution.
Quand quelque chose « n'apparaît pas », la réponse est presque toujours **modules / droits / cache**.

En v6, le back-office est le **shell React sur `/melis-react`**, mais le framework, les modules et la
config sous-jacents sont inchangés — la plupart des correctifs ici restent donc côté serveur. Lorsqu'un
tool n'a pas de page React native, le shell rend le tool classique dans une iframe
(`/melis/react-tool-page?key=<melisKey>`), et les tools « brick » natifs React embarquent une bascule
**Nouveau (React) / Ancien (iframe)** vers ce même écran classique. Savoir quelle couche vous regardez
est souvent la première étape du diagnostic.

## Activez d'abord les erreurs

Par défaut, Melis est discret sur les erreurs. Activez le **mode développement** pour les voir :

```bash
vendor/bin/laminas-development-mode enable     # status | enable | disable
```

Cela charge `config/development.config.php`, désactive les caches de config/modules et fixe
`error_reporting(E_ALL)`. Les warnings PHP sont aussi remontés par
`MelisCorePhpWarningListener`. Le reporting/affichage des erreurs peut aussi être piloté par la
config Melis sous `/meliscore/datas/errors`.

Notez que les endpoints de l'API React répondent en JSON, pas en HTML : un appel de boot en échec
renvoie `{ success: false, error: … }` (par ex. `{ success:false, error:'Unauthenticated' }` avec un
HTTP 401), donc lisez l'onglet réseau, pas seulement la page. Un tool legacy dans l'iframe affiche
toujours ses propres erreurs natives (toasts gritter, modales de validation par champ) exactement
comme sous `/melis`.

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

Depuis le back-office, vous pouvez vider les caches via le tool **Cache** (son écran React reprend les
mêmes onglets que le tool classique). Voir [MelisCacheInternal](/fr/reference/modules/melis-cache-internal).

Le shell React possède sa propre couche de cache, à connaître quand les choses semblent périmées :

- Le **bundle de bricks** concaténé (`/melis/react-api/bricks-bundle.js?v=<sig>`) est servi en
  immutable 1 an ; sa signature `?v=` (nom+mtime+taille de chaque brick) change automatiquement
  quand les fichiers d'un brick changent, donc un **rechargement forcé** récupère le nouveau bundle.
- Le **shell SPA** (`index.html`) est servi en `no-cache`, mais les assets JS/CSS hashés qu'il
  référence sont content-hashés et mis en cache — là encore, un rechargement forcé est le remède.
- Si une iframe de tool se charge avec un style cassé ou une DataTable vide après un changement de
  **Modules**, les bundles d'assets plateforme sous `etc/bundles/` ont peut-être été effacés ; ils
  s'auto-réparent (régénérés au prochain rendu de page de tool), mais vous pouvez forcer la chose en
  rechargeant le tool.

## Pièges courants

### Un module n'apparaît pas
| Cause | Solution |
| --- | --- |
| Pas dans la liste de chargement | Ajoutez-le à `config/melis.module.load.php`. |
| Cache périmé | Videz `cache/melis*` et rechargez. |
| Chemin non mappé | Vérifiez qu'il est dans le `config/melis.modules.path.php` généré (régénéré par `MelisAssetManager`). |

### Un tool existe mais n'est pas dans le menu gauche / « You don't have access to this tool »
Le menu gauche React (`GET /melis/react-api/menu`) est l'arbre de navigation **filtré par les droits**
— la même liste blanche XML `melis_core_user.usr_rights` qu'avant, simplement consommée par le shell.

| Cause | Solution |
| --- | --- |
| L'utilisateur n'a pas les droits | Accordez le `*_toolstree_section` du tool dans **Utilisateurs → Droits**, ou via une migration (voir `flyway/sql/V3__add_melisai_rights.sql`). |
| Droits cachés en session | Les droits sont chargés à la connexion et rafraîchis périodiquement par `MelisCoreCheckUserRightsListener` — **déconnectez/reconnectez-vous** après les avoir changés. |
| Utilisateur inactif | `usr_status` doit valoir `1`. |
| Module du brick inactif | Un tool natif React (brick) apparaît **si et seulement si** son module est actif — le shell découvre les bricks via `GET /melis/react-api/react-modules`. Activez le module. |

> Des `usr_rights` **vides** = accès total (`isAccessible()` renvoie true sur du vide) — mais pour
> un utilisateur normal avec une liste blanche explicite, une section manquante est masquée.

### Un bouton/onglet de tool est interdit alors que je peux ouvrir le tool (HTTP 403)
La v6 ajoute des **droits avancés** (« capabilities ») *à l'intérieur* d'un tool déjà autorisé — les
cases à cocher fines Lister / Créer / Éditer / Supprimer / par onglet dans **Utilisateurs → Droits**.

| Cause | Solution |
| --- | --- |
| Capability refusée | Le contrôleur du tool a appelé `denyUnlessCan(<cap>)` et votre XML de droits refuse cette capability. Retirez le refus dans **Utilisateurs → Droits** (matrice des droits avancés). |
| Cachée en session | Les capabilities arrivent dans l'appel de boot `GET /melis/react-api/me` (`data.capabilities`) — **déconnectez/reconnectez-vous** après avoir édité les droits. |

> Les capabilities sont **autorisées par défaut** : un tool sans déclaration, ou une cap non refusée,
> reste pleinement utilisable ; les **admins passent outre** entièrement. Les refus vivent dans une
> section dédiée `<meliscore_tool_capabilities>` du XML de droits, donc ils n'affectent pas le BO
> classique.

### Un tool legacy se charge vide / ses boutons ne font rien dans le shell React
Quand un tool n'a pas de page React native, il est rendu dans une iframe via
`/melis/react-tool-page?key=<melisKey>`. Une DataTable vide ou un bouton mort là-dedans est presque
toujours une **ressource de module manquante** (son propre `*.tool.js`/CSS non injecté).

| Cause | Solution |
| --- | --- |
| Ressource de module non chargée | La page de tool injecte les `ressources` de chaque module ; un onglet/bouton nouvellement contribué qui embarque du JS dont la page n'a pas connaissance nécessite l'enregistrement de sa racine de plugin (ou un hook `toolpage_extensions` — voir [Créer un tool](/fr/guide/create-a-tool)). |
| Comparer avec `/melis` | Ouvrez le même tool directement sur `/melis` (ou via la bascule **Ancien** du tool). S'il est cassé là aussi, le problème est dans le tool lui-même, pas dans le cadre React. |

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
| Feuille de style répondue en HTML | Une session expirée redirigeait autrefois une requête de bundle vers la page de login HTML (le navigateur rejette le MIME) ; la v6 sert le bundle plateforme sur `/melis/react-platform-bundle` avec le bon type et le garde public — un rechargement forcé lève le rejet périmé. |

### Les traductions affichent la clé brute `tr_…`
| Cause | Solution |
| --- | --- |
| Locale non définie | La locale active vient de la session (`melis-lang-locale`) ; le sélecteur de langue de l'en-tête React l'écrit (`GET /melis/react-api/langs`). |
| Fichier manquant | Ajoutez `language/<locale>.interface.php` ; `en_EN` est le fallback. |

## Schéma de base (dbdeploy & flyway)

- **dbdeploy** ([MelisDbDeploy](/fr/reference/modules/melis-dbdeploy)) s'exécute au `composer update`
  (hook post-update) pour appliquer les deltas SQL numérotés de chaque module, tracés dans la table
  `changelog`.
- **flyway** ([MelisFlyway](/fr/reference/modules/melis-flyway)) applique les migrations projet dans
  `flyway/sql/` (`flyway -configFiles=flyway/conf/flyway.conf migrate`).

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
| API React (menu / me / capabilities) | `vendor/melisplatform/melis-react-api/src/Controller/MelisReactApiController.php` |
| Shell React / pages de tool en iframe | `vendor/melisplatform/melis-react-override/src/Controller/PluginViewController.php` |
| Config flyway | `flyway/conf/flyway.conf`, migrations dans `flyway/sql/` |
