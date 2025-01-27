const { VideoIntelligenceServiceClient } = require('@google-cloud/video-intelligence');
const fs = require('fs');

const client = new VideoIntelligenceServiceClient();

async function analyzeVideo(videoPath) {
  try {
    const videoBytes = fs.readFileSync(videoPath);

    const request = {
      inputContent: videoBytes.toString('base64'),
      features: [
        'LABEL_DETECTION',
        'SHOT_CHANGE_DETECTION',
        'PERSON_DETECTION',
      ],
    };

    const [operation] = await client.annotateVideo(request);
    const [result] = await operation.promise();

    // Process shot changes for scene suggestions
    const shots = result.shotAnnotations || [];
    const scenes = shots.map((shot, index) => ({
      startTime: shot.startTimeOffset.seconds || 0,
      endTime: shot.endTimeOffset.seconds || 0,
      index: index + 1
    }));

    // Process labels for tags
    const labels = result.labelAnnotations || [];
    const tags = labels.map(label => label.entity.description);

    // Process person detection
    const persons = result.personDetectionAnnotations || [];
    const characters = [...new Set(persons.map(person => 
      person.tracks[0]?.timestampedObjects[0]?.attributes[0]?.name || 'Unknown Person'
    ))];

    // Generate scene descriptions using detected elements
    const description = generateSceneDescription(labels, persons);

    return {
      scenes,
      tags: [...new Set(tags)], // Remove duplicates
      characters,
      description
    };
  } catch (error) {
    console.error('Error analyzing video:', error);
    throw error;
  }
}

function generateSceneDescription(labels, persons) {
  const mainElements = labels
    .filter(label => label.confidence > 0.7)
    .slice(0, 5)
    .map(label => label.entity.description);

  const peopleCount = persons.length;
  
  return {
    elements: mainElements,
    peopleCount,
    summary: `Scene contains ${peopleCount} people and shows: ${mainElements.join(', ')}`
  };
}

// Function to suggest scene transitions based on content
function suggestTransitions(scenes) {
  return scenes.map(scene => ({
    ...scene,
    suggestedTransitions: {
      type: 'choice',
      options: generateTransitionOptions(scene)
    }
  }));
}

function generateTransitionOptions(scene) {
  // Generate contextual transition options based on scene content
  const options = [];
  
  if (scene.tags.includes('person')) {
    options.push({
      text: 'Follow this character',
      type: 'character_follow'
    });
  }
  
  options.push({
    text: 'Continue to next scene',
    type: 'linear'
  });
  
  return options;
}

module.exports = {
  analyzeVideo,
  suggestTransitions
};
