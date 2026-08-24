# MelisEngine

> Fondation de données CMS partagée — modèle de page, sites, langues, classe de base des plugins de templating et cache de rendu. Paquet `melisplatform/melis-engine`.

## Présentation

MelisEngine détient l'intégralité du modèle de base de données CMS (pages, arbre de pages, sites, templates, langues,
domaines, SEO, styles) et l'expose via des table gateways, des services et un cache multi-niveaux.
[MelisFront](/fr/legacy/reference/modules/melis-front) (rendu front-end) et
[MelisCms](/fr/legacy/reference/modules/melis-cms) (édition back-office) lisent et écrivent exclusivement
via MelisEngine — aucun des deux ne possède de tables. MelisEngine définit également
`MelisTemplatingPlugin`, la classe de base abstraite que tout plugin de contenu de la plateforme étend.

## Activation

MelisEngine est chargé automatiquement en tant que dépendance. L'ordre de chargement dans
`config/melis.module.load.php` est :

```php
// config/melis.module.load.php
return [
    'MelisCore',
    'MelisFront',
    'MelisEngine',   // requires melis-core + melis-front
    'MelisCms',
];
```

Dépendances Composer : `melisplatform/melis-core`, `melisplatform/melis-front`,
`laminas/laminas-cache` (adaptateurs filesystem et memory).

## Services principaux

Enregistrés comme alias `service_manager` dans `config/module.config.php` :

| Alias de service | Rôle |
| --- | --- |
| `MelisEnginePage` / `MelisPageService` | Résoudre une page par id et mode (`published` / `saved`) : `getDatasPage($idPage, $mode)` — retourne l'arbre de page hydraté, les données de page, le SEO, le template et les objets de style |
| `MelisEngineTree` / `MelisTreeService` | Navigation dans l'arbre de pages : `getPageChildren()`, `getPageFather()`, `getPageBreadcrumb()`, `getPageLink()`, recherche |
| `MelisEngineTemplateService` | Recherche de template : `getTemplate($tplId)` |
| `MelisEngineSiteService` | Catalogue des sites |
| `MelisEngineSiteDomainService` | Résolution domaine → site : `getSiteByDomain()` |
| `MelisEngineLang` / `MelisEngineLangService` | Langues : langues disponibles, locale ↔ id, langue du site |
| `MelisEngineSEOService` | Données SEO par page : `getSEOById()` |
| `MelisEnginePageDefaultUrlsService` | Recherches d'URL pré-calculées / canoniques |
| `MelisEngineStyle` / `MelisEngineStyleService` | Styles du site et CSS par page |
| `MelisEngineCacheSystem` | Orchestrateur de cache : `getCacheByKey()`, `setCacheByKey()`, `deleteCacheByPrefix()` |
| `MelisSearch` | Index de pages plein texte (style Lucene) utilisé par la recherche front-end |
| `MelisEngineSendMail` | Utilitaire d'envoi d'e-mail |
| `MelisGdprService` / `MelisGdprAutoDeleteService` | Textes de la bannière RGPD et framework de suppression automatique |
| `MelisEngineComposer` | Opérations Composer / dépendances |

Tous les services qui étendent `MelisGeneralService` déclenchent des événements `*_start` / `*_end` (ex.
`melisengine_service_get_available_languages_start` / `_end`) que d'autres modules peuvent intercepter.

## Back-office

MelisEngine ne dispose d'aucun outil destiné à l'utilisateur final. Il enregistre deux fabriques d'éléments de formulaire utilisées
dans l'ensemble du back-office :

| Fabrique | Utilité |
| --- | --- |
| `MelisEnginePluginTemplateSelect` | Élément de sélection de template pour les formulaires de plugins |
| `MelisEngineSiteSelect` | Élément de sélection de site pour les formulaires de plugins |

Des contrôleurs de configuration et de maintenance (`MelisSetup*`) sont également présents mais sont invoqués par
l'installateur, et non par les éditeurs.

## Front office

La classe de base de chaque plugin de contenu réside ici :

| Élément | Description |
| --- | --- |
| `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` | Base abstraite pour tous les plugins de contenu. Définit `front()` (rendu live, abstrait), `back()` (vue conteneur/édition back-office), persistance XML de configuration (`loadDbXmlToPluginConfig()` / `savePluginConfigToXml()`), chargement GET/POST, mode prévisualisation et largeur responsive. |

Chaque plugin de contenu de la plateforme (News, Slider, Menu, Breadcrumb, …) sous-classe cette classe. Implémentez
`front()` pour la sortie live ; la classe de base gère `back()` automatiquement.

Deux listeners de micro-service interceptent `melis_core_microservice_amend_data` pour exposer les méthodes
d'arbre et de page (`getPageChildren`, `getPageFather`, `getDomainByPageId`, `getDatasPage`) via la couche
micro-service de la plateforme.

## Tables de base de données

