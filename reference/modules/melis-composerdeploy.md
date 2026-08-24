# MelisComposerDeploy

> Embeds Composer inside the platform to install, update and remove modules programmatically. Package `melisplatform/melis-composerdeploy`.

## Purpose

MelisComposerDeploy lets the platform **run Composer from inside the application** — installing, updating or removing modules without terminal access. It is the headless engine behind the back-office **Modules tool / marketplace** and the MelisInstaller first-run wizard. It sits in the MelisCore foundation layer alongside MelisAssetManager, MelisDbDeploy and MelisInstaller, and depends only on `composer/composer` (no coupling to MelisCore).

## No React back-office

MelisComposerDeploy has **no React UI and no back-office tool** — in either the legacy or the React back-office (`/melis-react`). It ships no `ui-react/` brick, no `brick.manifest.json`, no `config/react-api.php`, and no controller. It never appears in the sidebar and there is nothing to click.

Its relationship to the React back-office is **indirect**: when you install a module through the marketplace, MelisComposerDeploy downloads the Composer package. If that package carries a built React brick, the React shell discovers the brick **once the module is active** — but brick discovery is handled by `melis-react-api`, not by this module. MelisComposerDeploy never touches, builds or serves React assets.

> On deployed environments where all of `vendor/` is committed (no server-side `composer install`), MelisComposerDeploy is the *runtime marketplace* engine — not the mechanism that ships the pre-built React app.

## Enable it

Add to `config/melis.module.load.php`:

```php
return [
    'MelisComposerDeploy',
];
```

## Key service

The whole module is essentially one service, aliased `MelisComposerService` (`config/module.config.php` → `service_manager.aliases`), class `MelisComposerDeploy\Service\MelisComposerService`. It builds a Composer console command and runs it in-process via Symfony Console, driving the vendored Composer library shipped under `bin/extracted-composer/`.

| Service alias | Role |
| --- | --- |
| `MelisComposerService` | In-process Composer runner. Exposes `download()`, `update()`, `remove()`, `dumpAutoload()`, plus `setDocumentRoot()` and `setDryRun()`. |

```php
$composer = $sm->get('MelisComposerService');

$composer->setDocumentRoot($projectRoot);            // composer working-dir (defaults to DOCUMENT_ROOT/../)
$composer->setDryRun(true);                           // simulate without writing (--dry-run)

$composer->download('melisplatform/melis-cms-news');  // composer require <pkg>[:version]
$composer->update('melisplatform/melis-cms-news');    // composer update --root-reqs
$composer->remove('melisplatform/melis-cms-news');    // composer remove --no-scripts
$composer->dumpAutoload();                             // composer dump-autoload
```

Notes from source:

- **Allowed commands only**: `install`, `update`, `dump-autoload`, `require`, `remove`. Anything else returns an "unknown command" response.
- **Argument hardening**: the `package[:version]` string is validated against a strict `vendor/name` + semver-ish regex and rejects whitespace, preventing argument injection into the Composer command line.
- Commands run with `--ignore-platform-reqs --no-progress --no-scripts --prefer-dist` and `--working-dir=<docRoot>`.
- No routes, no controller, no events, no view — it is a service invoked by other modules.

## Deploy pipeline

Callers drive the service; a typical runtime install flow:

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

The last arrow is the only, passive, contact point with the React back-office: this module makes the module present and active; React brick discovery belongs entirely to `melis-react-api`.

See also: [MelisDbDeploy](/reference/modules/melis-dbdeploy), [MelisInstaller](/reference/modules/melis-installer), [MelisAssetManager](/reference/modules/melis-asset-manager)
