# MelisCmsMcq

> Constructeur de QCM (questionnaire à choix multiples / quiz) back-office pour le Melis CMS, désormais un outil full-React natif dans le back-office v6. Package `melisplatform/melis-cms-mcq`.

## Présentation

MelisCmsMcq est la **partie interface** du système QCM. Il fournit l'atelier permettant de créer des
**questions** (avec réponses, type, difficulté, catégorie et tags), de les organiser en **catégories
de questions** et en **groupes de QCM**, et d'assembler des **QCM** (tests) soit manuellement via un
**panier** par utilisateur, soit automatiquement via un **modèle aléatoire**. Il ne possède pas sa
propre couche de données : toute la persistance (tables, services, notation, instantanés XML et
rendu front-office) est déléguée au module compagnon **MelisCmsMcqEngine**.

En v6, l'outil est une **brique full-React native** : de véritables pages React qui appellent les
points d'entrée JSON `/melis/react-api/mcq*` du module, sans iframe dans la vue par défaut. L'outil
PHP historique reste intact et n'est accessible que via une bascule Nouveau / Ancien propre à
l'outil.

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

La brique React est découverte via `GET /melis/react-api/react-modules` et n'apparaît que lorsque le
module est actif. `src/Module.php` fusionne `config/react-api.php` (les points d'entrée JSON) et
`config/react.capabilities.php` (la table des droits avancés) dans la configuration de l'application.

## Emplacement dans le back-office React

**Menu gauche → MelisCms → MCQ**, route **`/melis-cms/mcq`** (dérivée du forward de menu
`MelisCmsMcq/MelisCmsMcq`). La brique est enregistrée sous l'id **`cms-mcq`** et dessine tout l'outil
en React — sans menu gauche ni en-tête propres.

![L'onglet MCQ (React) : la liste des tests avec cartes KPI, filtres, la bascule Nouveau/Ancien et le panier Questions Favorites.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-list.png)

Le manifeste (`public/ui-react/brick.manifest.json`) fixe `persistent: true` et `subTabs: true`, si
bien que la brique possède sa **propre** barre de sous-onglets interne et reste montée pendant la
navigation de l'hôte : ouvrir un QCM ou une question ajoute un sous-onglet, et les filtres, le tri et
les formulaires à moitié saisis survivent lorsque vous revenez à une liste. L'URL n'est qu'un reflet
cosmétique (`history.replaceState`) de l'enregistrement actif.

| Propriété | Valeur |
| --- | --- |
| Id de brique | `cms-mcq` |
| Route | `/melis-cms/mcq` |
| Libellé | `MCQ` |
| forwardKey | `MelisCmsMcq/MelisCmsMcq` |
| melisKey | `meliscmsmcq_tool` (clé de garde d'accès **et** porteuse des droits) |

> **Bascule Nouveau / Ancien.** Sur la vue liste, un utilisateur non restreint dispose d'un
> commutateur **Nouveau (React) / Ancien (iframe historique)** ; la vue « Ancien » est l'outil
> classique servi à `/melis/react-tool-page?key=meliscmsmcq_tool`. Les utilisateurs restreints ne
> voient jamais que la vue React.

## Atelier back-office

Un atelier React à quatre onglets, plus un panier **Questions Favorites** (une sélection restreinte
de favoris par utilisateur) dans l'en-tête de l'outil. Principe général : créer des **questions** →
les regrouper (**groupes de QCM** / **catégories**) → assembler un **QCM** → **Prévisualiser** pour
le passer et lire la correction.

| Onglet | Ce qu'il gère |
| --- | --- |
| **MCQ** | Liste des tests assemblés (Id, statut, code, nom, date de création, groupes, questions) avec cartes KPI, recherche, filtres statut/date, gestionnaire de colonnes et export. **Ajouter** ouvre le constructeur de QCM dans un sous-onglet. |
| **Questions** | Liste des questions avec filtres catégorie / type / statut / difficulté / tags et recherche ; une action **favori** ajoute ou retire la question de Questions Favorites. |
| **MCQ groups** | Lots de questions réutilisables (Id, statut, code, nom). Cartes KPI, export, **modale** d'ajout/édition. |
| **Question categories** | Regroupements de questions nommés (Id, statut, code, nom). Cartes KPI, export, **modale** d'ajout/édition. |

![L'onglet Questions (React) : liste de questions filtrable, avec l'action favori du panier.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions.png)

### Éditeur de question

**Ajouter / éditer** dans l'onglet Questions ouvre l'éditeur dans un sous-onglet, en deux onglets :

| Onglet éditeur | Contenu |
| --- | --- |
| **Properties** | Code, **Type** (MCQ / Open Ended), **Catégorie**, **Tags**, **Difficulté**, statut |
| **Texts / Answers** | Texte de la question par langue, plus chaque **réponse** avec son indicateur **Correct answer (Yes/No)**, un code et un statut ; faire glisser la poignée pour réordonner les réponses |

![Éditeur de question — Properties (Type, Catégorie, Tags, Difficulté, statut).](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-properties.png)

![Éditeur de question — textes par langue et liste des réponses (bascule bonne réponse).](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-texts.png)

![Poignée de glisser-déposer pour réordonner sur une ligne de réponse.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-questions-edit-dragdroporderingicon.png)

### Constructeur de QCM

Onglet **MCQ** → **Ajouter** (ou éditer une ligne) ouvre le constructeur dans un sous-onglet, en
trois onglets :

| Onglet constructeur | Contenu |
| --- | --- |
| **Properties** | Nom, code, statut, **Score minimum requis (%)** (taux de réussite) et une bascule de mélange aléatoire **« modifier l'ordre des questions à chaque création de QCM »** |
| **Composition (Questions)** | Ajouter des **groupes**, puis remplir chaque groupe en faisant glisser des questions depuis les panneaux latéraux **Questions Favorites** / **Search Questions**, ou cliquer sur **Configure a random MCQ** pour une sélection automatique par groupe |
| **Preview** | Passer le quiz assemblé, puis soumettre pour afficher la **Correction** calculée par le moteur (score, réussite/échec, réponses de l'utilisateur vs bonnes réponses par question). L'interface React ne fait que l'afficher |

![Constructeur de QCM Properties — nom, score minimum requis (%), bascule d'ordre aléatoire.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-properties.png)

![Composition du constructeur de QCM — groupes avec leurs questions, plus les panneaux Favorites / Search.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-questions.png)

![Prévisualisation du constructeur de QCM — le quiz assemblé, prêt à être passé.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-preview.png)

![Correction de la prévisualisation — score, réussite/échec et réponses de l'utilisateur vs bonnes réponses par question.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-preview-corrected.png)

La modale **Random Model** définit des lignes de critères par groupe (Difficulté / Catégorie / Tag /
Nombre) ; l'enregistrement résout les identifiants de questions correspondants côté serveur via le
`getRandomQuestionIds` du moteur.

![La modale Random Model — sélection automatique des questions par groupe selon des critères.](/screenshots/react/melis-cms-mcq/meliscmsmcq-tool-mcq-tab-mcq-edit-tab-questions-randommcq-modal.png)

> Un enregistrement échoue s'il n'y a pas de nom, pas de groupe, ou **un groupe vide** — les mêmes
> règles que l'outil historique. L'instantané XML du QCM (`mcq_xml`) est régénéré par le moteur à
> chaque enregistrement, jamais écrit à la main. Créer ou supprimer une catégorie rafraîchit les
> données de référence partagées afin qu'elle apparaisse immédiatement dans le sélecteur de catégorie
> de l'éditeur de question.

## API React — points d'entrée

Toutes les routes sont des routes enfants de `melis-react-api` (fusionnées depuis
`config/react-api.php`), servies par quatre contrôleurs invokables. Contrat de réponse partout :
`{ success: bool, data: T, error?: string, fields?: string[] }`. Chaque action appelle
`denyUnlessAccess()` (auth + `MelisCoreRights::canAccess('meliscmsmcq_tool')`) puis une garde de
capacité `denyUnlessCan(<cap>)`.

**MCQ** — `MelisReactApiMcqController` :

| Méthode · URL | Action · cap | But |
| --- | --- | --- |
| `GET /melis/react-api/mcq` | `list` · `mcq` | liste keyset |
| `GET /melis/react-api/mcq/stats` | `stats` · `mcq` | cartes KPI |
| `GET /melis/react-api/mcq/groups` | `groups` · `mcq` | groupes sélectionnables dans le constructeur |
| `GET /melis/react-api/mcq/:id` | `get` · `mcq` | détail complet (propriétés, noms, groupes ordonnés + questions) |
| `POST /melis/react-api/mcq/save` | `save` · `mcq.create` \| `mcq.edit` | création/mise à jour (régénère `mcq_xml`) |
| `POST /melis/react-api/mcq/evaluate` | `evaluate` · `mcq.preview.test` | noter un ensemble de réponses |
| `GET /melis/react-api/mcq/:id/preview` | `preview` · `mcq.preview` | le QCM tel qu'il est joué (depuis le XML) |
| `DELETE /melis/react-api/mcq/delete/:id` | `delete` · `mcq.delete` | suppression (en cascade) |

**Questions** (+ réponses, panier, tirage aléatoire) — `MelisReactApiMcqQuestionController`, à
`/melis/react-api/mcq-questions[…]` : `list`/`stats`/`refs`/`get`/`save` (cap `questions`),
`delete` (`questions.delete`), et les points d'entrée de composition `basket`, `basket/toggle`,
`basket/clear`, `search`, `random`, `random-model` (tous cap `mcq.composition`). `refs` renvoie les
données de référence partagées — types, difficultés, catégories, tags, langues, `nextCode`.

**MCQ groups** — `MelisReactApiMcqGroupController` : `list`/`stats`/`save`/`delete`/`related`/`get`
à `/melis/react-api/mcq-groups[…]` (caps `groups`, `groups.delete`).

**Question categories** — `MelisReactApiMcqCategoryController` :
`list`/`stats`/`save`/`delete`/`related`/`get` à `/melis/react-api/mcq-categories[…]`
(caps `categories`, `categories.delete`).

> ⚠ L'ordre des routes compte : les segments littéraux (`/stats`, `/save`, `/groups`, `/basket`,
> `/random`, `/evaluate`, `/refs`) sont déclarés **avant** le fourre-tout `/:id`, et tous les noms
> sont préfixés `mcq-*` pour éviter les collisions avec les routes génériques `melis-react-api`.

**La logique métier reste côté serveur.** Ces contrôleurs se contentent de valider les entrées,
d'exécuter une transaction et de mettre en forme le JSON ; le vrai travail se trouve dans les
services du moteur qu'ils résolvent.

## Capacités (droits avancés)

`config/react.capabilities.php` est indexé sous le nœud de menu porteur des droits
**`meliscmsmcq_tool`** — la même melisKey que gardent les contrôleurs. L'accès à l'outil lui-même
reste `MelisCoreRights::canAccess('meliscmsmcq_tool')` ; ces capacités contrôlent les **composants à
l'intérieur** d'un outil déjà autorisé. Autorisation par défaut : un utilisateur/rôle sans section de
capacités conserve tout.

Chaînes de capacités à plat :

- **`mcq`**, `mcq.create`, `mcq.edit`, `mcq.delete`, `mcq.export` ; `mcq.composition` (page de
  composition — contrôle aussi le panier + les points d'entrée search/random), `mcq.properties`,
  `mcq.preview`, `mcq.preview.test`
- **`questions`**, `questions.create`, `questions.edit`, `questions.delete`, `questions.export` ;
  `questions.properties`, `questions.answers`
- **`groups`**, `groups.create`, `groups.edit`, `groups.delete`, `groups.export`
- **`categories`**, `categories.create`, `categories.edit`, `categories.delete`, `categories.export`

Les quatre clés de premier niveau (`mcq`, `questions`, `groups`, `categories`) correspondent aux
quatre onglets de liste. React les lit via `useCaps(MELIS_KEY)` et masque les onglets/boutons en
conséquence ; le `denyUnlessCan()` côté serveur est l'application réelle.

## Services Engine utilisés

MelisCmsMcq ne déclare aucun service en propre — ses contrôleurs React résolvent des alias provenant
de **MelisCmsMcqEngine** à l'exécution :

| Alias de service Engine | Utilisé par ce module pour |
| --- | --- |
| `MelisCmsMcqQuestionsService` | CRUD des questions, liste du panier, sélection aléatoire (`getRandomQuestionIds`) |
| `MelisCmsMcqAnswersService` | CRUD des réponses (éditeur de question) |
| `MelisCmsMcqQuestionCategoryService` | CRUD des catégories de questions |
| `MelisCmsMcqGroupsService` | CRUD des groupes de QCM |
| `MelisCmsMcqService` | CRUD des QCM, génération XML (`generateMcqXml`), récupération (`getMcq`), notation (`evaluateAnswers`), suppression (`deleteMcqById`) |

## Tables de base de données

Toutes les tables appartiennent à **MelisCmsMcqEngine**. Les interfaces back-office de ce module leur
correspondent comme suit :

| Table Engine | Interface BO qui y écrit |
| --- | --- |
| `melis_cms_mcq_questions` + `_trans` | Onglet Questions + éditeur de question |
| `melis_cms_mcq_answers` + `_trans` | Éditeur de réponses (dans l'éditeur de question) |
| `melis_cms_mcq_question_groups` + `_trans` | Onglet Question categories |
| `melis_cms_mcq_groups` + `_trans` | Onglet MCQ groups (lié à un QCM via `mcqg_mcq_id`) |
| `melis_cms_mcq` + `_trans` | Onglet MCQ ; test assemblé stocké en XML dans `mcq_xml` |
| `melis_cms_mcq_questions_list` | Appartenance question-à-groupe-QCM |
| `melis_cms_mcq_baskets` | Questions Favorites par utilisateur |

> **Attention aux nommages.** Les « Question categories » de l'interface correspondent à
> `melis_cms_mcq_question_groups` ; les « MCQ groups » de l'interface correspondent à
> `melis_cms_mcq_groups`. Deux tables « group » distinctes avec des finalités différentes — voir la
> documentation de MelisCmsMcqEngine.

## Intégration des tags

`config/app.interface.php` enregistre une association **MelisCmsTags** afin que les questions soient
taguables (type d'association `MCQ_QUESTION`, table d'entité `melis_cms_mcq_questions`, primaire
`mcqq_id`). La liste des Questions expose une colonne **tags** et un **filtre tags** pilotés par cet
enregistrement ; dans l'outil React, les tags font aussi partie de la charge utile `refs` des
questions.

## Front office

MelisCmsMcq ne produit aucun rendu front-office en propre. Le moteur de rendu du quiz est un view
helper (`renderMcqQuestions`) enregistré dans **MelisCmsMcqEngine** ; l'onglet Preview l'utilise via
le moteur. Consultez la [référence MelisCmsMcqEngine](/legacy/reference/modules/melis-cms-mcq-engine)
pour les détails du rendu front-office.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Routes API React + 4 contrôleurs invokables | `config/react-api.php` |
| Table des capacités (droits avancés) | `config/react.capabilities.php` |
| Bootstrap du module (fusionne les deux configs ci-dessus) | `src/Module.php` |
| Trait de contrôleur partagé (MELIS_KEY, denyUnlessAccess, json/error/tr) | `src/Controller/McqReactApiTrait.php` |
| MCQ list/get/save/preview/evaluate/delete | `src/Controller/MelisReactApiMcqController.php` |
| Questions + réponses + panier + tirage aléatoire | `src/Controller/MelisReactApiMcqQuestionController.php` |
| MCQ groups | `src/Controller/MelisReactApiMcqGroupController.php` |
| Question categories | `src/Controller/MelisReactApiMcqCategoryController.php` |
| Source de la brique React (Vite IIFE) | `ui-react/src/` (`brick.tsx`, `McqPage.tsx`, `McqBuilder.tsx`, `QuestionEditor.tsx`, `mcq-api.ts`, …) |
| Bundle de brique compilé + manifeste | `public/ui-react/{brick.js, brick.manifest.json}` |
| Outil historique (arbre, onglets, DataTables, vues, JS) | `config/app.interface.php`, `config/app.tools.php`, `src/Controller/`, `view/`, `public/js/` |

Voir aussi : [melis-cms-mcq-engine](/legacy/reference/modules/melis-cms-mcq-engine),
[melis-cms-tags](/legacy/reference/modules/melis-cms-tags),
[melis-cms](/legacy/reference/modules/melis-cms),
[melis-core](/legacy/reference/modules/melis-core)
