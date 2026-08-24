# MelisNewsletter

> Transforme une page CMS en newsletter email personnalisée et la distribue à des groupes d'abonnés, désormais pilotée depuis un back-office React natif. Package `melisplatform/melis-newsletter`.

## Présentation

MelisNewsletter réutilise le système de pages CMS comme gabarit de newsletter : une page marquée
comme type **NEWSLETTER** est rendue en HTML, personnalisée par destinataire via des codes BB (`[NAME]`,
`[FIRSTNAME]`, `[EMAIL]`, `[UNSUBSCRIBELINK]`), et envoyée aux abonnés et/ou groupes sélectionnés
via un transport mail configurable. Les abonnés sont organisés dans une liste par site et peuvent être
segmentés en groupes. Chaque envoi est archivé avec un instantané HTML complet et un journal par
destinataire ; un plugin front de désinscription et une intégration RGPD complète sont inclus
nativement.

En v6 l'outil est livré sous forme de **brique React native** dans le back-office `/melis-react`. La
logique métier (services, mécanisme d'envoi, RGPD, tables) est inchangée ; seule la couche
d'affichage est passée à React, servie via une couche JSON `react-api` exposée par le module.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisNewsletter',
];
```

Nécessite `melis-core` et `melis-cms` ; dépend également fonctionnellement de `melis-engine` et
`melis-front` pour le rendu des pages et le plugin de désinscription. L'outil React n'apparaît dans le
menu **que lorsque le module est activé** (découverte modulaire des briques via
`GET /melis/react-api/react-modules`). Retirer `MelisNewsletter` de `melis.module.load.php` fait
disparaître la brique.

## Back-office (React)

Menu gauche → **MelisMarketing → Newsletter** (`fa fa-newspaper-o`), route de montage
`/melis-marketing/melis-newsletter-tool-config`. Il s'ouvre comme un outil unique dont l'en-tête porte
le titre *Newsletters*, le sous-titre *« Abonnés, groupes, historique et configuration d'envoi »* et une
bascule **New / Old** (en haut à droite). *New* correspond à l'interface React (par défaut) ; *Old*
affiche l'outil hérité dans une iframe (`/melis/react-tool-page?key=melis_newsletter_tool_display`).

Contrairement à un outil en sous-onglet hôte, Newsletter affiche ses quatre écrans comme **ses propres
onglets React** :

| Onglet | Contenu |
| --- | --- |
| Abonnés | Cartes KPI (Total / Actifs / Inactifs), recherche, filtres statut + site, gestionnaire de colonnes, **Import** CSV, **Export**, **Ajouter la sélection à un/des groupe(s)**, **+ Nouvel abonné**. Table : Statut / Email / Prénom / Nom / Site / Groupes avec modification/suppression par ligne |
| Groupes | Cartes KPI, recherche, filtre statut, Export, **+ Nouveau groupe**. Table : Statut / Nom / Créé le / Membres (nombre) avec modification/suppression |
| Historique | Archive en lecture seule. Cartes KPI (Envois / Sites / Aujourd'hui), recherche, filtre site, Export. Table : Page / Site / Version / Envoyé le avec un **œil** par ligne pour visualiser le HTML archivé exact |
| Configuration | La **configuration de transport** SMTP globale unique : Hôte / Nom d'utilisateur / Mot de passe (+ confirmation). Vide = le transport Melis par défaut |

![L'onglet Abonnés dans l'outil Newsletter React](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-subscribers.png)

Ouvrir ou créer un **abonné** ou un **groupe** n'ouvre pas de nouvel onglet principal — cela ouvre
l'éditeur de fiche (SubscriberForm / GroupForm) dans un **sous-onglet hôte** natif (exploration
détaillée, clé `s-<id>` / `g-<id>`). Le formulaire Abonné contient les prénom/nom, l'email, le site, un
interrupteur Actif et les appartenances aux groupes ; le formulaire Groupe contient le nom, un
interrupteur Actif et les membres du groupe (ajout/retrait + sélecteur d'abonnés).

![L'onglet Groupes dans l'outil Newsletter React](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-groups.png)

![L'onglet Historique dans l'outil Newsletter React](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-history.png)

![L'onglet Configuration dans l'outil Newsletter React](/screenshots/react/melis-newsletter/melisnewsletter-tool-newsletter-tab-config.png)

Pour des raisons de sécurité, le mot de passe SMTP stocké n'est **jamais renvoyé au navigateur** — les
champs affichent un masque de substitution, et les laisser vides à l'enregistrement conserve le mot de
passe actuel.

### Envoyer une newsletter

L'action **Envoyer** n'est pas un onglet. C'est une modale (`NewsletterSendModal`) exposée via
`window.__melisNewsletterSendModal`, que **l'éditeur de page React affiche** pour les pages de type
**NEWSLETTER**. Définissez un sujet, choisissez des groupes et/ou des abonnés, effectuez d'abord un
**Test** vers un abonné choisi ou une adresse email libre, puis **Envoyez**. En cas de succès, un
événement `melis:newsletter-sent` est déclenché pour rafraîchir l'onglet Historique persistant.
Variables de personnalisation dans le contenu : `[NAME]`, `[FIRSTNAME]`, `[EMAIL]`,
`[UNSUBSCRIBELINK]`. Publiez la page avant l'envoi.

## API React

Les routes se trouvent dans `config/react-api.php` (fusionnées via
`MelisNewsletter\Module::getConfig()`), servies comme routes enfants du pont générique
`melis-react-api` sous `/melis/react-api/newsletter`. Contrôleur
`MelisNewsletter\Controller\MelisReactApiNewsletterController` ; contrat JSON `{ success, data, error }` ;
chaque requête porte `X-Requested-With: XMLHttpRequest` + credentials. Endpoints sélectionnés :

| Méthode & URL (relative à `/melis/react-api/newsletter`) | Rôle |
| --- | --- |
| `GET /subscribers` · `/subscribers/stats` · `/subscribers/:id` | Liste keyset (`search`, `active`, `site`, `group`, `sort`, `dir`, `after`), KPI, une fiche |
| `POST /subscribers/save` · `/subscribers/import` | Créer/modifier ; import CSV en masse → `{imported,skipped,errors}` |
| `DELETE /subscribers/delete/:id` | Supprimer |
| `GET /groups` · `/groups/stats` · `/groups/:id` · `/groups/:id/members` | Liste des groupes, KPI, fiche, membres |
| `POST /groups/save` · `/groups/:id/members/add` · `/groups/members/bulk-add` | Enregistrer ; ajouter un membre ; affecter en masse `subscriberIds[]` à `groupIds[]` |
| `DELETE /groups/delete/:id` · `/groups/members/remove/:mid` | Supprimer le groupe ; retirer l'appartenance (`mid` = `nlgu_id`) |
| `GET /history` · `/history/stats` · `/history/:id` | Liste de l'archive d'envoi, KPI, HTML archivé d'un envoi |
| `GET /config` · `POST /config/save` | Config SMTP (mot de passe non renvoyé ; uniquement `hasPassword`) / enregistrer |
| `GET /send-options` · `POST /send` · `POST /test` | Options de la modale d'envoi ; envoyer ; envoi de test |

Le contrôleur React **réutilise le service Laminas du module** (`MelisNewsletterService`) pour le
travail de fond — l'envoi/test passent par `sendNewsletter()` / `testNewsletter()` /
`testNewsletterCustomMail()`, et les validations reprennent `saveSubscriber` / `importFileValidator` /
`saveConfig` — de sorte que le chemin React reproduit exactement les règles métier héritées.

## Capabilities (droits avancés)

Déclarées dans `config/react.capabilities.php` sous le nœud porteur de droits
**`melis_newsletter_tools_section`** (et non la clé de manifeste/zone `melis_newsletter_tool_display`).
Un arbre par onglet plus une action transversale `send`, aplatis en chaînes pointées :

```
melis_newsletter_tools_section
├─ action: send                              (Send / Test — la modale de l'éditeur de page)
├─ tab subscribers: list · create · edit · delete · export
├─ tab groups:      list · create · edit · delete · export
├─ tab history:     list                     (lecture seule)
└─ tab config:      edit                     (transport SMTP)
```

React les lit via `useCaps('melis_newsletter_tools_section').can('…')` et conditionne ses boutons
d'action ; côté serveur, chaque action mutante est protégée (`denyUnlessAccess()` puis
`denyUnlessCan()`). `react.capabilities.php` fusionne également une action `newsletter` sous le nœud
partagé `meliscms_page` afin que le bouton Envoyer de l'éditeur de page soit conditionnable dans
Utilisateurs → Droits.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisNewsletterService` | Service central pour les abonnés, groupes, envoi/test, archive et configuration. Déclenche des événements `*_start` / `*_end`. |
| `MelisNewsletterGdprAutoDeleteService` | Implémente `MelisCoreGdprAutoDeleteInterface` ; pilote le flux RGPD planifié d'avertissement/suppression pour les abonnés inactifs. |

Alias des table gateways : `MelisNewsletterSubscribersTable`, `MelisNewsletterGroupsTable`,
`MelisNewsletterGroupsPeopleTable`, `MelisNewsletterArchiveTable`,
`MelisNewsletterRecipientsTable`, `MelisNewsletterConfigTable`.

## Mécanisme d'envoi

`MelisNewsletterService::sendNewsletter($pageId, $subscribers, $groups, $mailSubject)` :

1. **Résolution des destinataires** — abonnés explicites + membres de groupes via
   `getSubscribersInGroup()`, filtrés aux actifs uniquement, dédupliqués.
2. **Rendu du contenu** — page CMS récupérée en HTML ; les `href`/`src` relatifs sont réécrits en URL
   absolues.
3. **Personnalisation** — codes BB substitués par destinataire ; `[UNSUBSCRIBELINK]` porte le jeton
   haché.
4. **Envoi** — via le transport SMTP configuré ou le transport par défaut de la plateforme.
5. **Archivage** — une ligne `nlan_*` par envoi (site, page, version, HTML complet, date d'envoi) et une
   ligne `nlus_*` par destinataire.

**Envoi de test** (`testNewsletter()` / `testNewsletterCustomMail()`) livre à un abonné ou à un email
quelconque sans archivage, et est requis avant qu'un envoi réel ne soit déverrouillé.

## Front office

| Plugin | Clé de config | Description |
| --- | --- | --- |
| `MelisNewsletterUnsubscribePlugin` | `melisnewsletter` / `MelisNewsletterUnsubscribePlugin` | À déposer sur une page `unsubscribe`. Lit le jeton `?s={hashed_id}` intégré dans `[UNSUBSCRIBELINK]`, appelle `deactivateSubscriberById()`, et affiche un message de succès ou d'échec. Expose un paramètre `unsubscribe_data_salt` utilisé dans le hachage du jeton. |

Vues : `plugins/unsubscribe.phtml` + `unsubscribe-modal-form.phtml`.

## Intégration RGPD

Se connecte au framework RGPD de MelisCore pour les flux à la demande et planifiés :

- **À la demande :** `MelisNewsletterGdprUserInfoListener`, `…UserExtractListener`,
  `…UserDeleteListener` — recherche, exporte et supprime les données d'abonné d'une personne sur
  demande. Colonnes : `nlu_firstname`, `nlu_name`, `nlu_email`, `nlu_date_creation` (déclarées dans
  `config/app.gdpr.php`).
- **Suppression automatique planifiée :** `MelisNewsletterGdprAutoDeleteService` avec neuf écouteurs
  couvrant l'enregistrement du module, la déclaration des tags RGPD, la constitution des listes
  d'avertissement, les emails d'avertissement et la suppression finale des abonnés inactifs sans
  réponse.

## Tables de base de données

| Table (alias → préfixe colonnes) | Contenu |
| --- | --- |
| `MelisNewsletterSubscribersTable` (`nlu_*`) | Lignes d'abonnés par site : email, prénom/nom, statut, date de création |
| `MelisNewsletterGroupsTable` (`nlg_*`) | Définitions des groupes : nom, statut, date de création |
| `MelisNewsletterGroupsPeopleTable` (`nlgu_*`) | Lien d'appartenance abonné ↔ groupe |
| `MelisNewsletterArchiveTable` (`nlan_*`) | Archive par envoi : site, page, version, corps HTML complet, date d'envoi |
| `MelisNewsletterRecipientsTable` (`nlus_*`) | Journal d'envoi par destinataire : instantané nom/prénom/email, FK archive |
| `MelisNewsletterConfigTable` (`nlc_*`) | Configuration du transport SMTP par site : hôte, nom d'utilisateur, mot de passe |

## Exemple

```php
$nl = $serviceManager->get('MelisNewsletterService');

// Subscriber / group management (same service the react-api reuses)
$nl->saveSubscriber($data, $id);           // $id null → create
$nl->deactivateSubscriberById($id);
$nl->saveGroup($data, $id);
$nl->getSubscribersInGroup($grpId);

// Send flow
$nl->testNewsletter($pageId, $subId, $subject);
$nl->sendNewsletter($pageId, $subscribers, $groups, $subject);

// History & config
$nl->getNewsletterRecipients($archiveId);
$nl->saveNewsletterConfig($cfg);
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Routes de l'API React + contrôleur invokable | `vendor/melisplatform/melis-newsletter/config/react-api.php` |
| Capabilities React (clé `melis_newsletter_tools_section`) | `vendor/melisplatform/melis-newsletter/config/react.capabilities.php` |
| Contrôleur de l'API React (réutilise `MelisNewsletterService`) | `vendor/melisplatform/melis-newsletter/src/Controller/MelisReactApiNewsletterController.php` |
| Brique React (build Vite) + manifeste | `vendor/melisplatform/melis-newsletter/public/ui-react/brick.js` · `brick.manifest.json` |
| Config du module (services, table gateways, contrôleurs, plugin) | `vendor/melisplatform/melis-newsletter/config/module.config.php` |
| Service principal | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterService.php` |
| Service RGPD de suppression automatique | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterGdprAutoDeleteService.php` |
| Plugin front de désinscription | `vendor/melisplatform/melis-newsletter/src/Controller/Plugin/MelisNewsletterUnsubscribePlugin.php` |
| Table gateways | `vendor/melisplatform/melis-newsletter/src/Model/Tables/` |
| Installation BDD + migrations | `vendor/melisplatform/melis-newsletter/install/dbdeploy/` |

Voir aussi : [melis-core](/fr/legacy/reference/modules/melis-core), [melis-cms](/fr/legacy/reference/modules/melis-cms),
[melis-front](/fr/legacy/reference/modules/melis-front), [melis-engine](/fr/legacy/reference/modules/melis-engine)
