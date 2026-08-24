# Référence des modules

Melis Platform est un ensemble de paquets Composer `melisplatform/*`. Voici une carte des **50
modules** fournis avec le skeleton v6, regroupés par domaine. Chacun est un module Laminas standard
sous `vendor/melisplatform/`.

Melis v6 conserve le même framework et les mêmes modules que v5, mais **remplace le back-office par
une interface React** servie sur `/melis-react`. Les tools sont désormais des **« bricks »** natives
React — des interfaces React autonomes qu'un module fournit et que le shell découvre au démarrage —
avec un bascule **Nouveau (React) / Ancien (iframe)** de sorte que tout tool qui n'a pas encore été
réécrit continue de fonctionner comme sa page jQuery/AJAX historique au sein du shell. Un overlay
global **Assistant IA** est disponible partout. Cette couche est servie par deux modules
d'infrastructure : [`melis-react-api`](/fr/reference/modules/melis-react-api) (l'épine dorsale de
l'API JSON — utilisateur, menu, assets, découverte des bricks, données du dashboard, résolveur de
capacités) et [`melis-react-override`](/fr/reference/modules/melis-react-override) (la route du shell
SPA et le mécanisme d'iframe des tools historiques). Voir le [guide d'architecture](/fr/guide/architecture)
pour comprendre comment tout s'articule.

::: tip Une page par module
Chaque module a aussi une **page de référence dédiée** (rôle, services clés, tools, plugins, tables,
fichiers clés) — ouvrez la section **Modules** dans la sidebar, p. ex.
[MelisCms](/fr/reference/modules/melis-cms), [MelisCommerce](/fr/reference/modules/melis-commerce),
[MelisAIEngine](/fr/reference/modules/melis-ai-engine).
:::

## Cœur & plateforme

| Module | Rôle |
| --- | --- |
| [`melis-core`](/fr/reference/modules/melis-core) | Le cœur de la plateforme : shell du back-office, arbre de config (`MelisCoreConfig`), authentification, droits, utilisateurs, services et événements. Inchangé en v6 — seul le shell qu'il alimente est désormais rendu par React. |
| [`melis-asset-manager`](/fr/reference/modules/melis-asset-manager) | Sert les assets `public/` (CSS/JS/images) de chaque module via des URL propres et délivre les bundles compilés. |
| [`melis-cache-internal`](/fr/reference/modules/melis-cache-internal) | Cache HTTP pleine page pour le front-office CMS, avec cache partiel (par zone) et exclusions par page. |
| [`melis-composerdeploy`](/fr/reference/modules/melis-composerdeploy) | Intègre Composer pour installer, mettre à jour et supprimer des modules par programmation. |
| [`melis-dbdeploy`](/fr/reference/modules/melis-dbdeploy) | Exécuteur headless de migrations de base — applique dans l'ordre les deltas SQL de chaque module. |
| [`melis-marketplace`](/fr/reference/modules/melis-marketplace) | Store de modules dans le back-office pour découvrir, télécharger, mettre à jour et supprimer des modules. |
| [`melis-phpinfo`](/fr/reference/modules/melis-phpinfo) | Outil de diagnostic en lecture seule qui affiche le `phpinfo()` natif de PHP dans le back-office React. |
| [`melis-sql`](/fr/reference/modules/melis-sql) | Exécuteur de requêtes SQL en lecture seule dans les Dev Tools, fourni comme brick full-React native. |
| [`melis-react-api`](/fr/reference/modules/melis-react-api) | Épine dorsale de l'API JSON du back-office React — démarre le shell et héberge le résolveur de capacités. |
| [`melis-react-override`](/fr/reference/modules/melis-react-override) | Infrastructure React — affiche les tools historiques dans le shell `/melis-react` et sert la SPA React. |

## CMS & front office

