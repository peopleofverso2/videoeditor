const express = require('express');
const multer = require('multer');
const path = require('path');
const os = require('os');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
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

// Route pour l'export MP4
app.post('/export', async (req, res) => {
  const { videoUrls, transitions } = req.body;
  const outputPath = path.join(__dirname, 'output.mp4');

  try {
    let command = ffmpeg();

    // Ajouter chaque vidéo à la commande
    videoUrls.forEach((url, index) => {
      command = command.input(url);
      
      // Ajouter une transition si ce n'est pas la dernière vidéo
      if (index < videoUrls.length - 1 && transitions[index]) {
        command = command.input(transitions[index]);
      }
    });

    // Configurer la sortie
    command
      .on('end', () => {
        res.download(outputPath, 'video_export.mp4', (err) => {
          if (err) {
            console.error('Erreur lors du téléchargement:', err);
          }
          // Nettoyer le fichier après le téléchargement
          fs.unlink(outputPath, () => {});
        });
      })
      .on('error', (err) => {
        console.error('Erreur lors de l\'export:', err);
        res.status(500).json({ error: 'Erreur lors de l\'export' });
      })
      .mergeToFile(outputPath);

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
