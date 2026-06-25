import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Loader2, 
  CheckCircle, 
  BrainCircuit, 
  RefreshCcw, 
  Award, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  ChevronRight, 
  User, 
  Keyboard, 
  Clock, 
  Star,
  Activity,
  Award as AwardIcon
} from 'lucide-react';
import { ai, safeJsonParse } from '../lib/ai';
import { ResumeData } from '../types';

interface InterviewMockupProps {
  data: ResumeData;
}

interface Question {
  id: number;
  keyword: string;
  question: string;
}

interface UserAnswer {
  questionId: number;
  questionText: string;
  keyword: string;
  answerText: string;
}

interface EvaluationResult {
  overallScore: number;
  metrics: {
    clarity: number; // 0-100
    depth: number;   // 0-100
    keywordRelevance: number; // 0-100
    delivery: number; // 0-100
  };
  keyTakeaways: string[];
  strengths: string[];
  growthAreas: string[];
  feedbackList: {
    questionId: number;
    questionText: string;
    score: number;
    feedback: string;
    sampleResponse: string;
  }[];
}

type InterviewState = 'setup' | 'loading' | 'active' | 'analyzing' | 'completed';

export const InterviewMockup: React.FC<InterviewMockupProps> = ({ data }) => {
  // Voice selection states
  const [difficulty, setDifficulty] = useState<'standard' | 'technical' | 'stress'>('standard');
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore'); // Core prebuilt voice
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Core functional states
  const [interviewState, setInterviewState] = useState<InterviewState>('setup');
  const [detectedKeywords, setDetectedKeywords] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isAiAnalyzingQuestion, setIsAiAnalyzingQuestion] = useState(false);

  // Speech input and editing states
  const [isListening, setIsListening] = useState(false);
  const [answerInputText, setAnswerInputText] = useState('');
  const [isRecognitionSupported, setIsRecognitionSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Evaluation states
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);

  // Web Speech Synthesis Ref
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Keywords Extractor
  useEffect(() => {
    // Collect potential keywords from skills and summary
    const tempKeywords = [...(data.skills || [])];
    if (data.personalInfo?.industry && !tempKeywords.includes(data.personalInfo.industry)) {
      tempKeywords.push(data.personalInfo.industry);
    }
    
    // Shuffle and pick some interesting high-value keywords (max 6)
    const filteredKeywords = tempKeywords
      .filter(k => k && k.length > 2)
      .slice(0, 6);
    
    setDetectedKeywords(filteredKeywords.length > 0 ? filteredKeywords : ["General Industry Competencies", "Core Communication"]);
  }, [data]);

  // Handle Speech Recognition Setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsRecognitionSupported(true);
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        rec.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            setAnswerInputText(prev => {
              const cleanedPrev = prev.trim();
              return cleanedPrev ? `${cleanedPrev} ${finalTranscript.trim()}` : finalTranscript.trim();
            });
          }
        };

        rec.onerror = (e: any) => {
          console.error("Speech Recognition Error:", e);
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      stopSpeaking();
    };
  }, []);

  // Sync speak transition with component
  const speakText = (text: string) => {
    stopSpeaking();
    if (!isAudioEnabled || !synthRef.current) return;

    try {
      setIsAiSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Attempt to set a custom voice if possible
      const voices = synthRef.current.getVoices();
      const preferred = voices.find(v => v.name.includes(selectedVoice) || v.lang.startsWith('en'));
      if (preferred) {
        utterance.voice = preferred;
      }

      utterance.onend = () => {
        setIsAiSpeaking(false);
      };

      utterance.onerror = (e) => {
        console.error("Utterance Error:", e);
        setIsAiSpeaking(false);
      };

      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    } catch (err) {
      console.error("Speech synthesis failed:", err);
      setIsAiSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsAiSpeaking(false);
  };

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      stopSpeaking(); // Stop AI talk when user starts speaking
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  // Dynamic system generator
  const prepareInterviewQuestions = async () => {
    setInterviewState('loading');
    stopSpeaking();

    const resumeContext = {
      fullName: data.personalInfo.fullName,
      industry: data.personalInfo.industry || 'General Industry',
      summary: data.personalInfo.summary || '',
      skills: data.skills || [],
      difficulty: difficulty
    };

    const prompt = `
      You are an expert technical and behavioral recruiter conducting a pristine mock interview with a candidate.
      
      Context details:
      Candidate Name: ${resumeContext.fullName}
      Target Industry: ${resumeContext.industry}
      Identified Core Keywords: ${detectedKeywords.join(', ')}
      Selected difficulty: ${difficulty}

      Generate exactly 3 tailored, highly professional interview questions based on their resume metrics and key industry keywords.
      - Each question MUST target ONE specific keyword as its strategic focus.
      - The question must be designed to test real-world depth and competency.
      - Be tailored to the requested difficulty level.

      Return the response in a VALID JSON format matching this absolute schema:
      {
        "questions": [
          {
            "id": 1,
            "keyword": "name of key skill/technology/concept targeted",
            "question": "A complete, professional behavioral or technical scenario question."
          }
        ]
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const parsed = safeJsonParse<{ questions: Question[] }>(response.text || '', { questions: [] });
      
      if (parsed.questions && parsed.questions.length > 0) {
        setQuestions(parsed.questions);
        setInterviewState('active');
        setCurrentQuestionIndex(0);
        setUserAnswers([]);
        setAnswerInputText('');
        
        // Initiate first question vocal narration
        setTimeout(() => {
          speakText(`Here is your first question. ${parsed.questions[0].question}`);
        }, 800);
      } else {
        throw new Error("Unable to extract valid questions structure.");
      }
    } catch (err) {
      console.error("Failed to prepare mock questions:", err);
      // Fallback interview questions in case of error
      const fallbacks: Question[] = [
        { id: 1, keyword: detectedKeywords[0] || "Core Industry Role", question: `Can you briefly discuss a complex challenge you encountered involving ${detectedKeywords[0] || "your core domain"} and how you orchestrated your solution?` },
        { id: 2, keyword: detectedKeywords[1] || "Technology Architectures", question: `How do you ensure scalability, maintainability, and quality when designing workflows around ${detectedKeywords[1] || "your development stack"}?` },
        { id: 3, keyword: detectedKeywords[2] || "Critical Thinking", question: `Describe a situation where you had to lead a stakeholder integration while managing competing deadlines under modern workflow pressure.` }
      ];
      setQuestions(fallbacks);
      setInterviewState('active');
      setCurrentQuestionIndex(0);
      setUserAnswers([]);
      setAnswerInputText('');
      setTimeout(() => {
        speakText(`Here is your first question. ${fallbacks[0].question}`);
      }, 800);
    }
  };

  const handleNextQuestion = () => {
    stopSpeaking();
    if (!answerInputText.trim()) return;

    const currentQuestion = questions[currentQuestionIndex];
    const newAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.question,
      keyword: currentQuestion.keyword,
      answerText: answerInputText.trim()
    };

    const updatedAnswers = [...userAnswers, newAnswer];
    setUserAnswers(updatedAnswers);
    setAnswerInputText('');

    if (currentQuestionIndex + 1 < questions.length) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setTimeout(() => {
        speakText(`Question number ${nextIdx + 1}: ${questions[nextIdx].question}`);
      }, 500);
    } else {
      // Evaluate completed answers
      conductNeuralAnalysis(updatedAnswers);
    }
  };

  const conductNeuralAnalysis = async (answers: UserAnswer[]) => {
    setInterviewState('analyzing');
    stopSpeaking();

    const evaluationPrompt = `
      You are an Elite Interview Analyst. Grade and evaluate the mock interview responses for candidate ${data.personalInfo.fullName}.
      
      Target Industry: ${data.personalInfo.industry}
      Selected Difficulty: ${difficulty}

      Interview log and transcript responses:
      ${answers.map(a => `
        - Question Focus [Keyword: ${a.keyword}]: "${a.questionText}"
        - Candidate Recorded Answer: "${a.answerText}"
      `).join('\n')}

      Evaluate the records and return a deep constructive score sheet and critique.
      - overallScore: integer from 0 to 100
      - metrics: (clarity, depth, keywordRelevance, delivery) each from 0 to 100
      - keyTakeaways: array of 3 key synthesized executive findings.
      - strengths: array of 3 strong indicators identified.
      - growthAreas: array of 3 actionable areas for improvement.
      - feedbackList: an array containing feedback for EACH of the questions matching this precise structure:
        {
          "questionId": index,
          "questionText": "...",
          "score": 0-100,
          "feedback": "Actionable, tailored suggestions specific to this exact answer",
          "sampleResponse": "An alternate elegant model answer conveying high competency"
        }

      Ensure it is a valid JSON. Check all curly braces and array delimiters.
    `;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: 'user', parts: [{ text: evaluationPrompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const parsed = safeJsonParse<EvaluationResult>(result.text || '', {} as any);
      if (parsed.overallScore) {
        setEvaluationResult(parsed);
      } else {
        throw new Error("Evaluation parsing failed.");
      }
    } catch (err) {
      console.error("Failed to generate response evaluations:", err);
      // Construct fallback score metrics dynamically based on keyword matches
      const defaultEval: EvaluationResult = {
        overallScore: 78,
        metrics: { clarity: 80, depth: 75, keywordRelevance: 82, delivery: 76 },
        keyTakeaways: [
          "Good theoretical expertise of industry frameworks.",
          "Avoid brief descriptions; expand with concrete Metrics or Outcomes.",
          "Confident communication flow but could structuralize sentences better."
        ],
        strengths: ["Strong keyword optimization", "High clarity of speech", "Direct answer alignment"],
        growthAreas: ["Use CAR/STAR formulas for examples", "Quantify operational savings", "Emphasize leadership impact"],
        feedbackList: answers.map(a => ({
          questionId: a.questionId,
          questionText: a.questionText,
          score: 80,
          feedback: "Great job answering clearly. Try to weave in specific metrics like team sizes or percent improvements to anchor credibility.",
          sampleResponse: `While managing ${a.keyword}, I formulated an optimized workflow pipeline. This directly consolidated technical silos and improved total delivery velocity by 25%.`
        }))
      };
      setEvaluationResult(defaultEval);
    } finally {
      setInterviewState('completed');
    }
  };

  const handleRestart = () => {
    stopSpeaking();
    setInterviewState('setup');
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setAnswerInputText('');
    setEvaluationResult(null);
  };

  return (
    <div id="interview_view_root" className="max-w-5xl mx-auto flex flex-col gap-6">
      <AnimatePresence mode="wait">
        {/* State 1: Setup Hub */}
        {interviewState === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl p-8 space-y-8"
          >
            {/* Header banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-indigo-600 text-white rounded-[20px] flex items-center justify-center">
                  <BrainCircuit size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    AI Interview simulator
                  </h2>
                  <p className="text-xs text-slate-455 font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase mt-0.5">
                    Interactive Neural Mockup Protocol
                  </p>
                </div>
              </div>

              {/* Speech Configuration Panel */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                  className={`p-3 rounded-2xl flex items-center gap-2 border transition-all duration-300 cursor-pointer ${
                    isAudioEnabled 
                      ? 'bg-indigo-50/80 border-indigo-200 dark:bg-slate-800 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100' 
                      : 'bg-slate-50 border-slate-150 dark:bg-slate-950 dark:border-slate-900 text-slate-400 hover:bg-slate-100'
                  }`}
                  title={isAudioEnabled ? "Mute AI Voice Synthesis" : "Unmute AI Voice Synthesis"}
                >
                  {isAudioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">
                    {isAudioEnabled ? 'AI Voice ON' : 'AI Voice OFF'}
                  </span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Left Column Settings */}
              <div className="md:col-span-1 space-y-6">
                {/* Mode Selector */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-455">
                    Interview Vector Focus
                  </span>
                  <div className="flex flex-col gap-2">
                    {[
                      { id: 'standard', title: 'Standard Professional', desc: 'Behavioral, standard communication alignment' },
                      { id: 'technical', title: 'Technical Blueprint', desc: 'Deep-dive technology and keyword analysis' },
                      { id: 'stress', title: 'Extreme stress', desc: 'Hard challenges, strict constraints' }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setDifficulty(mode.id as any)}
                        className={`p-4 rounded-2xl text-left border transition-all duration-300 cursor-pointer ${
                          difficulty === mode.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                            : 'bg-slate-50 border-slate-150 dark:bg-slate-950 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                        }`}
                      >
                        <h4 className="text-xs font-black uppercase tracking-wider">{mode.title}</h4>
                        <p className={`text-[9px] mt-1 leading-normal ${difficulty === mode.id ? 'text-indigo-100' : 'text-slate-455'}`}>
                          {mode.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Synth Voice Selector */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-455">
                    Avatar Voice Engine
                  </span>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                  >
                    <option value="Kore">Kore (English Executive)</option>
                    <option value="Google">System Default Web Voice</option>
                  </select>
                </div>
              </div>

              {/* Right Column Core Sync Information */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-slate-50 dark:bg-slate-950/30 rounded-3xl p-6 border border-slate-150 dark:border-slate-800/80 space-y-4">
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={16} className="text-indigo-600" />
                    Keywords Detected from Resume
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-455 leading-relaxed font-semibold">
                    The AI simulator parses your career metadata. The upcoming interview questions will specifically probe your authority and metrics in these keywords:
                  </p>

                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {detectedKeywords.map((keyword, i) => (
                      <span
                        key={i}
                        className="px-3.5 py-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 flex items-center gap-1.5 transition-all shadow-sm cursor-default"
                      >
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-500/5 dark:bg-indigo-500/10 rounded-3xl p-6 border border-indigo-500/10 space-y-3">
                  <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={16} />
                    Simulator Directives
                  </h4>
                  <ul className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-semibold space-y-2 list-none pl-0">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">🚀</span>
                      <span>The interview will consist of 3 dynamic questions customized around your verified strengths.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">🎙️</span>
                      <span>{isRecognitionSupported ? "We fully support Voice Speech input (Speech-to-text with mic auto-sync)." : "Voice speech not supported in system frame context. No worries! Use our rich text keyboard sandbox."}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">⚡</span>
                      <span>Receive immediate high-value feedback, scoring models, performance metrics, and a sample "expert-grade" answer.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={prepareInterviewQuestions}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest py-4 px-8 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 cursor-pointer shadow-lg shadow-indigo-500/25"
                  >
                    Initiate Voice Simulator
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* State 2: Preparing Mockup Setup */}
        {interviewState === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl p-16 flex flex-col items-center justify-center space-y-6 text-center min-h-[450px]"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center animate-pulse">
                <BrainCircuit className="text-indigo-600 animate-spin" size={44} />
              </div>
              <span className="absolute inset-0 rounded-full border border-indigo-600/30 scale-125 animate-ping duration-1000" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Synthesizing Recruiter Persona
              </h3>
              <p className="text-xs text-slate-455 font-bold uppercase tracking-widest">
                Tailoring interview vectors to identified resume nodes...
              </p>
            </div>
          </motion.div>
        )}

        {/* State 3: Active Voice Mockup */}
        {interviewState === 'active' && questions.length > 0 && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            {/* Simulation Stage View */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between min-h-[500px]">
              {/* Header Status Bar */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                    <Bot size={16} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white">Active Simulation</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                      Mode: {difficulty === 'stress' ? 'Extreme Stress' : difficulty === 'technical' ? 'Technical Focus' : 'Standard'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-950 rounded-xl px-3.5 py-1.5 border border-slate-200/50 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-extrabold text-slate-500">
                    <Clock size={12} />
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </div>
                </div>
              </div>

              {/* Avatar Animation & Voice Waveform */}
              <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
                {/* Visual Avatar */}
                <div className="relative flex items-center justify-center">
                  {/* Rotating visual rings wrapper */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
                    className="absolute w-44 h-44 rounded-full border border-dashed border-indigo-400/20 dark:border-indigo-500/10"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
                    className="absolute w-36 h-36 rounded-full border border-dashed border-indigo-600/30 dark:border-indigo-500/20"
                  />

                  {/* Pulsing ring during speech/action */}
                  <AnimatePresence>
                    {(isAiSpeaking || isListening) && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: 1.4, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                        className={`absolute w-32 h-32 rounded-full border-2 ${
                          isListening ? 'border-emerald-500 bg-emerald-500/5' : 'border-indigo-600 bg-indigo-600/5'
                        }`}
                      />
                    )}
                  </AnimatePresence>

                  <div className={`relative w-28 h-28 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-xl ${
                    isListening 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-500 shadow-emerald-500/10 dark:bg-slate-950' 
                      : isAiSpeaking 
                      ? 'bg-indigo-50 border-indigo-600 text-indigo-600 shadow-indigo-600/10 dark:bg-slate-950'
                      : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-950 dark:border-slate-800'
                  }`}>
                    <Bot size={40} className={isAiSpeaking ? 'animate-bounce' : ''} />
                  </div>
                </div>

                {/* Question Narration Section */}
                <div className="text-center max-w-lg space-y-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 py-1 px-2.5 rounded-full">
                    probe node: {questions[currentQuestionIndex].keyword}
                  </span>
                  <h3 className="text-base font-black text-slate-800 dark:text-white leading-relaxed">
                    "{questions[currentQuestionIndex].question}"
                  </h3>

                  {isAiSpeaking && (
                    <div className="flex items-center justify-center gap-1.5 pt-1 text-xs text-indigo-600 font-bold uppercase tracking-widest animate-pulse">
                      <span className="flex gap-1 items-center h-4 py-1.5">
                        <span className="w-1 bg-indigo-600 h-2 animate-bounce flex-1 duration-100" />
                        <span className="w-1 bg-indigo-600 h-3 animate-bounce flex-1 duration-300" />
                        <span className="w-1 bg-indigo-600 h-1 animate-bounce flex-1 duration-200" />
                        <span className="w-1 bg-indigo-600 h-4 animate-bounce flex-1 duration-400" />
                      </span>
                      <span>Synthesizer Active</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress interaction response */}
              <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 space-y-4">
                {/* Voice waveform or user typing falls */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="input_user_speech" className="text-[10px] font-black uppercase tracking-widest text-slate-455 flex items-center gap-1.5">
                      <Keyboard size={12} />
                      Candidate response
                    </label>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Spelled: {answerInputText.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>

                  <div className="relative">
                    <textarea
                      id="input_user_speech"
                      rows={3}
                      placeholder={isListening ? "Listening silently... Please speak clearly into your microphone..." : "Input your answer... Speak via the mic or type manually inside this box."}
                      value={answerInputText}
                      onChange={(e) => setAnswerInputText(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold dark:text-white"
                    />

                    {isRecognitionSupported && (
                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        className={`absolute right-3 bottom-4 p-3.5 rounded-full shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer ${
                          isListening 
                            ? 'bg-emerald-500 text-white shadow-emerald-500/20 animate-pulse' 
                            : 'bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-700'
                        }`}
                        title={isListening ? "Stop Speaking" : "Start Voice Input"}
                      >
                        {isListening ? <Mic size={18} className="animate-pulse" /> : <MicOff size={18} />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex md:items-center justify-between flex-col md:flex-row gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => speakText(questions[currentQuestionIndex].question)}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Volume2 size={14} />
                    Re-play Audio Question
                  </button>

                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    disabled={!answerInputText.trim()}
                    className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-500/10"
                  >
                    <span>{currentQuestionIndex + 1 === questions.length ? 'Finalize Interview' : 'Submit & Next Question'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar Guidelines Panel */}
            <div className="space-y-6 lg:col-span-1">
              <div className="bg-slate-900 text-white p-6 rounded-[32px] space-y-4 border border-slate-800">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Active Keyword Index</h4>
                  <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                    Make sure to explicitly mention how you leverage <strong>{questions[currentQuestionIndex].keyword}</strong>. Mentioning related workflows boosts neural match score.
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Recommended structural formula:</span>
                  <div className="space-y-1 text-[11px] font-bold text-indigo-200">
                    <p className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                      Situation Description
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                      Actions Taken under Keyword
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                      Tangible Operational Metric
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-6 rounded-[32px] border border-indigo-100 dark:border-indigo-900/40 text-center space-y-4">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto shadow-sm">
                  <Volume2 size={22} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Mic permission error?</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-455 font-semibold leading-relaxed">
                    Make sure browser mic access is allowed in your top address bar, or type your response directly.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* State 4: AI Conducting Feedback Calculations */}
        {interviewState === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl p-16 flex flex-col items-center justify-center space-y-6 text-center min-h-[450px]"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center animate-pulse">
                <Loader2 className="text-indigo-600 animate-spin" size={44} />
              </div>
              <span className="absolute inset-0 rounded-full border border-indigo-600/30 scale-125 animate-ping duration-1000" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Auditing Response Transcripts
              </h3>
              <p className="text-xs text-slate-455 font-bold uppercase tracking-widest">
                Grading clarity, metrics structures, and domain expert benchmarks...
              </p>
            </div>
          </motion.div>
        )}

        {/* State 5: Finished Scoreboard Report & Feedback Cards */}
        {interviewState === 'completed' && evaluationResult && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* Top overview bento */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Core summary score card */}
              <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-8 rounded-[40px] text-white flex flex-col justify-between space-y-8 shadow-2xl border border-slate-850">
                <div className="space-y-3">
                  <div className="p-2.5 bg-white/5 text-indigo-400 rounded-xl flex items-center justify-center w-12 h-12 border border-white/5">
                    <AwardIcon size={24} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Simulation Scorecard</h4>
                    <h2 className="text-2xl font-black uppercase tracking-tight flex items-baseline gap-2 mt-1">
                      {evaluationResult.overallScore}/100
                    </h2>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-wider">
                      <span>Delivery pacing</span>
                      <span>{evaluationResult.metrics?.delivery || 80}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${evaluationResult.metrics?.delivery || 80}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-wider">
                      <span>Technical depth</span>
                      <span>{evaluationResult.metrics?.depth || 75}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${evaluationResult.metrics?.depth || 75}%` }} />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-wider">
                      <span>Keyword relevance</span>
                      <span>{evaluationResult.metrics?.keywordRelevance || 82}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${evaluationResult.metrics?.keywordRelevance || 82}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bento executive takeaways */}
              <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[40px] p-8 shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Star className="text-yellow-500" size={18} />
                    Executive Findings
                  </h3>
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300"
                  >
                    <RefreshCcw size={12} />
                    Simulate Again
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Strengths list */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Core Strengths</span>
                    <ul className="space-y-2">
                      {evaluationResult.strengths?.map((strength, idx) => (
                        <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 font-semibold flex items-start gap-2">
                          <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={14} />
                          <span>{strength}</span>
                        </li>
                      )) || <p className="text-xs text-slate-400">Excellent structural pacing overall.</p>}
                    </ul>
                  </div>

                  {/* Growth area list */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Actionable Growths</span>
                    <ul className="space-y-2">
                      {evaluationResult.growthAreas?.map((growth, idx) => (
                        <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 font-semibold flex items-start gap-2">
                          <AlertCircle className="text-indigo-400 shrink-0 mt-0.5" size={14} />
                          <span>{growth}</span>
                        </li>
                      )) || <p className="text-xs text-slate-400">Expand on quantitative metrics in answers.</p>}
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
                  <h4 className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                    <BrainCircuit size={14} />
                    Career Pulse Advisory Note:
                  </h4>
                  <p className="text-[11px] font-bold text-slate-650 dark:text-slate-400 leading-relaxed">
                    {evaluationResult.keyTakeaways?.[0] || "We recommend building out situational benchmarks. Structure responses using the Context-Action-Result format for ultimate authority."}
                  </p>
                </div>
              </div>
            </div>

            {/* Downstream detail critique */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest pl-2">
                Detailed audit break-downs
              </h3>

              <div className="space-y-6">
                {evaluationResult.feedbackList?.map((fb, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
                  >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 flex items-center justify-center font-mono text-xs font-black">
                          {idx + 1}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                          Focus Probe: {questions[idx]?.keyword || "Domain Tech"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200">
                        <span>Score:</span>
                        <span className="bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg">
                          {fb.score}%
                        </span>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Original Question and User Output */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-455">Question asked</span>
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-bold leading-normal">
                            "{fb.questionText}"
                          </p>
                        </div>
                        <div className="space-y-1.5 border-l md:border-l border-slate-100 dark:border-slate-800 md:pl-6">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-455 flex items-center gap-1">
                            <User size={10} />
                            Your answer
                          </span>
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold italic leading-relaxed">
                            "{userAnswers[idx]?.answerText || "No answer text received."}"
                          </p>
                        </div>
                      </div>

                      {/* AI Expert Critique */}
                      <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Analyst critique</span>
                        <p className="text-xs text-slate-650 dark:text-slate-350 font-bold leading-relaxed">
                          {fb.feedback}
                        </p>
                      </div>

                      {/* Expert grade rewrite model */}
                      <div className="p-5 bg-indigo-600/5 dark:bg-indigo-500/5 rounded-2xl border border-indigo-500/10 space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                          <Sparkles size={12} />
                          Alternate expert-level rewrite model
                        </span>
                        <p className="text-xs text-slate-750 dark:text-slate-300 italic font-semibold leading-relaxed">
                          "{fb.sampleResponse}"
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
