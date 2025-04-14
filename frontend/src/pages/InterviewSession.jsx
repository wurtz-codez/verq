import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';

const ServiceNode = ({ service, status, isActive }) => (
  <motion.div
    className={`p-4 rounded-lg border ${
      isActive
        ? 'bg-indigo-500/20 border-indigo-500/50'
        : status === 'completed'
        ? 'bg-green-500/20 border-green-500/50'
        : 'bg-gray-500/20 border-gray-500/50'
    }`}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${
        isActive
          ? 'bg-indigo-500 animate-pulse'
          : status === 'completed'
          ? 'bg-green-500'
          : 'bg-gray-500'
      }`} />
      <div>
        <h3 className="font-semibold text-white">{service}</h3>
        <p className="text-sm text-gray-400">
          {isActive ? 'Processing...' : status === 'completed' ? 'Completed' : 'Pending'}
        </p>
      </div>
    </div>
  </motion.div>
);

function InterviewSession() {
  const { interviewId: paramsInterviewId } = useParams();
  const [interview, setInterview] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [serviceStatus, setServiceStatus] = useState({
    pdfExtraction: 'pending',
    geminiQuestion: 'pending',
    textToSpeech: 'pending',
    speechToText: 'pending',
    geminiEvaluation: 'pending'
  });
  const [activeService, setActiveService] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef(null);

  // Get the actual interviewId from either params or localStorage
  const interviewId = paramsInterviewId || (() => {
    const savedInterview = localStorage.getItem('currentInterview');
    if (savedInterview) {
      try {
        const { id } = JSON.parse(savedInterview);
        return id;
      } catch (err) {
        console.error('Error parsing saved interview:', err);
        return null;
      }
    }
    return null;
  })();

  // Fetch interview data and set initial question
  useEffect(() => {
    const fetchInterview = async () => {
      if (!interviewId) {
        setError('No interview ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setActiveService('pdfExtraction');
        setServiceStatus(prev => ({ ...prev, pdfExtraction: 'in_progress' }));

        const { data } = await api.getInterviewById(interviewId);
        setInterview(data);
        
        // Set current question only if it's not already set
        if (!currentQuestion) {
          // First try to get the last question from the questions array
          const lastQuestion = data.questions?.[data.questions.length - 1]?.question;
          if (lastQuestion) {
            setCurrentQuestion(lastQuestion);
          } else {
            // If no questions in the array, try to get the current question from the interview data
            if (data.currentQuestion) {
              setCurrentQuestion(data.currentQuestion);
            } else {
              // If still no question, try to get it from localStorage
              const savedInterview = localStorage.getItem('currentInterview');
              if (savedInterview) {
                try {
                  const { question } = JSON.parse(savedInterview);
                  if (question) {
                    setCurrentQuestion(question);
                  } else {
                    setError('No questions available for this interview');
                  }
                } catch (err) {
                  console.error('Error parsing saved interview:', err);
                  setError('No questions available for this interview');
                }
              } else {
                setError('No questions available for this interview');
              }
            }
          }
        }
        
        setServiceStatus(prev => ({ ...prev, pdfExtraction: 'completed' }));
        setActiveService(null);
        setIsLoading(false);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchInterview();
  }, [interviewId]); // Only depend on interviewId

  const startRecording = async () => {
    try {
      // Reset states
      setAudioURL(null);
      setRecordingTime(0);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        await submitAnswer(audioBlob);
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Stop the media recorder
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setIsRecording(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [audioURL]);

  const submitAnswer = async (audioBlob) => {
    try {
      if (!interviewId) {
        throw new Error('Interview ID is missing');
      }

      setActiveService('speechToText');
      setServiceStatus(prev => ({ ...prev, speechToText: 'in_progress' }));

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('currentQuestion', currentQuestion);

      setActiveService('geminiEvaluation');
      setServiceStatus(prev => ({ 
        ...prev, 
        speechToText: 'completed',
        geminiEvaluation: 'in_progress' 
      }));

      const { data } = await api.submitAnswer(interviewId, formData);

      setServiceStatus(prev => ({ 
        ...prev, 
        geminiEvaluation: 'completed',
        geminiQuestion: 'in_progress' 
      }));
      setActiveService('geminiQuestion');

      // Update current question with the next one
      if (data.nextQuestion) {
        setCurrentQuestion(data.nextQuestion);
      }
      
      // Refresh interview data to show updated questions
      const { data: updatedInterview } = await api.getInterviewById(interviewId);
      setInterview(updatedInterview);

      setServiceStatus(prev => ({ ...prev, geminiQuestion: 'completed' }));
      setActiveService(null);
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError(err.message || 'Failed to submit answer');
      setServiceStatus(prev => ({
        ...prev,
        speechToText: 'pending',
        geminiEvaluation: 'pending',
        geminiQuestion: 'pending'
      }));
      setActiveService(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 sm:pt-32 px-4 sm:px-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20 sm:pt-32 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-center text-sm sm:text-base">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 sm:pt-32 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Left Section - Interview Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-8">
            <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl p-4 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 sm:mb-4">
                Interview for {interview?.jobRole}
              </h2>
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Status: {interview?.status}
              </div>
            </div>

            {currentQuestion && (
              <motion.div 
                className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl p-4 sm:p-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 sm:mb-4">
                  Current Question
                </h3>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-4 sm:mb-6">
                  {currentQuestion}
                </p>

                <div className="flex flex-col items-center gap-4">
                  {!isRecording ? (
                    <motion.button
                      onClick={startRecording}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-indigo-500 text-white rounded-full
                        hover:bg-indigo-600 transition-colors duration-200
                        flex items-center gap-2 text-sm sm:text-base"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      Start Recording
                    </motion.button>
                  ) : (
                    <>
                      <div className="text-center mb-2">
                        <span className="text-sm text-gray-400">
                          Recording: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <motion.button
                        onClick={stopRecording}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-red-500 text-white rounded-full
                          hover:bg-red-600 transition-colors duration-200
                          flex items-center gap-2 text-sm sm:text-base animate-pulse"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        Stop Recording
                      </motion.button>
                    </>
                  )}
                  
                  {audioURL && (
                    <div className="mt-4 w-full max-w-md">
                      <audio src={audioURL} controls className="w-full" />
                      <p className="text-sm text-gray-400 text-center mt-2">
                        Preview your recording before it's processed
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {interview?.questions?.map((qa, index) => (
              <motion.div
                key={index}
                className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl p-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Question {index + 1}
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {qa.question}
                </p>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Your Answer:
                </p>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {qa.answer}
                </p>
                {qa.evaluation && (
                  <div className="mt-4 p-4 bg-white/5 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Evaluation
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {qa.evaluation.feedback}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Right Section - Service Status */}
          <div className="space-y-4 sm:space-y-8">
            <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl p-4 sm:p-8">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Service Status
              </h3>
              <div className="space-y-3">
                <ServiceNode 
                  service="PDF Extraction" 
                  status={serviceStatus.pdfExtraction} 
                  isActive={activeService === 'pdfExtraction'} 
                />
                <ServiceNode 
                  service="Question Generation" 
                  status={serviceStatus.geminiQuestion} 
                  isActive={activeService === 'geminiQuestion'} 
                />
                <ServiceNode 
                  service="Speech to Text" 
                  status={serviceStatus.speechToText} 
                  isActive={activeService === 'speechToText'} 
                />
                <ServiceNode 
                  service="Evaluation" 
                  status={serviceStatus.geminiEvaluation} 
                  isActive={activeService === 'geminiEvaluation'} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InterviewSession; 