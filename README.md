# Atelier Numéro

Transformez une photo en coloriage par numéros, directement dans votre navigateur.

- Import depuis les photos ou l’appareil photo sur téléphone.
- Aperçus photo, couleurs et coloriage, avec réglages des couleurs, de la fusion et des détails.
- Nuancier avec noms français et numéros, inclus dans les exports PNG et SVG.
- Mode « Au feutre » pour essayer le coloriage.
- Aucun envoi des photos, aucun compte nécessaire pour utiliser l’atelier.

## Publication gratuite sur GitHub Pages

Ce dépôt est prévu pour GitHub Pages avec un dépôt public et GitHub Free.

1. Créez un dépôt public `atelier-numero` sur votre compte GitHub.
2. Ajoutez les fichiers de ce dossier à la racine du dépôt.
3. Dans **Settings → Pages → Build and deployment**, choisissez **Deploy from a branch**.
4. Choisissez la branche **main** et le dossier **/docs**, puis **Save**.

Les modifications de la branche sont ensuite publiées automatiquement.

L’adresse sera `https://VOTRE-COMPTE.github.io/atelier-numero/`.
Votre ordinateur peut être éteint : GitHub sert les fichiers et le téléphone fait les calculs.

Les photos ne sont pas enregistrées dans le dépôt. Le site et son code source sont publics.
GitHub peut journaliser les visites au site ; l’application n’intègre aucune télémétrie.

## Utilisation locale

Depuis le dossier `docs`, exécutez `python3 -m http.server 8765 --bind 127.0.0.1`, puis ouvrez `http://localhost:8765`.
Aucune dépendance JavaScript, clé API ou serveur de traitement n’est nécessaire.

## Formats et lisibilité

La lecture des fichiers HEIC dépend du navigateur : choisissez la photo depuis Photos ou utilisez une copie JPG si elle n’est pas reconnue.
La fusion agrandit les petites zones. Les régions trop fines peuvent ne pas porter de numéro : augmentez la fusion ou réduisez les détails.
Les noms de couleurs sont approximatifs et ne correspondent pas à un fabricant de feutres.

Photo d’exemple : [Unsplash](https://images.unsplash.com/photo-1470770841072-f978cf4d019e).
