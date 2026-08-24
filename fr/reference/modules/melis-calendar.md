# MelisCalendar

> Outil de planification en back-office avec un calendrier mensuel React natif, des événements en glisser-déposer et un widget de tableau de bord. Paquet `melisplatform/melis-calendar`.

## Présentation

MelisCalendar est l'outil de calendrier et de planification d'événements de la plateforme : des événements datés sur une grille mensuelle interactive, glisser-pour-planifier et glisser-pour-replanifier. Dans le back-office React v6 (`/melis-react`), il se présente comme une **brique full-React native** — une grille mensuelle personnalisée avec glisser-déposer natif (et tactile) — qui lit et écrit via une couche JSON `react-api`. Un basculement **Nouveau / Ancien** permet aux utilisateurs de revenir à l'outil FullCalendar historique dans une iframe. Les événements sont **globaux à la plateforme** (un agenda d'équipe partagé, non lié à un site).

## Activation

Ajouter dans `config/melis.module.load.php` :

```php
return [
    'MelisCalendar',
];
```

La seule dépendance requise est `melisplatform/melis-core`. L'outil n'apparaît dans le back-office React que lorsque le module est actif (découverte modulaire des briques via `GET /melis/react-api/react-modules`).

## Back-office (React)

Barre latérale gauche → **MelisMarketing** → **Calendar** (icône calendrier). Il s'ouvre sous forme d'onglet supérieur persistant nommé **Calendar**. C'est un outil à un seul niveau (sans sous-onglets) doté d'une fenêtre modale de création/édition.

![L'outil Calendar React : basculement Nouveau/Ancien et « + New event » (en haut à droite), cartes d'indicateurs (Total / À venir), le bloc à glisser « New event » et la liste « Événements de ce mois » (à gauche), et une grille mensuelle personnalisée avec le jour courant mis en évidence](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-display.png)

| Zone | Description |
| --- | --- |
| Grille mensuelle personnalisée | Grille de 6 semaines (lundi→dimanche), `‹ / ›` pour changer de mois, **Today** pour revenir au mois courant, jour courant mis en évidence. Les événements s'affichent sous forme de puces sur leur(s) jour(s) ; les événements sur plusieurs jours s'étendent sur les cellules. |
| Bloc « Nouvel événement » à glisser | Bloc en pointillés du panneau de gauche : saisir un titre, puis le glisser sur un jour pour y créer l'événement (appui pour armer sur appareils tactiles). |
| « + New event » | Bouton en haut à droite ouvrant la fenêtre modale avec des sélecteurs de dates explicites **Titre / Début / Fin**. |
| Cartes d'indicateurs | Compteurs **Total** et **À venir** (à venir = date de début aujourd'hui ou ultérieure). |
| Liste « Événements de ce mois » | Liste du panneau de gauche des événements du mois courant ; cliquer sur un événement pour l'éditer. |
| Replanification | Glisser une puce d'événement vers un autre jour ; sa durée est préservée. |
| Basculement Nouveau / Ancien | Basculement en haut à droite qui commute l'ensemble de l'outil entre l'interface React (**New**, par défaut) et l'outil FullCalendar historique dans une iframe (**Old**). |

