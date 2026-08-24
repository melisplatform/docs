# MelisCmsMcqEngine

> Données, services, instantanés XML, notation et rendu front-office du quiz pour le système de QCM — le backend derrière l'outil React MCQ. Package `melisplatform/melis-cms-mcq-engine`.

## Présentation

MelisCmsMcqEngine est la **couche données et services** du système de QCM : il possède les tables de
base de données, les services pour les questions, réponses, QCM, groupes et catégories,
l'**instantané XML** qui fige chaque test assemblé, le sélecteur de questions par **modèle
aléatoire**, l'évaluation **notation / taux de réussite** des réponses, ainsi que le **rendu
front-office du quiz**. On peut le comparer au duo MelisEngine ↔ MelisCms, mais pour les quiz.

Le test assemblé est stocké sous forme de `mcq_xml` afin que le rendu et la notation lisent un
instantané autonome, et non une jointure en direct, préservant ainsi le QCM exact qu'un utilisateur
a constitué même si les questions sous-jacentes sont modifiées ultérieurement.

## Pas de brique React — exposé via MelisCmsMcq

Ce moteur n'a **aucune interface back-office propre** — ni legacy, ni React. Il ne livre **aucun**
`brick.manifest.json`, **aucun** projet `ui-react/`, **aucun** `config/react-api.php` et **aucun**
`config/react.capabilities.php`. Il **n'est pas** listé par `GET /melis/react-api/react-modules`,
n'apparaît dans aucun menu React et ne contribue à aucun nœud de capacité.

Dans `/melis-react`, la fonctionnalité QCM vit entièrement dans l'outil **MelisCmsMcq** (barre
latérale → **MelisCms → MCQ** ; brique `cms-mcq`, route `/melis-cms/mcq`, `melisKey`
`meliscmsmcq_tool`). Les contrôleurs `react-api` de cet outil résolvent **les services de ce moteur**
et leur délèguent toute la logique métier — les mêmes services que ceux qu'utilisait l'outil legacy.
Le chemin React → `react-api` → **service du moteur** remplace simplement le chemin legacy
jQuery/AJAX → contrôleur → **service du moteur** ; il n'existe aucun code moteur spécifique à React.
Les droits d'accès et les capacités de droits avancés vivent tous sur le nœud **MelisCmsMcq**
(`meliscmsmcq_tool`), et non ici — le `rightsDisplay` du moteur vaut `'none'`.

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
`*_start` / `*_end`. Les alias sont enregistrés dans `config/module.config.php` et constituent les
points d'entrée exacts que résolvent les contrôleurs React de MelisCmsMcq.

| Alias de service | Rôle | Consommé par (contrôleur React MelisCmsMcq) |
| --- | --- | --- |
| `MelisCmsMcqService` | QCM : enregistrer, supprimer, lister, générer/récupérer le XML du QCM, mélanger l'ordre, évaluer les réponses (notation). | `MelisReactApiMcqController` |
| `MelisCmsMcqQuestionsService` | Questions : CRUD, génération XML, panier, sélecteur par modèle aléatoire. | `MelisReactApiMcqQuestionController` |
| `MelisCmsMcqAnswersService` | Réponses : CRUD, vérification de la bonne réponse, nombre de réponses par question. | `MelisReactApiMcqQuestionController` |
| `MelisCmsMcqGroupsService` | Groupes de QCM : CRUD, assemblage groupes+questions pour un QCM, désactivation des QCM liés. | `MelisReactApiMcqGroupController` |
| `MelisCmsMcqQuestionCategoryService` | Catégories de questions (table `melis_cms_mcq_question_groups`) : CRUD. | `MelisReactApiMcqCategoryController` |

### Méthodes sélectionnées

**`MelisCmsMcqService`**

| Méthode | Rôle |
| --- | --- |
| `getMcq($mcqId)` | Retourne le XML du QCM assemblé ; mélange l'ordre des questions si `mcq_random_order` est activé. |
| `generateMcqXml($mcqProperties, $mcqTrans, $groupsData)` | Construit le XML complet du test à partir des groupes et questions, et le stocke dans `mcq_xml`. |
| `evaluateAnswers($mcqXml, $userAnswers, $passingPercentage)` | Note une soumission de type QCM ; ignore les questions ouvertes ; retourne le score et la réussite/échec. |
| `xmlToArray($mcqXml)` | Analyse l'instantané figé `mcq_xml` en tableau (utilisé par la prévisualisation React). |
| `getMcqList` / `saveMcqItem` / `deleteMcqById` | Liste / enregistrement / suppression standard. |

**`MelisCmsMcqQuestionsService`**

