# MelisLogin2fa

> Noyau / orchestrateur de l'authentification à deux facteurs pour les connexions Melis — après l'identifiant et le mot de passe, il exige un code à usage unique et délègue sa livraison à des modules de canal enfichables. Package `melisplatform/melis-login-2fa`.

## Présentation

MelisLogin2fa est **l'orchestrateur 2FA** de Melis. Après qu'un utilisateur a franchi l'étape identifiant/mot de passe, il intercepte la connexion (via `melis_core_auth_pre_success`), vérifie si la 2FA est active pour la plateforme et le site/module courant, sélectionne un canal de livraison, et maintient la session en attente tant qu'un code à 6 chiffres valide n'a pas été saisi. Il n'envoie **pas** le code lui-même — la livraison est déléguée à des modules de canal enfichables (e-mail, SMS) via le contrat d'événements `canSend` / `sendUserCode`. Le canal e-mail intégré (`melis-login-2fa-email`) est une dépendance requise et reste toujours disponible comme canal de secours verrouillé.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisLogin2fa',
];
```

`melisplatform/melis-login-2fa-email` est une dépendance requise qui doit également être chargée (ce module s'installe en binôme avec le présent). PHP `^8.1|^8.3`.

## Dans le back-office React

Ce module fournit une **brique de contribution uniquement** — il n'a **ni outil dans le menu de gauche, ni route propre**. À la place, il enregistre une `OtherConfigSection` que la page native **Autre config** de MelisCore affiche après ses propres cartes. La 2FA se trouve sous **Configuration système → Autre config**, sous la forme d'une carte **« Authentification à deux facteurs (2FA) »** en bas de page. La carte n'apparaît que lorsque le module est actif (découvert via `GET /melis/react-api/react-modules`, puis le bundle est préchargé et évalué au démarrage).

![La carte « Authentification à deux facteurs (2FA) » dans l'outil React Autre config : le bloc « Melis, sites et autres modules » avec les onglets de cibles, un interrupteur Activer la 2FA et la liste d'ordre de livraison, ainsi que le bloc « Par environnement » avec un interrupteur Activer la 2FA par plateforme](/screenshots/react/melis-login-2fa/melislogin2fa-tooloverride-otherconfig-tab-2fa.png)

La carte comporte deux blocs :

| Bloc | Ce qu'il contrôle |
| --- | --- |
| **Melis, sites et autres modules** | Une colonne d'onglets à gauche listant les cibles (**Melis Platform BO**, plus chaque **site** lorsque MelisCms est actif). Pour la cible sélectionnée : un interrupteur **Activer la 2FA** et une liste **« Ordre de livraison (glisser pour réordonner) »**. **Default BO Email** est épinglé (badge Default + icône courrier, toujours actif, ne peut pas être désactivé). Les autres méthodes (ex. **Primotexto**/SMS) disposent d'un interrupteur marche/arrêt. Glisser les lignes pour définir la chaîne de priorité/secours. |
| **Par environnement** | Une colonne d'onglets listant les plateformes (**local**, **prod**…), chacune avec son propre interrupteur **Activer la 2FA** qui écrit `plf_2fa_active`. |

Chaque interrupteur, bascule et réordonnancement **est enregistré immédiatement**. La 2FA ne s'exécute que si la cible et l'environnement courant sont tous deux actifs. La section React ne porte aucune déclaration de droits avancés (capability) — y accéder nécessite déjà l'accès à l'outil Autre config.

![La liste des méthodes « Ordre de livraison (glisser pour réordonner) » : Default BO Email (badge Default + icône courrier, verrouillé et toujours actif) au-dessus de Primotexto (interrupteur marche/arrêt) ; glisser la poignée pour définir la chaîne de priorité/secours](/screenshots/react/melis-login-2fa/melislogin2fa-tooloverride-otherconfig-tab-2fa-order.png)

Le **défi de connexion lui-même n'est pas une brique React** : lorsque la 2FA s'applique, la connexion est bloquée sur une page autonome de saisie de code servie par `Login2faController` (la même page pour `/melis` et `/melis-react`). L'utilisateur voit la cible masquée (ex. `jo****@…`), saisit le code à 6 chiffres, et peut **Renvoyer** après un délai d'attente. Les codes erronés sont limités, trop d'échecs verrouillent le compte, et les codes expirent au bout de 10 minutes.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisLogin2faService` | Génère le code à 6 chiffres (`generate2faCode()`), un hash de suivi en hexadécimal de 64 caractères (`generateHash()`), et les horodatages de validité (`getValidityDate($minutes)`). |
| `MelisLogin2faConfigService` | Lit et écrit la configuration 2FA par BO / par site. Méthodes clés : `getModuleConfig()`, `getAllModuleConfigs()`, `getAllSiteConfigs()`, `getAvailable2faModules()` (déclenche `melis_login_2fa.collect_available_modules`), `mergeAvailableModulesWithConfig()`, `filterOnlyInstalledModules()`, `saveItem()`. |
| `MelisLogin2faTranslationService` | Helpers de traduction sensibles à la locale (`translateByLocale`, `boTranslate`, …) permettant d'adapter les messages de livraison à la langue de l'utilisateur. |
| `MelisLogin2faControllerPlugin` | Expose `verifyUserCode($userId, $code)` — purge les codes expirés, applique la limite de tentatives, verrouille le compte en cas d'échecs répétés, et efface l'enregistrement en cas de succès. |
| `MelisLogin2faVerifierPlugin` (alias `melisLogin2faVerifier`) | Plugin de garde — maintient la session en attente jusqu'à la soumission d'un code valide. |