![Le panneau « New event » à gauche : un champ de saisie de titre plus le bloc à glisser en pointillés avec l'indication « Drag this block onto a calendar day »](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-new-event.png)

![La fenêtre modale d'événement — Titre, sélecteurs de dates Début et Fin, Annuler / Enregistrer ; l'ouverture d'un événement existant affiche la même modale avec un bouton Supprimer](/screenshots/react/melis-calendar/meliscalendar-tool-calandar-event-edition.png)

Règles appliquées à l'enregistrement : le titre est obligatoire (≤ 255 caractères) ; si la **Fin** est antérieure au **Début**, elle est ramenée au **Début**, de sorte que la fin d'un événement est toujours ≥ à son début.

## React API

Les routes se trouvent dans `config/react-api.php` (fusionnées via `MelisCalendar\Module::getConfig()`), servies par `MelisCalendar\Controller\MelisReactApiCalendarController`. Toutes sous `/melis/react-api/calendar-events`, contrat de réponse `{ success, data, error }`, dates au format `YYYY-MM-DD` (sans heure). Chaque requête envoie `X-Requested-With: XMLHttpRequest` avec `credentials: 'include'`.

| Méthode et URL | Action | Rôle |
| --- | --- | --- |
| `GET /calendar-events[?from=&to=]` | `list` | Événements chevauchant la fenêtre → `{ items: [{id,title,start,end}] }` |
| `GET /calendar-events/stats` | `stats` | Indicateurs `{ total, ongoing, upcoming }` |
| `GET /calendar-events/:id` | `get` | Un événement `{id,title,start,end}` |
| `POST /calendar-events/save` | `save` | Création (sans `id`) / mise à jour (avec `id`) ; sert aussi à la replanification |
| `DELETE /calendar-events/delete/:id` | `delete` | Supprimer un événement |

L'ordre des routes est important : `/stats`, `/save` et `/delete/:id` sont déclarées avant la route fourre-tout `/:id`.

```ts
// create OR reschedule/edit (omit id = create, include id = update)
await fetch('/melis/react-api/calendar-events/save', {
  method: 'POST', credentials: 'include',
  headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: null, title: 'Kickoff', start: '2026-08-19', end: '2026-08-19' }),
})
```

> Le contrôleur dialogue directement avec `melis_calendar` via des requêtes SQL paramétrées (`Laminas\Db\Adapter\AdapterInterface`), reproduisant les règles historiques et les champs d'audit (`cal_created_by` / `cal_last_update_by` issus de `MelisCoreAuth`). Il n'appelle **pas** `MelisCalendarService`.

## Capacités (droits avancés)

Déclarées dans `config/react.capabilities.php` sous le nœud d'outil terminal `meliscalendar_tool` (cette même clé est la melisKey de contrôle d'accès du contrôleur et la clé `can()` côté front) :

```php
return [
    'melisReactToolCapabilities' => [
        'meliscalendar_tool' => ['create', 'edit'],
    ],
];
```

Seules deux capacités existent :

- **`create`** — créer un événement (glisser un nouveau titre sur un jour / « + New event »).
- **`edit`** — déplacer / replanifier (glisser), éditer **ou** supprimer un événement existant.

La consultation du calendrier requiert `create` **OU** `edit` (l'un ou l'autre suffit) : `list` / `stats` sont protégés côté serveur par `denyUnlessCanAny(['create','edit'])`, et dans l'interface par `can('create') || can('edit')`. `save` requiert `create` en l'absence d'id et `edit` lorsqu'un id est présent ; `delete` requiert `edit`. Les gardes sont en autorisation par défaut (capacité non déclarée autorisée) et contournées pour l'administrateur.

## Services & événements (socle historique)

Le module expose toujours `MelisCalendarService` pour un accès programmatique — utilisé par l'outil historique et par d'autres modules, mais pas par le contrôleur React :

| Méthode | Rôle |
| --- | --- |
| `addCalendarEvent()` | Crée un nouvel événement. |
| `reschedCalendarEvent()` | Met à jour les dates d'un événement existant. |
| `deleteCalendarEvent()` | Supprime un événement. |

Un événement `meliscalendar_save_event_end` est déclenché après chaque sauvegarde. D'autres modules peuvent s'y abonner pour envoyer des notifications ou synchroniser un calendrier externe :

```php
$sharedEvents->attach('MelisCalendar', 'meliscalendar_save_event_end', function ($e) {
    $params = $e->getParams();
    // custom notification or sync logic
}, 10);
```

## Widget de tableau de bord

Un widget de tableau de bord **Calendar** affiche les mêmes événements sur le tableau de bord du back-office sans ouvrir l'outil. Il s'ajoute depuis le sélecteur de plugins du tableau de bord (section MELIS CALENDAR) et est servi par le plugin historique `MelisCalendarEventsPlugin`.

![Le widget Calendar sur le tableau de bord React — une grille mensuelle compacte avec le jour courant mis en évidence, ainsi que ses contrôles engrenage / rafraîchir / fermer](/screenshots/react/melis-calendar/meliscalendar-dashboardplugins-calandar.png)

![Le panneau « Add a widget » du tableau de bord — le widget Calendar sous la section MELIS CALENDAR](/screenshots/react/melis-calendar/meliscalendar-dashboardplugins-menu-selector.png)

## Tables de base de données

| Table | Contenu |
| --- | --- |
| `melis_calendar` | Une ligne par événement ; inclut des champs d'audit pour suivre la création et la dernière modification. |

Voir aussi : [melis-core](/fr/reference/modules/melis-core)
