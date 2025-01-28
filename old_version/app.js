// Variables globales
let connections = [];
let activePoint = null;
let currentNode = null;
let isPlaying = false;

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

        // Limiter aux bords du conteneur
        const containerRect = graphContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        currentX = Math.max(0, Math.min(currentX, containerRect.width - elementRect.width));
        currentY = Math.max(0, Math.min(currentY, containerRect.height - elementRect.height));

        element.style.left = currentX + 'px';
        element.style.top = currentY + 'px';

        // Mettre à jour les connexions
        requestAnimationFrame(() => updateConnections(element));
    }

    function onRelease() {
        isDragging = false;
        element.classList.remove('dragging');
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', onRelease);
        
        // Mise à jour finale des connexions
        updateConnections(element);
    }
}

function updateConnections(element) {
    connections.forEach(conn => {
        if (conn.line && (conn.source === element.id || conn.target === element.id)) {
            const sourceNode = document.getElementById(conn.source);
            const targetNode = document.getElementById(conn.target);
            
            if (sourceNode && targetNode) {
                const sourcePoint = sourceNode.querySelector('.connection-point.bottom');
                const targetPoint = targetNode.querySelector('.connection-point.top');
                
                if (sourcePoint && targetPoint) {
                    conn.line.position();
                }
            }
        }
    });
}

function createSceneNode(videoFile) {
    const node = document.createElement('div');
    node.className = 'scene-node';
    node.id = 'scene_' + Date.now();
    
    node.innerHTML = `
        <div class="video-container">
            <video class="preview-video" preload="metadata"></video>
            <div class="video-controls">
                <button class="play-btn">▶️</button>
                <button class="play-sequence-btn">⏯️</button>
            </div>
        </div>
        <div class="title">${videoFile.name}</div>
        <div class="connection-point top"></div>
        <div class="connection-point bottom"></div>
        <button class="delete-btn">🗑️</button>
    `;

    const video = node.querySelector('video');
    video.src = URL.createObjectURL(videoFile);
    video.file = videoFile;

    // Contrôles vidéo
    const playBtn = node.querySelector('.play-btn');
    playBtn.onclick = (e) => {
        e.stopPropagation();
        if (video.paused) {
            playVideo(node);
        } else {
            video.pause();
            playBtn.textContent = '▶️';
            node.classList.remove('playing');
        }
    };

    // Lecture de séquence
    const playSequenceBtn = node.querySelector('.play-sequence-btn');
    playSequenceBtn.onclick = (e) => {
        e.stopPropagation();
        if (isPlaying && currentNode === node) {
            stopAllVideos();
        } else {
            startSequence(node);
        }
    };

    // Points de connexion
    const points = node.querySelectorAll('.connection-point');
    points.forEach(point => {
        point.onclick = (e) => {
            e.stopPropagation();
            handleConnection(point);
        };
    });

    // Suppression
    const deleteBtn = node.querySelector('.delete-btn');
    deleteBtn.onclick = () => {
        deleteNode(node);
    };

    // Rendre draggable
    makeDraggable(node);

    // Ajouter au conteneur
    graphContainer.appendChild(node);
    
    return node;
}

function deleteNode(node) {
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
    
    if (currentNode === node) {
        currentNode = null;
    }
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
                const connection = createConnection(startPoint, endPoint);
                
                // Double-clic pour supprimer
                connection.line.element.addEventListener('dblclick', () => {
                    connection.line.remove();
                    connections = connections.filter(c => c !== connection);
                });
            }
        }

        activePoint.classList.remove('active');
        point.classList.remove('active');
        activePoint = null;
    }
}

function createConnection(startPoint, endPoint) {
    const startNode = startPoint.closest('.scene-node');
    const endNode = endPoint.closest('.scene-node');

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
    return connection;
}

