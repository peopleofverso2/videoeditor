const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const os = require('os');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Configuration de multer pour les uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Routes
const exportRoutes = require('./backend/src/routes/export');
app.use('/api/export', exportRoutes);

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

// Créer les dossiers nécessaires
['uploads', 'exports', 'temp/uploads'].forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
