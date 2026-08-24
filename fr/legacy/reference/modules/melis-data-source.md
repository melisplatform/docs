# MelisDataSource

> Constructeur générique de source de données : sélectionne un jeu de données depuis un CSV, un
> collage personnalisé ou une requête de base de données, puis expose le résultat de façon
> uniforme pour les outils et plugins. Paquet `melisplatform/melis-data-source`.

## Objectif

`MelisDataSource` permet à un outil ou un plugin de définir un ou plusieurs **jeux de données**
(data sets) et d'en récupérer les lignes depuis trois types de sources — un **CSV** téléversé, une
source **custom** (collée/délimitée) ou une **table de base de données** (constructeur de jointure
assisté ou requête SQL `SELECT` personnalisée). La sélection (colonnes, mapping, tri, limite,
filtres par défaut et filtres surchargeables) est sérialisée en configuration XML ; à la lecture,
le service résout la bonne classe de source et renvoie un tableau de lignes normalisé. Le module
fournit aussi un assistant de formulaire backoffice pour construire cette configuration et un
assistant de filtres pour exposer des filtres à l'utilisateur.

## Activation

Module Laminas standard. Il est listé dans `config/melis.module.load.php` :

```php
'MelisDataSource',
```

Il déclare `dbdeploy: true` et requiert **`melisplatform/melis-core`** (`^5.3`) ; PHP `^8.1|^8.3`.
Le module **ne fournit aucune table propre** — il lit les tables déjà présentes dans la base de
la plateforme. Voir la [Référence des modules](/fr/legacy/reference/modules) et
[Créer un outil](/fr/legacy/guide/create-a-tool).

## Services principaux

Enregistrés dans `config/module.config.php` sous `service_manager` :

| Alias de service | Rôle |
| --- | --- |
| `MelisDataSourceService` | Service principal. Construit le XML de source, valide et construit le XML de filtres, exécute la requête et renvoie les données. |
| `MelisDataSourceCacheSystemService` | Wrapper de cache fichier (utilisé pour mettre en cache la liste des tables de la base ; voir la conf de cache `datasource_database`). |

`MelisDataSourceService` (étend `MelisCore\Service\MelisGeneralService`) — méthodes principales :

| Méthode | Rôle |
| --- | --- |
| `generateSourceConfigXml(?array $data, ?array $mappingKeys): array` | Valide les jeux de données (min/max colonnes, clés de mapping obligatoires) et renvoie `['errors', 'sourceConfigXml']`. |
| `generateFiltersConfigXml(string $sourceConfigXml, $filterData): array` | Valide les valeurs de filtre saisies via les validateurs des filtres surchargeables et renvoie `['errors', 'filterConfigXml']`. |
| `getData(string $sourceConfigXml, ?string $filtersConfigXml, ?array $mappingKeys): array` | Résout la source de chaque jeu, applique les valeurs de test des filtres surchargeables, renvoie `['data_source_config', 'results', 'errors']`. |
| `getDataSourceObject(string $source, ?string $queryType): MelisDataSource` | Renvoie la classe de source pour `csv` / `custom` / `table` (`assisted` vs requête custom). |
| `getAvailableColumns(...)`, `getDataExample(...)` | Inspectent une source pour lister ses colonnes / une ligne d'exemple. |
| `describeTable($table)`, `getTablePK($table)` | `DESCRIBE` d'une table et recherche de sa clé primaire. |

Les classes de source partagent la classe abstraite `MelisDataSource\DataSource\MelisDataSource`
(`generateDataSetXml()`, `getData()`, `getAvailableColumns()`, `getDataExample()`), implémentée par
`MelisDataSourceCsv`, `MelisDataSourceCustom`, `MelisDataSourceQueryAssisted` et
`MelisDataSourceQueryCustom`. Elles sont créées par `DataSourceFactory` (chacune reçoit le
conteneur de services et un `Laminas\Db\Adapter\Adapter`).

## Backoffice

Les routes se trouvent sous `melis-backoffice/MelisDataSource/<controller>/<action>`. Contrôleurs :

