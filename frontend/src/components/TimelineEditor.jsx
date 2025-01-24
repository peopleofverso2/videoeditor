import React, { useState, useRef } from 'react';
import { Box, Slider, IconButton, Paper } from '@mui/material';
import { ContentCut, Add } from '@mui/icons-material';

const TimelineEditor = ({ videoUrl, onTimelineUpdate }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [markers, setMarkers] = useState([]);
  const videoRef = useRef(null);

  const handleTimeUpdate = (e) => {
    setCurrentTime(e.target.currentTime);
  };

  const handleLoadedMetadata = (e) => {
    setDuration(e.target.duration);
  };

  const addMarker = () => {
    const newMarker = {
      time: currentTime,
      type: 'cut'
    };
    setMarkers([...markers, newMarker].sort((a, b) => a.time - b.time));
    onTimelineUpdate(markers);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
      <Box sx={{ width: '100%', position: 'relative' }}>
        <video
          ref={videoRef}
          src={videoUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          style={{ width: '100%' }}
        />
        
        <Box sx={{ px: 2, py: 1 }}>
          <Slider
            value={currentTime}
            max={duration}
            onChange={(_, value) => {
              videoRef.current.currentTime = value;
              setCurrentTime(value);
            }}
            marks={markers.map(marker => ({
              value: marker.time,
              label: formatTime(marker.time)
            }))}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <IconButton onClick={addMarker} title="Add cut point">
              <ContentCut />
            </IconButton>
            <IconButton onClick={() => videoRef.current.play()}>
              <Add />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default TimelineEditor;
