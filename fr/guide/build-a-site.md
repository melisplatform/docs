# Construire un site (CMS)

Melis est avant tout un **CMS**. Cette page explique le modèle de contenu — **sites**, **pages**,
**templates** et **plugins** — et comment une page est rendue sur le front office. C'est le modèle
mental à avoir avant d'éditer des templates ou de construire un module de site.

::: tip v6 — Back-office React
Melis v6 conserve le même framework, les mêmes modules et le même modèle de données décrits ici. Ce
qui change, c'est l'**interface du back-office** : elle tourne désormais comme une **application
React sur `/melis-react`**. Le CMS est livré sous forme d'outils « bricks » nativement React — une
**barre latérale d'arbre de pages** plus un **éditeur de page à onglets** et un ensemble d'outils
latéraux (Sites, Templates, Styles, Langues…). La seule exception est l'onglet **Édition** de la
page, qui charge toujours l'éditeur glisser-déposer classique **dans une iframe**. Chaque outil
latéral dispose d'une bascule **Nouveau / Ancien** pour revenir à l'outil classique si nécessaire.
Les concepts ci-dessous sont inchangés ; seul l'*endroit où vous cliquez* est nouveau.
:::

## Le modèle de contenu

| Concept      | Ce que c'est | Table(s) principale(s) |
| ------------ | ------------ | ---------------------- |
| **Site**     | Un site web. Possède une page d'accueil, des langues et un ou plusieurs domaines par environnement. | `melis_cms_site`, `melis_cms_site_domain` |
| **Page**     | Un nœud de l'arbre de pages du site. A un type (site/dossier/page), un template et du contenu. | `melis_cms_page_tree`, `melis_cms_page_published`, `melis_cms_page_saved` |
| **Template** | La mise en page utilisée — il pointe vers un contrôleur/action/vue d'un module de site. | `melis_cms_template` |
| **SEO**      | Slug d'URL et meta tags par page. | `melis_cms_page_seo` |
| **Langue**   | Une page peut avoir des traductions liées entre elles. | `melis_cms_lang`, `melis_cms_page_lang` |

Ces tables appartiennent à **MelisEngine**, le moteur du CMS — la source de vérité unique pour le
modèle de page/site. Le back-office React les lit et les écrit uniquement à travers les services et
les table gateways du moteur ; il ne touche jamais directement au schéma. Voir
[MelisEngine](/fr/reference/modules/melis-engine).

### Les pages sont versionnées

Chaque page existe en deux versions :

- **Saved** (`melis_cms_page_saved`) — le brouillon de travail que vous éditez dans le backoffice.
- **Published** (`melis_cms_page_published`) — la version live servie sur le front office.

Vous éditez le brouillon, puis vous **publiez** quand c'est prêt. Le contenu éditable de la page
(voir *zones* et *plugins* ci-dessous) est stocké sur l'enregistrement de la page.

## Les templates

Un **template** (`melis_cms_template`) est le pont entre une page et le code qui la rend. Pour le
type de template courant `ZF2`, il stocke :

- `tpl_zf2_website_folder` — le **module de site** (p. ex. `MelisDemoCms`),
- `tpl_zf2_controller`, `tpl_zf2_action` — quel contrôleur/action rend la page,
- `tpl_zf2_layout` — le layout dans lequel l'envelopper.

Donc une page → référence un template → qui route vers une vue `.phtml` dans un module de site.

Dans le back-office React, vous gérez les templates dans l'outil latéral **Templates** (§ *Créer un
nouveau site*) — une liste et un formulaire nativement React pour le nom, le type, le site, le
layout, le contrôleur et l'action.

## Contenu éditable : zones & plugins

Les templates exposent deux types de zones éditables, via des **view helpers** :

### `MelisTag` — zones éditables simples

Une zone HTML/texte/média nommée qu'un éditeur modifie en ligne (TinyMCE) dans le backoffice :

```php
<?= $this->MelisTag($this->idPage, 'home-html-1', 'html', '<h1>Titre par défaut</h1>') ?>
```

Le contenu par défaut s'affiche tant qu'un éditeur ne l'a pas remplacé ; la valeur enregistrée est
stockée sur la page. Helper : `vendor/melisplatform/melis-front/src/View/Helper/MelisTagsHelper.php`.

### `MelisDragDropZone` — plugins de templating

