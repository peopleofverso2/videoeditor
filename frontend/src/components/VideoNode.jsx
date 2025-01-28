import React, { useState } from 'react';
import { Handle } from 'react-flow-renderer';
import { Card, CardContent, Typography, IconButton } from '@mui/material';
import { PlayArrow, Pause, Edit } from '@mui/icons-material';
import ReactPlayer from 'react-player';

const VideoNode = ({ data }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  return (
    <Card sx={{ width: 280, bgcolor: 'background.paper' }}>
      <Handle type="target" position="top" />
      
      <CardContent>
        <Typography variant="h6" component="div">
          {data.title}
          <IconButton 
            size="small" 
            onClick={() => setShowEditor(true)}
            sx={{ float: 'right' }}
          >
            <Edit />
          </IconButton>
        </Typography>

        <div style={{ position: 'relative', paddingTop: '56.25%' }}>
          <ReactPlayer
            url={data.videoUrl}
            width="100%"
            height="100%"
            playing={isPlaying}
            controls={true}
            style={{ position: 'absolute', top: 0 }}
            onStart={() => console.log('Video started')}
            onEnded={() => setIsPlaying(false)}
            config={{
              file: {
                attributes: {
                  controlsList: 'nodownload'
                }
              }
            }}
          />
        </div>

        <IconButton onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? <Pause /> : <PlayArrow />}
        </IconButton>
      </CardContent>

      <Handle type="source" position="bottom" />
    </Card>
  );
};

export default VideoNode;
