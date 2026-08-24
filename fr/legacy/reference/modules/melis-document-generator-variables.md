# MelisDocumentGeneratorVariables

> Outil back-office permettant de définir des variables statiques `$CODE$` (avec une valeur par
> langue) pour le MelisDocumentGenerator. Package `melisplatform/melis-document-generator-variables`.

## Présentation

`MelisDocumentGeneratorVariables` permet aux utilisateurs du back-office de créer des **variables
statiques** utilisées par `MelisDocumentGenerator` lorsqu'il remplace les balises `$VARIABLE$`
dans le texte des sections d'un document. Chaque variable possède un **code** unique et une
**valeur par langue**, de sorte que le document généré affiche le texte correct pour la langue
cible. Cela couvre le contenu identique pour tous les destinataires — nom de l'entreprise, pied de
page légal, adresses standards, etc. — par opposition aux valeurs provenant d'une réponse de
formulaire ou d'une déclaration XML de champs externes.

`MelisDocumentGenerator` **requiert** ce module et le traite comme l'une des trois sources de
substitution (champs de réponse de formulaire, champs externes, variables statiques). Les codes
sont maintenus globalement uniques entre les trois sources via `isCodeExisting()`.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisDocumentGeneratorVariables',
];
```

Nécessite `melisplatform/melis-core` (`^5.3`) et PHP `^8.1|^8.3`. Le module est consommé par
`MelisDocumentGenerator` ; installez ce module pour utiliser les variables dans les documents
générés.

## Services principaux

Enregistrés comme alias dans le service-manager via `config/module.config.php`. Le service étend
`MelisGeneralService` — chaque méthode déclenche des événements `*_start` / `*_end`.

| Alias de service | Rôle |
| --- | --- |
| `DocumentgeneratorvariablesService` | CRUD complet pour les variables et leurs valeurs par langue, ainsi que la vérification d'unicité `isCodeExisting()` et le résolveur `getVariable()` utilisé par le générateur. |

**Référence des méthodes :**

```php
$svc = $sm->get('DocumentgeneratorvariablesService');

$svc->getList($start, $limit, $searchKeys, $searchValue, $orderKey, $order, $langId, $count);
$svc->getItemById($id);
$svc->saveItem($data, $id);      // save the variable (code)
$svc->saveLang($data, $id);      // save the per-language value
$svc->deleteItem($id);
$svc->deleteLang($id);
$svc->getVariable($where);       // resolve a variable for the generator
$svc->deleteVariable($id);       // delete variable + all its translations
$svc->isCodeExisting($code, $id); // global uniqueness check — see below
```

### Unicité globale des codes

`isCodeExisting($code, $id)` prévient les collisions de balises dans l'ensemble de la pile du
générateur de documents. Elle retourne `true` si le code existe déjà dans **l'une ou l'autre** des
sources :

- la table `melis_static_variables` de ce module, **ou**
- tout fichier XML de champs externes déclaré sous
  `config['plugins']['melisformcreator']['datas']['external_fields']` (chaque fichier est chargé
  via `simplexml_load_file` et les valeurs `<field><code>` sont comparées sans distinction de casse).

Les passerelles de table sont également aliasées : `DocumentgeneratorvariablesTable`
(`melis_static_variables`) et `DocumentgeneratorvariablesLangTable`
(`melis_static_variables_trans`).

## Back-office

Le module enregistre un outil sous **MelisMarketing → Document Generator Variables**
(`fa fa-puzzle-piece`), melisKey `documentgeneratorvariables_tool`, pointant vers
`StaticVariables/render-tool`.

| Composant | Description |
| --- | --- |
| DataTable des variables (`app.tools.php`) | Liste toutes les variables avec les actions de recherche, limite, rafraîchissement, édition et suppression. |
| Modal d'ajout / édition (`render-modal-form`) | Ouvre un formulaire pour le code de la variable ainsi qu'un formulaire de valeur par langue (`Variables/render-language-form`). |
| `StaticVariablesController` | Gère la vue de l'outil, la modal et toutes les actions CRUD. |
| `VariablesController` | Affiche et traite le formulaire de valeur par langue. |
| `SavePropertiesListener` | Attaché aux routes du back-office ; gère les événements de sauvegarde. |
| `DeleteListener` | Attaché aux routes du back-office ; gère les événements de suppression. |

**Microservice** (`app.microservice.php`) : expose `getItemById` et `getList` de
`DocumentgeneratorvariablesService` via le microservice Melis pour permettre aux systèmes externes
de lire les variables.

## Tables de base de données

Créées par `install/dbdeploy/`.

| Table | Contenu |
| --- | --- |
| `melis_static_variables` | Définitions des variables : `msv_id`, `msv_code` (UNIQUE), `msv_creation_date`. |
| `melis_static_variables_trans` | Valeurs par langue, FK → `msv_id`. |

## Exemple

Résoudre la valeur d'une variable statique pour l'utiliser dans un document :

```php
$svc = $this->getServiceManager()->get('DocumentgeneratorvariablesService');

// Check uniqueness before saving a new variable
if (!$svc->isCodeExisting('COMPANY_NAME', null)) {
    $svc->saveItem(['msv_code' => 'COMPANY_NAME'], null);
    // Then save the value for each language
    $svc->saveLang(['lang_id' => 1, 'value' => 'Acme Corp'], $variableId);
}

// Resolve a variable (used internally by MelisDocumentGenerator)
$variable = $svc->getVariable(['msv_code' => 'COMPANY_NAME']);
```

Dans le texte d'une section du générateur de documents, écrivez `$COMPANY_NAME$` — le générateur
le remplace par la valeur définie par l'administrateur pour la langue du document.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Configuration du module / routes / services | `vendor/melisplatform/melis-document-generator-variables/config/module.config.php` |
| Arborescence des outils back-office | `vendor/melisplatform/melis-document-generator-variables/config/app.toolstree.php` |
| Configuration de la DataTable | `vendor/melisplatform/melis-document-generator-variables/config/app.tools.php` |
| Configuration du microservice | `vendor/melisplatform/melis-document-generator-variables/config/app.microservice.php` |
| Service principal | `vendor/melisplatform/melis-document-generator-variables/src/Service/DocumentgeneratorvariablesService.php` |
| Contrôleur principal + CRUD | `vendor/melisplatform/melis-document-generator-variables/src/Controller/StaticVariablesController.php` |
| Contrôleur du formulaire de langue | `vendor/melisplatform/melis-document-generator-variables/src/Controller/VariablesController.php` |
| Passerelles de table | `vendor/melisplatform/melis-document-generator-variables/src/Model/Tables/` |
| Listeners | `vendor/melisplatform/melis-document-generator-variables/src/Listener/` |
| Schéma de base de données | `vendor/melisplatform/melis-document-generator-variables/install/dbdeploy/` |

Voir aussi : [melis-core](/fr/legacy/reference/modules/melis-core) · [melis-document-upload](/fr/legacy/reference/modules/melis-document-upload)
