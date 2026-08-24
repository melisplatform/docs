# MelisCommerceGroupDiscountPerCategory

> Aggiunge uno sconto sul prezzo per categoria, delimitato per paese e gruppo di clienti, come scheda "Price Discount" iniettata nello strumento Catalogs di MelisCommerce nel back-office React. Pacchetto `melisplatform/melis-commerce-group-discount-per-category`.

## Scopo

MelisCommerceGroupDiscountPerCategory permette di impostare uno **sconto percentuale sui prodotti di una categoria, per paese e per gruppo di clienti**. Lo sconto è delimitato a *(categoria × paese × gruppo di clienti)*, così due clienti che acquistano lo stesso prodotto possono vedere due prezzi diversi a seconda del gruppo a cui appartengono, e lo sconto può variare da paese a paese (con uno pseudo-paese **General**, id `-1`, che si applica a tutte le zone).

Il modulo **non ha uno strumento proprio**. È un **mattoncino di estensione / host-injection**: non disegna alcuna pagina e non aggiunge alcuna voce di menu. Pubblica invece un componente React su `window`, che la pagina Catalogs di MelisCommerce recupera — quando il modulo è attivo — per aggiungere una scheda **Price Discount** all'editor di categoria. La persistenza vera e propria rimane nel servizio Laminas del modulo, invariata rispetto allo strumento legacy.

## Attivazione

Aggiungi a `config/melis.module.load.php`:

```php
return [
    'MelisCommerceGroupDiscountPerCategory',
];
```

Poiché si tratta di un mattoncino di estensione, la scheda appare **solo quando entrambe** queste condizioni sono soddisfatte:

- **Il modulo è attivo** — solo un mattoncino attivo pubblica la sua variabile globale su `window` affinché l'host la recuperi.
- **L'utente possiede il diritto `price_discount`** sullo strumento Catalogs.

In questo modulo **non c'è alcun `config/react.capabilities.php`**: la capability `price_discount` è dichiarata in **MelisCommerce**, sotto la melisKey portatrice dei diritti dello strumento Catalogs, `meliscommerce_categories_page`.

## Dove si trova nel back-office React

Non esiste una schermata dedicata. La funzionalità è una scheda all'interno dello strumento Catalogs:

- Barra laterale → **Commerce → Catalogs**.
- Apri/modifica una **categoria** esistente.
- Fai clic sulla scheda **Price Discount** (etichettata *"Discount Per Client's Group"* / *"Réduction par groupe de client"*).

La scheda è **disponibile solo in modifica**: si collega a una categoria esistente, quindi è disabilitata durante la *creazione* di una categoria — salva prima la categoria. Inoltre **non ha un pulsante Salva proprio**; gli sconti vengono scritti dal pulsante **"Save category"** del form host.

La scheda ha due aree:

- un elenco **Country** a sinistra (**General** per primo, poi ogni paese con la sua bandiera); un badge mostra quanti sconti sono compilati per quel paese;
- un insieme di **schede per gruppo di clienti** a destra — seleziona un gruppo, poi digita la sua **percentuale di sconto** per il paese selezionato. Un pallino contrassegna una scheda di gruppo che contiene già un valore (rosso se non valido).

## Regole di sconto

- **Percentuale** — `0 < valore ≤ 100`, al massimo **2 decimali**. Lasciare un campo **vuoto** rimuove (elimina) quella riga di sconto.
- Vengono offerti solo i gruppi di clienti **attivi**.
- Il campo viene validato durante la digitazione; un valore non valido viene mostrato sotto il proprio campo e contrassegna la scheda del gruppo in rosso. Al **Save category**, una percentuale non valida **blocca** il salvataggio e passa la scheda al primo paese + gruppo problematico. Altrimenti la categoria viene salvata per prima, poi gli sconti vengono salvati insieme ad essa.

## Anatomia del mattoncino

Il sorgente del mattoncino è una libreria **IIFE** Vite sotto `ui-react/`, che compila in `public/ui-react/brick.js` (+ `brick.manifest.json`). React è esternalizzato verso le variabili globali dell'host così il componente viene renderizzato all'interno della pagina Catalogs. Il manifest non dichiara **alcuna route, label, forwardKey o melisKey** (tutte `null`), e l'entry **non** chiama `__melisRegisterBrick` — al caricamento pubblica semplicemente una variabile globale:

```ts
window.MelisCommerceGroupDiscountPerCategoryBrick = {
  CategoryDiscountTab,
  tabLabel: { fr: 'Réduction par groupe de client', en: "Discount Per Client's Group" },
}
```

| File | Ruolo |
| --- | --- |
| `src/brick.tsx` | Pubblica la variabile globale `window.MelisCommerceGroupDiscountPerCategoryBrick`. Nessuna route, nessuna registrazione. |
| `src/CategoryDiscountTab.tsx` | L'interfaccia della scheda (props `{ categoryId }`): elenco paesi + schede gruppo di clienti + campo percentuale, dizionario fr/en autonomo, validazione lato client e i listener di eventi per il salvataggio insieme al form. |
| `src/discountApi.ts` | Client JSON per gli endpoint `react-api` del modulo, usando il contratto `{ success, data, error }`. |

