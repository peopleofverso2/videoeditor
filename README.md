# Éditeur de Vidéos Interactif

Un éditeur de vidéos moderne permettant de créer des expériences vidéo interactives avec des choix et des transitions personnalisées.

## Fonctionnalités

### 1. Gestion des Vidéos
- Upload de vidéos par glisser-déposer
- Prévisualisation des vidéos au survol
- Suppression de vidéos
- Affichage en grille responsive

### 2. Transitions entre Vidéos
- Cut (transition directe)
- Fade (fondu au noir)
- Crossfade (fondu enchaîné)
- Durée des transitions personnalisable

### 3. Éditeur de Scénario Interactif
- Interface visuelle avec nœuds et connexions
- Prévisualisation des vidéos au survol des nœuds
- Création de liens entre les vidéos
- Textes personnalisés pour les choix
- Disposition automatique en cercle
- Mini-map pour la navigation

### 4. Lecteur de Scénario
- Mode plein écran
- Affichage des choix à la fin de chaque vidéo
- Navigation interactive dans le scénario
- Transitions fluides entre les vidéos

## Comment utiliser

### Installation
1. Cloner le repository
2. Installer les dépendances :
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```

### Démarrage
1. Démarrer le backend :
   ```bash
   cd backend && npm start
   ```
2. Démarrer le frontend :
   ```bash
   cd frontend && npm run dev
   ```

### Créer un Scénario Interactif
1. Uploader des vidéos en les glissant dans la zone principale
2. Cliquer sur "Éditeur de scénario"
3. Créer des liens entre les vidéos :
   - Cliquer et glisser depuis le point bleu en bas d'une vidéo
   - Déposer sur le point bleu en haut d'une autre vidéo
   - Entrer le texte du choix
4. Tester le scénario avec le bouton "Lire le scénario"

### Astuces
- Survolez une vidéo dans l'éditeur pour la prévisualiser
- Utilisez la mini-map pour naviguer dans les grands scénarios
- Les transitions sont personnalisables pour chaque lien
- Le mode plein écran offre une meilleure expérience de visionnage

## Technologies Utilisées
- React + Vite
- Material-UI
- ReactFlow pour l'éditeur de nœuds
- Express.js pour le backend
- Multer pour la gestion des uploads

## Version
Version actuelle : 3.0.0

## Licence
MIT
