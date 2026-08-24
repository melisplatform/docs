# MelisPhpinfo

> Outil de diagnostic qui affiche la sortie native de `phpinfo()` dans le back-office Melis. Package `melisplatform/melis-phpinfo`.

## Présentation

MelisPhpinfo est un module Dev Tools à écran unique qui capture la sortie de `phpinfo()` et l'affiche dans l'administration Melis, permettant à un administrateur d'inspecter la version PHP du serveur, les extensions chargées et la configuration d'exécution sans accès au shell. Il ne possède ni couche base de données, ni service, ni modèle — uniquement un contrôleur et trois zones de vue. Le module dépend uniquement de `melisplatform/melis-core` (`^5.1|^5.2`) pour le shell du back-office.

::: warning Note de sécurité
`phpinfo()` expose des informations sensibles — chemins absolus, modules chargés, variables d'environnement et options de compilation. L'outil est placé sous **Dev Tools** intentionnellement ; limitez son accès aux administrateurs de confiance et masquez les secrets avant de partager toute capture d'écran.
:::

## Activation

Ajoutez dans `config/melis.module.load.php` :

```php
return [
    'MelisPhpinfo',
];
```

`MelisCore` doit être chargé en premier.

## Back-office

L'outil apparaît dans le menu de gauche sous **MelisCore → Dev Tools → PHP Info** (icône de section Dev Tools : `fa fa-code` ; icône de l'outil : `fa fa-puzzle-piece`). En l'ouvrant, vous obtenez le rapport `phpinfo()` standard, mis en forme pour s'intégrer à l'administration Melis. Aucune configuration n'est nécessaire.

| Identifiant de zone | Rôle |
| --- | --- |
| `melis_phpinfo_tool` | Conteneur — redirige vers `MelisPhpinfo/List/render-tool` |
| `melis_phpinfo_header` | Barre de titre (`render-tool-header`) |
| `melis_phpinfo_content` | Le rapport `phpinfo()` (`render-tool-content`) |

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Enregistrement du menu / des zones | `vendor/melisplatform/melis-phpinfo/config/app.toolstree.php` |
| Nom de l'outil | `vendor/melisplatform/melis-phpinfo/config/app.interface.php` |
| Configuration de l'outil | `vendor/melisplatform/melis-phpinfo/config/app.tools.php` |
| Enregistrement des routes et du contrôleur | `vendor/melisplatform/melis-phpinfo/config/module.config.php` |
| Contrôleur (3 actions légères) | `vendor/melisplatform/melis-phpinfo/src/Controller/ListController.php` |
| Bootstrap du module | `vendor/melisplatform/melis-phpinfo/src/Module.php` |
| Vue conteneur | `vendor/melisplatform/melis-phpinfo/view/melis-phpinfo/list/render-tool.phtml` |
| Vue d'en-tête | `vendor/melisplatform/melis-phpinfo/view/melis-phpinfo/list/render-tool-header.phtml` |
| Vue du rapport | `vendor/melisplatform/melis-phpinfo/view/melis-phpinfo/list/render-tool-content.phtml` |

## Détail d'implémentation

La sortie effective de `phpinfo()` est produite entièrement dans la couche vue. Les trois actions du contrôleur (`renderToolAction`, `renderToolHeaderAction`, `renderToolContentAction`) retournent chacune un `ViewModel` vide ; aucune donnée n'est transmise depuis PHP vers la vue. La vue du rapport capture et assainit la sortie :

```php
ob_start();
phpinfo();
$phpInfoContent = ob_get_clean();
// Strip phpinfo()'s own <style> so the page inherits Melis admin CSS
$filtredPhpInfoContent = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $phpInfoContent);
echo $filtredPhpInfoContent;
```

`Module.php` est un gabarit standard (écouteur de routes, configuration/chargeur automatique) sans écouteurs ni événements personnalisés.

Voir aussi : [MelisCore](/fr/legacy/reference/modules/melis-core)