## API React

Les routes sont définies dans **`config/react-api.php`** (fusionnées via `Module::getConfig()` sous la route `melis-react-api` de MelisReactApi). Contrôleur **`MelisLogin2faReactApiSettingsController`** (alias invocable `MelisLogin2faReactApiSettings`), le tout sous `/melis/react-api/login2fa-settings`, contrat `{ success, data, error }`.

| Méthode et URL | Rôle |
| --- | --- |
| `GET /melis/react-api/login2fa-settings` | Tous les réglages → `{ moduleConfigs[], sites[], siteConfigs[], platforms[] }`. Le `module_list` de chaque ligne passe par `mergeAvailableModulesWithConfig()` afin qu'une ligne jamais enregistrée liste tout de même chaque méthode installée. Lignes de site uniquement si MelisCms est actif. |
| `POST /melis/react-api/login2fa-settings/save-config` | Enregistre une ligne `melis_core_login_2fa_config` : `{ mcl2cf_id?, mcl2cf_module_name, mcl2cf_site_id, mcl2cf_activate_2fa, module_list[] }` → délègue à `MelisLogin2faConfigService::saveItem()`. |
| `POST /melis/react-api/login2fa-settings/save-platform` | Enregistre le flag d'une plateforme : `{ plf_id, plf_2fa_active }`. Écrit `MelisCoreTablePlatform` ; `422` si `plf_id` est absent. |

Cette react-api est un simple miroir JSON des onglets Autre config hérités — mêmes lignes, même `saveItem`, du JSON au lieu du phtml rendu. Les actions sont protégées par **authentification uniquement** (`denyUnlessAuthenticated()`, `401` sinon) ; le module ne fournit **aucun `config/react.capabilities.php`** et ne déclare aucun droit avancé, donc n'inventez pas de chaînes de capability pour lui.

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
| `melis_login_2fa.collect_available_modules` | noyau → canaux | Les canaux ajoutent `['module'=>'…', 'label'=>'…']` pour apparaître dans la liste des méthodes d'administration. |
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
| Bootstrap du module | `vendor/melisplatform/melis-login-2fa/src/Module.php` (`getConfig()` fusionne `react-api.php`) |
| Configuration du module (services, routes, paramètres) | `vendor/melisplatform/melis-login-2fa/config/module.config.php` |
| Routes de l'API React | `vendor/melisplatform/melis-login-2fa/config/react-api.php` |
| Liste des routes exclues du garde | `vendor/melisplatform/melis-login-2fa/config/excluded.routes.php` |
| Écouteur principal de connexion (`melis_core_auth_pre_success`) | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faMainListener.php` |
| Écouteur de sauvegarde de config | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faListener.php` |
| Écouteur de renvoi | `vendor/melisplatform/melis-login-2fa/src/Listener/MelisLogin2faRequestCodeListener.php` |
| Contrôleur de l'API React | `vendor/melisplatform/melis-login-2fa/src/Controller/ReactApi/MelisLogin2faReactApiSettingsController.php` |
| Contrôleur (routes de vérification) | `vendor/melisplatform/melis-login-2fa/src/Controller/Login2faController.php` |
| Plugin de vérification | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faControllerPlugin.php` |
| Plugin de garde (verifier) | `vendor/melisplatform/melis-login-2fa/src/Controller/Plugin/MelisLogin2faVerifierPlugin.php` |
| Service principal | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faService.php` |
| Service de configuration | `vendor/melisplatform/melis-login-2fa/src/Service/MelisLogin2faConfigService.php` |
| Table des codes | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faCodesTable.php` |
| Table de configuration | `vendor/melisplatform/melis-login-2fa/src/Model/Tables/MelisLogin2faConfigTable.php` |
| Source de la brique React | `vendor/melisplatform/melis-login-2fa/ui-react/src/` (`brick.tsx`, `Login2faOtherConfigSection.tsx`) |
| Brique compilée + manifeste | `vendor/melisplatform/melis-login-2fa/public/ui-react/brick.js` · `brick.manifest.json` |
| DB deploy | `vendor/melisplatform/melis-login-2fa/install/dbdeploy/` |

## Métadonnées

| Élément | Valeur |
| --- | --- |
| Package | `melisplatform/melis-login-2fa` |
| Type | `melisplatform-module` · catégorie `core` · `dbdeploy: true` |
| Namespace | `MelisLogin2fa\` (PSR-4 → `src/`) · nom du module `MelisLogin2fa` |
| Brique React | Contribution uniquement (id `melis-login-2fa`, `route`/`forwardKey`/`melisKey` = `null`) ; enregistre une `OtherConfigSection` |
| Dépendances | `melisplatform/melis-login-2fa-email` `^5.3` · PHP `^8.1\|^8.3` |

Voir aussi : [MelisLogin2faEmail](/fr/reference/modules/melis-login-2fa-email) · [MelisCore](/fr/reference/modules/melis-core)
