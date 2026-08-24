# MelisReactApi

> Épine dorsale JSON du back-office React (`/melis-react`) : amorce le shell, sert les données de menu/utilisateur/assets/découverte/tableau de bord et héberge le résolveur de capacités. Package `melisplatform/melis-react-api`.

## Objectif

MelisReactApi est une **infrastructure, pas un outil**. Il ne dessine aucune interface, ne
livre aucune brique et n'ajoute aucune entrée de menu latéral. Il expose les endpoints JSON
génériques `/melis/react-api/…` que le shell React (servi par MelisReactOverride sur
`/melis-react`) appelle à l'amorçage et lors de la navigation, et il héberge le
**résolveur de capacités** (`Capabilities` + `CapabilityGuardTrait`) que les contrôleurs
d'outil de chaque module réutilisent pour filtrer leurs « droits avancés ».

Tout ce que le shell affiche qui n'est pas l'écran propre à un outil spécifique provient
d'ici : le menu de gauche (filtré par les droits), l'utilisateur/avatar de l'en-tête et le
sélecteur de langue, les tuiles et KPI du tableau de bord, la découverte des briques
modulaires et la matrice des droits avancés Utilisateurs → Droits. Les endpoints, routes et
déclarations de capacités propres aux outils individuels résident dans **leurs propres**
modules (par ex. `/users`, `/roles` sont déclarés dans MelisCore / MelisSmallBusiness), pas
ici.

Il n'y a **aucun écran React ni aucune capture d'écran** pour ce module — les sections
ci-dessous décrivent le contrat d'API à utiliser pour dialoguer avec le back-office React.

## L'activer

MelisReactApi est un module cœur du back-office React. Il n'est **pas** installé via composer
dans le volume vendor Docker ; il est chargé via `config/application.config.php` `module_paths`
(branche `melis-react`), et `src/Module.php` charge automatiquement ses classes via
`StandardAutoloader`. Il fonctionne de pair avec **MelisReactOverride** (le mécanisme
iframe/outil + la route du shell SPA) et avec **melis-core/ui-react** (l'application React qui
consomme cette API — voir ses clients `src/lib/*-api.ts`).

Il déclare ses routes directement dans `config/module.config.php` (pas de
`config/react-api.php`) et ne déclare aucune capacité propre (c'est le moteur qui *lit* les
déclarations des autres modules).

## Présence React en un coup d'œil

