# Construire un site (CMS)

Melis est avant tout un **CMS**. Cette page explique le modèle de contenu — **sites**, **pages**,
**templates** et **plugins** — et comment une page est rendue sur le front office. C'est le modèle
mental à avoir avant d'éditer des templates ou de construire un module de site.

## Le modèle de contenu

| Concept      | Ce que c'est | Table(s) principale(s) |
| ------------ | ------------ | ---------------------- |
| **Site**     | Un site web. Possède une page d'accueil, des langues et un ou plusieurs domaines par environnement. | `melis_cms_site`, `melis_cms_site_domain` |
| **Page**     | Un nœud de l'arbre de pages du site. A un type (site/dossier/page), un template et du contenu. | `melis_cms_page_tree`, `melis_cms_page_published`, `melis_cms_page_saved` |
| **Template** | La mise en page utilisée — il pointe vers un contrôleur/action/vue d'un module de site. | `melis_cms_template` |
| **SEO**      | Slug d'URL et meta tags par page. | `melis_cms_page_seo` |
| **Langue**   | Une page peut avoir des traductions liées entre elles. | `melis_cms_lang`, `melis_cms_page_lang` |

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
**MelisTemplatingPluginCreator** pour scaffolder les vôtres.

## Comment une page se rend sur le front office

Le front office est servi par **MelisFront** (le moteur qui affiche les sites) au-dessus de
**MelisEngine** (services de pages/données). En gros :

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
(brouillon), `…/id/5/renderMode/melis` (édition dans le backoffice).
:::

## Anatomie d'un module de site

Un **module de site** est un module Laminas normal qui contient les templates, vues et assets d'un
site. La référence est `vendor/melisplatform/melis-demo-cms/` ; les sites custom vivent
généralement sous `module/MelisSites/<VotreSite>/` :

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

## Créer un nouveau site (vue d'ensemble)

À haut niveau :

1. **Créez le site** dans le backoffice (tool Sites) — nom, langues, page d'accueil.
2. **Fournissez un module de site** sous `module/MelisSites/<VotreSite>/` (contrôleurs + templates
   `.phtml` + assets).
3. **Déclarez des templates** (`melis_cms_template`) pointant vers le contrôleur/action de votre
   module.
4. **Construisez l'arbre de pages** et assignez les templates ; ajoutez `MelisTag`/`MelisDragDropZone`
   à vos vues.
5. **Faites pointer un vhost** vers `public/` avec `SetEnv MELIS_MODULE "<VotreSite>"` (voir
   [Installation](./getting-started)).
6. **Publiez** et parcourez le front office.

> Commencez par lire `vendor/melisplatform/melis-demo-cms/` de bout en bout — c'est l'exemple
> canonique et fonctionnel de chaque concept de cette page.

## Fichiers clés

| Sujet | Chemin |
| --- | --- |
| Services CMS (pages/sites) | `vendor/melisplatform/melis-cms/src/Service/` |
| Service de page (engine) | `vendor/melisplatform/melis-engine/src/Service/MelisPageService.php` |
| Rendu front | `vendor/melisplatform/melis-front/` |
| Helpers de zones éditables | `vendor/melisplatform/melis-front/src/View/Helper/` |
| Base plugin de templating | `vendor/melisplatform/melis-engine/src/Controller/Plugin/MelisTemplatingPlugin.php` |
| Site démo de référence | `vendor/melisplatform/melis-demo-cms/` |
