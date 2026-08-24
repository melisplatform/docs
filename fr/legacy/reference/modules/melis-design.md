# MelisDesign

> Catalogue de design / bibliothèque de patrons pour le back-office : ~60 écrans HTML/JS prêts à
> l'emploi, construits sur le thème admin MelisCore. Paquet `melisplatform/melis-design`.

## Présentation

MelisDesign ne fournit aucune base de données, aucun service et aucune logique métier — c'est une
référence pure de vues et de ressources. Chaque page de démonstration est un contrôleur qui affiche
un `.phtml` illustrant l'apparence d'un écran ou d'un widget donné avec le CSS de MelisCore déjà
appliqué. Le flux de travail prévu est de trouver le design le plus proche dans le catalogue, de
copier son balisage (et le JS si nécessaire) dans votre propre module, puis de le connecter à vos
propres données. Comme l'indique le README : *"All styles are already included with MelisCore. There is no
need to look for CSS. Just find the HTML and JS if needed and start coding a plugin!"*

Il dépend uniquement de **`melisplatform/melis-core`** (`^5.2`) pour le thème et les ressources.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisDesign',
];
```

`melis-cms` doit également être présent sur la plateforme.

## Back-office

Le module apparaît comme un outil unique dans le back-office, listé sous
`meliscore_toolstree_section` avec la melisKey `meliscore_tool_creatrion_designs`. Il s'affiche
dans le menu de gauche sous **HTML** (`melisdesign_cof`), qui énumère l'ensemble des ~60 pages de
démonstration. Cliquer sur une page affiche ce design en plein écran — en lecture seule, rien à
configurer ni à enregistrer.

Les designs sont regroupés comme suit :

| Groupe | Démonstrations |
| --- | --- |
| Shells d'application & profils | Dashboard · Profile / Resume · Portfolio · Edit Account · Social · Ratings |
| Support / communauté | Support Tickets · Forum Overview · Forum Post · Q&A Listing · Q&A Page · Knowledge Base · Survey |
| Commerce & finance | Pricing Tables · Finances · Invoice · Bookings · Add Product · Products |
| Médical (démo verticale) | Medical Overview · Patients · Appointments · Memos · Metrics |
| Cartes | Google Maps · Clustering · Extend · Filter · Search · JSON · Vector Maps |
| Médias & galeries | Photo Gallery · Gallery Video · Carousel · Sliders |
| Données & mise en page | Tables · Responsive Tables · Grid System · Charts · Calendar · Events · Contacts · Timelines · Widgets |
| Éléments UI | Buttons · Icons · Typography · Alerts & Notifications · Modals · Tabs |
| Formulaires | Form Wizards · Form Elements · Form Validator |
| Fichiers & messagerie | File Manager · Inbox |
| Authentification & erreurs | Login · Signup · Error |

Le sous-menu **HTML** est déclaré dans `config/app.interface.php` ; chaque entrée `forward` vers
son contrôleur. `DesignSidebarController` affiche la navigation de gauche et expose deux helpers
AJAX : `getDomAction()` (retourne le DOM de la barre latérale via `MelisCoreTool::getViewContent`)
et `getResourceAction()` (retourne la configuration des ressources d'un design depuis
`melisdesign/datas/<key>` dans `MelisCoreConfig`).

## Tables de base de données

Aucune. MelisDesign ne fournit aucun SQL d'installation ni aucun schéma de base de données.

## Exemple

Réutiliser un design dans votre propre module — le flux de travail prévu :

```php
// 1. Parcourez les Designs dans le BO (menu de gauche : HTML) et choisissez l'écran ou composant le plus proche.
// 2. Copiez le balisage .phtml dans la vue de votre outil :
//    vendor/melisplatform/melis-design/view/melis-design/<area>/*.phtml
// 3. Si le design nécessite un comportement JS, récupérez le fichier correspondant :
//    vendor/melisplatform/melis-design/public/js/<area>/*
// 4. Ignorez le CSS — MelisCore charge déjà toutes les classes requises.
// 5. Remplacez le contenu de démonstration par vos vraies données / liaisons.
```

Modèle de contrôleur (tous les contrôleurs de design suivent la même structure) :

```php
// src/Controller/ButtonsIconsController.php
public function renderButtonsIconsAction()
{
    $melisKey = $this->params()->fromRoute('melisKey', '');
    $view = new ViewModel();
    $view->melisKey = $melisKey;
    return $view; // → view/melis-design/buttons-icons/…phtml
}
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Un contrôleur par design | `vendor/melisplatform/melis-design/src/Controller/<Name>Controller.php` |
| Balisage HTML à copier | `vendor/melisplatform/melis-design/view/melis-design/<area>/` |
| JS optionnel par design | `vendor/melisplatform/melis-design/public/js/<area>/` |
| Outil & liste des pages (menu de gauche) | `vendor/melisplatform/melis-design/config/app.interface.php` |
| Routage + carte des contrôleurs | `vendor/melisplatform/melis-design/config/module.config.php` |

Voir aussi : [MelisCore](/fr/legacy/reference/modules/melis-core)
