# MelisTipimail

> Raccourci back-office qui intègre l'application web Tipimail dans l'admin Melis via une iframe. Package `melisplatform/melis-tipimail`.

## Présentation

MelisTipimail est un outil back-office à écran unique qui affiche le service d'e-mail transactionnel externe Tipimail dans l'admin Melis au moyen d'une `<iframe>`. Il s'agit essentiellement d'un signet intégré : il ouvre la page de connexion/tableau de bord de Tipimail dans un onglet Melis, permettant aux administrateurs de gérer leur compte Tipimail sans quitter la plateforme.

Le module n'ajoute **aucune** couche base de données, service ou modèle — un seul contrôleur et une seule vue. Il ne fait **pas** office de transport de courrier ; son installation ne route pas les e-mails sortants via Tipimail. La seule dépendance d'exécution est `melisplatform/melis-core` (`^5.2`).

::: warning Bloc de configuration API inerte
`config/app.interface.php` définit un bloc `tipimail_conf` avec des paramètres fictifs pour l'API (`serverURI`, `username`, `apikey`, `apiVersion`, `urlWS`, `userAgent`) et le web (`user`/`password`). Aucun code de ce module ne lit ces valeurs — il s'agit d'un squelette prévu pour une intégration future ou externe. Seule la clé `url` de `config/app.tools.php` est réellement utilisée.
:::

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisTipimail',
];
```

Nécessite que `MelisCore` soit chargé en premier.

## Back-office

L'outil apparaît dans le menu gauche sous **MelisMarketing → Tipimail** (icône `fa-envelope`). En l'ouvrant, l'application web Tipimail s'affiche intégrée dans la page via une `<iframe>` pleine largeur.

L'accès est contrôlé par le système de droits back-office : un utilisateur ne disposant pas du droit `melis_tipmail_tool` voit un message « accès refusé » à la place de l'intégration.

::: tip Particularité de nommage
La clé d'outil et l'identifiant de droit s'écrivent **`melis_tipmail_tool`** (un seul « i »), tandis que le nom du module est `MelisTipimail` (deux « i »). Utilisez les chaînes existantes telles quelles lorsque vous faites référence aux droits ou aux clés de configuration.
:::

## Configuration

| Fichier | Clé | Rôle |
| --- | --- | --- |
| `config/app.tools.php` | `melisTipimail.tools.melis_tipmail_tool.config.url` | URL de l'iframe lue par le contrôleur. Valeur par défaut : `https://app.tipimail.com/#/access/login`. |
| `config/app.interface.php` | `melisTipimail.datas.tipimail_conf.default.{api,web}` | Paramètres fictifs pour les identifiants API/web — aucun code ne les lit. |

Pour faire pointer l'intégration vers une URL différente ou une instance Tipimail auto-hébergée, modifiez la valeur `url` dans `config/app.tools.php`.

## Fichiers clés

| Élément | Chemin |
| --- | --- |
| Outil menu gauche + bloc de configuration inerte | `vendor/melisplatform/melis-tipimail/config/app.interface.php` |
| URL iframe configurable | `vendor/melisplatform/melis-tipimail/config/app.tools.php` |
| Enregistrement des routes et du contrôleur | `vendor/melisplatform/melis-tipimail/config/module.config.php` |
| Contrôleur (`webaccessAction`) | `vendor/melisplatform/melis-tipimail/src/Controller/TipimailController.php` |
| Bootstrap du module | `vendor/melisplatform/melis-tipimail/src/Module.php` |
| Vue iframe | `vendor/melisplatform/melis-tipimail/view/melis-tipimail/tipimail/webaccess.phtml` |
| Gestionnaire iframe côté front | `vendor/melisplatform/melis-tipimail/public/js/page/tipimail.js` |

## Détail d'implémentation

`TipimailController::webaccessAction()` (`TOOL_KEY = 'melis_tipmail_tool'`) effectue trois étapes :

1. Lit l'URL cible via `MelisCoreConfig->getItem('melisTipimail/tools/melis_tipmail_tool/config')['url']`.
2. Vérifie `MelisCoreRights->canAccess('melis_tipmail_tool')` — en cas de refus, transmet la traduction `tr_tool_no_access` à la vue.
3. Passe `$view->url` à `webaccess.phtml`, qui produit :

```php
<iframe width="100%" class="melis-tipimail" onload="load();" src="<?php echo $this->url; ?>"></iframe>
```

`Module.php` est un code standard (`ModuleRouteListener`, config/autoloader, `createTranslations`). Il n'attache aucun écouteur d'événement et n'enregistre aucun transport de courrier.

Voir aussi : [MelisCore](/fr/legacy/reference/modules/melis-core)
