# Fehlerbehebung & Betrieb

Ein praxisnaher Leitfaden zu den Problemen, auf die Sie tatsächlich stoßen werden, mit Ursache und
Lösung. Wenn etwas „nicht angezeigt wird", lautet die Antwort fast immer **Module / Rechte / Cache**.

In v6 ist das Back-Office die **React-Shell unter `/melis-react`**, doch das Framework, die Module und
die zugrunde liegende Konfiguration bleiben unverändert — die meisten hier beschriebenen Lösungen sind
also weiterhin serverseitig. Wenn ein Tool keine native React-Seite besitzt, rendert die Shell das
klassische Tool innerhalb eines iframes (`/melis/react-tool-page?key=<melisKey>`), und native
React-„Brick"-Tools verfügen über einen **New (React) / Old (iframe)**-Umschalter zu genau diesem
klassischen Bildschirm. Zu wissen, welche Schicht man gerade betrachtet, ist oft der erste
Diagnoseschritt.

## Zuerst die Fehleranzeige aktivieren

Standardmäßig verhält sich Melis bei Fehlern zurückhaltend. Aktivieren Sie den **Entwicklungsmodus**,
um sie sichtbar zu machen:

```bash
vendor/bin/laminas-development-mode enable     # status | enable | disable
```

Dies lädt `config/development.config.php`, deaktiviert die Config-/Modul-Caches und setzt
`error_reporting(E_ALL)`. PHP-Warnungen werden zusätzlich durch den
`MelisCorePhpWarningListener` sichtbar gemacht. Die Fehlerberichterstattung/-anzeige kann außerdem über
die Melis-Konfiguration unter `/meliscore/datas/errors` gesteuert werden.

Beachten Sie, dass die React-API-Endpunkte JSON und nicht HTML zurückgeben: Ein fehlgeschlagener
Boot-Aufruf liefert `{ success: false, error: … }` (z. B. `{ success:false, error:'Unauthenticated' }`
mit HTTP 401), lesen Sie also den Network-Tab und nicht nur die Seite. Ein Legacy-Tool innerhalb des
iframes zeigt weiterhin seine eigenen nativen Fehler (Gritter-Toasts, feldweise Validierungs-Modals)
genau wie unter `/melis`.

::: warning Leere Seite, HTTP 200, kein Fehler?
Melis verwendet Output-Buffering; ein Fatal während Bootstrap/Render kann eine **leere 200** ergeben.
Um die verschluckte Ausnahme zu sehen, hängen Sie vorübergehend einen Listener an
`MvcEvent::EVENT_DISPATCH_ERROR` / `EVENT_RENDER_ERROR` in `public/index.php` an (umschließen Sie
`Application::init()` mit try/catch und geben Sie den `exception`-Parameter aus), oder aktivieren Sie den
Entwicklungsmodus.
:::

## Cache

Veralteter Cache ist die häufigste Ursache Nr. 1 für „Ich habe die Konfiguration geändert, aber es hat
sich nichts geändert". Die Caches befinden sich unter `cache/`:

```
cache/meliscore_platform_cache-*   # backoffice zones / platform config
cache/meliscms_page-*              # rendered CMS pages
cache/config/                      # merged Laminas config (if enabled)
```

Leeren Sie sie, indem Sie die betreffenden Ordner löschen, oder über die API
`MelisCoreCacheSystemService::deleteCacheByPrefix('*', 'meliscore_platform_cache')`. Melis leert Caches
außerdem automatisch bei Änderungen an der Modulverwaltung und den Rechten. Nachdem Sie
`config/melis.module.load.php` oder eine `app.*.php` bearbeitet haben, **leeren Sie `cache/melis*` und
laden Sie neu**.

Aus dem Back-Office können Sie Caches über das **Cache**-Tool leeren (dessen React-Bildschirm verfügt
über dieselben Tabs wie das klassische Tool). Siehe [MelisCacheInternal](/de/reference/modules/melis-cache-internal).

Die React-Shell besitzt eine eigene Caching-Schicht, die zu beachten ist, wenn Dinge veraltet wirken:

- Das zusammengefasste **Bricks-Bundle** (`/melis/react-api/bricks-bundle.js?v=<sig>`) wird
  1 Jahr immutable ausgeliefert; seine `?v=`-Signatur (Name+mtime+Größe jedes Bricks) ändert sich
  automatisch, wenn sich die Dateien eines Bricks ändern, sodass ein **Hard Refresh** das neue Bundle
  aufnimmt.
