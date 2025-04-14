const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Interview = require('../models/Interview');
const { createInterview, getUserInterviews, updateInterviewStatus, addQuestionAnswer } = require('../services/interviewService');
const { processPDF } = require('../services/pdfService');
const { generateInterviewQuestion, evaluateAnswer } = require('../services/geminiService');
const { speechToText } = require('../services/deepgramService');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and audio files are allowed.'));
    }
  }
});

// Start a new interview
router.post('/start', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    console.log('Starting new interview for user:', req.user.uid);
    
    const { jobRole } = req.body;
    const resume = req.file;
    
    if (!resume || !jobRole) {
      console.error('Missing required fields:', { hasResume: !!resume, hasJobRole: !!jobRole });
      return res.status(400).json({
        status: 'error',
        message: 'Resume and job role are required'
      });
    }

    console.log('Processing PDF and creating interview...');
    // Process PDF and create interview
    const resumeText = await processPDF(resume.buffer);
    const interview = await createInterview(req.user.uid, jobRole, resumeText);

    console.log('Generating first question...');
    // Generate first question
    const question = await generateInterviewQuestion(resumeText, jobRole);

    console.log('Interview started successfully:', interview._id);
    res.status(201).json({
      status: 'success',
      data: {
        interviewId: interview._id,
        question
      }
    });
  } catch (error) {
    console.error('Error in /start route:', {
      userId: req.user?.uid,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to start interview'
    });
  }
});

// Get interview details
router.get('/:interviewId', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching interview:', req.params.interviewId);
    
    const interview = await Interview.findById(req.params.interviewId);
    
    if (!interview) {
      console.error('Interview not found:', req.params.interviewId);
      return res.status(404).json({
        status: 'error',
        message: 'Interview not found'
      });
    }

    // Check if user owns the interview
    if (interview.user.toString() !== req.user._id.toString()) {
      console.error('Unauthorized access attempt:', {
        interviewId: req.params.interviewId,
        userId: req.user._id
      });
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized access'
      });
    }

    console.log('Interview fetched successfully:', req.params.interviewId);
    res.status(200).json({
      status: 'success',
      data: interview
    });
  } catch (error) {
    console.error('Error in GET /:interviewId route:', {
      interviewId: req.params.interviewId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch interview'
    });
  }
});

// Submit answer and get next question
router.post('/:interviewId/answer', authMiddleware, upload.single('audio'), async (req, res) => {
  try {
    console.log('Processing answer for interview:', req.params.interviewId);
    
    const audio = req.file;
    const { currentQuestion } = req.body;
    
    if (!audio || !currentQuestion) {
      console.error('Missing required fields:', { hasAudio: !!audio, hasQuestion: !!currentQuestion });
      return res.status(400).json({
        status: 'error',
        message: 'Audio file and current question are required'
      });
    }

    console.log('Converting speech to text...');
    // Convert speech to text
    const transcript = await speechToText(audio.buffer);

    console.log('Evaluating answer...');
    // Evaluate answer
    const evaluation = await evaluateAnswer(currentQuestion, transcript);

    console.log('Adding question and answer to interview...');
    // Add question and answer to interview
    await addQuestionAnswer(
      req.params.interviewId,
      currentQuestion,
      transcript,
      evaluation
    );

    console.log('Generating next question...');
    // Generate next question
    const interview = await Interview.findById(req.params.interviewId);
    const nextQuestion = await generateInterviewQuestion(
      interview.resumeText,
      interview.jobRole
    );

    console.log('Answer processed successfully:', req.params.interviewId);
    res.status(200).json({
      status: 'success',
      data: {
        nextQuestion,
        evaluation
      }
    });
  } catch (error) {
    console.error('Error in /:interviewId/answer route:', {
      interviewId: req.params.interviewId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to process answer'
    });
  }
});

// Get user's interviews
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching interviews for user:', req.user.uid);
    
    const interviews = await getUserInterviews(req.user.uid);
    
    console.log(`Found ${interviews.length} interviews for user:`, req.user.uid);
    res.status(200).json({
      status: 'success',
      data: interviews
    });
  } catch (error) {
    console.error('Error in GET / route:', {
      userId: req.user.uid,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch interviews'
    });
  }
});

module.exports = router; 