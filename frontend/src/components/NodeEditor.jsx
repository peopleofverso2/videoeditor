import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Dialog, TextField, Typography, Paper } from '@mui/material';
import ReactFlow, { 
  Background, 
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  Handle,
  Position
} from 'reactflow';
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
          boxShadow: 6
        }
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#2196f3',
          width: 10,
          height: 10
        }}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#2196f3',
          width: 10,
          height: 10
        }}
      />

      <Box sx={{ position: 'relative' }}>
        <video 
          src={data.video} 
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
    timing: 0
  });

  const handleConfirm = () => {
    onConfirm({
      choice,
      buttonStyle
    });
    onClose();
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

        <TextField
          type="number"
          label="Timing (secondes avant la fin, 0 = à la fin)"
          value={buttonStyle.timing}
          onChange={(e) => setButtonStyle({ ...buttonStyle, timing: Number(e.target.value) })}
          fullWidth
          sx={{ mb: 3 }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onClose}>
            Annuler
          </Button>
          <Button 
            variant="contained" 
            onClick={handleConfirm}
            disabled={!choice}
          >
            Confirmer
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

function NodeEditor({ videos, onScenarioChange, initialScenario }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (initialScenario) {
      console.log('Loading initial scenario:', initialScenario);
      const newNodes = initialScenario.nodes.map(node => ({
        id: node.id,
        type: 'videoNode',
        position: node.position || { x: 0, y: 0 },
        data: { video: node.video, label: node.label }
      }));

      const newEdges = [];
      initialScenario.nodes.forEach(node => {
        if (node.choices) {
          node.choices.forEach(choice => {
            newEdges.push({
              id: `${node.id}-${choice.nextVideo}`,
              source: node.id,
              target: choice.nextVideo,
              data: {
                choice: choice.choice,
                buttonStyle: choice.buttonStyle
              }
            });
          });
        }
      });

      setNodes(newNodes);
      setEdges(newEdges);
    } else if (videos.length > 0 && nodes.length === 0) {
      console.log('Creating initial nodes from videos:', videos);
      const initialNodes = videos.map((video, index) => ({
        id: `${index}`,
        type: 'videoNode',
        position: { x: index * 250, y: 0 },
        data: { video, label: `Video ${index + 1}` }
      }));
      setNodes(initialNodes);
    }
  }, [videos, initialScenario]);

  const onConnect = useCallback((params) => {
    setSelectedEdge({
      source: params.source,
      target: params.target
    });
    setDialogOpen(true);
  }, []);

  const onEdgeClick = useCallback((_, edge) => {
    setSelectedEdge(edge);
    setDialogOpen(true);
  }, []);

  const handleDialogConfirm = useCallback((data) => {
    if (selectedEdge.id) {
      setEdges(edges => edges.map(edge => 
        edge.id === selectedEdge.id
          ? { ...edge, data }
          : edge
      ));
    } else {
      const newEdge = {
        id: `${selectedEdge.source}-${selectedEdge.target}`,
        source: selectedEdge.source,
        target: selectedEdge.target,
        data
      };
      setEdges(edges => [...edges, newEdge]);
    }
    setDialogOpen(false);
    setSelectedEdge(null);
  }, [selectedEdge]);

  useEffect(() => {
    const scenario = {
      nodes: nodes.map(node => ({
        id: node.id,
        video: node.data.video,
        label: node.data.label,
        position: node.position,
        choices: edges
          .filter(edge => edge.source === node.id)
          .map(edge => ({
            nextVideo: edge.target,
            choice: edge.data.choice,
            buttonStyle: edge.data.buttonStyle
          }))
      }))
    };
    onScenarioChange(scenario);
  }, [nodes, edges, onScenarioChange]);

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
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
        <Panel position="top-left" style={{ margin: 10 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              💡 Conseils :
            </Typography>
            <Typography variant="body2" color="text.secondary" component="ul" sx={{ mt: 1, pl: 2 }}>
              <li>Glissez entre deux vidéos pour créer un lien</li>
              <li>Cliquez sur un lien pour modifier son texte et son style</li>
              <li>Survolez une vidéo pour la prévisualiser</li>
            </Typography>
          </Paper>
        </Panel>
      </ReactFlow>

      <ChoiceDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedEdge(null);
        }}
        edge={selectedEdge}
        onConfirm={handleDialogConfirm}
      />
    </Box>
  );
}

export default NodeEditor;
