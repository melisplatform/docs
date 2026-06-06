# MelisDesign

> Une bibliothèque de référence backoffice de patrons d'interface HTML/CSS/JS prêts à l'emploi, à
> copier lors de la création d'outils et de plugins. Paquet : `melisplatform/melis-design`.

## Objectif

MelisDesign ne fournit **aucun service métier ni aucune table de base de données**. C'est un
catalogue : des dizaines d'écrans backoffice pré-construits (tableaux de bord, formulaires, tableaux,
graphiques, cartes, galeries, calendriers, pages e-commerce, mises en page médicales/support,
connexion/inscription, etc.) stylés avec le CSS que MelisCore charge déjà. Lorsque vous construisez
un [outil](/fr/guide/create-a-tool) ou un [plugin](/fr/guide/plugins), vous ouvrez l'écran
correspondant dans le backoffice, repérez le balisage HTML et le code JS d'initialisation, le copiez
et le branchez sur votre propre logique. Comme le résume le README du module : « trouvez le HTML et
le JS si nécessaire et commencez à coder un plugin » — il n'y a aucun CSS à chercher.

## Activation

MelisDesign est un module Laminas standard. Il est listé dans `config/melis.module.load.php`
(entrée `'MelisDesign'`), il se charge donc avec la plateforme. Il dépend de **`melis-core`**
(déclaré dans `composer.json` et dans le `@require` de `Module.php`) ; ses ressources CSS/JS sont
enregistrées via la configuration d'interface de MelisCore et servies depuis le dossier `public/`
du module grâce à l'alias asset-manager `MelisDesign/`.

```php
// config/melis.module.load.php
return [
    // …
    'MelisDesign',
];
```

## Backoffice

L'ensemble du module est exposé comme un unique outil backoffice, déclaré dans
`config/app.interface.php` (pas de fichier `app.tool.php` séparé). Il se rattache à la section de
l'arbre des outils `meliscore_tool_creatrion_designs` (icône `fa fa-paint-brush`, libellé issu de
`tr_melistooldesign_title`) et expose un menu de gauche (`melisdesign_cof`) dont chaque entrée
`forward` vers un controller/action.

Chaque page suit la même forme : un controller nommé d'après le thème, avec une unique
`render<Topic>Action()` qui lit `melisKey` depuis la route et renvoie un `ViewModel` — le vrai
contenu réside dans le balisage `.phtml` et le script JS d'initialisation correspondant.

| Entrée de menu (melisKey) | Controller → action | Vue / JS |
| --- | --- | --- |
| `melis_dashboard` | `Dashboard` → `render-dashboard` | `view/melis-design/dashboard/`, `public/js/dashboard/` |
| `melis_profile_resume` | `ProfileResume` → `render-profile-resume` | `view/melis-design/profile-resume/` |
| `melis_portfolio` | `Portfolio` → `render-portfolio` | `public/js/portfolio/` |
| `melis_support_tickets` / `…_questions` / `…_answers` / `…_knowledge` / `…_forum_overview` / `…_forum_post` | `Support*` | `public/js/support-*` |
| `melis_pricing_tables`, `melis_survey`, `melis_events`, `melis_contacts` | `PricingTables`, `Survey`, `Events`, `Contacts` | `public/js/events/`, … |
| `melis_maps_google` / `…_clustering` / `…_extend_pagination` / `…_filtering` / `…_geo_search` / `…_json` / `…_vector` | `Maps*` | `public/js/maps-*.init.js` |
| `melis_photo_gallery`, `melis_gallery_video`, `melis_carousel`, `melis_sliders` | `PhotoGallery`, `GalleryVideo`, `Carousel`, `Sliders` | `public/js/photo-gallery/`, `public/js/tiny-slider/` |
| `melis_buttons_icons`, `melis_icons`, `melis_typography`, `melis_grid`, `melis_tabs`, `melis_timelines` | `ButtonsIcons`, `Icons`, `Typography`, `Grid`, `Tabs`, `Timelines` | — |
| `melis_tables`, `melis_tables_responsive` | `Tables`, `TablesResponsive` | `public/js/tables/`, `public/tables/datatables/` |
| `melis_notifications`, `melis_modals`, `melis_widgets`, `melis_charts`, `melis_calendar` | `Notifications`, `Modals`, `Widgets`, `Charts`, `Calendar` | `public/js/charts/`, `public/js/calendar/` |
| `melis_form_wizards`, `melis_form_elements`, `melis_form_validator`, `melis_file_manager` | `FormWizards`, `FormElements`, `FormValidator`, `FileManager` | `public/js/form-*`, `public/js/file-manager/` |
| `melis_inbox`, `melis_finances`, `melis_invoice`, `melis_bookings` | `Inbox`, `Finances`, `Invoice`, `Bookings` | `public/js/invoice/`, `public/js/bookings/` |
| `melis_medical_overview` / `…_patients` / `…_appointments` / `…_memos` / `…_metrics` | `Medical*` | `public/js/medical*` |
| `melis_social`, `melis_shop_edit_products`, `melis_shop_products`, `melis_ratings` | `Social`, `ShopEditProducts`, `ShopProducts`, `Ratings` | `public/js/products/`, `public/js/ratings/` |
| `melis_login`, `melis_signup`, `melis_my_account`, `melis_error` | `Login`, `Signup`, `MyAccount`, `Error` | `public/js/edit-account/` |