| Module | Rôle |
| --- | --- |
| [`melis-cms`](/fr/reference/modules/melis-cms) | Le back-office CMS — sites, arbre de pages, éditeur de page, templates, styles et SEO, sous forme de back-office React. |
| [`melis-engine`](/fr/reference/modules/melis-engine) | Socle de données CMS partagé — modèle de page, sites, langues, classe de base des plugins de templating et cache de rendu. |
| [`melis-front`](/fr/reference/modules/melis-front) | Système de rendu front-office — transforme une URL en page finie et fournit les blocs de contenu (plugins de page). |
| [`melis-demo-cms`](/fr/reference/modules/melis-demo-cms) | Le site de référence/démo officiel — un **module de site** prêt à installer. |
| [`melis-cms-blog`](/fr/reference/modules/melis-cms-blog) | Système de blog avec un back-office React natif et trois plugins d'affichage front-office. |
| [`melis-cms-comments`](/fr/reference/modules/melis-cms-comments) | Système de commentaires pour News et Blog — modération, workflow d'approbation et un plugin front ; un onglet Commentaires dans l'éditeur. |
| [`melis-cms-news`](/fr/reference/modules/melis-cms-news) | Système d'actualités/blog avec un tool de rédaction React et trois plugins d'affichage front-office. |
| [`melis-cms-prospects`](/fr/reference/modules/melis-cms-prospects) | Gestion des leads/contacts — un formulaire front capture les messages ; un tool React les parcourt, filtre, exporte et classe. |
| [`melis-cms-slider`](/fr/reference/modules/melis-cms-slider) | Gestionnaire de slider/carrousel (brick React native) avec un plugin de templating front-office. |
| [`melis-cms-category2`](/fr/reference/modules/melis-cms-category2) | Catégories de contenu multi-site et multilingues, avec un back-office React natif. |
| [`melis-cms-mcq`](/fr/reference/modules/melis-cms-mcq) | Constructeur de QCM (quiz) back-office, désormais un tool full-React natif. |
| [`melis-cms-mcq-engine`](/fr/reference/modules/melis-cms-mcq-engine) | Données, scoring et moteur de rendu front-office derrière le tool QCM React. |
| [`melis-cms-page-historic`](/fr/reference/modules/melis-cms-page-historic) | Journal d'audit de l'édition de page — un onglet Historic dans l'éditeur de page React et un widget de dashboard. |
| [`melis-cms-page-analytics`](/fr/reference/modules/melis-cms-page-analytics) | Analytics de visites de page basiques, extensibles via un provider (p. ex. Google Analytics). |
| [`melis-cms-page-script-editor`](/fr/reference/modules/melis-cms-page-script-editor) | Injecte du `<script>`/`<style>`/HTML custom par page ou par site (analytics, pixels, widgets). |
| [`melis-cms-share`](/fr/reference/modules/melis-cms-share) | Injecte les balises meta de partage réseaux sociaux / Open Graph, gérées depuis un back-office React natif. |
| [`melis-cms-site-robot`](/fr/reference/modules/melis-cms-site-robot) | Édition et service dynamique du `robots.txt` par domaine, avec un back-office full-React natif. |
| [`melis-cms-tags`](/fr/reference/modules/melis-cms-tags) | Système de tags/taxonomie partagé auquel les modules de contenu rattachent leurs items, désormais avec un back-office React natif. |
| [`melis-cms-user-account`](/fr/reference/modules/melis-cms-user-account) | Système de comptes visiteurs front-office — inscription, connexion et profils par site, administré depuis un tool React. |
| [`melis-cms-google-analytics`](/fr/reference/modules/melis-cms-google-analytics) | Provider GA4 qui affiche les courbes de sessions, les totaux KPI et les données démographiques dans le back-office React. |
| [`melis-cms-link-check`](/fr/reference/modules/melis-cms-link-check) | Testeur de liens qui crawle une page (et optionnellement ses sous-pages) et enregistre chaque lien cassé. |

## Commerce

| Module | Rôle |
| --- | --- |
| [`melis-commerce`](/fr/reference/modules/melis-commerce) | Framework e-commerce complet — catalogue, clients, panier/checkout/commandes, coupons, livraison et SEO — avec un back-office React. |
| [`melis-commerce-order-invoice`](/fr/reference/modules/melis-commerce-order-invoice) | Ajoute la génération de factures PDF de commande, exposée dans le tool Commandes React. |
| [`melis-commerce-group-discount-per-category`](/fr/reference/modules/melis-commerce-group-discount-per-category) | Remise de prix par catégorie (par pays et groupe de clients) sous forme d'onglet dans le tool Catalogues React. |

