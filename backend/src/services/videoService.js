const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

async function concatenateVideos(videoFiles, outputPath) {
    return new Promise((resolve, reject) => {
        // Créer un fichier de liste pour ffmpeg
        const listPath = path.join(path.dirname(outputPath), 'filelist.txt');
        const fileList = videoFiles.map(file => `file '${file}'`).join('\n');
        fs.writeFileSync(listPath, fileList);

        ffmpeg()
            .input(listPath)
            .inputOptions(['-f', 'concat', '-safe', '0'])
            .outputOptions('-c copy')
            .output(outputPath)
            .on('end', () => {
                fs.unlinkSync(listPath); // Nettoyer le fichier de liste
                resolve(outputPath);
            })
            .on('error', (err) => {
                fs.unlinkSync(listPath); // Nettoyer en cas d'erreur
                reject(err);
            })
            .run();
    });
}

async function exportVideoSequence(sequence, outputDir) {
    try {
        // Créer le dossier de sortie s'il n'existe pas
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, 'video_sequence.mp4');
        
        // Concaténer les vidéos dans l'ordre de la séquence
        await concatenateVideos(sequence.map(video => video.path), outputPath);
        
        return outputPath;
    } catch (error) {
        console.error('Erreur lors de l\'export de la séquence:', error);
        throw error;
    }
}

module.exports = {
    exportVideoSequence
};