Une zone de dépôt où les éditeurs glissent des **plugins de templating** — des blocs de contenu
réutilisables (un slider, une liste d'actualités, un formulaire de contact) :

```php
<?= $this->MelisDragDropZone($this->idPage, 'dragdropzone_home_1') ?>
```

Helper : `vendor/melisplatform/melis-front/src/View/Helper/MelisDragDropZoneHelper.php`.

Un plugin de templating étend `MelisEngine\Controller\Plugin\MelisTemplatingPlugin` et implémente :

- **`front()`** — renvoie les données/la vue rendues sur le site live,
- **`back()`** — le formulaire de configuration affiché dans l'éditeur du backoffice.

`MelisCmsSlider` et `MelisCmsNews` sont de bons plugins de référence ; utilisez
**MelisTemplatingPluginCreator** pour scaffolder les vôtres. Les éditeurs déposent ces blocs dans
l'onglet **Édition** de l'éditeur de page — voir ci-dessous.

## Comment une page se rend sur le front office

Le front office est servi par **MelisFront** (le moteur qui affiche les sites) au-dessus de
**MelisEngine** (services de pages/données). Ce rendu est entièrement côté serveur et inchangé en
v6 — le back-office React se contente d'*héberger* l'aperçu éditable, il ne re-rend pas la page dans
le navigateur. En gros :

1. Le vhost définit **`MELIS_MODULE`** → sélectionne le **module de site** à servir.
2. Une URL du type `…/id/5` résout vers la **page id 5** (route dans
   `vendor/melisplatform/melis-front/config/module.config.php`). Les URLs SEO pointent aussi vers
   des ids de page.
3. **MelisEngine** charge la page + son template
   (`vendor/melisplatform/melis-engine/src/Service/MelisPageService.php`).
4. Le contrôleur/action `ZF2` du template rend la vue `.phtml` du module de site.
5. Les zones `MelisTag` et les plugins `MelisDragDropZone` sont remplis depuis le contenu publié.
6. Le résultat est enveloppé dans le layout du site.

::: tip Modes édition / aperçu
La même page peut être demandée dans différents modes : `…/id/5` (live), `…/id/5/preview`
(brouillon enregistré), `…/id/5/renderMode/melis` (édition dans le back-office — c'est ce qu'affiche
l'iframe de l'onglet Édition).
:::

## Anatomie d'un module de site

Un **module de site** est un module Laminas normal qui contient les templates, vues et assets d'un
site. La référence est `vendor/melisplatform/melis-demo-cms/` (voir
[MelisDemoCms](/fr/reference/modules/melis-demo-cms)) ; les sites custom vivent généralement sous
`module/MelisSites/<VotreSite>/` :

```
MelisDemoCms/
├── config/
│   ├── module.load.php           # modules nécessaires au site (MelisEngine, MelisFront, plugins…)
│   ├── module.config.php         # routes / contrôleurs / services
│   ├── assets.config.php         # CSS & JS du front office
│   └── melis.plugins.config.php  # plugins de templating disponibles pour les templates
├── src/Controller/               # Home, Contact… (rendent les vues du template)
├── view/
│   ├── layout/                   # layouts du site
│   └── melis-demo-cms/home/index.phtml   # un template de page (utilise MelisTag / MelisDragDropZone)
└── public/                       # css / js / images
```

## Travailler dans le back-office React

En v6, vous construisez les sites depuis le **back-office React** sur `/melis-react`. Ouvrez la
section **MelisCms** dans la barre latérale de gauche : elle affiche le panneau **arbre de pages**
(vos sites et leurs pages) plus un groupe **Site Tools**.

![La section MelisCms dans la barre latérale React — arbre de pages plus Site Tools.](/screenshots/react/melis-cms/meliscms-menu-entry.png)

### L'arbre de pages

L'arbre de pages est la carte de vos sites et de chaque page qu'ils contiennent. Il réside dans la
**barre latérale de gauche**, il reste donc visible pendant que vous travaillez. Cliquez sur une
page pour l'ouvrir dans l'éditeur ; tapez un nom pour rechercher ; faites un clic droit sur un nœud
pour ajouter une page enfant, voir les détails, dupliquer, déplacer ou supprimer. Vous pouvez aussi
déplacer une page par glisser-déposer (les droits côté serveur décident de ce que vous pouvez
déplacer).

![L'arbre de pages React — sites et pages ; cliquez pour ouvrir, clic droit pour les actions.](/screenshots/react/melis-cms/meliscms-menu-site-treeview.png)

### L'éditeur de page — mettre du contenu sur une page

Ouvrir une page affiche l'éditeur : un **chrome nativement React** (titre + statut de la page,
boutons d'action, barre d'onglets) autour du contenu de l'onglet courant. Les onglets sont
**Propriétés · Édition · SEO · Langues** (plus des onglets apportés par d'autres modules —
Historique, Analytics, Scripts…). Les boutons d'action incluent **Enregistrer**, **Publier**,
**Voir** (Aperçu / Voir en ligne), **Dupliquer**, **Effacer le brouillon** et **Supprimer**.

- **Propriétés** *(React natif)* — le nom de la page, le type (Page / Dossier / Site), le template
  (mise en page), la langue, l'affichage dans le menu, le style et la taxonomie.

  ![L'onglet Propriétés React.](/screenshots/react/melis-cms/meliscms-page-tab-properties.png)

- **Édition** *(éditeur classique dans une iframe)* — remplir la page. Elle se rend en live et vous
  **glissez des blocs de contenu (plugins)** dans les zones du template (les zones
  `MelisDragDropZone`). Cet onglet est l'éditeur glisser-déposer classique chargé à l'intérieur du
  chrome React, si bien que le panneau des plugins, les mises en page de zones de dépôt et les
  éditeurs de texte enrichi sont exactement comme avant.

  ![L'onglet Édition — page live avec la surcouche glisser-déposer, dans le chrome React.](/screenshots/react/melis-cms/meliscms-page-tab-edition.png)

  ![Le panneau des plugins — les blocs de contenu que vous pouvez déposer sur la page.](/screenshots/react/melis-cms/meliscms-page-tab-edition-menu-templating-plugins.png)

- **SEO** *(React natif)* — l'URL conviviale, le titre/description meta et les champs de redirection.
- **Langues** *(React natif)* — créer et gérer les versions linguistiques de la page.

**Enregistrer vs Publier.** *Enregistrer* écrit le brouillon (Propriétés + SEO + le contenu
glisser-déposer, le tout en une seule action) ; *Voir → Aperçu* affiche le brouillon ; *Publier*
rend le brouillon courant live ; *Effacer le brouillon* revient à la version publiée. Règle
générale : éditez librement, **Enregistrez** au fil de l'eau, **Aperçu** pour vérifier, puis
**Publiez**.

### Les blocs de contenu standard

Les blocs que vous déposez sur la page dans l'onglet Édition proviennent de **MelisFront**. Les plus
courants : un bloc **HTML (Texte)** et un bloc **Média** (tous deux édités **sur place**), plus des
blocs de configuration paramétrés via une petite modale **Propriétés** — **Menu**, **Fil
d'Ariane**, **Liste depuis un dossier** et la **bannière RGPD**. Voir
[MelisFront](/fr/reference/modules/melis-front) pour le catalogue complet.

![Un bloc HTML (Texte) édité sur place, avec la barre d'outils WYSIWYG sur la page.](/screenshots/react/melis-front/melisfront-page-plugin-html-tag.png)

## Créer un nouveau site (vue d'ensemble)

À haut niveau :

1. **Créez le site** dans le back-office — barre latérale → **Site Tools → Sites → + Nouveau site**,
   puis l'**assistant en 5 étapes** (Multilingue → Langues → Domaines → Module → Récapitulatif), qui
   crée le site et sa page d'accueil.

   ![L'outil Sites React — chaque ligne est un site entier, avec « + Nouveau site ».](/screenshots/react/melis-cms/meliscms-tool-sites-list.png)

2. **Fournissez un module de site** sous `module/MelisSites/<VotreSite>/` (contrôleurs + templates
   `.phtml` + assets).
3. **Déclarez des templates** (`melis_cms_template`) pointant vers le contrôleur/action de votre
   module — Site Tools → **Templates**.
4. **Construisez l'arbre de pages** et assignez les templates ; ajoutez `MelisTag`/`MelisDragDropZone`
   à vos vues.
5. **Faites pointer un vhost** vers `public/` avec `SetEnv MELIS_MODULE "<VotreSite>"` (voir
   [Installation](/fr/guide/getting-started)).
6. **Publiez** et parcourez le front office.

Une fois le site créé, ouvrez-le depuis l'outil Sites pour le gérer à travers des onglets
nativement React : **Propriétés · Chargement des modules · Domaines · Langues · Configuration du
site · Traductions · Scripts**. L'onglet **Chargement des modules** est l'endroit où vous activez
une fonctionnalité pour un site donné (avec réordonnancement par glisser-déposer de l'ordre de
chargement).

> Commencez par lire `vendor/melisplatform/melis-demo-cms/` de bout en bout — c'est l'exemple
> canonique et fonctionnel de chaque concept de cette page.

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Services CMS (pages/sites) | `vendor/melisplatform/melis-cms/src/Service/` |
| Bricks CMS React (éditeur de page + outils latéraux) | `vendor/melisplatform/melis-cms/ui-react/src/` |
| Service de page (engine) | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| Rendu front | `vendor/melisplatform/melis-front/` |
| Helpers de zones éditables | `vendor/melisplatform/melis-front/src/View/Helper/` |
| Base plugin de templating | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Site démo de référence | `vendor/melisplatform/melis-demo-cms/` |

> Les modules React qui possèdent l'interface — [MelisCms](/fr/reference/modules/melis-cms),
> [MelisFront](/fr/reference/modules/melis-front) et [MelisEngine](/fr/reference/modules/melis-engine) —
> documentent en détail les outils, plugins et le modèle de données.
