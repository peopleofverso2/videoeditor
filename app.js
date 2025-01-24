document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let connections = [];
    let activePoint = null;
    let currentNode = null;
    let isPlaying = false;
    let currentZoom = 1;

    // Éléments DOM
    const graphContainer = document.getElementById('graphContainer');
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const toolbar = document.querySelector('.toolbar');

    // Initialiser la toolbar
    initToolbar();

    // Créer les conteneurs de zoom une seule fois au démarrage
    const graphContent = document.createElement('div');
    graphContent.className = 'graph-content';
    const zoomContainer = document.createElement('div');
    zoomContainer.className = 'zoom-container';
    graphContent.appendChild(zoomContainer);
    graphContainer.appendChild(graphContent);

    function initToolbar() {
        // Bouton de sauvegarde
        const saveBtn = document.createElement('button');
        saveBtn.textContent = '💾 Sauvegarder';
        saveBtn.onclick = saveProject;
        toolbar.appendChild(saveBtn);

        // Bouton de chargement
        const loadBtn = document.createElement('button');
        loadBtn.textContent = '📂 Charger';
        loadBtn.onclick = () => loadInput.click();
        toolbar.appendChild(loadBtn);

        // Input de chargement caché
        const loadInput = document.createElement('input');
        loadInput.type = 'file';
        loadInput.accept = '.pov';
        loadInput.style.display = 'none';
        loadInput.onchange = loadProject;
        toolbar.appendChild(loadInput);

        // Contrôles de zoom
        const zoomControls = document.createElement('div');
        zoomControls.className = 'zoom-controls';
        zoomControls.innerHTML = `
            <button id="zoomOut">➖</button>
            <span class="zoom-level">100%</span>
            <button id="zoomIn">➕</button>
            <button id="resetZoom">🔄</button>
        `;
        toolbar.appendChild(zoomControls);

        // Initialiser les contrôles de zoom
        const zoomLevel = zoomControls.querySelector('.zoom-level');
        
        zoomControls.querySelector('#zoomIn').onclick = () => {
            currentZoom = Math.min(currentZoom + 0.1, 2);
            updateZoom();
        };
        
        zoomControls.querySelector('#zoomOut').onclick = () => {
            currentZoom = Math.max(currentZoom - 0.1, 0.5);
            updateZoom();
        };
        
        zoomControls.querySelector('#resetZoom').onclick = () => {
            currentZoom = 1;
            updateZoom();
        };
    }

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
        console.log('Fichiers vidéo détectés:', files.length);
        handleFiles(files);
    }

    async function handleFiles(files) {
        if (files.length === 0) return;
        console.log('Traitement de', files.length, 'fichiers');

        // Afficher le conteneur de graphe et masquer la zone de drop
        graphContainer.style.display = 'block';
        dropZone.style.display = 'none';

        // Calculer la disposition en grille
        const margin = 50;
        const nodeWidth = 300;
        const nodeHeight = 200;
        const containerWidth = graphContainer.clientWidth - nodeWidth;
        const nodesPerRow = Math.floor(containerWidth / (nodeWidth + margin)) || 1;

        // Créer les nœuds en grille de manière asynchrone
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const row = Math.floor(i / nodesPerRow);
            const col = i % nodesPerRow;
            const x = col * (nodeWidth + margin) + margin;
            const y = row * (nodeHeight + margin) + margin;
            
            console.log(`Création du nœud ${i + 1}/${files.length} à (${x}, ${y})`);
            
            // Créer le nœud et attendre qu'il soit prêt
            await new Promise((resolve) => {
                const node = createSceneNode(file, x, y);
                const video = node.querySelector('video');
                
                // Attendre que la vidéo soit chargée ou en erreur
                video.onloadedmetadata = () => {
                    console.log('Vidéo chargée:', file.name);
                    resolve();
                };
                video.onerror = () => {
                    console.error('Erreur de chargement vidéo:', file.name);
                    resolve();
                };
                
                // Timeout de sécurité
                setTimeout(resolve, 2000);
            });
            
            // Petite pause entre chaque création
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('Nœuds créés:', document.querySelectorAll('.scene-node').length);
        updateGraphSize();
    }

    function createSceneNode(videoFile, x, y) {
        console.log('Création du nœud pour:', videoFile.name);
        const node = document.createElement('div');
        node.className = 'scene-node';
        node.id = 'scene_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

        // Observer les changements de taille
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const node = entry.target;
                // Mettre à jour les lignes connectées à ce nœud
                connections.forEach(conn => {
                    if (conn.source === node.id || conn.target === node.id) {
                        conn.line.position();
                    }
                });
            }
            // Mettre à jour la taille du conteneur
            updateGraphSize();
        });
        resizeObserver.observe(node);

        // Ajouter au conteneur de zoom
        const zoomContainer = graphContainer.querySelector('.zoom-container');
        zoomContainer.appendChild(node);
        
        // Mettre à jour la taille du conteneur
        updateGraphSize();
        
        console.log('Nœud ajouté:', node.id);
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

        element.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        function dragStart(e) {
            if (e.target.classList.contains('connection-point') || 
                e.target.classList.contains('delete-btn') ||
                e.target.tagName.toLowerCase() === 'button') {
                return;
            }

            isDragging = true;
            element.classList.add('dragging');

            // Calculer la position initiale en tenant compte du zoom
            const zoomLevel = currentZoom;
            initialX = e.clientX / zoomLevel - element.offsetLeft;
            initialY = e.clientY / zoomLevel - element.offsetTop;
        }

        function drag(e) {
            if (!isDragging) return;

            e.preventDefault();

            // Appliquer le zoom aux mouvements
            const zoomLevel = currentZoom;
            currentX = e.clientX / zoomLevel - initialX;
            currentY = e.clientY / zoomLevel - initialY;

            // Empêcher les positions négatives
            currentX = Math.max(0, currentX);
            currentY = Math.max(0, currentY);

            // Appliquer la position
            element.style.left = currentX + 'px';
            element.style.top = currentY + 'px';

            // Mettre à jour les connexions
            connections.forEach(conn => {
                if (conn.source === element.id || conn.target === element.id) {
                    conn.line.position();
                }
            });

            // Mettre à jour la taille du conteneur pendant le drag
            requestAnimationFrame(updateGraphSize);
        }

        function dragEnd() {
            if (!isDragging) return;
            
            isDragging = false;
            element.classList.remove('dragging');

            // Mettre à jour la taille du conteneur après le drag
            updateGraphSize();
        }

        // Nettoyer les événements quand le nœud est supprimé
        element.cleanup = () => {
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', dragEnd);
        };
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

    function updateGraphSize() {
        // Trouver les limites des nœuds
        const nodes = document.querySelectorAll('.scene-node');
        if (nodes.length === 0) return;

        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        nodes.forEach(node => {
            const rect = node.getBoundingClientRect();
            const x = node.offsetLeft;
            const y = node.offsetTop;
            const width = rect.width / currentZoom;  // Ajuster pour le zoom
            const height = rect.height / currentZoom;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + width);
            maxY = Math.max(maxY, y + height);
        });

        // Ajouter une marge plus grande
        const margin = 300;
        maxX += margin;
        maxY += margin;

        // Mettre à jour la taille du conteneur de zoom
        const zoomContainer = graphContainer.querySelector('.zoom-container');
        zoomContainer.style.width = Math.max(maxX, graphContainer.clientWidth) + 'px';
        zoomContainer.style.height = Math.max(maxY, graphContainer.clientHeight) + 'px';
    }

    function updateZoom() {
        const zoomContainer = graphContainer.querySelector('.zoom-container');
        zoomContainer.style.transform = `scale(${currentZoom})`;
        const zoomLevel = toolbar.querySelector('.zoom-level');
        zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
        
        // Mettre à jour la taille du conteneur
        updateGraphSize();
        
        // Mettre à jour les lignes de connexion
        connections.forEach(conn => {
            conn.line.position();
        });
    }

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

                const zoomContainer = graphContainer.querySelector('.zoom-container');
                zoomContainer.appendChild(node);
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
