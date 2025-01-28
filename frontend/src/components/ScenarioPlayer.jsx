import React, { useState, useRef } from 'react';
import { Box, Button, Typography, Fade } from '@mui/material';
import ReactPlayer from 'react-player';

const getButtonPosition = (position) => {
  switch (position) {
    case 'top':
      return {
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        flexDirection: 'column'
      };
    case 'bottom':
      return {
        bottom: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        flexDirection: 'column'
      };
    case 'left':
      return {
        left: '10%',
        top: '50%',
        transform: 'translateY(-50%)',
        flexDirection: 'row'
      };
    case 'right':
      return {
        right: '10%',
        top: '50%',
        transform: 'translateY(-50%)',
        flexDirection: 'row'
      };
    default:
      return {
        bottom: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        flexDirection: 'column'
      };
  }
};

const getButtonStyle = (style) => {
  const baseStyle = {
    minWidth: 200,
    m: 1
  };

  // Taille
  if (style.size === 'small') {
    baseStyle.minWidth = 150;
    baseStyle.fontSize = '0.875rem';
  } else if (style.size === 'large') {
    baseStyle.minWidth = 250;
    baseStyle.fontSize = '1.2rem';
  }

  // Forme
  if (style.shape === 'circular') {
    baseStyle.borderRadius = '50px';
  } else if (style.shape === 'square') {
    baseStyle.borderRadius = '4px';
  }

  return {
    ...baseStyle,
    bgcolor: `${style.color}dd`,
    color: 'white',
    '&:hover': {
      bgcolor: style.color
    }
  };
};

function ScenarioPlayer({ scenario, onClose }) {
  const [currentNodeId, setCurrentNodeId] = useState(scenario.nodes[0]?.id);
  const [showChoices, setShowChoices] = useState(false);
  const [progress, setProgress] = useState(0);
  const playerRef = useRef(null);

  const currentNode = scenario.nodes.find(node => node.id === currentNodeId);
  
  const handleProgress = ({ played }) => {
    setProgress(played);

    // Vérifier si on doit afficher les choix avant la fin
    const player = playerRef.current?.getInternalPlayer();
    if (player) {
      const duration = player.duration;
      const currentTime = player.currentTime;
      const timeRemaining = duration - currentTime;

      const shouldShowChoices = currentNode.choices.some(choice => {
        const timing = choice.buttonStyle?.timing || 0;
        return timing < 0 && timeRemaining <= Math.abs(timing);
      });

      if (shouldShowChoices && !showChoices) {
        setShowChoices(true);
      }
    }
  };

  const handleVideoEnd = () => {
    if (!showChoices && currentNode.choices.length > 0) {
      setShowChoices(true);
    } else if (currentNode.choices.length === 0) {
      onClose();
    }
  };

  const handleChoice = (nextVideo) => {
    setShowChoices(false);
    setCurrentNodeId(nextVideo);
  };

  if (!currentNode) return null;

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
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <ReactPlayer
        ref={playerRef}
        url={currentNode.video}
        width="100%"
        height="100%"
        playing
        onProgress={handleProgress}
        onEnded={handleVideoEnd}
        progressInterval={100}
        style={{ maxHeight: '100vh' }}
      />

      {showChoices && currentNode.choices.map((choice, index) => {
        const position = getButtonPosition(choice.buttonStyle?.position || 'bottom');
        const buttonStyle = getButtonStyle(choice.buttonStyle || {});

        return (
          <Fade 
            key={index} 
            in={showChoices}
            timeout={500}
          >
            <Box
              sx={{
                position: 'absolute',
                display: 'flex',
                gap: 2,
                ...position
              }}
            >
              <Button
                variant="contained"
                onClick={() => handleChoice(choice.nextVideo)}
                sx={buttonStyle}
              >
                {choice.choice}
              </Button>
            </Box>
          </Fade>
        );
      })}
    </Box>
  );
}

export default ScenarioPlayer;
