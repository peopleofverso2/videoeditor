import React, { useState } from 'react';
import { Box, Button, Dialog, TextField, Typography, Paper } from '@mui/material';
import ReactFlow, { 
  Background, 
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/base.css';
import 'reactflow/dist/style.css';

const VideoNode = ({ data }) => {
  return (
    <Paper
      elevation={3}
      sx={{
        background: '#fff',
        padding: 1,
        borderRadius: 1,
        width: 200,
        position: 'relative',
        '&:hover': {
          boxShadow: 6,
          '& .handle': {
            opacity: 1,
            transform: 'scale(1.2)',
          }
        }
      }}
    >
      {/* Poignée d'entrée (en haut) */}
      <Handle
        type="target"
        position={Position.Top}
        className="handle"
        style={{
          opacity: 0.5,
          transition: 'all 0.2s ease',
          background: '#2196f3',
          width: 10,
          height: 10
        }}
      />

      {/* Poignée de sortie (en bas) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="handle"
        style={{
          opacity: 0.5,
          transition: 'all 0.2s ease',
          background: '#2196f3',
          width: 10,
          height: 10
        }}
      />

      <Box sx={{ position: 'relative' }}>
        <video 
          src={data.url} 
          style={{ 
            width: '100%', 
            height: 120, 
            objectFit: 'cover',
            borderRadius: 4
          }}
          muted
          onMouseEnter={e => e.target.play()}
          onMouseLeave={e => {
            e.target.pause();
            e.target.currentTime = 0;
          }}
        />
        
        {/* Indicateurs de connexion */}
        <Box sx={{
          position: 'absolute',
          top: -20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#666',
          fontSize: '0.75rem',
          opacity: 0.7
        }}>
          ⬇ Entrée
        </Box>
        <Box sx={{
          position: 'absolute',
          bottom: -35,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#666',
          fontSize: '0.75rem',
          opacity: 0.7
        }}>
          Sortie ⬇
        </Box>
      </Box>

      <Typography 
        variant="body2" 
        sx={{ 
          mt: 1,
          textAlign: 'center',
          fontWeight: 'medium'
        }}
      >
        {data.label || 'Video'}
      </Typography>
    </Paper>
  );
};

const nodeTypes = {
  videoNode: VideoNode
};

const ChoiceDialog = ({ open, onClose, edge, onConfirm }) => {
  const [choice, setChoice] = useState(edge?.data?.choice || '');
  const [buttonStyle, setButtonStyle] = useState(edge?.data?.buttonStyle || {
    position: 'bottom',
    color: '#2196f3',
    size: 'medium',
    shape: 'rounded',
    timing: 0 // 0 = à la fin, nombre négatif = secondes avant la fin
  });

  const handleConfirm = () => {
    onConfirm({
      choice,
      buttonStyle
    });
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          {edge ? 'Modifier le choix' : 'Ajouter un choix'}
        </Typography>

        <TextField
          autoFocus
          label="Texte du choix"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          fullWidth
          sx={{ mb: 3 }}
        />

        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Style du bouton
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Position
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {['top', 'bottom', 'left', 'right'].map((pos) => (
              <Button
                key={pos}
                variant={buttonStyle.position === pos ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setButtonStyle({ ...buttonStyle, position: pos })}
              >
                {pos}
              </Button>
            ))}
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Couleur
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {['#2196f3', '#4caf50', '#f44336', '#ff9800', '#9c27b0'].map((color) => (
              <Box
                key={color}
                onClick={() => setButtonStyle({ ...buttonStyle, color })}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: color,
                  borderRadius: 1,
                  cursor: 'pointer',
                  border: buttonStyle.color === color ? '3px solid white' : 'none',
                  outline: buttonStyle.color === color ? `2px solid ${color}` : 'none'
                }}
              />
            ))}
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Taille
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {['small', 'medium', 'large'].map((size) => (
              <Button
                key={size}
                variant={buttonStyle.size === size ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setButtonStyle({ ...buttonStyle, size })}
              >
                {size}
              </Button>
            ))}
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Forme
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {['rounded', 'circular', 'square'].map((shape) => (
              <Button
                key={shape}
                variant={buttonStyle.shape === shape ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setButtonStyle({ ...buttonStyle, shape })}
              >
                {shape}
              </Button>
            ))}
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Apparition
          </Typography>
          <TextField
            type="number"
            label="Secondes avant la fin (-5 = 5s avant)"
            value={buttonStyle.timing}
            onChange={(e) => setButtonStyle({ 
              ...buttonStyle, 
              timing: parseInt(e.target.value) 
            })}
            fullWidth
            size="small"
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onClose}>
            Annuler
          </Button>
          <Button 
            variant="contained"
            onClick={handleConfirm}
            disabled={!choice.trim()}
          >
            Confirmer
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

