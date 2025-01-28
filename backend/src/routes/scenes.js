const express = require('express');
const router = express.Router();
const Scene = require('../models/Scene');
const multer = require('multer');
const path = require('path');
const { analyzeVideo } = require('../services/aiService');

// Configure multer for video upload
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// Get all scenes for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const scenes = await Scene.find({ project: req.params.projectId });
    res.json(scenes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Upload video and create new scene
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    // Analyze video with AI
    const aiAnalysis = await analyzeVideo(req.file.path);
    
    const scene = new Scene({
      title: req.body.title,
      videoUrl: `/uploads/${req.file.filename}`,
      endTime: req.body.duration,
      metadata: {
        aiTags: aiAnalysis.tags,
        characters: aiAnalysis.characters,
        description: aiAnalysis.description
      }
    });

    const newScene = await scene.save();
    res.status(201).json(newScene);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update scene
router.patch('/:id', async (req, res) => {
  try {
    const scene = await Scene.findById(req.params.id);
    
    if (req.body.title) scene.title = req.body.title;
    if (req.body.startTime !== undefined) scene.startTime = req.body.startTime;
    if (req.body.endTime !== undefined) scene.endTime = req.body.endTime;
    if (req.body.transitions) scene.transitions = req.body.transitions;
    
    const updatedScene = await scene.save();
    res.json(updatedScene);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete scene
router.delete('/:id', async (req, res) => {
  try {
    await Scene.findByIdAndDelete(req.params.id);
    res.json({ message: 'Scene deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
