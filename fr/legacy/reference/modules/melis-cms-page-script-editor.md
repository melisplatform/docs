# MelisCmsPageScriptEditor

> Injecte des scripts et styles personnalisés dans le `<head>` et le `<body>` des pages du
> front-office, par page et par site, sans modifier les templates. Paquet `melisplatform/melis-cms-page-script-editor`.

## Présentation

MelisCmsPageScriptEditor vous permet d'ajouter du balisage brut — tags analytics, pixels de
tracking, widgets tiers, blocs `<script>`/`<style>` personnalisés — à vos pages et sites, et de les
faire injecter automatiquement dans le HTML rendu. Trois emplacements d'injection sont disponibles :
**head top** (juste après `<head>`), **head bottom** (juste avant `</head>`), et **body bottom**
(juste avant `</body>`). Les scripts peuvent être limités à l'ensemble du site ou à une seule page ;
une page peut également être marquée comme exception pour exclure les scripts du site.

## Activation

Ajoutez à `config/melis.module.load.php` :

```php
return [
    'MelisCmsPageScriptEditor',
];
```

Nécessite `melis-core` et `melis-cms` (`^5.2`). Le module est marqué `dbdeploy: true`, ses tables
sont donc créées automatiquement par melis-dbdeploy.

> **Activation par site :** l'injection n'est effective sur un site qu'une fois le module chargé
> pour ce site dans MelisCms → Sites → Chargement des modules. Les scripts peuvent être édités dans
> le back-office avant cela, mais rien n'est injecté en front tant que le module n'est pas activé
> sur le site.

## Services principaux

| Alias | Rôle |
| --- | --- |
| `MelisCmsPageScriptEditorService` | Toute la logique métier des scripts : enregistrement, lecture, fusion et injection. |
| `MelisCmsScriptTable` | Passerelle de table pour `melis_cms_scripts`. |
| `MelisCmsScriptExceptionTable` | Passerelle de table pour `melis_cms_scripts_exceptions`. |

`MelisCmsPageScriptEditorService` expose les méthodes suivantes :

