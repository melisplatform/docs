# MelisNewsletter

> Transforme une page CMS en newsletter email personnalisée et la distribue à des groupes d'abonnés.
> Package `melisplatform/melis-newsletter`.

## Présentation

MelisNewsletter réutilise le système de pages CMS comme gabarit de newsletter : une page marquée
comme type **NEWSLETTER** est rendue en HTML, personnalisée par destinataire via des codes BB
(`[NAME]`, `[FIRSTNAME]`, `[EMAIL]`, `[UNSUBSCRIBELINK]`), et envoyée aux abonnés et/ou groupes
sélectionnés via un transport mail configurable. Les abonnés sont organisés dans une liste
par site et peuvent être segmentés en groupes. Chaque envoi est archivé avec un instantané HTML
complet et un journal par destinataire ; un plugin front de désinscription et une intégration RGPD
complète (suppression à la demande et suppression automatique planifiée) sont inclus nativement.

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisNewsletter',
];
```

Nécessite `melis-core` et `melis-cms` (`^5.2`) ; PHP `^8.1|^8.3`. Dépend également
fonctionnellement de `melis-engine` et `melis-front` pour le rendu des pages et le plugin de page
de désinscription.

## Services principaux

| Alias de service | Rôle |
| --- | --- |
| `MelisNewsletterService` | Service central pour les abonnés, groupes, envoi/test, archive et configuration. Toutes les méthodes déclenchent des événements `*_start` / `*_end`. |
| `MelisNewsletterGdprAutoDeleteService` | Implémente `MelisCoreGdprAutoDeleteInterface` ; pilote le flux RGPD planifié d'avertissement/suppression pour les abonnés inactifs. |

Alias des table gateways : `MelisNewsletterSubscribersTable`, `MelisNewsletterGroupsTable`,
`MelisNewsletterGroupsPeopleTable`, `MelisNewsletterArchiveTable`,
`MelisNewsletterRecipientsTable`, `MelisNewsletterConfigTable`.

## Back-office

Accessible depuis le menu gauche sous **MelisMarketing → Newsletter** (`fa fa-newspaper-o`). Quatre
onglets :

| Onglet | Contenu |
| --- | --- |
| Abonnés | Ajouter / modifier / supprimer des abonnés ; import et export CSV ; filtre par site ; statut (actif/inactif) ; colonne d'appartenance aux groupes |
| Groupes | Créer et gérer des groupes ; colonne nombre de membres ; un sous-onglet liste les membres du groupe et permet d'ajouter/supprimer des abonnés |
| Historique | Archive de chaque envoi : nom de la page, site, date d'envoi ; actions par ligne pour visualiser le HTML exact envoyé et exporter les destinataires en CSV |
| Configuration | Hôte SMTP / Nom d'utilisateur / Mot de passe — remplace le transport par défaut de la plateforme |

Le bouton **Envoyer la newsletter** et l'action **Test** ne sont pas un onglet ici ; ils
apparaissent dans l'éditeur de page CMS pour toute page dont le type est défini sur **NEWSLETTER**.

Sept contrôleurs back-office : `MelisNewsletterTool` (abonnés), `MelisNewsletterGroupsTool`,
`MelisNewsletterGroupsSubTab`, `MelisNewsletterGroupsSubTabSubscribers`,
`MelisNewsletterSendTool`, `MelisNewsletterHistoryTool`, `MelisNewsletterConfigTool`.

## Front office

| Plugin | Clé de config | Description |
| --- | --- | --- |
| `MelisNewsletterUnsubscribePlugin` | `melisnewsletter` / `MelisNewsletterUnsubscribePlugin` | À déposer sur une page `unsubscribe`. Lit le jeton `?s={hashed_id}` intégré dans `[UNSUBSCRIBELINK]`, appelle `deactivateSubscriberById()`, et affiche un message de succès ou d'échec. Expose un paramètre `unsubscribe_data_salt` utilisé dans le hachage du jeton. |

Vues : `plugins/unsubscribe.phtml` + `unsubscribe-modal-form.phtml`.

## Mécanisme d'envoi

`MelisNewsletterSendToolController::sendNewsletterAction` délègue à
`MelisNewsletterService::sendNewsletter($pageId, $subscribers, $groups, $mailSubject)` :

1. **Résolution des destinataires** — abonnés explicites + membres de groupes via
   `getSubscribersInGroup()`, filtrés aux actifs uniquement, dédupliqués.
2. **Rendu du contenu** — page CMS récupérée en HTML ; les `href`/`src` relatifs sont réécrits en
   URL absolues en utilisant le domaine du site.
3. **Personnalisation** — codes BB substitués par destinataire ; `[UNSUBSCRIBELINK]` porte le jeton
   haché du destinataire.
4. **Envoi** — via le transport SMTP configuré ou le transport par défaut de la plateforme
   (`dummyMail@melistechnology.com` / "Melis Technology Inc." — à remplacer via l'onglet
   Configuration).
5. **Archivage** — une ligne `nlan_*` par envoi (site, page, version, corps HTML complet, date
   d'envoi) et une ligne `nlus_*` par destinataire (instantané nom/prénom/email).

Déclenche `melis_newsletter_send_newsletter_start` / `melis_newsletter_send_newsletter_end`.

**Envoi de test** (`testNewsletterAction` → `testNewsletter()` / `testNewsletterCustomMail()`)
livre à un abonné ou à un email quelconque sans archivage. Un envoi de test est **requis** avant que
le bouton Envoyer ne soit déverrouillé.

## Intégration du type de page CMS

`ModifyPagePropertiesFormConfigListener` se connecte à `modify_page_properties_form_config` et
ajoute **NEWSLETTER** comme type de page sélectionnable dans le formulaire des propriétés de page
CMS. Les pages de ce type reçoivent le bouton **Envoyer la newsletter**
(`MelisNewsletterSendTool/tool-send-newsletter-button`) dans l'éditeur.

## Intégration RGPD

Se connecte au framework RGPD de MelisCore pour les flux à la demande et planifiés :

- **À la demande :** `MelisNewsletterGdprUserInfoListener`, `…UserExtractListener`,
  `…UserDeleteListener` — recherche, exporte et supprime les données d'abonné d'une personne sur
  demande. Colonnes exposées : `nlu_firstname`, `nlu_name`, `nlu_email`, `nlu_date_creation`
  (déclarées dans `config/app.gdpr.php`).
- **Suppression automatique planifiée :** `MelisNewsletterGdprAutoDeleteService` avec neuf écouteurs
  couvrant l'enregistrement du module, la déclaration des tags RGPD, la constitution des listes de
  premier/deuxième avertissement, la fourniture des emails d'avertissement et la suppression finale
  des abonnés inactifs sans réponse.

## Tables de base de données

| Table (alias → préfixe colonnes) | Contenu |
| --- | --- |
| `MelisNewsletterSubscribersTable` (`nlu_*`) | Lignes d'abonnés par site : email, prénom/nom, statut actif/inactif, date de création |
| `MelisNewsletterGroupsTable` (`nlg_*`) | Définitions des groupes : nom, statut, date de création |
| `MelisNewsletterGroupsPeopleTable` (`nlgu_*`) | Lien d'appartenance abonné ↔ groupe |
| `MelisNewsletterArchiveTable` (`nlan_*`) | Archive par envoi : site, page, version, corps HTML complet, date d'envoi |
| `MelisNewsletterRecipientsTable` (`nlus_*`) | Journal d'envoi par destinataire : instantané nom/prénom/email, FK archive |
| `MelisNewsletterConfigTable` (`nlc_*`) | Configuration du transport SMTP par site : hôte, nom d'utilisateur, mot de passe |

## Exemple

```php
$nl = $serviceManager->get('MelisNewsletterService');

