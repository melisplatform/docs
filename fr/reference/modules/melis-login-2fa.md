# MelisLogin2fa

> Noyau d'authentification à deux facteurs pour les connexions Melis — orchestre le flux 2FA et bloque l'accès jusqu'à la vérification d'un code à usage unique. Package `melisplatform/melis-login-2fa`.

## Présentation

MelisLogin2fa est **l'orchestrateur 2FA** de Melis. Après qu'un utilisateur a saisi son identifiant et son mot de passe, il intercepte la connexion (via `melis_core_auth_pre_success`), vérifie si la 2FA est active pour la plateforme et le site/module courant, sélectionne un canal de livraison, et maintient la session en attente jusqu'à la saisie d'un code à 6 chiffres valide. Il n'envoie **pas** le code lui-même — la livraison est déléguée à des modules de canal enfichables (e-mail, SMS) via le contrat d'événements `canSend` / `sendUserCode`. Le canal e-mail intégré (`melis-login-2fa-email`) est une dépendance requise et constitue toujours le canal de secours.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisLogin2fa',
];
```

`melisplatform/melis-login-2fa-email` est une dépendance requise qui doit également être chargée (ce module s'installe en binôme avec le présent). PHP `^8.1|^8.3`.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisLogin2faService` | Génère le code à 6 chiffres (`generate2faCode()`), un hash de suivi en hexadécimal de 64 caractères (`generateHash()`), et les horodatages de validité (`getValidityDate($minutes)`). |
| `MelisLogin2faConfigService` | Lit et écrit la configuration 2FA par BO / par site. Méthodes clés : `getModuleConfig()`, `getAllModuleConfigs()`, `getAllSiteConfigs()`, `getAvailable2faModules()` (déclenche `melis_login_2fa.collect_available_modules`), `mergeAvailableModulesWithConfig()`, `filterOnlyInstalledModules()`, `saveItem()`. |
| `MelisLogin2faTranslationService` | Helpers de traduction sensibles à la locale (`translateByLocale`, `boTranslate`, …) permettant d'adapter les messages de livraison à la langue de l'utilisateur. |
| `MelisLogin2faControllerPlugin` | Expose `verifyUserCode($userId, $code)` — purge les codes expirés, applique la limite de tentatives, verrouille le compte en cas d'échecs répétés, et efface l'enregistrement en cas de succès. |
| `MelisLogin2faVerifierPlugin` (alias `melisLogin2faVerifier`) | Plugin de garde — maintient la session en attente jusqu'à la soumission d'un code valide. |

## Back-office

La 2FA se configure sous **Configuration système → Autre Config → onglet 2fa** (icône cadenas). L'onglet comporte deux sections :

| Section | Ce qu'elle contrôle |
| --- | --- |
| **2fa pour Melis, les Sites et les autres Modules** | Bascule par BO / par site (`mcl2cf_activate_2fa`) et liste ordonnée des canaux de livraison (`mcl2cf_module_list`). Glisser pour réordonner ; un ✓ indique une méthode active, ✗ indique qu'elle est désactivée. L'ordre définit la priorité et l'ordre de secours. |
| **Activation de la 2fa par environnement** | Bascule par plateforme (local, preprod, prod…) qui écrit `plf_2fa_active`. La 2FA ne s'exécute que si le flag d'environnement est actif. |