function playVideo(node, autoplay = false) {
    const video = node.querySelector('video');
    const playBtn = node.querySelector('.play-btn');
    
    if (!video) return;

    // Arrêter toutes les autres vidéos
    document.querySelectorAll('.scene-node video').forEach(v => {
        if (v !== video) {
            v.pause();
            v.currentTime = 0;
            const btn = v.closest('.scene-node').querySelector('.play-btn');
            btn.textContent = '▶️';
        }
    });

    // Réinitialiser les surbrillances
    document.querySelectorAll('.scene-node').forEach(n => {
        n.classList.remove('playing');
    });
    node.classList.add('playing');

    // Lancer la lecture
    video.currentTime = 0;
    video.play();
    playBtn.textContent = '⏸️';

    // Si c'est une lecture automatique, configurer l'enchaînement
    if (autoplay) {
        video.onended = () => {
            playBtn.textContent = '▶️';
            const nextNode = findNextNode(node);
            if (nextNode) {
                playVideo(nextNode, true);
            } else {
                stopAllVideos();
            }
        };
    } else {
        video.onended = () => {
            playBtn.textContent = '▶️';
            node.classList.remove('playing');
        };
    }
}

function findNextNode(currentNode) {
    const connection = connections.find(conn => conn.source === currentNode.id);
    if (connection) {
        return document.getElementById(connection.target);
    }
    return null;
}

function startSequence(node) {
    isPlaying = true;
    currentNode = node;
    playVideo(node, true);
}

function stopAllVideos() {
    isPlaying = false;
    currentNode = null;
    
    document.querySelectorAll('.scene-node').forEach(node => {
        const video = node.querySelector('video');
        const playBtn = node.querySelector('.play-btn');
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
        if (playBtn) {
            playBtn.textContent = '▶️';
        }
        node.classList.remove('playing');
    });
}

// Annuler la connexion avec Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (activePoint) {
            activePoint.classList.remove('active');
            activePoint = null;
        }
        if (isPlaying) {
            stopAllVideos();
        }
    }
});

// Variables globales
const graphContainer = document.getElementById('graph-container');
const overlay = document.querySelector('.overlay');
const videoPlayer = document.getElementById('videoPlayer');

