const express = require('express');
const router = express.Router();
const { exportVideoSequence } = require('../services/videoService');
const path = require('path');
const multer = require('multer');

// Configuration de multer pour les uploads temporaires
const storage = multer.diskStorage({
    destination: './temp/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Route pour exporter une séquence vidéo
router.post('/sequence', upload.array('videos'), async (req, res) => {
    try {
        const videos = req.files.map(file => ({
            path: file.path,
            name: file.originalname
        }));

        const sequence = JSON.parse(req.body.sequence);
        const outputDir = path.join(__dirname, '../../exports');
        
        // Exporter la séquence
        const outputPath = await exportVideoSequence({
            videos,
            sequence
        }, outputDir);

        // Envoyer le fichier
        res.download(outputPath, 'sequence_finale.mp4', (err) => {
            if (err) {
                console.error('Erreur lors de l\'envoi du fichier:', err);
            }
            
            // Nettoyer les fichiers temporaires
            videos.forEach(video => {
                try {
                    fs.unlinkSync(video.path);
                } catch (e) {
                    console.error('Erreur lors du nettoyage:', e);
                }
            });
        });
    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
