# Topo Bidoigt — PWA V1

## Fonctionnalités
- 83 voies chargées depuis `voies.json`
- filtres par niveau, ligne et suivi personnel
- fiche voie : Moulinette, En tête, commentaire
- sauvegarde locale dans le navigateur (`localStorage`)
- export/import du carnet personnel en JSON
- installation sur l'écran d'accueil
- fonctionnement hors ligne après la première ouverture

## Tester sur un ordinateur
Le fichier `voies.json` doit être servi par HTTP. Ne pas ouvrir `index.html` directement.

Avec Python installé :

    python -m http.server 8080

Puis ouvrir `http://localhost:8080`.

## Publier gratuitement
### GitHub Pages
1. Créer un dépôt public GitHub.
2. Déposer tous les fichiers de ce dossier à la racine.
3. Dans Settings > Pages, choisir Deploy from a branch, branche `main`, dossier `/root`.
4. Communiquer l'adresse HTTPS générée aux adhérents.

### Installation utilisateur
- Android/Chrome : ouvrir l'adresse puis utiliser `Installer l'application` ou `Ajouter à l'écran d'accueil`.
- iPhone/Safari : bouton Partager puis `Sur l'écran d'accueil`.

## Données et mises à jour
- `voies.json` contient le topo commun.
- `localStorage` contient uniquement le suivi personnel sur chaque appareil.
- Une mise à jour du topo ne remplace pas le suivi local tant que les ID des voies restent stables.
- Pour forcer la mise à jour hors ligne après modification des fichiers, changer `topo-bidoigt-v1` en `topo-bidoigt-v2` dans `service-worker.js`.

## Limite importante
Effacer les données du navigateur ou désinstaller la PWA peut supprimer le carnet local. Utiliser régulièrement `Exporter ma sauvegarde`.
