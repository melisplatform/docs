# MelisCore

> La fondation du back-office sur laquelle repose chaque autre module — connexion, utilisateurs/rôles/droits, le
> framework de menu et d'outils, tableau de bord, configuration, e-mail, RGPD, et le système de services +
> événements de base — désormais rendu par le back-office **React** à l'adresse `/melis-react`. Paquet
> `melisplatform/melis-core`.

## Présentation

`MelisCore` est le cœur du back-office de Melis Platform. Il fournit la coquille de l'application (en-tête,
menu gauche, arbre des outils, tableau de bord, pied de page), l'arbre de configuration `MelisCoreConfig` qui
agrège tous les fichiers `app.*.php` de chaque module, l'authentification et les droits par outil, la gestion
des utilisateurs, la gestion des plateformes/environnements, les e-mails transactionnels, les outils RGPD, un
point d'entrée d'authentification micro-service, et la couche partagée de services/événements que chaque autre
module étend. Tous les modules `melisplatform/*` en dépendent.

En v6, MelisCore **est aussi l'application de back-office React**. La même coquille est servie sous forme
d'application monopage React 19 + TypeScript + Tailwind à l'adresse `/melis-react`, fonctionnant en parallèle du
back-office `.phtml` hérité à `/melis`. MelisCore livre la coquille (mise en page, routage, le client générique
`react-api`, le chargeur de modules/briques, le résolveur de capacités, le bouton bascule Nouveau/Ancien) **et**
ses propres outils React natifs (Utilisateurs, Tableau de bord, Annonces, E-mails, RGPD, Langues, Logs, Modules,
Autre configuration, Plateformes, Thème de plateforme, Mon compte, connexion/2FA). Chaque autre module se
branche **dans** cette coquille.

## Activation

Ajouter dans `config/modules.config.php` — MelisCore doit être chargé tôt car presque tous les autres modules
appellent ses services :

```php
return [
    'MelisCore',
    // … other modules …
];
```

Le back-office React est livré par trois modules coopérants :

| Module | Rôle |
| --- | --- |
| `MelisCore` | La source/le build de l'application React + les routes et contrôleurs `react-api` des outils natifs. |
| [`MelisReactApi`](/fr/reference/modules/melis-react-api) | Le pont générique `react-api` (`me`, `menu`, `assets`, `langs`, `react-modules`, `rights`, `i18n`, `dashboard`). |
| [`MelisReactOverride`](/fr/reference/modules/melis-react-override) | Sert la coquille SPA à `/melis-react` et le mécanisme d'iframe hérité (`/melis/react-tool-page`). |

Ses modules d'infrastructure complémentaires restent [MelisAssetManager](/fr/reference/modules) (qui sert les
assets React hachés depuis `/MelisCore/ui-react/`), [MelisDbDeploy](/fr/reference/modules),
[MelisComposerDeploy](/fr/reference/modules) et [MelisInstaller](/fr/reference/modules).

## L'architecture du back-office React

La source de l'application Vite + React se trouve dans `vendor/melisplatform/melis-core/ui-react/` et est
compilée vers le dossier versionné `vendor/melisplatform/melis-core/public/ui-react/`. À l'exécution :

- La **coquille (SPA)** est servie à **`/melis-react`** par `MelisReactOverride` ; le back-office hérité à
  `/melis` reste intact.
- Les **assets hachés** se chargent depuis **`/MelisCore/ui-react/`** (la `base` de Vite, servie par MelisAssetManager).
- L'**API JSON** se trouve sous **`/melis/react-api/…`** avec le contrat `{ success, data, error }`.

Chaque outil que voit l'utilisateur arrive à l'écran via **l'un de trois mécanismes** :

1. **Outil React natif** — une véritable page React adossée à un `MelisReactApi*Controller` dans MelisCore
   (Utilisateurs, Langues, E-mails, RGPD…). Répertorié dans le registre des modules (`ui-react/src/lib/module-registry.ts`).