// Subscriber management
$nl->saveSubscriber($data, $id);           // $id null → create
$nl->activateSubscriberById($id);
$nl->deactivateSubscriberById($id);
$nl->getSubscribersByStatus(1);            // 1 = active
$nl->checkMailInSiteExists($email, $siteId, $excludeId);

// Group management
$nl->saveGroup($data, $id);
$nl->addSubscriberToGroup($subId, $grpId);
$nl->removeSubscriberFromGroup($subId, $grpId);
$nl->getSubscribersInGroup($grpId);
$nl->getGroupsOfSubscriber($subId);

// Send flow
$nl->testNewsletter($pageId, $subId, $subject);
$nl->testNewsletterCustomMail($pageId, $email, $subject);
$nl->sendNewsletter($pageId, $subscribers, $groups, $subject);

// History & config
$nl->getNewsletterRecipients($archiveId);
$nl->saveNewsletterConfig($cfg);
$nl->getNewsletterConfig($id);

// Export
$nl->getSubscribersForExport($active, $siteFilter, $groupFilter);
```

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Config du module (services, table gateways, contrôleurs, plugin) | `vendor/melisplatform/melis-newsletter/config/module.config.php` |
| Arbre des outils back-office + tags RGPD | `vendor/melisplatform/melis-newsletter/config/app.interface.php` |
| Config DataTables (abonnés, groupes, historique) | `vendor/melisplatform/melis-newsletter/config/app.tools.php` |
| Déclarations des colonnes RGPD info/extract | `vendor/melisplatform/melis-newsletter/config/app.gdpr.php` |
| Config plugin de désinscription | `vendor/melisplatform/melis-newsletter/config/plugins/MelisNewsletterPlugin.config.php` |
| Service principal | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterService.php` |
| Service RGPD de suppression automatique | `vendor/melisplatform/melis-newsletter/src/Service/MelisNewsletterGdprAutoDeleteService.php` |
| Contrôleurs d'envoi/test | `vendor/melisplatform/melis-newsletter/src/Controller/MelisNewsletterSendToolController.php` |
| Plugin front de désinscription | `vendor/melisplatform/melis-newsletter/src/Controller/Plugin/MelisNewsletterUnsubscribePlugin.php` |
| Écouteurs (RGPD ×9, type de page, flash messenger) | `vendor/melisplatform/melis-newsletter/src/Listener/` |
| Table gateways | `vendor/melisplatform/melis-newsletter/src/Model/Tables/` |
| Installation BDD + migrations | `vendor/melisplatform/melis-newsletter/install/dbdeploy/` |

Voir aussi : [melis-core](/fr/legacy/reference/modules/melis-core), [melis-cms](/fr/legacy/reference/modules/melis-cms),
[melis-front](/fr/legacy/reference/modules/melis-front), [melis-engine](/fr/legacy/reference/modules/melis-engine)
