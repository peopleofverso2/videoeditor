const express = require('express');
const multer = require('multer');
const path = require('path');
const os = require('os');

const app = express();
const port = 3000;

// Configuration de multer pour sauvegarder sur le bureau
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const desktopPath = path.join(os.homedir(), 'Desktop');
        cb(null, desktopPath);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Servir les fichiers statiques
app.use(express.static('.'));

// Route pour sauvegarder le projet
app.post('/save-project', upload.single('file'), (req, res) => {
    try {
        console.log('Fichier sauvegardé:', req.file.path);
        res.json({ success: true, path: req.file.path });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        res.status(500).json({ error: error.message });
    }
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
