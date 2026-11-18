# Atelier Numéro

Transformez une photo en coloriage par numéros, directement dans votre navigateur.

- Import depuis les photos ou l’appareil photo sur téléphone.
- Aperçus photo, couleurs et coloriage, avec réglages des couleurs, de la fusion et des détails.
- Deux fichiers séparés : coloriage pleine page et nuancier avec noms français et numéros.
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
L’export propose le coloriage numéroté par défaut, avec le nuancier dans un second fichier PNG ou SVG.
Choisissez le papier A5, A4, A3 ou Lettre US, puis l’orientation. Les marges sont de 10 mm et la photo garde ses proportions.
Le PNG propose 150, 300 ou 600 ppp, avec sa résolution physique enregistrée dans le fichier. Il est calculé à la résolution choisie, par bandes pour limiter la mémoire utilisée.
Les chiffres font 8 pt par défaut (réglables de 6 à 12 pt). L’option « Adapter les petites zones aux chiffres » fusionne uniquement dans l’export les zones trop étroites pour le texte ; l’aperçu et le nombre de fusions sont affichés avant téléchargement. Désactivez-la pour conserver la segmentation originale, avec un avertissement si certains chiffres ne tiennent pas.
Pour imprimer à la taille prévue, utilisez le même papier et « Taille réelle / 100 % ». Le bouton Imprimer / PDF prépare deux pages vectorielles au format choisi.
Les noms de couleurs sont approximatifs et ne correspondent pas à un fabricant de feutres.

Photo d’exemple : [Unsplash](https://images.unsplash.com/photo-1470770841072-f978cf4d019e).
