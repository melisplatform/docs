# MelisCmsCategory2

> Catégories de contenu multi-sites et multilingues pour le CMS, avec un back-office React natif — paquet `melisplatform/melis-cms-category2`.

## Présentation

MelisCmsCategory2 fournit un système de catégories hiérarchique dans le backoffice Melis. Les catégories forment
un arbre (chaque nœud pointe vers un parent), portent des traductions par langue (nom et description), peuvent
être associées à un ou plusieurs sites, disposent d'une période de validité et d'un statut, et peuvent contenir
des fichiers médias. Le module embarque un plugin de templating front-office pour afficher un arbre de catégories
dans une page, ainsi qu'un sélecteur de catégorie réutilisable intégré par d'autres modules (par ex. News,
Commerce) pour classer leurs enregistrements.

Dans le back-office React v6 (`/melis-react`), l'outil est livré sous forme de **brique full-React native** : une
véritable interface maître-détail — arbre de catégories à gauche, éditeur à onglets à droite — qui lit et écrit
à travers sa propre couche JSON `react-api`. Un basculement **New / Old** permet de revenir à l'outil hérité
dans une iframe. Le modèle de données sous-jacent, les services et le plugin front restent inchangés par rapport
à la v5.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsCategory2',
];
```

Nécessite `melis-core` et `melis-cms`. Le module est compatible `dbdeploy`, ses tables sont donc créées au
déploiement. `melis-engine` est requis pour le rendu front. La brique React n'apparaît dans le menu latéral
que tant que le module est listé ici (découverte modulaire des briques).

## Back-office (React)

**Où :** menu latéral gauche → groupe **MelisCms** → **Categories** (`Catégories`). L'outil s'ouvre comme une
unique page maître-détail — et non le carrousel multi-onglets — à la route `/melis-cms/category-v2`. Le
basculement **New / Old** en haut à droite alterne entre l'interface React (par défaut) et l'outil classique
dans une iframe.

![L'outil Catégories React — maître-détail : arbre de catégories à gauche, éditeur à onglets à droite, basculement New/Old en haut à droite](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-accordionsystem.png)

### Arbre de catégories (volet gauche)

La colonne de gauche affiche l'arbre complet. Sa barre d'outils comporte une **liste déroulante de langue**
(drapeaux — choisit la langue dans laquelle les noms de nœuds sont affichés), un **filtre par site**, un bouton
**rafraîchir**, un champ de **recherche** (élague l'arbre mais conserve les ancêtres) et **+ Nouvelle catégorie**
(crée une racine/un catalogue). Chaque ligne affiche une **pastille de statut** (vert = actif, rouge = inactif),
le nom du nœud et — au survol — un **+** (ajouter une sous-catégorie) et une **corbeille** (supprimer). Faites
glisser la poignée d'un nœud pour le réordonner ou changer son parent : près du bord supérieur = dépôt avant,
bord inférieur = dépôt après (frère), milieu = dépôt à l'intérieur (dernier enfant). Le glisser-déposer n'est
proposé que dans la vue complète non filtrée. Un nœud possédant des sous-catégories ne peut pas être supprimé.

![Le volet arbre React — liste déroulante de langue, filtre par site, rafraîchir, recherche, + Nouvelle catégorie, arbre avec pastilles de statut et ajout/suppression par nœud](/screenshots/react/melis-cms-category2/meliscmscategory2-page-plugin-categories-config-properties-search-category.png)

### Éditeur (volet droit)

Sélectionner un nœud — ou cliquer sur **+ Nouvelle catégorie** / le **+** d'une ligne — charge l'éditeur.
L'en-tête affiche le titre, son contexte (« à la racine » ou « sous «parent» ») et **Annuler** / **Enregistrer**.

- **Onglet Propriétés** — Nom et Description par langue (onglets de langue avec une pastille pleine/vide par
  langue), un interrupteur **Statut**, des dates de **Validité** (Début / Fin) et les **Sites** auxquels la
  catégorie appartient. Le Nom (dans au moins une langue) et au moins un Site sont obligatoires ; si les deux
  dates sont renseignées, le Début doit précéder la Fin.
- **Onglet Média** — attacher des **Images** et des **Fichiers** (deux colonnes, chacune avec **+ Ajouter** et
  une suppression par élément). Enregistrez d'abord la catégorie avant d'ajouter des médias.

![Nouvelle catégorie — onglet Propriétés : onglets de langue, Nom, Description, interrupteur Statut, dates de Validité, Sites](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-new-tab-properties.png)

![Éditeur de catégorie — onglet Média : grille d'Images (+ Ajouter une image) et liste de Fichiers (+ Ajouter un fichier)](/screenshots/react/melis-cms-category2/meliscmscategory2-tool-categories-new-tab-media.png)

## API React

Les routes se trouvent dans `config/react-api.php`, servies par
`MelisCmsCategory2\Controller\MelisCmsCategoryReactApiController`, imbriquées sous la base back-office du module
de sorte que le préfixe effectif est `/melis/MelisCmsCategory2/react-api`. Chaque réponse suit le contrat
`{ success, data, error }`. Le contrôleur dialogue directement avec les tables via du SQL paramétré, reproduisant
les règles métier héritées (nom dans ≥ 1 langue, ≥ 1 site, début ≤ fin, ordre auto = max+1, `-1` = père racine,
pas de suppression d'un nœud ayant des enfants, suppression en cascade des trad/sites/médias, téléversement de
médias renforcé).

| Méthode & URL (relative à la base) | Objet |
| --- | --- |
| `GET /tree?lang=` | Arbre de catégories complet → `{langId, nodes:[TreeNode]}` (nom résolu dans la langue, repli signalé) |
| `GET /langs` | Langues du CMS → `{langs:[{id,locale,name}]}` |
| `GET /sites` | Sites (filtre + formulaire) → `{sites:[{id,name}]}` |
| `GET /category/:id` | Une catégorie → `{id,parentId,status,dateStart,dateEnd,sites,translations}` |
| `POST /save` | Créer / mettre à jour une catégorie → `{id}` |
| `DELETE /delete/:id` | Supprimer une catégorie (bloqué si elle a des enfants) + réordonner les frères |
| `POST /reorder` | Réordonner les frères d'un parent (`{parentId, orderedIds:[…]}`) — change aussi le parent |
| `GET /category/:id/media` | Médias de la catégorie → `{images:[MediaItem], files:[MediaItem]}` |
| `POST /media/upload` | Téléversement multipart (`catId`, `type` image\|file, `file`) → `{id,type,path,name}` |
| `DELETE /media/delete/:id` | Supprimer une ligne de média + son fichier sur le disque |

## Capacités

Déclarées dans `config/react.capabilities.php` sous le nœud **porteur de droits**
`melis_cms_category_v2_tools_section` (c'est aussi la `MELIS_KEY` du contrôleur — et non la clé de zone du
manifeste `melis_cms_categories_v2`, qui ne cible que l'iframe *Old*). Chaque action du contrôleur protège
l'accès avec `canAccess(MELIS_KEY)`. `Capabilities::flatten()` transforme l'arbre en chaînes pointées passées
à `makeCan(...)` dans React :

| Capacité | Autorise |
| --- | --- |
| `tree.create` | Les boutons « + Nouvelle catégorie » et « + » par nœud |
| `tree.order` | La poignée de glisser-déposer (nécessite aussi la vue non filtrée) |
| `tree.delete` | La corbeille par nœud |
| `edition` | Le chargement de l'éditeur pour une catégorie existante (la création reste autorisée) |
| `edition.properties` | L'onglet Propriétés |
| `edition.media` | L'onglet Média |

## La brique

L'interface est écrite dans `ui-react/` (Vite IIFE, React / ReactRouter externalisés vers les globales de l'hôte,
sortie dans `public/ui-react/brick.js` à côté de `brick.manifest.json`). `brick.tsx` enregistre un composant
routé sous l'identifiant de brique `category2`.

```json
{
  "id": "category2",
  "route": "/melis-cms/category-v2",
  "label": "Catégories",
  "forwardKey": "MelisCmsCategory2/MelisCmsCategoryList",
  "melisKey": "melis_cms_categories_v2",
  "entry": "brick.js",
  "persistent": true
}
```

| Composant | Rôle |
| --- | --- |
| `CategoryPage.tsx` | Conteneur : charge les langues + sites, (re)charge l'arbre par langue, détient le nœud sélectionné et le `mode` New/Old, rend la disposition maître-détail + l'iframe *Old* |
| `CategoryTree.tsx` | Volet gauche — arbre, liste déroulante de langue, filtre par site, recherche, ajout/suppression par nœud, glisser-déposer / changement de parent |
| `CategoryEditor.tsx` | Volet droit — onglets Propriétés + Média, validation côté client, erreurs en ligne/bannière |
| `ViewToggle.tsx` | Basculement New (React) / Old (iframe) |
| `category-api.ts` | Client API typé pour les points d'accès ci-dessus |

L'hôte découvre la brique via `GET /melis/react-api/react-modules` et la monte ; `useNavMenu` associe le
`forwardKey` à la route de l'arbre. La brique lit la langue active depuis `document.documentElement.lang` et
embarque un dictionnaire `{fr,en}` interne. La logique métier reste côté serveur (parité avec l'outil hérité) ;
React se limite à la présentation et aux appels d'API.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsCategory2Service` | Service principal des catégories : créer/lire les nœuds, récupérer l'arbre, gérer les traductions et les liens de site. |
| `MelisCmsCategory2MediaService` | Stockage des fichiers par catégorie sur le disque et en base de données. |

