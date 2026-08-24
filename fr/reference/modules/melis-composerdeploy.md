# MelisComposerDeploy

> Intègre Composer au sein de la plateforme pour installer, mettre à jour et supprimer des modules par programmation. Paquet `melisplatform/melis-composerdeploy`.

## Présentation

MelisComposerDeploy permet à la plateforme d'**exécuter Composer depuis l'intérieur de l'application** — installer, mettre à jour ou supprimer des modules sans accès au terminal. C'est le moteur sans interface (headless) qui alimente l'**outil Modules / marketplace** du back-office ainsi que l'assistant de premier démarrage de MelisInstaller. Il se situe dans la couche fondationnelle de MelisCore aux côtés de MelisAssetManager, MelisDbDeploy et MelisInstaller, et ne dépend que de `composer/composer` (aucun couplage à MelisCore).

## Pas de back-office React

MelisComposerDeploy n'a **aucune interface React ni aucun outil de back-office** — que ce soit dans le back-office historique ou dans le back-office React (`/melis-react`). Il ne fournit aucune brique `ui-react/`, aucun `brick.manifest.json`, aucun `config/react-api.php` ni aucun contrôleur. Il n'apparaît jamais dans la barre latérale et il n'y a rien sur quoi cliquer.

Sa relation avec le back-office React est **indirecte** : lorsque vous installez un module via la marketplace, MelisComposerDeploy télécharge le paquet Composer. Si ce paquet embarque une brique React précompilée, le shell React découvre la brique **une fois le module actif** — mais la découverte des briques est prise en charge par `melis-react-api`, et non par ce module. MelisComposerDeploy ne touche, ne construit ni ne sert jamais d'assets React.

> Sur les environnements déployés où l'ensemble de `vendor/` est versionné (pas de `composer install` côté serveur), MelisComposerDeploy est le moteur de la *marketplace à l'exécution* — et non le mécanisme qui livre l'application React précompilée.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisComposerDeploy',
];
```

## Service principal

Le module se résume pour l'essentiel à un seul service, aliasé `MelisComposerService` (`config/module.config.php` → `service_manager.aliases`), classe `MelisComposerDeploy\Service\MelisComposerService`. Il construit une commande console Composer et l'exécute en mémoire (in-process) via Symfony Console, pilotant la bibliothèque Composer embarquée sous `bin/extracted-composer/`.

| Alias de service | Rôle |
| --- | --- |
| `MelisComposerService` | Exécuteur Composer en mémoire. Expose `download()`, `update()`, `remove()`, `dumpAutoload()`, ainsi que `setDocumentRoot()` et `setDryRun()`. |

```php
$composer = $sm->get('MelisComposerService');

$composer->setDocumentRoot($projectRoot);            // composer working-dir (defaults to DOCUMENT_ROOT/../)
$composer->setDryRun(true);                           // simulate without writing (--dry-run)

$composer->download('melisplatform/melis-cms-news');  // composer require <pkg>[:version]
$composer->update('melisplatform/melis-cms-news');    // composer update --root-reqs
$composer->remove('melisplatform/melis-cms-news');    // composer remove --no-scripts
$composer->dumpAutoload();                             // composer dump-autoload
```

Notes issues du code source :

- **Commandes autorisées uniquement** : `install`, `update`, `dump-autoload`, `require`, `remove`. Toute autre commande renvoie une réponse « unknown command ».
- **Durcissement des arguments** : la chaîne `package[:version]` est validée contre une expression régulière stricte `vendor/name` + semver, et rejette les espaces, empêchant ainsi l'injection d'arguments dans la ligne de commande Composer.
- Les commandes s'exécutent avec `--ignore-platform-reqs --no-progress --no-scripts --prefer-dist` et `--working-dir=<docRoot>`.
- Aucune route, aucun contrôleur, aucun événement, aucune vue — il s'agit d'un service invoqué par d'autres modules.

## Pipeline de déploiement

Les appelants pilotent le service ; un flux d'installation à l'exécution typique :

```text
MelisComposerService::download(pkg)   →  composer require (package downloaded into vendor/)
        ↓
MelisComposerService::dumpAutoload()  →  autoloader regenerated (new classes visible)
        ↓
MelisDbDeploy                          →  applies the new module's SQL deltas (extra.dbdeploy: true)
        ↓
module active                          →  MelisAssetManager serves its assets; if the module ships
                                          a React brick, the React shell discovers it (via
                                          melis-react-api /react-modules)
```

La dernière flèche est le seul point de contact, passif, avec le back-office React : ce module rend le module présent et actif ; la découverte des briques React relève entièrement de `melis-react-api`.

Voir aussi : [MelisDbDeploy](/reference/modules/melis-dbdeploy), [MelisInstaller](/reference/modules/melis-installer), [MelisAssetManager](/reference/modules/melis-asset-manager)
