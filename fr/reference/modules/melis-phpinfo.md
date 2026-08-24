# MelisPhpinfo

> Outil de diagnostic en lecture seule qui affiche la sortie native de `phpinfo()` de PHP dans le back-office React de Melis. Package `melisplatform/melis-phpinfo`.

## Présentation

MelisPhpinfo est un module Dev Tools à écran unique qui capture la sortie de `phpinfo()` et l'affiche dans l'administration Melis, permettant à un administrateur d'inspecter la version PHP du serveur, les extensions chargées, les directives de `php.ini`, les variables d'environnement et les chemins sans accès au shell. Il ne possède ni couche base de données, ni service, ni modèle — uniquement un contrôleur et trois zones de vue. En v6, il est livré sous la forme d'une **brique iframe** dans le back-office React : la page React monte une iframe persistante qui charge l'outil legacy existant à l'intérieur du shell React. Il n'y a ni couche d'API React, ni fichier de capacités.

::: warning Note de sécurité
`phpinfo()` expose des informations sensibles — chemins absolus, modules chargés, variables d'environnement (potentiellement des identifiants ou clés d'API) et options de compilation. L'outil est placé sous **Dev Tools** intentionnellement ; limitez son accès aux administrateurs de confiance et masquez les secrets avant de partager toute capture d'écran.
:::

## Activation

Ajoutez dans `config/melis.module.load.php` :

```php
return [
    'MelisPhpinfo',
];
```

`MelisCore` doit être chargé en premier. La brique React n'apparaît que si le module est activé — la découverte des briques (`GET /melis/react-api/react-modules`) liste les modules actifs qui fournissent un `brick.manifest.json` ; désactiver le module supprime le nœud de menu.

## Back-office (React)

L'outil apparaît dans le menu de gauche sous **MelisCore → Dev Tools → PHP Info**. Il s'ouvre dans un onglet supérieur nommé **PHP Info** et affiche le rapport `phpinfo()` complet, mis en forme pour s'intégrer à l'administration Melis ; un bref indicateur de chargement apparaît le temps que l'iframe se charge la première fois. Le rapport pouvant être long, faites défiler la zone de l'outil pour atteindre une section donnée (Core, extensions, chemins, environnement). Il n'existe qu'une seule vue — pas de bascule Nouveau/Ancien — et rien n'est modifiable.

## Anatomie de la brique

La présence React prend la forme d'une **brique iframe** : `PhpinfoPage.tsx` n'implémente aucune interface React native. Elle crée une iframe persistante (`id="melis-brick-frame-phpinfo"`) dont le `src` est `/melis/react-tool-page?key=melis_phpinfo_tool`, l'ajoute une seule fois au `<body>`, puis se contente de la positionner ou de l'afficher/masquer au-dessus d'un `<div>` d'ancrage lors des changements d'onglet, de sorte qu'elle ne se recharge jamais. La cible de l'iframe — servie par **MelisReactOverride** — rend l'outil PHP Info legacy classique.

| Élément | Valeur |
| --- | --- |
| Identifiant de la brique | `phpinfo` |
| `route` du manifest | `/melis-core/phpinfo` |
| `label` | `PHP Info` |
| `forwardKey` | `MelisPhpinfo/List` |
| `melisKey` (cible de l'iframe) | `melis_phpinfo_tool` |
| `entry` | `brick.js` |
| API React | aucune (pas de `config/react-api.php`) |
| Capacités | aucune (pas de `config/react.capabilities.php`) — accès contrôlé par le droit `melis_phpinfo_tool` |

Manifest (`public/ui-react/brick.manifest.json`) :

```json
{
  "id": "phpinfo",
  "route": "/melis-core/phpinfo",
  "label": "PHP Info",
  "forwardKey": "MelisPhpinfo/List",
  "melisKey": "melis_phpinfo_tool",
  "entry": "brick.js"
}
```

## Accès

Il n'existe aucune capacité fine : l'accès est tout ou rien, contrôlé par le droit d'outil `melis_phpinfo_tool`. Le menu React n'émet le nœud que si l'utilisateur `canAccess('melis_phpinfo_tool')` (super-administrateurs avec `usr_admin=1`, ou utilisateurs auxquels le droit a été accordé). La vue de contenu legacy revérifie le même droit côté serveur avant d'exécuter `phpinfo()`, de sorte que même une requête forgée à la main vers la zone de contenu renvoie une réponse vide pour les autres.

```php
// src/Controller/ListController.php — renderToolContentAction()
$view->accessAllowed = $this->isPhpinfoAccessAllowed(); // only then does the view run phpinfo()
// isPhpinfoAccessAllowed(): authenticated identity + MelisCoreRights::canAccess('melis_phpinfo_tool')
```

## Zones de vue

L'outil legacy (chargé dans l'iframe) se compose de trois zones, inchangées en v6 :

| Identifiant de zone | Rôle |
| --- | --- |
| `melis_phpinfo_tool` | Conteneur — redirige vers `MelisPhpinfo/List/render-tool` |
| `melis_phpinfo_header` | Barre de titre (`render-tool-header`) |
| `melis_phpinfo_content` | Le rapport `phpinfo()` (`render-tool-content`) |

## Détail d'implémentation

La sortie de `phpinfo()` est produite entièrement dans la couche vue. Les actions du contrôleur retournent un `ViewModel` vide, sans aucune donnée transmise depuis PHP vers la vue ; la vue du rapport capture et assainit la sortie :

```php
ob_start();
phpinfo();
$phpInfoContent = ob_get_clean();
// Strip phpinfo()'s own <style> so the page inherits Melis admin CSS
$filtredPhpInfoContent = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $phpInfoContent);
echo $filtredPhpInfoContent;
```

La logique métier reste côté serveur : la brique React n'est que l'outil PHP Info legacy intégré dans le shell React.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Point d'entrée de la brique | `ui-react/src/brick.tsx` (enregistre l'id `phpinfo` → `PhpinfoPage`) |
| Page React (wrapper d'iframe) | `ui-react/src/PhpinfoPage.tsx` |
| Bundle compilé / manifest | `public/ui-react/brick.js` · `public/ui-react/brick.manifest.json` |
| Enregistrement du menu / des zones | `config/app.toolstree.php` |
| Configuration de l'outil | `config/app.tools.php` · `config/app.interface.php` |
| Enregistrement des routes et du contrôleur | `config/module.config.php` |
| Contrôleur (3 actions légères, accès contrôlé) | `src/Controller/ListController.php` |
| Vue du rapport | `view/melis-phpinfo/list/render-tool-content.phtml` |

Voir aussi : [MelisCore](/fr/reference/modules/melis-core)