Méthodes notables de `MelisCmsCategory2Service` :

- `getCategoryTreeview($fatherId, $langId, $onlyValid, $siteId)` — arbre récursif.
- `getCategoryById($categoryId, $langId, $onlyValid)` — nœud de catégorie complet.
- `getCategoryNameById($categoryId, $langId)` — recherche du nom.
- `getCategoriesPerSite($siteId, $langId)`, `getFirstLevelCategoriesPerSite($siteId, $langId)`.
- `saveCategory(...)`, `saveCategoryTexts(...)`, `saveCategorySites(...)` — persister le nœud/la traduction/le site.
- `reOrderCategories($parentId, $currentOrder)` — persister le glisser-déposer pour réordonner.
- `validateDates($dateStart, $dateEnd)`.

`MelisCmsCategory2MediaService` gère la partie système de fichiers : `uploadFile`, `deleteFile`,
`getMediaFilesByCategoryId`, `getFilesInDir`, `removeCategoryDir`.

> Le contrôleur `react-api` React utilise du SQL direct plutôt que ces services, mais le plugin front et le
> sélecteur de catégorie réutilisable appellent toujours `MelisCmsCategory2Service`.

## Front office

- **Plugin de templating** `MelisCmsCategoryDisplayCategoriesPlugin` — affiche un arbre de catégories dans une
  page. Sa configuration expose un onglet Propriétés avec trois champs : `template_path`, `site_id`,
  `category_start`. Template par défaut : `MelisCmsCategory2/default`. Dans l'éditeur de page React, déposez le
  bloc **Display Categories** et définissez le template, la catégorie de départ (sélecteur d'arbre) et le site.
- **Aide de vue** `renderTreeRec` — affiche récursivement un tableau d'arbre de catégories dans une vue.

![Réglages du plugin Display Categories — Template, Catégorie de départ (sélecteur d'arbre), Site](/screenshots/react/melis-cms-category2/meliscmscategory2-page-plugin-categories-config-properties.png)

Utilisation directe dans le code :

```php
$display = $this->MelisCmsCategoryDisplayCategoriesPlugin();
echo $display->render([
    'template_path' => ['MelisCmsCategory2/default'],
    'site_id'        => 1,
    'category_start' => 1,
]);
```

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_cms_category2` | Nœud de catégorie : `cat2_id`, `cat2_father_cat_id`, ordre, statut, référence, dates de validité, audit. |
| `melis_cms_category2_trans` | Traduction par langue : nom et description, indexée par `catt2_id`. |
| `melis_cms_category2_sites` | Lien catégorie-site, indexé par `cats2_id`. |
| `melis_cms_category2_media` | Média attaché à une catégorie : `catm2_type`, `catm2_path`, `catm2_cat_id`. |

Un nœud racine de départ (`cat2_id = 1`, "My catalog" / "Mon catalogue") est inséré à l'installation.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Routes de l'API React + contrôleur invokable | `vendor/melisplatform/melis-cms-category2/config/react-api.php` |
| Déclaration des capacités React | `vendor/melisplatform/melis-cms-category2/config/react.capabilities.php` |
| Contrôleur de l'API React (10 actions, SQL direct, téléversement renforcé) | `vendor/melisplatform/melis-cms-category2/src/Controller/MelisCmsCategoryReactApiController.php` |
| Brique React (Vite IIFE) | `vendor/melisplatform/melis-cms-category2/ui-react/` et build `public/ui-react/` |
| Manifeste de la brique | `vendor/melisplatform/melis-cms-category2/public/ui-react/brick.manifest.json` |
| Service principal | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryService.php` |
| Service média | `vendor/melisplatform/melis-cms-category2/src/Service/MelisCmsCategoryMediaService.php` |
| Plugin de templating | `vendor/melisplatform/melis-cms-category2/src/Controller/Plugin/MelisCmsCategoryDisplayCategoriesPlugin.php` |
| SQL d'installation | `vendor/melisplatform/melis-cms-category2/install/sql/` |

Voir aussi : [melis-cms](/fr/reference/modules/melis-cms), [melis-core](/fr/reference/modules/melis-core), [melis-cms-news](/fr/reference/modules/melis-cms-news)
