# MelisCmsLinkCheck

> Testeur de liens qui explore une page (et, en option, ses sous-pages ou ses liens internes) et
> enregistre chaque lien cassé et chaque image cassée, en conservant un journal d'analyse par page.
> Paquet `melisplatform/melis-cms-link-check`.

## Objectif

MelisCmsLinkCheck est le testeur de liens de Melis. Il explore une page — en suivant éventuellement
ses sous-pages ou ses liens internes — et enregistre chaque lien cassé et chaque image cassée qu'il
trouve, en sauvegardant un journal d'analyse par page analysée. L'analyse elle-même (curl,
validation, insertion des journaux, traductions) réside côté serveur dans le service Laminas
`MelisCmsLinkCheckService::executeTest()` ; le back-office React est une couche de présentation qui
lit et lance les analyses via les endpoints react-api du module.

Dans le back-office React v6 (`/melis-react`), le module fournit une brique full-React native avec
deux surfaces :

- Un outil **Testeur de liens** dans le menu de gauche — une visionneuse en lecture seule des
  résultats d'analyses passées, une fenêtre modale **Lancer une analyse** et un rapport d'erreurs par
  ligne, avec une bascule **Nouveau / Ancien** qui revient à l'outil classique dans une iframe.
- Un onglet **Link Checker** dans l'éditeur de page CMS React qui lance et présente une analyse
  limitée à la seule page en cours d'édition.

## Activation

