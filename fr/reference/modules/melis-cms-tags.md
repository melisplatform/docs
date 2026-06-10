# MelisCmsTags

> Système de tags/taxonomie partagé pour le CMS — créez des tags et associez-y des éléments de contenu.
> Package `melisplatform/melis-cms-tags`.

## Présentation

MelisCmsTags fournit un **gestionnaire de tags** dans le back-office permettant aux éditeurs de créer des tags multilingues
(titre par langue, image et document optionnels, avec portée par site) et de consulter/supprimer les éléments de contenu
associés à chaque tag. D'autres modules (par ex. MelisCmsNews) s'intègrent à la couche d'association via une
déclaration de configuration et un seul appel de service, rendant leurs éléments « taggables » sans aucune modification
du schéma du module de tags lui-même. Un plugin de template **List Tags** est inclus pour afficher les tags d'un site
sur le front office.

## Activation

Ajoutez dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsTags',
];
```

Nécessite `melis-core` et `melis-cms` (`^5.3`), PHP `^8.1|^8.3`. Le module est livré avec
`dbdeploy: true` — ses trois tables sont créées automatiquement au premier déploiement.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsTagsService` | CRUD complet des tags ainsi que l'API d'association. Chaque méthode déclenche des événements `*_start` / `*_end` via `MelisGeneralService`. |

Alias des passerelles de table : `TagTable`, `TagTextsTable`, `TagEntityTable` (tous enregistrés dans
`module.config.php`).

## Back-office

L'outil **Tags** est accessible depuis le menu de gauche sous **MelisCms → Tags** (`fa-tag`). Il s'ouvre
sur un DataTable filtrable de tous les tags (colonnes : ID, Titre, Nb associations, site ; avec actions d'édition et
de suppression par ligne) et un bouton **Ajouter un tag**. L'éditeur de tag comporte deux onglets :

