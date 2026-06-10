# MelisCmsMcq

> Constructeur de QCM (questionnaire à choix multiples / quiz) back-office pour le Melis CMS.
> Package `melisplatform/melis-cms-mcq`.

## Présentation

MelisCmsMcq est la **partie interface** du système QCM. Il fournit l'atelier back-office permettant
de créer des **questions** (avec réponses, type, difficulté, catégorie et tags), de les organiser en
**catégories de questions** et en **groupes de QCM**, et d'assembler des **QCM** (tests) soit
manuellement via un **panier** par utilisateur, soit automatiquement via un **modèle aléatoire**. Il
ne possède pas sa propre couche de données : toute la persistance (tables, services, notation,
instantanés XML et rendu front-office) est déléguée au module compagnon **MelisCmsMcqEngine**.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCmsMcq',
];
```

Requiert `melisplatform/melis-cms-mcq-engine` (`^5.3`) et `laminas/laminas-paginator`. Nécessite
également que **MelisCms**, **MelisCore** (back-office) et **MelisCmsTags** (tags des questions)
soient chargés. Chaîne d'installation : `MelisCmsMcq` → `melis-cms-mcq-engine` → `melis-cms` +
`melis-cms-tags`.

## Services principaux

MelisCmsMcq ne déclare aucun service en propre — ses contrôleurs résolvent des alias provenant de
**MelisCmsMcqEngine** à l'exécution :

| Alias de service Engine | Utilisé par ce module pour |
| --- | --- |
| `MelisCmsMcqQuestionsService` | CRUD des questions, liste du panier (`getQuestionsBasketList`), sélection aléatoire (`getRandomQuestionIds`) |
| `MelisCmsMcqAnswersService` | CRUD des réponses (éditeur de question) |
| `MelisCmsMcqQuestionCategoryService` | CRUD des catégories de questions |
| `MelisCmsMcqGroupsService` | CRUD des groupes de QCM |
| `MelisCmsMcqService` | CRUD des QCM, génération XML (`generateMcqXml`), récupération (`getMcq`), notation (`evaluateAnswers`) |

Les fabriques d'éléments de formulaire proviennent également du moteur : `McqQuestionCategoriesSelect`,
`McqQuestionsDifficultySelect`, `QuestionsTypesSelect`, `McqPreviewTemplatesSelect`.

## Back-office

Accessible via **Menu gauche → MelisCms → MCQ** (`fa fa-list`). L'outil expose quatre onglets et un
bouton d'en-tête **Questions Favorites** (liste raccourcie de questions favorites par utilisateur).

| Onglet | Contenu géré |
| --- | --- |
| **MCQ** | DataTable filtrable des tests assemblés (`#tableMcq` → `/MelisCmsMcq/getMcqList`) : id, statut, code, nom, date de création, total groupes, total questions |
| **Questions** | DataTable des questions (`#tableMcqQuestions` → `/McqQuestions/getQuestionsList`) : id, statut, texte de la question, nombre de réponses, type, difficulté, catégorie, tags — avec filtres catégorie/type/statut/difficulté/tags/recherche ; l'action de favori ajoute au panier |
| **Question Categories** | DataTable (`#tableMcqQuestionCategories` → `/McqQuestions/getQuestionCategoriesList`) : id, statut, code, nom de catégorie — modal d'ajout/édition (Statut, Code, Nom par langue) |
| **MCQ Groups** | DataTable (`#tableMcqGroups` → `/MelisCmsMcq/getMcqGroupsList`) : id, statut, code, nom du groupe — modal d'ajout/édition |

### Éditeur de QCM

L'ouverture d'une entrée QCM affiche un éditeur à trois onglets :