document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let connections = [];
    let activePoint = null;
    let currentNode = null;
    let isPlaying = false;
    let currentProjectName = '';
    let playlists = new Map(); // Stockage des playlists

    // Éléments DOM
    const fileInput = document.getElementById('fileInput');
    const loadInput = document.getElementById('loadInput');
    const saveBtn = document.getElementById('saveBtn');
    const projectNameInput = document.getElementById('projectName');
    const projectDisplay = document.getElementById('projectDisplay');
    const dropZone = document.getElementById('dropZone');
    
    // Créer la barre latérale des playlists
    const sidebar = document.createElement('div');
    sidebar.className = 'playlist-sidebar';
    sidebar.innerHTML = `
        <div class="playlist-header">
            <h3>Playlists</h3>
            <button id="newPlaylistBtn">+ Nouvelle Playlist</button>
        </div>
        <div class="playlist-list"></div>
    `;
    document.body.appendChild(sidebar);

    // Gestionnaire pour nouvelle playlist
    document.getElementById('newPlaylistBtn').onclick = () => {
        const name = prompt('Nom de la playlist :');
        if (name) {
            createPlaylist(name);
        }
    };

    function createPlaylist(name) {
        const playlistId = 'playlist_' + Date.now();
        const playlist = {
            id: playlistId,
            name: name,
            nodes: []
        };
        
        playlists.set(playlistId, playlist);
        
        const playlistElement = document.createElement('div');
        playlistElement.className = 'playlist-item';
        playlistElement.innerHTML = `
            <div class="playlist-name">${name}</div>
            <div class="playlist-controls">
                <button class="play-playlist-btn">▶️</button>
                <button class="delete-playlist-btn">🗑️</button>
            </div>
            <div class="playlist-nodes"></div>
        `;
        
        // Lecture de la playlist
        playlistElement.querySelector('.play-playlist-btn').onclick = () => {
            playPlaylist(playlist);
        };
        
        // Suppression de la playlist
        playlistElement.querySelector('.delete-playlist-btn').onclick = () => {
            if (confirm('Supprimer la playlist ?')) {
                playlists.delete(playlistId);
                playlistElement.remove();
            }
        };
        
        // Rendre la playlist droppable
        playlistElement.addEventListener('dragover', e => {
            e.preventDefault();
            playlistElement.classList.add('dragover');
        });
        
        playlistElement.addEventListener('dragleave', () => {
            playlistElement.classList.remove('dragover');
        });
        
        playlistElement.addEventListener('drop', e => {
            e.preventDefault();
            playlistElement.classList.remove('dragover');
            
            const nodeId = e.dataTransfer.getData('node');
            const node = document.getElementById(nodeId);
            if (node) {
                addToPlaylist(playlist, node);
            }
        });
        
        document.querySelector('.playlist-list').appendChild(playlistElement);
    }

    function addToPlaylist(playlist, node) {
        if (!playlist.nodes.includes(node.id)) {
            playlist.nodes.push(node.id);
            
            const nodeElement = document.createElement('div');
            nodeElement.className = 'playlist-node';
            nodeElement.innerHTML = `
                <span>${node.querySelector('.title').textContent}</span>
                <button class="remove-from-playlist-btn">❌</button>
            `;
            
            nodeElement.querySelector('.remove-from-playlist-btn').onclick = () => {
                playlist.nodes = playlist.nodes.filter(id => id !== node.id);
                nodeElement.remove();
            };
            
            const playlistElement = document.querySelector(`[data-playlist-id="${playlist.id}"] .playlist-nodes`);
            playlistElement.appendChild(nodeElement);
        }
    }

    async function playPlaylist(playlist) {
        if (isPlaying) {
            stopAllVideos();
            return;
        }
        
        isPlaying = true;
        
        for (const nodeId of playlist.nodes) {
            if (!isPlaying) break;
            
            const node = document.getElementById(nodeId);
            if (node) {
                currentNode = node;
                const video = node.querySelector('video');
                if (video) {
                    try {
                        // Mettre en surbrillance
                        document.querySelectorAll('.scene-node').forEach(n => {
                            n.classList.remove('playing');
                        });
                        node.classList.add('playing');
                        
                        // Lire la vidéo
                        video.currentTime = 0;
                        await video.play();
                        
                        // Attendre la fin
                        await new Promise(resolve => {
                            video.onended = resolve;
                        });
                    } catch (error) {
                        console.error('Erreur de lecture:', error);
                    }
                }
            }
        }
        
        stopAllVideos();
    }

    function createSceneNode(videoFile) {
        const node = document.createElement('div');
        node.className = 'scene-node';
        node.id = 'scene_' + Date.now();
        node.draggable = true;
        
        node.innerHTML = `
            <div class="video-container">
                <video class="preview-video" preload="metadata"></video>
                <div class="video-controls">
                    <button class="play-btn">▶️</button>
                    <button class="play-sequence-btn">⏯️</button>
                </div>
            </div>
            <div class="title">${videoFile.name}</div>
            <div class="connection-point top"></div>
            <div class="connection-point bottom"></div>
            <button class="delete-btn">🗑️</button>
        `;

        const video = node.querySelector('video');
        video.src = URL.createObjectURL(videoFile);
        video.file = videoFile;

        // Drag and drop vers les playlists
        node.addEventListener('dragstart', e => {
            e.dataTransfer.setData('node', node.id);
        });

        // Contrôles vidéo
        setupNodeEvents(node);

        // Ajouter au conteneur
        graphContainer.appendChild(node);
        
        return node;
    }

    // Gestionnaires d'événements pour l'import
    fileInput.addEventListener('change', handleFileSelect);
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    loadInput.addEventListener('change', loadProject);
    saveBtn.addEventListener('click', saveProject);

    // Fonctions d'import
    function handleFileSelect(e) {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('video/'));
        handleFiles(files);
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('dragover');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('video/'));
        handleFiles(files);
    }

    async function handleFiles(files) {
        if (files.length === 0) return;

        // Masquer la zone de drop si des fichiers sont ajoutés
        dropZone.style.display = 'none';

        // Créer les nœuds pour chaque vidéo
        const promises = files.map(async (file, index) => {
            try {
                const node = createSceneNode(file);
                
                // Positionner en grille si plusieurs fichiers
                if (files.length > 1) {
                    const cols = Math.ceil(Math.sqrt(files.length));
                    const row = Math.floor(index / cols);
                    const col = index % cols;
                    node.style.left = `${100 + col * 300}px`;
                    node.style.top = `${100 + row * 200}px`;
                }
                
                return node;
            } catch (error) {
                console.error(`Erreur lors du chargement de ${file.name}:`, error);
                return null;
            }
        });

        await Promise.all(promises);
    }

    // Gestion des projets
    function saveProject() {
        const projectName = projectNameInput.value.trim() || 'project';
        currentProjectName = projectName;
        
        const nodes = Array.from(document.querySelectorAll('.scene-node')).map(node => ({
            id: node.id,
            position: {
                left: node.style.left,
                top: node.style.top
            },
            videoName: node.querySelector('.title').textContent
        }));

        const projectData = {
            nodes,
            connections: connections.map(conn => ({
                source: conn.source,
                target: conn.target
            })),
            playlists: Array.from(playlists.entries()).map(([id, playlist]) => ({
                id,
                name: playlist.name,
                nodes: playlist.nodes
            }))
        };

        const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        projectDisplay.textContent = `Projet : ${projectName}`;
    }

    function loadProject(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                // Nettoyer l'état actuel
                clearProject();
                
                // Recréer les nœuds
                data.nodes.forEach(nodeData => {
                    const node = document.createElement('div');
                    node.className = 'scene-node';
                    node.id = nodeData.id;
                    node.style.left = nodeData.position.left;
                    node.style.top = nodeData.position.top;
                    node.draggable = true;
                    
                    node.innerHTML = `
                        <div class="video-container">
                            <video class="preview-video"></video>
                            <div class="video-controls">
                                <button class="play-btn">▶️</button>
                                <button class="play-sequence-btn">⏯️</button>
                            </div>
                        </div>
                        <div class="title">${nodeData.videoName}</div>
                        <div class="connection-point top"></div>
                        <div class="connection-point bottom"></div>
                        <button class="delete-btn">🗑️</button>
                    `;

                    setupNodeEvents(node);
                    graphContainer.appendChild(node);
                });

                // Recréer les connexions
                data.connections.forEach(conn => {
                    const sourceNode = document.getElementById(conn.source);
                    const targetNode = document.getElementById(conn.target);
                    
                    if (sourceNode && targetNode) {
                        const sourcePoint = sourceNode.querySelector('.connection-point.bottom');
                        const targetPoint = targetNode.querySelector('.connection-point.top');
                        createConnection(sourcePoint, targetPoint);
                    }
                });

                // Restaurer les playlists
                if (data.playlists) {
                    data.playlists.forEach(playlistData => {
                        createPlaylist(playlistData.name, playlistData.id, playlistData.nodes);
                    });
                }

                currentProjectName = file.name.replace('.json', '');
                projectDisplay.textContent = `Projet : ${currentProjectName}`;
                projectNameInput.value = currentProjectName;
                
                // Masquer la zone de drop
                dropZone.style.display = 'none';
            } catch (error) {
                console.error('Erreur lors du chargement du projet:', error);
                alert('Erreur lors du chargement du projet');
            }
        };
        reader.readAsText(file);
    }

    function clearProject() {
        // Supprimer les connexions
        connections.forEach(conn => {
            if (conn.line) {
                conn.line.remove();
            }
        });
        connections = [];

        // Supprimer les nœuds
        while (graphContainer.firstChild) {
            graphContainer.removeChild(graphContainer.firstChild);
        }

        // Supprimer les playlists
        playlists.clear();
        document.querySelector('.playlist-list').innerHTML = '';

        // Réinitialiser les variables
        activePoint = null;
        currentNode = null;
        isPlaying = false;
    }

    // Ajouter les styles pour la barre latérale
    const style = document.createElement('style');
    style.textContent = `
        .playlist-sidebar {
            position: fixed;
            right: 0;
            top: 0;
            bottom: 0;
            width: 300px;
            background: white;
            border-left: 1px solid #ddd;
            padding: 1rem;
            overflow-y: auto;
        }

        .playlist-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }

        .playlist-item {
            background: #f5f5f5;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
        }

        .playlist-item.dragover {
            background: #e0f2e0;
            border: 2px dashed #4CAF50;
        }

        .playlist-name {
            font-weight: bold;
            margin-bottom: 0.5rem;
        }

        .playlist-controls {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
        }

        .playlist-nodes {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .playlist-node {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: white;
            padding: 0.5rem;
            border-radius: 4px;
            border: 1px solid #ddd;
        }

        .remove-from-playlist-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.25rem;
        }

        #newPlaylistBtn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
        }

        #newPlaylistBtn:hover {
            background: #45a049;
        }
    `;
    document.head.appendChild(style);
});

