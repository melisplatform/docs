# MelisSql

> Console SQL en lecture seule dans les Dev Tools du back-office React, livrée comme brique full-React native. Package `melisplatform/melis-sql`.

## Présentation

MelisSql est un petit outil développeur : une **console SQL en lecture seule**. Vous saisissez une
instruction `SELECT`, cliquez sur **Run** et les lignes correspondantes reviennent dans un tableau
dynamique — sans quitter le back-office ni ouvrir un client de base de données externe. Il se connecte
en utilisant les identifiants `config['db']` configurés pour la plateforme, aucune information de
connexion n'est donc à saisir.

Dans Melis v6, l'outil est livré comme **brique full-React native** dans `/melis-react` : une véritable
page React qui appelle un unique endpoint JSON `react-api`, avec une bascule **New / Old** capable de
revenir à l'ancien outil dans une iframe. C'est un outil de diagnostic et d'inspection réservé aux
administrateurs, non une fonctionnalité destinée aux utilisateurs finaux.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisSql',
];
```

L'outil n'apparaît dans le back-office React **que si le module est activé** (découverte modulaire des
briques). Nécessite `melisplatform/melis-core` et PHP `^8.1|^8.3|^8.4`.

## Emplacement dans /melis-react

Menu de gauche → groupe **Dev Tools** → **SQL**. Il s'ouvre dans un onglet principal nommé **SQL**. Le
manifeste de la brique déclare la route `/melis-core/sql` et lui associe la `forwardKey` de menu
`MelisSql/List`.

C'est un **outil à écran unique** : une seule page avec une zone de requête, un bouton **Run** et un
tableau de résultats dynamique. Pas de sous-onglets, pas de navigation en profondeur.

![L'outil SQL React : en-tête titre/sous-titre, la bascule New/Old (en haut à droite), une zone de texte de requête avec le placeholder `SELECT * FROM my_table LIMIT 10;`, l'indication « One SELECT statement only, ending with « ; » », un bouton Run rouge et une carte de résultats vide.](/screenshots/react/melis-sql/melissql-tool-sql.png)

## Utiliser l'outil React

1. Saisir **une seule** instruction `SELECT` dans la zone de texte de la requête.
2. La terminer par un point-virgule `;`.
3. Cliquer sur **Run** (ou appuyer sur **Ctrl/Cmd + Entrée**).

Une fois la requête exécutée, une carte de résultats apparaît avec :

- Un **nombre de lignes** (par ex. `12 row(s)` ; lors d'une recherche, `correspondances / total`).
- Une zone de **recherche** qui filtre les lignes retournées sur **toutes** les colonnes (même celles
  masquées).
- Un bouton **Columns** ouvrant un gestionnaire de colonnes : deux listes (**Visibles** / **Masquées**),
  glisser pour masquer/réordonner, **Reset** pour toutes les afficher. La disposition est mémorisée par
  navigateur (`localStorage`, clé `melis-sql-cols-v1`).
- Le **tableau** lui-même : cliquer sur un en-tête pour **trier** (croissant → décroissant) ; les blobs
  d'image reconnus (par ex. un avatar utilisateur) s'affichent en vignette directement dans la cellule.

### Bascule New / Old

Une bascule **New / Old** en haut à droite fait basculer tout l'outil entre deux vues. **New** (par
défaut) est l'interface React ; **Old** affiche l'ancien outil dans une iframe unique
(`/melis/react-tool-page?key=melissql_tool`), positionnée sur une ancre via un `ResizeObserver`.

## Règles de requête

L'outil refuse tout ce qui n'est pas une instruction unique en lecture seule, en affichant la raison
dans un bandeau rouge :

| Situation | Ce qui se passe |
| --- | --- |
| L'instruction ne commence pas par `SELECT` | Rejetée — *only SELECT queries are allowed*. |
| Pas de point-virgule en fin de requête | Rejetée — *a query should end with ';'*. |
| Plus d'une instruction (plusieurs `;`) | Rejetée — *only one query is allowed*. |
| Vous n'êtes **pas** administrateur de la plateforme | Rejetée — **403 Forbidden** (réservé aux admins). |
| La requête ne peut pas être préparée / échoue | L'erreur de la base de données est affichée dans le bandeau. |

## Endpoint API React

Il n'y a **pas** de `config/react-api.php` pour ce module. L'unique endpoint est atteint via la route
back-office fourre-tout du module (`config/module.config.php`,
`/melis/MelisSql[/:controller[/:action]]`), qui résout l'alias
`MelisSql\Controller\MelisSqlReactApi` → `MelisSqlReactApiController` (déclaré sous
`controllers.invokables`). Contrat : `{ success, data, error }`.

| Méthode & URL | Action du contrôleur | Rôle |
| --- | --- | --- |
| `POST /melis/MelisSql/MelisSqlReactApi/run` | `runAction` | Valide + exécute un unique `SELECT` en lecture seule, retourne `{ columns, rows, rowCount }` |

Corps de la requête : `{ "query": "SELECT … ;" }`.

```ts
// runSqlQuery(query) — the only call the brick makes (ui-react/src/sql-api.ts)
const res = await fetch('/melis/MelisSql/MelisSqlReactApi/run', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'SELECT * FROM melis_cms_page_tree;' }),
})
// → { success: true, data: { columns: string[], rows: Record<string,unknown>[], rowCount: number } }
```

`MelisSqlReactApiController` **étend l'ancien `ListController`** pour réutiliser sa garde `runQuery()`
telle quelle (même connexion `mysqli` issue de `config['db']`, même validation instruction unique /
`SELECT` uniquement, mêmes messages d'erreur traduits). Il n'ajoute que la remise en forme JSON ainsi
que les garde-fous ci-dessous. Les erreurs de validation ou de base retournent un HTTP **200** avec
`{ success:false, error }` ; les échecs d'authentification retournent 401/403 ; une requête non-`POST`
retourne 405.

## Capacités

Déclarées dans `config/react.capabilities.php` (fusionnées via `MelisSql\Module::getConfig()`), sous la
melisKey `melissql_tool` de l'outil :

```php
return ['melisReactToolCapabilities' => [
    'melissql_tool' => ['run'],   // one internal cap: the Run (execute-query) action
]];
```

- **`run`** est une capacité personnalisée (pas l'une des capacités standard
  `list/create/edit/delete/export`). Elle permet à un administrateur de *voir/consulter* l'outil sans
  nécessairement être autorisé à **exécuter** des requêtes.
- **Contrôle côté front.** `SqlPage` appelle `useCaps('melissql_tool')` → `can('run')` et n'affiche
  qu'alors le bouton **Run**, en activant le raccourci Ctrl/Cmd + Entrée.
- Ce fichier est **purement déclaratif** (il pilote les cases à cocher Utilisateurs → Droits) ; la
  **véritable application** repose sur la garde d'accès + le contrôle `usr_admin` dans le contrôleur.

## Notes de sécurité

- **Réservé aux administrateurs.** Le contrôleur exécute `denyUnlessAccess()` (401 si non authentifié,
  403 si `MelisCoreRights::canAccess('melissql_tool')` échoue), puis exige en plus `usr_admin`. Le droit
  `melissql_tool` étant délégable, **les droits seuls ne suffisent pas** — un non-administrateur reçoit
  un **403 Forbidden**.
- **Lecture seule par conception.** `runQuery()` rejette tout ce qui n'est pas exactement une instruction
  se terminant par `;` et commençant par `SELECT` — aucun chemin vers `INSERT`/`UPDATE`/`DELETE`/DDL.
  Toute modification de `runAction`/`runQuery` doit être traitée comme sensible du point de vue de la
  sécurité.
- **Masquage des colonnes sensibles.** `maskSensitiveColumns()` masque les *valeurs* des colonnes dont le
  nom correspond à `password|passwd|pwd|mot_de_passe|secret|token|api_key` par `••••••••`, côté serveur,
  afin qu'un hachage n'atteigne jamais le navigateur sur un `SELECT *`. C'est un garde-fou, pas une
  frontière.
- **JSON sûr pour le binaire.** `sanitizeForJson()` encode en base64 le binaire non-UTF-8 et émet les
  blobs d'image reconnus (par ex. `melis_core_user.usr_image`) sous forme d'URI `data:<mime>;base64,…`
  pour l'affichage en ligne.
- Éviter les `SELECT *` non bornés sur des tables très volumineuses : il n'y a pas de pagination côté
  serveur.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Route fourre-tout, invokable du contrôleur, extension toolpage de la vue Old | `config/module.config.php` |
| Capacités (`melisReactToolCapabilities` → `melissql_tool` → `run`) | `config/react.capabilities.php` |
| Ancien outil + garde `runQuery()` (réutilisée par le contrôleur API) | `src/Controller/ListController.php` |
| Contrôleur API React (garde admin + réutilisation `runQuery` + masquage + JSON sûr) | `src/Controller/MelisSqlReactApiController.php` |
| Particularité `toolPageAction()` de l'iframe de la vue Old | `src/Controller/React/PluginViewToolPageExtension.php` |
| Source de la brique React (IIFE Vite) | `ui-react/src/` — `brick.tsx`, `SqlPage.tsx`, `ViewToggle.tsx`, `sql-api.ts` |
| Brique compilée + manifeste | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |

Voir aussi : [MelisCore](/fr/reference/modules/melis-core)