La sauvegarde du formulaire passe par `MelisLogin2faListener` sur `meliscore_save_other_config` → `MelisLogin2faConfigService::saveItem()`.

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_core_login_2fa_codes` | Codes à usage unique : identifiant utilisateur, e-mail, type (`melis-backoffice` ou identifiant de site), le code à 6 chiffres, hash de session, date d'expiration, et compteur de tentatives échouées avec horodatages (`mcl2c_try`, `mcl2c_try1/2/3_date`). |
| `melis_core_login_2fa_config` | Lignes de configuration par BO / par site : `mcl2cf_module_name` ou `mcl2cf_site_id`, `mcl2cf_activate_2fa`, `mcl2cf_module_list` (liste de canaux ordonnée en JSON). |

`melis_core_platform` reçoit une colonne `plf_2fa_active` (ajoutée par le dbdeploy du module).

## Paramètres de configuration

Déclarés sous la clé de configuration `melis_login_2fa` :

| Clé | Valeur par défaut | Description |
| --- | --- | --- |
| `max_tries` | `3` | Nombre de tentatives de code échouées avant le verrouillage du compte (`usr_status = 0`). |
| `code_validity_minutes` | `10` | Durée en minutes avant l'expiration d'un code. |
| `request_code_cooldown_seconds` | `60` | Nombre minimum de secondes entre deux demandes de renvoi. |

## Le contrat d'événements des canaux

Le noyau n'appelle jamais un canal directement — il déclenche des événements auxquels les canaux répondent. Pour ajouter une méthode de livraison, implémenter des écouteurs pour :

| Événement | Sens | Rôle |
| --- | --- | --- |
| `melis_login_2fa.collect_available_modules` | noyau → canaux | Les canaux ajoutent `['module'=>'…', 'label'=>'…']` pour apparaître dans la liste d'administration. |
| `canSend` | noyau → canaux | Chaque canal retourne `['<module-name>' => bool]` indiquant s'il peut atteindre l'utilisateur. |
| `sendUserCode` | noyau → canaux | Le premier canal dans `orderedModules` capable d'envoyer crée/réutilise le code et le livre, puis positionne `sent=true` et appelle `stopPropagation`. |

## Exemple

```php
// Construire un canal de livraison personnalisé — attacher ces deux écouteurs dans votre module :

'canSend' => fn($e) => ['my-channel' => $canIReach($e->getParam('user'))],

'sendUserCode' => function ($e) {
    if (!empty($e->getParam('sent'))) return;                              // déjà envoyé
    if (($e->getParam('orderedModules')[0] ?? null) !== 'my-channel') return; // pas mon tour

    // Créer/réutiliser le code via le service du noyau + la table :
    // MelisLogin2faService::generate2faCode() + MelisLogin2faCodesTable

    // Livrer via votre transport, puis signaler la complétion :
    $e->setParam('sent', true);
    $e->stopPropagation(true);
    return ['sent' => true, 'hash' => $hash, 'message' => 'sent to ' . $maskedTarget];
},

// Répondre également à collect_available_modules pour que l'administrateur puisse activer/ordonner votre canal.
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Bootstrap du module | `vendor/melisplatform/melis-login-2fa/src/Module.php` |
| Configuration du module (services, routes, paramètres) | `vendor/melisplatform/melis-login-2fa/config/module.config.php` |
| Liste des routes exclues du garde | `vendor/melisplatform/melis-login-2fa/config/excluded.routes.php` |
| Écouteur principal de connexion (`melis_core_auth_pre_success`) | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faMainListener.php` |
| Écouteur de sauvegarde de config | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faListener.php` |
| Écouteur de renvoi | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faRequestCodeListener.php` |
| Contrôleur (routes de vérification) | `vendor/melisplatform/melis-login-2fa/src/Controller/Login2faController.php` |
| Plugin de vérification | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faControllerPlugin.php` |
| Plugin de garde (verifier) | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faVerifierPlugin.php` |
| Service principal | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faService.php` |
| Service de configuration | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faConfigService.php` |
| Table des codes | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faCodesTable.php` |
| Table de configuration | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faConfigTable.php` |
| DB deploy | `vendor/melisplatform/melis-login-2fa/install/dbdeploy/` |

## Métadonnées

| Élément | Valeur |
| --- | --- |
| Package | `melisplatform/melis-login-2fa` |
| Type | `melisplatform-module` · catégorie `core` · `dbdeploy: true` |
| Namespace | `MelisLogin2fa\` (PSR-4 → `src/`) · nom du module `MelisLogin2fa` |
| Dépendances | `melisplatform/melis-login-2fa-email` `^5.3` · PHP `^8.1\|^8.3` |

Voir aussi : [MelisLogin2faEmail](/reference/modules/melis-login-2fa-email) · [MelisCore](/reference/modules/melis-core)
