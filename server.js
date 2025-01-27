const express = require('express');
const multer = require('multer');
const path = require('path');
const os = require('os');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { promisify } = require('util');
const pipeline = promisify(require('stream').pipeline);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Fonction pour sauvegarder les données base64 en fichier
async function saveBase64ToFile(base64Data, outputPath) {
    // Enlever le préfixe data:video/mp4;base64,
    const base64Video = base64Data.replace(/^data:video\/mp4;base64,/, '');
    const videoBuffer = Buffer.from(base64Video, 'base64');
    fs.writeFileSync(outputPath, videoBuffer);
}

// Map pour stocker les fichiers temporaires par session
const tempFiles = new Map();

// Fonction pour découper le texte en lignes de largeur similaire
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + ' ' + word).width;
        if (width < maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

// Route pour démarrer une nouvelle session d'export
app.post('/export/start', (req, res) => {
    const sessionId = Date.now().toString();
    const tempDir = path.join(__dirname, 'temp', sessionId);
    fs.mkdirSync(tempDir, { recursive: true });
    tempFiles.set(sessionId, { 
        dir: tempDir, 
        files: [],
        transitions: []
    });
    res.json({ sessionId });
});

// Route pour uploader une vidéo
app.post('/export/upload/:sessionId/:index', async (req, res) => {
    const { sessionId, index } = req.params;
    const { videoData, transitionText } = req.body;
    
    console.log('Upload vidéo:', index, 'Transition:', transitionText);
    
    const session = tempFiles.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session non trouvée' });
    }

    try {
        const tempPath = path.join(session.dir, `video_${index}.mp4`);
        await saveBase64ToFile(videoData, tempPath);
        session.files[parseInt(index)] = tempPath;
        session.transitions[parseInt(index)] = transitionText || null;
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload' });
    }
});

