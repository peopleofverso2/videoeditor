#!/bin/bash

case "$1" in
    "save")
        echo "📦 Sauvegarde des modifications..."
        git add .
        git commit -m "Sauvegarde: $2"
        echo "✅ Modifications sauvegardées!"
        ;;
    "restore")
        echo "🔄 Retour à la version stable v1.1..."
        git checkout v1.1-stable
        echo "✅ Version stable restaurée!"
        ;;
    "continue")
        echo "👨‍💻 Retour à la branche de développement..."
        git checkout dev-stable
        echo "✅ Vous pouvez continuer à travailler!"
        ;;
    "start")
        echo "🚀 Démarrage du serveur..."
        npm install
        node server.js
        ;;
    *)
        echo "📚 Utilisation:"
        echo "  ./manage.sh save 'message'  - Sauvegarde vos modifications"
        echo "  ./manage.sh restore         - Revient à la version stable v1.1"
        echo "  ./manage.sh continue        - Retourne à votre branche de développement"
        echo "  ./manage.sh start           - Démarre le serveur"
        ;;
esac
