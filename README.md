# Plugins Horizon

Le catalogue des plugins du launcher [Horizon](https://github.com/Voltingg/horizon) pour BlablaFantasy.

## Installer un plugin

Dans Horizon : menu **Plugins** (écran de connexion ou barre du jeu), section **Catalogue**, bouton **Installer**. Le plugin est activé tout de suite, ses réglages (raccourcis…) apparaissent sous lui.

Les plugins installés se mettent à jour tout seuls depuis ce dépôt : au lancement d'Horizon, puis toutes les 4 heures.

## Plugins disponibles

<!-- CATALOGUE -->
| Plugin | Auteur | Version | Horizon | Description |
|---|---|---|---|---|
| **Anti-pluie** (`anti-pluie`) | Volting | 1.0.1 | 0.3.2 et plus | Coupe la pluie et la neige (et leur son), quelle que soit la qualité (Ruffle natif). Son état s'affiche dans la barre du jeu. |
| **Jetpack** (`jetpack`) | Volting | 1.1.1 | 0.3.2 et plus | Active ou coupe le jetpack d’un raccourci (Alt+V par défaut) (le légendaire en priorité). |
| **Prévisions météo** (`previsions-meteo`) | Volting | 1.1.0 | 0.3.3 et plus | Annonce la pluie, la neige, les orages et le brouillard de la map à venir (jusqu'à 6 h), calculés comme le jeu les calcule. Dans la barre du jeu, avec une alerte avant l'arrivée si vous le voulez. |
| **Téléporteur** (`teleporteur`) | Volting | 1.1.1 | 0.3.2 et plus | Ouvre la carte du téléporteur d’un raccourci (Alt+T par défaut) (le légendaire en priorité). |
<!-- /CATALOGUE -->

## Écrire un plugin

Chaque version d'un plugin est un dossier `plugins/<id>/versions/<version>/` contenant deux fichiers :

```
plugins/mon-plugin/versions/1.0.0/
  plugin.json   {"name": "Mon plugin", "description": "Ce qu'il fait.", "version": "1.0.0",
                 "author": "Votre pseudo", "minVersion": "0.3.3"}
  main.js       le code
```

Le nom du dossier du plugin sert d'identifiant : minuscules, chiffres et tirets.

`name`, `version` (le nom du dossier de la version, x.y.z), `author` (votre pseudo, affiché dans Horizon) et `minVersion` (la plus ancienne version d'Horizon avec laquelle il marche, x.y.z) sont obligatoires. Les anciennes versions restent dans `versions/` : chaque joueur reçoit la plus récente que son Horizon accepte, donc un plugin n'a jamais à garder de code pour les anciens Horizon. `plugin.json` peut aussi déclarer des `"settings"`, réglages affichés sous le plugin dans le menu **Plugins** :

```json
"settings": [
  { "id": "toggleKey", "type": "key", "label": "Raccourci", "default": "Alt+B" },
  { "id": "notify", "type": "boolean", "label": "Prévenir", "default": true },
  { "id": "mode", "type": "select", "label": "Mode", "default": "doux",
    "options": [{ "value": "doux", "label": "Doux" }, { "value": "fort", "label": "Fort" }] },
  { "id": "texte", "type": "text", "label": "Message" },
  { "id": "nombre", "type": "number", "label": "Combien", "default": 3, "help": "Une explication courte." }
]
```

Types : `key` (une combinaison, saisie en l'appuyant), `boolean`, `select`, `text`, `number`. 30 réglages au plus.

### Ce qu'un plugin peut faire

`main.js` tourne isolé (un Web Worker) : pas de page, pas d'accès aux réglages, aux identifiants ni aux fichiers. Il dispose seulement de l'objet `horizon` :

| Appel | Effet |
|---|---|
| `horizon.onKey('Alt+V', fonction)` | Appelle `fonction` quand la combinaison est pressée en jeu. Touches : lettres, chiffres, `Espace`, `F1` à `F12`. Lettres, chiffres et Espace exigent `Alt` ou `Ctrl`, car la barre de chat a toujours le clavier. Modificateurs : `Ctrl`, `Alt`, `Maj`. F5, F11 et F12 sont réservées au launcher. |
| `await horizon.game.useObject([11, 134])` | Utilise le premier de ces objets présent dans l'inventaire, exactement comme un clic sur son icône : le jeu garde ses propres règles. Renvoie `"ok"`, `"absent"`, `"pas-pret"` ou `"trop-vite"` (au-delà de 5 appels par seconde). |
| `await horizon.game.blockRain(true)` | Coupe la pluie et la neige (et leur son), quelle que soit la qualité ; `false` les remet. Dure tant que le plugin tourne. Renvoie `"ok"`, `"non-supporte"`, `"pas-pret"` ou `"trop-vite"`. |
| `await horizon.game.weather(3)` | Prévisions de la map, calculées comme le jeu (jusqu'à 6 h) : `{ now, mapId, weather, serverStorm, points: [{ t, rain, snow, lightning, fog, cloud }] }`, un point par minute, heures en temps du serveur (ms). `weather` faux : pas de météo sur cette map ; `rain`, `snow`, `fog`, `cloud` de 0 à 1, `lightning` en éclairs par minute ; `serverStorm` : heure d'un orage annoncé par le serveur. Ou `"pas-pret"`, `"non-supporte"`, `"trop-vite"`. |
| `horizon.setting('id')` | Valeur actuelle d'un réglage du plugin. |
| `horizon.onSetting('id', fonction)` | Appelle `fonction(valeur)` quand le joueur change ce réglage. |
| `horizon.onKeySetting('id', fonction)` | Comme `onKey`, avec la combinaison du réglage `id` (type `key`) ; suit ses changements. |
| `horizon.status.set('texte', { tone: 'ok' })` | Affiche l'état du plugin dans la barre du jeu (`tone` : `ok`, `warn`, `off` ou rien) ; `horizon.status.clear()` le retire. |
| `await horizon.chat.print('texte')` | Ajoute une ligne d'info dans le chat du joueur, vue par lui seul (rien n'est envoyé au serveur) : `[HORIZON - nom du plugin] texte`, le préfixe étant ajouté par Horizon. Texte brut, 500 caractères au plus. Renvoie `"ok"`, `"non-supporte"`, `"pas-pret"` ou `"trop-vite"`. Horizon 0.3.3 et plus. |
| `horizon.notify('texte')` | Court message dans la barre du launcher. |
| `horizon.log(...)` | Journal du launcher. |

Les identifiants d'objets (`objectId`) sont ceux du jeu. Jetpacks : 453 (légendaire), 11, 134 (Noël), 57 (Blibli). Téléporteurs : 464 (légendaire), 3.

Exemples : les `main.js` de `plugins/*/versions/*/`.

### Tester avant de publier

Dans Horizon : **Plugins > Importer un plugin…**, puis choisir le dossier de la version. Il reste désactivé tant qu'il n'est pas coché.

### Publier

1. Ajouter un dossier `plugins/<id>/versions/<nouvelle version>/` (une version publiée ne se modifie plus), avec `version` et `minVersion` à jour dans son `plugin.json`. Un `minVersion` plus récent qu'avant si le plugin se sert d'une nouveauté d'Horizon.
2. Régénérer le catalogue : `node tools/build-index.mjs` (vérifie chaque version, met à jour `index.json` et le tableau ci-dessus). Ne pas modifier à la main `plugins/<id>/plugin.json` et `main.js` : c'est la copie lue par Horizon 0.3.2, recopiée par le script.
3. Proposer le tout par une pull request.

Horizon n'installe un plugin que si ses fichiers correspondent exactement à l'empreinte SHA-256 inscrite dans `index.json`.