| Contrôleur (alias) | Concerne |
| --- | --- |
| `MelisDataSource\Controller\DataSource` | Construction de la source : upload CSV, exécution de requête/test, colonnes disponibles & de tri, navigation table/colonnes, `generateSourceConfigXml`. |
| `MelisDataSource\Controller\DefaultFilter` | CRUD modal des filtres par défaut (fixes). |
| `MelisDataSource\Controller\OverrideFilter` | CRUD modal des filtres surchargeables (éditables par l'utilisateur). |

Les configurations de tables d'outils sont déclarées dans `config/app.tools.php` sous la clé de
plugin `melisdatasource` : `melisdatasource_available_columns`, `melisdatasource_order_columns`,
`melisdatasource_default_filters`, `melisdatasource_override_filters`. Les modales backoffice sont
déclarées dans `config/app.interface.php` (melisKeys `melisdatasource_default_filter_modal`,
`melisdatasource_override_filter_modal`, `melisdatasource_run_test_modal`).

Ces outils et modales ne forment pas une section backoffice autonome ; ils sont destinés à être
intégrés par d'autres outils/plugins via les assistants de vue ci-dessous.

## Front office

Assistants de vue (enregistrés en alias sous `view_helpers`) :

| Alias d'assistant | Rôle |
| --- | --- |
| `DataSourceHelper` → `MelisDataSourceViewHelper` | Affiche le formulaire de paramètres de source (par jeu de données), en câblant les tables colonnes disponibles / tri / filtres par défaut / surchargeables. |
| `DataSourceFilterHelper` → `MelisDataFiltersViewHelper` | Affiche le formulaire de filtres pour les filtres surchargeables de l'utilisateur, avec en option un bouton « générer le XML ». |

Ce module n'expose **aucun plugin de templating front-office ni plugin de tableau de bord** — c'est
une brique de base consommée par les outils et autres modules. Voir [Plugins](/fr/legacy/guide/plugins).

## Tables de base de données

Aucune en propre. Le module opère sur les **tables existantes de la plateforme** (il liste les
tables possédant une clé primaire via les métadonnées Laminas DB, puis fait un `DESCRIBE` de la
table choisie pour lire ses colonnes). La liste des tables utilisables est mise en cache sur le
système de fichiers via le cache `datasource_database` (namespace `datasource`).

## Exemple

Construire une configuration de source, puis lire les données (usage typique dans un outil/service) :

```php
$ds = $this->getServiceManager()->get('MelisDataSourceService');

$build = $ds->generateSourceConfigXml([
    [
        'dataset_num'        => 1,
        'dataset_is_mandatory' => true,
        'dataset_min_column' => 1,
        'dataset_max_column' => 4,
        'dataset_source'     => 'table',          // 'csv' | 'custom' | 'table'
        'dataset_query_type' => 'custom',         // 'assisted' | 'custom' (source table)
        'dataset_query_sql'  => 'SELECT * FROM melis_cms_news',
        'dataset_columns'    => [['column_name' => 'cnews_id', 'column_mapping' => 'id']],
    ],
]);

if (empty($build['errors'])) {
    $result = $ds->getData($build['sourceConfigXml']);
    $rows   = $result['results'];   // lignes normalisées par jeu de données
}
```

## Fichiers clés

| Concerne | Chemin |
| --- | --- |
| Service principal | `vendor/melisplatform/melis-data-source/src/Service/MelisDataSourceService.php` |
| Service de cache | `vendor/melisplatform/melis-data-source/src/Service/MelisDataSourceCacheSystemService.php` |
| Classe de base des sources | `vendor/melisplatform/melis-data-source/src/DataSource/MelisDataSource.php` |
| Classes de source | `vendor/melisplatform/melis-data-source/src/DataSource/MelisDataSource{Csv,Custom,QueryAssisted,QueryCustom}.php` |
| Fabrique de source | `vendor/melisplatform/melis-data-source/src/Factory/DataSourceFactory.php` |
| Assistant de vue formulaire | `vendor/melisplatform/melis-data-source/src/View/Helper/MelisDataSourceViewHelper.php` |
| Assistant de vue filtres | `vendor/melisplatform/melis-data-source/src/View/Helper/MelisDataFiltersViewHelper.php` |
| Contrôleurs | `vendor/melisplatform/melis-data-source/src/Controller/{DataSource,DefaultFilter,OverrideFilter}Controller.php` |
| Configuration | `vendor/melisplatform/melis-data-source/config/{module.config,app.tools,app.interface,app.forms,validator.config}.php` |
