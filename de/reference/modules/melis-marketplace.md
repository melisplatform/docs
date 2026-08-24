# MelisMarketPlace

> Modul-Store im Backoffice zum Entdecken, Herunterladen, Aktualisieren und Entfernen von Modulen der
> Melis Platform, nun als nativer React-Katalog bereitgestellt. Paket `melisplatform/melis-marketplace`.

## Zweck

MelisMarketPlace ist der Modul-Store im Backoffice: Er listet jedes auf dem Melis-Packagist-Server
veröffentlichte Paket auf, vergleicht jede installierte Version mit der jeweils neuesten
veröffentlichten Version und ermöglicht es einem Administrator, Module herunterzuladen, zu
aktualisieren oder zu entfernen — sowie vollständige Website-Produkte zu installieren —, ohne das
Backoffice zu verlassen. Für die eigentliche Composer-Arbeit ruft er `MelisComposerService`
(melis-composerdeploy) auf und liest bzw. schaltet den Modulzustand über
`MelisAssetManagerModulesService` (melis-asset-manager).

Sechs Basismodule — **MelisCore, MelisEngine, MelisFront, MelisAssetManager,
MelisComposerDeploy, MelisDbDeploy** — sind als Ausnahmen (ausgenommen) aufgeführt und werden im Store
niemals zum Herunterladen, Aktualisieren oder Entfernen angeboten.

Im React-Backoffice der v6 (`/melis-react`) liefert das Werkzeug einen **nativen Voll-React-Baustein**:
Die Katalogliste und die Detailansicht pro Paket sind in React geschrieben und lesen eine
modul-eigene JSON-`react-api`. Die Mechanik für Installation / Aktualisierung / Entfernung (Composer,
dbdeploy, Ein-/Ausstecken) ist unverändert und läuft weiterhin serverseitig über den Legacy-Controller.

## Aktivierung

Ergänzen Sie `config/melis.module.load.php`:

```php
return [
    'MelisMarketPlace',
];
```

Erfordert `melisplatform/melis-core: ^5.1` und PHP `^8.1|^8.3`. Das Modul registriert ein
`dbdeploy: true`-Flag, sodass jedes von ihm mitgelieferte DB-Delta beim ersten Laden angewendet wird.
Der React-Baustein erscheint nur, solange `MelisMarketPlace` in `config/melis.module.load.php`
vorhanden ist.

Der entfernte Packagist-Endpunkt wird in `config/app.interface.php` unter
`melismarketplace_toolstree_section/datas/melis_packagist_server` konfiguriert
(Standard `http://marketplace.melisplatform.com/melis-packagist`).

## React-Backoffice

**Wo.** Linke Seitenleiste → **Market Place** (Warenkorb-Symbol); öffnet sich als oberer Tab namens
*Market Place*. Die Manifest-`route` lautet `/melis-marketplace`, und `forwardKey`
`MelisMarketPlace/MelisMarketPlace` ordnet den Legacy-Menüknoten diesem Tab zu.

**Katalog (Liste).** Ein durchsuchbares Raster aus Modulkarten (Titelbild, Gruppenlogo, Titel,
Versions-Chip, Download-Zähler sowie Badges „Installed“ / „Update-available“ oder eine
Download-Schaltfläche). Über dem Raster befinden sich drei **KPI-Karten** (Packages / Installed /
Updates available), ein Suchfeld, ein Sortierauswähler (Downloads / Date added / Name), eine
Schaltfläche *Reset filters*, der **Gruppenfilter** (All groups · Core · Cms · Marketing · Commerce ·
Sites), ein **Bundles**-Umschalter, eine Aktualisieren-Schaltfläche (↻) und der Umschalter **New /
Old**. Das Raster lädt beim Scrollen weitere Einträge nach (Infinite Scroll). Eine rechte Seitenleiste
zeigt „Want your module listed?“ und „Most downloaded packages“.

