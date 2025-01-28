import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, LinearProgress } from '@mui/material';
import ReactPlayer from 'react-player';
import CloseIcon from '@mui/icons-material/Close';

function SequencePlayer({ videos, transitions, onClose }) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [nextVideoReady, setNextVideoReady] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const playerRef = useRef(null);
  const nextPlayerRef = useRef(null);
  const [progress, setProgress] = useState(0);

  const currentVideo = videos[currentVideoIndex];
  const nextVideo = videos[currentVideoIndex + 1];
  const currentTransition = transitions.find(t => t.from === currentVideoIndex);

  const handleProgress = ({ played }) => {
    setProgress(played * 100);

    // Précharger la prochaine vidéo quand on approche de la fin
    if (played > 0.8 && nextVideo && !nextVideoReady) {
      setNextVideoReady(true);
    }
  };

  const handleVideoEnd = async () => {
    if (currentVideoIndex >= videos.length - 1) {
      onClose();
      return;
    }

    if (currentTransition?.type === 'fade') {
      // Fondu au noir (500ms)
      for (let i = 100; i >= 0; i -= 4) {
        setOpacity(i / 100);
        await new Promise(resolve => setTimeout(resolve, 15));
      }
      setCurrentVideoIndex(prev => prev + 1);
      for (let i = 0; i <= 100; i += 4) {
        setOpacity(i / 100);
        await new Promise(resolve => setTimeout(resolve, 15));
      }
    } else if (currentTransition?.type === 'crossfade') {
      setIsTransitioning(true);
      if (nextPlayerRef.current) {
        nextPlayerRef.current.seekTo(0);
      }
      // Crossfade plus lent (600ms)
      for (let i = 0; i <= 100; i += 4) {
        setOpacity(1 - (i / 100));
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      setCurrentVideoIndex(prev => prev + 1);
      setIsTransitioning(false);
      setOpacity(1);
    } else {
      // Cut direct
      setCurrentVideoIndex(prev => prev + 1);
    }
  };

  return (
    <Box 
      sx={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        bgcolor: 'black',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999
      }}
    >
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2
        }}
      />

      <Box 
        sx={{ 
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Vidéo actuelle */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: opacity,
            transition: currentTransition?.type === 'crossfade' ? 'opacity 0.6s ease' : 'opacity 0.5s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ReactPlayer
            ref={playerRef}
            url={currentVideo}
            width="100%"
            height="100%"
            playing
            onEnded={handleVideoEnd}
            onProgress={handleProgress}
            style={{ maxHeight: '100vh' }}
          />
        </Box>

        {/* Prochaine vidéo (pour le crossfade) */}
        {nextVideo && (currentTransition?.type === 'crossfade' || nextVideoReady) && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: isTransitioning ? 1 - opacity : 0,
              transition: 'opacity 0.6s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ReactPlayer
              ref={nextPlayerRef}
              url={nextVideo}
              width="100%"
              height="100%"
              playing={isTransitioning}
              style={{ maxHeight: '100vh' }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default SequencePlayer;
