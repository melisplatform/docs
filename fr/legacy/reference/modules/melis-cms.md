# MelisCms

> Le back-office CMS — sites, arbre de pages, éditeur de page, templates, styles et SEO.
> Paquet `melisplatform/melis-cms`.

## Présentation

`MelisCms` est la couche d'orchestration du back-office pour la construction et l'exploitation de
sites web sur la plateforme Melis. Il fournit l'arbre des sites, l'éditeur de page (onglets
Édition, Propriétés, SEO, Langues), des zones de glisser-déposer de plugins pour composer le
contenu des pages, ainsi que des outils d'administration pour les sites, templates, styles,
langues, identifiants de plateforme, domaines et redirections de site. Il **ne possède aucune table
de base de données** — il lit et écrit tout via [melis-engine](/fr/legacy/reference/modules/melis-engine),
et le rendu des pages (y compris l'aperçu en édition live) est assuré par
[melis-front](/fr/legacy/reference/modules/melis-front).

## Le trio MelisCms / MelisFront / MelisEngine

Ces trois modules forment un système étroitement couplé. Une modification ou une question concernant
l'un d'eux implique régulièrement les autres.

- **MelisEngine** — possède l'intégralité du modèle de base de données CMS (pages, arbre, sites,
  templates, langues, SEO, styles) et l'expose via des table gateways, des services et un cache
  fichier. Définit également `MelisTemplatingPlugin`, la classe de base dont hérite chaque bloc de
  contenu.
- **MelisFront** — pipeline de rendu front office ; transforme une URL en page terminée et alimente
  aussi l'aperçu éditable en live dans le back-office (`renderMode/melis`).
- **MelisCms** *(ce module)* — la couche UI du back-office ; pilote le cycle de vie des pages en
  déclenchant des événements que les écouteurs de engine et front traitent.

**Ordre de chargement :** `melis-core` → `melis-front` → `melis-engine` → `melis-cms`.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCms',
];
```

Nécessite `melisplatform/melis-core`, `melisplatform/melis-engine` et
`melisplatform/melis-front` (déclarés dans son `composer.json`). Il n'a pas de SQL d'installation
propre ; le schéma CMS fait partie de melis-engine.

## Services principaux

À résoudre avec `$sm->get('<alias>')`.

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsPageService` | Écriture du modèle de page : `savePage()`, `savePagePublished()`, `savePageSaved()`, `savePageSeo()`, `savePageLang()`, `savePageStyle()`, `savePageTree()`, `saveProperties()`. |
| `MelisCmsSiteService` | CRUD des sites et requêtes de pages par site. |
| `MelisCmsPageGetterService` | `getPageContent($pageId)` — retourne le HTML rendu en cache d'une page. |
| `MelisCmsRights` | Vérifications des permissions back-office : `isAccessible()`, `isActionButtonActive()`. |
| `MelisCmsSitesDomainsService` | Gestion des domaines par environnement. |
| `MelisCmsSitesPropertiesService` | Paramètres clé/valeur du site (onglet Config du site). |
| `MelisCmsSiteModuleLoadService` | Chargement de modules par site (onglet Chargement de modules). |
| `MelisCmsMiniTemplateService` / `MelisCmsMiniTemplateGetterService` | Bibliothèque de mini-templates et gestion des catégories. |
| `MelisCmsPageExportService` / `MelisCmsPageImportService` | Export/import d'un arbre de pages sous forme de fichier. |

## Back-office

`MelisCms` enregistre la section CMS complète du back-office. L'arbre de l'interface se trouve dans
`config/app.interface.php` / `config/app.tools.php`. Entrées principales des outils :

