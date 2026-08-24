# MelisCommerceGroupDiscountPerCategory

> Ajoute une réduction de prix par catégorie, ciblée par pays et par groupe de client, sous la forme d'un onglet « Réduction de prix » injecté dans l'outil Catalogues de MelisCommerce dans le back-office React. Paquet `melisplatform/melis-commerce-group-discount-per-category`.

## Objectif

MelisCommerceGroupDiscountPerCategory permet de définir une **réduction en pourcentage sur les produits d'une catégorie, par pays et par groupe de client**. La réduction est ciblée sur *(catégorie × pays × groupe de client)*, de sorte que deux clients achetant le même produit peuvent voir deux prix différents selon le groupe auquel ils appartiennent, et la réduction peut varier d'un pays à l'autre (avec un pseudo-pays **Général**, id `-1`, qui s'applique à toutes les zones).

Le module **ne possède pas d'outil qui lui soit propre**. C'est une **brique d'extension / d'injection dans l'hôte** : il n'affiche aucune page et n'ajoute aucune entrée de menu. À la place, il publie un composant React sur `window`, que la page Catalogues de MelisCommerce récupère — lorsque le module est actif — pour ajouter un onglet **Réduction de prix** à l'éditeur de catégorie. La persistance réelle reste dans le service Laminas du module, inchangé par rapport à l'outil historique.

## Activation

Ajoutez dans `config/melis.module.load.php` :

```php
return [
    'MelisCommerceGroupDiscountPerCategory',
];
```

Comme il s'agit d'une brique d'extension, l'onglet n'apparaît **que lorsque les deux** conditions suivantes sont réunies :

- **Le module est actif** — seule une brique active publie son global sur `window` pour que l'hôte le récupère.
- **L'utilisateur détient le droit `price_discount`** sur l'outil Catalogues.

Il n'y a **aucun `config/react.capabilities.php`** dans ce module : la capacité `price_discount` est déclarée dans **MelisCommerce**, sous la melisKey porteuse de droits de l'outil Catalogues `meliscommerce_categories_page`.

## Emplacement dans le back-office React

Il n'y a pas d'écran dédié. La fonctionnalité est un onglet à l'intérieur de l'outil Catalogues :

- Barre latérale → **Commerce → Catalogues**.
- Ouvrez/éditez une **catégorie** existante.
- Cliquez sur l'onglet **Réduction de prix** (intitulé *« Discount Per Client's Group »* / *« Réduction par groupe de client »*).

L'onglet est **réservé à l'édition** : il se rattache à une catégorie existante, il est donc désactivé pendant la *création* d'une catégorie — enregistrez d'abord la catégorie. Il n'a par ailleurs **aucun bouton Enregistrer propre** ; les réductions sont écrites par le bouton **« Enregistrer la catégorie »** du formulaire hôte.

L'onglet comporte deux zones :

- une liste des **Pays** à gauche (**Général** en premier, puis chaque pays avec son drapeau) ; un badge indique le nombre de réductions renseignées pour ce pays ;
- un ensemble d'**onglets de groupes de client** à droite — sélectionnez un groupe, puis saisissez son **pourcentage de réduction** pour le pays sélectionné. Un point marque un onglet de groupe qui contient déjà une valeur (rouge si elle est invalide).

## Règles de réduction

- **Pourcentage** — `0 < valeur ≤ 100`, au maximum **2 décimales**. Laisser un champ **vide** supprime (efface) cette ligne de réduction.
- Seuls les groupes de client **actifs** sont proposés.
- Le champ se valide à la saisie ; une valeur invalide est affichée sous son propre champ et marque l'onglet du groupe en rouge. À l'**Enregistrement de la catégorie**, un pourcentage invalide **bloque** l'enregistrement et bascule l'onglet sur le premier couple pays + groupe fautif. Sinon, la catégorie est enregistrée en premier, puis les réductions sont enregistrées avec elle.

## Anatomie de la brique

La source de la brique est une bibliothèque Vite **IIFE** sous `ui-react/`, compilée vers `public/ui-react/brick.js` (+ `brick.manifest.json`). React est externalisé vers les globals de l'hôte afin que le composant s'affiche à l'intérieur de la page Catalogues. Le manifeste ne déclare **ni route, ni label, ni forwardKey, ni melisKey** (tous `null`), et le point d'entrée n'appelle **pas** `__melisRegisterBrick` — au chargement, il publie simplement un global :

```ts
window.MelisCommerceGroupDiscountPerCategoryBrick = {
  CategoryDiscountTab,
  tabLabel: { fr: 'Réduction par groupe de client', en: "Discount Per Client's Group" },
}
```

| Fichier | Rôle |
| --- | --- |
| `src/brick.tsx` | Publie le global `window.MelisCommerceGroupDiscountPerCategoryBrick`. Aucune route, aucun enregistrement. |
| `src/CategoryDiscountTab.tsx` | L'interface de l'onglet (props `{ categoryId }`) : liste des pays + onglets de groupes de client + champ de pourcentage, dictionnaire fr/en autonome, validation côté client, et écouteurs d'événements pour l'enregistrement avec le formulaire. |
| `src/discountApi.ts` | Client JSON pour les points d'accès `react-api` du module, utilisant le contrat `{ success, data, error }`. |

