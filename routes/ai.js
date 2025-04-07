const express = require('express');
const router = express.Router();
const { generateImage, generate3DModel } = require('../utils/ai');

/**
 * @route POST /api/ai/generate-image
 * @desc Generate an image using AI
 * @access Public
 */
router.post('/generate-image', async (req, res) => {
  try {
    const { prompt, options } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }
    
    const result = await generateImage(prompt, options);
    res.json(result);
  } catch (error) {
    console.error('Error in generate-image endpoint:', error);
    res.status(500).json({ success: false, message: 'Error generating image', error: error.message });
  }
});

/**
 * @route POST /api/ai/generate-3d-model
 * @desc Generate a 3D model using AI
 * @access Public
 */
router.post('/generate-3d-model', async (req, res) => {
  try {
    const { prompt, options } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }
    
    const result = await generate3DModel(prompt, options);
    res.json(result);
  } catch (error) {
    console.error('Error in generate-3d-model endpoint:', error);
    res.status(500).json({ success: false, message: 'Error generating 3D model', error: error.message });
  }
});

module.exports = router; 