![React-Market-Place-Katalog: KPI-Karten, Suche, Sortierung, Gruppenfilter und das Raster aus Modulkarten mit einer Seitenleiste „Most downloaded packages“](/screenshots/react/melis-marketplace/melismarketplace-tool-list.png)

**Produktansicht (Detail).** Ein Klick auf eine Karte öffnet ein Voll-React-Detail (ohne
Seitenneuladen): ein Hero-Banner (Gruppenlogo, Titel, Status-Badges, Aktionsschaltflächen), eine
Bildergalerie (Slider + Vollbild-Lightbox), die Beschreibung sowie ein Bereich *Additional
information* (neueste Version, aktuelle Version falls installiert, GitHub, Packagist, Paketname,
Downloads). Eine Schaltfläche **← back** kehrt zur Liste zurück, die eingehängt bleibt, sodass Suche /
Filter / Scrollposition erhalten bleiben. Es gibt **keine Host-Untertabs** — der Übergang Liste ⇄
Detail ist interner Zustand, sodass ein Baustein genau einen Host-Tab belegt.

![React-Produktansicht für ein Modul: Hero mit Status-Badges und Aktionsschaltflächen, eine Bildergalerie, Beschreibung und der Bereich „Additional information“](/screenshots/react/melis-marketplace/melismarketplace-tool-module-detail.png)

**Umschalter New / Old.** Die Liste kann zwischen der React-Oberfläche (*New*, Standard) und dem
klassischen, in einem iframe gerenderten Werkzeug (*Old*,
`/melis/react-tool-page?key=melis_market_place_tool_display`) umschalten. Bei schmalen Viewports wird
der Umschalter reduziert auf reine Symbole.

**Aktionsschaltflächen** hängen vom Paketzustand und von den Berechtigungen des Aufrufers ab:

| Schaltfläche | Angezeigt, wenn | Wirkung |
| --- | --- | --- |
| Download | Modul nicht installiert | Composer-Abruf → dbdeploy → aktivieren |
| Update | installiert und `need_update` | dieselbe Composer-Geste auf einer veralteten Version |
| Remove | installiert, nicht ausgenommen | Deinstallation (blockiert, wenn andere Module davon abhängen) |
| Private | privates/gesperrtes Paket | Kontaktbereich; muss erworben werden |

Jede Aktion öffnet ein **Manage**-Modal mit einer Live-Fortschrittskonsole, die die Composer-/
dbdeploy-Ausgabe streamt, und bietet anschließend *Activate module* / *Reload* an. Ist der
Packagist-Server nicht erreichbar (`marketAccessible = false`), deaktiviert die React-Oberfläche das
Durchsuchen, hält aber die Shell aufrecht.

## React-Baustein

Nativer Voll-React-Baustein, gebaut mit Vite (IIFE; React / ReactDOM / react-router-dom als externe
Abhängigkeiten der Host-Globals). Quellen in `ui-react/src/`, gebaut nach `public/ui-react/brick.js`
neben `brick.manifest.json`.

| Manifest-Feld | Wert |
| --- | --- |
| `id` | `marketplace` (muss mit der in `brick.tsx` registrierten id übereinstimmen) |
| `route` | `/melis-marketplace` |
| `label` | `Market Place` |
| `forwardKey` | `MelisMarketPlace/MelisMarketPlace` |
| `melisKey` | `melis_market_place_tool_display` |
| `entry` | `brick.js` |
| `persistent` | `true` |
| `subTabs` | *nicht vorhanden* — Liste ⇄ Detail ist interner `openId`-Zustand |

Da die Menüsektion Market Place ein direkt anklickbarer / `is_parent_tool`-Knoten ist, sind der
berechtigungstragende Schlüssel und der Manifest-Zonenschlüssel **identisch**
(`melis_market_place_tool_display`). Der Baustein kann keine Host-Module importieren und verwendet
daher Inline-Styles + Theme-CSS-Variablen sowie ein dateiinternes `{fr,en}`-Wörterbuch, das von der
Host-Sprache gesteuert wird (`melis-ui-lang` / `melis-ui-locale` im `localStorage`). Karten und
Galerie fordern zunächst die React-Screenshots an, mit der Legacy-Bild-URL in `data-legacy`, und
fallen bei Fehler darauf zurück.

