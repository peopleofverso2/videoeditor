const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  createdBy: { type: String, required: true },
  collaborators: [String],
  scenes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scene'
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', ProjectSchema);
