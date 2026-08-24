# MelisReactOverride

> Infrastructure du back-office React : affiche les outils legacy dans le shell `/melis-react` et sert la SPA React. Package `melisplatform/melis-react-override`.

## Objectif

MelisReactOverride est un **module d'infrastructure du back-office React** — ce n'est pas un outil. Il ne fournit aucune
brique, aucune page React, aucun point d'entrée `react-api` et aucun écran propre. Il apporte les deux
mécanismes de plomberie qui permettent au back-office React (`/melis-react`) de fonctionner en parallèle du
`/melis` legacy :

1. **Mécanisme d'iframe pour les outils legacy** — tout outil legacy jQuery/AJAX qui n'a pas de page React
   dédiée est rendu comme une page HTML autonome (`/melis/react-tool-page?key=<melisKey>`) et affiché
   dans le shell React à l'intérieur d'une `<iframe>`. L'outil dans le cadre a exactement la même apparence
   et le même comportement qu'en accès direct `/melis` — ses propres DataTables, formulaires, modales, onglets,
   boutons de sauvegarde et notifications natives (toasts gritter, modales de validation champ par champ).
2. **Route de repli SPA** — il sert le shell React `index.html` pour `/melis-react` et chaque lien profond
   côté client qui en découle, et rend cette route (plus quelques points d'entrée de démarrage en lecture seule)
   publique.

Vous ne naviguez jamais *vers* ce module. Règle générale : si vous êtes dans `/melis-react` en train de regarder
un écran d'outil à l'ancienne (Bootstrap classique), vous regardez une page produite par
MelisReactOverride.

## Activation

C'est un pur module MVC Laminas côté serveur chargé via `application.config.php` (`module_paths` +
`modules`) — `src/Module.php` autoload `MelisReactOverride\*` depuis `src/` via
`StandardAutoloader`. Catégorie `core`.

Il **surcharge le contrôleur `PluginView` de MelisCore** par une version React-aware via un
alias `controllers.invokables`. Comme ce module se charge *après* melis-core, l'alias l'emporte lors du
merge de configuration Laminas :

```php
'controllers' => [
    'invokables' => [
        'MelisCore\Controller\PluginView'   => \MelisReactOverride\Controller\PluginViewController::class,
        'MelisReactOverride\Controller\Spa' => \MelisReactOverride\Controller\SpaController::class,
    ],
],
```

## En un coup d'œil

| Propriété | Valeur |
| --- | --- |
| Nom du module | `MelisReactOverride` |
| Package | `melisplatform/melis-react-override` |
| Catégorie | `core` |
| Brique / `ui-react/` / `react-api.php` | **aucun** (infrastructure uniquement) |
| Contrôleurs | `PluginViewController` (aliasé sur `MelisCore\Controller\PluginView`), `SpaController` |
| Services | `PlatformAssetsService`, `LegacyWidgetCssService` |
| Point d'extension | `PluginViewToolPageExtensionInterface` (hook `toolpage_extensions`) |

## Routes

Toutes les routes d'outil/iframe sont des routes enfants de `melis-backoffice`, elles vivent donc sous `/melis`. La
route SPA est une route regex de premier niveau.

| Nom de la route | URL | Action | Objectif |
| --- | --- | --- | --- |
| `melis-backoffice/react-tool-page` | `/melis/react-tool-page` | `toolPage` | **Mécanisme central.** Rend une zone d'outil legacy comme une page HTML autonome pour une iframe. Prend `?key=<melisKey>` (et `?idPage=<id>` pour l'éditeur de page CMS). |
| `melis-backoffice/react-dashboard-plugin` | `/melis/react-dashboard-plugin` | `dashboardPluginPage` | Un seul plugin de tableau de bord legacy sous forme de page autonome minimale. |
| `melis-backoffice/react-dashboard-plugin-config` | `/melis/react-dashboard-plugin-config` | `dashboardPluginConfigPage` | Le formulaire de configuration d'un plugin de tableau de bord (bouton engrenage) en HTML autonome. |
| `melis-backoffice/react-dashboard-plugin-config-data` | `/melis/react-dashboard-plugin-config-data` | `dashboardPluginConfigData` | JSON : le formulaire de configuration sous forme de données (onglets + champs typés + valeurs) pour que React le rende nativement. |
| `melis-backoffice/react-dashboard-plugin-config-save` | `/melis/react-dashboard-plugin-config-save` | `dashboardPluginConfigSave` | POST : valide + persiste la configuration d'un plugin de tableau de bord. |
| `melis-backoffice/react-dashboard-plugin-content` | `/melis/react-dashboard-plugin-content` | `dashboardPluginContent` | JSON : HTML + scripts + jsCallbacks pour injection directe dans le DOM (sans iframe). |
| `melis-backoffice/react-platform-bundle` | `/melis/react-platform-bundle` | `platformBundle` | Sert le bundle d'assets concaténé avec le bon type MIME (remplace les `/melis/get-{css,js}-bundles` de MelisCore, qui répondent un `text/html` vide quand le bundle est absent). |
| `melis-backoffice/react-legacy-widget-css` | `/melis/react-legacy-widget-css` | `legacyWidgetCss` | Feuilles de style du back-office legacy, chaque règle étant scopée sous `.melis-legacy-widget`. |
| `meliscore-melis-react-spa` | `/melis-react`, `/melis-react/*` | `spa` | **Repli SPA.** Sert le shell React `index.html`. Route regex, `priority => 1000`. |

