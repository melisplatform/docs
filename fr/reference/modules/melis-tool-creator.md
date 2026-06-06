# MelisToolCreator

> Générateur graphique qui crée de nouveaux **outils** de back-office sous forme de modules Laminas autonomes.
> Paquet : `melisplatform/melis-tool-creator`.

## Objet

MelisToolCreator est l'assistant intégré au back-office derrière **Créer un outil**. Il vous guide à
travers un formulaire en plusieurs étapes (nom du module, textes, table de base de données, colonnes,
formulaire d'ajout/modification, traductions, résumé, finalisation), puis **écrit sur disque un module
Laminas complet et fonctionnel** sous `module/<NomDuModule>/` — contrôleur, service, tables de modèle,
listeners, configuration, fichiers de langue, vues et JS. Il ne stocke pas les outils en base de
données ; le code généré est constitué de fichiers vous appartenant, modifiables ensuite. Voir le
guide complet dans [Créer un outil](/fr/guide/create-a-tool).

## Activation

Module Laminas standard. Ajoutez-le à `config/melis.module.load.php` :

```php
return [
    // …
    'MelisToolCreator',
];
```

Dépendances (d'après `composer.json`) : `melisplatform/melis-core` et `melisplatform/melis-cms`
(PHP `^8.1|^8.3`). Le module fusionne `module.config.php`, `app.interface.php`, `app.toolstree.php`
et `app.tools.php` dans `src/Module.php::getConfig()`.

## Services principaux

Déclarés comme alias `service_manager` dans `config/module.config.php` :

| Alias de service | Rôle |
| --- | --- |
| `MelisToolCreatorService` | Pilote la génération. `createTool()` émet `melis_tool_creator_generate_tool_start`, construit l'arborescence et les fichiers du module à partir des squelettes de `template/`, puis émet `melis_tool_creator_generate_tool_end`. Utilitaires : `moduleName()`, `getTableColumns($table)`, `getTablePK($table)`, `describeTable($table)`, `hasPrimaryKey()`, `isFrameworkTool()`, `generateModuleNameCase($str)`, `cleanString($str)`. |
| `MelisToolCreatorCacheSystemService` | Utilitaire de cache fichier (`getCacheByKey`, `setCacheByKey`, `deleteCacheByPrefix`, `getTtlByKey`) pour l'assistant. |

`MelisToolCreatorService` étend `MelisCore\Service\MelisGeneralService` et lit le schéma de base de
données réel (`Metadata` de Laminas) afin qu'un outil **db** généré se calque sur une table existante.

## Types d'outils

Le formulaire de l'étape 1 (`tcf-tool-type`) propose trois types d'outils, plus une variante
« framework » facultative :

| Type | Ce qu'il génère |
| --- | --- |
| `db` | Un outil CRUD complet sur une table existante (liste + formulaire d'ajout/modification, avec tables de langue optionnelles). |
| `iframe` | Un outil qui intègre une URL externe (`tcf-tool-iframe-url`) dans une iframe. |
| `blank` | Un squelette d'outil vide à compléter vous-même. |

Les outils framework (`config/frameworks.php` : `laravel`, `symfony`, `lumen`, `silex`) génèrent un
contrôleur de type micro-service au lieu du contrôleur ZF/Laminas standard.

## Back-office

L'assistant est accessible depuis le menu de gauche sous **Outils → Création d'outils → Designs**,
déclaré dans `config/app.toolstree.php`. Ses melisKeys : `melistoolcreator_tool` (et ses enfants
`melistoolcreator_header`, `melistoolcreator_content`, `melistoolcreator_steps`).

| Élément | Valeur |
| --- | --- |
| Contrôleur | `MelisToolCreator\Controller\ToolCreator` (`ToolCreatorController`) |
| Action d'entrée | `render-tool-creator` (`renderToolCreatorAction`) |
| Action des étapes | `render-tool-creator-steps` (`renderToolCreatorStepsAction`) |
| Valider / naviguer | route `tool-creator-validate-cur-step` |
| Charger les colonnes | route `tool-creator-get-tbl-cols` → `renderStep3TableColumns` |

Les formulaires d'étape se trouvent dans `config/app.tools.php` (`tool-creator-step-1`,
`tool-creator-step-2`, …).

## Tables de base de données

Aucune. MelisToolCreator ne déclare aucune table `melis_*` propre (pas de SQL d'installation ni de
delta dbdeploy). Les chaînes `melis_tool_creator_generate_tool_start` / `_end` du service sont des
**noms d'événements**, pas des tables. Pour les outils **db**, il introspecte la table existante que
vous indiquez à l'assistant.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Amorçage / fusion de config | `vendor/melisplatform/melis-tool-creator/src/Module.php` |
| Contrôleur de l'assistant | `vendor/melisplatform/melis-tool-creator/src/Controller/ToolCreatorController.php` |
| Service de génération | `vendor/melisplatform/melis-tool-creator/src/Service/MelisToolCreatorService.php` |
| Service de cache | `vendor/melisplatform/melis-tool-creator/src/Service/MelisToolCreatorCacheSystemService.php` |
| Entrée de menu back-office | `vendor/melisplatform/melis-tool-creator/config/app.toolstree.php` |
| Formulaires d'étape | `vendor/melisplatform/melis-tool-creator/config/app.tools.php` |
| Liste / formulaire framework | `vendor/melisplatform/melis-tool-creator/config/frameworks.php` |
| Squelettes de code généré | `vendor/melisplatform/melis-tool-creator/template/` |
| Vues de l'assistant (étapes 1–8) | `vendor/melisplatform/melis-tool-creator/view/melis-tool-creator/tool-creator/` |

## Voir aussi

- [Créer un outil](/fr/guide/create-a-tool) — le guide de bout en bout.
- [Référence des modules](/fr/reference/modules) — tous les modules de la plateforme.
- [Plugins](/fr/guide/plugins) — les générateurs jumeaux pour plugins de templating & de tableau de bord.