- Die **SPA-Shell** (`index.html`) wird mit `no-cache` ausgeliefert, doch die von ihr referenzierten
  gehashten JS-/CSS-Assets sind content-hashed und werden gecacht — auch hier ist ein Hard Refresh die
  Lösung.
- Wenn ein Tool-iframe nach einer **Modules**-Änderung mit fehlerhaftem Styling oder einer leeren
  DataTable lädt, wurden die Plattform-Asset-Bundles unter `etc/bundles/` möglicherweise gelöscht; sie
  reparieren sich selbst (werden beim nächsten Rendern der Tool-Seite neu generiert), aber Sie können
  dies durch Neuladen des Tools erzwingen.

## Häufige Fallstricke

### Ein Modul erscheint nicht
| Ursache | Lösung |
| --- | --- |
| Nicht in der Ladeliste | Fügen Sie es zu `config/melis.module.load.php` hinzu. |
| Veralteter Cache | Leeren Sie `cache/melis*` und laden Sie neu. |
| Pfad nicht gemappt | Stellen Sie sicher, dass es in der generierten `config/melis.modules.path.php` enthalten ist (neu generiert durch `MelisAssetManager`). |

### Ein Tool existiert, ist aber nicht im linken Menü / „You don't have access to this tool"
Das linke React-Menü (`GET /melis/react-api/menu`) ist der **nach Rechten gefilterte** Navigationsbaum —
dieselbe `melis_core_user.usr_rights`-XML-Allow-List wie zuvor, nur von der Shell konsumiert.

| Ursache | Lösung |
| --- | --- |
| Benutzer hat keine Rechte | Erteilen Sie den `*_toolstree_section` des Tools unter **Users → Rights**, oder über eine Migration (siehe `flyway/sql/V3__add_melisai_rights.sql`). |
| Rechte in der Session gecacht | Rechte werden beim Login geladen und periodisch durch `MelisCoreCheckUserRightsListener` aktualisiert — **melden Sie sich ab und wieder an**, nachdem Sie sie geändert haben. |
| Benutzer inaktiv | `usr_status` muss `1` sein. |
| Modul des Bricks inaktiv | Ein natives React-Tool (Brick) erscheint **genau dann**, wenn sein Modul aktiv ist — die Shell erkennt Bricks über `GET /melis/react-api/react-modules`. Aktivieren Sie das Modul. |

> Ein **leeres** `usr_rights` bedeutet Vollzugriff (`isAccessible()` gibt bei leerem Wert true zurück) —
> aber bei einem normalen Benutzer mit expliziter Allow-List ist ein fehlender Abschnitt verborgen.

