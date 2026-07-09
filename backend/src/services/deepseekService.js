const OpenAI = require('openai');
const { config } = require('../config/config');

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: config.deepseek.apiKey,
});

const questionPrompt = (resumeText, role) => `Based on the following resume text and the role the candidate is applying for, generate a single technical interview question and should be brief with around 2-3 lines. 
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

async function generateInterviewQuestion(resumeText, role) {
  const completion = await deepseek.chat.completions.create({
    messages: [{ role: "user", content: questionPrompt(resumeText, role) }],
    model: "deepseek-v4-flash",
    stream: false,
  });
  return completion.choices[0].message.content.trim();
}

const evaluationPrompt = (question, answer) => `You are an expert technical interviewer. Please evaluate the following interview answer based on the question asked.

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

const extractScore = (text, pattern) => { const m = text.match(pattern); return m ? parseInt(m[1]) : 0; };
const extractText = (text, pattern) => { const m = text.match(pattern); return m ? m[1].trim() : ''; };
const extractBullets = (text, pattern) => {
  const m = text.match(pattern);
  if (!m) return [];
  return m[1].trim().split('\n').map(p => p.replace(/^[-•*]\s*/, '').trim()).filter(p => p);
};

const parseEvaluation = (text) => ({
  clarity: { score: extractScore(text, /Clarity Score \(1-10\): (\d+)/), explanation: extractText(text, /Brief explanation: (.*?)(?=\n|$)/s) },
  technicalAccuracy: { score: extractScore(text, /Technical Accuracy Score \(1-10\): (\d+)/), explanation: extractText(text, /Brief explanation: (.*?)(?=\n|$)/s) },
  language: { score: extractScore(text, /Language & Communication Score \(1-10\): (\d+)/), explanation: extractText(text, /Brief explanation: (.*?)(?=\n|$)/s) },
  strengths: extractBullets(text, /Key Strengths: (.*?)(?=\n|$)/s),
  areasForImprovement: extractBullets(text, /Main Areas to Improve: (.*?)(?=\n|$)/s),
  recommendations: extractBullets(text, /Top Recommendations: (.*?)(?=\n|$)/s),
  overallScore: extractScore(text, /Final Score \(1-10\): (\d+)/),
});

async function evaluateAnswer(question, answer) {
  const completion = await deepseek.chat.completions.create({
    messages: [{ role: "user", content: evaluationPrompt(question, answer) }],
    model: "deepseek-v4-flash",
    stream: false,
  });
  return parseEvaluation(completion.choices[0].message.content.trim());
}

async function generateFollowUpQuestion(resumeText, previousQuestion, answer, evaluation) {
  const prompt = `Based on the following information, generate a follow-up question:

Previous Question: ${previousQuestion}
Candidate's Answer: ${answer}
Evaluation: ${JSON.stringify(evaluation)}

If the answer was irrelevant or scored low on technical accuracy, generate a new question based on the resume that tests their knowledge in a different area.
If the answer was good, generate a deeper follow-up question that builds on their response and tests their understanding further.

Resume Text:
${resumeText}

Generate only the question, without any additional explanation or context.`;

  const completion = await deepseek.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "deepseek-v4-flash",
    stream: false,
  });
  return completion.choices[0].message.content.trim();
}

module.exports = {
  generateInterviewQuestion,
  evaluateAnswer,
  generateFollowUpQuestion,
};
