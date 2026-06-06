# MelisEngine

> Le moteur de pages/données qui alimente le rendu Melis — arbre de pages, données de page, sites,
> langues, classe de base des plugins de templating et système de cache. Paquet
> `melisplatform/melis-engine`.

## Objectif

MelisEngine est la couche de données (lecture/écriture) qui s'intercale entre le backoffice
[MelisCms](/fr/reference/modules) et le moteur d'affichage [MelisFront](/fr/reference/modules). Il
résout un id de page vers l'ensemble de ses données (arbre, langues, SEO, template, styles),
construit les liens de page et les fils d'Ariane, expose le catalogue des sites / langues / domaines,
fournit la classe de base que tout plugin de templating front-office étend
(`MelisTemplatingPlugin`), et offre le cache multi-niveaux utilisé pendant le rendu. Voir
[Construire un site](/fr/guide/build-a-site) pour le flux de bout en bout.

## Activation

`MelisEngine` est un module Laminas standard. Il est listé dans `config/melis.module.load.php`,
entre `MelisFront` et les modules de contenu CMS :

```php
// config/melis.module.load.php
'MelisCms',
'MelisFront',
'MelisEngine',
```

Il requiert `melisplatform/melis-core` et `melisplatform/melis-front` (voir `composer.json`), et il
embarque `laminas/laminas-cache` avec les adaptateurs de stockage Filesystem et Memory.

## Services clés

Déclarés comme alias `service_manager` dans `config/module.config.php`. Les plus utilisés :

| Alias de service | Rôle |
| --- | --- |
| `MelisEnginePage` / `MelisPageService` | Données de page : `getDatasPage($idPage, $type)`, `getPageById()`, `getPageLanguageList()`, `searchPage()`, `updatePageById()`. `$type` vaut `published` ou `saved`. |
| `MelisEngineTree` / `MelisTreeService` | Arbre & liens : `getPageChildren()`, `getPageFather()`, `getPageBreadcrumb()`, `getPageLink()`, `getHomePageLink()`, `getSiteByPageId()`, `getDomainByPageId()`, `getFullDatasPage()`. |
| `MelisEngineSiteService` | Catalogue des sites : `getSiteById()`, `getSiteDataByDomain()`, `getHomePageBySiteIdAndLangId()`, `getSiteDNDRenderMode()` (mode de rendu glisser-déposer). |
| `MelisEngineLang` / `MelisEngineLangService` | Langues : `getAvailableLanguages()`, `getSiteLanguage()`, `getLocaleByLangId()`, `getLangByLocale()`. |
| `MelisEngineCacheSystem` | Le cache de rendu : `getCacheByKey()`, `setCacheByKey()`, `deleteCacheByPrefix()`, `getRenderMode()`, `isCacheConfActive()`. |
| `MelisEngineTemplateService` | Résout un template par id : `getTemplate($tplId)`. |
| `MelisEngineSEOService` | Données SEO de page : `getSEOById($seoId)`. |
| `MelisSearch` | Indexation/recherche plein texte sur les pages : `createIndex()`, `search()`, `clearIndex()`, `optimizeIndex()`. |
| `MelisEngineSendMail` | Envoi d'emails (`sendEmail(...)`) via la mise en page email du moteur. |
| `MelisEngineSiteDomainService` | Résolution du domaine de site par environnement. |
| `MelisEnginePageDefaultUrlsService` | URL par défaut / canoniques des pages. |
| `MelisGdprService` / `MelisGdprAutoDeleteService` | Textes de la bannière de consentement RGPD et suppression automatique des données personnelles stockées. |
| `MelisEngineComposer` | Aide Composer utilisée par les contrôleurs de setup du module. |

Les classes `Model/Tables/*` sont également aliasées (ex. `MelisEngineTablePageTree`,
`MelisEngineTableSite`, `MelisEngineTablePagePublished`) pour un accès direct via table-gateway.

## Backoffice