2. **Brique de module** — un autre module actif livre sa propre interface React sous forme de *brique*, chargée à
   l'exécution (présente uniquement si le module est actif). Découverte via `GET /melis/react-api/react-modules`.
3. **Pool d'iframes** — tout outil hérité sans route React dédiée est rendu dans la coquille au sein d'une iframe
   mutualisée via `/melis/react-tool-page?key=<melisKey>`.

Le **menu est dynamique** (`GET /melis/react-api/menu` renvoie l'arbre des outils filtré par les droits), les
routes des outils sont **dérivées de cet arbre** (`/[section]/[tool]`, par ex. `/melis-core/user`), et rien
n'est codé en dur par module. Un outil natif peut aussi porter un bouton bascule **Nouveau (React) / Ancien
(iframe)** pour comparer sa vue React avec l'outil classique.

## Coquille du back-office

La coquille (`ui-react/src/components/layout/Shell.tsx`) compose la barre latérale, la barre supérieure, les
sous-onglets, la barre d'onglets des outils hérités et la zone de contenu. Chaque montage d'outil est enveloppé
dans un `ToolErrorBoundary` propre à l'outil, afin que le plantage de rendu d'un outil ne rende jamais tout le
back-office blanc.

### Barre supérieure

Le côté droit de la barre supérieure contient un interrupteur de **thème** (clair/sombre), le sélecteur de
**langue**, une icône **Messenger** (lorsque ce module est actif), une cloche de **notifications** et votre
**avatar utilisateur** (ouvre *Mon compte* et contient *Déconnexion*). Un bouton de masquage de la barre
latérale se trouve tout à gauche.

![Les icônes du côté droit de la barre supérieure — interrupteur de thème, langue, messenger, notifications, avatar](/screenshots/react/melis-core/meliscore-header-righticons.png)

### Barre latérale gauche et pied de page

La barre latérale affiche le lien **Tableau de bord** ainsi que l'**arbre des outils**, groupé par section
(MelisCore, MelisCms, MelisMarketing, MelisCommerce, Marketplace, Melis AI…). **Ce que vous voyez dépend de vos
droits** — seuls les outils que vous êtes autorisé à utiliser apparaissent. Le pied de page affiche la
**version** de la plateforme / de MelisCore.

![Le pied de page — version de MelisCore / de la plateforme](/screenshots/react/melis-core/meliscore-footer-version-meliscore.png)

### Tableau de bord

La page d'accueil après la connexion. Elle affiche des **bulles** en haut (compteurs Melis News / Mises à jour /
Notifications / Messages) et une grille de **widgets** (plugins de tableau de bord). Les widgets s'ajoutent depuis
la palette **« Ajouter un widget »** et s'organisent par glisser-déposer ; leur disponibilité dépend de vos
droits.

![Le tableau de bord React — bulles en haut, une grille de widgets vide et la palette « Ajouter un widget »](/screenshots/react/melis-core/meliscore-dashboard-empty.png)

![La palette « Ajouter un widget » — choisir un widget (groupé par module) à déposer sur le tableau de bord](/screenshots/react/melis-core/meliscore-dashboardplugins-menu.png)

## Authentification

