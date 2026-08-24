# MelisFormEngine

> Couche de stockage et d'exécution partagée pour l'ensemble du système de formulaires — possède toutes les tables `melis_form*`,
> les services par entité, les view-helpers de champs (formulaire → HTML) ainsi que les validateurs côté serveur.
> Package `melisplatform/melis-form-engine`.

## Présentation

`MelisFormEngine` est le module d'infrastructure porteur de la famille de formulaires. Il détient chaque
table de base de données (définitions de formulaires, entités de workflow, réponses des visiteurs), expose un service par
entité, génère le rendu HTML des champs via un ensemble de view-helpers, exécute la validation côté serveur sur
les réponses soumises et persiste les soumissions. Il ne possède quasiment aucune interface propre — le builder
(`MelisFormCreator`) et le réviseur de réponses (`MelisFormTool`) sont de fines couches qui appellent ces
services et écrivent dans ces tables.

**Vue d'ensemble de la famille de formulaires :**

| Module | Rôle |
| --- | --- |
| **MelisFormEngine** *(ce module)* | Stockage + exécution : tables, services, rendus de champs, validateurs, persistance des réponses. |
| `MelisFormCreator` | Interface de création — appelle ces services pour écrire les définitions de formulaires dans ces tables. |
| `MelisFormTool` | Réviseur de réponses — liste/affiche les réponses et pilote le workflow d'instruction. |
| `MelisSmallBusiness` | Framework de workflow sous-jacent au processus d'instruction/validation. |