### Routes publiques (`excluded_routes`)

Le module ajoute à la fin du `plugins.meliscore.datas.excluded_routes` de MelisCore (les tableaux numériques
fusionnent par ajout) pour que `MelisCore\Module::checkIdentity()` les laisse passer sans rediriger vers
`/melis/login` :

- `meliscore-melis-react-spa` — le shell est public car l'application React gère sa propre
  authentification (son propre écran de connexion).
- `melis-backoffice/react-platform-bundle` — pour qu'une session expirée ne redirige pas une feuille de style
  vers une page de connexion HTML (l'erreur MIME exacte que cette route corrige).
- `melis-backoffice/melis-react-api/platformscheme-react-get` — le branding du panneau de connexion, lu avant
  l'authentification (GET uniquement).
- `melis-backoffice/melis-react-api/langs` — la liste des langues du back-office que la SPA charge au démarrage,
  y compris sur l'écran de connexion (lecture seule).

> Les deux dernières sont des routes `melis-react-api` (appartenant à **MelisReactApi**) ; MelisReactOverride
> les rend seulement publiques, il ne les définit pas.

## Le mécanisme d'iframe — `toolPageAction()` → `buildToolPage()`

`PluginViewController::toolPageAction()` résout une melisKey, rend sa zone et transmet le HTML
à `buildToolPage()` pour assembler un document autonome. Déroulement :

1. **Garde d'authentification** — `denyIfUnauthenticated()` s'exécute en premier (cette page n'est *pas* publique).
2. **Résoudre melisKey → chemin appConfig** — `MelisCoreConfig->getMelisKeys()` mappe `?key=` vers un
   chemin de configuration applicative ; le dernier segment est la clé de vue.
3. **Forcer le mode XHR** — ajoute `X-Requested-With: XMLHttpRequest` pour que `generateRec()` rende les zones
   avec `follow_regular_rendering:false` de la même manière que le chemin AJAX classique (sinon ces
   outils retombent sur le front et affichent un « 404 MelisDemoCms »).
4. **Épingler l'identifiant de session PHP** — snapshot avant le rendu, restauration après (certains outils legacy
   font tourner l'identifiant de session pendant le rendu — sans conséquence dans `/melis`, fatal ici).
5. **Rendre la zone** avec `generateRec()` + `renderViewRec()`, en capturant toute sortie parasite qu'une
   zone `echo`erait vers le flux (conservée hors du markup sous forme de commentaire HTML pour diagnostic).
6. **Exécuter les extensions `adjustToolHtml()`** (`toolpage_extensions`) sur le HTML rendu.
7. **Construire les assets de la plateforme** via `PlatformAssetsService::build()` et injecter les
   `ressources` JS/CSS propres au module.
8. **Exécuter les extensions `adjustToolAssets()`** (peuvent déplacer certains JS de module vers le bucket `<head>` et
   retourner `skipJsRoots` pour que la boucle générique ne les charge pas en double).
9. **Assembler** `buildToolPage($html, $jsCallBacks, $assets, $zoneId, $key)` et retourner en
   `text/html` avec `X-Frame-Options: SAMEORIGIN`.

### Pièges résolus par `buildToolPage()`

- **Neutraliser la garde « Remove Envato Frame » de bundle.js** — dans une iframe sandboxée, la garde
  lève une `SecurityError` qui tue bundle.js. La page capture le vrai parent
  (`window.__melisRealParent`) puis redéfinit `window.parent`/`window.top` pour retourner `window`.
- **Charger `melisDataTable.js` séparément** — déclaré dans `app.interface.php` mais absent de
  `bundle.js` ; ajouté à la file JS (expose `window.melisDataTable`).
- **Shim `Proxy` global** — pour les objets définis uniquement dans le `$(function(){…})` de bundle.js et pas
  encore disponibles quand les scripts synchrones du corps d'un outil sont parsés, un `Proxy` no-op évite les
  erreurs précoces.
- **Envelopper les jsCallbacks dans try/catch** — un callback dont la dépendance n'est pas chargée en mode
  autonome ne cassera pas la page.
- **Injecter les `ressources` JS/CSS du module** — le `bundle.js` central ne contient que les outils
  MelisCore ; les outils de module fournissent leurs propres fichiers (ex. `news.tool.js` → `window.initNewsList`). Le
  contrôleur collecte chaque racine dont l'outil a besoin — sa propre racine de plugin, les racines atteintes via des
  liens `type` (parcourues récursivement, avec garde contre les cycles) et les nœuds de module `forward`, plus quelques
  racines supplémentaires pour des éditeurs composites connus (ex. `meliscms_page`), le tout conditionné pour que les
  modules inactifs ne chargent rien.
- **Ordre des JS en tête vs en fin de body** — les JS de la plateforme se chargent dans le `<head>` ; les
  `ressources` de module se chargent dans le `<body>` après la barre d'onglets mais avant le HTML de l'outil, à l'image
  du BO classique.
- **Shell d'onglets de l'éditeur** — inclut les ancres d'onglets classiques (`#melis-id-nav-bar-tabs` masqué,
  `#melis-id-body-content-load`, `activeTabId` global) pour que les flux d'édition classiques fonctionnent.
- **`<base href="/">`** pour que les URLs AJAX relatives des outils se résolvent depuis la racine du site.
- **Point de montage des modales `#melis-modals-container`** plus un watcher d'auto-réparation pour les backdrops
  orphelins.
- **Correctif d'export** — relie `melisCoreTool.exportData()` à un clic sur une ancre dans le cadre (le popup
  `window.open` legacy ne déclenche jamais le téléchargement dans une iframe sandboxée).
