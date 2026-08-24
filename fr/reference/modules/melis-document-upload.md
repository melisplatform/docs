# MelisDocumentUpload

> Gestion des téléversements de documents en back-office sous forme d'outil React natif : définir des
> configurations de documents, collecter, stocker et servir les fichiers téléversés, et les rattacher
> aux réponses de MelisFormCreator. Paquet `melisplatform/melis-document-upload`.

## Présentation

`MelisDocumentUpload` est un outil réutilisable de collecte de documents. Vous définissez les
**configurations de documents** que vous souhaitez collecter (un passeport, un justificatif de
domicile…), puis vous parcourez les **fichiers téléversés** — stockés sur le **système de fichiers**
(sous `data/`) ou en **base de données** sous forme de BLOB, et servis via une **URL à token** stable
qui ne nécessite aucune connexion back-office. Son principal consommateur est **MelisFormCreator**,
qui peut exiger un document et lier un téléversement à une réponse de formulaire précise.

En v6, l'outil est livré comme une **brique full-React native** dans le back-office `/melis-react`. La
couche React gère l'intégralité de l'interface et son API JSON ; toute la logique métier (validation,
stockage, token, relations) reste dans les services Laminas du module, inchangée depuis la v5.

## Activation

Module Laminas standard, déjà listé dans `config/melis.module.load.php` sous
`'MelisDocumentUpload'`. Si vous l'ajoutez manuellement :

```php
// config/melis.module.load.php
return [
    // …
    'MelisDocumentUpload',
];
```

Puis `composer require melisplatform/melis-document-upload`. Il dépend de
`melisplatform/melis-core` ; l'intégration MelisFormCreator (colonnes Form Type / Status, l'exigence
de document « document » dans le formulaire) n'apparaît que si MelisFormCreator est actif. La brique
est découverte via `GET /melis/react-api/react-modules` et ne s'affiche que si le module est actif.

## Le back-office React

La brique enregistre une seule page routée (`DocumentUploadPage`) sous l'identifiant de brique
**`melis-document-upload`**. Elle apparaît dans la barre latérale sous **MelisMarketing → Document
Upload** et s'ouvre sur l'onglet **Documents téléversés**. Un plan de travail à deux onglets :

- **Documents téléversés** — parcourir les fichiers réellement téléversés (ID, Nom du document,
  Propriétaire, Taille, Type, Nom du fichier/formulaire, ID de réponse de formulaire, Date de
  téléversement). En téléverser un nouveau, réattribuer son propriétaire, le consulter via son URL à
  token ou le supprimer.
- **Liste des documents (configurations)** — gérer les configurations de documents (ID, Nom, Modèle
  DEFAULT/CUSTOM, Type de stockage FILESYSTEM/DB, Taille max, Chemin ; plus Form Type / Status quand
  MelisFormCreator est actif). Ajouter / éditer / supprimer.

Les deux onglets comportent des **cartes KPI** (Total / En base / Système de fichiers), une recherche
en direct, un **gestionnaire de colonnes** persistant (glisser pour réordonner / masquer) et un
**export** (xlsx/CSV). Ouvrir une ligne ou **Ajouter** ouvre son formulaire comme **sous-onglet**
natif dans la SubTabBar de l'hôte (URL `/melis-document-upload/:sub`, p. ex. `type-new`, `type-5`,
`uploaded-new`, `uploaded-12`).

Un bascule **New / Old** en haut à droite (`ViewToggle.tsx`) affiche l'outil legacy classique dans une
iframe à `/melis/react-tool-page?key=melis_document_upload_tool` à des fins de comparaison.

