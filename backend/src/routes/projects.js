const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

// Get all projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().populate('scenes');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new project
router.post('/', async (req, res) => {
  const project = new Project({
    name: req.body.name,
    description: req.body.description,
    createdBy: req.body.createdBy
  });

  try {
    const newProject = await project.save();
    res.status(201).json(newProject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update project
router.patch('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (req.body.name) project.name = req.body.name;
    if (req.body.description) project.description = req.body.description;
    if (req.body.collaborators) project.collaborators = req.body.collaborators;
    
    project.updatedAt = Date.now();
    const updatedProject = await project.save();
    res.json(updatedProject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
