import React, { useState, useRef } from 'react';
import { Box, Button, Typography } from '@mui/material';
import ReactPlayer from 'react-player';

function ScenarioPlayer({ scenario, onClose }) {
  const [currentNodeId, setCurrentNodeId] = useState(scenario.nodes[0]?.id);
  const [showChoices, setShowChoices] = useState(false);
  const playerRef = useRef(null);

  const currentNode = scenario.nodes.find(node => node.id === currentNodeId);
  
  const handleVideoEnd = () => {
    if (currentNode.choices.length > 0) {
      setShowChoices(true);
    } else {
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
        onEnded={handleVideoEnd}
        style={{ maxHeight: '100vh' }}
      />

      {showChoices && (
        <Box
          sx={{
            position: 'absolute',
            bottom: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            alignItems: 'center'
          }}
        >
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            Que voulez-vous faire ?
          </Typography>
          {currentNode.choices.map((choice, index) => (
            <Button
              key={index}
              variant="contained"
              size="large"
              onClick={() => handleChoice(choice.nextVideo)}
              sx={{ 
                minWidth: 200,
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                color: 'black',
                '&:hover': {
                  bgcolor: 'white'
                }
              }}
            >
              {choice.choice}
            </Button>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default ScenarioPlayer;