MelisEngine est la source de vérité unique pour le schéma CMS
(`install/sql/setup_structure.sql` + deltas `install/dbdeploy/`) :

| Table | Contenu |
| --- | --- |
| `melis_cms_page_tree` | Hiérarchie de pages (`tree_father_page_id`, ordre) |
| `melis_cms_page_published` | Version publiée (live) de chaque page |
| `melis_cms_page_saved` | Version sauvegardée / brouillon (éditée dans le back-office) |
| `melis_cms_page_lang` | Liens page ↔ langue |
| `melis_cms_lang` | Langues / locales CMS |
| `melis_cms_site` | Sites (racine de l'arbre de pages) |
| `melis_cms_template` | Templates (layout / contrôleur / action ou chemin PHP) |
| `melis_cms_page_seo` | SEO par page (URL, redirection 301, meta title/description, canonical) |
| `melis_cms_site_domain` | Domaines de site par environnement |
| `melis_cms_site_301` / `melis_cms_site_404` | Redirections 301 globales / mapping 404 par site |
| `melis_cms_page_default_urls` | URLs de page pré-calculées (table de cache) |
| `melis_cms_style` / `melis_cms_page_style` | Styles CSS et liens page ↔ style |
| `melis_cms_platform_ids` | Plages d'allocation d'id de page par environnement |
| `melis_cms_site_config` / `_home` / `_langs` | Config du site, page d'accueil par langue, langues actives |
| `melis_cms_site_robot` | robots.txt par domaine |
| `melis_cms_mini_tpl_*` | Catégories, templates et indicateurs de mini-templates |
| `melis_cms_gdpr_texts` | Textes de la bannière RGPD par site / langue |
| `melis_site_translation` / `_text` | Chaînes de traduction globales au site |

### Table gateways

Chaque table est encapsulée par une passerelle `MelisEngineTable*` enregistrée dans le service manager
(ex. `MelisEngineTablePageTree`, `MelisEngineTablePagePublished`, `MelisEngineTablePageSeo`).
Les autres modules doivent toujours utiliser ces passerelles — jamais de SQL brut. La passerelle de base fournit
`getEntryById()`, `getEntryByField()`, `save()`, `deleteById()`, `fetchAll()`.

## Exemple

**Lire une page et naviguer dans l'arbre :**

```php
$pageSvc = $sm->get('MelisEnginePage');
$page    = $pageSvc->getDatasPage($idPage);            // 'published' (live) by default
$draft   = $pageSvc->getDatasPage($idPage, 'saved');   // working draft

$tree       = $sm->get('MelisEngineTree');
$children   = $tree->getPageChildren($idPage, 1);       // 1 = published only
$breadcrumb = $tree->getPageBreadcrumb($idPage);
$url        = $tree->getPageLink($idPage, true);        // true = absolute URL
```

**Lire/écrire via une table gateway (jamais de SQL brut) :**

```php
$seoTable = $sm->get('MelisEngineTablePageSeo');
$seo      = $seoTable->getEntryByField('plang_page_id', $idPage)->current();
$seoTable->save(['seo_meta_title' => 'New title'], $existingSeoId);  // upsert
```

**Mettre en cache un résultat calculé :**

```php
$cache = $sm->get('MelisEngineCacheSystem');
$cache->setCacheByKey('mykey', 'my_cache_config', $value);
$value = $cache->getCacheByKey('mykey', 'my_cache_config');
$cache->deleteCacheByPrefix('page_' . $idPage, 'meliscms_page');   // invalidate a page
```

**Écouter un événement de service :**

```php
$sharedEvents->attach('MelisEngine', 'melisengine_page_getdatas_end', function ($e) {
    $p = $e->getParams();   // includes page id and 'results'
    // alter $p['results'] before it is returned
}, 50);
```

**Construire un plugin de contenu :**

```php
// Subclass MelisTemplatingPlugin, implement front() for live render.
// The base class handles back() (BO container), config XML persistence and preview.
class MyPlugin extends MelisEngine\Controller\Plugin\MelisTemplatingPlugin
{
    public function front(): string
    {
        return $this->getView()->render('my-module/plugin/my-plugin', $this->pluginConfig);
    }
}
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Alias de services et passerelles, caches | `vendor/melisplatform/melis-engine/config/module.config.php` |
| Service de données de page | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| Service arbre / liens | `vendor/melisplatform/melis-engine/src/Service/MelisTreeService.php` |
| Orchestrateur de cache | `vendor/melisplatform/melis-engine/src/Service/` (`MelisEngineCacheSystem*`) |
| Classe de base des plugins de templating | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Table gateways | `vendor/melisplatform/melis-engine/src/Model/Tables/` |
| Schéma + migrations delta | `vendor/melisplatform/melis-engine/install/sql/` |

Voir aussi : [MelisFront](/fr/legacy/reference/modules/melis-front) · [MelisCms](/fr/legacy/reference/modules/melis-cms) · [MelisCore](/fr/legacy/reference/modules/melis-core)