MelisEngine n'a pas d'arbre d'outils destiné à l'utilisateur final. Il expose un contrôleur de
setup/maintenance, `MelisEngine\Controller\MelisSetup` (route `/melis/MelisEngine`, action
`setup-form`), ainsi que des contrôleurs de setup post-download / post-update utilisés par
l'installateur et l'updater. Il enregistre aussi deux fabriques d'éléments de formulaire utilisées
ailleurs dans le backoffice : `MelisEnginePluginTemplateSelect` et `MelisEngineSiteSelect`.

## Front office

La classe sur laquelle la plupart des modules s'appuient se trouve ici :

| Élément | Nom |
| --- | --- |
| Classe de base des plugins de templating | `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` — `front()` abstrait, plus `back()`, `render()`, `createOptionsForms()`, `loadDbXmlToPluginConfig()`, `savePluginConfigToXml()`. |

Chaque plugin de templating front (`MelisCmsSlider`, `MelisCmsNews`, …) étend cette classe — voir
[Plugins](/fr/guide/plugins). Le module fournit aussi la mise en page du moteur
(`layout/layoutEngine`), la mise en page email (`MelisEngine/emailLayout`) et les vues plugin
par défaut (no-template / container), ainsi que les configurations de cache (`engine_file_cache`,
`engine_memory_cache`, `meliscms_page`, `engine_page_services`, `templating_plugins`) consommées par
`MelisEngineCacheSystem`.

Deux listeners exposent les services de page/arbre via la couche micro-service de la plateforme
(`MelisEngineMicroServicePageServiceListener`, `MelisEngineTreeServiceMicroServiceListener`) ; les
méthodes exposées sont déclarées dans `config/app.microservice.php`.

## Tables de base de données

MelisEngine possède le schéma cœur des pages/sites CMS (créé depuis
`install/sql/setup_structure.sql` et les deltas `install/dbdeploy/*.sql`) :

| Domaine | Tables |
| --- | --- |
| Pages | `melis_cms_page_tree`, `melis_cms_page_lang`, `melis_cms_page_published`, `melis_cms_page_saved`, `melis_cms_page_seo`, `melis_cms_page_style`, `melis_cms_page_default_urls` |
| Sites | `melis_cms_site`, `melis_cms_site_domain`, `melis_cms_site_home`, `melis_cms_site_langs`, `melis_cms_site_config`, `melis_cms_site_bundle`, `melis_cms_site_301`, `melis_cms_site_404` |
| Langues / i18n | `melis_cms_lang`, `melis_site_translation`, `melis_site_translation_text` |
| Templates / styles | `melis_cms_template`, `melis_cms_style`, `melis_cms_mini_tpl_category`, `melis_cms_mini_tpl_category_trans`, `melis_cms_mini_tpl_category_template`, `melis_cms_mini_tpl_site_category`, `melis_cms_mini_tpl_flagged_template` |
| Plateforme / RGPD | `melis_cms_platform_ids`, `melis_cms_gdpr_texts` |

## Exemple

Résoudre une page et construire son lien public depuis tout contexte disposant du service manager :

```php
$pageSvc = $this->getServiceManager()->get('MelisEnginePage');
$treeSvc = $this->getServiceManager()->get('MelisEngineTree');

$page = $pageSvc->getDatasPage($idPage, 'published');   // données complètes de la page publiée
$url  = $treeSvc->getPageLink($idPage, true);           // URL absolue
$crumb = $treeSvc->getPageBreadcrumb($idPage);          // fil d'Ariane
```

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Config module (services, routes, caches) | `vendor/melisplatform/melis-engine/config/module.config.php` |
| Exposition micro-service | `vendor/melisplatform/melis-engine/config/app.microservice.php` |
| Service de données de page | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| Service arbre / liens | `vendor/melisplatform/melis-engine/src/Service/MelisTreeService.php` |
| Système de cache | `vendor/melisplatform/melis-engine/src/Service/MelisEngineCacheSystemService.php` |
| Classe de base des plugins de templating | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Table-gateways | `vendor/melisplatform/melis-engine/src/Model/Tables/` |
| Schéma + deltas | `vendor/melisplatform/melis-engine/install/sql/`, `install/dbdeploy/` |