En aval, `MelisDocumentGenerator` lit `melis_forms_answers` pour produire des documents.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    // …
    'MelisFormEngine',
];
```

Requiert `melisplatform/melis-core ^5.3` (événements, mailer, chrome BO) et
`melisplatform/melis-engine ^5.3` (moteur de rendu front-office, permettant la soumission des formulaires sur
le site public en utilisant les mêmes services/tables). `melis-site: false` — aucun contenu de site de démonstration n'est inclus.

## Services principaux

Tous les alias sont enregistrés dans `config/module.config.php`. Note : les noms d'alias conservent le
préfixe `MelisFormCreatorForm*` ; les classes réelles se trouvent dans `MelisFormEngine\Service\`.

| Alias de service | Rôle |
| --- | --- |
| `MelisFormCreatorFormService` | CRUD central des formulaires + le builder formulaire→HTML. Méthodes clés : `saveForm()`, `setFormConfigXML()`, `getFormByFormId()`, `generateForm($xml, $renderMode = 'melis', …)` (analyse le XML de configuration en formulaire Laminas), et les helpers de synchronisation `updateFormXmlBy{Updated,Deleted}{Field,Status,Validator,Process}()`. |
| `MelisFormCreatorFormFieldService` | CRUD des champs : `getFieldList()`, `saveFormField()`, `saveFormFieldRules()`, `saveFormFieldGroups()`, `deleteFormField()`, `getSavedFieldXml()`. |
| `MelisFormCreatorFormGroupsService` | CRUD des groupes de champs. |
| `MelisFormCreatorFormRulesService` | CRUD des règles conditionnelles. |
| `MelisFormCreatorFormStatusService` | CRUD des statuts de réponse. |
| `MelisFormCreatorFormTypeService` | CRUD des types de formulaire. |
| `MelisFormCreatorFormProcessesService` | CRUD des étapes de processus du workflow. |
| `MelisFormCreatorFormValidatorsService` | CRUD des validateurs du workflow. |
| `MelisFormCreatorFormReasonsService` | CRUD des motifs de rejet/action. |
| `MelisFormCreatorFormCommentsService` | CRUD des modèles de commentaires. |
| `MelisFormCreatorFormVersioningService` | Snapshot/lecture de version de formulaire. |
| `MelisFormAnswersService` | Réponses des visiteurs : `generateAnswersXml($data, $postDatas, $fieldsArr)`, `saveFormAnswers($data, $id)`, `validateAnswer($formId, $formAnswersId, $fieldId, $fieldValue, $file)`, `saveFormAnswersDocument(…)`, liste/lecture des réponses. |
| `MelisFormValidationService` | Pipeline de validation côté serveur pour l'instruction : `generateFormProcessesNode(…)`, résolution validateur/rôle, XML d'événement/audit des réponses. |
| `MelisFormEngineOtherConfigService` | Persiste le choix de stockage des documents (base de données ou système de fichiers), déclenché par `meliscore_save_other_config`. |

## Back-office

La seule surface back-office est un panneau de paramètres sous **Système → Configuration → Paramètres Form Engine**
(`OtherConfigController`). Il permet à un administrateur de choisir si les documents de formulaire téléversés sont
stockés dans la **base de données** ou sur le **système de fichiers**, et de basculer les options de l'interface de validation
(si les boutons valider/commenter apparaissent sur les réponses). Les paramètres sont persistés par
`MelisFormEngineOtherConfigService` via l'événement `meliscore_save_other_config`.

## Front office

### View-helpers de champs

Enregistrés dans `view_helpers` (`config/module.config.php`). `BaseFieldHelper` est l'orchestrateur ;
il délègue à un helper concret par type de champ et enveloppe le contrôle dans son div + label/info-bulle.

| Helper (nom du view-helper) | Rendu |
| --- | --- |
| `BaseFieldHelper` | Orchestrateur — route vers le bon helper ci-dessous. |
| `InputFieldHelper` | `<input>` (texte / e-mail / nombre). |
| `TextareaFieldHelper` | `<textarea>`. |
| `SelectFieldHelper` | `<select>` (options clé\|libellé). |
| `CheckboxFieldHelper` / `RadioButtonFieldHelper` | Groupe de cases à cocher / groupe de boutons radio. |
| `DateFieldHelper` / `DateTimeFieldHelper` | Sélecteur de date / date-heure. |
| `FileUploadFieldHelper` | Contrôle de téléversement de fichier. |
| `LabelFieldHelper` / `TextDisplayZoneHelper` | Libellé en lecture seule / zone d'affichage (avec visibilité conditionnelle). |
| `MelisSwitchHelper` (`MelisSwitch`, `MelisSwitchOnOff`) | Interrupteur à bascule. |
| `MelisTinyMCEHelper` (`MelisTinyMCE`) | Éditeur de texte enrichi. |
| `MelisBOUsersHelper` (`MelisBOUsersSelect`) | Sélecteur d'utilisateurs back-office. |
| `CustomInputModelHelper` | Modèle de saisie personnalisé. |
| `ValidationCommentHelper` | Icônes approuver/rejeter par champ + bouton commentaire + historique (interface de révision). |

### Pipeline de rendu

1. `MelisFormCreatorFormService::generateForm($xml, $renderMode='melis', …)` analyse `melis_forms.mf_config` et produit un formulaire Laminas.
2. `BaseFieldHelper` délègue par type de champ vers le `*FieldHelper` concret.
3. À la soumission, `StepByStepController::validateAnswerAction` (route `/MelisFormEngine/validate-answer`) valide un seul champ via `MelisFormAnswersService::validateAnswer()` — ce qui alimente la validation AJAX pas à pas.
4. `MelisFormAnswersService::generateAnswersXml()` + `saveFormAnswers()` persistent la soumission dans `melis_forms_answers`.

### Validateurs côté serveur

Enregistrés dans le plugin manager `validators` (`config/module.config.php`), résolus par champ
depuis le XML du formulaire et exécutés par `MelisFormAnswersService::validateAnswer()`. Tous étendent `BaseHelper`.

`NotEmptyHelper` · `ValidEmailHelper` · `IsIntegerHelper` · `IsFloatHelper` · `IsDateHelper` ·
`DigitsHelper` · `AlphaNumericHelper` · `UriHelper` · `FileExtensionPdfHelper` ·
`FileSizeMax500KbHelper` · `CompareNumberHelper` · `CompareTextHelper`

## Tables de base de données

Toutes les tables appartiennent à ce module (`src/Model/Tables/`). La plupart des entités disposent d'une table de base et d'une
table compagnon `_trans` contenant les libellés par langue.

### Définition des formulaires

| Table | Contenu |
| --- | --- |
| `melis_forms` / `melis_forms_trans` | Le formulaire lui-même ; le XML `mf_config` = structure complète du formulaire (étapes, champs, règles, statuts…). |
| `melis_form_fields` / `melis_form_fields_trans` | Définitions de champs réutilisables. |
| `melis_form_field_groups` / `_trans` | Groupes/sections de champs. |
| `melis_form_fields_group_rel` | Lien champ ↔ groupe. |
| `melis_form_field_rules` / `_trans` | Règles conditionnelles (afficher/masquer). |
| `melis_form_fields_rules_rel` | Lien champ ↔ règle. |
| `melis_form_status` / `_trans` | Statuts qu'une réponse peut prendre. |
| `melis_form_forms_status` | Lien formulaire ↔ statut. |
| `melis_form_types` | Types de mise en page de formulaire (ex. accordéon/onglets). |
| `melis_forms_versioning` | Snapshots de version du formulaire (majeur.mineur.maintenance). |

### Workflow d'instruction / validation

| Table | Contenu |
| --- | --- |
| `melis_form_processes` / `_trans` | Étapes de processus du workflow. |
| `melis_form_validators` / `_trans` | Qui peut approuver/rejeter. |
| `melis_form_reasons` / `_trans` | Motifs de rejet/action. |
| `melis_form_comments` / `_trans` | Modèles de commentaires. |
| `melis_form_comments_reasons` | Lien commentaire ↔ motif. |

### Réponses

| Table | Contenu |
| --- | --- |
| `melis_forms_answers` | Une soumission par ligne ; le contenu de la réponse est en XML. |
| `melis_forms_answers_documents` | Fichiers téléversés attachés à une réponse (lorsque "stocker en BDD" est activé). |
| `melis_forms_field_custom_base` | Lignes de base pour les modèles de champs de saisie personnalisés. |

## Exemple

Valider un seul champ, puis sauvegarder une soumission de formulaire complète :

```php
$answersService = $serviceManager->get('MelisFormAnswersService');