Ajoutez dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsLinkCheck',
];
```

Les deux surfaces sont conditionnées à l'activation : elles n'apparaissent que si le module est
actif, découvert par l'hôte via `GET /melis/react-api/react-modules` (qui liste les modules actifs
fournissant un `brick.manifest.json`). Désactiver le module supprime à la fois l'outil du menu et
l'onglet de l'éditeur de page.

## Le back-office React en un coup d'œil

| Élément | Valeur |
| --- | --- |
| Type de brique | Full-React native (avec un repli Nouveau/Ancien en iframe legacy) + un onglet d'éditeur de page |
| Identifiant de brique | `cms-link-check` |
| `route` du manifeste | `/melis-cms-link-check/results` |
| `label` | `Testeur de liens` (Link tester) |
| `forwardKey` | `MelisCmsLinkCheck/MelisCmsLinkCheckList` |
| `melisKey` (menu / iframe vue Ancien / nœud de droits) | `meliscmslinkcheck_tool` |
| Clé de l'onglet de page (= sa capacité) | `meliscmslinkcheck_page_link_check_tab` |
| Base de l'API | `/melis/react-api/cms-link-check` |
| Contrôleur react-api | `MelisReactApiLinkCheckController` (invokable `MelisReactApiLinkCheck`) |
| Table (possédée) | `melis_cms_link_check_logs` |
| Service d'analyse | `MelisCmsLinkCheckService::executeTest(...)` |

## L'outil Testeur de liens

Barre latérale gauche → le nœud **Testeur de liens** (*Link tester*) ouvre l'outil dans un onglet
principal. La vue Nouveau liste chaque journal d'analyse de la plateforme, une ligne par page
analysée.

![Outil React Testeur de liens affichant les cartes KPI, les filtres et la liste des résultats](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-list.png)

La liste comporte des cartes KPI (Pages analysées, Total des erreurs, Sites), un champ de recherche
(correspond à l'URL de la page, l'id de la page, le nom/label du site), un filtre par site
(uniquement les sites qui ont des journaux), Réinitialiser les filtres, un gestionnaire de colonnes
(afficher/masquer/réordonner les colonnes, sauvegardé localement) et un Export. Cliquez sur un
en-tête de colonne pour trier (par défaut : analyse la plus récente en premier). Les nombres
d'erreurs sont affichés sous forme de badges — vert lorsque 0, rouge sinon (Erreurs = total, Liens,
Images).

Chaque ligne dispose de quatre actions :

| Action | Icône | Rôle |
| --- | --- | --- |
| Voir en front | œil | Ouvre l'URL de la page analysée dans un nouvel onglet. |
| Éditer la page | crayon | Ouvre la page dans l'éditeur de page CMS React et bascule dessus. |
| Rapport | document | Ouvre la fenêtre modale du rapport d'erreurs par page. |
| Supprimer | corbeille | Supprime ce journal d'analyse (nécessite la capacité `delete`). |

La bascule **Nouveau / Ancien** en haut à droite fait passer tout l'outil entre la visionneuse React
(par défaut) et l'outil classique rendu dans une iframe
(`/melis/react-tool-page?key=meliscmslinkcheck_tool`), qui peut aussi servir à lancer des analyses à
l'ancienne.

## Lancer une analyse

Le bouton rouge **Lancer une analyse** (affiché si vous disposez de la capacité `launch`) ouvre une
fenêtre modale.

![Fenêtre modale Lancer une analyse avec le sélecteur de page, les boutons radio de portée et les cases de vérification](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-launchscan.png)

Choisissez la page de départ dans l'arbre de pages CMS chargé à la demande, choisissez une **portée**
et ce qu'il faut **vérifier**, puis **Exécuter**. L'analyse explore la ou les pages, enregistre les
résultats, actualise la liste et publie une notification.

- **Portée** — Cette page uniquement / Cette page et ses sous-pages / Cette page et ses liens
  internes (envoyé sous forme de `follow: '1' | '2' | '3'`).
- **Vérifier** — Liens et/ou Images (envoyé sous forme de `options: ['LINK', 'IMG']`).

## Lire le rapport d'une page

L'action **Rapport** d'une ligne ouvre le détail des erreurs de ce journal d'analyse.

![Fenêtre modale du rapport d'erreurs par page dans son état sans erreur](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-tool-linkchecker-report.png)

Une page saine affiche « ✓ Aucune erreur enregistrée pour cette page. » Une page comportant des
erreurs affiche un tableau : **Type** (badge LINK / IMG) · **URL** · **Détails** (l'échec). Le détail
provient de la colonne XML `lcl_errors` analysée, décodée en une `errorList` de
`{ url, type, details }`.

## Vérifier une page depuis son éditeur

Ouvrez une page dans l'éditeur de page CMS React et cliquez sur l'onglet **Link Checker**. Il affiche
la dernière analyse de cette page (date, badges Erreurs / Liens / Images et le tableau détaillé des
erreurs ou un message sans erreur) avec un bouton **Relancer l'analyse** — ou **Lancer une analyse**
si la page n'a jamais été analysée — qui exécute une analyse pour cette page uniquement.

![Onglet Link Checker dans l'éditeur de page CMS React affichant une analyse limitée à la page](/screenshots/react/melis-cms-link-check/meliscmslinkcheck-pageedition-tab-linkchecker-launchandreport.png)

L'onglet est ajouté à l'éditeur de page CMS via le pont hôte `window.__melisRegisterPageTab`
(possédé par la brique CmsPage), avec la clé `meliscmslinkcheck_page_link_check_tab` ; CmsPage le rend
avec `{ idPage }`.

## API React — endpoints

Les routes se trouvent dans `config/react-api.php`, servies par
`MelisCmsLinkCheck\Controller\MelisReactApiLinkCheckController`. Toutes sous
`/melis/react-api/cms-link-check`, avec le contrat `{ success, data, error }`. Chaque requête envoie
`X-Requested-With: XMLHttpRequest` et `credentials: 'include'`.

| Méthode et URL | Action | Rôle |
| --- | --- | --- |
| `GET /cms-link-check` | `list` | Journaux d'analyses (keyset : `limit`, `search`, `site`, `sort`, `dir`, `after`) → `{items,total,nextCursor}` |
| `GET /cms-link-check/stats` | `stats` | KPI `{total, errors, sites}` |
| `GET /cms-link-check/sites` | `sites` | Options du filtre par site (uniquement les sites présents dans les journaux) |
| `POST /cms-link-check/launch` | `launch` | Exécute une analyse (`{pageId, follow, options}`) → `{status,message,logIds,pagesVisited}` |
| `GET /cms-link-check/by-page/:idPage` | `byPage` | Dernière analyse d'UNE page (onglet de l'éditeur de page) ; `data: null` si jamais analysée |
| `DELETE /cms-link-check/delete/:id` | `delete` | Supprime un journal d'analyse |
| `GET /cms-link-check/:id` | `get` | Un journal + son `errorList:[{url,type,details}]` analysé |

> L'ordre des routes est important : `/stats`, `/sites`, `/launch`, `/by-page/:idPage` et
> `/delete/:id` sont déclarées avant la route fourre-tout `/:id`.

Les actions `list`, `stats`, `sites`, `get`, `by-page` et `delete` lisent directement
`melis_cms_link_check_logs` via du SQL paramétré (`Laminas\Db\Adapter\AdapterInterface`). Seule
`launch` délègue à `MelisCmsLinkCheckService::executeTest([...])` — l'analyse réelle — encadrée par
`ob_start()` / `ob_end_clean()` afin que les avertissements legacy ne corrompent pas le JSON. Le
sélecteur de page de Lancer une analyse réutilise un endpoint legacy existant (aucun nouveau
backend) : `GET /melis/MelisCms/TreeSites/get-tree-pages-by-page-id?nodeId=<id>` (`nodeId=-1` → sites
racine).

## Capacités

Déclarées dans `config/react.capabilities.php` sous deux nœuds porteurs de droits :

```php
return [
  'melisReactToolCapabilities' => [
    'meliscmslinkcheck_tool' => ['list', 'launch', 'delete', 'export'],
    'meliscms_page' => [
      'tabs' => [
        ['key' => 'meliscmslinkcheck_page_link_check_tab', 'label' => 'tr_meliscmslinkcheck_page_link_check_tab'],
      ],
    ],
  ],
];
```

- **Capacités de l'outil** — `list` (toute la visionneuse en lecture seule : list/stats/sites/
  rapport), `launch` (exécuter une analyse), `delete` (supprimer un journal), `export` (le bouton
  Export ; l'export réutilise l'endpoint `list`). Côté React elles conditionnent l'interface via
  `MelisCan('meliscmslinkcheck_tool', cap)` ; côté serveur, chaque action est protégée par
  `denyUnlessAccess()` puis `denyUnlessCan('list'|'launch'|'delete')`.
- **Capacité de l'onglet de page** — la `key` `meliscmslinkcheck_page_link_check_tab` doit être égale
  à la clé passée à `window.__melisRegisterPageTab` ; elle *est* la capacité de l'onglet. Sans cette
  déclaration, la liste blanche des capacités de la page CMS masque le bouton de l'onglet, même pour
  un administrateur. L'endpoint `by-page` de l'onglet n'est protégé que par l'authentification de
  session (c'est une sous-fonctionnalité de l'éditeur de page) ; le bouton, lui, l'est par cette
  capacité.

## Tables de base de données

| Table | Rôle |
| --- | --- |
| `melis_cms_link_check_logs` | Un journal d'analyse par page analysée : nombres de liens cassés / d'images cassées, plus la liste détaillée des erreurs stockée au format XML dans la colonne `lcl_errors`. |

## Contrôleurs legacy (vue Ancien)

Utilisés par le repli en iframe Nouveau/Ancien et l'outil classique, pas par la visionneuse React :

| Contrôleur | Rôle |
| --- | --- |
| `MelisCmsLinkCheckListController` | Page de l'outil classique + ses résultats en DataTables. |
| `MelisCmsLinkCheckLaunchController` | Fenêtre modale / formulaire de lancement classique (page + portée + vérification). |
| `MelisCmsLinkCheckPageLinkCheckController` | Onglet Link Check classique de l'édition de page (`renderPageLinkCheckAction`, `{ idPage }`). |

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Routes react-api + invokable | `config/react-api.php` |
| Capacités | `config/react.capabilities.php` |
| Configuration de l'outil legacy | `config/app.*.php` |
| Contrôleur react-api | `src/Controller/MelisReactApiLinkCheckController.php` |
| Service d'analyse | `src/Service/MelisCmsLinkCheckService.php` |
| Source de la brique React | `ui-react/src/` (`brick.tsx`, `LinkCheckPage.tsx`, `linkcheck-api.ts`, …) |
| Brique compilée + manifeste | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |
