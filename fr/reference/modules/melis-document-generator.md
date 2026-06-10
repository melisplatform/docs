# MelisDocumentGenerator

> Générateur de documents PDF qui assemble des sections versionnées et remplace les marqueurs `$VARIABLE$` par les réponses de MelisFormCreator. Package `melisplatform/melis-document-generator`.

## Présentation

MelisDocumentGenerator construit des documents PDF à partir de **sections** réutilisables et versionnées dont le contenu en texte enrichi contient des marqueurs `$VARIABLE$`. Lors de la génération, ces marqueurs sont remplacés par les valeurs d'une **réponse de formulaire MelisFormCreator** associée et/ou par des champs externes fournis par le package complémentaire `melis-document-generator-variables`. Le HTML assemblé est converti en PDF avec **Dompdf**. Concevez un document une seule fois (sections + variables), puis générez un PDF rempli pour chaque soumission de formulaire.

## Activation

Ajoutez dans `config/melis.module.load.php` :

```php
return [
    'MelisDocumentGenerator',
];
```

Dépendances requises : `melisplatform/melis-core` (`^5.3`), `melisplatform/melis-document-generator-variables` (`^5.3`), `dompdf/dompdf` (`^3.1`), `spipu/html2pdf` (`^5.2`). PHP `^8.1|^8.3`.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisDocumentGeneratorDocumentAssemblerService` | Assemble une version de document, substitue les variables et génère le PDF. |
| `MelisDocumentsService` | CRUD/liste des documents ; récupère le formulaire associé. |
| `MelisDocumentsVersionsService` | CRUD des versions de document et validation du chevauchement de dates. |
| `MelisDocumentsVersionsSectionsService` | Liens entre une version de document et ses sections ordonnées. |
| `MelisSectionsService` | CRUD/liste des sections et recherche d'utilisation. |
| `MelisSectionsVersionsService` | CRUD des versions de section ; `getSectionsWithinDate` / `checkSectionHasVersion`. |
| `MelisDocumentTypesService` | Classifications des types de document (CRUD + contrôle d'unicité). |
| `MelisSectionTypesService` | Classifications des types de section (CRUD + contrôle de code). |
| `MelisDocumentGeneratorExternalFieldsService` | Charge les variables externes/disponibles pour l'onglet **Variables disponibles**. |
| `MelisDocumentGeneratorFormService` | Utilitaires de formulaire triés par langue. |

Tous les services étendent le service général de MelisCore et déclenchent des événements `melisdocumentgenerator_*_start` / `_end`.

## Back-office

Accessible via **Menu gauche → MelisMarketing → Document Generator** (`fa-file-text-o`).

| Onglet / Page | Description |
| --- | --- |
| Documents | Lister, ajouter, modifier, prévisualiser et dupliquer des documents. Chaque document possède un formulaire lié (`mdd_form_id`) et une ou plusieurs versions. |
| Sections | Lister, ajouter, modifier, prévisualiser et dupliquer des sections. Les sections sont de type `generic` ou `dynamic` et contiennent des marqueurs `$VARIABLE$` dans leur texte enrichi. |
| Document Types | Gérer les classifications des types de document. |
| Section Types | Gérer les classifications des types de section (chacune porte un `mdst_code`). |
| Page d'édition | Par document ou section : onglets **Textes**, **Propriétés de la version** (dates de début/fin, statut), **Variables disponibles**. |

Les DataTables pour les documents et les sections permettent de filtrer par type de document, type de section et formulaire lié. L'action **Dupliquer** (`DocumentGeneratorDuplicateController`) clone un document ou une section. Une **modale de prévisualisation** est disponible pour les deux.

**Listener :** `MelisDocumentGeneratorGenerateDocumentListener` s'accroche à `melisformcreator_delete_form_end` et met à null `mdd_form_id` sur tout document qui référençait le formulaire supprimé (nettoyage de clé étrangère).

## Variables et substitution des marqueurs

Le texte des sections utilise le format `$NOM_VARIABLE$`. Lors de la génération, l'assembleur identifie les marqueurs avec `/\$(\w+(?:-\w+)*)\$/` et remplace chacun d'eux par :

- **Réponse de formulaire** — lit `mfa_form_config` (définitions des champs) et `mfa_form_answers` (valeurs) depuis la réponse FormCreator liée. Gère les types text/textarea, upload de fichier, datepicker (formaté selon la locale `en_EN`/`fr_FR`), radiocell, checkbox et select (les types radio/checkbox supportent les variantes d'affichage solo / horizontal / vertical).
- **Champs externes** — valeurs supplémentaires fusionnées via l'événement `melisdocument_get_external_values_start` (fourni par `melis-document-generator-variables`) ; types `file`, `partnerfile`, `specialfile`.

## Exemple

```php
// Générer un PDF rempli pour une réponse de formulaire donnée
$assembler = $serviceLocator->get('MelisDocumentGeneratorDocumentAssemblerService');
$result = $assembler->generateDocument(
    $contents,          // tableau du contenu des sections (texte)
    $path,              // chemin de sortie optionnel
    $documentVersionId,
    $formId,
    $formAnswerId,      // pilote la substitution des $VARIABLE$
    $language
);
// Retourne un JsonModel avec un PDF encodé en base64 (ou une erreur)
```

Sortie PDF : A4 portrait, DejaVu Sans, parseur HTML5 Dompdf activé, ressources distantes désactivées. Les éléments `<img>` sont intégrés en tant que data-URIs base64 via `imageTrait::convertImagesToBase64`.

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_docgen_documents` / `_trans` | Un document : statut, type de document, formulaire lié (`mdd_form_id`). |
| `melis_docgen_documents_versions` / `_trans` | Une version de document : statut, `mddv_start_date`, `mddv_end_date`. |
| `melis_docgen_documents_versions_sections` | Table de liaison — quelles sections contient une version de document (`mddvs_mddv_id`, `mddvs_mds_id`, `mddvs_position`). |
| `melis_docgen_sections` / `_trans` | Une section : type ENUM(`generic`, `dynamic`), statut, type de document, type de section, formulaire lié (`mds_form_id`). |
| `melis_docgen_sections_versions` / `_trans` | Une version de section : statut, `mdsv_start_date`, `mdsv_end_date`, texte de la version. |
| `melis_docgen_documents_types` / `_trans` | Classifications des types de document. |
| `melis_docgen_sections_types` / `_trans` | Classifications des types de section (avec `mdst_code`). |

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Assembleur (génération PDF) | `vendor/melisplatform/melis-document-generator/src/Service/MelisDocumentGeneratorDocumentAssemblerService.php` |
| Service des champs externes | `vendor/melisplatform/melis-document-generator/src/Service/MelisDocumentGeneratorExternalFieldsService.php` |
| Listener de nettoyage des clés étrangères | `vendor/melisplatform/melis-document-generator/src/Listener/MelisDocumentGeneratorGenerateDocumentListener.php` |
| Trait image-vers-base64 | `vendor/melisplatform/melis-document-generator/src/Trait/imageTrait.php` |
| Config service / table | `vendor/melisplatform/melis-document-generator/config/module.config.php` |
| Arbre back-office | `vendor/melisplatform/melis-document-generator/config/app.toolstree.php` |
| Config DataTable | `vendor/melisplatform/melis-document-generator/config/app.tools.php` |
| Migrations BDD | `vendor/melisplatform/melis-document-generator/install/dbdeploy/` |
| Vue PDF | `vendor/melisplatform/melis-document-generator/view/melis-document-generator/documents-versions/document-version-pdf.phtml` |

Voir aussi : [melis-core](/reference/modules/melis-core)
