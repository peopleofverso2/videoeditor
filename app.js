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
                            if (conn.textElement) {
                                conn.textElement.remove();
                            }
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

                    // Créer l'élément de texte
                    const textContainer = document.createElement('div');
                    textContainer.className = 'transition-text-container';
                    
                    const header = document.createElement('div');
                    header.className = 'transition-header';
                    
                    const toggleButton = document.createElement('button');
                    toggleButton.className = 'toggle-transition-text';
                    toggleButton.innerHTML = '▼';
                    toggleButton.title = 'Replier/Déplier';
                    
                    const headerLabel = document.createElement('div');
                    headerLabel.className = 'header-label';
                    headerLabel.textContent = 'Textes de transition';
                    
                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'delete-transition-text';
                    deleteButton.innerHTML = '❌';
                    deleteButton.onclick = (e) => {
                        e.stopPropagation();
                        textContainer.remove();
                        const conn = connections.find(c => c.source === startNode.id);
                        if (conn) {
                            conn.textElement = null;
                        }
                    };
                    
                    header.appendChild(toggleButton);
                    header.appendChild(headerLabel);
                    header.appendChild(deleteButton);
                    
                    const content = document.createElement('div');
                    content.className = 'transition-content';
                    
                    toggleButton.onclick = (e) => {
                        e.stopPropagation();
                        const isCollapsed = content.classList.toggle('collapsed');
                        toggleButton.innerHTML = isCollapsed ? '▶' : '▼';
                        updateTextPosition(); // Mettre à jour la position après l'animation
                    };
                    
                    const textLines = ['Ligne 1', 'Ligne 2', 'Ligne 3'].map(defaultText => {
                        const lineContainer = document.createElement('div');
                        lineContainer.className = 'transition-line-container';

                        const line = document.createElement('div');
                        line.className = 'transition-text';
                        line.contentEditable = true;
                        line.innerHTML = defaultText;

                        const linkInfo = document.createElement('div');
                        linkInfo.className = 'link-info';
                        
                        const linkButton = document.createElement('button');
                        linkButton.className = 'link-node-button';
                        linkButton.innerHTML = '🔗';
                        linkButton.title = 'Lier à un nœud';
                        
                        const linkDestination = document.createElement('span');
                        linkDestination.className = 'link-destination';
                        linkInfo.appendChild(linkButton);
                        linkInfo.appendChild(linkDestination);
                        
                        let linkedNodeId = null;
                        
                        const updateLinkInfo = (nodeId) => {
                            linkedNodeId = nodeId;
                            lineContainer.dataset.linkedNodeId = nodeId || '';
                            if (nodeId) {
                                const node = document.getElementById(nodeId);
                                if (node) {
                                    const nodeLabel = node.querySelector('.node-label');
                                    const nodeName = nodeLabel ? nodeLabel.textContent : node.id;
                                    linkButton.classList.add('linked');
                                    linkDestination.textContent = `→ ${nodeName}`;
                                    linkDestination.style.opacity = '1';
                                    linkButton.title = `Lié à ${nodeName}`;
                                }
                            } else {
                                linkButton.classList.remove('linked');
                                linkDestination.textContent = '';
                                linkDestination.style.opacity = '0';
                                linkButton.title = 'Lier à un nœud';
                            }
                        };
                        
                        linkButton.onclick = (e) => {
                            e.stopPropagation();
                            
                            // Désactiver tous les autres boutons de lien
                            document.querySelectorAll('.link-node-button').forEach(btn => {
                                btn.classList.remove('linking');
                            });
                            
                            // Si on était déjà en train de lier ce bouton
                            if (linkButton.classList.contains('linking')) {
                                linkButton.classList.remove('linking');
                                document.body.classList.remove('linking-mode');
                            } else {
                                // Activer le mode lien
                                linkButton.classList.add('linking');
                                document.body.classList.add('linking-mode');
                                
                                // Gestionnaire pour cliquer sur un nœud
                                const handleNodeClick = (event) => {
                                    const node = event.target.closest('.scene-node');
                                    if (node) {
                                        event.stopPropagation();
                                        console.log('Nœud sélectionné:', node.id);
                                        updateLinkInfo(node.id);
                                        
                                        // Désactiver le mode lien
                                        linkButton.classList.remove('linking');
                                        document.body.classList.remove('linking-mode');
                                        document.removeEventListener('click', handleNodeClick);
                                    }
                                };
                                
                                document.addEventListener('click', handleNodeClick);
                            }
                        };
                        
                        lineContainer.appendChild(line);
                        lineContainer.appendChild(linkInfo);
                        
                        return { 
                            container: lineContainer, 
                            line, 
                            linkButton, 
                            getLinkedNodeId: () => linkedNodeId,
                            updateLinkInfo  // Exposer la fonction pour le chargement
                        };
                    });
                    
                    const textsWrapper = document.createElement('div');
                    textsWrapper.className = 'transition-texts-wrapper';
                    textLines.forEach(({container}) => textsWrapper.appendChild(container));
                    
                    content.appendChild(textsWrapper);
                    textContainer.appendChild(header);
                    textContainer.appendChild(content);
                    document.body.appendChild(textContainer);

                    // Positionner le texte au milieu de la ligne
                    const updateTextPosition = () => {
                        const startRect = startPoint.getBoundingClientRect();
                        const endRect = endPoint.getBoundingClientRect();
                        
                        // Calculer le point central de la ligne
                        const centerX = (startRect.left + endRect.left) / 2 + startRect.width / 2;
                        const centerY = startRect.bottom + (endRect.top - startRect.bottom) / 2;
                        
                        // Ajuster la position pour centrer le texte
                        const containerRect = textContainer.getBoundingClientRect();
                        const left = centerX - containerRect.width / 2;
                        const top = centerY - containerRect.height / 2;
                        
                        // Appliquer la position avec une transformation pour plus de fluidité
                        textContainer.style.transform = `translate(${left}px, ${top}px)`;
                        textContainer.style.left = '0';
                        textContainer.style.top = '0';
                    };

                    // Mettre à jour la position plus fréquemment
                    const updateLoop = () => {
                        if (textContainer.isConnected) {
                            updateTextPosition();
                            requestAnimationFrame(updateLoop);
                        }
                    };
                    updateLoop();

                    // Observer les changements de taille
                    const resizeObserver = new ResizeObserver(() => {
                        updateTextPosition();
                    });
                    resizeObserver.observe(textContainer);

                    const connection = {
                        source: startNode.id,
                        target: endNode.id,
                        line: line,
                        textElement: textsWrapper,
                        textLines: textLines, // Stocker les objets textLines
                        updateTextPosition: updateTextPosition
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

    // Créer un conteneur pour le plein écran
    const fullscreenContainer = document.createElement('div');
    fullscreenContainer.className = 'fullscreen-container';
    document.body.appendChild(fullscreenContainer);

    // Ajouter un élément vidéo dédié au plein écran
    const fullscreenVideo = document.createElement('video');
    fullscreenVideo.className = 'fullscreen-video';
    fullscreenContainer.appendChild(fullscreenVideo);

    // Créer un élément pour le texte en plein écran
    const fullscreenText = document.createElement('div');
    fullscreenText.className = 'fullscreen-text';
    fullscreenContainer.appendChild(fullscreenText);

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
            fullscreenContainer.style.display = 'block';
            fullscreenVideo.style.display = 'block';
            fullscreenVideo.style.opacity = '1';
            await fullscreenVideo.play();
            try {
                await fullscreenContainer.requestFullscreen();
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
                // Afficher le texte de transition si présent
                console.log('Texte de transition:', next.textElement?.textContent);
                if (next.textElement && Array.from(next.textElement.children).some(lineContainer => lineContainer.querySelector('.transition-text').textContent.trim())) {
                    // Cacher la vidéo mais garder le fond noir
                    console.log('Fondu de la vidéo...');
                    fullscreenVideo.style.opacity = '0';
                    await new Promise(resolve => setTimeout(resolve, 500));
                    fullscreenVideo.style.display = 'none';
                    
                    // Afficher le texte
                    console.log('Affichage du texte...');
                    fullscreenText.innerHTML = '';
                    Array.from(next.textElement.children).forEach(lineContainer => {
                        const line = lineContainer.querySelector('.transition-text');
                        const linkButton = lineContainer.querySelector('.link-node-button');
                        
                        if (line.textContent.trim()) {
                            const fullscreenLine = document.createElement('div');
                            fullscreenLine.className = 'fullscreen-text-line';
                            fullscreenLine.textContent = line.textContent;
                            
                            // Rendre la ligne cliquable
                            fullscreenLine.style.cursor = 'pointer';
                            fullscreenLine.addEventListener('mouseenter', () => {
                                fullscreenLine.classList.add('hover');
                            });
                            fullscreenLine.addEventListener('mouseleave', () => {
                                fullscreenLine.classList.remove('hover');
                            });
                            fullscreenLine.addEventListener('click', async () => {
                                // Cacher le texte immédiatement
                                fullscreenText.style.opacity = '0';
                                fullscreenText.style.display = 'none';
                                
                                // Récupérer le nœud lié à cette ligne depuis le dataset
                                const linkedNodeId = lineContainer.dataset.linkedNodeId;
                                console.log('ID du nœud lié:', linkedNodeId);
                                const targetNodeId = linkedNodeId || next.target;
                                console.log('ID du nœud cible:', targetNodeId);
                                
                                // Démarrer la vidéo liée ou la suivante par défaut
                                const nextNode = document.getElementById(targetNodeId);
                                if (nextNode) {
                                    console.log('Lecture du nœud:', nextNode.id);
                                    const nextVideo = nextNode.querySelector('video');
                                    if (nextVideo) {
                                        fullscreenVideo.src = nextVideo.src;
                                        fullscreenVideo.currentTime = 0;
                                        fullscreenVideo.style.display = 'block';
                                        await fullscreenVideo.play();
                                        fullscreenVideo.style.opacity = '1';
                                        
                                        // Continuer la séquence depuis ce nœud
                                        await playSequence(nextNode);
                                    }
                                }
                            });
                            
                            fullscreenText.appendChild(fullscreenLine);
                        }
                    });
                    
                    fullscreenText.style.display = 'flex';
                    fullscreenText.style.opacity = '1';
                    
                    // Attendre 2 secondes
                    console.log('Attente...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Cacher le texte
                    console.log('Disparition du texte...');
                    fullscreenText.style.opacity = '0';
                    await new Promise(resolve => setTimeout(resolve, 500));
                    fullscreenText.style.display = 'none';
                }

                const nextNode = document.getElementById(next.target);
                if (nextNode) {
                    console.log('Lecture du prochain nœud');
                    // Préparer la prochaine vidéo
                    const nextVideo = nextNode.querySelector('video');
                    if (nextVideo) {
                        fullscreenVideo.src = nextVideo.src;
                        fullscreenVideo.currentTime = 0;
                        
                        // Si pas de texte, transition instantanée
                        if (!next.textElement || !Array.from(next.textElement.children).some(lineContainer => lineContainer.querySelector('.transition-text').textContent.trim())) {
                            fullscreenVideo.style.display = 'block';
                            fullscreenVideo.style.opacity = '1';
                        } else {
                            // Sinon, fondu normal
                            fullscreenVideo.style.display = 'block';
                            await fullscreenVideo.play();
                            fullscreenVideo.style.opacity = '1';
                        }
                        
                        await playSequence(nextNode);
                    }
                }
            }

            // Si c'est la dernière vidéo ou s'il n'y a pas de suivante
            if (!next) {
                console.log('Fin de la séquence');
                fullscreenContainer.style.display = 'none';
                if (document.fullscreenElement) {
                    await document.exitFullscreen();
                }
                stopSequence();
            }
        } catch (error) {
            console.error('Erreur:', error);
            fullscreenContainer.style.display = 'none';
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            }
            stopSequence();
        }
    }

    function stopSequence() {
        if (fullscreenVideo) {
            fullscreenVideo.pause();
            fullscreenContainer.style.display = 'none';
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        }
        isPlaying = false;
        currentNode = null;
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
                target: conn.target,
                lines: Array.from(conn.textElement.children).map(container => {
                    const line = container.querySelector('.transition-text');
                    const linkedNodeId = container.dataset.linkedNodeId || null;
                    return {
                        text: line.textContent,
                        linkedNodeId: linkedNodeId
                    };
                })
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

                    // Créer l'élément de texte
                    const textContainer = document.createElement('div');
                    textContainer.className = 'transition-text-container';
                    
                    const header = document.createElement('div');
                    header.className = 'transition-header';
                    
                    const toggleButton = document.createElement('button');
                    toggleButton.className = 'toggle-transition-text';
                    toggleButton.innerHTML = '▼';
                    toggleButton.title = 'Replier/Déplier';
                    
                    const headerLabel = document.createElement('div');
                    headerLabel.className = 'header-label';
                    headerLabel.textContent = 'Textes de transition';
                    
                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'delete-transition-text';
                    deleteButton.innerHTML = '❌';
                    deleteButton.onclick = (e) => {
                        e.stopPropagation();
                        textContainer.remove();
                        const conn = connections.find(c => c.source === startNode.id);
                        if (conn) {
                            conn.textElement = null;
                        }
                    };
                    
                    header.appendChild(toggleButton);
                    header.appendChild(headerLabel);
                    header.appendChild(deleteButton);
                    
                    const content = document.createElement('div');
                    content.className = 'transition-content';
                    
                    toggleButton.onclick = (e) => {
                        e.stopPropagation();
                        const isCollapsed = content.classList.toggle('collapsed');
                        toggleButton.innerHTML = isCollapsed ? '▶' : '▼';
                        updateTextPosition(); // Mettre à jour la position après l'animation
                    };
                    
                    const textLines = conn.lines.map(lineData => {
                        const lineContainer = document.createElement('div');
                        lineContainer.className = 'transition-line-container';

                        const line = document.createElement('div');
                        line.className = 'transition-text';
                        line.contentEditable = true;
                        line.innerHTML = lineData.text;

                        const linkInfo = document.createElement('div');
                        linkInfo.className = 'link-info';
                        
                        const linkButton = document.createElement('button');
                        linkButton.className = 'link-node-button';
                        linkButton.innerHTML = '🔗';
                        linkButton.title = 'Lier à un nœud';
                        
                        const linkDestination = document.createElement('span');
                        linkDestination.className = 'link-destination';
                        linkInfo.appendChild(linkButton);
                        linkInfo.appendChild(linkDestination);
                        
                        let linkedNodeId = null;
                        
                        const updateLinkInfo = (nodeId) => {
                            linkedNodeId = nodeId;
                            lineContainer.dataset.linkedNodeId = nodeId || '';
                            if (nodeId) {
                                const node = document.getElementById(nodeId);
                                if (node) {
                                    const nodeLabel = node.querySelector('.node-label');
                                    const nodeName = nodeLabel ? nodeLabel.textContent : node.id;
                                    linkButton.classList.add('linked');
                                    linkDestination.textContent = `→ ${nodeName}`;
                                    linkDestination.style.opacity = '1';
                                    linkButton.title = `Lié à ${nodeName}`;
                                }
                            } else {
                                linkButton.classList.remove('linked');
                                linkDestination.textContent = '';
                                linkDestination.style.opacity = '0';
                                linkButton.title = 'Lier à un nœud';
                            }
                        };
                        
                        linkButton.onclick = (e) => {
                            e.stopPropagation();
                            
                            // Désactiver tous les autres boutons de lien
                            document.querySelectorAll('.link-node-button').forEach(btn => {
                                btn.classList.remove('linking');
                            });
                            
                            // Si on était déjà en train de lier ce bouton
                            if (linkButton.classList.contains('linking')) {
                                linkButton.classList.remove('linking');
                                document.body.classList.remove('linking-mode');
                            } else {
                                // Activer le mode lien
                                linkButton.classList.add('linking');
                                document.body.classList.add('linking-mode');
                                
                                // Gestionnaire pour cliquer sur un nœud
                                const handleNodeClick = (event) => {
                                    const node = event.target.closest('.scene-node');
                                    if (node) {
                                        event.stopPropagation();
                                        console.log('Nœud sélectionné:', node.id);
                                        updateLinkInfo(node.id);
                                        
                                        // Désactiver le mode lien
                                        linkButton.classList.remove('linking');
                                        document.body.classList.remove('linking-mode');
                                        document.removeEventListener('click', handleNodeClick);
                                    }
                                };
                                
                                document.addEventListener('click', handleNodeClick);
                            }
                        };
                        
                        lineContainer.appendChild(line);
                        lineContainer.appendChild(linkInfo);
                        
                        // Initialiser l'état du lien si un nœud était lié
                        if (lineData.linkedNodeId) {
                            updateLinkInfo(lineData.linkedNodeId);
                        }
                        
                        return { 
                            container: lineContainer, 
                            line, 
                            linkButton,
                            getLinkedNodeId: () => linkedNodeId,
                            updateLinkInfo
                        };
                    });
                    
                    const textsWrapper = document.createElement('div');
                    textsWrapper.className = 'transition-texts-wrapper';
                    textLines.forEach(({container}) => textsWrapper.appendChild(container));
                    
                    content.appendChild(textsWrapper);
                    textContainer.appendChild(header);
                    textContainer.appendChild(content);
                    document.body.appendChild(textContainer);

                    // Positionner le texte au milieu de la ligne
                    const updateTextPosition = () => {
                        const startRect = startPoint.getBoundingClientRect();
                        const endRect = endPoint.getBoundingClientRect();
                        
                        // Calculer le point central de la ligne
                        const centerX = (startRect.left + endRect.left) / 2 + startRect.width / 2;
                        const centerY = startRect.bottom + (endRect.top - startRect.bottom) / 2;
                        
                        // Ajuster la position pour centrer le texte
                        const containerRect = textContainer.getBoundingClientRect();
                        const left = centerX - containerRect.width / 2;
                        const top = centerY - containerRect.height / 2;
                        
                        // Appliquer la position avec une transformation pour plus de fluidité
                        textContainer.style.transform = `translate(${left}px, ${top}px)`;
                        textContainer.style.left = '0';
                        textContainer.style.top = '0';
                    };

                    // Mettre à jour la position plus fréquemment
                    const updateLoop = () => {
                        if (textContainer.isConnected) {
                            updateTextPosition();
                            requestAnimationFrame(updateLoop);
                        }
                    };
                    updateLoop();

                    // Observer les changements de taille
                    const resizeObserver = new ResizeObserver(() => {
                        updateTextPosition();
                    });
                    resizeObserver.observe(textContainer);

                    const connection = {
                        source: conn.source,
                        target: conn.target,
                        line: line,
                        textElement: textsWrapper,
                        textLines: textLines, // Stocker les objets textLines
                        updateTextPosition: updateTextPosition
                    };

                    connections.push(connection);
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

function exportProject() {
    const nodes = Array.from(document.querySelectorAll('.scene-node')).map(node => {
        const video = node.querySelector('video');
        const label = node.querySelector('.node-label');
        return {
            id: node.id,
            position: {
                x: parseInt(node.style.left),
                y: parseInt(node.style.top)
            },
            videoSrc: video ? video.src : null,
            label: label ? label.textContent : ''
        };
    });

    const conns = connections.map(conn => {
        const textLines = [];
        if (conn.textElement) {
            const lineContainers = conn.textElement.querySelectorAll('.transition-line-container');
            lineContainers.forEach(container => {
                textLines.push({
                    text: container.querySelector('.transition-text').innerHTML,
                    linkedNodeId: container.dataset.linkedNodeId || null
                });
            });
        }
        return {
            source: conn.source,
            target: conn.target,
            lines: textLines
        };
    });

    return {
        nodes,
        connections: conns
    };
}
