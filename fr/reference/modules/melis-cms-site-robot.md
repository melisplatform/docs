# MelisCmsSiteRobot

> Édition et service dynamique d'un `robots.txt` par site pour les sites Melis. Package
> `melisplatform/melis-cms-site-robot`.

## Objectif

`MelisCmsSiteRobot` ajoute un outil back-office permettant d'éditer le contenu du **`robots.txt`**
de chaque domaine de site, ainsi qu'une route publique qui le sert dynamiquement. L'outil liste
les domaines de site (groupés par site) dans une datatable ; l'édition d'un domaine ouvre une
modale avec une zone de texte contenant le robots.txt de ce domaine. En front-office, une requête
vers `/robots.txt` est mise en correspondance avec le **host** entrant et renvoie le texte stocké
pour ce domaine (un corps vide si rien n'est stocké). Le texte robots est conservé dans une seule
table indexée par domaine — il n'y a pas de variante par page ni par langue.

## Activation

Un module Laminas standard, listé dans `config/melis.module.load.php` (juste après `MelisCms`) :

```php
return [
    // …
    'MelisCmsSiteRobot',
    // …
];
```

Dépendances (depuis `composer.json`) : `melis-core` et `melis-cms`. Il est en `dbdeploy: true`, sa
table est donc créée/mise à jour via [melis-dbdeploy](/fr/reference/modules). Le module réutilise
les services de table fournis par `melis-engine` (`MelisEngineTableRobot`,
`MelisEngineTableSiteDomain`, `MelisEngineTableSite`).

## Services clés

Le module n'enregistre **aucun service propre** dans `config/module.config.php` ; le contrôleur
consomme des services core/engine existants :

| Alias de service | Rôle |
| --- | --- |
| `MelisEngineTableRobot` | Passerelle de table sur `melis_cms_domain_robots`. Le contrôleur lit/écrit le texte robots via `getEntryByField('robot_site_domain', $host)` et `save($data, $id)`. |
| `MelisEngineTableSiteDomain` | Alimente la datatable des domaines : `getData($search, $searchableCols, $orderCol, $orderDir, $start, $length, $siteId)`, plus `getTotalData()` / `getTotalFiltered()`. |
| `MelisEngineTableSite` | Liste les sites pour le filtre « choisir un site » de la datatable. |
| `MelisCoreTool` | Construit la config de la datatable, les colonnes, les colonnes recherchables et le formulaire d'édition à partir de la config de l'outil (`setMelisToolKey('melis_cms_site_robots', 'melissiterobot_tool_templates')`). |

## Back-office

Déclaré dans `config/app.interface.php` et `config/app.tools.php`. L'outil se place sous la section
de l'arbre des outils CMS (`meliscms_toolstree_section`) en tant que `meliscms_site_robot_tools`
(icône `fa-server`). La clé d'interface de l'outil lui-même est `melis_cms_site_robots`, avec la
vue principale `site_robot_tool_display`.

Toutes les actions sont servies par un unique contrôleur,
`MelisCmsSiteRobot\Controller\ToolSiteRobot` (`ToolSiteRobotController`) :

| Action | Rôle |
| --- | --- |
| `tool-container` / `tool-header-container` / `tool-content-container` | La coquille de l'outil : en-tête, description et la datatable `#tableSiteRobot`. |
| `getSiteRobotData` | Flux JSON de la datatable (colonnes `sdom_id`, `site_label`, `sdom_domain`), avec filtrage par site via `tpl_site_id`. |
| `tool-site-robot-content-filters-sites` | Affiche le `<select>` de filtre par site dans la barre de filtres de la datatable. |
| `tool-modal-container` / `tool-modal-content` | La modale d'édition : charge la ligne du domaine et son texte robots existant dans le `site_robot_form` (domaine en lecture seule + zone de texte `robot_text`). |
| `saveSiteRobot` | Valide le formulaire et enregistre le texte dans `melis_cms_domain_robots` (insertion ou mise à jour indexée par `robot_site_domain`), puis déclenche l'événement `site_robot_flash_messenger` (type de log `CMS_SITE_ROBOT_UPDATE`). |

La config de la datatable (colonnes, recherche, filtres, formulaire) se trouve dans
`config/app.tools.php` sous `melis_cms_site_robots → melissiterobot_tool_templates`. Voir
[Créer un outil](/fr/guide/create-a-tool).

### Listener

Au bootstrap (`src/Module.php`), pour les routes back-office uniquement,
`MelisCmsSiteRobotFlashMessengerListener` s'attache aux événements `site_robot_flash_messenger`
(et `melis_domain_flash_messenger`) et les transmet à
`MelisCore\Controller\MelisFlashMessenger` afin que les résultats d'enregistrement apparaissent
comme messages flash/log.

## Front-office

Ce module n'a ni plugin de templating ni view helper. Il enregistre à la place une route publique
dans `config/module.config.php` :

| Route | Mappe vers | Résultat |
| --- | --- | --- |
| `/robots.txt` (`melis-cms-site-robot-special-urls/robots_txt`) | `ToolSiteRobot::toolRobotsTxt` | Recherche dans `melis_cms_domain_robots` par le **host** de la requête et renvoie le `robot_text` stocké (vue terminale `tool-robots-txt.phtml`, qui se contente d'afficher le contenu). |

Chaque domaine peut ainsi servir son propre `robots.txt` sans fichier statique sur le disque.

## Tables de base de données

Créées depuis `install/sql/setup_structure.sql` (et le delta dbdeploy
`install/dbdeploy/93118_melis_site_robot_install.sql`) :

| Table | Rôle |
| --- | --- |
| `melis_cms_domain_robots` | Une entrée robots.txt par domaine : `robot_id` (PK), `robot_site_domain` (le host), `robot_text` (le corps complet du robots.txt). |

## Exemple

Lire le texte robots d'un host depuis votre propre code (le même appel que celui de la route
front) :

```php
$robotTable = $this->getServiceManager()->get('MelisEngineTableRobot');
$row = $robotTable->getEntryByField('robot_site_domain', 'www.example.com')->current();
$robotsTxt = $row ? $row->robot_text : null;
```

En pratique, vous éditez ce contenu depuis l'outil back-office **Site Robot**, et les visiteurs
l'obtiennent en demandant `https://www.example.com/robots.txt`.

## Fichiers clés

| Sujet | Chemin (sous `vendor/melisplatform/melis-cms-site-robot/`) |
| --- | --- |
| Bootstrap du module / chargement de la config | `src/Module.php` |
| Routes (back-office + `/robots.txt`) / contrôleurs | `config/module.config.php` |
| Arbre des outils back-office | `config/app.interface.php` |
| Datatable & formulaire d'édition de l'outil | `config/app.tools.php` |
| Contrôleur (toutes les actions) | `src/Controller/ToolSiteRobotController.php` |
| Listener de flash-messenger | `src/Listener/MelisCmsSiteRobotFlashMessengerListener.php` |
| Vue front `robots.txt` | `view/melis-cms-site-robot/tool-site-robot/tool-robots-txt.phtml` |
| SQL d'installation | `install/sql/setup_structure.sql`, `install/dbdeploy/` |

Voir la [Référence des modules](/fr/reference/modules) pour la carte complète des modules.