| melisKey | Outil |
| --- | --- |
| `meliscms_sitetree` | Explorateur de l'arbre des sites + éditeur de page. |
| `meliscms_tool_sites` | Sites (créer/éditer, domaines, langues, chargement de modules, config, traductions). |
| `meliscms_tool_templates` | Gestionnaire de templates. |
| `meliscms_tool_styles` | Gestionnaire de styles. |
| `meliscms_tool_language` | Langues (liste principale). |
| `meliscms_tool_platform_ids` | Identifiants de plateforme (plages d'ID par environnement). |
| `meliscms_tool_site_301` | Redirections de site. |
| `meliscms_mini_template_manager` | Bibliothèque de mini-templates + gestionnaire du menu des catégories. |

Contrôleurs de l'éditeur de page : `PageController`, `PageEditionController`,
`PagePropertiesController`, `PageSeoController`, `PageLanguagesController`,
`PageDuplicationController`, `PageExportController`, `PageImportController`. Menu de plugins et
modales de glisser-déposer : `FrontPluginsController`, `FrontPluginsModalController`.

### Widget de tableau de bord

`MelisCmsPagesIndicatorsPlugin` — affiche le nombre de sites et de pages (publiées ou non) sur le
tableau de bord du back-office.

## Tables de base de données

`MelisCms` ne possède aucune table. Le schéma CMS est défini dans melis-engine et accessible via
ses gateways et services. Ne jamais interroger directement les tables CMS — utilisez les
gateways/services du moteur afin que le cache et le reste de l'écosystème restent cohérents.

## Événements du cycle de vie des pages

Le cycle de vie des pages est implémenté via 19 écouteurs câblés dans `Module.php::onBootstrap`.
Ces événements constituent le principal point d'extension — accrochez-vous à eux plutôt qu'appeler
`MelisCmsPageService` directement, afin que l'historique, les caches et les autres modules restent
synchronisés.

| Action | Événements |
| --- | --- |
| Enregistrer le brouillon | `meliscms_page_save_start` / `_end` (+ `…savetree_*`, `…saveproperties_*`, `…saveedition_*`, `…saveseo_*`) |
| Publier | `meliscms_page_publish_start` / `_end` |
| Dépublier | `meliscms_page_unpublish_start` / `_end` |
| Supprimer | `meliscms_page_delete_start` / `_end` (+ `…deleteseo_*`, `…delete_page_*`) |
| Déplacer | `meliscms_page_move_start` / `_end` |
| Dupliquer | `meliscms_page_duplicate_start` / `_end` |
| Session de plugin | `meliscms_page_savesession_plugin_*`, `meliscms_page_removesession_plugin_*` |

Deux hooks supplémentaires étendent l'éditeur de page lui-même :

- **`melis_cms_page_tabs_alter`** — ajouter ou supprimer des onglets dans l'éditeur de page (utilisé
  par les modules Historic et Script Editor).
- **`modify_page_properties_form_config`** — modifier le formulaire Propriétés pour y ajouter des
  champs personnalisés.

## Exemple

### Réagir à la publication d'une page

```php
// In your Module.php::onBootstrap (or a listener's attach())
$sharedEvents = $eventManager->getSharedManager();
$sharedEvents->attach(
    'MelisCms',                       // identifier MelisCms fires under
    'meliscms_page_publish_end',
    function (\Laminas\EventManager\EventInterface $e) {
        $params = $e->getParams();
        $idPage = $params['idPage'] ?? null;
        // log, sync, clear a custom cache, notify…
    },
    50                                 // priority
);
```

### Lire les données d'une page (via les services engine)

```php
$sm = $this->getServiceManager();

// Full page data (published or draft)
$pageSvc   = $sm->get('MelisEnginePage');
$published = $pageSvc->getDatasPage($idPage);              // live
$draft     = $pageSvc->getDatasPage($idPage, 'saved');    // working draft

// Tree helpers
$tree      = $sm->get('MelisEngineTree');
$children  = $tree->getPageChildren($idPage, 1);           // 1 = published only
$url       = $tree->getPageLink($idPage, true);            // absolute URL
```

### Invalider le cache de page après une mutation hors-bande

```php
$cache = $sm->get('MelisEngineCacheSystem');
$cache->deleteCacheByPrefix('page_' . $idPage, 'meliscms_page');
```

## Ajouter un nouveau bloc de contenu

Chaque bloc de contenu étend `MelisTemplatingPlugin` (défini dans melis-engine). Implémentez
`front()` pour le rendu sur le site live et `back()` pour le rendu du conteneur d'édition, puis
enregistrez le plugin. Les modules News, Slider et Category2 sont des implémentations de référence
— consultez leur documentation pour des exemples complets.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Bootstrap du module + câblage des écouteurs | `vendor/melisplatform/melis-cms/src/Module.php` |
| Services, contrôleurs, fabriques de formulaires | `vendor/melisplatform/melis-cms/config/module.config.php` |
| Arbre de l'interface back-office | `vendor/melisplatform/melis-cms/config/app.interface.php` |
| Configs des outils (DataTable, formulaires) | `vendor/melisplatform/melis-cms/config/app.tools.php` |
| Service de page | `vendor/melisplatform/melis-cms/src/Service/MelisCmsPageService.php` |
| Service de site | `vendor/melisplatform/melis-cms/src/Service/MelisCmsSiteService.php` |
| Service de droits | `vendor/melisplatform/melis-cms/src/Service/MelisCmsRightsService.php` |
| Récupération de page (cache) | `vendor/melisplatform/melis-cms/src/Service/MelisCmsPageGetterService.php` |
| Tous les écouteurs (19) | `vendor/melisplatform/melis-cms/src/Listener/` |
| Contrôleur du menu de plugins | `vendor/melisplatform/melis-cms/src/Controller/FrontPluginsController.php` |
| Widget de tableau de bord | `vendor/melisplatform/melis-cms/src/Controller/DashboardPlugins/MelisCmsPagesIndicatorsPlugin.php` |

## Voir aussi

- [melis-engine](/fr/legacy/reference/modules/melis-engine) — possède le modèle de données CMS et tous les table gateways.
- [melis-front](/fr/legacy/reference/modules/melis-front) — rendu front office et aperçu live.
- [melis-core](/fr/legacy/reference/modules/melis-core) — authentification, droits, événements et config de base.
