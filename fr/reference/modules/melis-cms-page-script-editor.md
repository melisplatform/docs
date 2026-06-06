# MelisCmsPageScriptEditor

> Injecte des scripts/balises personnalisés dans le `<head>` et la fin du `<body>` des pages du
> front-office, par page et par site. Paquet Composer `melisplatform/melis-cms-page-script-editor`.

## Objectif

MelisCmsPageScriptEditor permet aux contributeurs de coller du balisage brut (tags analytics,
balises meta, JS/CSS tiers…) qui est injecté dans une page lors de son rendu sur le front-office.
Les scripts sont stockés à deux niveaux — **par site** et **par page** — et fusionnés au moment du
rendu. Une page peut aussi être marquée comme **exception** afin d'ignorer les scripts du site et
n'utiliser que les siens. L'injection est entièrement automatique : un listener MVC réécrit le HTML
de la réponse sur la route front, sans aucune modification de templating.

## Activation

C'est un module Laminas standard. Ajoutez-le à `config/melis.module.load.php` (déjà présent dans ce
skeleton) :

```php
return [
    // …
    'MelisCmsPageScriptEditor',
];
```

Dépendances Composer (`composer.json`) : `melis-core`, `melis-cms`. Le module embarque
`dbdeploy: true`, ses tables sont donc créées/mises à jour via
[melis-dbdeploy](/fr/reference/modules). Les scripts s'éditent depuis l'éditeur de page CMS et
l'outil Sites — voir [Construire un site](/fr/guide/build-a-site).

## Services principaux

Déclarés comme alias `service_manager` dans `config/module.config.php`.

| Alias | Rôle |
| --- | --- |
| `MelisCmsPageScriptEditorService` | La logique métier des scripts (enregistrement, lecture, fusion, injection). Émet des événements `meliscmspagescripteditor_*`. |
| `MelisCmsScriptTable` | Passerelle de table pour `melis_cms_scripts` (scripts site & page). |
| `MelisCmsScriptExceptionTable` | Passerelle de table pour `melis_cms_scripts_exceptions` (pages excluant les scripts du site). |

`MelisCmsPageScriptEditorService` (étend `MelisCore\Service\MelisGeneralService`) expose :