- **Pont d'onglets d'outil & postMessage du résultat d'outil** — la barre d'onglets masquée est répliquée vers l'hôte via
  `postMessage({ __melisToolTabs, … })` ; un message `{ __melisToolResult, url, data }` est posté
  après une sauvegarde JSON pour que l'hôte puisse réagir de façon structurelle. Aucune notification visible n'est
  répliquée — les outils legacy conservent leur propre retour natif.

## Assets de la plateforme — `PlatformAssetsService`

`PlatformAssetsService::build($sm)` retourne `['css' => …, 'js' => …, 'inline' => …]`, la liste d'assets
de la plateforme avec laquelle chaque iframe d'outil démarre :

- **CSS** — tous les fichiers `bundle.css` des modules (chargés en parallèle), précédés des Google Fonts et de
  `/assets/css/schemes.css`, filtrés sur les fichiers présents sur le disque.
- **File JS** (l'ordre compte) — `get-translations?locale=…`, `MelisCore/build/js/bundle.js`, puis
  les extras non-bundlés : `melisDataTable.js`, `loader.js`, `findpage.tool.js`,
  `bootstrap-tagsinput.js`, `typeahead.bundle.js`, `moment/fr.js`, `melis_tinymce.js`.
- **Globales inline** — `basePath`, `primaryColor`, … lues depuis le scheme de plateforme actif
  (`MelisCorePlatformSchemeService`), avec les couleurs Melis par défaut en repli.
- **Mise en cache / auto-réparation du bundle** — l'appel coûteux `MelisAssetManagerWebPack->getAssets(true)`
  est mis en cache (fichier temporaire, TTL 600 s + mémo en cours de processus) ; si `etc/bundles/` a été effacé par
  l'outil Modules, il est régénéré sous un verrou mono-écrivain, ou la route concaténée est remplacée
  par `/melis/react-platform-bundle`.
- **`bust($url)`** ajoute `?v=<mtime>` aux URLs d'assets locaux.

`LegacyWidgetCssService` alimente la route `react-legacy-widget-css` — le CSS du BO legacy scopé sous
`.melis-legacy-widget` pour qu'il ne puisse pas fuir sur le shell React (utilisé par les widgets legacy non-iframe
injectés directement dans le DOM React, ex. le contenu des plugins de tableau de bord).