function NodeEditor({ videos, onScenarioChange }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [choiceDialog, setChoiceDialog] = useState({ open: false, edge: null });

  // Initialiser les nœuds en cercle
  React.useEffect(() => {
    const radius = Math.max(200, videos.length * 50);
    const angleStep = (2 * Math.PI) / videos.length;
    
    const newNodes = videos.map((url, index) => {
      const angle = index * angleStep;
      return {
        id: index.toString(),
        type: 'videoNode',
        position: { 
          x: 400 + radius * Math.cos(angle), 
          y: 300 + radius * Math.sin(angle)
        },
        data: { url, label: `Video ${index + 1}` }
      };
    });
    setNodes(newNodes);
  }, [videos]);

  const onConnect = React.useCallback((params) => {
    setChoiceDialog({
      open: true,
      connection: params,
      edge: null
    });
  }, []);

  const handleChoiceConfirm = (data) => {
    if (choiceDialog.edge) {
      setEdges(edges.map(edge => 
        edge.id === choiceDialog.edge.id 
          ? { 
              ...edge, 
              label: data.choice,
              data: { buttonStyle: data.buttonStyle }
            }
          : edge
      ));
    } else {
      const edge = {
        ...choiceDialog.connection,
        label: data.choice,
        data: { buttonStyle: data.buttonStyle },
        type: 'default',
        animated: true,
        style: { stroke: data.buttonStyle.color }
      };
      setEdges(prev => addEdge(edge, prev));
    }
    setChoiceDialog({ open: false, edge: null });
    
    // Notifier le changement de scénario
    const scenario = {
      nodes: nodes.map(node => ({
        id: node.id,
        video: node.data.url,
        choices: edges
          .filter(edge => edge.source === node.id)
          .map(edge => ({
            choice: edge.label,
            buttonStyle: edge.data?.buttonStyle,
            nextVideo: edge.target
          }))
      }))
    };
    onScenarioChange(scenario);
  };

  const onEdgeClick = (_, edge) => {
    setChoiceDialog({
      open: true,
      edge,
      connection: null
    });
  };

  return (
    <Box sx={{ width: '100%', height: '100%', bgcolor: '#f5f5f5' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{
          style: { strokeWidth: 2 },
          type: 'default'
        }}
        fitView
      >
        <Panel position="top-left" style={{ margin: 10 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              💡 Conseils :
            </Typography>
            <Typography variant="body2" color="text.secondary" component="ul" sx={{ mt: 1, pl: 2 }}>
              <li>Glissez entre deux vidéos pour créer un lien</li>
              <li>Cliquez sur un lien pour modifier son texte et son style</li>
              <li>Survolez une vidéo pour la prévisualiser</li>
              <li>Personnalisez l'apparence des boutons de choix</li>
            </Typography>
          </Paper>
        </Panel>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      <ChoiceDialog 
        open={choiceDialog.open}
        edge={choiceDialog.edge}
        onClose={() => setChoiceDialog({ open: false, edge: null })}
        onConfirm={handleChoiceConfirm}
      />
    </Box>
  );
}

export default NodeEditor;