Wichtige Dateien (`ui-react/src/`): `brick.tsx` (registriert `id: 'marketplace'`), `MarketPlacePage.tsx`
(Liste + Detail + Manage-Modal), `ViewToggle.tsx` (Umschalter New/Old), `marketplace-api.ts`
(schreibgeschützter API-Client) sowie `shared/useCaps.ts` / `shared/useDebounce.ts` /
`shared/useIsNarrow.ts`.

## React-API

Die **schreibgeschützten** Routen des Katalogs sind in `config/module.config.php` deklariert,
verschachtelt unter der Route `application-MelisMarketPlace` (Basis
`/melis/MelisMarketPlace/react-api`) — **modul-eigen**, nicht unter dem gemeinsamen
`melis-react-api`-Knoten. Controller:
`MelisMarketPlace\Controller\MelisMarketPlaceReactApiController` (aufrufbarer Alias
`MelisMarketPlace\Controller\MelisMarketPlaceReactApi`). Kontrakt `{ success, data, error }`; jeder
Abruf sendet `X-Requested-With: XMLHttpRequest` und `credentials: 'include'`.

| Methode & URL | Aktion | Zweck |
| --- | --- | --- |
| `GET …/react-api/packages` | `packages` | Liste (`page`, `limit`, `search`, `group`, `orderBy`, `order`, `bundle`) → `{items, page, pageCount, limit, marketAccessible}` |
| `GET …/react-api/packages/:id` | `get` | Detail eines Pakets (`images`, `currentVersion`, `isExempted`, versionStatus…) |
| `GET …/react-api/groups` | `groups` | Paketgruppen → `{groups, marketAccessible}` |
| `GET …/react-api/stats` | `stats` | KPI `{total, installed, needUpdate, marketAccessible}` |
| `GET …/react-api/status` | `status` | Versionsstatus pro Modul (`need_update` / `up_to_date` / `in_advance`) |

Jede Leseaktion wird durch `denyUnlessAccess()` abgesichert — Authentifizierung
(`MelisCoreAuth::hasIdentity`) **und**
`MelisCoreRights::canAccess('melis_market_place_tool_display')`, mit Rückgabe **401 / 403** —, sodass
die JSON-API keine Hintertür darstellt. Der Controller nutzt `MelisMarketPlaceService`
(`compareLocalVersionFromRepo`, Vorladen der neuesten Version) und `MelisAssetManagerModulesService`
(installierte Versionen / Modulliste) wieder und liest die Packagist-JSON-Endpunkte, genau wie das
Legacy-Werkzeug.

> **Verändernde Aktionen haben keine react-api-Route.** Download / Update / Remove werden nativ vom
> `ManageModal` ausgeführt, das die Legacy-JS-Orchestrierung nachbildet, indem es den **Legacy**-
> Controller des Moduls direkt aufruft (`/melis/MelisMarketPlace/MelisMarketPlace/…`):
> `melisMarketPlaceProductDo` (gestreamte Konsole), `reDumpAutoload`, `execDbDeploy`, `plugModule` /
> `unplugModule`, `executeComposerScripts`, `getSetupModuleForm`, `activateModule`,
> `isPackageDirectoryRemovable`, `changePackageDirectoryPermission`, `getModuleTables`, `exportTables`,
> zuzüglich `/melis/MelisCore/Modules/getDependents` für die Abhängigkeitsprüfung beim Entfernen.

## Berechtigungen

Deklariert in `config/react.capabilities.php`, zusammengeführt unter `melisReactToolCapabilities`
durch `MelisMarketPlace\Module::getConfig()`. Verschlüsselt über denselben melisKey, den das Manifest
und die Zugriffssicherung verwenden (`melis_market_place_tool_display`), da die Sektion direkt
anklickbar ist:

```
melis_market_place_tool_display
└─ actions: list · download · remove
```

`list` = das Raster durchsuchen; `download` = der Composer-Abruf, der sowohl installiert (Download)
als auch aktualisiert (Update); `remove` = deinstallieren. Dies ist eine **rein React-seitige
Absicherung** (Standard-Erlauben, deklarativ): Der Controller erzwingt ausschließlich den **Zugriff**
(`denyUnlessAccess`), er ruft `denyUnlessCan` nicht auf. In React liest der Baustein sie über
`useCaps('melis_market_place_tool_display')` — `can('list')` steuert das Raster, `can('download')` die
Schaltflächen Download / Update und `can('remove')` die Schaltfläche Remove (die für ausgenommene
Module ebenfalls ausgeblendet wird).

## Wichtige Dienste

| Dienst-Alias | Rolle |
| --- | --- |
| `MelisMarketPlaceService` | Versionsvergleich, Ein-/Ausstecken und Weiterleitung des Post-Setup-Formulars pro Modul. |
| `MelisMarketPlaceSiteService` | Gerüstet eine vollständige Website aus einem `melisplatform-site`-Paket. |

### `MelisMarketPlaceService`

Erweitert `MelisGeneralService`.

```php
$mp = $serviceManager->get('MelisMarketPlaceService');

// Compare installed vs latest — returns one of the constants below.
$status = $mp->compareLocalVersionFromRepo('MelisCmsSlider', 'v5.1.3');
// MelisMarketPlaceService::NEED_UPDATE  (-1)
// MelisMarketPlaceService::UP_TO_DATE   (1)
// MelisMarketPlaceService::IN_ADVANCE   (2)  — running a dev-… build

// Toggle a module on/off (rewrites the active-module loader via asset-manager).
$mp->plugModule('MelisCmsSlider');
$mp->unplugModule('MelisCmsSlider');
```

`compareLocalVersionFromRepo()` löst das Ereignispaar
`melismarketplace_compare_local_version_from_repo_start` / `…_end` aus, sodass Listener den
berechneten Status überschreiben können.