La connexion se trouve à `/melis-react/login` (React) — identifiant + mot de passe, option **Se souvenir de moi**
et un sélecteur de langue. En cas de succès, vous arrivez sur le Tableau de bord. Les comptes avec **2FA** sont
redirigés vers `/verify-2fa` (un nouveau code peut être redemandé lorsqu'il est envoyé par e-mail). Le lien
**Mot de passe perdu** (`/forgot-password`) envoie par e-mail un lien de réinitialisation ouvrant
`/reset-password/:hash`. L'habillage du panneau de connexion est configurable via l'outil **Thème de plateforme**.

Sous le capot, la couche PHP est inchangée : la connexion poste vers le `POST /melis/authenticate` hérité, le
sondage de session utilise `GET /melis/islogin`, et les droits proviennent de `MelisCoreAuth` / `MelisCoreRights`.

## Utilisateurs, rôles et droits

**Où :** MelisCore → Administration → **Gestion des utilisateurs** (`/melis-core/user`). Gérer chaque compte du
back-office. La liste comporte des cartes KPI (Total / Actifs / Inactifs / Admins), une recherche, des filtres de
statut et de rôle, un gestionnaire de colonnes, un export, le bouton bascule Nouveau/Ancien et **+ Nouvel
utilisateur**.

![L'outil Gestion des utilisateurs — cartes KPI, filtres, gestionnaire de colonnes, Export, bouton bascule Nouveau/Ancien, « + Nouvel utilisateur »](/screenshots/react/melis-core/meliscore-tool-users-list.png)

L'ouverture d'un utilisateur donne quatre onglets :

- **Profil** — identité, tags, bascule de statut, rôle, un indicateur **Administrateur** et une section de mot
  de passe avec retour en direct sur la complexité.

  ![L'onglet Profil — identité, tags, cartes Statut/Rôle/Droits et un champ de mot de passe avec exigences en direct](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-profile.png)

- **Droits** — l'**arbre d'accès** (cocher les outils/sections que l'utilisateur peut utiliser), ainsi qu'un
  panneau **Plugins de tableau de bord** et un panneau **Pages**. Tout ce qui n'est pas accordé est masqué du
  menu de l'utilisateur. Les outils qui déclarent des **capacités** exposent des sous-cases (Liste / Créer /
  Modifier / Supprimer / Exporter).

  ![L'arbre des droits — décomptes par section et cases à cocher de capacités par outil](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-rights-1.png)

  ![Plus bas dans l'onglet Droits — le panneau Plugins de tableau de bord et le panneau Pages](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-rights-2.png)

- **Connexions** — l'historique des connexions de l'utilisateur (date, heure d'entrée/de sortie, durée).
- **Micro-services** — générer une **clé API** pour que des tiers puissent s'authentifier en tant que cet
  utilisateur auprès des points d'entrée micro-service.

  ![Une clé API générée — bascule d'activation/désactivation, clé masquée avec afficher/copier/régénérer, et l'URL du micro-service](/screenshots/react/melis-core/meliscore-tool-users-edit-tab-microservices-generated.png)

Les **rôles** définissent un ensemble de droits une seule fois et l'assignent à de nombreux utilisateurs ;
l'outil Rôles est fourni par **MelisSmallBusiness**, si bien que le sélecteur *Rôle* de l'onglet Profil
n'apparaît que lorsque ce module est actif.

> Règle générale : si quelqu'un « ne voit pas un outil », c'est que son arbre de **Droits** ne l'accorde pas —
> modifiez l'utilisateur (ou son rôle) → Droits → cochez l'outil.

## Mon compte

**Où :** avatar de la barre supérieure → **Mon compte** (`/melis-core/account`). Modifier votre propre e-mail,
changer votre mot de passe, définir la langue de votre interface et téléverser une photo de profil. Les modules
peuvent ajouter des onglets ici (par ex. Melis Messenger). C'est le seul outil natif sans garde de capacité — il
est ouvert à tout utilisateur authentifié.

![La page « Mon compte » — avatar, résumé de l'identité et un onglet Profil (e-mail / mot de passe / langue)](/screenshots/react/melis-core/meliscore-tool-profile-tab-profile.png)

## Annonces

**Où :** MelisCore → Administration → **Annonce** (`/melis-core/announcement`). Les annonces de plateforme
affichées sur le tableau de bord, avec des cartes KPI, une recherche, un filtre de statut et **+ Nouvelle
annonce**. L'éditeur comporte un titre + un corps en **texte enrichi (TinyMCE)**, une bascule **Actif** et une
**Date**.

![La liste des annonces — cartes KPI, filtre Actif/Inactif, modifier/supprimer par ligne](/screenshots/react/melis-core/meliscore-tool-announcement-list.png)

![L'éditeur d'annonce — Titre, texte HTML (TinyMCE), bascule Actif et Date](/screenshots/react/melis-core/meliscore-tool-announcement-edit.png)

## Langues du back-office

**Où :** MelisCore → Configuration du système → **Langues du back-office** (`/melis-core/language`). Les locales
(locale + nom) disponibles pour les utilisateurs du back-office. `en_EN` est la **valeur par défaut protégée**
(elle ne peut être ni renommée ni supprimée). L'enregistrement régénère les fichiers de traduction via
`MelisCoreTranslation`.

![La liste des langues — locale + nom, la valeur par défaut (en_EN) signalée, modifier par ligne](/screenshots/react/melis-core/meliscore-tool-bolanguages-list.png)

## Gestion des e-mails

**Où :** MelisCore → Configuration du système → **Gestion des e-mails** (`/melis-core/emails`). Les **e-mails
transactionnels** de la plateforme (création de compte, mot de passe perdu, workflow…). La liste affiche le nom,
le code, l'expéditeur/l'e-mail de l'expéditeur et un badge **Source** (Défaut vs Personnalisé).

![La liste de gestion des e-mails — modèles transactionnels avec code, expéditeur et source Défaut/Personnalisé](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-list.png)

L'éditeur comporte des **propriétés générales** (nom, code, expéditeur, répondre à, tags de remplacement, chemin
de la mise en page) et une section **Contenu par langue** (sujet + corps HTML/texte par langue) avec des tags
remplaçables comme `[NAME]`, `[EMAIL]`, `[LOGIN]`. Les enregistrements délèguent à
`MelisCoreBOEmailService::saveBoEmailByCode`.

![Les propriétés de l'e-mail — nom, code, expéditeur, répondre à, tags de remplacement et chemin de la mise en page](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-edit-properties.png)

![Le contenu par langue — sujet, un corps HTML TinyMCE avec les tags `[NAME]`/`[EMAIL]`/`[LOGIN]`, et une version en texte brut](/screenshots/react/melis-core/meliscore-tool-emailsmanagement-edit-language.png)

## RGPD

**Où :** MelisCore → Administration → **RGPD** (`/melis-core/gdpr`). Quatre onglets :

- **Données** — rechercher une personne par nom/e-mail ; à travers tous les modules, voir les données détenues à
  son sujet, puis **extraire** (export XML) ou **supprimer** les enregistrements sélectionnés.

  ![L'onglet Données RGPD — rechercher une personne ; les modules renvoient les données correspondantes à extraire ou supprimer](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-data.png)

- **Bannières** — configurer les textes de la bannière de cookies/consentement RGPD par site + langue.
- **Anonymisation** — les configurations planifiées de **suppression automatique / rétention des données** (une
  par site + module), avec **Exécuter** et **Logs**.

  ![L'onglet Anonymisation — configurations de suppression automatique, avec Logs, Exécuter et « + Nouvelle configuration »](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-anonymization.png)

- **SMTP** — le serveur de messagerie utilisé pour envoyer les e-mails d'alerte d'anonymisation.

  ![L'onglet SMTP — hôte / nom d'utilisateur / mot de passe pour les e-mails d'alerte d'anonymisation](/screenshots/react/melis-core/meliscore-tool-gdpr-tab-smtp.png)

## Logs

**Où :** MelisCore → Configuration du système → **Logs** (`/melis-core/logs`). Un **journal d'activité** en
lecture seule et consultable — filtrer par type, titre, utilisateur et plage de dates, avec des cartes KPI
(Total / Aujourd'hui / Types). Les non-administrateurs ne voient que leurs propres actions.

![Le visualiseur de logs — cartes KPI, filtres type/titre/utilisateur/date et lignes d'activité](/screenshots/react/melis-core/meliscore-tool-logs-list.png)

## Modules

**Où :** MelisCore → Configuration du système → **Modules** (`/melis-core/modules`). Activer/désactiver et
**réordonner** (glisser-déposer) les modules de la plateforme ; chaque ligne affiche le module, son paquet, sa
version et ses dépendances. **Enregistrer** réécrit `config/melis.module.load.php` et déclenche
`meliscore_module_management_save_end`.

![L'outil Modules — recherche, nombre d'actifs, réordonnancement de l'ordre de chargement par glisser-déposer, bascule par module, badges dépendances/version](/screenshots/react/melis-core/meliscore-tool-modules-list.png)

## Autre configuration (politique de connexion et de mot de passe)

**Où :** MelisCore → Configuration du système → **Autre configuration** (`/melis-core/other-config`). La politique
de sécurité : **verrouillage du compte après échecs**, **durée de validité du mot de passe**, **réutilisation du
mot de passe** et **complexité du mot de passe** (longueur minimale + exigences minuscule/majuscule/chiffre/
caractère spécial). Écrite dans `app.login.php` via `MelisPasswordSettingsService`.

![La page Autre configuration — verrouillage, validité du mot de passe, bascules de réutilisation et de complexité](/screenshots/react/melis-core/meliscore-tool-other-config.png)

## Plateformes

**Où :** MelisCore → Configuration du système → **Plateformes** (`/melis-core/platforms`). Gérer les
**environnements** (dev/pré-prod/prod), avec des cartes KPI, une recherche et **+ Nouvelle plateforme**. La
plateforme **courante** est signalée et son nom ne peut pas être modifié.

![La liste des plateformes — la plateforme « courante » signalée, colonnes Marketplace/Cache, modifier/supprimer par ligne](/screenshots/react/melis-core/meliscore-tool-platforms-list.png)

![L'éditeur de plateforme — nom (verrouillé pour la plateforme courante), mises à jour Marketplace et bascules de cache](/screenshots/react/melis-core/meliscore-tool-platforms-edit.png)

## Thème de plateforme

**Où :** MelisCore → Configuration du système → **Schéma de plateforme** (`/melis-core/platform-scheme`).
Configurer l'**habillage** du back-office : le logo de l'en-tête, le **panneau gauche de connexion** (logo,
arrière-plan, titre/sous-titre par langue) et le favicon. **Restaurer par défaut** le réinitialise.

![La page Thème de plateforme — logo de l'en-tête du back-office et l'habillage du panneau gauche de connexion](/screenshots/react/melis-core/meliscore-tool-platformscheme.png)

> En React, il existe deux contrôleurs de thème rattachés au même nœud de droits
> `meliscore_tool_platform_scheme` : cette page **Thème de plateforme** (habillage React — logos, connexion,
> favicon) et le **schéma de couleurs** hérité (couleurs du back-office, régénère `schemes.css`).

## Outils natifs → contrôleurs et capacités

Chaque outil React natif correspond à un `MelisReactApi*Controller` (dans `src/Controller/`) déclaré dans
`config/react-api.php`, protégé par un `melisKey` porteur de droits. Les **capacités** avancées par action sont
déclarées dans `config/react.capabilities.php` et appliquées côté serveur (autorisation par défaut dans
l'interface).

| Outil (route) | Contrôleur | melisKey / garde | Capacités |
| --- | --- | --- | --- |
| Utilisateurs (`/melis-core/user`) | `MelisReactApiUserController` | `meliscore_tool_user` | list, create, edit, delete, export |
| Mon compte (`/melis-core/account`) | `MelisReactApiUserProfileController` | `meliscore_user_profile` (auth uniquement) | — |
| Annonce | `MelisReactApiAnnouncementController` | `melis_core_announcement_tool` | list, create, edit, delete, export |
| E-mails | `MelisReactApiEmailsController` | `meliscore_tool_emails_mngt` | list, create, edit, delete |
| RGPD | `MelisReactApiGdprController` | `melis_core_gdpr` | appliquée, non déclarée → autorisation par défaut |
| Langues | `MelisReactApiLanguageController` | `meliscore_tool_language` | list, create, edit, delete |
| Logs | `MelisReactApiLogController` | `meliscore_logs_tool` (lecture seule) | list |
| Modules | `MelisReactApiModulesController` | `meliscore_tool_user_module_management` | list, edit |
| Autre configuration | `MelisReactApiOtherConfigController` | `meliscore_tool_other_config` | list, edit |
| Plateformes | `MelisReactApiPlatformController` | `meliscore_tool_platform` | list, create, edit, delete |
| Thème de plateforme | `MelisReactApiPlatformScheme(React)Controller` | `meliscore_tool_platform_scheme` | list, edit |
| Auth (public) | `MelisReactApiAuthController` | aucune (forgot/reset/i18n) | — |

Chaque action protégée exécute la même barrière en deux lignes :

```php
private const MELIS_KEY = 'meliscore_tool_user';
if ($deny    = $this->denyUnlessAccess())    { return $deny; }    // 401 unauth / 403 canAccess(MELIS_KEY)
if ($denyCap = $this->denyUnlessCan('list')) { return $denyCap; } // capability (CapabilityGuardTrait)
```

## L'API react-api

La coquille consomme une `react-api` **générique** (issue du module `MelisReactApi`) ainsi que les routes des
outils **natifs** (issues de MelisCore). Base `/melis/react-api`, contrat `{ success, data, error }` ; chaque
appel envoie `X-Requested-With: XMLHttpRequest` et `credentials: 'include'`.

| Méthode et URL | Objectif |
| --- | --- |
| `GET /melis/react-api/me` | Utilisateur courant (id, name, login, email, picture, isAdmin, capabilities). |
| `GET /melis/react-api/menu[?full=1]` | Arbre des outils filtré par les droits (`full=1` = non filtré, éditeur de droits uniquement). |
| `GET /melis/react-api/react-modules` | Modules actifs livrant une brique + l'URL du bundle concaténé. |
| `GET /melis/react-api/langs` · `/assets` · `/i18n?locale=…` | Langues BO, assets de plateforme, traductions publiques. |
| `GET /melis/react-api/dashboard/{bubbles,stats,layout}` · `POST …/layout` | Données du tableau de bord + disposition partagée. |
| `GET/POST /melis/react-api/{users\|languages\|platforms\|emails\|…}` | CRUD des outils natifs (par contrôleur ci-dessus). |

Exemple — une liste par keyset natif et un enregistrement :

```ts
// GET a keyset page of platforms
const r = await fetch('/melis/react-api/platforms?limit=25&sort=plf_id&dir=desc', {
  headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
})
const { success, data } = await r.json()   // { success, data: { items, total, nextCursor } }

// POST save a language
await fetch('/melis/react-api/languages/save', {
  method: 'POST',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ id: null, locale: 'de_DE', name: 'Deutsch' }),
})
```

## Services principaux (inchangés)

Enregistrés comme alias du `service_manager` dans `config/module.config.php` — la colonne vertébrale PHP à
travers laquelle les outils React appellent :

| Alias de service | Rôle |
| --- | --- |
| `MelisCoreConfig` | Arbre de configuration à l'exécution sur les fichiers `app.*` agrégés : `getItem('/meliscore/interface/…')`, `getItemPerPlatform('/meliscore/datas/')`, `getFormMergedAndOrdered(…)`. |
| `MelisCoreAuth` | Authentification du back-office : `hasIdentity()`, `getIdentity()`, `getAuthRights()`, `encryptPassword()`, `isPasswordCorrect()`. |
| `MelisCoreRights` | Contrôle d'accès par outil : `canAccess($melisKey)`, `getRightsValues($id, $isRole)`, `createXmlRightsValues(…)`. |
| `MelisCoreTool` | Assistant d'outil back-office (colonnes, formulaires, config DataTable) pour les outils hérités/iframe. |
| `MelisCoreBOEmailService` | Modèles transactionnels : `sendBoEmailByCode()`, `getBoEmailByCode()`, `saveBoEmailByCode()`, `deleteEmail()`. |
| `MelisCoreGdprService` / `MelisCoreGdprAutoDeleteService` | Accès/effacement RGPD des personnes et le moteur de rétention planifié. |
| `MelisCoreTranslation` | Charge et fusionne les traductions `tr_*` par locale (régénérées lors de l'enregistrement d'une langue). |
| `MelisGeneralService` | Classe de base dont héritent la plupart des services — `sendEvent()`, `makeArrayFromParameters()`, `getServiceManager()`. |

## Système d'événements

`MelisGeneralService` déclenche toujours des événements `*_start` / `*_end` autour de chaque méthode de service,
si bien que n'importe quel module peut intercepter. Connectez-vous via le gestionnaire d'événements partagé :

```php
$sm->get('SharedEventManager')->attach(
    'MelisCore',
    'meliscore_tooluser_savenew_end',
    function ($e) { $p = $e->getParams(); /* react */ },
    100
);
```

Événements de base courants : `meliscore_tooluser_savenew_start/end`, `…delete_start/end`, `…save_start/end`,
`melis_core_check_user_rights`, `meliscore_install_create_new_user`, `melis_core_new_platform`,
`meliscore_module_management_save_end`, et les événements RGPD (`melis_core_gdpr_user_info_event`,
`…_extract_event`, `…_delete_event`, `melis_core_gdpr_auto_delete*`).

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_core_user` | Utilisateurs back-office (login, hash du mot de passe, XML `usr_rights`, indicateur admin, langue, rôle). |
| `melis_core_user_role` | Rôles et leur XML `urole_rights`. |
| `melis_core_user_connection_date` | Historique des connexions. |
| `melis_core_lang` | Langues du back-office. |
| `melis_core_platform` | Environnements/plateformes. |
| `melis_core_bo_emails` / `_details` | Modèles d'e-mails transactionnels et corps par langue. |
| `melis_core_log` / `_log_type` / `_log_type_trans` | Journal d'actions, types et traductions. |
| `melis_core_lost_password` | Jetons de réinitialisation de mot de passe. |
| `melis_core_microservice_auth` | Clés API pour les points d'entrée micro-service. |
| `melis_core_dashboards` / `_dashboard_schema` | Disposition du tableau de bord par utilisateur. |
| `melis_core_plugins` | Plugins enregistrés. |
| `melis_core_gdpr_delete_config` / `_delete_emails_logs` | Règles de suppression automatique RGPD et piste d'audit. |
| `melis_user_password_history` | Historique des mots de passe (prévention de réutilisation). |
| `melis_announcement` | Annonces du back-office. |

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Amorçage du module | `vendor/melisplatform/melis-core/src/Module.php` |
| Routes, services, contrôleurs, view helpers | `vendor/melisplatform/melis-core/config/module.config.php` |
| Coquille & arbre des outils du back-office hérité (interface) | `vendor/melisplatform/melis-core/config/app.interface.php` |
| Déclarations d'outils DataTable | `vendor/melisplatform/melis-core/config/app.tools.php` |
| Points d'entrée micro-service | `vendor/melisplatform/melis-core/config/app.microservice.php` |
| Routes + contrôleurs react-api natifs | `config/react-api.php` + `src/Controller/MelisReactApi*Controller.php` |
| Capacités des outils natifs | `config/react.capabilities.php` |
| Source de l'application React | `vendor/melisplatform/melis-core/ui-react/src/` |
| Application React compilée (versionnée) | `vendor/melisplatform/melis-core/public/ui-react/` |
| Services · Contrôleurs · Passerelles de tables | `src/Service/` · `src/Controller/` · `src/Model/Tables/` |
| SQL d'installation & migrations · Traductions | `install/` · `language/` |

Voir aussi : [Référence des modules](/fr/reference/modules), [Créer un outil](/fr/guide/create-a-tool),
[Plugins](/fr/guide/plugins)
