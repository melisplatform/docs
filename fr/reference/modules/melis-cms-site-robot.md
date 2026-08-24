# MelisCmsSiteRobot

> Édition et service dynamique du `robots.txt` par domaine, avec un back-office nativement full-React. Package `melisplatform/melis-cms-site-robot`.

## Présentation

`MelisCmsSiteRobot` vous permet de gérer le `robots.txt` de chaque domaine de site depuis le back-office et
le sert dynamiquement à `https://<domain>/robots.txt` — directement depuis la base de données, sans
fichier statique à maintenir. Les modifications prennent effet immédiatement après l'enregistrement. Le texte robots est stocké
en une ligne par domaine dans une table dédiée ; il n'existe pas de variante par page ni par langue.

Dans le back-office React v6 (`/melis-react`), l'outil est livré sous la forme d'une **brique full-React native** — une véritable
liste + un éditeur React s'appuyant sur une couche JSON `react-api` — avec un basculement **New / Old** qui revient à
l'outil legacy dans une iframe. Le modèle de données sous-jacent, les passerelles de table du moteur et la route front
dynamique `/robots.txt` sont inchangés par rapport à la v5.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsSiteRobot',
];
```

Dépendances : `melis-core` et `melis-cms`. Le module est en `dbdeploy: true`, donc sa table est créée
automatiquement, et il réutilise les passerelles de table fournies par `melis-engine` à l'exécution. La brique React
apparaît **uniquement si le module est activé** — l'hôte la découvre via `brick.manifest.json`
(`GET /melis/react-api/react-modules`) ; retirer le module de `melis.module.load.php` la fait
disparaître du menu.

## Back-office (React)

**Où :** barre latérale gauche → groupe **MelisCms** → **Robots.txt** (route d'arbre `/melis-cms/site-robot`).
Il s'ouvre en tant qu'onglet principal nommé **Robots.txt**, avec deux niveaux exposés en sous-onglets natifs de l'hôte :
**liste des domaines de site → l'éditeur robots.txt d'un domaine**.

![Liste React Robots.txt — cartes KPI (Domaines / Avec robots.txt / Sans robots.txt), un champ « Rechercher un domaine… », un filtre « Tous les sites », Réinitialiser les filtres / Colonnes / Exporter, le basculement New/Old et un rafraîchissement, avec par ligne Domaine / Site / Env. et un badge Défini/Aucun plus une action d'édition](/screenshots/react/melis-cms-site-robot/meliscmssiterobot-tool-robots-list.png)

### Niveau 1 — la liste des domaines

La liste affiche **tous les domaines de site de la plateforme** (une ligne par domaine, alimentée depuis l'outil
**Sites**). Elle propose des **cartes KPI** (Domaines / Avec robots.txt / Sans robots.txt), un champ de **recherche**
(correspond au domaine ou au nom du site), un filtre **Tous les sites**, un gestionnaire de **Colonnes**, un bouton
**Exporter** et **Réinitialiser les filtres**. La liste défile à l'infini (keyset) avec un tri côté serveur. Colonnes : **ID**,
**Domaine**, **Site**, **Env.**, **robots.txt** (un badge **Défini / Aucun** par ligne). Chaque ligne dispose d'une action
d'**édition** (crayon) et, lorsque du contenu existe, d'une action de **suppression** (effacement).

Il n'y a **pas de « + Nouveau » ni de suppression de domaine** — les domaines proviennent de l'outil Sites ; vous ne faites qu'éditer ou
effacer le robots.txt de chaque domaine.

### Niveau 2 — éditer le robots.txt d'un domaine

Ouvrir un domaine ajoute un **sous-onglet** (avec un bouton **← Retour**). L'éditeur affiche le **Domaine** et
le **Site** en lecture seule, plus une grande zone de texte monospace **contenu robots.txt** pour le corps. **Enregistrer**
(en haut à droite) le persiste, et il est servi en direct sur le `/robots.txt` de ce domaine. Le laisser vide
ne sert rien.

![Éditeur robots.txt React — champs Domaine et Site en lecture seule, une zone de texte monospace « contenu robots.txt », le sous-onglet ← Retour et un bouton Enregistrer en haut à droite](/screenshots/react/melis-cms-site-robot/meliscmssiterobot-tool-robots-edit.png)

### Basculement New / Old

Le basculement **New / Old** en haut à droite fait passer l'ensemble de l'outil entre l'interface React (**New**, par défaut)
et l'outil classique rendu dans une iframe (**Old**, à
`/melis/react-tool-page?key=site_robot_tool_display`).

## Brique React

| Élément | Valeur |
| --- | --- |
| Type de brique | Full-React native (avec un fallback legacy-iframe New/Old) |
| Id de la brique | `siterobot` (`brick.tsx` ⇄ `brick.manifest.json`) |
| `route` du manifest | `/melis-cms/site-robot` |
| `label` | `Robots.txt` |
| `forwardKey` | `MelisCmsSiteRobot/ToolSiteRobot` |
| `melisKey` (iframe / zone renderable) | `site_robot_tool_display` |
| `subTabs` / `persistent` | `true` / `true` |
| melisKey des capacités | `meliscms_site_robot_tools_section` |
| Base de l'API | `/melis/react-api/site-robots` |

La brique est un bundle Vite IIFE (React externalisé vers les globales de l'hôte). `SiteRobotPage.tsx` est le
conteneur : il analyse `/[section]/site-robot[/:id]` et bascule entre `DomainList` (sans id) et
`RobotForm` (id présent), en conservant le `mode` New/Old, les cartes KPI, les filtres, le gestionnaire de colonnes, l'export et
la modale de confirmation de suppression. Les sous-onglets sont pilotés via le pont window
(`window.__melisOpenSubTab` / `__melisUpdateSubTabLabel`).

## API React

Les routes se trouvent dans `config/react-api.php` ; contrôleur
`MelisCmsSiteRobot\Controller\MelisReactApiSiteRobotController`. Toutes sous
`/melis/react-api/site-robots`, contrat JSON `{ success, data, error }`. Le contrôleur dialogue avec
les tables **directement via du SQL paramétré** (pas de service de module — comme l'outil legacy).

| Méthode & URL | Action | Rôle |
| --- | --- | --- |
| `GET /site-robots` | `list` | Liste les domaines de site (keyset : `limit`, `search`, `site`, `sort`, `dir`, `after`) ; chaque élément porte `hasRobots` |
| `GET /site-robots/stats` | `stats` | KPI `{ total, withRobots, withoutRobots }` |
| `GET /site-robots/sites` | `sites` | Options de site pour le filtre |
| `GET /site-robots/:id` | `get` | Un domaine (`sdom_id`) + son `robotText` |
| `POST /site-robots/save` | `save` | Upsert du robots.txt d'un domaine (`{ id, robotText }`) |
| `DELETE /site-robots/delete/:id` | `delete` | Efface le robots.txt d'un domaine (le domaine subsiste) |

`list` effectue un LEFT JOIN de `melis_cms_site_domain` vers `melis_cms_site` et `melis_cms_domain_robots` (jointes sur
le nom de domaine, `robot_site_domain = sdom_domain`). `save` upsert la ligne robots clée sur le nom de
domaine et plafonne le corps stocké à **65535 caractères**. L'ordre des routes importe : `/stats`, `/sites`,
`/save`, `/delete/:id` sont déclarées **avant** le fourre-tout `/:id` (contraint à `[0-9]+`).

### Capacités

Déclarées dans `config/react.capabilities.php` sous le nœud porteur de droits
`meliscms_site_robot_tools_section` :

```php
return [
    'melisReactToolCapabilities' => [
        'meliscms_site_robot_tools_section' => ['list', 'edit', 'delete', 'export'],
    ],
];
```

- **`list`** — voir la liste des domaines (contrôle aussi `stats` + `sites`).
- **`edit`** — ouvrir (`get`) et enregistrer (`save`) le robots.txt d'un domaine.
- **`delete`** — effacer le robots.txt d'un domaine.
- **`export`** — le bouton Exporter (contrôle côté UI, réutilise la liste).

Il n'y a **pas de capacité `create`** — vous ne pouvez pas ajouter un domaine depuis cet outil. Chaque action du contrôleur
est protégée deux fois : `denyUnlessAccess()` (auth + `MelisCoreRights::canAccess`) puis `denyUnlessCan(cap)`
(autorisation par défaut ; le serveur reste le point d'application).

## Services principaux

Le module n'enregistre aucun service propre. L'outil legacy et l'API React partagent le même modèle de
données ; les passerelles du moteur restent disponibles :

| Alias de service | Rôle |
| --- | --- |
| `MelisEngineTableRobot` | Passerelle de table sur `melis_cms_domain_robots` — lit et écrit le `robot_text` par domaine. |
| `MelisEngineTableSiteDomain` | Alimente la liste des domaines de site (`sdom_id`, `site_label`, `sdom_domain`). |

## Front office

Une route publique dans `config/module.config.php` (`melis-cms-site-robot-special-urls`) mappe `/robots.txt`
vers `ToolSiteRobotController::toolRobotsTxtAction`. L'action recherche dans `melis_cms_domain_robots` par
le host demandeur et retourne le `robot_text` stocké. Inchangée en v6.

| Route | Handler | Résultat |
| --- | --- | --- |
| `/robots.txt` | `ToolSiteRobotController::toolRobotsTxtAction` | Sert le `robot_text` stocké pour le domaine demandeur. |

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_cms_domain_robots` | Une entrée robots.txt par domaine : `robot_id` (PK), `robot_site_domain`, `robot_text`. |

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Routes de l'API React | `vendor/melisplatform/melis-cms-site-robot/config/react-api.php` |
| Capacités React | `vendor/melisplatform/melis-cms-site-robot/config/react.capabilities.php` |
| Manifest de la brique React | `vendor/melisplatform/melis-cms-site-robot/public/ui-react/brick.manifest.json` |
| Contrôleur de l'API React | `vendor/melisplatform/melis-cms-site-robot/src/Controller/MelisReactApiSiteRobotController.php` |
| Outil legacy + route `/robots.txt` | `vendor/melisplatform/melis-cms-site-robot/src/Controller/ToolSiteRobotController.php` |
| Routes (back-office + `/robots.txt`) | `vendor/melisplatform/melis-cms-site-robot/config/module.config.php` |
| SQL d'installation | `vendor/melisplatform/melis-cms-site-robot/install/` |

Voir aussi : [Référence des modules](/fr/reference/modules), [melis-cms](/fr/reference/modules/melis-cms), [melis-core](/fr/reference/modules/melis-core)
