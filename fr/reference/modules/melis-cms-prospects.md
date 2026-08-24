# MelisCmsProspects

> Gestion des leads / contacts : un formulaire de contact en front-office capture les messages des visiteurs sous forme de prospects, et un back-office React vous permet de les parcourir, filtrer, modifier, exporter et supprimer, ainsi que de classer les demandes par thèmes. Package `melisplatform/melis-cms-prospects`.

## Présentation

`MelisCmsProspects` capture les soumissions du formulaire de contact des visiteurs sous forme de
**prospects** (leads) stockés en base de données. Les utilisateurs du back-office les parcourent,
filtrent, modifient, exportent (CSV/Excel) et suppriment, et les classent par **thèmes**. Le module
inclut un widget de statistiques pour le tableau de bord et s'intègre aux outils RGPD de la
plateforme (informations utilisateur / extraction / suppression + cycle d'auto-suppression).

Dans Melis v6, les deux outils de back-office — **Prospects** et **Thèmes** — sont des **interfaces
full-React natives** servies sous `/melis-react`, chacune dialoguant avec une couche JSON
`react-api`. Le modèle de données sous-jacent, les services, le plugin Show Form du front et le
câblage RGPD sont inchangés par rapport à la v5.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsProspects',
];
```

Dépendances : `melis-core`, `melis-engine`, `melis-front`, `melis-cms` et
`laminas/laminas-mvc-plugin-flashmessenger`. Le module est en `dbdeploy: true` — ses tables sont
créées/mises à jour via le mécanisme dbdeploy. Les deux outils React n'apparaissent dans le
back-office que lorsque le module est actif (ils sont découverts depuis son `brick.manifest.json`).

## Back-office React

**Où :** barre latérale gauche → **MelisMarketing** → **Prospects** → **Prospects** / **Thèmes**.
Chacun s'ouvre dans son propre onglet principal. Chaque outil conserve une bascule **Nouveau /
Ancien** : *Nouveau* est l'interface React (par défaut), *Ancien* affiche l'outil historique dans une
iframe (`/melis/react-tool-page?key=<melisKey>`).

Deux bricks sont livrées dans un même bundle (`public/ui-react/brick.manifest.json`) :

| Élément | Prospects | Thèmes |
| --- | --- | --- |
| Id de brick / route | `prospects` — `/prospects` | `prospect-themes` — `/prospect-themes` |
| `forwardKey` (menu → route) | `MelisCmsProspects/ToolProspects` | `MelisCmsProspects/ProspectThemes` |
| `melisKey` iframe vue Ancien (zone) | `MelisCmsProspects_tool_prospects` | `MelisCmsProspects_tool_themes` |
| melisKey des droits / capabilities | `melisprospects_tool_prospects_section` | `melisprospects_tool_themes_section` |
| Base de l'API | `/melis/react-api/prospects` | `/melis/react-api/prospect-themes` |
| Contrôleur | `MelisReactApiProspectController` | `MelisReactApiProspectThemeController` |

> Note : le `melisKey` du manifest est la clé de **zone** renderable utilisée pour l'iframe de la vue
> Ancien — les droits ne s'y rattachent **pas**. Le garde d'accès et les capabilities reposent sur le
> nœud de menu `melisprospects_tool_..._section` (déclaré dans `config/app.interface.php`).

### Outil Prospects

![L'outil Prospects React : cartes KPI (Total / Ce mois-ci / Moyenne par mois / Anonymisés), recherche, filtres Tous les sites et Tous les types, un sélecteur de plage de dates, Réinitialiser les filtres, un gestionnaire de Colonnes, Exporter, la bascule Nouveau/Ancien et un bouton d'actualisation — chaque ligne dispose des actions modifier et supprimer](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-prospects-list.png)

Vous voyez **tous les prospects de la plateforme**. La liste comporte **quatre cartes KPI** (Total,
Ce mois-ci, Moyenne par mois, Anonymisés), un champ de **recherche** (nom / email / téléphone /
société), un filtre **site**, un filtre **type**, un sélecteur de **plage de dates** (Aujourd'hui /
Hier / 7 derniers jours / 30 derniers jours / Ce mois-ci / Mois dernier / Personnalisé),
**Réinitialiser les filtres**, un gestionnaire de **Colonnes** persistant, **Exporter** et un bouton
d'actualisation. Cliquez sur un en-tête pour **trier** (toutes les colonnes sauf *Message*). Chaque
ligne dispose des actions **modifier** et **supprimer**.

Les prospects ne sont **pas créés** ici — ils proviennent uniquement du formulaire de contact du
front. Cliquer sur **modifier** ouvre le prospect dans un **sous-onglet** hôte (← Retour) affichant un
formulaire React : une carte **Informations de contact** (Nom, Email, Téléphone, Société, Pays), une
carte **Message** et une carte latérale **Détails** (sélecteur **Site**, sélecteur **Thème**, **Date
de contact** en lecture seule). Aucun champ n'est obligatoire (le format de l'email n'est vérifié que
s'il est renseigné) ; la **Date de contact** et le **type** sont immuables — ils sont définis au moment
de la capture par le formulaire front.

![Le formulaire d'édition de prospect React — une carte Informations de contact (Nom, Email, Téléphone, Société, Pays), une zone Message et une carte latérale Détails (Site, Thème, Date de contact en lecture seule) ; la barre de sous-onglets montre le drill-down (← Retour · Paul Martin)](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-prospects-edit.png)

### Outil Thèmes

La liste des thèmes affiche **deux cartes KPI** (Total des thèmes, Total des items), un champ de
**recherche**, **Réinitialiser les filtres**, un gestionnaire de **Colonnes**, **Exporter**, la bascule
**Nouveau/Ancien** et **+ Nouveau thème**. Chaque ligne affiche le **nom** du thème et son **nombre
d'items**, avec trois actions : **renommer** (modale à un seul champ), **modifier** (ouvre le
sous-onglet **Items** du thème) et **supprimer**.

![L'outil Thèmes React : cartes KPI Total / Items, recherche, Réinitialiser les filtres, Colonnes, Exporter, bascule Nouveau/Ancien et « + Nouveau thème » — chaque ligne expose renommer, modifier (ouvrir les items) et supprimer](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-list.png)

![La modale « Nouveau thème » — un unique champ Nom (le code est préservé par le back-end, il n'est pas saisi ici)](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-new-modal.png)

Modifier un thème ouvre son panneau **Items** dans un sous-onglet (← Retour + nom du thème) : une liste
d'items consultable (id + nom) avec modifier/supprimer par ligne et **+ Nouvel item**. Ajouter ou
modifier un item ouvre une modale capturant un **nom par langue CMS** — une rangée d'onglets de langue
(drapeau + pastille verte « renseigné ») plus le champ **Nom** pour la langue active. Au moins une
langue doit être renseignée.

![Le panneau Items d'un thème (sous-onglet) pour « My Billing » — une liste d'items consultable avec modifier/supprimer par ligne et un bouton « + Nouvel item », affiché en sous-onglet drill-down](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-edit-themecategorylist.png)

![La modale « Nouvel item » — onglets « Contenu par langue » (English / Français) et le champ Nom pour la langue active](/screenshots/react/melis-cms-prospects/meliscmsprospects-tool-themes-edit-themecategorylist-new-modal.png)

## API React

Les routes se trouvent dans `config/react-api.php` (fusionnées via `Module::getConfig()`). Toutes sous
`/melis/react-api/`, contrat `{ success, data, error }` ; chaque requête envoie
`X-Requested-With: XMLHttpRequest` et `credentials: 'include'`.

**Prospects** — `MelisReactApiProspectController` :

| Méthode & URL | Rôle |
| --- | --- |
| `GET /prospects` | Liste par keyset (`limit,search,site,type,dateFrom,dateTo,sort,dir,after`) → `{items,total,nextCursor}` |
| `GET /prospects/stats` | KPI `{total, thisMonth, avgPerMonth, anonymized}` |
| `GET /prospects/sites` | Options du filtre site |
| `GET /prospects/types` | Valeurs distinctes de `pros_type` |
| `GET /prospects/themes` | Options d'items de thème pour le sélecteur Thème du formulaire |
| `GET /prospects/:id` | Un prospect (formaté) |
| `POST /prospects/save` | **Mise à jour uniquement** (pas de création) ; date de contact & type immuables côté serveur |
| `DELETE /prospects/delete/:id` | Supprimer un prospect |

**Thèmes & items** — `MelisReactApiProspectThemeController` :

| Méthode & URL | Rôle |
| --- | --- |
| `GET /prospect-themes` | Liste par keyset des thèmes → `{items,total,nextCursor}` avec `itemCount` |
| `GET /prospect-themes/stats` | KPI `{total, withCode, items}` |
| `GET /prospect-themes/:id` | Un thème `{id,name,code,itemCount}` |
| `POST /prospect-themes/save` | Création (id=0) / mise à jour (nom requis ≤45, unique ; code conservé s'il est absent) |
| `DELETE /prospect-themes/delete/:id` | Supprimer un thème + items + traductions (cascade) |
| `GET /prospect-themes/languages` | Langues CMS `{languages:[{id,name,locale}]}` |
| `GET /prospect-themes/items?themeId=X` | Les items d'un thème (nom dans la langue de session) |
| `GET /prospect-themes/items/:id` | Un item `{id,themeId,translations:{langId:text}}` |
| `POST /prospect-themes/items/save` | Créer/mettre à jour un item (≥1 traduction non vide ; upsert/delete par langue) |
| `DELETE /prospect-themes/items/delete/:id` | Supprimer un item + ses traductions |

```ts
// update a prospect (no create)
await apiFetch<{id:number}>('/melis/react-api/prospects/save', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 3, siteId: 1, name: 'Paul Martin',
    email: 'paul.martin@example.com', message: '…', theme: null }),
})
// save a theme item (name per language)
await apiFetch<{id:number}>('/melis/react-api/prospect-themes/items/save', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 0, themeId: 2, translations: { '1': 'My invoices', '2': 'Mes factures' } }),
})
```

> Les deux contrôleurs dialoguent directement avec les tables via des requêtes SQL paramétrées
> (`AdapterInterface`, listes par keyset via `MelisReactKeysetListTrait`), reproduisant les règles
> métier historiques. Ils déclenchent toujours les événements de log historiques
> (`meliscmsprospects_toolprospects_save_end` / `_delete_end`,
> `meliscmsprospects_theme_save_end` / `_delete_end`, `meliscmsprospects_theme_item_save_end`) afin que
> les listeners flash/log du module continuent de fonctionner.

## Capabilities

Déclarées dans `config/react.capabilities.php` (`melisReactToolCapabilities`), indexées par le melisKey
du nœud de menu porteur des droits. `Capabilities::flatten()` produit des chaînes pointées passées à
`MelisCan(melisKey, cap)` côté React et `denyUnlessCan(cap)` côté serveur (autorisation par défaut pour
une capability non déclarée).

```php
'melisprospects_tool_prospects_section' => ['list', 'edit', 'delete', 'export'], // NO create
'melisprospects_tool_themes_section' => [
    'actions' => ['create', 'list', 'edit', 'delete', 'export'],
    'tabs' => [
        ['key' => 'items', 'label' => 'tr_melis_cms_prospects_theme_items',
         'actions' => ['list', 'create', 'edit', 'delete']],
    ],
],
```

- **Prospects** : `list`, `edit`, `delete`, `export` (pas de `create` — un prospect ne naît que du
  formulaire de contact public).
- **Thèmes** : `create`, `list`, `edit`, `delete`, `export`, plus le sous-onglet `items`
  (`items`, `items.list`, `items.create`, `items.edit`, `items.delete`).

Chaque action de contrôleur effectue deux gardes : `denyUnlessAccess()` (auth + `MelisCoreRights::canAccess`)
puis `denyUnlessCan('list')` etc. `save` choisit `edit` ou `create` selon l'id.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsProspectsService` / `MelisProspectsService` | Service principal. `saveProspectsDatas($datas, $prosId = null)` crée ou met à jour un prospect ; `getProspectsDataForWidgets($widgetId = '')` retourne les totaux / mois en cours / moyennes ; `getProspectsDataByDate($type, $date)` compte les inscriptions par date ; `getWidgetProspects($identifier)` récupère les données pour un widget. |
| `MelisProspectsGdprAutoDeleteService` | Gère le cycle d'auto-suppression RGPD (liste des modules, liste des tags, listes d'utilisateurs d'avertissement / second avertissement, suppression du compte). |

