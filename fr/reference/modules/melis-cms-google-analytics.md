# MelisCmsGoogleAnalytics

> Fournisseur Google Analytics 4 (GA4) qui transforme la propriété GA4 configurée d'un site en courbes de sessions, totaux de KPI et données démographiques au sein du back-office React de Melis. Paquet `melisplatform/melis-cms-google-analytics`.

## Objectif

MelisCmsGoogleAnalytics lit la propriété GA4 d'un site côté serveur (via `google/apiclient` +
`google/analytics-data`) et l'affiche sous forme de graphiques dans le back-office React. Il s'agit d'un
fournisseur **d'affichage uniquement** : activer GA pour un site — choisir le fournisseur, saisir le
**Property ID** et téléverser le **JSON de la clé privée** du compte de service — se fait dans l'outil
**Statistiques du site** appartenant à `melis-cms-page-analytics`, et non par ce module.

Le module fournit **deux surfaces adossées à un seul composant de tableau de bord** :

- Un **onglet Google Analytics** dans l'éditeur de page CMS React, affichant les statistiques GA **pour la page ouverte**
  (filtrées par chemin de page).
- Un **affichage React natif au niveau du site** injecté dans l'outil **Statistiques du site**, affichant les statistiques GA
  **pour l'ensemble du site** lorsque le *module Analytics* de ce site est réglé sur Google Analytics.