### Die Schaltfläche/der Tab eines Tools ist verboten, obwohl ich das Tool öffnen kann (HTTP 403)
v6 fügt **erweiterte Rechte** („Capabilities") *innerhalb* eines bereits autorisierten Tools hinzu — die
feingranularen List-/Create-/Edit-/Delete-/tabweisen Checkboxen unter **Users → Rights**.

| Ursache | Lösung |
| --- | --- |
| Capability verweigert | Der Controller des Tools hat `denyUnlessCan(<cap>)` aufgerufen und Ihre Rechte-XML verweigert diese Capability. Heben Sie die Verweigerung unter **Users → Rights** auf (Matrix der erweiterten Rechte). |
| In der Session gecacht | Capabilities werden im Boot-Aufruf `GET /melis/react-api/me` (`data.capabilities`) geliefert — **melden Sie sich ab und wieder an**, nachdem Sie die Rechte bearbeitet haben. |

> Capabilities sind **default-allow**: Ein Tool ohne Deklaration oder eine nicht verweigerte Capability
> bleibt voll nutzbar; **Admins umgehen** dies vollständig. Verweigerungen befinden sich in einem
> eigenen `<meliscore_tool_capabilities>`-Abschnitt der Rechte-XML, sodass sie das klassische BO nicht
> beeinflussen.

### Ein Legacy-Tool lädt leer / seine Schaltflächen tun nichts innerhalb der React-Shell
Wenn ein Tool keine native React-Seite besitzt, wird es in einem iframe über
`/melis/react-tool-page?key=<melisKey>` gerendert. Eine leere DataTable oder eine tote Schaltfläche dort
ist fast immer eine **fehlende Modul-Ressource** (deren eigene `*.tool.js`/CSS nicht eingebunden wurde).

| Ursache | Lösung |
| --- | --- |
| Modul-Ressource nicht geladen | Die Tool-Seite bindet die `ressources` jedes Moduls ein; ein neu beigesteuerter Tab/Button, der JS liefert, das der Seite unbekannt ist, benötigt die Registrierung seines Plugin-Roots (oder einen `toolpage_extensions`-Hook — siehe [Ein Tool erstellen](/de/guide/create-a-tool)). |
| Vergleich mit `/melis` | Öffnen Sie dasselbe Tool direkt unter `/melis` (oder über den **Old**-Umschalter des Tools). Ist es auch dort defekt, liegt das Problem im Tool selbst und nicht im React-Frame. |

### Datenbankverbindungsfehler
| Ursache | Lösung |
| --- | --- |
| Plattform-Datei fehlt | `config/autoload/platforms/<MELIS_PLATFORM>.php` muss existieren und mit der Umgebungsvariable `MELIS_PLATFORM` übereinstimmen. |
| Falsche Zugangsdaten | Prüfen Sie die von der Plattform-Datei konsumierten `MYSQL_*`-Umgebungsvariablen. |

### Assets (CSS/JS) 404
| Ursache | Lösung |
| --- | --- |
| Modul nicht gemappt | Prüfen Sie `config/melis.modules.path.php`. |
| Bundles nicht gebaut | Bauen Sie die Assets neu (Webpack-Build / `vendor/bin/phing`). |
| Stylesheet als HTML beantwortet | Eine abgelaufene Session leitete eine Bundle-Anfrage früher auf die HTML-Login-Seite um (der Browser lehnt den MIME-Typ ab); v6 liefert das Plattform-Bundle unter `/melis/react-platform-bundle` mit dem korrekten Typ aus und hält es öffentlich — ein Hard Refresh beseitigt die veraltete Ablehnung. |

### Übersetzungen zeigen den rohen `tr_…`-Schlüssel
| Ursache | Lösung |
| --- | --- |
| Locale nicht gesetzt | Die aktive Locale stammt aus der Session (`melis-lang-locale`); der Sprachumschalter im React-Header schreibt sie (`GET /melis/react-api/langs`). |
| Datei fehlt | Fügen Sie `language/<locale>.interface.php` hinzu; `en_EN` ist der Fallback. |

## Datenbankschema (dbdeploy & flyway)

- **dbdeploy** ([MelisDbDeploy](/de/reference/modules/melis-dbdeploy)) läuft bei `composer update`
  (Post-Update-Hook), um die nummerierten SQL-Deltas jedes Moduls anzuwenden, verfolgt in der
  `changelog`-Tabelle.
- **flyway** ([MelisFlyway](/de/reference/modules/melis-flyway)) wendet Projektmigrationen in
  `flyway/sql/` an (`flyway -configFiles=flyway/conf/flyway.conf migrate`).

## CLI- & Build-Tools

```bash
vendor/bin/laminas-development-mode {status|enable|disable}   # dev mode
flyway -configFiles=flyway/conf/flyway.conf {migrate|info|repair}   # DB migrations
vendor/bin/phing                                             # build assets/bundles
```

`composer update` löst die Melis-Hooks (Modul-Deploy + dbdeploy) über `composer.json`
`post-update-cmd` aus.

## Wo Sie nachschauen sollten

| Anliegen | Pfad |
| --- | --- |
| Vorlage für den Dev-Modus | `config/development.config.php.dist` |
| Cache-API | `vendor/melisplatform/melis-core/src/Service/MelisCoreCacheSystemService.php` |
| Rechte-Aktualisierung | `vendor/melisplatform/melis-core/src/Listener/MelisCoreCheckUserRightsListener.php` |
| PHP-Warnungen | `vendor/melisplatform/melis-core/src/Listener/MelisCorePhpWarningListener.php` |
| Modul-Assembly | `vendor/melisplatform/melis-core/src/MelisModuleManager.php` |
| React-API (menu / me / capabilities) | `vendor/melisplatform/melis-react-api/src/Controller/MelisReactApiController.php` |
| React-Shell / iframe-Tool-Seiten | `vendor/melisplatform/melis-react-override/src/Controller/PluginViewController.php` |
| Flyway-Konfiguration | `flyway/conf/flyway.conf`, Migrationen in `flyway/sql/` |
