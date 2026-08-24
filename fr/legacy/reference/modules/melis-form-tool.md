# MelisFormTool

> Gestionnaire back-office des réponses aux formulaires : saisie, navigation, inspection, validation avec commentaires et historique. Package `melisplatform/melis-form-tool`.

## Présentation

MelisFormTool est la couche de consultation et de validation back-office qui s'appuie sur MelisFormEngine. Les équipes peuvent remplir un formulaire au nom d'un client, parcourir l'ensemble des réponses soumises, en ouvrir une pour inspecter les champs renseignés et son historique d'événements, puis la valider en définissant un statut et en ajoutant des commentaires. Il ajoute également un onglet de configuration de validation par formulaire dans le panneau de paramètres **Autre config** de chaque formulaire.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisFormTool',
];
```

Nécessite `melisplatform/melis-form-engine` (`^5.3`) et `laminas/laminas-paginator`. PHP `^8.1|^8.3`.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `FormToolService` | Persiste la configuration de validation par formulaire ; déclenche des événements start/end autour des sauvegardes |

### Utilisation de `FormToolService`

```php
$svc = $sm->get('FormToolService');
$svc->saveFormValidationConfig($settings);
// fires melisformtool_save_form_validation_config_start / _end
```

> **Note — persistance de la configuration :** `saveFormValidationConfig()` écrit un fichier de configuration PHP à l'exécution dans
> `vendor/melisplatform/melis-form-tool/config/formvalidation.config.php` sous
> `plugins.melisformtool.datas.MelisFormsValidationConfig`, puis réinitialise OPcache. `Module::getConfig()`
> inclut ce fichier conditionnellement s'il existe. La configuration de validation par formulaire est persistée sous forme de
> configuration de module générée plutôt que dans une table de base de données, et elle modifie le répertoire vendor à chaque sauvegarde.

## Back-office

**Emplacement :** Menu gauche → MelisMarketing → Form Tool (`fa-file-text-o`).

L'écran principal est un DataTable des réponses aux formulaires. La configuration de validation par formulaire se trouve dans l'onglet **Autre config** (onglet Form Tool) de chaque formulaire.

### DataTable des réponses (`#tableToolFormTool`)

| Colonne | Champ source |
| --- | --- |
| Id | `mfa_id` |
| Form | `mft_name` |
| Status | `mfst_name` |
| Version | `version` |
| Creation date | `mfa_date_creation` |
| User | `user_name` |

Filtres : **formulaire / date / statut / limite**. Actions : **modifier / supprimer**.

Point d'accès Ajax : `/melis/MelisFormTool/FormTool/getFormsAnswersLists`

### Contrôleurs

| Contrôleur | Responsabilités |
| --- | --- |
| `FormToolController` | Rendu de l'outil, JSON du DataTable des réponses, filtres du tableau, modal de saisie de formulaire, onglet réponse (champs + validation + historique), modal de validation et commentaires, sauvegarde/suppression d'une réponse, `getFormById` |
| `ToolValidationController` | `validateField` côté serveur, rendu de l'onglet de configuration de validation dans Autre config |

### Listener

`MelisFormToolOtherConfigListener` s'attache à l'événement `meliscore_save_other_config` (MelisCore). Lorsque l'Autre config d'un formulaire est sauvegardée, il lit les éléments `melisformtool_form_validation_config_form`, les mappe vers les paramètres, puis appelle `FormToolService::saveFormValidationConfig()`.

## Tables de base de données

MelisFormTool ne possède **aucune table en propre**. Toutes les données appartiennent à MelisFormEngine.

| Préfixe de table | Propriétaire | Contenu |
| --- | --- | --- |
| `mfa_*` | MelisFormEngine | Réponses aux formulaires |
| `mft_*` | MelisFormEngine | Formulaires |
| `mfst_*` | MelisFormEngine | Statuts des réponses |

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Bootstrap du module | `vendor/melisplatform/melis-form-tool/src/Module.php` |
| Routes + alias de service | `vendor/melisplatform/melis-form-tool/config/module.config.php` |
| Menu gauche + câblage de l'onglet Autre config | `vendor/melisplatform/melis-form-tool/config/app.toolstree.php` |
| Définition du DataTable des réponses | `vendor/melisplatform/melis-form-tool/config/app.tools.php` |
| Configuration des formulaires | `vendor/melisplatform/melis-form-tool/config/app.forms.php` |
| Contrôleur des réponses | `vendor/melisplatform/melis-form-tool/src/Controller/FormToolController.php` |
| Contrôleur de configuration de validation | `vendor/melisplatform/melis-form-tool/src/Controller/ToolValidationController.php` |
| Service de validation | `vendor/melisplatform/melis-form-tool/src/Service/FormToolService.php` |
| Listener Autre config | `vendor/melisplatform/melis-form-tool/src/Listener/MelisFormToolOtherConfigListener.php` |
| Configuration de validation générée (exécution) | `vendor/melisplatform/melis-form-tool/config/formvalidation.config.php` |

Voir aussi : [MelisFormEngine](/fr/legacy/reference/modules/melis-form-engine), [MelisFormCreator](/fr/legacy/reference/modules/melis-form-creator), [MelisCore](/fr/legacy/reference/modules/melis-core)
