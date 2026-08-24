# MelisCmsMcqEngine

> Données, services, instantanés XML, évaluation et rendu front-office du système de QCM (quiz).
> Package `melisplatform/melis-cms-mcq-engine`.

## Présentation

MelisCmsMcqEngine est la **couche données et services** du système de QCM : il possède les tables de
base de données, les services pour les questions, réponses, QCM, groupes et catégories,
l'**instantané XML** qui fige chaque test assemblé, le sélecteur de questions par **modèle
aléatoire**, l'évaluation **score / taux de réussite**, ainsi que le **rendu front-office du quiz**.
L'interface back-office qui le pilote est **MelisCmsMcq** — le moteur lui-même n'a pas d'écrans
propres. On peut le comparer au duo MelisEngine ↔ MelisCms, mais pour les quiz.

Le test assemblé est stocké sous forme de `mcq_xml` afin que le rendu et la notation lisent un
instantané autonome, et non une jointure en direct, préservant ainsi le QCM exact qu'un utilisateur
a constitué même si les questions sous-jacentes sont modifiées ultérieurement.

## Activation

Ajouter à `config/melis.module.load.php` :

```php
return [
    // …
    'MelisCmsMcqEngine',
];
```

Prérequis : `melisplatform/melis-cms` (`^5.3`), `melisplatform/melis-cms-tags` (`^5.3`),
`laminas/laminas-paginator`, PHP `^8.1|^8.3`. Le module embarque `dbdeploy: true`, ses tables sont
donc créées/mises à jour automatiquement. Chaîne d'installation : `melis-cms-mcq` →
**`melis-cms-mcq-engine`** → `melis-cms` + `melis-cms-tags`.

## Services principaux

Tous les services étendent le service générique de MelisCore et déclenchent des événements
`*_start` / `*_end`. Les alias sont enregistrés dans `config/module.config.php`.

| Alias de service | Rôle |
| --- | --- |
| `MelisCmsMcqService` | QCM : enregistrer, supprimer, lister, générer/récupérer le XML du QCM, mélanger l'ordre, évaluer les réponses (notation). |
| `MelisCmsMcqQuestionsService` | Questions : CRUD, génération XML, panier, sélecteur par modèle aléatoire. |
| `MelisCmsMcqAnswersService` | Réponses : CRUD, vérification de la bonne réponse, nombre de réponses par question. |
| `MelisCmsMcqGroupsService` | Groupes de QCM : CRUD, assemblage groupes+questions pour un QCM, désactivation des QCM liés. |
| `MelisCmsMcqQuestionCategoryService` | Catégories de questions (table `melis_cms_mcq_question_groups`) : CRUD. |

### Méthodes sélectionnées

**`MelisCmsMcqService`**

| Méthode | Rôle |
| --- | --- |
| `getMcq($mcqId)` | Retourne le XML du QCM assemblé ; mélange l'ordre des questions si `mcq_random_order` est activé. |
| `generateMcqXml($mcqProperties, $mcqTrans, $groupsData)` | Construit le XML complet du test à partir des groupes et questions, et le stocke dans `mcq_xml`. |
| `evaluateAnswers($mcqXml, $userAnswers, $passingPercentage)` | Note une soumission de type QCM ; ignore les questions ouvertes ; retourne le score et la réussite/échec. |
| `getMcqList` / `saveMcqItem` / `deleteMcqById` | Liste / enregistrement / suppression standard. |

**`MelisCmsMcqQuestionsService`**

| Méthode | Rôle |
| --- | --- |
| `generateQuestionXml()` | Construit l'instantané XML par question lors de l'enregistrement. |
| `updateMcqQuestionDataXml()` | Rafraîchit l'instantané de la question dans chaque QCM qui l'utilise. |
| `getRandomQuestionIds($difficultyId, $categoryId, $tagId, $numberOfQuestions, $excludedIds)` | Sélectionne automatiquement N identifiants de questions par difficulté / catégorie / tag. |
| `generateRandomQuestions($userId, $difficultyId, $categoryId, $tags, $numberOfQuestions, $langId, $alreadySelected)` | Sélecteur aléatoire de niveau supérieur avec liste d'exclusion. |
| `getQuestionsBasketList` / `processBasketQuestions` | Gère le panier de questions par utilisateur. |

## Front office

| Élément | Rôle |
| --- | --- |
| View helper `renderMcqQuestions` (`McqQuestionRendererHelper`) | Convertit `mcq_xml` en tableau et affiche le quiz via le template choisi. Pas de MelisTemplatingPlugin — c'est le template hôte qui décide du placement. |
| Template par défaut | `view/templates/default-preview-template.phtml` |
| Factory d'élément de formulaire `McqPreviewTemplatesSelect` | Alimente un select avec les templates enregistrés sous `mcq_preview_templates` dans `app.interface.php`. |

Autres factories d'éléments de formulaire utilisées par le back-office : `McqQuestionCategoriesSelect`,
`McqQuestionsDifficultySelect`, `QuestionsTypesSelect`.

## Tables de base de données

