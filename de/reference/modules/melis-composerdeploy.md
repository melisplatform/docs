# MelisComposerDeploy

> Bettet Composer in die Plattform ein, um Module programmgesteuert zu installieren, zu aktualisieren und zu entfernen. Paket `melisplatform/melis-composerdeploy`.

## Zweck

MelisComposerDeploy ermöglicht es der Plattform, **Composer aus der Anwendung heraus auszuführen** — Module zu installieren, zu aktualisieren oder zu entfernen, ohne Zugriff auf ein Terminal. Es ist die Engine ohne Benutzeroberfläche hinter dem Backoffice-**Modul-Tool / Marketplace** und dem MelisInstaller-Ersteinrichtungsassistenten. Es befindet sich in der Grundlagenschicht von MelisCore neben MelisAssetManager, MelisDbDeploy und MelisInstaller und hängt lediglich von `composer/composer` ab (keine Kopplung an MelisCore).

## Kein React-Backoffice

MelisComposerDeploy verfügt **weder über eine React-Benutzeroberfläche noch über ein Backoffice-Tool** — weder im Legacy- noch im React-Backoffice (`/melis-react`). Es liefert keinen `ui-react/`-Brick, keine `brick.manifest.json`, keine `config/react-api.php` und keinen Controller. Es erscheint niemals in der Seitenleiste, und es gibt nichts anzuklicken.

Seine Beziehung zum React-Backoffice ist **indirekt**: Wenn Sie ein Modul über den Marketplace installieren, lädt MelisComposerDeploy das Composer-Paket herunter. Bringt dieses Paket einen vorgefertigten React-Brick mit, erkennt die React-Shell den Brick, **sobald das Modul aktiv ist** — die Brick-Erkennung wird jedoch von `melis-react-api` übernommen, nicht von diesem Modul. MelisComposerDeploy berührt, erstellt oder liefert niemals React-Assets.

> In bereitgestellten Umgebungen, in denen das gesamte `vendor/`-Verzeichnis eingecheckt ist (kein serverseitiges `composer install`), ist MelisComposerDeploy die *Laufzeit-Marketplace*-Engine — nicht der Mechanismus, der die vorgefertigte React-App ausliefert.

## Aktivierung

Fügen Sie zu `config/melis.module.load.php` hinzu:

```php
return [
    'MelisComposerDeploy',
];
```

## Zentraler Service

Das gesamte Modul besteht im Wesentlichen aus einem einzigen Service, mit dem Alias `MelisComposerService` (`config/module.config.php` → `service_manager.aliases`), Klasse `MelisComposerDeploy\Service\MelisComposerService`. Er baut einen Composer-Konsolenbefehl auf und führt ihn prozessintern über die Symfony Console aus, wobei die mitgelieferte Composer-Bibliothek unter `bin/extracted-composer/` gesteuert wird.

| Service-Alias | Rolle |
| --- | --- |
| `MelisComposerService` | Prozessinterner Composer-Runner. Stellt `download()`, `update()`, `remove()`, `dumpAutoload()` sowie `setDocumentRoot()` und `setDryRun()` bereit. |

```php
$composer = $sm->get('MelisComposerService');

$composer->setDocumentRoot($projectRoot);            // composer working-dir (defaults to DOCUMENT_ROOT/../)
$composer->setDryRun(true);                           // simulate without writing (--dry-run)

$composer->download('melisplatform/melis-cms-news');  // composer require <pkg>[:version]
$composer->update('melisplatform/melis-cms-news');    // composer update --root-reqs
$composer->remove('melisplatform/melis-cms-news');    // composer remove --no-scripts
$composer->dumpAutoload();                             // composer dump-autoload
```

Hinweise aus dem Quellcode:

- **Nur erlaubte Befehle**: `install`, `update`, `dump-autoload`, `require`, `remove`. Alles andere gibt eine Antwort vom Typ „unknown command“ zurück.
- **Argument-Härtung**: Die Zeichenkette `package[:version]` wird gegen einen strikten regulären Ausdruck aus `vendor/name` + semver-ähnlicher Syntax validiert und weist Leerzeichen zurück, wodurch eine Argument-Injektion in die Composer-Befehlszeile verhindert wird.
- Befehle werden mit `--ignore-platform-reqs --no-progress --no-scripts --prefer-dist` und `--working-dir=<docRoot>` ausgeführt.
- Keine Routen, kein Controller, keine Events, keine View — es handelt sich um einen Service, der von anderen Modulen aufgerufen wird.

## Deployment-Pipeline

Die Aufrufer steuern den Service; ein typischer Laufzeit-Installationsablauf:

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

Der letzte Pfeil ist der einzige, passive Berührungspunkt mit dem React-Backoffice: Dieses Modul sorgt dafür, dass das Modul vorhanden und aktiv ist; die Erkennung des React-Bricks gehört ausschließlich zu `melis-react-api`.

Siehe auch: [MelisDbDeploy](/de/reference/modules/melis-dbdeploy), [MelisInstaller](/de/reference/modules/melis-installer), [MelisAssetManager](/de/reference/modules/melis-asset-manager)
