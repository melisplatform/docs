# MelisCmsSiteRobot

> Édition et service dynamique d'un `robots.txt` par domaine depuis le back-office. Package `melisplatform/melis-cms-site-robot`.

## Présentation

`MelisCmsSiteRobot` vous permet de gérer le `robots.txt` de chaque domaine de site depuis le back-office et
le sert dynamiquement à `https://<domain>/robots.txt` — directement depuis la base de données, sans
fichier statique à maintenir. Les modifications prennent effet immédiatement après l'enregistrement. Le texte robots est stocké
en une ligne par domaine dans une table dédiée ; il n'existe pas de variante par page ni par langue.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsSiteRobot',
];
```

Dépendances : `melis-core` et `melis-cms` (`^5.2`). Le module est en `dbdeploy: true`, donc sa
table est créée automatiquement. Il réutilise les passerelles de table fournies par `melis-engine` à l'exécution.

## Services principaux

Le module n'enregistre aucun service propre. Le contrôleur consomme des services engine existants :

| Alias de service | Rôle |
| --- | --- |
| `MelisEngineTableRobot` | Passerelle de table sur `melis_cms_domain_robots` — lit et écrit le `robot_text` par domaine. |
| `MelisEngineTableSiteDomain` | Alimente la liste des domaines de site (`sdom_id`, `site_label`, `sdom_domain`) pour l'outil back-office. |

## Back-office

Enregistré sous les outils **CMS** dans le menu gauche du back-office en tant que **Site robots** (icône serveur).
L'outil affiche une liste des domaines de site de la plateforme — une ligne par domaine. Il n'y a pas d'action Ajouter ni
Supprimer ; vous ne faites qu'**éditer** les entrées de domaine existantes.

Cliquer sur **Éditer** pour un domaine ouvre une modale avec le nom de domaine (en lecture seule) et une grande zone de texte
contenant le contenu `robots.txt` pour ce domaine. L'enregistrement effectue un upsert dans
`melis_cms_domain_robots` (la ligne est créée au premier enregistrement si elle est absente).

| Contrôleur | Classe |
| --- | --- |
| `ToolSiteRobot` | `MelisCmsSiteRobot\Controller\ToolSiteRobotController` |

Actions principales :

| Action | Rôle |
| --- | --- |
| `toolContainerAction` | Affiche la mise en page de l'outil. |
| `getSiteRobotDataAction` | Flux JSON pour la datatable des domaines. |
| `toolContentTableActionEditAction` | Le bouton Éditer par ligne. |
| `toolModalContentAction` | Modale d'édition — domaine + zone de texte `robot_text` (clé de formulaire `site_robot_form`). |
| `saveSiteRobotAction` | Upsert dans `melis_cms_domain_robots`. |
| `toolSiteRobotContentFiltersSitesAction` | Filtre par site dans la barre de filtres de la datatable. |

### Listener

`MelisCmsSiteRobotFlashMessengerListener` transmet les résultats d'enregistrement au flash-messenger central afin que
les messages de succès/erreur apparaissent dans le back-office.

## Front office

Une route publique dans `config/module.config.php` (`melis-cms-site-robot-special-urls`) mappe
`/robots.txt` vers `ToolSiteRobotController::toolRobotsTxtAction`. L'action recherche dans
`melis_cms_domain_robots` par le host demandeur et retourne le `robot_text` stocké.

| Route | Handler | Résultat |
| --- | --- | --- |
| `/robots.txt` | `ToolSiteRobotController::toolRobotsTxtAction` | Sert le `robot_text` stocké pour le domaine demandeur. |

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_cms_domain_robots` | Une entrée robots.txt par domaine : `robot_id` (PK), `robot_site_domain`, `robot_text`. |

## Exemple

Lire ou servir le texte robots d'un domaine depuis votre propre code :

```php
// Lister les domaines pour l'outil back-office :
$domains = $sm->get('MelisEngineTableSiteDomain')
              ->getData($search, $cols, $colOrder, $dir, $start, $len)->toArray();

// Obtenir le robots.txt pour un domaine spécifique :
$robot = (array) $sm->get('MelisEngineTableRobot')
                    ->getEntryByField('robot_site_domain', $domainName)->current();
echo $robot['robot_text'] ?? '';
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Routes (back-office + `/robots.txt`) | `vendor/melisplatform/melis-cms-site-robot/config/module.config.php` |
| Arbre des outils back-office | `vendor/melisplatform/melis-cms-site-robot/config/app.interface.php` |
| Datatable & formulaire d'édition de l'outil | `vendor/melisplatform/melis-cms-site-robot/config/app.tools.php` |
| Contrôleur (toutes les actions) | `vendor/melisplatform/melis-cms-site-robot/src/Controller/ToolSiteRobotController.php` |
| Listener de flash-messenger | `vendor/melisplatform/melis-cms-site-robot/src/Listener/MelisCmsSiteRobotFlashMessengerListener.php` |
| SQL d'installation | `vendor/melisplatform/melis-cms-site-robot/install/` |

Voir aussi : [Référence des modules](/fr/legacy/reference/modules), [melis-cms](/fr/legacy/reference/modules/melis-cms), [melis-core](/fr/legacy/reference/modules/melis-core)
