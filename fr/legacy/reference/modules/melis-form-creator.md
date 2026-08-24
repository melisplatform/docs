# MelisFormCreator

> Le **constructeur de formulaires** back-office de MelisPlatform — concevez des champs, des groupes, des règles, des statuts,
> des workflows de validation, des formules calculées et des versions.
> Package `melisplatform/melis-form-creator`.

## Présentation

`MelisFormCreator` est l'outil d'administration permettant à un développeur ou à un gestionnaire de contenu de **concevoir** un formulaire : il
fait glisser des champs dans des étapes, configure les types de champs, les groupes, les règles conditionnelles, les statuts de réponse, un
workflow d'approbation multi-étapes (« Instruction ») et des formules calculées. Il écrit la définition résultante dans les tables de
**MelisFormEngine** (`melis_forms*`) — le moteur est responsable du rendu du formulaire pour les visiteurs et du stockage des réponses. Ce module
ne possède que deux petites tables de catalogue : les définitions de types de champs et les définitions de formules.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    // …
    'MelisFormCreator',
];
```

Dépendances requises (déclarées dans `composer.json`) :

- `melisplatform/melis-core` `^5.3` — gestionnaire d'événements, gestionnaire de services, chrome des outils BO, traductions.
- `melisplatform/melis-form-engine` `^5.3` — possède les tables de formulaires, champs et réponses ainsi que le moteur de rendu ; ce module écrit dedans.
- `melisplatform/melis-small-business` `^5.3` — le moteur de workflow derrière le processus d'approbation Instruction.
- `mossadal/math-parser` `^1.3` — évalue les expressions mathématiques des formules.
- `jms/serializer` + `doctrine/instantiator` — (dé)sérialise le graphe d'entités de formule.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `FormCreatorFormulaService` | Résout le view helper enregistré d'une formule (depuis `mff_helper_file`) et affiche l'arbre de formule ; gère la conversion JSON ↔ XML et l'extraction des paramètres. |
| `FormCreatorFieldTypeTable` | Passerelle vers la table de catalogue des types de champs `mfft_*`. |
| `FormCreatorFormulaTable` | Passerelle vers la table de définitions de formules `mff_*`. |

## Back-office

Accessible via **Marketing → Form Creator** (clé de menu `melisformcreator_tool`, icône `fa fa-th-large`).
Tous les contrôleurs sont accessibles via la route générique `/MelisFormCreator/[:controller[/:action]]`.

### Onglets du catalogue

| Onglet | Contrôleur | Rôle |
| --- | --- | --- |
| **Form** | `FormCreatorFormController` | Lister, créer, cloner (`FormCreatorCloneFormController`), ouvrir et supprimer des formulaires. |
| **Fields** | `FormCreatorFieldController` | Champs réutilisables définis une seule fois et partagés entre tous les formulaires. |
| **Field Types** | `FormCreatorFieldTypesController` | Catalogue système des types de champs (texte, liste déroulante, case à cocher, calcul…) — principalement en lecture. |
| **Groups** | `FormCreatorGroupsController` | Sections regroupant des champs dans un formulaire. |
| **Rules** | `FormCreatorRulesController` | Logique conditionnelle — afficher/masquer un champ en fonction de la valeur d'un autre champ, à l'aide de *rule helpers* (compare-number, compare-text). |
| **Status** | `FormCreatorStatusController` | Statuts de réponse par lesquels une soumission peut passer (ex. : Nouveau, Validé, Rejeté). |
| **Instruction** | `FormCreatorInstruction*Controller` (×4) | Le workflow de validation : **Process** (étapes), **Validators** (approbateurs), **Reasons** (raisons de rejet/action), **Comments** (modèles de notes). |
| **Formulas** | `FormCreatorFormulasController` | Expressions calculées dérivées d'autres champs ; associées à un champ de type `computation`. |

### Onglets de la page d'édition de formulaire (par formulaire)

| Onglet | Rôle |
| --- | --- |
| **Form** | Constructeur visuel — glisser des champs dans des étapes, les ordonner, définir les libellés et les traductions. |
| **Properties** | Paramètres au niveau du formulaire. |
| **Status Rules** | Règles faisant passer une réponse d'un statut à un autre. |
| **Versions** | Historique des versions (majeur.mineur.maintenance) — chaque modification structurelle ajoute automatiquement une version de maintenance. |
| **Instruction** | Associer un processus de validation au formulaire. |
| **Entry Parameters** | Préremplir les réponses à partir des paramètres d'entrée. |

## Tables de base de données

Ce module ne possède que deux tables. Tous les formulaires, champs, groupes, règles, statuts, versions et réponses
sont stockés par **MelisFormEngine** (tables `melis_forms*`).

| Modèle de table | PK | Contenu |
| --- | --- | --- |
| `MelisFormCreatorFieldTypeTable` | `mfft_id` | Le catalogue des **types de champs** (texte, liste déroulante, case à cocher, calcul…). |
| `MelisFormCreatorFormulaTable` | `mff_id` | Définitions de **formules** — `mff_helper_file`, `mff_name`, `mff_description`, `mff_xml` (arbre de formule sérialisé). |

## Événements et listeners

La structure d'un formulaire étant un XML dans le moteur, mais ses parties (champs, statuts, validateurs…) étant
éditées séparément, `Module.php` attache des listeners qui resynchronisent chaque formulaire lorsqu'une partie partagée est modifiée.

| Listener | Événement(s) | Effet |
| --- | --- | --- |
| `MelisFormCreatorFormVersioningListener` | `melisformcreator_form_update_start` / `…_update_end` | Prend un instantané du XML du formulaire ; en cas de modification, écrit une nouvelle version de maintenance et incrémente `mf_current_version_maintenance`. |
| `MelisFormCreatorUpdateFieldListener` | `melisformcreator_save_field_end` | Réécrit le XML du champ dans chaque formulaire qui l'utilise (y compris en tant que champ secondaire). |
| `MelisFormCreatorDeleteFieldListener` | `melisformcreator_delete_field_end` | Supprime le champ du XML de chaque formulaire. |
| `MelisFormCreatorUpdateValidatorListener` / `…DeleteValidatorListener` | `melisformcreator_save_validator_end` / `melisformcreator_delete_validator_end` | Synchronise ou supprime le validateur dans le XML des formulaires. |
| `MelisFormCreatorUpdateProcessListener` / `…DeleteProcessListener` | `melisformcreator_save_process_end` / `melisformcreator_delete_process_end` | Synchronise ou supprime le processus dans le XML des formulaires. |
| `MelisFormCreatorDeleteStatusListener` | `melisformcreator_delete_status_end` | Retire le statut du XML des formulaires. |
| `MelisFormCreatorDeleteReasonListener` | `melisformcreator_delete_reason_end` | Met à jour le XML des réponses concernées via le service de réponses du moteur. |
| `MelisFormCreatorFormulaUpdateFieldListener` | `melisformcreator_form_field_set_field_config_xml_end`, `melisformcreator_validate_form_field`, `melisformcreator_format_post_values` | Injecte `<formula>` + paramètres dans un champ de calcul, le valide, et convertit la formule JSON→XML à la sauvegarde. |
| `MelisFormFormulaParametersListener` | `melisformcreator_formula_parameters` | Renseigne les valeurs des paramètres de formule à partir du contexte de réponse courant. |
| `MelisFormCreatorFlashMessengerListener` | `…_save_*_end` / `…_delete_*_end` | Retour visuel flash dans le back-office. |

::: tip Étendre le constructeur
Écoutez les événements `melisformcreator_save_*_end` / `melisformcreator_delete_*_end` — vous recevez
l'entité sauvegardée/supprimée après l'exécution de la logique principale, exactement comme le font les listeners de synchronisation intégrés.
:::

## View helpers

| Helper | Utilisation |
| --- | --- |
| `FormulaHelper` | Affiche l'interface de l'arbre de formule ; convertit XML ↔ JSON ; extrait les paramètres. |
| `FormulaTextLanguageHelper` | Libellés multilingues pour les nœuds de formule. |
| `SecondaryFieldHelper` | Sélectionne un champ « secondaire » (référençant). **Réutilisé par MelisFormTool et MelisDocumentGenerator.** |
| `ToolTipTable` | Construit des tables de tooltips configurables (groupes/validateurs/raisons). **Réutilisé par MelisFormTool et MelisDocumentGenerator.** |
| `ValidatorBtnHelper` | Boutons d'action des validateurs dans l'interface Instruction. |

## Exemple

Écouter un événement post-sauvegarde pour exécuter une logique personnalisée après la mise à jour d'un champ :

```php
// In your module's Module::onBootstrap()
$eventManager = $e->getApplication()->getEventManager();
$eventManager->attach(
    'melisformcreator_save_field_end',
    function ($event) {
        $savedField = $event->getParam('savedField');
        // your custom sync or notification logic here
    }
);
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Bootstrap du module et listeners | `vendor/melisplatform/melis-form-creator/src/Module.php` |
| Routage, services, contrôleurs, view helpers | `vendor/melisplatform/melis-form-creator/config/module.config.php` |
| Entrée du menu gauche | `vendor/melisplatform/melis-form-creator/config/app.interface.php` |
| Onglets du catalogue et d'édition de formulaire | `vendor/melisplatform/melis-form-creator/config/app.tools.php` |
| Rule helpers (compare-number / compare-text) | `vendor/melisplatform/melis-form-creator/config/rulehelper.config.php` |
| Schémas de formulaires formule / type de champ / instruction | `vendor/melisplatform/melis-form-creator/config/app.formula.forms.php` |
| Service de formule | `vendor/melisplatform/melis-form-creator/src/Service/MelisFormCreatorFormulaService.php` |
| Graphe d'entités de formule | `vendor/melisplatform/melis-form-creator/src/Entity/` |
| Listeners de synchronisation XML des formulaires | `vendor/melisplatform/melis-form-creator/src/Listener/` |
| View helpers | `vendor/melisplatform/melis-form-creator/src/View/Helper/` |
| Passerelles de tables (types de champs, formules) | `vendor/melisplatform/melis-form-creator/src/Model/Tables/` |

Voir aussi : [MelisFormEngine](/fr/legacy/reference/modules/melis-engine), [MelisSmallBusiness](/fr/legacy/reference/modules/melis-small-business)