Tous les controllers résident dans `MelisDesign\Controller\*` et sont câblés en `invokables` dans
`config/module.config.php`. Le routage passe par la route enfant `melis-backoffice`
`application-MelisDesign` (`/MelisDesign/[:controller[/:action]]`).

## Front office

Aucun. MelisDesign n'a **aucun plugin de templating, aucun view helper et aucun controller plugin**.
C'est uniquement une référence de design : vous copiez son balisage dans vos propres plugins
front-office (voir [Plugins](/fr/guide/plugins)).

## Tables de base de données

Aucune. MelisDesign ne fournit ni `install/*.sql` ni delta dbdeploy.

## Ressources embarquées

La configuration d'interface du module (`config/app.interface.php`) charge un ensemble concaténé de
bibliothèques front-end utilisées par les exemples : FullCalendar, tiny-slider, Bootstrap Icons,
Prism, prettyPhoto et DataTables, plus les propres `design-tool.css` / `design-tool.js` du module.
Un bundle `build` (`public/build/css/bundle.css`, `public/build/js/bundle.js`) est fourni pour les
réduire en requêtes uniques.

## Exemple

Flux typique — réutiliser un écran MelisDesign dans votre propre plugin :

```text
1. Backoffice → Conception (pinceau) → ex. « Bookings ».
2. Lire le balisage : vendor/melisplatform/melis-design/view/melis-design/bookings/render-bookings.phtml
3. Lire le JS d'init : vendor/melisplatform/melis-design/public/js/bookings/bookings.init.js
4. Copier le HTML/JS dans votre outil ou plugin de templating et le brancher à votre service/données.
```

Le CSS est déjà chargé par MelisCore, donc seuls le HTML et le JS sont à reprendre.

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Amorçage du module | `vendor/melisplatform/melis-design/src/Module.php` |
| Routage + controllers (invokables) | `vendor/melisplatform/melis-design/config/module.config.php` |
| Déclaration outil/menu + ressources | `vendor/melisplatform/melis-design/config/app.interface.php` |
| Controllers d'exemple | `vendor/melisplatform/melis-design/src/Controller/*Controller.php` |
| Vues d'exemple | `vendor/melisplatform/melis-design/view/melis-design/<topic>/` |
| Scripts d'init d'exemple | `vendor/melisplatform/melis-design/public/js/` |
| Traductions | `vendor/melisplatform/melis-design/language/en_EN.interface.php`, `…/fr_FR.interface.php` |

Voir aussi : [Référence des modules](/fr/reference/modules) ·
[Créer un outil](/fr/guide/create-a-tool) · [Plugins](/fr/guide/plugins).