| Méthode | Rôle |
| --- | --- |
| `addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId)` | Insère ou met à jour une ligne de scripts pour un site ou une page. |
| `addScriptException($siteId, $pageId)` | Marque une page comme excluant les scripts du site. |
| `getScriptExceptions($siteId, $sortCol, $sortOrder)` | Liste les pages qui excluent les scripts du site (utilisée par le tableau de l'outil Sites). |
| `getScriptsPerSite($siteId)` | Récupère la ou les lignes de scripts pour un site. |
| `getScriptsPerPage($pageId)` | Récupère la ou les lignes de scripts pour une page. |
| `getScriptsExceptionPerPage($pageId)` | Récupère la ou les lignes d'exception pour une page. |
| `getMixedScriptsPerPage($pageId)` | Résout les scripts finaux d'une page — site + page fusionnés, ou page seule lorsque la page est une exception. Utilisé par le listener de rendu front. |
| `updatePageScripts($pageId, $html)` | Injecte les scripts fusionnés dans le HTML rendu (après `<head>`, avant `</head>`, avant `</body>`). |
| `getSiteId($pageId)` | Résout l'identifiant de site pour une page donnée. |

## Back-office

Deux onglets **Scripts** sont injectés dans l'interface CMS existante via `config/app.toolstree.php` :

| Surface | melisKey | Contrôleur | Contenu |
| --- | --- | --- | --- |
| Éditeur de page → onglet Scripts | `meliscmspagescripteditor_page_edition` | `MelisCmsPageScriptEditorPageEditionController` | Trois zones de texte (`mcs_head_top`, `mcs_head_bottom`, `mcs_body_bottom`) plus une case à cocher *exclure les scripts du site* (`mcse_exclude_site_scripts`). |
| Outil Sites → onglet Scripts | `meliscms_tool_sites_scripts` | `MelisCmsPageScriptEditorToolSiteEditionController` | Les mêmes trois emplacements pour les scripts du site, plus un DataTable d'exceptions (`meliscmspagescripteditor_site_script_exceptions`) listant chaque page exclue, avec une action de suppression d'exception et un formulaire d'ajout. |

L'enregistrement est piloté par événements. `Module.php::onBootstrap` enregistre ces listeners :

| Listener | Déclencheur | Rôle |
| --- | --- | --- |
| `MelisCmsPageScriptEditorSavePageListener` | Sauvegarde / publication de page (BO) | Persiste les scripts de la page et son exception d'exclusion du site. |
| `MelisCmsPageScriptEditorSaveSiteScriptListener` | Sauvegarde du site (BO) | Persiste les scripts du site. |
| `MelisCmsPageScriptEditorDuplicatePageListener` | Duplication de page (BO) | Copie les scripts et l'indicateur d'exception vers la nouvelle page. |

## Front office

L'injection se fait via un listener MVC, et non via un plugin de template :

| Listener | Déclencheur | Rôle |
| --- | --- | --- |
| `MelisCmsPageScriptEditorScriptTagListener` | Rendu de page (front) | Appelle `getMixedScriptsPerPage()` et injecte les scripts résolus : head-top après `<head>`, head-bottom avant `</head>`, body-bottom avant `</body>`. |

Le view helper `melisCmsPageScriptEditorAddScript`
(`src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php`) offre un accès programmatique pour
enregistrer une ligne de scripts via le service.

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_cms_scripts` | Un jeu de scripts par site ou par page : `mcs_id`, `mcs_site_id`, `mcs_page_id`, `mcs_head_top`, `mcs_head_bottom`, `mcs_body_bottom`, `mcs_date_edition`, `mcs_user_id`. |
| `melis_cms_scripts_exceptions` | Pages qui ignorent les scripts du site : `mcse_id`, `mcse_site_id`, `mcse_page_id`, `mcse_date_creation`, `mcse_user_id`. |

## Exemple

```php
$scripts = $this->getServiceManager()->get('MelisCmsPageScriptEditorService');

// Résoudre les scripts finaux d'une page (site + page fusionnés, ou page seule si exception)
$resolved = $scripts->getMixedScriptsPerPage($pageId);
// $resolved contains headTopScript, headBottomScript, bodyBottomScript

// Enregistrer les scripts pour un site ou une page
$scripts->addScript($siteId, $pageId, $headTop, $headBottom, $bodyBottom, $mcsId);

// Marquer une page comme exception (elle ne recevra plus les scripts du site)
$scripts->addScriptException($siteId, $pageId);

// Lister toutes les pages exclues des scripts du site
$exceptions = $scripts->getScriptExceptions($siteId, $sortCol, $sortOrder);
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Bootstrap du module & câblage des listeners | `vendor/melisplatform/melis-cms-page-script-editor/src/Module.php` |
| Câblage des services (services, routes, helpers) | `vendor/melisplatform/melis-cms-page-script-editor/config/module.config.php` |
| Onglets back-office (arbre d'interface) | `vendor/melisplatform/melis-cms-page-script-editor/config/app.toolstree.php` |
| Formulaires & tableau des exceptions back-office | `vendor/melisplatform/melis-cms-page-script-editor/config/app.tools.php` |
| Service | `vendor/melisplatform/melis-cms-page-script-editor/src/Service/MelisCmsPageScriptEditorService.php` |
| Listener d'injection front | `vendor/melisplatform/melis-cms-page-script-editor/src/Listener/MelisCmsPageScriptEditorScriptTagListener.php` |
| Listeners de sauvegarde / duplication | `vendor/melisplatform/melis-cms-page-script-editor/src/Listener/` |
| View helper | `vendor/melisplatform/melis-cms-page-script-editor/src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php` |
| Passerelles de table | `vendor/melisplatform/melis-cms-page-script-editor/src/Model/Tables/` |
| SQL d'installation | `vendor/melisplatform/melis-cms-page-script-editor/install/dbdeploy/` |

Voir aussi : [Référence des modules](/fr/legacy/reference/modules) · [melis-cms](/fr/legacy/reference/modules/melis-cms) ·
[melis-core](/fr/legacy/reference/modules/melis-core)