![L'onglet Documents téléversés (React) : liste des fichiers téléversés avec cartes KPI, recherche, gestionnaire de colonnes et le bascule New/Old.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-list.png)

### Onglet Documents téléversés

Actions de ligne **éditer** (réattribuer le propriétaire / consulter le fichier) et **supprimer**
(modale de confirmation). **Upload Document** ouvre le formulaire de téléversement comme sous-onglet :
le **Propriétaire** est un champ à autocomplétion adossé au serveur, le **Nom du document** est une
liste déroulante de vos configurations. L'enregistrement avec un fichier exécute le même
`processUpload` côté serveur (validation, déplacement sur le système de fichiers ou blob en base,
token). Une édition sans nouveau fichier ne fait que réattribuer le propriétaire. **View file** résout
l'URL à token publique du fichier.

![Formulaire de document téléversé (sous-onglet React) : choisir le propriétaire, le Nom du document, le fichier, puis Enregistrer.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-list-edit-modal.png)

### Onglet Liste des documents (configurations)

![L'onglet Liste des documents (React) : configurations de types de documents avec cartes KPI, gestionnaire de colonnes et export.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-typedoclist.png)

Le formulaire de configuration comporte le **Nom** par langue, une **Description** en texte riche, un
**Class name for custom rendering documents** (le renseigner rend le type CUSTOM), une **Max Size
(Mb)**, le **Type** de stockage (Filesystem + un chemin depuis DOCROOT, ou Database), un bascule **Is
the document mandatory?** et — quand MelisFormCreator est actif — **Display** (ALL / MANUAL) et **Form
status**. Pour un type Filesystem, le chemin d'enregistrement est validé côté serveur contre la
traversée de répertoire (les `..`, les antislashs et les caractères hors `[A-Za-z0-9_-/]` sont
rejetés).

![Formulaire de type de document (sous-onglet React) : Nom par langue, classe personnalisée, Max Size, Type de stockage + chemin, bascule obligatoire.](/screenshots/react/melis-document-upload/melisdocumentupload-tool-docupload-typedoclist-edit-modal.png)

## API JSON React

Il n'y a **pas de `config/react-api.php`**. Les endpoints React sont des actions de
`MelisDocumentUpload\Controller\DocumentUploadReactApiController` (qui étend
`DocumentUploadListController` et réutilise les services du module), atteintes via la route MVC
catch-all existante du module. Chaque URL est de la forme
`/melis/MelisDocumentUpload/DocumentUploadReactApi/<action>`. Comme le catch-all rejette un troisième
segment de chemin, **les ids sont passés en paramètre de requête `?id=`** et les suppressions sont des
`POST …?id=`.

Chaque action appelle d'abord `denyUnlessAccess()` (authentification via `MelisCoreAuth->hasIdentity()`
+ `MelisCoreRights->canAccess('melis_document_upload_tool')`, renvoie 401 / 403). Contrat de réponse
partout : `{ success: bool, data: T, error?: string, errors?: {...} }` (17 endpoints au total).

| Méthode · URL (`…/DocumentUploadReactApi/…`) | Objet · service |
| --- | --- |
| `GET /meta` | quels modules optionnels sont actifs (`formCreator`, `formEngine`) |
| `GET /languages` | langues de la plateforme ordonnées |
| `GET /typesList?search=` | liste des configurations (`MelisDocumentService::getList`) |
| `GET /typesStats` | cartes KPI (total / db / système de fichiers) |
| `GET /formOptions` | statuts FormCreator + modes d'affichage (quand actif) |
| `GET /typesGet?id=` | enregistrement complet + noms par langue |
| `POST /typesSave` | création/mise à jour (`saveDocumentItem` ; valide le chemin FS) |
| `POST /typesDelete?id=` | suppression logique (`deleteDocumentItem`) |
| `GET /uploadedList?search=` | liste des fichiers téléversés (`MelisDocumentUploadService::getList`) |
| `GET /uploadedStats` | cartes KPI |
| `GET /uploadedGet?id=` | un document téléversé |
| `POST /uploadedSave` (multipart) | téléverse un fichier (`processUpload`) |
| `POST /uploadedUserSave` | réattribue uniquement le propriétaire d'une ligne existante |
| `POST /uploadedDelete?id=` | suppression (`deleteDocumentUpload`) |
| `GET /uploadedFileUrl?id=` | URL à token publique (`getDocumentUrl`) |
| `GET /documentOptions` | options de type de document pour la liste déroulante de téléversement |
| `GET /boUsers?phrase=` | autocomplétion des utilisateurs BO pour le champ propriétaire |

```ts
// document-upload-api.ts — BASE = '/melis/MelisDocumentUpload/DocumentUploadReactApi'
const res = await fetch(`${BASE}/uploadedList?search=`, {
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
  credentials: 'include',
})
const { success, data } = await res.json()  // data: { items: UploadedItem[], total }
```

## Capacités

`config/react.capabilities.php` (fusionné dans `getConfig()`, lu par
`MelisReactApi\Service\Capabilities`) est indexé sous le nœud de menu porteur de droits
`melis_document_upload_tool` — la même melisKey que celle protégée par le contrôleur et que
`DocumentUploadPage` transmet à `useCaps()`. Il déclare **2 onglets**, chacun avec les mêmes cinq
actions :

```php
'melisReactToolCapabilities' => [
  'melis_document_upload_tool' => [
    'tabs' => [
      ['key' => 'uploaded', 'label' => 'tr_melisdocumentupload_content_tabs_uploaded',
        'actions' => ['list', 'create', 'edit', 'delete', 'export']],
      ['key' => 'types', 'label' => 'tr_melisdocumentupload_content_tabs_list',
        'actions' => ['list', 'create', 'edit', 'delete', 'export']],
    ],
  ],
],
```

Les vérifications `can()` côté React (`uploaded.create`, `types.export`, …) masquent les boutons pour
le confort ; l'application réelle côté serveur est le garde d'accès au niveau de l'outil
(`canAccess('melis_document_upload_tool')`) exécuté par chaque action.

## Services principaux

Déclarés comme alias `service_manager` dans `config/module.config.php`. Tous étendent
`MelisCore\Service\MelisGeneralService` (chaque méthode émet des événements `*_start` / `*_end`).

| Alias de service | Rôle |
| --- | --- |
| `MelisDocumentService` | Gère les **définitions de documents** (table `melis_docupl_documents`) : `getList()`, `getItemById()`, `saveDocumentItem()`, `deleteDocumentItem()` (suppression logique via `isactive`), `getDocumentByDocumentId()`, noms multilingues via `saveFormDocumentTranslation()` / `getDocumentTranslation()`. |
| `MelisDocumentUploadService` | Gère les **fichiers téléversés**. `processUpload($docId, $file, $postValues)` valide, stocke (FILESYSTEM ou DB), crée l'enregistrement et assigne un token ; `uploadFile()`, `saveDocumentUploaded()`, `deleteDocumentUpload()`, `getDocumentUploadByToken()`, `getDocumentUrl($docUploadId)` (renvoie l'URL `?token=…`), `getLatestDocumentUploadByDocId()`. |
| `MelisDocumentUploadRelationsService` | Lit les relations téléversement→réponse : `getLatestDocumentUploadedDataByIdAndObjectId()`, `getDocUplRelationData()`. |
| `MelisDocumentUploadListRelService` | Gère les relations définition→objet de formulaire (`melis_docupl_documents_lists_rel`) : `saveDocumentUploadForm()`, `saveFormDocument()`, `getDocumentsByFormAnswerId()`, `getDocumentsDoneByFormAnswerId()`, `deleteDocumentListFormDelete()`. |

