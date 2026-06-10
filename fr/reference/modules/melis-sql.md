# MelisSql

> Console SQL en lecture seule dans le panneau Dev Tools du back-office. Package `melisplatform/melis-sql`.

## Présentation

MelisSql est un outil développeur back-office qui permet d'exécuter une requête `SELECT` unique contre
la base de données de la plateforme et d'afficher les résultats sous forme de tableau — sans quitter
le back-office ni ouvrir un client de base de données externe. Il se connecte en utilisant les
identifiants `config['db']` configurés pour la plateforme, aucune information de connexion n'est donc
à saisir. Il s'agit d'un outil de diagnostic et d'inspection pour les développeurs et intégrateurs,
non d'une fonctionnalité destinée aux utilisateurs finaux.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisSql',
];
```

Nécessite `melisplatform/melis-core: ^5.1|^5.2` et PHP `^8.1|^8.3`.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisSqlToolToolService` | Constructeur de DataTable pour la grille de résultats ; hérite des helpers d'export CSV de `MelisServiceManager`. |

## Back-office

L'outil est enregistré sous **Dev Tools** (`fa fa-code`) → **SQL Tool** (`fa fa-database`) dans le
menu de gauche. Il propose une zone de texte pour la requête et un bouton **Run** ; les résultats
sont affichés dans une grille jQuery DataTables alimentée par l'endpoint AJAX `getList`.

**Règles de requête — messages de rejet :**

| Situation | Message |
| --- | --- |
| La requête ne commence pas par `SELECT` | *Only SELECT queries are allowed.* |
| Pas de point-virgule en fin de requête | *A query should end with ';'.* |
| Plus d'une instruction (plusieurs `;`) | *Only one query is allowed.* |
| La requête ne peut pas être préparée ou échoue | *Error preparing the query…* / *Error executing the query…* |
| Base de données inaccessible | *Connection failed: …* |

**Actions du contrôleur (`ListController`) :**

| Action | Rôle |
| --- | --- |
| `renderToolAction` | Affiche la vue principale de l'outil. |
| `renderToolHeaderAction` | Affiche la zone d'en-tête. |
| `renderToolContentAction` | Construit le DataTable et la zone de texte de la requête. |
| `getListAction` | Endpoint POST — exécute la requête, retourne le JSON `{ data, customerror }`. |

## Exemple

```php
// getListAction: reads platform DB config and executes the guarded query
$configDB = $this->getServiceManager()->get('config')['db'];
$conn = new \mysqli(
    $configDB['hostname'], $configDB['username'],
    $configDB['password'], $configDB['database'], $configDB['port']
);
$output = $this->runQuery($conn, $formData['query']);
return new JsonModel(['data' => $output['result'], 'customerror' => $output['errors']]);
```

Le helper `runQuery()` applique les trois contrôles avant de préparer l'instruction :

```php
// Exactly one ';', at the end, and the query must begin with SELECT
if (substr_count($sql, ';') == 0)  → 'tr_melis_sql_query_end_missing';
if (substr_count($sql, ';') !== 1) → 'tr_melis_sql_only_one_query_allowed';
if (stripos(strtolower($sql), 'select') !== 0) → 'tr_melis_sql_only_select_allowed';
$statement = $conn->prepare(trim($sql));
$statement->execute();
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Route, alias de contrôleur, alias de service | `vendor/melisplatform/melis-sql/config/module.config.php` |
| Emplacement dans le menu gauche (Dev Tools → SQL Tool) | `vendor/melisplatform/melis-sql/config/app.toolstree.php` |
| Configuration du DataTable (`melissql_tools`) | `vendor/melisplatform/melis-sql/config/app.tools.php` |
| Enregistrement des assets du plugin | `vendor/melisplatform/melis-sql/config/app.interface.php` |
| Contrôleur (actions de rendu + garde `runQuery`) | `vendor/melisplatform/melis-sql/src/Controller/ListController.php` |
| Constructeur de DataTable + export CSV | `vendor/melisplatform/melis-sql/src/Service/MelisSqlToolToolService.php` |
| Vues de l'outil | `vendor/melisplatform/melis-sql/view/melis-sql/list/` |
| Front-end (envoi de la requête, affichage des lignes) | `vendor/melisplatform/melis-sql/public/js/tool.js` |

## Notes de sécurité

- **Lecture seule par conception** — les contrôles sur `SELECT` uniquement, l'instruction unique et
  les requêtes préparées bloquent les écritures et les injections par requêtes empilées. Toute
  modification de `runQuery()` doit être traitée comme sensible du point de vue de la sécurité.
- L'outil se connecte avec les identifiants `config['db']` de la plateforme et doit être protégé par
  les droits back-office (contrôle d'accès basé sur `melisKey` de MelisCore) comme tout autre Dev Tool.
- Éviter les `SELECT *` non bornés sur des tables très volumineuses : il n'y a pas de pagination
  côté serveur au-delà des paramètres par défaut du DataTable.

Voir aussi : [MelisCore](/reference/modules/melis-core)