document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let connections = [];
    let activePoint = null;
    let currentNode = null;
    let isPlaying = false;

    // Éléments DOM
    const graphContainer = document.getElementById('graph-container');
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

    async function handleFiles(files) {
        if (files.length === 0) return;

        // Afficher le conteneur de graphe et masquer la zone de drop
        graphContainer.style.display = 'block';
        dropZone.style.display = 'none';

        // Créer les nœuds
        files.forEach((file, index) => {
            const node = createSceneNode(file);
            const cols = Math.ceil(Math.sqrt(files.length));
            const row = Math.floor(index / cols);
            const col = index % cols;
            node.style.left = `${100 + col * 300}px`;
            node.style.top = `${100 + row * 200}px`;
        });
    }

    function createSceneNode(videoFile) {
        const node = document.createElement('div');
        node.className = 'scene-node';
        node.id = 'scene_' + Date.now();

        node.innerHTML = `
            <div class="video-container">
                <video class="preview-video" preload="metadata"></video>
                <div class="video-controls">
                    <button class="play-btn">▶️</button>
                    <button class="play-sequence-btn">⏯️</button>
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

        video.onended = () => {
            playBtn.textContent = '▶️';
        };
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

                    // Double-clic pour supprimer
                    line.element.addEventListener('dblclick', () => {
                        line.remove();
                        connections = connections.filter(c => c !== connection);
                    });
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

            // Limiter aux bords du conteneur
            const containerRect = graphContainer.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();

            currentX = Math.max(0, Math.min(currentX, containerRect.width - elementRect.width));
            currentY = Math.max(0, Math.min(currentY, containerRect.height - elementRect.height));

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
        if (isPlaying) {
            stopSequence();
            return;
        }

        isPlaying = true;
        await playSequence(node);
    }

    async function playSequence(node) {
        if (!isPlaying) return;

        currentNode = node;
        const video = node.querySelector('video');
        const playBtn = node.querySelector('.play-btn');

        if (!video) return;

        // Mettre en surbrillance
        document.querySelectorAll('.scene-node').forEach(n => {
            n.classList.remove('playing');
        });
        node.classList.add('playing');

        try {
            // Lire la vidéo
            video.currentTime = 0;
            playBtn.textContent = '⏸️';
            await video.play();

            // Attendre la fin
            await new Promise((resolve, reject) => {
                video.onended = resolve;
                video.onerror = reject;
            });

            playBtn.textContent = '▶️';

            if (!isPlaying) return;

            // Trouver la prochaine vidéo
            const nextConnection = connections.find(conn => conn.source === node.id);
            if (nextConnection) {
                const nextNode = document.getElementById(nextConnection.target);
                if (nextNode) {
                    await playSequence(nextNode);
                }
            } else {
                stopSequence();
            }
        } catch (error) {
            console.error('Erreur de lecture:', error);
            stopSequence();
        }
    }

    function stopSequence() {
        isPlaying = false;
        currentNode = null;

        // Arrêter toutes les vidéos
        document.querySelectorAll('.scene-node').forEach(node => {
            const video = node.querySelector('video');
            const playBtn = node.querySelector('.play-btn');
            if (video) {
                video.pause();
                video.currentTime = 0;
            }
            if (playBtn) {
                playBtn.textContent = '▶️';
            }
            node.classList.remove('playing');
        });
    }

    // Annuler la connexion avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (activePoint) {
                activePoint.classList.remove('active');
                activePoint = null;
            }
            if (isPlaying) {
                stopSequence();
            }
        }
    });
});