// Validate one field (called from AJAX step-by-step)
$result = $answersService->validateAnswer(
    $formId,
    $formAnswersId,
    $fieldId,
    $fieldValue,
    $uploadedFile  // null if not a file field
);

// Build the answers XML and persist the full submission
$xml  = $answersService->generateAnswersXml($formData, $postDatas, $fieldsArr);
$id   = $answersService->saveFormAnswers(['mfa_form_id' => $formId, 'mfa_answer' => $xml], null);
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Alias de service et de table, view_helpers, validators, routes | `vendor/melisplatform/melis-form-engine/config/module.config.php` |
| Modèles d'e-mails du workflow | `vendor/melisplatform/melis-form-engine/config/app.emails.php` |
| Déclaration du panneau de paramètres BO | `vendor/melisplatform/melis-form-engine/config/app.interface.php` |
| Formulaires Laminas (révision + config) | `vendor/melisplatform/melis-form-engine/config/app.forms.php` |
| Passerelles de tables de base de données | `vendor/melisplatform/melis-form-engine/src/Model/Tables/` |
| Services par entité | `vendor/melisplatform/melis-form-engine/src/Service/` |
| View-helpers de champs | `vendor/melisplatform/melis-form-engine/src/View/Helper/Field/` |
| Validateurs côté serveur | `vendor/melisplatform/melis-form-engine/src/Validator/` |
| Factories de listes déroulantes du builder | `vendor/melisplatform/melis-form-engine/src/Form/Factory/` |
| Contrôleurs StepByStep (validate-answer) + OtherConfig | `vendor/melisplatform/melis-form-engine/src/Controller/` |
| Listener d'événement OtherConfig | `vendor/melisplatform/melis-form-engine/src/Listener/MelisFormEngineOtherConfigListener.php` |

Voir aussi : [MelisCore](/fr/legacy/reference/modules/melis-core) · [MelisSmallBusiness](/fr/legacy/reference/modules/melis-small-business)
