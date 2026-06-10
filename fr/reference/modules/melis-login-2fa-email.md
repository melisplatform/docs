# MelisLogin2faEmail

> Canal de livraison par email pour le système 2FA de Melis — envoie le code de connexion à usage unique par email. Package `melisplatform/melis-login-2fa-email`.

## Présentation

MelisLogin2faEmail est le canal email **par défaut, inclus** pour [MelisLogin2fa](/fr/reference/modules/melis-login-2fa). Il gère les événements `canSend` et `sendUserCode` déclenchés par le cœur 2FA, déterminant si un utilisateur peut être joint par email, puis envoie le code à 6 chiffres. Le cœur requiert ce module et ce module requiert le cœur — ils s'installent donc en binôme, et l'email constitue toujours le canal de repli disponible.

## Activation

Ce module est requis par `melis-login-2fa` et s'installe automatiquement avec lui. Aucune entrée supplémentaire dans le fichier de chargement des modules n'est nécessaire au-delà du chargement de `MelisLogin2fa`.

Pour activer le canal email, configurez-le dans le BO :

**Configuration système → Autre configuration → 2FA → Sites & modules** — sélectionnez **email** comme canal de livraison.

L'email du BO de la plateforme doit également être actif (configuré via les paramètres email de MelisCore).

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `Melis2faBOEmailService` | Étend `MelisCoreBOEmailService` ; surcharge `sendBoEmailByCode()` / `sendEmail()` pour définir le bon expéditeur d'enveloppe (`email_from` au lieu de l'adresse du destinataire). Charge le template email par codename, remplace les espaces réservés `[TAG]`, l'encapsule dans le layout et envoie via `Laminas\Mail`. |
| `MelisLogin2faEmailControllerPlugin` | Plugin de contrôleur — point d'entrée appelé par les deux listeners ; expose `canSend($userData)` et `sendUserCode($user, $code)`. |

## Listeners

| Listener | Événement | Comportement |
| --- | --- | --- |
| `MelisCoreCanSendListener` | `canSend` | Retourne `['melis-login-2fa-email' => <bool>]` — `true` lorsque l'utilisateur possède un `usr_email` utilisable. |
| `MelisCoreSendUserCodeListener` | `sendUserCode` | N'agit que si l'envoi n'a pas encore eu lieu **et** que ce canal est premier dans `orderedModules`. Réutilise ou crée une ligne `melis_core_login_2fa_codes`, résout la locale, envoie le code, puis définit `sent=true`, appelle `stopPropagation` et retourne `['sent'=>true, 'hash'=>…, 'message'=>'<sent-to> '.maskEmail($email)]`. |

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

Voir aussi : [MelisLogin2fa](/fr/reference/modules/melis-login-2fa) · [MelisCore](/fr/reference/modules/melis-core)
