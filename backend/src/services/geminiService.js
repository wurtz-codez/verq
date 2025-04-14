const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('../config/config');

/**
 * Generate a brief interview question based on the resume text and role using Google's Gemini AI
 * @param {string} resumeText - Extracted text from the resume
 * @param {string} role - The role the candidate is applying for
 * @returns {Promise<string>} - Generated interview question
 */
async function generateInterviewQuestion(resumeText, role) {
  const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

  const prompt = `Based on the following resume text and the role the candidate is applying for, generate a single technical interview question and should be brief with around 2-3 lines. 
  The question should be moderate to high difficulty and should focus on:
  1. The projects mentioned in the resume
  2. The technical skills listed
  3. The technologies used in their projects
  4. The specific requirements and responsibilities of the role they're applying for
  
  The question should test their deep understanding of the technologies and concepts they claim to know, 
  while also assessing their fit for the specific role.
  Make the question specific and detailed, requiring them to demonstrate practical knowledge.
  
  Role: ${role}
  Resume Text:
  ${resumeText}
  
  Generate only the question, without any additional explanation or context.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating interview question with Gemini:', error);
    
    if (error.message.includes('API key')) {
      throw new Error(
        'Invalid Gemini API key. Please check your .env file and ensure GEMINI_API_KEY is set correctly.'
      );
    } else if (error.message.includes('quota')) {
      throw new Error(
        'Gemini API quota exceeded. Please check your Google Cloud Console for quota limits.'
      );
    } else {
      throw new Error(`Failed to generate interview question: ${error.message}`);
    }
  }
}

/**
 * Evaluate an interview answer using Google's Gemini AI
 * @param {string} question - The interview question
 * @param {string} answer - The candidate's answer transcript
 * @returns {Promise<Object>} - Evaluation results with scores and feedback
 */
async function evaluateAnswer(question, answer) {
  const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

  const prompt = `You are an expert technical interviewer. Please evaluate the following interview answer based on the question asked.

Question: ${question}

Answer: ${answer}

Please provide a concise evaluation in the following format:

1. Clarity Score (1-10): [score]
   - Brief explanation: [1-2 sentences]

2. Technical Accuracy Score (1-10): [score]
   - Brief explanation: [1-2 sentences]

3. Language & Communication Score (1-10): [score]
   - Brief explanation: [1-2 sentences]

4. Overall Feedback:
   - Key Strengths: [2-3 bullet points]
   - Main Areas to Improve: [2-3 bullet points]
   - Top Recommendations: [2-3 bullet points]

5. Final Score (1-10): [overall score]

Keep explanations brief and focused on the most important points.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const evaluationText = response.text().trim();

    // Helper function to safely extract scores
    const extractScore = (text, pattern) => {
      const match = text.match(pattern);
      return match ? parseInt(match[1]) : 0;
    };

    // Helper function to safely extract text
    const extractText = (text, pattern) => {
      const match = text.match(pattern);
      return match ? match[1].trim() : '';
    };

    // Helper function to safely extract bullet points
    const extractBulletPoints = (text, pattern) => {
      const match = text.match(pattern);
      if (!match) return [];
      return match[1].trim().split('\n')
        .map(point => point.replace(/^[-•*]\s*/, '').trim())
        .filter(point => point.length > 0);
    };

    const evaluation = {
      clarity: {
        score: extractScore(evaluationText, /Clarity Score \(1-10\): (\d+)/),
        explanation: extractText(evaluationText, /Brief explanation: (.*?)(?=\n|$)/s)
      },
      technicalAccuracy: {
        score: extractScore(evaluationText, /Technical Accuracy Score \(1-10\): (\d+)/),
        explanation: extractText(evaluationText, /Brief explanation: (.*?)(?=\n|$)/s)
      },
      language: {
        score: extractScore(evaluationText, /Language & Communication Score \(1-10\): (\d+)/),
        explanation: extractText(evaluationText, /Brief explanation: (.*?)(?=\n|$)/s)
      },
      strengths: extractBulletPoints(evaluationText, /Key Strengths: (.*?)(?=\n|$)/s),
      areasForImprovement: extractBulletPoints(evaluationText, /Main Areas to Improve: (.*?)(?=\n|$)/s),
      recommendations: extractBulletPoints(evaluationText, /Top Recommendations: (.*?)(?=\n|$)/s),
      overallScore: extractScore(evaluationText, /Final Score \(1-10\): (\d+)/)
    };

    return evaluation;
  } catch (error) {
    console.error('Error evaluating answer with Gemini:', error);
    throw new Error(`Failed to evaluate answer: ${error.message}`);
  }
}

/**
 * Generate a follow-up question based on the previous answer and evaluation
 * @param {string} resumeText - Extracted text from the resume
 * @param {string} previousQuestion - The previous question asked
 * @param {string} answer - The candidate's answer
 * @param {Object} evaluation - The evaluation of the previous answer
 * @returns {Promise<string>} - Generated follow-up question
 */
async function generateFollowUpQuestion(resumeText, previousQuestion, answer, evaluation) {
  const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

  const prompt = `Based on the following information, generate a follow-up question:

Previous Question: ${previousQuestion}
Candidate's Answer: ${answer}
Evaluation: ${JSON.stringify(evaluation)}

If the answer was irrelevant or scored low on technical accuracy, generate a new question based on the resume that tests their knowledge in a different area.
If the answer was good, generate a deeper follow-up question that builds on their response and tests their understanding further.

Resume Text:
${resumeText}

Generate only the question, without any additional explanation or context.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating follow-up question with Gemini:', error);
    throw new Error(`Failed to generate follow-up question: ${error.message}`);
  }
}

module.exports = {
  generateInterviewQuestion,
  evaluateAnswer,
  generateFollowUpQuestion
}; 