Les passerelles de tables sont aussi aliasées : `MelisDocumentTable`, `MelisDocumentTransTable`,
`MelisDocumentUploadTable`, `MelisDocumentUploadRelationsTable`, `MelisDocumentListRelTable`,
`MelisDocumentUserTable`.

## Front office

Le module n'est pas un plugin de templating. Les fichiers téléversés sont exposés via une **URL à
token** et un view helper :

- **Route de consultation publique** — `melis-backoffice/melisdocument`
  (`/melis/melisdocument?token=<token>`), gérée par `DocumentUploadController::viewAction`. Le token
  résout une ligne de `melis_docupl_documents_uploaded` et le fichier est servi avec son type MIME
  stocké. La route est déclarée dans les `excluded_routes` de `meliscore` (pas d'authentification
  back-office).
- **View helper `DocumentUploadHelper`** (alias `DocumentUploadHelper`) —
  `$this->DocumentUploadHelper($documentTypeId, $template, $objectId, $docUplRelationId)` rend le HTML
  du widget d'upload pour une définition de document, en choisissant le template DEFAULT ou CUSTOM.

**Plugins de contrôleur** pour le rendu et la (dé)sérialisation du formulaire d'upload :
`MelisDocumentUploadTemplatePlugin` (base abstraite, méthodes `render()`, `validateForm()`,
`encodeCustomDatas()`/`decodeCustomDatas()`), `MelisDocumentUploadTemplateDefaultPlugin` (type
DEFAULT) et `MelisDocumentUploadTemplateCustomPlugin` (type CUSTOM, champs supplémentaires). Une
définition CUSTOM indique sa propre classe de plugin dans `mdud_doc_class`.

