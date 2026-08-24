# MelisLogin2faPrimotexto

> Canal d'envoi de SMS pour le système 2FA de Melis via la passerelle Primotexto. Package `melisplatform/melis-login-2fa-primotexto`.

## Présentation

MelisLogin2faPrimotexto est un canal 2FA optionnel qui envoie le code de connexion à usage unique par SMS via l'API **Primotexto**. Il s'intègre au contrat d'événement du module central `MelisLogin2fa` (`canSend` / `sendUserCode`). Lorsqu'il est placé en tête des canaux actifs et que l'utilisateur possède un numéro de téléphone valide, le code est transmis par SMS ; si aucun numéro valide n'est trouvé mais qu'un canal email est également actif, le système bascule sur l'email et en informe l'utilisateur.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisLogin2faPrimotexto',
];
```

Nécessite `melisplatform/melis-login-2fa` (`^5.3`) et PHP `^8.1|^8.3`. Le module central `MelisLogin2fa` doit être chargé en premier.

Une fois chargé, activez **SMS (Primotexto)** dans **Configuration système → Autre configuration → 2FA → Sites & modules** et placez-le en première position pour en faire le canal principal. Renseignez les identifiants API Primotexto sous la clé de configuration `melis_login_2fa_primotexto` (voir [Configuration](#configuration)).

## Configuration

```php
// config/autoload/primotexto.local.php  (do NOT commit real keys)
return [
    'melis_login_2fa_primotexto' => [
        'url'     => 'https://api.primotexto.com/v2/notification/messages/send',
        'api_key' => 'YOUR_API_KEY',   // override per environment
        'sender'  => 'Melis',
    ],
];
```

> **Avertissement.** Le fichier `config/module.config.php` livré dans le dépôt contient un `api_key` factice en clair. Remplacez-le toujours dans un fichier de configuration local ou propre à l'environnement, et révoquez toute clé réelle qui aurait pu être commitée.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `SmsService` | Appelle l'API HTTP Primotexto pour envoyer l'OTP par SMS ; normalise les numéros français `0…` en `+33…` ; journalise les échecs curl/HTTP dans `CmaErrorLogsTable` |
| `MelisLogin2faPrimotextoControllerPlugin` | Plugin de contrôleur exposant `canSend($userData)` et `sendUserCode($user, $code)` ; pilote `SmsService` |

## Écouteurs d'événements

| Écouteur | Événement | Comportement |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | Retourne `['melis-login-2fa-primotexto' => bool]` ; si l'envoi est impossible mais qu'un canal email est actif et ordonné après, stocke un `twofa_fallback_message` dans la session `melis_login_2fa` |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | N'agit que si le code n'a pas encore été envoyé et que ce canal est `orderedModules[0]` ; réutilise ou crée la ligne `melis_core_login_2fa_codes`, envoie via `SmsService`, positionne `sent=true`, appelle `stopPropagation` |

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_core_user` | Reçoit une colonne nullable `usr_phone` (ajoutée par le `dbdeploy` de ce module) — numéro de téléphone auquel les codes OTP sont envoyés |
| `melis_core_login_2fa_codes` | Codes OTP (appartenant au module central `MelisLogin2fa` ; ce canal réutilise ou crée des lignes via `MelisLogin2faService` + `MelisLogin2faCodesTable`) |

## Exemple

```php
// Primotexto API call assembled by SmsService::sendSms()
$url = $config['url'] . '?' . http_build_query([
    'apiKey'     => $config['api_key'],
    'identifier' => $number,           // normalised to +33… for French numbers
    'sender'     => trim($config['sender']),
    'message'    => $message,
]);
// Sent via curl (GET). HTTP >= 400 or curl failure → logged + returns false.
```

## Points d'attention

- **Dépendance à `CmaErrorLogsTable`.** `SmsService` journalise les échecs dans `CmaErrorLogsTable`, issue d'un module client CMA. Si cette table ou ce service n'est pas enregistré dans une installation générique, le chemin de journalisation des erreurs échouera. Rendez cette dépendance optionnelle pour les déploiements hors contexte client d'origine.
- **Basculement vers l'email.** Si Primotexto est en premier mais que l'utilisateur n'a pas de numéro de téléphone valide, et qu'un canal email est actif et ordonné après, le code est transmis par email accompagné d'un message explicatif.
- **Numéro masqué dans l'interface.** L'écran de saisie du code affiche uniquement une version masquée du numéro de téléphone (ex. `+3…**…07`).

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Bootstrap du module | `vendor/melisplatform/melis-login-2fa-primotexto/src/Module.php` |
| Écouteur `canSend` | `vendor/melisplatform/melis-login-2fa-primotexto/src/Listener/MelisCoreCanSendListener.php` |
| Écouteur `sendUserCode` | `vendor/melisplatform/melis-login-2fa-primotexto/src/Listener/MelisCoreSendUserCodeListener.php` |
| Service API SMS | `vendor/melisplatform/melis-login-2fa-primotexto/src/Service/SmsService.php` |
| Plugin de contrôleur | `vendor/melisplatform/melis-login-2fa-primotexto/src/Controller/Plugin/MelisLogin2faPrimotextoControllerPlugin.php` |
| Configuration du module | `vendor/melisplatform/melis-login-2fa-primotexto/config/module.config.php` |
| Migration DB | `vendor/melisplatform/melis-login-2fa-primotexto/install/dbdeploy/` |

Voir aussi : [MelisLogin2fa](/fr/legacy/reference/modules/melis-login-2fa) · [MelisLogin2faEmail](/fr/legacy/reference/modules/melis-login-2fa-email) · [MelisCore](/fr/legacy/reference/modules/melis-core)
