const mongoose = require('mongoose');

const SceneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  videoUrl: { type: String, required: true },
  startTime: { type: Number, default: 0 },
  endTime: { type: Number, required: true },
  transitions: [{
    targetSceneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scene' },
    condition: {
      type: { type: String, enum: ['choice', 'time', 'variable'], required: true },
      value: mongoose.Schema.Types.Mixed
    },
    position: { x: Number, y: Number }
  }],
  metadata: {
    aiTags: [String],
    characters: [String],
    description: String
  }
});

module.exports = mongoose.model('Scene', SceneSchema);