Passerelles de table : `MelisProspects`, `MelisCmsProspectsThemeTable`,
`MelisCmsProspectsThemeItemTable`, `MelisCmsProspectsThemeItemTransTable`.

> Les contrôleurs React n'utilisent **pas** `MelisCmsProspectsService` (ils interrogent directement les
> tables) ; les outils classiques (vue Ancien), le plugin Show Form, le widget de tableau de bord et les
> listeners RGPD continuent de s'appuyer dessus.

## Front office

Le plugin de contrôleur `MelisCmsProspectsShowFormPlugin` affiche le formulaire de contact en
front-office. Déposez le bloc **Show Form** sur une page depuis le panneau des plugins de l'éditeur de
pages React (sous **Melis Cms Prospects**). Sa modale de configuration conserve trois onglets :

![L'éditeur de pages React avec le panneau des plugins ouvert — le bloc « Contact Form » se trouve sous le groupe « Melis Cms Prospects », prêt à être déposé sur la page](/screenshots/react/melis-cms-prospects/meliscmsprospects-page-menu-plugins-selector.png)

![Show Form — onglet Field list : le constructeur de champs — par champ un commutateur Afficher/Masquer et une case Obligatoire ; les lignes sont triables par glisser-déposer, leur ordre correspond à l'ordre du formulaire](/screenshots/react/melis-cms-prospects/meliscmsprospects-page-plugins-showform-config-tab-fieldlist.png)

| Onglet | Contrôles |
| --- | --- |
| Properties | Template de rendu (`template_path`) et site source (`pros_site_id`). |
| Field list | Constructeur de champs — par champ un commutateur Afficher/Masquer et une case Obligatoire (activée uniquement lorsque Afficher est actif) ; glissez les lignes pour définir l'ordre du formulaire. Champs : `pros_name`, `pros_company`, `pros_country`, `pros_email`, `pros_telephone`, `pros_message`. |
| Themes | Le thème qui alimente le menu déroulant de sujet du formulaire. |

Fichier de configuration : `config/plugins/MelisCmsProspectsShowFormPlugin.config.php`. Template front :
`view/.../plugins/prospects-form.phtml`. Sur le tableau de bord du back-office, le widget **Prospects
Statistics** (`MelisCmsProspectsStatisticsPlugin`, section `MelisMarketing`) trace un graphique des
inscriptions dans le temps.

![Le widget de tableau de bord « Prospects statistics » — un graphique des inscriptions Quotidien/Mensuel/Annuel plus un tableau des prospects les plus récents](/screenshots/react/melis-cms-prospects/meliscmsprospects-dashboard-plugin-prospectsstatistics.png)

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_cms_prospects` | Un lead capturé : site, type, thème, nom, email, téléphone, message, société, pays, date de contact, dernière date RGPD. PK : `pros_id`. |
| `melis_cms_prospects_themes` | Thèmes de sujets (`pros_theme_name`, `pros_theme_code`). PK : `pros_theme_id`. |
| `melis_cms_prospects_theme_items` | Items appartenant à un thème. PK : `pros_theme_item_id`. |
| `melis_cms_prospects_theme_items_trans` | Traductions par langue des items de thème. PK : `item_trans_id`. |

## Hooks d'événements

À attacher avec `MelisCmsProspects` comme identifiant cible :

| Nom de l'événement | Déclenché par |
| --- | --- |
| `meliscmsprospects_toolprospects_save_start` / `_end` | Outil Prospects (classique + contrôleur React) |
| `meliscmsprospects_toolprospects_delete_start` / `_end` | Outil Prospects (classique + contrôleur React) |
| `meliscmsprospects_theme_save_end` / `_delete_end` | Outil Thèmes (classique + contrôleur React) |
| `meliscmsprospects_theme_item_save_end` | Items de thème (classique + contrôleur React) |

```php
$sharedEvents->attach(
    'MelisCmsProspects',
    'meliscmsprospects_toolprospects_save_end',
    $fn,
    50
);
```

Les listeners RGPD (informations utilisateur, extraction, suppression, auto-suppression) sont câblés dans
`src/Module.php`. Les mappings de champs RGPD se trouvent dans `config/app.gdpr.php`.

## Fichiers clés

| Élément | Chemin (sous `vendor/melisplatform/melis-cms-prospects/`) |
| --- | --- |
| Config module / routes / services | `config/module.config.php` |
| Routes react-api + invokables | `config/react-api.php` |
| Capabilities React | `config/react.capabilities.php` |
| Arbre de l'interface back-office | `config/app.interface.php` |
| Tables & formulaires des outils classiques | `config/app.tools.php` |
| Config du plugin de templating | `config/plugins/MelisCmsProspectsShowFormPlugin.config.php` |
| Config du widget de tableau de bord | `config/dashboard-plugins/` |
| Mapping des champs RGPD | `config/app.gdpr.php` |
| Contrôleurs de l'API React | `src/Controller/MelisReactApiProspectController.php`, `MelisReactApiProspectThemeController.php` |
| Contrôleurs classiques | `src/Controller/ToolProspectsController.php`, `MelisCmsProspectsThemesController.php`, `MelisCmsProspectsThemeItemsController.php` |
| Service principal | `src/Service/MelisCmsProspectsService.php` |
| Service RGPD d'auto-suppression | `src/Service/` |
| Plugin de formulaire front | `src/Controller/Plugin/MelisCmsProspectsShowFormPlugin.php` |
| Widget de tableau de bord | `src/Controller/DashboardPlugins/MelisCmsProspectsStatisticsPlugin.php` |
| Bricks React (source / build) | `ui-react/src/` → `public/ui-react/brick.js` + `brick.manifest.json` |
| Passerelles de table | `src/Model/Tables/` |
| Listeners RGPD & bootstrap | `src/Module.php`, `src/Listener/` |

Voir aussi : [Référence des modules](/fr/reference/modules) · [melis-cms](/fr/reference/modules/melis-cms) · [melis-core](/fr/reference/modules/melis-core)