Le libellé de l'onglet est fourni avec **ce** module (sur le global), et non avec le dictionnaire de MelisCommerce. L'onglet lit la locale active depuis `document.documentElement.lang`.

## API React

Les routes sont définies dans `config/react-api.php` et fusionnées dans les `child_routes` de `melis-react-api`. Contrôleur : `MelisReactApiCategoryDiscountController` (`optionsAction` / `getAction` / `saveAction`). Forme de réponse `{ success, data, error? }`.

| Méthode + URL | Action | Retourne (`data`) |
| --- | --- | --- |
| `GET /melis/react-api/category-discounts/options` | `optionsAction` | `{ countries, groups }` — pays avec **Général** (id `-1`) en premier + drapeaux en base64 ; groupes de client **actifs**. |
| `GET /melis/react-api/category-discounts/:id` | `getAction` | `{ items }` — réductions enregistrées pour la catégorie `:id`. |
| `POST /melis/react-api/category-discounts/save` | `saveAction` | `{ items }` — réductions relues après l'enregistrement (nouveaux ids). |

Formes TS (`discountApi.ts`) :

```ts
interface CountryOpt  { id: number; name: string; flag: string | null; general: boolean }
interface GroupOpt    { id: number; name: string }
interface DiscountRow { id: number; countryId: number; groupId: number; percentage: number }
```

**Garde d'accès (les trois actions) :** `denyUnlessAccess()` exige une identité authentifiée (`MelisCoreAuth`, sinon 401) et `MelisCoreRights->canAccess('meliscommerce_categories_page')` — la melisKey de l'outil Catalogues **hôte** (sinon 403). L'onglet ne peut jamais être plus permissif que l'outil dans lequel il vit.

**Contrat d'enregistrement.** Le client envoie **toutes** les cellules (y compris les vides — un `percentage` vide supprime cette ligne). `saveAction` revalide (numérique, ≤ 2 décimales, ≤ 100, > 0), reconstruit la structure historique `[countryId][groupId] => ['gdc_id' => …, 'gdc_discount_percent' => …]`, et délègue au service — aucune logique métier dans le contrôleur :

```php
$this->getServiceManager()
     ->get('MelisCommerceGroupDiscountPerCategoryService')
     ->saveCategoryGroupDiscount($categoryId, $datas);   // same service + events as the legacy tool
```

`options`/`get` lisent depuis `MelisCommerceGroupDiscountPerCategoryService->getCategoryDiscountsByCategoryId()`, `MelisEcomCountryTable->getCountries()` et `MelisComClientGroupsService->getClientsGroupList()`.

## Intégration à l'hôte

- **Découverte / chargement :** flux de brique standard — `GET /melis/react-api/react-modules` la liste, l'hôte charge `brick.js` en arrière-plan, et `brick.tsx` publie le global.
- **Récupération du composant :** le `CatalogPage.tsx` de MelisCommerce résout le composant et le libellé via les helpers génériques, et ajoute l'onglet **uniquement si les deux se résolvent** et seulement en mode **édition** :

  ```ts
  const DiscountTabComp  = useExternalBrickComponent<{ categoryId: number }>(
    'MelisCommerceGroupDiscountPerCategoryBrick', 'CategoryDiscountTab')
  const DiscountTabLabel = useExternalBrickValue<{ fr: string; en: string }>(
    'MelisCommerceGroupDiscountPerCategoryBrick', 'tabLabel')
  ```

  Le contenu de l'onglet est **monté en permanence** (masqué avec `display:none` lorsqu'il est inactif) afin de conserver ses champs et ses écouteurs.

- **Pont d'enregistrement avec le formulaire** (deux `CustomEvent` sur `window`) :
  - `melis:commerce-category-validate` — émis avant l'enregistrement ; l'onglet valide et, à la première valeur invalide, positionne `detail.blocked = true` et `detail.tab = 'price_discount'`, interrompant l'enregistrement de la catégorie.
  - `melis:commerce-category-saved` — émis après l'enregistrement de la catégorie ; l'onglet pousse sa promesse `submit({ silent: true })` dans `detail.pending`, que `CatalogPage` attend avant de terminer.

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Source de la brique (composant, client api) | `ui-react/src/{brick.tsx, CategoryDiscountTab.tsx, discountApi.ts}` |
| Brique compilée + manifeste | `public/ui-react/{brick.js, brick.manifest.json}` (id `commerce-group-discount-per-category`) |
| Routes de l'API React | `config/react-api.php` |
| Câblage du module | `config/module.config.php` |
| Contrôleur de l'API React | `src/Controller/ReactApi/MelisReactApiCategoryDiscountController.php` |

Voir aussi : [melis-commerce](/legacy/reference/modules/melis-commerce)