![Onglet Google Analytics dans l'éditeur de page CMS React — courbe de sessions, cartes de KPI et données démographiques Langue/Pays/Ville pour la page ouverte](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-pageedition-tab-googleanalytics.png)

![Affichage Google Analytics au niveau du site dans l'outil Statistiques du site — le même tableau de bord GA4 appliqué à l'ensemble du site](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-tool-tab-analytics.png)

## Activation

Le module est découvert par l'hôte React au démarrage via `GET /melis/react-api/react-modules`, qui
liste les modules actifs fournissant un `brick.manifest.json`. Désactiver le module supprime les deux surfaces.

Dépendances Composer : `google/apiclient ^2.15`, `google/analytics-data ^0.16.0`, `melis-core`,
`melis-cms`, `melis-cms-page-analytics`.

## La brique React

Il s'agit d'une **brique de type ONGLET d'éditeur de page** (widget uniquement) : elle n'a **aucun outil de menu latéral**, **aucune route** et
**aucun `react-api.php`**. Le manifeste adopte la forme multi-briques avec une unique entrée ne comportant qu'un id, si bien que
l'hôte charge le bundle au démarrage et que la brique s'enregistre elle-même très tôt.

```json
{ "entry": "brick.js", "bricks": [ { "id": "cms-google-analytics" } ] }
```

`brick.tsx` n'appelle pas `__melisRegisterBrick` ; il effectue plutôt deux enregistrements au
moment de l'évaluation du module :

```tsx
// 1) Contribute a tab to the CMS page editor (owned by the CmsPage brick).
registerPageTab('melis_cms_google_analytics_page_tab', GoogleAnalyticsPageTab)

// 2) Register the native site-level display for the PageAnalytics host to mount by key.
;(window.__melisAnalyticsSiteDisplays ||= {})['melis_cms_google_analytics'] = GoogleAnalyticsSiteDisplay
window.dispatchEvent(new CustomEvent('melis:analytics-site-display-registered'))
```

| Composant | Rôle |
| --- | --- |
| `brick.tsx` | Enregistrement uniquement — ajoute l'onglet de page et l'affichage de site ; aucune brique routée. |
| `GoogleAnalyticsPage.tsx` (`GoogleAnalyticsPageTab`) | Onglet de l'éditeur de page. Reçoit `{ idPage }`, résout le site + le chemin de la page via `getPageContext`, puis monte le tableau de bord avec `siteId` + `pagePath`. |
| `GoogleAnalyticsSiteDisplay.tsx` | Le tableau de bord : sélecteur de plage de dates, graphique de sessions SVG en ligne, cartes de KPI, trois tableaux démographiques. Réutilisé par les deux surfaces (`pagePath` présent ⇒ portée page, absent ⇒ site entier). |

Comme React est externalisé vers les globales de l'hôte, le bundle ne peut pas importer de modules de l'hôte, d'où les
**styles en ligne**, l'**i18n `{fr,en}` intégrée au fichier** (à partir de `document.documentElement.lang`) et un
**graphique SVG dessiné à la main** (aucune bibliothèque de graphiques). Le SDK Google n'est jamais utilisé côté client.

## Le tableau de bord

Les deux surfaces affichent le même tableau de bord :

- **Contrôle de plage de dates** — **7 jours** / **30 jours** / **Personnalisée** (sélecteurs de date de début et de fin +
  **Appliquer**) et un bouton de **rafraîchissement**. La date de fin est par défaut aujourd'hui (données intrajournalières GA4 incluses).
- **Sessions sur la période** — un graphique en ligne/aires des sessions par jour.
- **Cartes de KPI** — Sessions, Utilisateurs, Pages vues, Pages/Session, Durée moyenne de session, Taux de rebond.
- **Données démographiques** — trois tableaux (Langue, Pays, Ville), chacun trié par sessions avec un pourcentage de part.

Si GA n'est pas configuré pour le site ou si l'API échoue, un encadré d'erreur rouge affiche le message du backend
(par exemple « Paramètres GA incomplets ») à la place des graphiques.

**Où le trouver :** par page → **MelisCms** → ouvrir une page → onglet **Google Analytics**. Par site →
**MelisMarketing** → **Statistiques du site** → choisir le site → sous-onglet **Analytics**. GA s'active pour
un site dans **Statistiques du site → Paramètres** (module Analytics = Google Analytics, Property ID, téléversement du JSON de
clé privée, script d'analytics personnalisé facultatif).

![Sous-onglet Paramètres des Statistiques du site — module Analytics réglé sur Google Analytics, Property ID, téléversement du JSON de clé privée et script d'analytics personnalisé](/screenshots/react/melis-cms-google-analytics/meliscmsgoogleanalytics-tool-tab-settings.png)

## Points d'accès aux données

Le module n'a **aucun `config/react-api.php`**. L'interface React appelle le
`GoogleAnalyticsController` déjà existant (route `application-MelisCmsGoogleAnalytics/default`, `ViewJsonStrategy`).

| Méthode et URL | Action | Objectif |
| --- | --- | --- |
| `GET /melis/MelisCmsGoogleAnalytics/GoogleAnalytics/getPageContext?idPage=<id>` | `getPageContextAction` | Résout le site propriétaire d'une page + son chemin → `{ success, siteId, pagePath, pageURL }`. |
| `POST /melis/MelisCmsGoogleAnalytics/GoogleAnalytics/getChartData` | `getChartDataAction` | Récupère les données GA4 d'un site (facultativement un chemin de page) → `{ success, chartData, errors }`. |

Le corps de `getChartData` est encodé en formulaire :

```ts
const body = new URLSearchParams()
body.set('siteId', String(siteId))
body.set('dateRange[option]', option)          // '7days' | '30days' | 'custom'
body.set('dateRange[startDate]', startDate)    // '7daysAgo' | '30daysAgo' | 'YYYY-MM-DD'
body.set('dateRange[endDate]', endDate)        // 'today' | 'YYYY-MM-DD'
body.set('dateRange[clientTimestamp]', String(Date.now()))
if (pagePath) body.set('pagePath', pagePath)   // page tab only → GA4 dimensionFilter on pagePath
```

Structure de `chartData` consommée par l'interface :

- `chartData.date.totals{}` → valeurs des KPI (`sessions`, `activeUsers`, `screenPageViews`,
  `screenPageViewsPerSession`, `averageSessionDuration`, `bounceRate`).
- `chartData.date.plot{ <tsSeconds>: { sessions } }` → la courbe des sessions (les clés sont des secondes).
- `chartData.language / .country / .city` → les tableaux démographiques (`{ value: { sessions } }`).

Côté serveur, `getChartDataAction` appelle les services GA4 (`GoogleAnalytics4APIService` /
`MelisCmsGoogleAnalyticsService`, aliasés dans `module.config.php`), qui utilisent le Property ID du site
et le JSON de clé privée et normalisent les lignes GA4 en `chartData`. En cas d'échec de l'API, l'action retourne un
`{ success:false, errors }` propre plutôt qu'une erreur 500.

## Capacités

Déclarées dans `config/react.capabilities.php` et fusionnées par `Module::getConfig()`. Comme le module
contribue un onglet à l'outil de page CMS, il déclare sa capacité sous le nœud partagé porteur de droits
**`meliscms_page`** (un `ArrayUtils::merge` intègre les `tabs[]` aux capacités de l'outil de page CMS) :

```php
return [
  'melisReactToolCapabilities' => [
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'melis_cms_google_analytics_page_tab', 'label' => 'tr_melis_cms_google_analytics'],
      ],
    ],
  ],
];
```

- La `key` **doit être identique** à la clé passée à `window.__melisRegisterPageTab` dans `brick.tsx` — elle *est*
  la capacité de l'onglet. Sans elle, la liste blanche des capacités de page CMS masque le bouton de l'onglet, même pour un administrateur.
- Il n'y a **aucune capacité backend** à déclarer : le module n'expose aucune action `react-api`. L'accès est
  contrôlé par l'accès à l'éditeur de page CMS (onglet de page) et à l'outil Statistiques du site (affichage de site).

## Intégration à l'hôte

- **Passerelle d'onglet de page (`__melisRegisterPageTab`)** — fournie par la brique CmsPage. Les deux briques partagent
  une garde idempotente : celle qui charge en premier crée `window.__melisPageTabRegistry` et définit le
  registraire. CmsPage lit `tabs['melis_cms_google_analytics_page_tab']` et affiche le composant
  avec `{ idPage }` ; le bouton n'apparaît que si la capacité est accordée.
- **Passerelle d'affichage de site (`__melisAnalyticsSiteDisplays`)** — fournie/consommée par l'outil
  *Statistiques du site* de `melis-cms-page-analytics`. La brique enregistre son composant sous la clé
  `melis_cms_google_analytics` (correspondant au `pad_analytics_key` stocké du site) et déclenche
  `melis:analytics-site-display-registered`. L'hôte le monte (avec `{ siteId }`) dans le sous-onglet Analytics
  lorsque le *module Analytics* du site = Google Analytics — remplaçant l'ancienne iframe par
  du React natif.
- **Les éléments génériques restent dans l'hôte.** Le conteneur de l'onglet de l'éditeur de page, l'outil Statistiques du site, le sélecteur
  de site et le formulaire Paramètres appartiennent à MelisCms / MelisCmsPageAnalytics ; ce module ne fait que remplir
  l'affichage *Google Analytics*.

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Routes / alias des services GA | `config/module.config.php` |
| Capacités React (`meliscms_page.tabs[]`) | `config/react.capabilities.php` |
| Contrôleur (`getPageContextAction`, `getChartDataAction`) | `src/Controller/GoogleAnalyticsController.php` |
| Source de la brique React (Vite IIFE) | `ui-react/src/brick.tsx`, `GoogleAnalyticsPage.tsx`, `GoogleAnalyticsSiteDisplay.tsx` |
| Brique compilée + manifeste | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |

Voir aussi : [melis-cms-page-analytics](/reference/modules/melis-cms-page-analytics) ·
[melis-cms](/legacy/reference/modules/melis-cms) ·
[melis-core](/legacy/reference/modules/melis-core)