## Repli SPA — `SpaController`

`SpaController::spaAction()` sert le shell React pour `/melis-react` et chaque lien profond côté
client :

- Résout `index.html` via `$_SERVER['DOCUMENT_ROOT']`, en lisant
  `…/vendor/melisplatform/melis-core/public/ui-react/index.html` (le build React vit dans le
  `public/` de melis-core, servi à `/MelisCore/ui-react/`). Fonctionne quel que soit l'emplacement de ce module
  sur le disque.
- Retourne `404` si le shell est absent ; sinon retourne le fichier en
  `text/html; charset=utf-8` avec `Cache-Control: no-cache, no-store, must-revalidate` (le shell
  n'est jamais mis en cache ; les assets référencés sont hashés par contenu).
- Les fichiers réels (`index.html` racine, assets hashés) sont streamés plus tôt par MelisAssetManager au
  démarrage, donc seules les routes virtuelles côté client (ex. `/melis-react/news/5`) retombent ici.

La route regex `meliscore-melis-react-spa` (`priority => 1000`) l'emporte sur la route front attrape-tout de
MelisFront. Sa regex `'/melis-react(?<spa>/[a-zA-Z0-9_\-/~.]*)?'` inclut `~` (séparateur d'id
composite) et `.` pour que ces liens profonds se résolvent vers la SPA lors d'un rechargement complet de la page.

## Point d'extension — le hook `toolpage_extensions`

Les particularités propres à un outil vivent dans le module **propriétaire**, pas en dur ici. Un module enregistre un
nom de service sous `config('melis_react_override')['toolpage_extensions'][]` et implémente
`MelisReactOverride\Controller\PluginViewToolPageExtensionInterface` :

```php
interface PluginViewToolPageExtensionInterface
{
    // Adjust the rendered zone HTML for a melisKey before assembly (return $html unchanged
    // for keys the extension doesn't care about).
    public function adjustToolHtml(string $key, string $html, array $jsCallBacks, PluginViewController $controller): string;

    // Adjust the platform asset bundle. Return ['assets' => array, 'skipJsRoots' => array<string, true>];
    // 'skipJsRoots' lists roots the extension already injected so the generic loop must NOT re-add them.
    public function adjustToolAssets(string $key, string $html, array $assets, PluginViewController $controller): array;
}
```

`PluginViewController::toolPageExtensions()` résout les noms enregistrés, **ignore silencieusement** les
noms qui ne sont pas des services enregistrés ou qui n'implémentent pas l'interface (une extension est donc entièrement
optionnelle — module non installé → no-op), met la liste en cache, et appelle `adjustToolHtml()` (étape 6)
et `adjustToolAssets()` (étape 8) pour chacun.

> **Pourquoi un tableau de config, et non une surcharge de contrôleur :** les contributions de différents modules
> s'accumulent simplement quel que soit l'ordre de chargement (contrairement à un alias de contrôleur, où seul le
> module fusionné en dernier l'emporte).

**Exemple de consommateur.** MelisAICommunityExtensions enregistre
`MelisAICommunityExtensions\Controller\React\PluginViewToolPageExtension` sous
`melis_react_override.toolpage_extensions` pour injecter ses `tool.js` / `style.css` dans les pages d'outils
legacy servies dans la vue React « Old ».

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Routes, surcharge de contrôleur, `excluded_routes` | `config/module.config.php` |
| Bootstrap du module + autoloader | `src/Module.php` |
| Mécanisme d'iframe, actions de tableau de bord, extensions | `src/Controller/PluginViewController.php` |
| Service du shell SPA | `src/Controller/SpaController.php` |
| Contrat `toolpage_extensions` | `src/Controller/PluginViewToolPageExtensionInterface.php` |
| Build des assets de plateforme + cache du bundle | `src/Service/PlatformAssetsService.php` |
| CSS du BO legacy scopé | `src/Service/LegacyWidgetCssService.php` |

Voir aussi : [melis-core](/legacy/reference/modules/melis-core)

> **Pas d'UI, pas de captures d'écran.** MelisReactOverride est une infrastructure sans interface propre —
> ce qui apparaît à l'écran est l'*outil legacy* qu'il rend ou le *shell React* qu'il sert, tous deux
> documentés dans leurs propres modules.
