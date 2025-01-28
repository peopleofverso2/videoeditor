import React, { useState, useRef } from 'react';
import { 
  ThemeProvider, 
  CssBaseline, 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  Grid,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
  AppBar,
  Toolbar
} from '@mui/material';
import { createTheme } from '@mui/material/styles';
import ReactPlayer from 'react-player';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SequencePlayer from './components/SequencePlayer';
import NodeEditor from './components/NodeEditor';
import ScenarioPlayer from './components/ScenarioPlayer';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#1e1e1e',
      paper: '#2d2d2d'
    }
  },
});

const TRANSITION_TYPES = {
  CUT: 'cut',
  FADE: 'fade',
  CROSSFADE: 'crossfade',
};

function VideoPlayer({ url, onDelete, onTransitionClick, isSelected, index }) {
  const playerRef = useRef(null);
  const containerRef = useRef(null);

  const toggleFullScreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error(`Erreur lors du passage en plein écran : ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        width: '100%',
        position: 'relative',
        aspectRatio: '16/9',
        outline: isSelected ? '3px solid #90caf9' : 'none',
        '&:fullscreen': {
          width: '100%',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '& .react-player': {
            maxHeight: '100vh'
          }
        }
      }}
    >
      <ReactPlayer
        ref={playerRef}
        url={url}
        width="100%"
        height="100%"
        controls
        playing={false}
        className="react-player"
      />
      <Box sx={{
        position: 'absolute',
        top: 8,
        right: 8,
        display: 'flex',
        gap: 1
      }}>
        <IconButton
          onClick={() => onTransitionClick(index)}
          sx={{
            bgcolor: 'rgba(0,0,0,0.5)',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.7)'
            }
          }}
        >
          <LinkIcon />
        </IconButton>
        <IconButton
          onClick={onDelete}
          sx={{
            bgcolor: 'rgba(0,0,0,0.5)',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.7)'
            }
          }}
        >
          <DeleteIcon />
        </IconButton>
        <IconButton
          onClick={toggleFullScreen}
          sx={{
            bgcolor: 'rgba(0,0,0,0.5)',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.7)'
            }
          }}
        >
          <FullscreenIcon />
        </IconButton>
      </Box>
    </Box>
  );
}

function TransitionDialog({ open, onClose, onConfirm }) {
  const [transitionType, setTransitionType] = useState(TRANSITION_TYPES.CUT);

  const handleConfirm = () => {
    onConfirm(transitionType);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Créer une transition</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Type de transition</InputLabel>
          <Select
            value={transitionType}
            label="Type de transition"
            onChange={(e) => setTransitionType(e.target.value)}
          >
            <MenuItem value={TRANSITION_TYPES.CUT}>Cut (coupure nette)</MenuItem>
            <MenuItem value={TRANSITION_TYPES.FADE}>Fade (fondu au noir)</MenuItem>
            <MenuItem value={TRANSITION_TYPES.CROSSFADE}>Crossfade (fondu enchaîné)</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleConfirm} variant="contained">Créer</Button>
      </DialogActions>
    </Dialog>
  );
}

function App() {
  const [videos, setVideos] = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [scenario, setScenario] = useState(null);
  const [isPlayingScenario, setIsPlayingScenario] = useState(false);

  const handleDrop = async (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('video', file);

    try {
      const response = await fetch('http://localhost:3000/api/uploads/video', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setVideos(prev => [...prev, data.url]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('video', file);
      try {
        const response = await fetch('http://localhost:3000/api/uploads/video', {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        setVideos(prev => [...prev, data.url]);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const handleDeleteVideo = (index) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
    // Supprimer aussi les transitions liées à cette vidéo
    setTransitions(prev => prev.filter(t => t.from !== index && t.to !== index));
  };

  const handleTransitionClick = (index) => {
    if (selectedVideoIndex === null) {
      setSelectedVideoIndex(index);
    } else if (selectedVideoIndex !== index) {
      setDialogOpen(true);
    } else {
      setSelectedVideoIndex(null);
    }
  };

  const handleTransitionConfirm = (type) => {
    setTransitions(prev => [...prev, {
      from: selectedVideoIndex,
      to: selectedVideoIndex + 1,
      type
    }]);
    setSelectedVideoIndex(null);
    setDialogOpen(false);
  };

  const handleScenarioChange = (newScenario) => {
    console.log('Saving scenario:', newScenario);
    setScenario(newScenario);
  };

  const handlePlayScenario = () => {
    if (scenario && scenario.nodes.length > 0) {
      console.log('Starting scenario playback:', scenario);
      setIsPlayingScenario(true);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box 
        sx={{ 
          width: '100vw', 
          height: '100vh',
          p: 2,
          bgcolor: 'background.default',
          overflow: 'auto'
        }}
      >
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Éditeur de Vidéos Interactif
            </Typography>
            {videos.length > 0 && (
              <>
                <Button 
                  color="inherit" 
                  onClick={() => setShowNodeEditor(!showNodeEditor)}
                  sx={{ mr: 2 }}
                >
                  {showNodeEditor ? 'Retour à la galerie' : 'Éditeur de scénario'}
                </Button>
                {scenario && (
                  <Button 
                    color="inherit"
                    onClick={handlePlayScenario}
                  >
                    Lire le scénario
                  </Button>
                )}
              </>
            )}
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1, position: 'relative' }}>
          {showNodeEditor ? (
            <NodeEditor 
              videos={videos} 
              onScenarioChange={handleScenarioChange}
              initialScenario={scenario}
            />
          ) : (
            <Box sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ mb: 3 }}>
                Galerie de vidéos
              </Typography>
              <Grid container spacing={2}>
                {videos.map((url, index) => (
                  <Grid item xs={12} md={6} lg={4} key={url}>
                    <VideoPlayer 
                      url={url} 
                      onDelete={() => handleDeleteVideo(index)}
                      onTransitionClick={handleTransitionClick}
                      isSelected={selectedVideoIndex === index}
                      index={index}
                    />
                    {transitions.find(t => t.from === index) && (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          mt: 1, 
                          textAlign: 'center',
                          color: 'primary.main'
                        }}
                      >
                        Transition: {transitions.find(t => t.from === index).type}
                      </Typography>
                    )}
                  </Grid>
                ))}
                <Grid item xs={12} md={6} lg={4}>
                  <Box
                    sx={{
                      width: '100%',
                      aspectRatio: '16/9',
                      border: '3px dashed',
                      borderColor: 'grey.700',
                      borderRadius: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'background.paper',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'primary.main',
                        '& .MuiTypography-root': {
                          color: 'primary.main'
                        }
                      }
                    }}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    <AddIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Glissez et déposez une vidéo ici
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      ou
                    </Typography>
                    <Button 
                      variant="contained" 
                      component="label" 
                      sx={{ mt: 2 }}
                    >
                      <input 
                        type="file" 
                        hidden 
                        accept="video/*"
                        onChange={handleFileSelect}
                      />
                      Sélectionner un fichier
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          <TransitionDialog 
            open={dialogOpen}
            onClose={() => {
              setDialogOpen(false);
              setSelectedVideoIndex(null);
            }}
            onConfirm={handleTransitionConfirm}
          />

          {isPlayingSequence && (
            <SequencePlayer
              videos={videos}
              transitions={transitions}
              onClose={() => setIsPlayingSequence(false)}
            />
          )}

          {isPlayingScenario && scenario && (
            <ScenarioPlayer
              scenario={scenario}
              onClose={() => setIsPlayingScenario(false)}
            />
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