## Intégration MelisFormCreator

Sous l'interface `melisformcreator`, le module injecte un onglet **Document** dans la page d'édition de
formulaire (`melisformcreator_form_edition_page_content_tabs_document`), servi par
`DocumentUploadedFormCreatorController`, afin qu'un formulaire puisse exiger un document configuré.
Trois listeners enregistrés dans `src/Module.php` sur la route `melis-backoffice` assurent cette
liaison : `DeleteListener`, `DocumentFormCreatorListener`, `DocumentFormCreatorInstructionListener`.
Dès qu'un formulaire collecte des documents, les fichiers des réponses apparaissent dans l'onglet
**Documents téléversés**.

## Tables de base de données

Créées par `install/dbdeploy/` (dbdeploy est activé dans `composer.json`).

| Table | Rôle |
| --- | --- |
| `melis_docupl_documents` | **Définitions** d'upload : `mdud_type` (`DEFAULT`/`CUSTOM`), `mdud_file_saving_type` (`DB`/`FILESYSTEM`), `mdud_file_saving_path_from_root`, `mdud_max_size_mb`, `mdud_doc_class`, `mdud_is_mandatory`, `isactive`. |
| `melis_docupl_documents_trans` | **Noms** par langue pour une définition (`mdudtr_lang_id`, `mdudtr_name`). |
| `melis_docupl_documents_uploaded` | **Fichiers téléversés** : nom, taille, MIME (`mdud_file_mimetype`), extension, `mdudu_saving_type`, `mdudu_file_object` (BLOB), `mdudu_token`, auteur, `mdudu_upload_date`, `isactive`. |
| `melis_docupl_docs_relations` | Lie un fichier téléversé à un objet (`mdudr_type`, p. ex. `Form_answer`, + `mdudr_object_id`). |
| `melis_docupl_documents_lists_rel` | Lie une définition à un objet de formulaire (`mdudlr_object_type` = `FORM`). |

## Exemple

Valider, stocker un fichier téléversé pour une définition de document, puis construire son URL
publique :

```php
$uploadService = $this->getServiceManager()->get('MelisDocumentUploadService');

// $docId = un melis_docupl_documents.mdud_id ; $_FILES['my_field'] = le fichier téléversé
$res = $uploadService->processUpload($docId, $_FILES['my_field'], [
    'mdudr_type'      => 'Form_answer',
    'mdudr_object_id' => $formAnswerId,
]);

if ($res['success']) {
    $url = $res['fileUrl']; // ex. https://mysite.local/melis/melisdocument?token=...
}
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Config module / routes / services | `config/module.config.php` |
| Capacités React (2 onglets, pas de `react-api.php`) | `config/react.capabilities.php` |
| Source de la brique React | `ui-react/src/` (`brick.tsx`, `DocumentUploadPage.tsx`, `document-upload-api.ts`) |
| Brique compilée | `public/ui-react/brick.js`, `public/ui-react/brick.manifest.json` |
| Contrôleur API React (17 actions) | `src/Controller/DocumentUploadReactApiController.php` |
| Service d'upload | `src/Service/MelisDocumentUploadService.php` |
| Service de définition | `src/Service/MelisDocumentService.php` |
| Contrôleur vue publique + outil | `src/Controller/DocumentUploadController.php` |
| Contrôleur FormCreator | `src/Controller/DocumentUploadedFormCreatorController.php` |
| View helper | `src/View/Helper/DocumentUploadHelper.php` |
| Plugins de rendu | `src/Controller/Plugin/` |
| Listeners | `src/Listener/` |
| Schéma | `install/dbdeploy/` |