| Méthode | Rôle |
| --- | --- |
| `addScript($siteId, $pageId, $headTopScript, $headBottomScript, $bodyBottomScript, $mcs_id)` | Insère/met à jour une ligne de scripts (n'enregistre que si au moins un des trois champs est non vide). |
| `addScriptException($siteId, $pageId)` | Marque une page comme excluant les scripts du site (sans effet si déjà présente). |
| `getScriptsPerSite($siteId)` | Ligne(s) de scripts pour un identifiant de site. |
| `getScriptsPerPage($pageId)` | Ligne(s) de scripts pour un identifiant de page. |
| `getScriptsExceptionPerPage($pageId)` | Ligne(s) d'exception pour un identifiant de page. |
| `getScriptExceptions($siteId, $sortColumn, $sortOrder)` | Liste des pages qui excluent les scripts du site (utilisée par le tableau de l'outil Sites). |
| `getMixedScriptsPerPage($pageId)` | Résout les scripts finaux `headTopScript` / `headBottomScript` / `bodyBottomScript` d'une page — site + page fusionnés, ou page seule lorsque la page est une exception. |
| `updatePageScripts($idPage, $contentGenerated)` | Prend le HTML rendu et injecte les scripts fusionnés après `<head>`, avant `</head>` et avant `</body>`. |
| `getSiteId($pageId)` | Résout l'identifiant de site d'une page (vérifie la page publiée puis la page sauvegardée). |

`MelisCmsScriptExceptionTable::getScriptExceptions($siteId, $orderColumn, $order)` renvoie la liste
des exceptions jointe aux noms de pages pour la grille de l'outil Sites.

## Back-office

Deux surfaces d'édition sont déclarées dans `config/app.toolstree.php` / `config/app.tools.php`,
greffées dans l'interface CMS existante :

- **Onglet de l'éditeur de page** — un onglet **Scripts** dans l'édition de page (melisKey
  `meliscms_page_script_editor`, contrôleur
  `MelisCmsPageScriptEditor\Controller\MelisCmsPageScriptEditorPageEdition`, action
  `render-page-script-editor`). Il héberge le formulaire `meliscmspagescripteditor_script_form`
  (`mcs_head_top`, `mcs_head_bottom`, `mcs_body_bottom`) plus la case
  `meliscmspagescripteditor_script_exception_form` (`mcse_exclude_site_scripts`) pour exclure les
  scripts du site sur cette page.
- **Onglet de l'outil Sites** — un onglet **Scripts** dans l'*Édition du site* de l'outil Sites
  (melisKey `meliscms_tool_sites_scripts`, contrôleur `MelisCmsPageScriptEditorToolSiteEdition`,
  action `render-tool-site-scripts`). Il édite les scripts au niveau du site (mêmes trois champs)
  et liste les pages exclues via le tableau `meliscmspagescripteditor_site_script_exceptions`
  (ajax `…/MelisCmsPageScriptEditorToolSiteEdition/getScriptExceptions`), avec une action de
  suppression d'exception.

Le routage back-office est le segment standard
`/melis/MelisCmsPageScriptEditor/<Controller>/<action>`. L'enregistrement est piloté par événements
plutôt que par un post direct du formulaire : `onBootstrap` (dans `src/Module.php`) attache des
listeners qui déclenchent les actions de sauvegarde lors de la sauvegarde/publication de la page ou
du site.

| Listener | Événements (`MelisCms`) | Rôle |
| --- | --- | --- |
| `MelisCmsPageScriptEditorSavePageListener` | `meliscms_page_save_start`, `meliscms_page_publish_start` | Déclenche `MelisCmsPageScriptEditorPageEdition::saveScript` pour persister l'onglet Scripts de la page. |
| `MelisCmsPageScriptEditorSaveSiteScriptListener` | `meliscms_site_save_end` | Déclenche `MelisCmsPageScriptEditorToolSiteEdition::saveSiteScript` pour persister l'onglet Scripts du site. |
| `MelisCmsPageScriptEditorDuplicatePageListener` | `meliscms_page_duplicate_*`, `melis_cms_duplicate_page_*` | Copie les scripts et l'indicateur d'exception de la page source vers la page dupliquée. |

Pour créer votre propre outil, voir [Créer un outil](/fr/guide/create-a-tool).

## Front-office

L'injection n'est **pas** un plugin de templating — elle se fait via un listener MVC :

| Listener | Événement | Rôle |
| --- | --- | --- |
| `MelisCmsPageScriptEditorScriptTagListener` | `MvcEvent::EVENT_FINISH` (route front uniquement, priorité 70) | Lors d'un rendu front, appelle `MelisCmsPageScriptEditorService::updatePageScripts($idpage, $content)` et remplace le corps de la réponse par le HTML enrichi des scripts. Ignore les URI non-PHP/assets. |

Un view helper est aussi enregistré pour l'enregistrement programmatique :

| Élément | Nom | Rôle |
| --- | --- | --- |
| View helper | `melisCmsPageScriptEditorAddScript` (`src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php`) | `addScriptData($serviceManager, $scriptData, $siteId, $pageId)` enregistre une ligne de scripts via le service, ou la supprime lorsque tous les champs sont vidés. |

## Tables de base de données

Créées par `install/dbdeploy/` (gérées par melis-dbdeploy) :

| Table | Rôle |
| --- | --- |
| `melis_cms_scripts` | Un jeu de scripts par site **ou** par page : `mcs_id`, `mcs_site_id`, `mcs_page_id`, `mcs_head_top`, `mcs_head_bottom`, `mcs_body_bottom`, `mcs_date_edition`, `mcs_user_id`. |
| `melis_cms_scripts_exceptions` | Pages qui ignorent les scripts du site : `mcse_id`, `mcse_site_id`, `mcse_page_id`, `mcse_date_creation`, `mcse_user_id`. |

## Exemple

Résoudre et lire les scripts finaux qui seraient injectés dans une page, puis observer ce que fait
le listener front au moment du rendu :

```php
$scriptSrv = $serviceManager->get('MelisCmsPageScriptEditorService');

// Scripts site + page fusionnés (page seule lorsque la page est une exception)
$scripts = $scriptSrv->getMixedScriptsPerPage($pageId);
// $scripts['headTopScript'], $scripts['headBottomScript'], $scripts['bodyBottomScript']

// Même fusion appliquée au HTML rendu (ce qu'appelle le listener front EVENT_FINISH)
$html = $scriptSrv->updatePageScripts($pageId, $renderedHtml);
```

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Module / chargement de la config | `vendor/melisplatform/melis-cms-page-script-editor/src/Module.php` |
| Câblage (services, routes, helpers) | `vendor/melisplatform/melis-cms-page-script-editor/config/module.config.php` |
| Onglets back-office (arbre d'interface) | `vendor/melisplatform/melis-cms-page-script-editor/config/app.toolstree.php` |
| Formulaires & config de tableau back-office | `vendor/melisplatform/melis-cms-page-script-editor/config/app.tools.php` |
| Service | `vendor/melisplatform/melis-cms-page-script-editor/src/Service/MelisCmsPageScriptEditorService.php` |
| Listener d'injection front | `vendor/melisplatform/melis-cms-page-script-editor/src/Listener/MelisCmsPageScriptEditorScriptTagListener.php` |
| Listeners de sauvegarde / duplication | `vendor/melisplatform/melis-cms-page-script-editor/src/Listener/` |
| View helper | `vendor/melisplatform/melis-cms-page-script-editor/src/View/Helper/MelisCmsPageScriptEditorAddScriptHelper.php` |
| Tables | `vendor/melisplatform/melis-cms-page-script-editor/src/Model/Tables/MelisCmsScriptTable.php`, `MelisCmsScriptExceptionTable.php` |
| SQL d'installation | `vendor/melisplatform/melis-cms-page-script-editor/install/dbdeploy/22020801_melis_cms_page_script_editor_install.sql` |

Voir aussi : [Référence des modules](/fr/reference/modules) ·
[Construire un site](/fr/guide/build-a-site) · [Plugins](/fr/guide/plugins).
