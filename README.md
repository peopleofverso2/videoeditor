# Éditeur de Vidéos Interactives

Un éditeur de vidéos interactives basé sur un système de cartes et de nœuds, permettant de créer des expériences vidéo non linéaires.

## Fonctionnalités

- Interface de graphe pour visualiser et éditer la structure du projet
- Éditeur de timeline pour chaque scène
- Support pour les transitions interactives
- Analyse vidéo assistée par IA
- Collaboration en temps réel
- Export en formats multiples (MP4, HTML5)

## Prérequis

- Node.js >= 16
- MongoDB
- FFmpeg
- npm ou yarn

## Installation

1. Cloner le repository :
```bash
git clone [url-du-repo]
cd interactive-video-editor
```

2. Installer les dépendances du backend :
```bash
cd backend
npm install
```

3. Installer les dépendances du frontend :
```bash
cd ../frontend
npm install
```

4. Configurer les variables d'environnement :
```bash
# Dans le dossier backend
cp .env.example .env
# Éditer .env avec vos configurations
```

5. Démarrer le serveur de développement :
```bash
# Dans le dossier backend
npm run dev

# Dans le dossier frontend
npm start
```

## Structure du Projet

```
interactive-video-editor/
├── frontend/
│   ├── src/
│   │   ├── components/    # Composants React réutilisables
│   │   ├── pages/        # Pages de l'application
│   │   ├── utils/        # Fonctions utilitaires
│   │   └── services/     # Services API et WebSocket
│   └── public/           # Assets statiques
└── backend/
    ├── src/
    │   ├── routes/       # Routes API
    │   ├── controllers/  # Logique métier
    │   ├── models/       # Modèles MongoDB
    │   └── services/     # Services (IA, FFmpeg, etc.)
    └── config/           # Configuration
```

## Technologies Utilisées

- Frontend:
  - React
  - React Flow (graphe de nœuds)
  - Material-UI
  - Socket.IO Client

- Backend:
  - Node.js
  - Express
  - MongoDB
  - Socket.IO
  - FFmpeg
  - Google Cloud Video Intelligence API
