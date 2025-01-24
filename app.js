document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let connections = [];
    let activePoint = null;
    let currentNode = null;
    let isPlaying = false;

    // Éléments DOM
    const graphContainer = document.getElementById('graphContainer');
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');

    // Import de fichiers
    fileInput.addEventListener('change', handleFileSelect);
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    dropZone.addEventListener('click', () => fileInput.click());

    function handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('video/'));
        handleFiles(files);
    }

    function handleDragOver(e) {
        e.preventDefault();
        dropZone.classList.add('dragover');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    }

    function handleDrop(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('video/'));
        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length === 0) return;

        // Afficher le conteneur de graphe et masquer la zone de drop
        graphContainer.style.display = 'block';
        dropZone.style.display = 'none';

        // Créer les nœuds
        files.forEach((file, index) => {
            createSceneNode(file, index * 300 + 100, 100);
        });
    }

    function createSceneNode(videoFile, x, y) {
        const node = document.createElement('div');
        node.className = 'scene-node';
        node.id = 'scene_' + Date.now();
        node.style.left = x + 'px';
        node.style.top = y + 'px';

        node.innerHTML = `
            <div class="video-container">
                <video class="preview-video" preload="metadata"></video>
                <div class="video-controls">
                    <button class="play-btn">▶️</button>
                    <button class="play-sequence-btn">⏯️</button>
                    <button class="fullscreen-btn">🔲</button>
                </div>
            </div>
            <div class="title">${videoFile.name}</div>
            <div class="connection-point top"></div>
            <div class="connection-point bottom"></div>
            <button class="delete-btn">🗑️</button>
        `;

        // Configurer la vidéo
        const video = node.querySelector('video');
        video.src = URL.createObjectURL(videoFile);

        // Contrôles vidéo
        setupVideoControls(node);

        // Points de connexion
        setupConnectionPoints(node);

        // Suppression
        setupDeleteButton(node);

        // Drag and drop
        makeDraggable(node);

        // Ajouter au conteneur
        graphContainer.appendChild(node);
        return node;
    }

    function setupVideoControls(node) {
        const video = node.querySelector('video');
        const playBtn = node.querySelector('.play-btn');
        const playSequenceBtn = node.querySelector('.play-sequence-btn');
        const fullscreenBtn = node.querySelector('.fullscreen-btn');

        playBtn.onclick = (e) => {
            e.stopPropagation();
            if (video.paused) {
                // Arrêter les autres vidéos
                document.querySelectorAll('.scene-node video').forEach(v => {
                    if (v !== video) {
                        v.pause();
                        v.currentTime = 0;
                        const btn = v.closest('.scene-node').querySelector('.play-btn');
                        btn.textContent = '▶️';
                    }
                });
                video.play();
                playBtn.textContent = '⏸️';
            } else {
                video.pause();
                playBtn.textContent = '▶️';
            }
        };

        playSequenceBtn.onclick = (e) => {
            e.stopPropagation();
            if (isPlaying && currentNode === node) {
                stopSequence();
            } else {
                startSequence(node);
            }
        };

        fullscreenBtn.onclick = (e) => {
            e.stopPropagation();
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                video.requestFullscreen();
            }
        };

        video.onended = () => {
            playBtn.textContent = '▶️';
        };

        // Gérer les changements de plein écran
        video.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                video.style.objectFit = 'contain';
            } else {
                video.style.objectFit = 'contain';
            }
        });
    }

    function setupConnectionPoints(node) {
        const points = node.querySelectorAll('.connection-point');
        points.forEach(point => {
            point.onclick = (e) => {
                e.stopPropagation();
                handleConnection(point);
            };
        });
    }

    function handleConnection(point) {
        if (!activePoint) {
            activePoint = point;
            point.classList.add('active');
        } else if (activePoint !== point) {
            const startPoint = activePoint.classList.contains('bottom') ? activePoint : point;
            const endPoint = activePoint.classList.contains('bottom') ? point : activePoint;

            if (startPoint.classList.contains('bottom') && endPoint.classList.contains('top')) {
                const startNode = startPoint.closest('.scene-node');
                const endNode = endPoint.closest('.scene-node');

                if (startNode !== endNode) {
                    // Supprimer les connexions existantes depuis le point de départ
                    connections = connections.filter(conn => {
                        if (conn.source === startNode.id) {
                            conn.line.remove();
                            return false;
                        }
                        return true;
                    });

                    // Créer la nouvelle connexion
                    const line = new LeaderLine(startPoint, endPoint, {
                        color: '#4CAF50',
                        size: 2,
                        path: 'straight',
                        startSocket: 'bottom',
                        endSocket: 'top'
                    });

                    const connection = {
                        source: startNode.id,
                        target: endNode.id,
                        line: line
                    };

                    connections.push(connection);
                }
            }

            activePoint.classList.remove('active');
            point.classList.remove('active');
            activePoint = null;
        }
    }

    function setupDeleteButton(node) {
        const deleteBtn = node.querySelector('.delete-btn');
        deleteBtn.onclick = () => {
            // Supprimer les connexions
            connections = connections.filter(conn => {
                if (conn.source === node.id || conn.target === node.id) {
                    conn.line.remove();
                    return false;
                }
                return true;
            });

            // Supprimer le nœud
            node.remove();

            // Réafficher la zone de drop si plus aucun nœud
            if (document.querySelectorAll('.scene-node').length === 0) {
                graphContainer.style.display = 'none';
                dropZone.style.display = 'flex';
            }
        };
    }

    function makeDraggable(element) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        element.addEventListener('mousedown', e => {
            if (e.target.closest('button') || e.target.closest('.connection-point')) {
                return;
            }

            isDragging = true;
            element.classList.add('dragging');

            const rect = element.getBoundingClientRect();
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;

            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', onRelease);
        });

        function onDrag(e) {
            if (!isDragging) return;

            e.preventDefault();

            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            element.style.left = currentX + 'px';
            element.style.top = currentY + 'px';

            // Mettre à jour les connexions
            requestAnimationFrame(() => {
                connections.forEach(conn => {
                    if (conn.source === element.id || conn.target === element.id) {
                        conn.line.position();
                    }
                });
            });
        }

        function onRelease() {
            isDragging = false;
            element.classList.remove('dragging');
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', onRelease);
        }
    }

    async function startSequence(node) {
        console.log('Démarrage de la séquence');
        isPlaying = true;
        await playSequence(node);
    }

    // Ajouter un élément vidéo dédié au plein écran
    const fullscreenVideo = document.createElement('video');
    fullscreenVideo.style.display = 'none';
    fullscreenVideo.style.width = '100%';
    fullscreenVideo.style.height = '100%';
    document.body.appendChild(fullscreenVideo);

    async function playSequence(node) {
        console.log('Lecture du nœud:', node.id);
        
        const sourceVideo = node.querySelector('video');
        if (!sourceVideo) {
            console.error('Pas de vidéo trouvée');
            return;
        }

        try {
            // Copier la source vers la vidéo plein écran
            fullscreenVideo.src = sourceVideo.src;
            fullscreenVideo.currentTime = 0;
            
            // Démarrer la vidéo en plein écran
            fullscreenVideo.style.display = 'block';
            await fullscreenVideo.play();
            try {
                await fullscreenVideo.requestFullscreen();
            } catch (e) {
                console.log('Erreur plein écran, on continue:', e);
            }

            // Attendre la fin
            await new Promise(resolve => {
                fullscreenVideo.onended = () => {
                    console.log('Vidéo terminée');
                    resolve();
                };
            });

            // Chercher la suivante
            const next = connections.find(c => c.source === node.id);
            console.log('Prochaine connexion trouvée:', next);

            if (next) {
                const nextNode = document.getElementById(next.target);
                if (nextNode) {
                    console.log('Lecture du prochain nœud');
                    await playSequence(nextNode);
                }
            }

            // Si c'est la dernière vidéo ou s'il n'y a pas de suivante
            if (!next) {
                console.log('Fin de la séquence');
                fullscreenVideo.style.display = 'none';
                if (document.fullscreenElement) {
                    await document.exitFullscreen();
                }
                stopSequence();
            }
        } catch (error) {
            console.error('Erreur:', error);
            fullscreenVideo.style.display = 'none';
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            }
            stopSequence();
        }
    }

    function stopSequence() {
        console.log('Arrêt de la séquence');
        isPlaying = false;
        
        fullscreenVideo.pause();
        fullscreenVideo.currentTime = 0;
        fullscreenVideo.style.display = 'none';
        
        document.querySelectorAll('.scene-node video').forEach(video => {
            video.pause();
            video.currentTime = 0;
        });
    }

    // Ajouter les boutons dans la toolbar
    const toolbar = document.querySelector('.toolbar');
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Sauvegarder';
    saveBtn.onclick = saveProject;
    toolbar.appendChild(saveBtn);

    const loadBtn = document.createElement('button');
    loadBtn.textContent = '📂 Charger';
    loadBtn.onclick = () => loadInput.click();
    toolbar.appendChild(loadBtn);

    const loadInput = document.createElement('input');
    loadInput.type = 'file';
    loadInput.accept = '.pov';
    loadInput.style.display = 'none';
    loadInput.onchange = loadProject;
    toolbar.appendChild(loadInput);

    async function saveProject() {
        try {
            // Préparer la liste des vidéos
            const videoList = Array.from(document.querySelectorAll('.scene-node'))
                .map(node => node.querySelector('.title').textContent)
                .join('\n');

            // Demander le nom du projet
            const projectName = await new Promise((resolve) => {
                const dialog = document.createElement('div');
                dialog.className = 'modal';
                dialog.innerHTML = `
                    <div class="modal-content">
                        <h2>💾 Sauvegarder le projet</h2>
                        <div class="modal-field">
                            <label for="projectName">Nom du projet :</label>
                            <input type="text" id="projectName" placeholder="Nom du projet" 
                                   value="projet_video_${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="modal-field">
                            <label>Vidéos dans le projet :</label>
                            <div class="video-sequence">${videoList || 'Aucune vidéo'}</div>
                        </div>
                        <div class="modal-buttons">
                            <button id="cancelSave">Annuler</button>
                            <button id="confirmSave">Sauvegarder</button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(dialog);
                
                const input = dialog.querySelector('#projectName');
                const confirmBtn = dialog.querySelector('#confirmSave');
                const cancelBtn = dialog.querySelector('#cancelSave');
                
                input.focus();
                input.select();
                
                confirmBtn.onclick = () => {
                    const name = input.value.trim();
                    if (name) {
                        document.body.removeChild(dialog);
                        resolve(name);
                    }
                };
                
                cancelBtn.onclick = () => {
                    document.body.removeChild(dialog);
                    resolve(null);
                };
                
                input.onkeyup = (e) => {
                    if (e.key === 'Enter' && input.value.trim()) {
                        confirmBtn.click();
                    } else if (e.key === 'Escape') {
                        cancelBtn.click();
                    }
                };
            });
            
            if (!projectName) return; // Annulé par l'utilisateur
            
            // Récupérer les données des nœuds et les fichiers vidéo
            const nodes = [];
            const videoFiles = new Map();
            
            for (const node of document.querySelectorAll('.scene-node')) {
                const videoElement = node.querySelector('video');
                const videoUrl = videoElement.src;
                const videoName = node.querySelector('.title').textContent;
                
                nodes.push({
                    id: node.id,
                    videoName: videoName,
                    videoPath: 'videos/' + videoName,
                    position: {
                        left: node.style.left,
                        top: node.style.top
                    }
                });

                videoFiles.set(videoName, videoUrl);
            }

            // Récupérer les connexions
            const savedConnections = connections.map(conn => ({
                source: conn.source,
                target: conn.target
            }));

            console.log('Sauvegarde des connexions:', savedConnections);

            // Créer l'objet projet
            const project = {
                nodes: nodes,
                connections: savedConnections,
                version: "1.0"
            };

            // Créer un objet JSZip
            const zip = new JSZip();
            zip.file('project.json', JSON.stringify(project, null, 2));

            // Créer un dossier pour les vidéos
            const videosFolder = zip.folder('videos');

            // Ajouter chaque vidéo
            for (const [name, url] of videoFiles) {
                try {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    videosFolder.file(name, blob);
                } catch (error) {
                    console.error('Erreur lors de la récupération de la vidéo:', name, error);
                }
            }

            // Générer le fichier ZIP
            const content = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 5
                }
            });

            // Télécharger le fichier
            const downloadUrl = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = projectName + '.pov';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);

        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            alert('Erreur lors de la sauvegarde du projet');
        }
    }

    async function loadProject(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Lire le fichier ZIP
            const zip = await JSZip.loadAsync(file);
            
            // Lire le fichier project.json
            const projectJson = await zip.file('project.json').async('text');
            const project = JSON.parse(projectJson);

            console.log('Projet chargé:', project);
            console.log('Connexions à restaurer:', project.connections);

            // Nettoyer l'interface
            document.querySelectorAll('.scene-node').forEach(node => node.remove());
            connections.forEach(conn => conn.line.remove());
            connections = [];

            // Créer un Map pour stocker les nœuds par ID
            const nodesById = new Map();

            // Charger et créer les nœuds
            for (const nodeData of project.nodes) {
                // Extraire la vidéo du ZIP
                const videoFile = await zip.file('videos/' + nodeData.videoName).async('blob');
                const videoUrl = URL.createObjectURL(videoFile);

                const node = document.createElement('div');
                node.className = 'scene-node';
                node.id = nodeData.id;
                node.style.left = nodeData.position.left;
                node.style.top = nodeData.position.top;

                node.innerHTML = `
                    <div class="video-container">
                        <video class="preview-video" preload="metadata" src="${videoUrl}"></video>
                        <div class="video-controls">
                            <button class="play-btn">▶️</button>
                            <button class="play-sequence-btn">⏯️</button>
                            <button class="fullscreen-btn">🔲</button>
                        </div>
                    </div>
                    <div class="title">${nodeData.videoName}</div>
                    <div class="connection-point top"></div>
                    <div class="connection-point bottom"></div>
                    <button class="delete-btn">🗑️</button>
                `;

                setupVideoControls(node);
                setupConnectionPoints(node);
                setupDeleteButton(node);
                makeDraggable(node);

                graphContainer.appendChild(node);
                nodesById.set(nodeData.id, node);
            }

            console.log('Nœuds restaurés:', nodesById);

            // Afficher le conteneur de graphe
            graphContainer.style.display = 'block';
            dropZone.style.display = 'none';

            // Attendre que le DOM soit complètement mis à jour
            await new Promise(resolve => setTimeout(resolve, 100));

            // Recréer les connexions
            for (const conn of project.connections) {
                const startNode = nodesById.get(conn.source);
                const endNode = nodesById.get(conn.target);
                
                if (startNode && endNode) {
                    const startPoint = startNode.querySelector('.connection-point.bottom');
                    const endPoint = endNode.querySelector('.connection-point.top');

                    const line = new LeaderLine(startPoint, endPoint, {
                        color: '#4CAF50',
                        size: 2,
                        path: 'straight',
                        startSocket: 'bottom',
                        endSocket: 'top'
                    });

                    connections.push({
                        source: conn.source,
                        target: conn.target,
                        line: line
                    });
                }
            }

            // Forcer une mise à jour des lignes
            window.dispatchEvent(new Event('resize'));
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            alert('Erreur lors du chargement du projet');
        }
    }

    // Annuler la connexion avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cancelConnection();
        }
    });
});
