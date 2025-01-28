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

  const handleChoiceConfirm = (choice) => {
    if (choiceDialog.edge) {
      setEdges(edges.map(edge => 
        edge.id === choiceDialog.edge.id 
          ? { ...edge, label: choice }
          : edge
      ));
    } else {
      const edge = {
        ...choiceDialog.connection,
        label: choice,
        type: 'default',
        animated: true,
        style: { stroke: '#2196f3' }
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
              Conseils :
            </Typography>
            <Typography variant="body2" color="text.secondary" component="ul" sx={{ mt: 1, pl: 2 }}>
              <li>Glissez entre deux vidéos pour créer un lien</li>
              <li>Cliquez sur un lien pour modifier son texte</li>
              <li>Survolez une vidéo pour la prévisualiser</li>
            </Typography>
          </Paper>
        </Panel>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      <Dialog 
        open={choiceDialog.open} 
        onClose={() => setChoiceDialog({ open: false, edge: null })}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {choiceDialog.edge ? 'Modifier le choix' : 'Ajouter un choix'}
          </Typography>
          <TextField
            autoFocus
            label="Texte du choix"
            defaultValue={choiceDialog.edge?.label || ''}
            fullWidth
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleChoiceConfirm(e.target.value);
              }
            }}
          />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button 
              onClick={() => setChoiceDialog({ open: false, edge: null })}
            >
              Annuler
            </Button>
            <Button 
              variant="contained"
              onClick={(e) => handleChoiceConfirm(
                e.target.parentElement.parentElement.querySelector('input').value
              )}
            >
              Confirmer
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}

export default NodeEditor;
