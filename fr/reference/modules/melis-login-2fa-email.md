# MelisLogin2faEmail

> Canal de livraison par email pour le système 2FA de Melis — envoie le code de connexion à usage unique par email. Package `melisplatform/melis-login-2fa-email`.

## Présentation

MelisLogin2faEmail est le canal email **par défaut, inclus** pour [MelisLogin2fa](/fr/reference/modules/melis-login-2fa). Il gère les événements `canSend` et `sendUserCode` déclenchés par le cœur 2FA, déterminant si un utilisateur peut être joint par email, puis envoie le code à 6 chiffres. Le cœur requiert ce module et ce module requiert le cœur — ils s'installent donc en binôme, et l'email constitue toujours le canal de repli disponible.

## Présence dans le back-office React

Ce module est un **plugin de méthode 2FA**, pas un outil : il n'a **aucune brique React, aucune route `react-api`, aucune capacité ni interface propre**. Il n'apparaît jamais comme entrée dans la barre latérale ou le menu `/melis-react`. Le canal email se manifeste uniquement *à l'intérieur* d'écrans appartenant à MelisLogin2fa / MelisCore :

- **Comme méthode 2FA sélectionnable et ordonnable** dans la **section des paramètres 2FA** que le cœur ajoute à l'outil *Autre configuration*. Les administrateurs l'y activent et en définissent l'ordre ; l'ordre détermine quel canal actif est essayé en premier.
- **Comme étape email + saisie du code à la connexion** — lorsque la 2FA est active et que l'email est le canal choisi, le flux de connexion envoie le code à 6 chiffres par email et affiche l'écran de saisie du code. La confirmation affiche une adresse **masquée** (par exemple `jo****@…`).

Il n'y a **aucune capture d'écran React** pour ce module, car il n'a pas d'écran propre.

## Activation

Ce module est requis par `melis-login-2fa` et s'installe automatiquement avec lui. Aucune entrée supplémentaire dans le fichier de chargement des modules n'est nécessaire au-delà du chargement de `MelisLogin2fa`.

Pour activer le canal email, ouvrez les paramètres 2FA affichés dans le back-office React :

**Configuration système → Autre configuration → 2FA** — activez **Email** comme méthode de livraison et définissez son ordre parmi les canaux actifs.

L'email du BO de la plateforme doit également être actif (configuré via les paramètres email de MelisCore).

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `Melis2faBOEmailService` | Étend `MelisCoreBOEmailService` ; surcharge `sendBoEmailByCode()` / `sendEmail()` pour définir le bon expéditeur d'enveloppe (`email_from` au lieu de l'adresse du destinataire). Charge le template email par codename, remplace les espaces réservés `[TAG]`, l'encapsule dans le layout et envoie via `Laminas\Mail`. |
| `MelisLogin2faEmailControllerPlugin` | Plugin de contrôleur — point d'entrée appelé par les deux listeners ; expose `canSend($userData)` et `sendUserCode($user, $code)`. |

## Listeners

| Listener | Événement | Comportement |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | Retourne `['melis-login-2fa-email' => <bool>]` — `true` lorsque l'utilisateur possède un `usr_email` utilisable (non vide et validé par `Laminas\Validator\EmailAddress`). |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | N'agit que si l'envoi n'a pas encore eu lieu **et** que ce canal est premier dans `orderedModules` (`orderedModules[0] === 'melis-login-2fa-email'`). Réutilise ou crée une ligne `melis_core_login_2fa_codes`, résout la locale, envoie le code, puis définit `sent=true`, appelle `stopPropagation` et retourne `['sent'=>true, 'hash'=>…, 'message'=>'<sent-to> '.maskEmail($email)]`. |

L'identifiant utilisé tout au long de la sélection et de l'ordonnancement des méthodes est la chaîne `melis-login-2fa-email`.

## Locale et lien de récupération

`sendUserCode()` résout la **locale** du destinataire (le `usr_lang_id` propre au destinataire en contexte BO, avec repli sur la locale de session ; la langue de la page principale du site en contexte FO) afin que le sujet et le corps de l'email soient dans la langue du destinataire.

Le lien *mot de passe oublié* de l'email s'adapte au back-office d'où vient l'utilisateur : un utilisateur BO qui a demandé son code **depuis le shell React** obtient un lien pointant vers **`/melis-react/forgot-password`** au lieu de l'ancien `/melis/lost-password`. Ce comportement est conditionné par `($user['ui_origin'] ?? null) === 'react'`, où `ui_origin` est dérivé (basé sur le Referer, avec `'legacy'` par défaut) par le `Login2faController::request2faCodeAction()` du cœur. Rien d'autre dans le flux n'est spécifique à React.

## Configuration

Déclarée sous la clé de configuration `melis_login_2fa_email` :

| Clé | Défaut | Description |
| --- | --- | --- |
| `email_from` | `noreply@melistechnology.com` | Adresse expéditeur de l'enveloppe |
| `from_name` | `Melis Platform` | Nom d'affichage de l'expéditeur |
| `reply_to` | — | Adresse de réponse |

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_core_login_2fa_codes` | Codes à usage unique (partagés avec le cœur 2FA) ; les lignes sont réutilisées tant qu'elles sont valides ou créées à nouveau par `MelisLogin2faService::generate2faCode()`. |

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Bootstrap du module | `vendor/melisplatform/melis-login-2fa-email/src/Module.php` |
| Configuration du module | `vendor/melisplatform/melis-login-2fa-email/config/module.config.php` |
| Listener `canSend` | `vendor/melisplatform/melis-login-2fa-email/src/Listener/MelisCoreCanSendListener.php` |
| Listener `sendUserCode` | `vendor/melisplatform/melis-login-2fa-email/src/Listener/MelisCoreSendUserCodeListener.php` |
| Plugin de contrôleur | `vendor/melisplatform/melis-login-2fa-email/src/Controller/Plugin/MelisLogin2faEmailControllerPlugin.php` |
| Service email | `vendor/melisplatform/melis-login-2fa-email/src/Service/Melis2faBOEmailService.php` |

## Métadonnées

| Élément | Valeur |
| --- | --- |
| Package | `melisplatform/melis-login-2fa-email` |
| Type | `melisplatform-module` · catégorie `core` · `dbdeploy: true` |
| Namespace | `MelisLogin2faEmail\` (PSR-4 → `src/`) |
| Requiert | `melisplatform/melis-login-2fa` `^5.3` · PHP `^8.1\|^8.3` |
| Présence React | Aucune — pas de brique, pas de `react-api`, pas de capacités, pas d'interface |

Voir aussi : [MelisLogin2fa](/fr/reference/modules/melis-login-2fa) · [MelisCore](/fr/reference/modules/melis-core)
