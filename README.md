# Topo Bidoigt — PWA V1.2

## Nouveautés
- option « Enchaînée ? » à droite de « En moulinette » ;
- option disponible uniquement lorsque « En moulinette » est cochée ;
- désactivation et décochage automatiques lorsque « En moulinette » est décochée ;
- couronne vert fluo autour du badge M lorsqu'une voie est enchaînée en moulinette ;
- fonctionnement symétrique conservé pour « En tête » ;
- suppression du texte d'aide sous les cases pour gagner de la place ;
- migration automatique de l'ancien champ `enchainee` vers `enchaineeTete`.

## Fichiers à publier
Pour passer de V1.1 à V1.2, remplacer à la racine du dépôt GitHub :
- `index.html`
- `app.js`
- `styles.css`
- `service-worker.js`

Ne remplacez pas votre `voies.json` actuel avec celui de cette archive si vous avez déjà ajouté une nouvelle voie directement sur GitHub.

La clé locale reste `topo-bidoigt-carnet-v1`, ce qui conserve les données personnelles existantes. Le cache technique passe à `topo-bidoigt-v1.2`.