> **Note de nommage.** Les « catégories de questions » du back-office correspondent à
> `melis_cms_mcq_question_groups` (service `MelisCmsMcqQuestionCategoryService`). Les « groupes de
> QCM » du back-office correspondent à `melis_cms_mcq_groups` (service `MelisCmsMcqGroupsService`).
> Deux tables « group » distinctes — ne pas les confondre.

| Table | Contenu |
| --- | --- |
| `melis_cms_mcq` | Un QCM/test : `mcq_status`, `mcq_code`, `mcq_random_order`, **`mcq_xml`** (instantané du test assemblé), `mcq_passing_rate`, dates/utilisateurs. |
| `melis_cms_mcq_trans` | Nom du QCM par langue (`mcqt_name`). |
| `melis_cms_mcq_questions` | Une question : `mcqq_status`, `mcqq_code`, `mcqq_type`, `mcqq_group_id`, `mcqq_difficulty_id`, **`mcqq_xml`** (instantané question+réponses). |
| `melis_cms_mcq_questions_trans` | Texte de la question, `mcqqt_candidate_note`, `mcqqt_corrector_note` par langue. |
| `melis_cms_mcq_answers` | Une réponse : `mcqa_question_id`, `mcqa_status`, `mcqa_correct_answer`, `mcqa_code`. |
| `melis_cms_mcq_answers_trans` | Texte de la réponse par langue (`mcqat_answer_text`). |
| `melis_cms_mcq_question_types` | Types de questions : 1 = QCM, 2 = Question ouverte. |
| `melis_cms_mcq_questions_difficulty` (+`_trans`) | Niveaux de difficulté : 1 = Facile, 2 = Moyen, 3 = Difficile. |
| `melis_cms_mcq_question_groups` (+`_trans`) | Catégories de questions (`mcqqg_id`, `mcqqg_code`, `mcqqgt_name`). |
| `melis_cms_mcq_groups` (+`_trans`) | Groupes de QCM (`mcqg_id`, `mcqg_mcq_id`, `mcqg_code`, `mcqgt_name`), liés à un QCM spécifique. |
| `melis_cms_mcq_questions_list` | Lien questions ↔ QCM (`mcmql_mcq_id`, `mcmql_question_id`). |
| `melis_cms_mcq_groups_list` | Lien des groupes au sein d'un QCM (ajouté par migration). |
| `melis_cms_mcq_questions_tags_list` | Liens question ↔ tag (MelisCmsTags). |
| `melis_cms_mcq_baskets` | Panier de questions par utilisateur. |

## Exemple

```php
$sm = $this->getServiceLocator();

// --- Récupérer et afficher un quiz ---
$mcqSvc = $sm->get('MelisCmsMcqService');
$mcqXml = $mcqSvc->getMcq($mcqId); // mélange si mcq_random_order est activé

// Dans un template phtml :
echo $this->renderMcqQuestions(
    'MelisCmsMcqEngine/default-template',
    $mcqXml,
    $langId
);

// --- Noter une soumission ---
$result = $mcqSvc->evaluateAnswers($mcqXml, $userAnswers, 50);
// $result['global'] => ['score', 'pass', 'total', 'checked', 'skipped']
// $result['details'] => résultat par question

// --- Modèle aléatoire : sélection automatique de N questions ---
$qSvc = $sm->get('MelisCmsMcqQuestionsService');
$ids  = $qSvc->getRandomQuestionIds(
    $difficultyId,
    $categoryId,
    $tagId,
    $numberOfQuestions,
    $excludedIds
);
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Câblage du module + alias de services | `vendor/melisplatform/melis-cms-mcq-engine/config/module.config.php` |
| Config plugin (groupes par défaut, templates de prévisualisation) | `vendor/melisplatform/melis-cms-mcq-engine/config/app.interface.php` |
| Service QCM (XML, notation) | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqService.php` |
| Service questions (panier, modèle aléatoire) | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqQuestionsService.php` |
| Service réponses | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqAnswersService.php` |
| Service groupes | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqGroupsService.php` |
| Service catégories de questions | `vendor/melisplatform/melis-cms-mcq-engine/src/Service/MelisCmsMcqQuestionCategoryService.php` |
| Passerelles de tables | `vendor/melisplatform/melis-cms-mcq-engine/src/Model/Tables/` |
| Factories d'éléments de formulaire | `vendor/melisplatform/melis-cms-mcq-engine/src/Form/Factory/` |
| View helper | `vendor/melisplatform/melis-cms-mcq-engine/src/View/Helper/McqQuestionRendererHelper.php` |
| Template front par défaut | `vendor/melisplatform/melis-cms-mcq-engine/view/templates/default-preview-template.phtml` |
| Installation DB + migrations | `vendor/melisplatform/melis-cms-mcq-engine/install/dbdeploy/` |

Voir aussi : [Référence des modules](/fr/legacy/reference/modules) · [MelisCmsMcq](/fr/legacy/reference/modules/melis-cms-mcq) ·
[MelisCms](/fr/legacy/reference/modules/melis-cms)
