# MelisFlyway

> Visionneuse back-office légère qui intègre une page Flyway externe dans un `<iframe>` sous Dev Tools. Package `melisplatform/melis-flyway`.

## Présentation

MelisFlyway est un module Dev Tools à écran unique qui lit une URL depuis la clé de configuration de la plateforme `flyway` et l'affiche dans un `<iframe>` à l'intérieur de l'administration Melis. Il n'exécute pas lui-même les migrations de base de données — c'est uniquement une visionneuse. Le module dépend exclusivement de `melisplatform/melis-core` (`^5.1|^5.2`).

::: warning La clé `flyway` doit être une URL
Malgré la formulation du README (« chemin vers l'exécutable Flyway »), le contrôleur affecte `config['flyway']` directement à l'attribut `src` de l'iframe. Définissez-la avec une **URL** (par exemple un rapport web Flyway ou une page Flyway derrière un reverse proxy), et non un chemin CLI. Si la clé est absente, le `src` de l'iframe sera vide.
:::

::: info Squelette présent dans les sources
`MelisFlywayService` et les points d'entrée `config/app.microservice.php` sont du code squelette non connecté — ils font référence à une `FlywayTable` qui n'existe pas et ne sont jamais appelés. Ce module ne propose aucune API CRUD Flyway ni de migration ; le seul comportement fonctionnel est l'iframe.
:::

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisFlyway',
];
```

Nécessite que `MelisCore` soit chargé en premier.

## Configuration

Définissez la clé `flyway` dans la configuration de votre plateforme avec l'URL à intégrer :

```php
// config/autoload/platforms/[your-platform].php (ou équivalent)
return [
    'flyway' => 'https://your-flyway-report.example.com',
    // ...
];
```

Le contrôleur lit cette valeur à la requête :

```php
$view->url = $this->getServiceManager()->get('config')['flyway'] ?? '';
```

## Back-office

L'outil apparaît dans le menu de gauche sous **MelisCore → Dev Tools → Flyway** (icône de section Dev Tools : `fa fa-code` ; icône de l'outil : `fa fa-puzzle-piece`). Son ouverture affiche la page ciblée par l'URL `flyway`, dimensionnée pour remplir la fenêtre. Il n'y a rien à configurer à l'intérieur de l'outil.

| Entrée | Cible de la route |
| --- | --- |
| `melis_flyway_tool` | `MelisFlyway / Index / render-iframe` |

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Enregistrement du menu / de l'outil | `vendor/melisplatform/melis-flyway/config/app.toolstree.php` |
| Formulaires microservice (inutilisés) | `vendor/melisplatform/melis-flyway/config/app.microservice.php` |
| Enregistrement des routes + contrôleur/service | `vendor/melisplatform/melis-flyway/config/module.config.php` |
| Contrôleur (action iframe) | `vendor/melisplatform/melis-flyway/src/Controller/IndexController.php` |
| Stub de service (non connecté) | `vendor/melisplatform/melis-flyway/src/Service/FlywayService.php` |
| Bootstrap du module | `vendor/melisplatform/melis-flyway/src/Module.php` |
| Vue iframe | `vendor/melisplatform/melis-flyway/view/melis-flyway/index/render-iframe.phtml` |

## Détail d'implémentation

`IndexController::renderIframeAction()` contient toute la logique du module :

```php
$view = new ViewModel();
$view->url = $this->getServiceManager()->get('config')['flyway'] ?? '';
return $view;
```

La vue `render-iframe.phtml` affiche un `<iframe src="<?= $this->url ?>">` ainsi qu'un petit script `updateIframe()` qui ajuste sa hauteur à celle de la fenêtre. `Module.php` est du code boilerplate (écouteur de routes, config/autoloader) sans gestionnaires d'événements personnalisés.

Voir aussi : [MelisCore](/fr/reference/modules/melis-core)