| Onglet éditeur | Contenu |
| --- | --- |
| **Properties** | Nom, code, statut, **Score minimum requis (%)** (taux de réussite), bascule **Modifier l'ordre des questions à chaque création de QCM** |
| **Questions** | Ajout/suppression de groupes de QCM ; remplissage de chaque groupe en faisant glisser des questions depuis les panneaux latéraux **Questions Favorites** ou **Search Questions** ; le bouton **Configure a random MCQ** ouvre la modale Modèle Aléatoire |
| **Preview** | Choisir un template de rendu, passer le test assemblé, puis soumettre pour afficher le panneau **Correction** (score, réussite/échec, réponse de l'utilisateur par rapport à la bonne réponse pour chaque question) |

La modale **Modèle Aléatoire** (`meliscmsmcq_mcq_page_random_model_modal`) permet de définir des
lignes de critères par groupe : Difficulté / Catégorie / Tag / Nombre. L'enregistrement appelle
`getRandomQuestionIds` du moteur pour résoudre les identifiants de questions correspondants.

### Éditeur de question

L'ouverture d'une question affiche un éditeur à deux onglets :

| Onglet éditeur | Contenu |
| --- | --- |
| **Properties** | Code, Type (MCQ / Open Ended), Catégorie, Tags, Difficulté, Statut ; par langue : texte de la question, note pour le candidat |
| **Answers** | Liste de réponses, chacune avec un texte, un indicateur **Correct Answer (Yes/No)**, un code, un statut ; faire glisser la poignée ✛ pour réordonner ; bouton **Add an answer** |

## Front office

MelisCmsMcq ne produit aucun rendu front-office en propre. Le moteur de rendu du quiz est un view
helper (`renderMcqQuestions`) enregistré dans **MelisCmsMcqEngine** ; l'onglet Aperçu l'utilise via
le moteur. Consultez la [référence MelisCmsMcqEngine](/fr/reference/modules/melis-cms-mcq-engine)
pour les détails du rendu front-office.

## Tables de base de données

Toutes les tables appartiennent à **MelisCmsMcqEngine**. Les interfaces back-office de ce module
leur correspondent comme suit :

| Table Engine | Interface BO qui y écrit |
| --- | --- |
| `melis_cms_mcq_questions` + `_trans` | Onglet Questions + éditeur de question |
| `melis_cms_mcq_answers` + `_trans` | Éditeur de réponses (dans l'éditeur de question) |
| `melis_cms_mcq_question_groups` + `_trans` | Onglet Question Categories (remarque : "question groups" en base de données, "categories" dans l'interface) |
| `melis_cms_mcq_groups` + `_trans` | Onglet MCQ Groups (lié à un QCM via `mcqg_mcq_id`) |
| `melis_cms_mcq` + `_trans` | Onglet MCQ ; test assemblé stocké en XML dans `mcq_xml` |
| `melis_cms_mcq_questions_list` | Appartenance question-à-groupe-QCM |
| `melis_cms_mcq_baskets` | Questions Favorites par utilisateur |

> **Attention aux nommages.** Les "Question categories" de l'interface correspondent à
> `melis_cms_mcq_question_groups` ; les "MCQ groups" de l'interface correspondent à
> `melis_cms_mcq_groups`. Deux tables "group" distinctes avec des finalités différentes — voir la
> documentation de MelisCmsMcqEngine.

## Intégration des tags

`config/app.interface.php` enregistre une association **MelisCmsTags** afin que les questions soient
taguables :

```php
'melis_cms_tag' => ['datas' => ['associations' => [
    'meliscmsmcq' => [
        'module'           => 'MelisCmsMcq',
        'entity_type'      => 'MCQ_QUESTION',
        'entity_table'     => 'melis_cms_mcq_questions',
        'entity_primary_id'=> 'mcqq_id',
        'trans' => [
            'trans_table'      => 'melis_cms_mcq_questions_trans',
            'trans_foreign_id' => 'mcqqt_question_id',
            'trans_lang_key'   => 'mcqqt_lang_id',
        ],
        'association_title_key' => 'mcqqt_question_text',
    ],
]]],
```

Le type d'association est `MCQ_QUESTION`. La DataTable des questions affiche une colonne **tags** et
un **filtre tags** pilotés par cet enregistrement.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Routes + enregistrements des contrôleurs | `vendor/melisplatform/melis-cms-mcq/config/module.config.php` |
| Arbre des outils back-office, onglets, pages d'édition, modales, association Tags | `vendor/melisplatform/melis-cms-mcq/config/app.interface.php` |
| Configurations des DataTables (4 tables) | `vendor/melisplatform/melis-cms-mcq/config/app.tools.php` |
| Contrôleur MCQ + groupes + modèle aléatoire + aperçu | `vendor/melisplatform/melis-cms-mcq/src/Controller/MelisCmsMcqController.php` |
| Contrôleur Questions + catégories + panier | `vendor/melisplatform/melis-cms-mcq/src/Controller/McqQuestionsController.php` |
| Listener flash-messenger | `vendor/melisplatform/melis-cms-mcq/src/Listener/MelisCmsMcqFlashMessengerListener.php` |
| Vues (éditeur de question, éditeur QCM, panier, modèle aléatoire, aperçu) | `vendor/melisplatform/melis-cms-mcq/view/melis-cms-mcq/` |
| JS (questions, QCM, groupes, catégories, aperçu, sélection multiple) | `vendor/melisplatform/melis-cms-mcq/public/js/` |

Voir aussi : [melis-cms-mcq-engine](/fr/reference/modules/melis-cms-mcq-engine),
[melis-cms-tags](/fr/reference/modules/melis-cms-tags),
[melis-cms](/fr/reference/modules/melis-cms),
[melis-core](/fr/reference/modules/melis-core)