L'etichetta della scheda viene fornita con **questo** modulo (nella variabile globale), non con il dizionario di MelisCommerce. La scheda legge la locale attiva da `document.documentElement.lang`.

## React API

Le route sono definite in `config/react-api.php` e unite nei `child_routes` di `melis-react-api`. Controller: `MelisReactApiCategoryDiscountController` (`optionsAction` / `getAction` / `saveAction`). Forma della risposta `{ success, data, error? }`.

| Metodo + URL | Action | Restituisce (`data`) |
| --- | --- | --- |
| `GET /melis/react-api/category-discounts/options` | `optionsAction` | `{ countries, groups }` — paesi con **General** (id `-1`) per primo + bandiere base64; gruppi di clienti **attivi**. |
| `GET /melis/react-api/category-discounts/:id` | `getAction` | `{ items }` — sconti memorizzati per la categoria `:id`. |
| `POST /melis/react-api/category-discounts/save` | `saveAction` | `{ items }` — sconti riletti dopo il salvataggio (id aggiornati). |

Forme TS (`discountApi.ts`):

```ts
interface CountryOpt  { id: number; name: string; flag: string | null; general: boolean }
interface GroupOpt    { id: number; name: string }
interface DiscountRow { id: number; countryId: number; groupId: number; percentage: number }
```

**Guard di accesso (tutte e tre le action):** `denyUnlessAccess()` richiede un'identità autenticata (`MelisCoreAuth`, altrimenti 401) e `MelisCoreRights->canAccess('meliscommerce_categories_page')` — la melisKey dello strumento Catalogs **host** (altrimenti 403). La scheda non può mai essere più permissiva dello strumento in cui risiede.

**Contratto di salvataggio.** Il client invia **ogni** cella (incluse quelle vuote — una `percentage` vuota elimina quella riga). `saveAction` rivalida (numerico, ≤ 2 decimali, ≤ 100, > 0), ricostruisce la struttura legacy `[countryId][groupId] => ['gdc_id' => …, 'gdc_discount_percent' => …]`, e delega al servizio — nessuna logica di business nel controller:

```php
$this->getServiceManager()
     ->get('MelisCommerceGroupDiscountPerCategoryService')
     ->saveCategoryGroupDiscount($categoryId, $datas);   // same service + events as the legacy tool
```

`options`/`get` leggono da `MelisCommerceGroupDiscountPerCategoryService->getCategoryDiscountsByCategoryId()`, `MelisEcomCountryTable->getCountries()` e `MelisComClientGroupsService->getClientsGroupList()`.

## Integrazione con l'host

- **Discovery / caricamento:** flusso standard del mattoncino — `GET /melis/react-api/react-modules` lo elenca, l'host carica in background `brick.js`, e `brick.tsx` pubblica la variabile globale.
- **Recupero del componente:** il `CatalogPage.tsx` di MelisCommerce risolve il componente e l'etichetta tramite gli helper generici, e aggiunge la scheda **solo se entrambi si risolvono** e solo in modalità **modifica**:

  ```ts
  const DiscountTabComp  = useExternalBrickComponent<{ categoryId: number }>(
    'MelisCommerceGroupDiscountPerCategoryBrick', 'CategoryDiscountTab')
  const DiscountTabLabel = useExternalBrickValue<{ fr: string; en: string }>(
    'MelisCommerceGroupDiscountPerCategoryBrick', 'tabLabel')
  ```

  Il contenuto della scheda è **montato permanentemente** (nascosto con `display:none` quando inattivo) così mantiene i suoi input e listener.

- **Ponte di salvataggio insieme al form** (due `CustomEvent` su `window`):
  - `melis:commerce-category-validate` — inviato prima del salvataggio; la scheda valida e, al primo valore non valido, imposta `detail.blocked = true` e `detail.tab = 'price_discount'`, interrompendo il salvataggio della categoria.
  - `melis:commerce-category-saved` — inviato dopo che la categoria è stata salvata; la scheda inserisce la sua promise `submit({ silent: true })` in `detail.pending`, che `CatalogPage` attende prima di concludere.

## File chiave

| Ambito | Percorso |
| --- | --- |
| Sorgente del mattoncino (componente, client api) | `ui-react/src/{brick.tsx, CategoryDiscountTab.tsx, discountApi.ts}` |
| Mattoncino compilato + manifest | `public/ui-react/{brick.js, brick.manifest.json}` (id `commerce-group-discount-per-category`) |
| Route React API | `config/react-api.php` |
| Cablaggio del modulo | `config/module.config.php` |
| Controller React API | `src/Controller/ReactApi/MelisReactApiCategoryDiscountController.php` |

Vedi anche: [melis-commerce](/legacy/reference/modules/melis-commerce)
