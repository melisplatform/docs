# MelisCmsSlider

> Gestionnaire de sliders / carousels en back-office — désormais une brique React native — accompagné d'un plugin de templating front-office pour afficher des sliders sur les pages. Paquet `melisplatform/melis-cms-slider`.

## Présentation

MelisCmsSlider fournit un outil back-office pour construire des **sliders** (des carousels nommés de slides ordonnés —
image, titre, sous-titres, lien) ainsi qu'un bloc de contenu `MelisCmsSliderShowSliderPlugin` qui affiche le slider
choisi sur n'importe quelle page front-office. Il embarque également un **sélecteur de slider** réutilisable en tant
qu'élément de formulaire, que d'autres modules (News, Blog) intègrent pour associer un slider à un contenu.

Dans Melis v6, l'outil embarque une **brique 100 % React native** pour le back-office `/melis-react`, avec une
bascule **New / Old** qui retombe sur l'outil classique dans une iframe. Le framework, les services, les tables de
base de données et le plugin front-office sont inchangés par rapport à la v5.

## Activation

Ajoutez à `config/melis.module.load.php` :

```php
return [
    // …
    'MelisCmsSlider',
];
```

Dépendances : `melis-core`, `melis-engine`, `melis-front`, `melis-cms`. Le module embarque
`dbdeploy: true`, ses tables sont donc créées/mises à jour par melis-dbdeploy. La brique React est
**conditionnée à l'activation** : elle n'apparaît dans le back-office que tant que le module est présent
dans `melis.module.load.php` (découverte modulaire des briques, voir plus bas).

## Back-office React