| Propriété | Valeur |
| --- | --- |
| Brique / manifeste | **aucune** — ne livre aucun `public/ui-react/brick.manifest.json` |
| Source `ui-react/` | **aucune** — pas de projet Vite, pas de composants React |
| Contrôleur | `MelisReactApi\Controller\MelisReactApiController` (alias invokable `MelisReactApi\Controller\MelisReactApi`) |
| Route de base | `melis-backoffice` → `react-api` (soit `/melis/react-api/…`) |
| Authentification | `isAuthenticated()` (MelisCoreAuth) par action, **sauf** `/langs` (public, chargé sur l'écran de connexion) |
| Contrat de réponse | `{ success: bool, data: T, error?: string }` (JSON brut, sans layout) |

Chaque action retourne une `Response` JSON brute via la méthode héritée `jsonResponse()`, de
sorte que Laminas n'enveloppe jamais de layout autour. Les actions en lecture seule appellent
`releaseSessionLock()` tôt afin que les requêtes d'amorçage concurrentes partageant le cookie
de session ne se sérialisent pas.

## Endpoints génériques

Tous sous `/melis/react-api/…`. Douze endpoints génériques, tous mappés sur
`MelisReactApiController`. Chaque réponse est `{ success, data, error? }` (401 lorsque le
garde `isAuthenticated()` échoue, sauf `/langs`).

| Méthode + chemin | Action | Forme de `data` |
| --- | --- | --- |
| `GET /me` | `meAction` | `{ id, name, login, email, picture, isAdmin, capabilities }` — `capabilities` = map `melisKey → string[]` des caps autorisées (admin ⇒ tout). |
| `GET /menu` | `menuAction` | `NavNode[]` — l'arbre de navigation filtré par les droits. `?full=1` retourne l'arbre **non filtré** (éditeur de droits uniquement ; requiert `canAccess('meliscore_tool_user')`). |
| `GET /langs` | `langsAction` | `{ current: { id, locale }, langs: [{ id, locale, short, label }] }` — **public**. |
| `GET /assets` | `assetsAction` | URLs CSS/JS + variables globales JS inline pour amorcer les iframes d'outil (délègue à `MelisReactOverride\Service\PlatformAssetsService::build()`). |
| `GET /react-modules` | `reactModulesAction` | `{ data: BrickDef[], bundle: { url } }` — les briques des modules actifs ; `bundle.url` = le JS concaténé. |
| `GET /bricks-bundle.js` | `bricksBundleAction` | **pas du JSON** — l'IIFE de chaque brique active concaténé en une seule réponse JavaScript à cache immuable. |
| `GET /dashboard/bubbles` | `dashboardBubblesAction` | compteurs `{ news, updates, notifications:{count,items}, messages }` (dégradent à 0, jamais 404). |
| `GET /dashboard/stats` | `dashboardStatsAction` | `{ kpis:{ users, sites, pages, languages }, activity:[{ id, name, loginDate }] }`. |
| `GET /dashboard/legacy-plugins` | `legacyDashboardPluginsAction` | `[{ pluginName, title, icon, section, w, h }]` — plugins de tableau de bord legacy en tant que widgets iframe. |
| `GET \| POST /dashboard/layout` | `dashboardLayoutAction` | GET → tuiles enregistrées `[{ pluginName, pluginId, x, y, w, h }]` ; POST → même JSON, enregistré dans `melis_core_dashboards`. |
| `GET /rights/dashboard-plugins` | `rightsDashboardPluginsAction` | `[{ key, title, module }]` — liste de référence des plugins de tableau de bord pour l'éditeur de droits (`?userId=`). |
| `GET /rights/capabilities` | `rightsCapabilitiesAction` | map `melisKey → arbre de capacités` **déclaré** par les modules, libellés `tr_*` traduits dans la locale de session. |

**Ensemble d'amorçage :** `/me`, `/menu`, `/langs`, `/assets`, `/react-modules`
(+ `/bricks-bundle.js`). Les endpoints `/dashboard/*` et `/rights/*` alimentent le tableau de
bord et l'éditeur Utilisateurs → Droits.

Les endpoints de données propres à un outil ne sont **pas** ici : `/melis/react-api/users…`,
`/users/stats`, `/roles` sont déclarés dans **MelisCore** ; `/roles-list`,
`/roles/save|stats|:id`, `/workflow/roles` dans **MelisSmallBusiness** ; les routes IA dans
**MelisAI**. Les clients qui appellent cet ensemble générique résident dans
`melis-core/ui-react/src/lib/melis-api.ts`.

Exemple de fetch réel — l'appel d'amorçage `/me` du shell :

```ts
// mirrors melis-core/ui-react/src/lib/melis-api.ts
const res = await fetch('/melis/react-api/me', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
})
const json = await res.json()                    // { success, data, error? }
if (!json.success) throw new Error(json.error)   // 401 → { success:false, error:'Unauthenticated' }
const { name, isAdmin, capabilities } = json.data
// capabilities: Record<melisKey, string[]>
// e.g. { melis_core_announcement_tool: ['list','create','edit'] }
```

## Capacités — le résolveur

Voici la substance que MelisReactApi fournit aux *autres* modules : le système de « droits
avancés » qui filtre les **composants internes** d'un outil déjà autorisé (liste / création /
édition / suppression / onglets imbriqués), *subordonné à* la vérification d'accès à l'outil
(`MelisCoreRights::canAccess`, inchangée).

**Déclaration (dans chaque module, pas ici).** Un module déclare, par outil `melisKey`, les
capacités qui existent via la clé de config fusionnée `melisReactToolCapabilities`
(`config/react.capabilities.php`, fusionnée dans son `Module::getConfig()`) :

```php
// <module>/config/react.capabilities.php  (declared BY the tool's module)
return [
  'melisReactToolCapabilities' => [
    'melis_core_announcement_tool' => ['list', 'create', 'edit', 'delete'],
    // or a TREE for nested tabs with their own actions:
    // 'some_tool' => ['actions' => ['list'], 'tabs' => [['key' => 'variants', 'actions' => ['list','create']]]],
  ],
];
```

**Résolveur — `MelisReactApi\Service\Capabilities`** (tout en statique ; `const CONFIG_KEY =
'melisReactToolCapabilities'`, `const SECTION = 'meliscore_tool_capabilities'`) :