## Étendre & utilitaires

| Module | Rôle |
| --- | --- |
| [`melis-templating-plugin-creator`](/fr/reference/modules/melis-templating-plugin-creator) | Assistant back-office qui scaffolde un **plugin de templating** front-office complet. |
| [`melis-dashboard-plugin-creator`](/fr/reference/modules/melis-dashboard-plugin-creator) | Assistant qui scaffolde un nouveau **plugin de dashboard** (widget) back-office, sous forme de brick React native. |
| [`melis-calendar`](/fr/reference/modules/melis-calendar) | Outil de planification avec un calendrier mensuel React natif, des événements en glisser-déposer et un widget de dashboard. |
| [`melis-cron`](/fr/reference/modules/melis-cron) | Gestionnaire de tâches planifiées — définir des tâches CLI/HTTP, les exécuter et inspecter l'historique d'exécution, via un tool React natif. |
| [`melis-document-upload`](/fr/reference/modules/melis-document-upload) | Gestion d'upload de documents sous forme de tool React natif — définir des types, collecter et servir des fichiers. |
| [`melis-messenger`](/fr/reference/modules/melis-messenger) | Messagerie interne d'utilisateur à utilisateur — une icône de notification dans la topbar et un onglet dans Mon Compte. |
| [`melis-small-business`](/fr/reference/modules/melis-small-business) | Add-on éditorial — rôles, workflow de validation, versioning de page, commentaires, verrouillage et médiathèque. |

## Authentification

| Module | Rôle |
| --- | --- |
| [`melis-login-2fa`](/fr/reference/modules/melis-login-2fa) | Cœur de l'authentification à deux facteurs — exige un code à usage unique et délègue la livraison aux modules de canal. |
| [`melis-login-2fa-email`](/fr/reference/modules/melis-login-2fa-email) | Canal de livraison par email — envoie le code de connexion à usage unique par email. |
| [`melis-login-2fa-primotexto`](/fr/reference/modules/melis-login-2fa-primotexto) | Canal de livraison par SMS via la passerelle Primotexto. |

## Notifications

| Module | Rôle |
| --- | --- |
| [`melis-newsletter`](/fr/reference/modules/melis-newsletter) | Transforme une page CMS en newsletter email personnalisée et la délivre à des groupes d'abonnés, depuis un back-office React. |

## IA

| Module | Rôle |
| --- | --- |
| [`melis-ai`](/fr/reference/modules/melis-ai) | Back-office React de la suite IA — connecter des providers, concevoir des agents, déployer des instances, suivre l'usage, discuter partout. |
| [`melis-ai-engine`](/fr/reference/modules/melis-ai-engine) | Le moteur IA abstrait — contrat de provider, runtime agent/scénario, stockage des conversations, pont MCP/tool et composants React de chat partagés. |
| [`melis-ai-engine-claude`](/fr/reference/modules/melis-ai-engine-claude) | Provider Anthropic Claude pour le moteur IA (backend, sans interface React propre). |
| [`melis-ai-engine-gemini`](/fr/reference/modules/melis-ai-engine-gemini) | Provider Google Gemini pour le moteur IA (backend, sans back-office propre). |
| [`melis-ai-community-extensions`](/fr/reference/modules/melis-ai-community-extensions) | Injecte la génération IA dans les surfaces d'édition CMS existantes (mini-templates, news, zones de glisser-déposer). |

::: tip Les modules propres à v5 sont sous /legacy
Certains modules du back-office v5 n'ont pas encore de page v6 dédiée — p. ex.
[`melis-tool-creator`](/fr/legacy/reference/modules/melis-tool-creator),
[`melis-installer`](/fr/legacy/reference/modules/melis-installer) et les modules `form-*`.
Leur documentation est figée sous `/legacy/reference/modules/`.
:::

::: tip Parcourir les sources
Chaque module se trouve dans `vendor/melisplatform/<nom-du-module>/`. Lire les dossiers `config/`
et `src/` d'un module est le moyen le plus rapide d'apprendre ses services publics et ses
conventions.
:::