// Route pour finaliser l'export
app.post('/export/finish/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const session = tempFiles.get(sessionId);
    
    if (!session) {
        return res.status(404).json({ error: 'Session non trouvée' });
    }

    const outputPath = path.join(session.dir, 'output.mp4');
    const FPS = 30;

    try {
        // Créer un fichier de liste pour la concaténation
        const concatListPath = path.join(session.dir, 'concat_list.txt');
        const processedFiles = [];
        
        console.log('Transitions:', session.transitions);
        
        // Ajouter chaque vidéo et transition
        for (let index = 0; index < session.files.length; index++) {
            const videoPath = session.files[index];
            if (!videoPath) continue;
            
            console.log('Traitement vidéo:', index);
            
            // Normaliser la vidéo d'entrée
            const normalizedVideoPath = path.join(session.dir, `normalized_${index}.mp4`);
            await new Promise((resolve, reject) => {
                ffmpeg()
                    .input(videoPath)
                    .outputOptions([
                        '-c:v libx264',
                        '-preset medium',
                        '-crf 23',
                        '-pix_fmt yuv420p',
                        '-movflags +faststart',
                        '-s 1920x1080',
                        `-r ${FPS}`,
                        '-an'  // Pas de son
                    ])
                    .output(normalizedVideoPath)
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            });
            
            processedFiles.push(normalizedVideoPath);
            
            // Si il y a une transition après cette vidéo
            if (index < session.files.length - 1 && session.transitions[index]) {
                const transitionText = session.transitions[index];
                console.log('Création transition:', transitionText);
                
                // Créer un dossier temporaire pour les frames
                const framesDir = path.join(session.dir, `transition_frames_${index}`);
                if (!fs.existsSync(framesDir)) {
                    fs.mkdirSync(framesDir);
                }

                // Générer 90 frames pour 3 secondes à 30fps
                const totalFrames = 90;
                const fadeInFrames = 15;  // 0.5 seconde de fade in
                const fadeOutFrames = 15;  // 0.5 seconde de fade out
                const lines = ['Ligne 1', 'Ligne 2', 'Ligne 3'];
                
                for (let frame = 0; frame < totalFrames; frame++) {
                    const framePath = path.join(framesDir, `frame_${frame.toString().padStart(4, '0')}.png`);
                    await new Promise((resolve, reject) => {
                        const { createCanvas } = require('canvas');
                        const canvas = createCanvas(1920, 1080);
                        const ctx = canvas.getContext('2d');
                        
                        // Fond noir
                        ctx.fillStyle = 'black';
                        ctx.fillRect(0, 0, 1920, 1080);
                        
                        // Configuration du texte
                        ctx.font = 'bold 120px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        
                        // Calculer les opacités pour chaque ligne
                        lines.forEach((line, lineIndex) => {
                            let opacity = 1;
                            const lineDelay = lineIndex * 10;  // Délai entre chaque ligne
                            
                            if (frame < fadeInFrames + lineDelay) {
                                // Fade in
                                opacity = (frame - lineDelay) / fadeInFrames;
                            } else if (frame > totalFrames - fadeOutFrames) {
                                // Fade out
                                opacity = (totalFrames - frame) / fadeOutFrames;
                            }
                            
                            opacity = Math.max(0, Math.min(1, opacity));  // Limiter entre 0 et 1
                            
                            // Dessiner le texte avec l'opacité calculée
                            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                            
                            // Position verticale avec espacement
                            const lineHeight = 300;
                            const totalHeight = lines.length * lineHeight;
                            const y = (canvas.height - totalHeight) / 2 + lineHeight / 2 + (lineIndex * lineHeight);
                            
                            ctx.fillText(line, canvas.width / 2, y);
                        });
                        
                        // Sauvegarder l'image
                        const out = fs.createWriteStream(framePath);
                        const stream = canvas.createPNGStream();
                        stream.pipe(out);
                        out.on('finish', resolve);
                        out.on('error', reject);
                    });
                }
                
                // Créer la vidéo à partir des frames
                const transitionVideoPath = path.join(session.dir, `transition_${index}.mp4`);
                await new Promise((resolve, reject) => {
                    ffmpeg()
                        .input(path.join(framesDir, 'frame_%04d.png'))
                        .inputOptions(['-framerate 30'])
                        .outputOptions([
                            '-c:v libx264',
                            '-preset medium',
                            '-crf 23',
                            '-pix_fmt yuv420p',
                            '-movflags +faststart',
                            '-r 30',
                            '-an'  // Pas de son
                        ])
                        .output(transitionVideoPath)
                        .on('end', () => {
                            console.log('Transition créée:', transitionVideoPath);
                            // Nettoyer les frames
                            fs.readdirSync(framesDir).forEach(file => {
                                fs.unlinkSync(path.join(framesDir, file));
                            });
                            fs.rmdirSync(framesDir);
                            resolve();
                        })
                        .on('error', (err) => {
                            console.error('Erreur création transition:', err);
                            reject(err);
                        })
                        .run();
                });
                
                processedFiles.push(transitionVideoPath);
            }
        }

        // Créer le fichier de liste pour la concaténation
        const fileList = processedFiles.map(file => `file '${file}'`).join('\n');
        fs.writeFileSync(concatListPath, fileList);
        
        console.log('Liste de concaténation:', fileList);

        // Concaténer toutes les vidéos
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(concatListPath)
                .inputOptions(['-f concat', '-safe 0'])
                .outputOptions([
                    '-c:v libx264',
                    '-preset medium',
                    '-crf 23',
                    '-pix_fmt yuv420p',
                    '-movflags +faststart',
                    `-r ${FPS}`,
                    '-an'  // Pas de son
                ])
                .output(outputPath)
                .on('end', () => {
                    console.log('Export terminé');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('Erreur lors de l\'export:', err);
                    reject(err);
                })
                .run();
        });

        // Envoyer le fichier
        res.download(outputPath, 'video_export.mp4', (err) => {
            if (err) {
                console.error('Erreur lors du téléchargement:', err);
            }
            // Nettoyer les fichiers
            session.files.forEach(path => {
                if (fs.existsSync(path)) fs.unlinkSync(path);
            });
            // Nettoyer les fichiers normalisés
            for (let i = 0; i < session.files.length; i++) {
                const normalizedPath = path.join(session.dir, `normalized_${i}.mp4`);
                if (fs.existsSync(normalizedPath)) fs.unlinkSync(normalizedPath);
            }
            // Nettoyer les fichiers de transition
            for (let i = 0; i < session.files.length - 1; i++) {
                const transitionPath = path.join(session.dir, `transition_${i}.png`);
                const transitionVideoPath = path.join(session.dir, `transition_${i}.mp4`);
                if (fs.existsSync(transitionPath)) fs.unlinkSync(transitionPath);
                if (fs.existsSync(transitionVideoPath)) fs.unlinkSync(transitionVideoPath);
            }
            if (fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);
            fs.unlinkSync(outputPath);
            fs.rmdirSync(session.dir);
            tempFiles.delete(sessionId);
        });

    } catch (error) {
        console.error('Erreur:', error);
        // Nettoyer en cas d'erreur
        session.files.forEach(path => {
            if (fs.existsSync(path)) fs.unlinkSync(path);
        });
        // Nettoyer les fichiers normalisés
        for (let i = 0; i < session.files.length; i++) {
            const normalizedPath = path.join(session.dir, `normalized_${i}.mp4`);
            if (fs.existsSync(normalizedPath)) fs.unlinkSync(normalizedPath);
        }
        // Nettoyer les fichiers de transition
        for (let i = 0; i < session.files.length - 1; i++) {
            const transitionPath = path.join(session.dir, `transition_${i}.png`);
            const transitionVideoPath = path.join(session.dir, `transition_${i}.mp4`);
            if (fs.existsSync(transitionPath)) fs.unlinkSync(transitionPath);
            if (fs.existsSync(transitionVideoPath)) fs.unlinkSync(transitionVideoPath);
        }
        if (fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);
        if (fs.existsSync(session.dir)) fs.rmdirSync(session.dir);
        tempFiles.delete(sessionId);
        res.status(500).json({ error: 'Erreur lors de l\'export' });
    }
});

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
    const tempDir = path.join(__dirname, 'temp');
    
    try {
        // Créer le dossier temporaire s'il n'existe pas
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        // Télécharger toutes les vidéos localement
        const localPaths = [];
        for (let i = 0; i < videoUrls.length; i++) {
            const tempPath = path.join(tempDir, `video_${i}.mp4`);
            await downloadFile(videoUrls[i], tempPath);
            localPaths.push(tempPath);
        }

        // Créer la commande ffmpeg
        let command = ffmpeg();

        // Ajouter chaque vidéo à la commande
        localPaths.forEach(path => {
            command = command.input(path);
        });

        // Configurer la sortie
        command
            .on('end', () => {
                // Nettoyer les fichiers temporaires
                localPaths.forEach(path => fs.unlinkSync(path));
                fs.rmdirSync(tempDir);

                // Envoyer le fichier
                res.download(outputPath, 'video_export.mp4', (err) => {
                    if (err) {
                        console.error('Erreur lors du téléchargement:', err);
                    }
                    // Nettoyer le fichier de sortie
                    fs.unlinkSync(outputPath);
                });
            })
            .on('error', (err) => {
                console.error('Erreur lors de l\'export:', err);
                // Nettoyer en cas d'erreur
                localPaths.forEach(path => {
                    if (fs.existsSync(path)) fs.unlinkSync(path);
                });
                if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
                res.status(500).json({ error: 'Erreur lors de l\'export' });
            })
            .mergeToFile(outputPath);

    } catch (error) {
        console.error('Erreur:', error);
        // Nettoyer en cas d'erreur
        if (fs.existsSync(tempDir)) {
            fs.readdirSync(tempDir).forEach(file => {
                fs.unlinkSync(path.join(tempDir, file));
            });
            fs.rmdirSync(tempDir);
        }
        res.status(500).json({ error: 'Erreur lors de l\'export' });
    }
});

// Démarrer le serveur
app.listen(3000, () => {
    console.log('Serveur démarré sur http://localhost:3000');
});