| Méthode | Rôle |
| --- | --- |
| `declared($appConfig)` | La map brute déclarée (l'éditeur de droits la rend). |
| `flatten($node)` | Aplatit une liste simple OU un arbre `{ actions, tabs }` en chaînes pointées (par ex. `variants.list`). |
| `deniedFor($rightsXml, $toolKey)` | La liste de refus lue dans le XML des droits utilisateur/rôle. |
| `isAllowed($appConfig, $rightsXml, $toolKey, $cap)` | **Autorisé par défaut** — autorisé sauf si la cap est à la fois déclarée *et* dans la liste de refus. |
| `allowedForUser($appConfig, $rightsXml)` | La map `melisKey → allowedCaps[]` retournée dans `/me` (`$rightsXml = null`, par ex. admin ⇒ tout). |

**Stockage.** Les refus résident dans une section dédiée du XML des droits utilisateur/rôle,
séparée de la liste de refus legacy afin que le BO classique l'ignore :

```xml
<meliscore_tool_capabilities>
  <tool key="melis_core_announcement_tool"><deny>delete</deny></tool>
</meliscore_tool_capabilities>
```

La préservation de cette section lors d'une sauvegarde **legacy** est assurée par les modules
concernés (MelisCore pour USER, MelisSmallBusiness pour ROLE).

**Garde — `MelisReactApi\Controller\CapabilityGuardTrait`.** Un contrôleur d'outil propre à un
module `use` ce trait, définit `const MELIS_KEY = '<le melisKey de l'outil>'`, et appelle
`denyUnlessCan($cap)` **après** sa vérification d'accès à l'outil :

```php
use MelisReactApi\Controller\CapabilityGuardTrait;

class MelisReactApiFooController extends MelisAbstractActionController
{
    use CapabilityGuardTrait;
    const MELIS_KEY = 'melis_core_announcement_tool'; // the rights-bearing tool node

    public function saveAction()
    {
        if ($resp = $this->denyUnlessCan('edit')) return $resp;   // 403 JSON if denied
        // …call the module's Laminas service…
    }
}
```

`denyUnlessCan` lit les droits **effectifs** (`MelisCoreAuth::getAuthRights()` → utilisateur OU
rôle), **les admins contournent**, et il est **autorisé par défaut** — un outil sans
déclaration conserve le CRUD complet. Côté client, la même map d'autorisations arrive dans
`/me` `data.capabilities` et filtre l'interface (`melis-core/ui-react/src/lib/caps.ts`).

## Intégration hôte

- **Découverte / briques** — `GET /react-modules` analyse les modules **actifs** à la
  recherche de `public/ui-react/brick.manifest.json` (un objet unique ou un tableau
  `bricks: [...]`) et retourne `BrickDef = { id, module, route, label, forwardKey, melisKey,
  subTabs, persistent, bundleUrl }`, plus `bundle.url = /melis/react-api/bricks-bundle.js?v=<sig>`.
  Le shell charge le bundle unique concaténé (chaque brique est un IIFE qui s'auto-enregistre
  par id sur `window.__MELIS_BRICK_COMPONENTS__` via `window.__melisRegisterBrick`, enveloppé
  dans un try/catch). La signature `?v=` (nom+mtime+taille de chaque bundle) rend un cache
  immuable d'un an sûr. Une brique existe **si et seulement si** son module est actif — la
  règle de modularité.
- **Constructeur de menu (`GET /menu`)** — parcourt l'interface leftmenu, applique l'ordre des
  sections/outils et émet `NavNode[]` où chaque nœud est `{ key, name, icon, melisKey, isTool,
  forward, hasNavChild, configChildCount, children }`. Une **section** de haut niveau est un
  conteneur (élagué seulement si vide) ; une section `is_parent_tool` cliquable est filtrée par
  `canAccess(target)` ; les sections nouvellement installées et inconnues utilisent des droits
  permissifs afin de rester visibles. Deux hooks l'étendent :
  `melisReactSidebarHostSections` (conserver une section vide comme simple conteneur hôte de
  sidebar portant `sidebarModule`) et `melisReactRightsTools` (injecter des nœuds d'outil
  synthétiques réservés aux droits, `?full=1` uniquement).
- **Pont auth / assets** — `/assets` retourne les mêmes CSS/JS que le `layoutCore.phtml` legacy
  charge (délégué à `MelisReactOverride\Service\PlatformAssetsService`), de sorte que les
  iframes d'outil s'amorcent de façon identique à l'intérieur du shell React.
- **i18n** — les libellés `tr_*` (noms de sections de menu, libellés d'onglets de capacités)
  sont traduits dans la locale de session courante (conteneur `meliscore`
  `melis-lang-locale`) via `MelisCoreTranslation` ; les modules déclarent des **clés**, jamais
  du texte codé en dur.

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Manifeste de module / autoloader | `melis-react-api/src/Module.php` |
| Routes + contrôleur invokable | `melis-react-api/config/module.config.php` |
| Actions génériques (12) | `melis-react-api/src/Controller/MelisReactApiController.php` |
| Trait de garde de capacité | `melis-react-api/src/Controller/CapabilityGuardTrait.php` |
| Résolveur de capacités | `melis-react-api/src/Service/Capabilities.php` |

Voir aussi : [melis-core](/reference/modules/melis-core) ·
[melis-small-business](/reference/modules/melis-small-business) ·
[melis-ai](/reference/modules/melis-ai)