| Onglet | Contenu |
| --- | --- |
| Texts | Titre par langue (sélecteur de langue + champ Titre par langue) |
| Associations | Tableau des éléments de contenu liés à ce tag (ID, Entity ID, Titre, Type d'entité) ; action de suppression d'association |

Les modales d'upload permettent d'associer une image et un document par tag ; les fichiers sont déposés dans `/media/tags/`. Les deux
DataTables sont définis dans `app.tools.php` : `tags_list_table` (`#tagsList`) pour la liste des tags et
`tags_list_association` (`#tagsListAssociations`) pour la grille d'associations par tag.

### Contrôleurs

| Contrôleur | Responsabilités |
| --- | --- |
| `TagsListController` | Écran de liste des tags : affichage, filtres (site / recherche / limite), JSON du tableau (`renderListData`), actions sur les lignes (info / édition / suppression), `deleteTag` |
| `TagController` | Éditeur de tag : en-tête, onglet Texts, onglet Associations, `save`, JSON de la grille d'associations (`renderListAssociationsData`), `deleteAssociation`, sélecteur de tag réutilisable (`renderTagSelect` / `getSelectTags`) |

## Front office

`ListTagsPlugin` (`Controller\Plugin\ListPublicationsPlugin.php`) étend `MelisTemplatingPlugin`.

| Paramètre | Détail |
| --- | --- |
| Clé de plugin de config | `tags` · Clé XML DB `TagsList` |
| Fichier de config | `config/plugins/ListPublicationsPlugin.config.php` |
| Vue front | `MelisCmsTags/listtags` |
| Onglets de paramètres | **Template** (sélection du template + sélection du site) · **Filters** (colonne / ordre / date-min / date-max / recherche) |

> **Note sur la dérive de nommage.** La classe du plugin se trouve dans `ListPublicationsPlugin.php`, et les vues Phtml livrées sont `listpublications.phtml` / `showpublication.phtml`. Il s'agit d'un artefact historique — la fonctionnalité active est bien le plugin **List Tags** décrit ci-dessus.

## Éléments de formulaire (sélecteurs de tags pour d'autres modules)

Enregistrés sous `form_elements.factories` dans `module.config.php`.

| Type d'élément | Factory | Usage |
| --- | --- | --- |
| `TagsSelect` | `TagSelectFactory` | Sélecteur de tags multi-choix |
| `TagsSelectSingle` | `TagSelectSingleFactory` | Sélecteur de tag unique |
| `TagsFondsSelect` | `TagFondsSelectFactory` | Sélecteur de groupe de tags (« fonds ») |
| `MelisCmsSiteTagSelect` | `MelisCmsSiteTagSelectFactory` | Sélecteur de tags par site |

## Tables de base de données

Structure de base dans `install/sql/setup_structure.sql` ; migrations dans `install/dbdeploy/`.

| Table | Contenu |
| --- | --- |
| `melis_cms_tag` | Ligne principale du tag : `tag_id`, `tag_creation_date`, `tag_site_id`, `tag_type` |
| `melis_cms_tag_texts` | Textes par langue : `tag_text_id`, `tag_id`, `tag_title`, `tag_lang_id` |
| `melis_cms_tag_entity` | Lien tag ↔ élément de contenu : `id`, `tag_id`, `entity_id`, `entity_type` (ex. `NEWS`) |

## Exemple

```php
$tags = $this->getServiceManager()->get('MelisCmsTagsService');

// Tag CRUD
$list = $tags->getTagsList($status, $langId, $start, $limit, $orderCol, $order, $siteId, $search);
$tag  = $tags->getTagById($tagId, $langId);
$id   = $tags->saveTag(['tag_site_id' => $siteId, ...], $tagId); // $tagId null → create
$tags->deleteTagById($tagId);

// Associations — the integration surface for other modules
$tags->saveTagEntity([$tagId1, $tagId2], $entityId, 'NEWS'); // (re)attach a tag set to an item
$set   = $tags->loadTagByEntityIdType($entityId, 'NEWS');    // tags of one item
$items = $tags->loadEntityByTagsId($tagIds, 'NEWS');         // items carrying given tags
$tags->deleteEntities($entityId, 'NEWS');                    // clear an item's tags
$assoc = $tags->getAssociationsByTagId($tagId, $langId);     // items associated to a tag (grid)
```

`saveTagEntity()` supprime les liens existants de l'entité puis ré-enregistre l'ensemble fourni — appelez-la depuis
le flux de sauvegarde d'un module de contenu pour maintenir ses tags à jour.

## Rendre un module « taggable » (associations pilotées par la config)

Déclarez le mapping sous `plugins.melis_cms_tag.datas.associations` dans
`config/associations.config.php`. L'exemple MelisCmsNews livré :

```php
'associations' => [
    'meliscmsnews' => [
        'module'           => 'MelisCmsNews',       // skipped if module not loaded
        'entity_type'      => 'NEWS',               // stored in melis_cms_tag_entity.entity_type
        'entity_table'     => 'melis_cms_news',
        'entity_primary_id'=> 'cnews_id',
        'trans' => [
            'trans_table'      => 'melis_cms_news_texts',
            'trans_foreign_id' => 'cnews_id',
            'trans_lang_key'   => 'cnews_lang_id',
        ],
        'association_title_key' => 'cnews_title',   // shown in the Associations grid "Title" column
    ],
],
```

Appelez ensuite `saveTagEntity()` dans l'action de sauvegarde du module de contenu et ajoutez un élément de formulaire
`TagsSelect` (ou `TagsSelectSingle`) à la spec de formulaire de son éditeur.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Config du module (routes, services, éléments de formulaire) | `vendor/melisplatform/melis-cms-tags/config/module.config.php` |
| Arbre de l'outil back-office + onglets de l'éditeur | `vendor/melisplatform/melis-cms-tags/config/app.interface.php` |
| Configs des DataTables | `vendor/melisplatform/melis-cms-tags/config/app.tools.php` |
| Mapping des associations | `vendor/melisplatform/melis-cms-tags/config/associations.config.php` |
| Config du plugin List Tags | `vendor/melisplatform/melis-cms-tags/config/plugins/ListPublicationsPlugin.config.php` |
| Service principal | `vendor/melisplatform/melis-cms-tags/src/Service/MelisCmsTagsService.php` |
| Contrôleurs | `vendor/melisplatform/melis-cms-tags/src/Controller/` |
| Plugin front | `vendor/melisplatform/melis-cms-tags/src/Controller/Plugin/ListPublicationsPlugin.php` |
| Passerelles de table | `vendor/melisplatform/melis-cms-tags/src/Model/Tables/` |
| Factories d'éléments de formulaire | `vendor/melisplatform/melis-cms-tags/src/Form/Factory/` |
| Listener (actif) | `vendor/melisplatform/melis-cms-tags/src/Listener/TagsFlashMessengerListener.php` |
| SQL d'installation | `vendor/melisplatform/melis-cms-tags/install/sql/setup_structure.sql` |
| Migrations DB | `vendor/melisplatform/melis-cms-tags/install/dbdeploy/` |

Voir aussi : [melis-cms](/fr/reference/modules/melis-cms),
[melis-cms-news](/fr/reference/modules/melis-cms-news),
[melis-front](/fr/reference/modules/melis-front),
[melis-engine](/fr/reference/modules/melis-engine),
[melis-core](/fr/reference/modules/melis-core)