| Méthode | Rôle |
| --- | --- |
| `generateQuestionXml()` | Construit l'instantané XML par question lors de l'enregistrement. |
| `updateMcqQuestionDataXml()` | Rafraîchit l'instantané de la question dans chaque QCM qui l'utilise. |
| `getRandomQuestionIds($difficultyId, $categoryId, $tagId, $numberOfQuestions, $excludedIds)` | Sélectionne automatiquement N identifiants de questions par difficulté / catégorie / tag. |
| `generateRandomQuestions($userId, $difficultyId, $categoryId, $tags, $numberOfQuestions, $langId, $alreadySelected)` | Sélecteur aléatoire de niveau supérieur avec liste d'exclusion. |
| `getQuestionsBasketList` / `processBasketQuestions` | Gère le panier de questions par utilisateur. |

## Comment l'outil React MCQ utilise ce moteur

Les contrôleurs React du QCM font transiter le JSON en entrée/sortie et délèguent toute la logique
au moteur. Les principaux points de contact côté serveur (depuis
`melis-cms-mcq/src/Controller/MelisReactApi*Controller.php`) :

```php
// POST /melis/react-api/mcq/save  → MelisReactApiMcqController::saveAction()
$mcqService = $this->getServiceManager()->get('MelisCmsMcqService');
$mcqXml = $mcqService->generateMcqXml($mcqProperties, $mcqTrans, $groupsData); // engine assembles snapshot

// POST /melis/react-api/mcq/evaluate  → evaluateAction()
$result = $mcqService->evaluateAnswers($xml, $answers, $passing);              // engine scores; React displays

// GET  /melis/react-api/mcq/:id/preview  → previewAction()
$xml    = $mcqService->getMcq($id);            // frozen test XML (shuffled if mcq_random_order)
$parsed = (array) $mcqService->xmlToArray($xml);

// POST /melis/react-api/mcq-questions/random  → MelisReactApiMcqQuestionController::randomAction()
$ids = $questionService->getRandomQuestionIds($difficulty, $category, $tagId, $count, $exclude);
```

La **prévisualisation** React affiche directement le `mcq_xml` analysé (`getMcq` + `xmlToArray`) ;
elle **n'appelle pas** le view helper `renderMcqQuestions` du moteur — ce helper est uniquement le
rendu front-office / site web, et il est inchangé par le back-office React.

## Front office

| Élément | Rôle |
| --- | --- |
| View helper `renderMcqQuestions` (`McqQuestionRendererHelper`) | Convertit `mcq_xml` en tableau et affiche le quiz via le template choisi. Pas de MelisTemplatingPlugin — c'est le template hôte qui décide du placement. |
| Template par défaut | `view/templates/default-preview-template.phtml` |
| Factory d'élément de formulaire `McqPreviewTemplatesSelect` | Alimente un select avec les templates enregistrés sous `mcq_preview_templates` dans `app.interface.php`. |

Autres factories d'éléments de formulaire enregistrées par le moteur : `McqQuestionCategoriesSelect`,
`McqQuestionsDifficultySelect`, `QuestionsTypesSelect`. L'outil React construit ses propres
références JSON (types, difficultés, catégories) plutôt que d'afficher ces éléments select Laminas,
mais les données sous-jacentes du moteur (types 1=QCM / 2=Question ouverte, difficultés
Facile/Moyen/Difficile, catégories) sont identiques. Le `app.interface.php` du moteur enregistre
toujours le plugin `meliscmsmcqengine` avec ses `datas` (`mcq_groups.default_group_lists`,
`mcq_preview_templates`) — des valeurs par défaut que l'outil QCM respecte quel que soit le
front-end.

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

// --- Fetch and render a quiz on a website ---
$mcqSvc = $sm->get('MelisCmsMcqService');
$mcqXml = $mcqSvc->getMcq($mcqId); // shuffles if mcq_random_order is set

// In a phtml template:
echo $this->renderMcqQuestions(
    'MelisCmsMcqEngine/default-template',
    $mcqXml,
    $langId
);

// --- Score a submission ---
$result = $mcqSvc->evaluateAnswers($mcqXml, $userAnswers, 50);
// $result['global']  => ['score', 'pass', 'total', 'checked', 'skipped']
// $result['details'] => per-question outcome

// --- Random model: auto-select N questions ---
$qSvc = $sm->get('MelisCmsMcqQuestionsService');
$ids  = $qSvc->getRandomQuestionIds($difficultyId, $categoryId, $tagId, $numberOfQuestions, $excludedIds);
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

Voir aussi : [Référence des modules](/fr/reference/modules) · [MelisCmsMcq](/fr/reference/modules/melis-cms-mcq) ·
[MelisCms](/fr/reference/modules/melis-cms)