**Où :** menu latéral gauche → groupe **MelisCms** → **Slider** (route d'arbre `/melis-cms/slider`). Il s'ouvre
sous forme d'onglet principal nommé **Slider**. Une bascule **New / Old** (en haut à droite) permute entre
l'interface React (*New*, par défaut) et l'outil legacy dans une iframe (*Old*).

L'outil est une **navigation à trois niveaux**, exposée sous forme de **sous-onglets** natifs de l'hôte : liste des
sliders → les slides d'un slider → le formulaire d'un slide.

![Liste des sliders React avec cartes KPI, recherche, gestionnaire de colonnes, Export et la bascule New/Old](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-list.png)

### Niveau 1 — la liste des sliders

Liste tous les sliders de la plateforme (les sliders sont globaux ; un slider peut optionnellement être lié à une page).
La liste dispose de **cartes KPI** (total des sliders, total des slides, slides actifs), d'un champ de **recherche**,
d'un gestionnaire de **colonnes**, d'un bouton **Export** et de **Réinitialiser les filtres** ; cliquez sur un en-tête
pour trier. Chaque ligne propose **ouvrir** (ses slides), **renommer** et **supprimer**.

**+ Nouveau slider** ouvre une modale pour le **nom** et une **page liée** optionnelle choisie dans l'arbre des pages
du site ; la même modale renomme un slider existant.

![Modale de nouveau slider — nom plus page liée optionnelle depuis l'arbre des pages](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-new.png)

### Niveau 2 — les slides d'un slider

Ouvrir un slider ajoute un sous-onglet (avec **← Retour**) affichant les slides de ce slider : ordre, statut
(vert = actif), vignette de l'image, titre, sous-titre et lien. **Glissez une ligne pour réordonner** ; **+ Ajouter un
slide** en crée un ; édition/suppression par ligne.

![Les slides d'un slider — liste avec glisser-déposer pour réordonner et édition/suppression par ligne](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-edit-slidelist-tab-properties.png)

### Niveau 3 — édition d'un slide

Éditer (ou ajouter) un slide ouvre un sous-onglet imbriqué avec un formulaire React : **Titre**, **Sous-titre 1**, deux
champs **Description (HTML)**, **Lien**, une bascule **Actif** et un panneau **Image** (aperçu, **Choisir une image** /
**Retirer l'image** ; JPG, PNG, GIF ou WebP). **Enregistrer** persiste le slide. Titre et Sous-titre 1 sont du texte
brut ; les deux champs Description sont du HTML brut et correspondent à `sub2`/`sub3`.

![Formulaire de slide React — titre, sous-titre, deux descriptions HTML, lien, bascule Actif et panneau image](/screenshots/react/melis-cms-slider/meliscmsslider-tool-slider-edit-properties-slide-edit.png)

## API React

La brique lit/écrit via une couche JSON sous `/melis/react-api/sliders` (routes dans
`config/react-api.php`, contrôleur `MelisReactApiCmsSliderController`). Toutes les réponses suivent le
contrat `{ success, data, error }` ; chaque requête envoie `X-Requested-With: XMLHttpRequest` avec
`credentials: 'include'`.

| Méthode & URL | Rôle |
| --- | --- |
| `GET /sliders` | Liste les sliders (keyset : `limit`, `search`, `sort`, `dir`, `after`) avec `slideCount`. |
| `GET /sliders/stats` | Compteurs KPI `{sliders, slides, active}`. |
| `GET /sliders/:id` | Un slider `{id, name, pageId, slideCount}`. |
| `POST /sliders/save` | Crée / renomme un slider (`{id?, name, pageId?}`). |
| `DELETE /sliders/delete/:id` | Supprime un slider, ses slides et ses fichiers image. |
| `GET /sliders/:id/slides` | Les slides ordonnés d'un slider. |
| `POST /sliders/slides/reorder` | Réordonne (`{sliderId, ids:[…]}`). |
| `POST /sliders/slide/upload` | Upload d'image multipart (champ `image`, `?sliderId=`) → `{path}`. |
| `GET /sliders/slide/:id` | Un slide. |
| `POST /sliders/slide/save` | Crée / met à jour un slide. |
| `DELETE /sliders/slide/delete/:id` | Supprime un slide, re-séquence l'ordre, retire son image. |

Le contrôleur dialogue directement avec les tables via du SQL paramétré, reproduisant les règles métier
legacy (nom requis ≤255, ordre du slide auto = max+1, images sous `/media/sliders/<sliderId>/…` avec les
extensions jpg/jpeg/gif/png/webp, contrôle d'URL sûre sur le lien, suppression en cascade des fichiers). Le
service de plus haut niveau `MelisCmsSliderService` continue de sous-tendre l'outil legacy et le plugin front-office.

## Capacités

Les droits avancés sont déclarés dans `config/react.capabilities.php` sous le nœud porteur de droits
`meliscms_slider_tools_section`, reflétant les trois niveaux. Les chaînes de capacité aplaties (p. ex.
`list`, `create`, `rename`, `export`, `slides`, `slides.create`, `slides.image.create`) sont vérifiées côté
React via `MelisCan(melisKey, cap)` et côté serveur via `denyUnlessCan(cap)`. Chaque action de contrôleur
est gardée deux fois — un contrôle d'accès (`denyUnlessAccess()` → 401/403) puis une vérification de capacité ;
le résolveur de capacité est en **autorisation par défaut** pour les capacités non déclarées.

## Intégration à l'hôte

| Aspect | Comment |
| --- | --- |
| Découverte / conditionnement | `GET /melis/react-api/react-modules` liste les modules actifs embarquant un `brick.manifest.json` ; l'hôte charge `brick.js` et monte la brique. Retirer le module masque l'outil. |
| Menu → route | `useNavMenu` mappe le `forwardKey` `MelisCmsSlider/MelisCmsSliderList` vers `/melis-cms/slider`. |
| Sous-onglets | `subTabs: true` — la brique pilote la barre de sous-onglets native de l'hôte via `window.__melisOpenSubTab` / `__melisCloseSubTab` / `__melisUpdateSubTabLabel` ; chaque écran reste monté (masqué) pour préserver l'état. |
| Bascule New / Old | `window.__melisSetToolView(MELIS_KEY, mode)` ; *Old* affiche `/melis/react-tool-page?key=MelisCmsSlider_left_menu` dans une iframe. |
| i18n | La brique lit `document.documentElement.lang` et embarque un dictionnaire `{fr, en}` en interne. |

Identifiant de brique `slider` (correspond à `brick.tsx` ⇄ `brick.manifest.json`) ; le bundle est un IIFE Vite avec
React externalisé vers les globales de l'hôte, si bien que l'interface utilise des styles inline et une i18n
interne plutôt que d'importer les modules de l'hôte.

## Services principaux

Ceux-ci alimentent toujours l'outil legacy, les micro-services et le plugin front-office.

| Alias | Rôle |
| --- | --- |
| `MelisCmsSliderService` | Logique métier des sliders et des slides ; émet des événements `meliscmsslider_*`. |
| `MelisCmsSliderTable` | Passerelle de table pour `melis_cms_slider`. |
| `MelisCmsSliderDetailTable` | Passerelle de table pour `melis_cms_slider_details`. |

`MelisCmsSliderService` étend `MelisGeneralService` et expose :

| Méthode | Rôle |
| --- | --- |
| `getSlider($sliderId, $status)` | Un slider avec ses slides ; passez `1` pour ne retourner que les slides actifs. |
| `getSliderByPageId($pageId, $status)` | Slider lié à un id de page, avec ses slides. |
| `getSliderList($start, $limit, $order, $search)` | Liste paginée et recherchable de sliders. |
| `getSliderDetails($sliderDetailId)` | Une ligne de slide. |
| `saveSlider($data, $sliderId)` | Créer ou mettre à jour un slider ; retourne l'id du slider. |
| `saveSliderDetails($slideData, $detailId)` | Créer ou mettre à jour un slide. |
| `updateSliderDetailsOrdering($detailId, $newOrder)` | Réordonner un slide. |
| `deleteSlider($sliderId)` | Supprimer un slider et tous ses slides. |
| `deleteSliderDetails($sliderDetailId)` | Supprimer un slide. |

`getSlider()` / `getSliderByPageId()` retournent une entité `MelisCmsSlider\Entity\MelisCmsSlider` dont
`getSlider()` fournit la ligne conteneur et `getSliderDetails()` fournit les slides.

**Note sur les noms d'événements :** chaque méthode émet des événements `meliscmsslider_service_*_start` / `_end`, mais
plusieurs méthodes d'écriture réutilisent les noms d'événements d'une autre méthode dans le code source actuel.
`saveSlider` émet les événements `get_slider_details`, et `deleteSliderDetails` /
`updateSliderDetailsOrdering` réutilisent les événements `delete_details` de `deleteSlider` — un listener sur
`meliscmsslider_service_delete_details_end` se déclenche donc aussi lors des réordonnements.

**Micro-services** (`config/app.microservice.php`) exposent `getSliderList`, `getSlider`,
`getSliderDetails`, `getSliderByPageId`.

## Front office

Depuis l'**éditeur de page React** (MelisCms → ouvrir une page → Édition), ouvrez le panneau des plugins et déposez le
bloc **Show Slider** sur la page ; ses **Propriétés** vous permettent de choisir le template de rendu et le slider à
afficher.

![Bloc Show Slider dans le sélecteur de plugins de l'éditeur de page React](/screenshots/react/melis-cms-slider/meliscmsslider-page-menu-plugins-selector.png)

![Réglages du plugin Show Slider — choisir le template et le slider à afficher](/screenshots/react/melis-cms-slider/meliscmsslider-page-plugin-slider-config-properties-tab.png)

| Élément | Rôle |
| --- | --- |
| `MelisCmsSliderShowSliderPlugin` (plugin de contrôleur) | Récupère le slider configuré via `MelisCmsSliderService` et le rend via le template choisi. Config : `config/plugins/MelisCmsSliderShowSliderPlugin.config.php` — un onglet **Propriétés** avec `template_path` et `sliderId`. Template par défaut : `view/melis-cms-slider/plugins/showslider.phtml`. |
| `MelisCmsSliderPlugin` (aide de vue) | `MelisCmsSliderHelper` — affiche le plugin depuis un template phtml. |
| `CmsSliderSelect` (élément de formulaire) | Select peuplé des sliders disponibles ; fabrique `src/Form/Factory/CmsSliderSelectFactory.php`. Utilisé dans le formulaire d'options du plugin et intégré par News / Blog. |

**Interfaces de sélection réutilisables :** `meliscmsslider_select_slider` (`renderSelectSliderAction`) pour
News, `meliscmsslider_select_slider_blog` pour Blog.

**Consommateurs :** MelisCmsNews persiste le slider choisi dans `cnews_slider_id` et embarque un listener
qui dissocie un slider supprimé de toute actualité l'utilisant ; Blog utilise `cblog_slider_id`.

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_cms_slider` | Un slider : `mcslide_id`, `mcslide_name`, `mcslide_page_id`, `mcslide_date`. |
| `melis_cms_slider_details` | Un slide : `mcsdetail_id`, FK `mcsdetail_mcslider_id`, `mcsdetail_status`, `mcsdetail_title`, `mcsdetail_sub1`–`sub3`, `mcsdetail_link`, `mcsdetail_img`, `mcsdetail_order`. |

## Exemple

```php
$slider = $this->getServiceManager()->get('MelisCmsSliderService');

// Fetch one slider with active slides only
$one    = $slider->getSlider($sliderId, 1);

// Fetch the slider tied to a page
$byPage = $slider->getSliderByPageId($pageId, 1);

// Paginated list
$list   = $slider->getSliderList(0, 10, 'mcslide_id', null);

// Create / update
$id     = $slider->saveSlider($data, $sliderId);
$did    = $slider->saveSliderDetails($slideData, $detailId);

// Reorder
$slider->updateSliderDetailsOrdering($detailId, $newOrder);

// Delete slider + all its slides
$slider->deleteSlider($sliderId);
```

Écouter un événement du service :

```php
$sharedEvents->attach(
    'MelisCmsSlider',
    'meliscmsslider_service_delete_details_end',
    $fn,
    50
);
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Câblage du module | `vendor/melisplatform/melis-cms-slider/config/module.config.php` |
| Routes de l'API React | `vendor/melisplatform/melis-cms-slider/config/react-api.php` |
| Capacités React | `vendor/melisplatform/melis-cms-slider/config/react.capabilities.php` |
| Contrôleur de l'API React | `vendor/melisplatform/melis-cms-slider/src/Controller/MelisReactApiCmsSliderController.php` |
| Brique React | `vendor/melisplatform/melis-cms-slider/ui-react/src/` · `public/ui-react/brick.manifest.json` |
| Interface back-office / outils | `vendor/melisplatform/melis-cms-slider/config/app.interface.php` · `app.tools.php` |
| Formulaire de slide | `vendor/melisplatform/melis-cms-slider/config/app.forms.php` |
| Configuration micro-service | `vendor/melisplatform/melis-cms-slider/config/app.microservice.php` |
| Config du plugin de templating | `vendor/melisplatform/melis-cms-slider/config/plugins/MelisCmsSliderShowSliderPlugin.config.php` |
| Service | `vendor/melisplatform/melis-cms-slider/src/Service/MelisCmsSliderService.php` |
| Entité | `vendor/melisplatform/melis-cms-slider/src/Entity/MelisCmsSlider.php` |
| Passerelles de tables | `vendor/melisplatform/melis-cms-slider/src/Model/Tables/` |
| Fabrique du sélecteur de slider | `vendor/melisplatform/melis-cms-slider/src/Form/Factory/CmsSliderSelectFactory.php` |
| Aide de vue | `vendor/melisplatform/melis-cms-slider/src/View/Helper/MelisCmsSliderHelper.php` |
| Template front par défaut | `vendor/melisplatform/melis-cms-slider/view/melis-cms-slider/plugins/showslider.phtml` |

Voir aussi : [Référence des modules](/fr/reference/modules) · [Page legacy v5](/fr/legacy/reference/modules/melis-cms-slider)