**Post-Setup-Konvention pro Modul.** Ein Modul kann einen `MelisSetupPostDownloadController`
und/oder `MelisSetupPostUpdateController` in seinem eigenen `Controller\`-Namensraum mitliefern, der
`$showOnMarketplacePostSetup = true` sowie die Aktionen `getFormAction`, `validateFormAction`,
`submitAction` bereitstellt. MarketPlace leitet an diese weiter, um das Setup-Formular zu rendern und
zu verarbeiten.

### `MelisMarketPlaceSiteService`

Erweitert `MelisGeneralService`. Gerüstet eine gesamte Website aus einem `melisplatform-site`-Paket:
erstellt die Zeilen `melis_cms_site` / Startseite / Sprachen, weist frische Bereiche für page-id,
platform-id und template-id zu und legt die CMS-Tabellen des Moduls über
`Support\MelisMarketPlaceCmsTables` / `Support\MelisMarketPlaceSiteInstall` an.

```php
$site = $serviceManager->get('MelisMarketPlaceSiteService');
$site->marketplaceInstallSite($request);   // reads POST: name, scheme, domain, module, action
```

Typisierte Ausnahmen (in `src/Exception/`): `EmptySiteException`,
`PlatformIdMaxRangeReachedException`, `TemplateIdMaxRangeReachedException`,
`ArrayKeyNotFoundException`, `FileNotFoundException`.

## Legacy-Werkzeug (Old-Ansicht)

Das klassische Werkzeug bleibt hinter dem Umschalter New/Old verfügbar und besitzt weiterhin den
verändernden Ablauf. `melisMarketPlaceProductDoAction()` ist der einzige Endpunkt für Katalogaktionen:
Es löst `melis_marketplace_product_do_start` aus, verzweigt anhand der Aktion
(`MelisComposerService::DOWNLOAD / UPDATE / REMOVE`) und löst anschließend
`melis_marketplace_product_do_finish` aus, um das Feedback des Flash-Messengers anzustoßen. Vor dem
Entfernen durchläuft es die Abhängigkeiten des Zielmoduls, jene aller anderen aktiven Module sowie den
`require`-Block der `composer.json` des Projekt-Roots, um das Entfernen einer gemeinsam genutzten
Abhängigkeit zu verhindern.

Zwei Prüfungen steuern die Nutzbarkeit des Stores (beide in `MelisMarketPlaceController`):

- `isMarketplaceAccessible()` — ob der Packagist-Server erreichbar und die Funktion aktiviert ist.
- `allowUpdate()` — liest `melis_core_platform.plf_update_marketplace` für die aktuelle Plattform
  (Umgebungsvariable `MELIS_PLATFORM`); eine Plattform mit `plf_update_marketplace = 0` kann
  durchsuchen, aber nicht herunterladen oder aktualisieren.

`MelisSetupController` verarbeitet die eigenständige Route `/MelisMarketPlace/setup` (Setup pro Modul
außerhalb des Backoffice-Oberflächenbaums).

## Ereignisse

| Ereignis | Ausgelöst von | Zweck |
| --- | --- | --- |
| `melismarketplace_compare_local_version_from_repo_start` / `_end` | `compareLocalVersionFromRepo` | Das berechnete Versionsstatus-Ergebnis einhaken oder überschreiben. |
| `melis_marketplace_product_do_start` | `melisMarketPlaceProductDo` | Vor einer Download-, Update- oder Entfernen-Aktion. |
| `melis_marketplace_product_do_finish` | `melisMarketPlaceProductDo` | Nach der Aktion — steuert das Feedback des Flash-Messengers. |

## Datenbanktabellen

MelisMarketPlace definiert keine eigenen Tabellen. Wenn ein heruntergeladenes Modul Datenbank-Deltas
mitliefert, werden diese über `execDbDeployAction()` (melis-dbdeploy) angewendet. Installationen von
Website-Produkten schreiben in die vorhandenen CMS-Tabellen der Plattform (zugewiesen über
`MelisMarketPlaceSiteService`).

## Wichtige Dateien

| Bereich | Pfad |
| --- | --- |
| Modulmanifest | `vendor/melisplatform/melis-marketplace/composer.json` |
| Routen / Dienste / react-api / Controller | `vendor/melisplatform/melis-marketplace/config/module.config.php` |
| React-Berechtigungen | `vendor/melisplatform/melis-marketplace/config/react.capabilities.php` |
| Werkzeugbaum, Header-Symbol, Packagist-Konfiguration | `vendor/melisplatform/melis-marketplace/config/app.interface.php` |
| React-API-Controller | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceReactApiController.php` |
| Haupt-Controller (Legacy) | `vendor/melisplatform/melis-marketplace/src/Controller/MelisMarketPlaceController.php` |
| Dienst für Installation/Aktualisierung/Einstecken | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceService.php` |
| Dienst für Website-Installation | `vendor/melisplatform/melis-marketplace/src/Service/MelisMarketPlaceSiteService.php` |
| React-Baustein-Quellen | `vendor/melisplatform/melis-marketplace/ui-react/src/` |
| Gebauter Baustein + Manifest | `vendor/melisplatform/melis-marketplace/public/ui-react/` |
| Ausnahmen | `vendor/melisplatform/melis-marketplace/src/Exception/` |

Siehe auch: [melis-composerdeploy](/de/reference/modules/melis-composerdeploy) ·
[melis-asset-manager](/de/reference/modules/melis-asset-manager) ·
[melis-dbdeploy](/de/reference/modules/melis-dbdeploy) ·
[melis-core](/de/reference/modules/melis-core)
