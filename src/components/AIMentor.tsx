import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserCircle, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  Briefcase, 
  Shirt, 
  MessageSquare,
  ChevronRight,
  BrainCircuit,
  Globe,
  Scale,
  Headphones,
  Clock,
  Volume1
} from 'lucide-react';
import { Modality, Type } from '@google/genai';
import { ai, safeJsonParse, generateSpeech } from '../lib/ai';
import { ResumeData } from '../types';
// @ts-ignore
import mentorAvatar from '../assets/images/indian_female_career_mentor_1781980381910.jpg';

interface AudioClip {
  id: string;
  text: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  clips?: AudioClip[];
}

interface AIMentorProps {
  data: ResumeData;
}

// Indian English specific syllable counter (phonetically timed)
const countIndianEnglishSyllables = (word: string): number => {
  if (!word) return 1;
  const lower = word.toLowerCase().trim();
  if (lower.length <= 2) return 1;
  
  // Clean special characters
  const clean = lower.replace(/[^a-z]/g, '');
  
  // Count vowel groups
  const vowelGroups = clean.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;
  
  // Indian English specific phonetics:
  // Since English is a second language, vowels are spoken cleanly and are fully timed.
  // Standard silent 'e' at the end is sometimes fully pronounced in syllable segmentation or creates an even, flat syllable structure.
  if (clean.endsWith('e') && !clean.endsWith('le') && count > 1) {
    const silentExceptions = ['corporate', 'strategy', 'presence', 'morale', 'elite', 'state', 'outreach'];
    if (!silentExceptions.some(ex => clean.includes(ex)) && !/[aeiou]e$/.test(clean)) {
      count--;
    }
  }
  
  return Math.max(1, count);
};

interface PhonemeShape {
  width: number;  // horizontal factor
  height: number; // vertical factor
}

// Map characters and phonemes in Indian English to mouth positions
const getPhonemeShapeForWord = (word: string, progress: number): PhonemeShape => {
  if (!word) return { width: 1.0, height: 0.0 };
  const lower = word.toLowerCase().replace(/[^a-z]/g, '');
  
  // Bilabial consonants closing lips (m, p, b)
  const startChar = lower[0];
  const endChar = lower[lower.length - 1];
  
  if (progress < 0.08 && ['p', 'b', 'm', 'w'].includes(startChar)) {
    return { width: 0.9, height: 0.05 }; 
  }
  if (progress > 0.92 && ['p', 'b', 'm'].includes(endChar)) {
    return { width: 0.9, height: 0.05 }; 
  }

  // Segment syllable index based on progress
  const syllablesCount = countIndianEnglishSyllables(word);
  const syllableIndex = Math.min(syllablesCount - 1, Math.floor(progress * syllablesCount));
  
  // Capture part of word corresponding to this syllable
  const charsPerSyllable = Math.max(1, Math.floor(lower.length / syllablesCount));
  const syllablePart = lower.slice(syllableIndex * charsPerSyllable, (syllableIndex + 1) * charsPerSyllable);
  
  // Default neutral settings
  let width = 1.02;
  let height = 0.75;

  // Indian English broad vowels (A, I, E) -> Wide and Tall opening
  if (/[aie]/.test(syllablePart)) {
    width = 1.18;  
    height = 1.25;  
  } 
  // Back rounded vowels (O, U, OO) -> Pursed, narrower, oval opening
  else if (/[ou]/.test(syllablePart)) {
    width = 0.82;  
    height = 0.95;  
  }
  // Sibilants, dental/alveolar stops (S, Z, T, D, N) -> Clean, flat teeth shape
  else if (/[sztdcnlnr]/.test(syllablePart)) {
    width = 1.1;
    height = 0.55;
  }
  // Labiodentals (F, V, W) -> Narrow parted
  else if (/[fvw]/.test(syllablePart)) {
    width = 0.88;
    height = 0.35;
  }

  return { width, height };
};

type EmotionType = 'smiling' | 'thinking' | 'nodding' | 'neutral';

const detectPhraseEmotion = (phrase: string): EmotionType => {
  const lower = phrase.toLowerCase();
  
  if (
    lower.includes("welcome") || 
    lower.includes("glad") || 
    lower.includes("happy") || 
    lower.includes("excellent") || 
    lower.includes("great") || 
    lower.includes("namaste") || 
    lower.includes("wonderful") || 
    lower.includes("shubh") || 
    lower.includes("congratulat") || 
    lower.includes("prestigious") || 
    lower.includes("elite") || 
    lower.includes("pleasure") || 
    lower.includes("beautiful") || 
    lower.includes("warm") || 
    lower.includes("hope")
  ) {
    return 'smiling';
  }

  if (
    lower.includes("correct") || 
    lower.includes("fix") || 
    lower.includes("error") || 
    lower.includes("diagnose") || 
    lower.includes("strategy") || 
    lower.includes("structure") || 
    lower.includes("analyze") || 
    lower.includes("critical") || 
    lower.includes("review") || 
    lower.includes("optimize") || 
    lower.includes("strategic") || 
    lower.includes("tactical") || 
    lower.includes("why") || 
    lower.includes("how") || 
    lower.includes("key")
  ) {
    return 'thinking';
  }

  if (
    lower.includes("yes") || 
    lower.includes("indeed") || 
    lower.includes("absolutely") || 
    lower.includes("definitely") || 
    lower.includes("confident") || 
    lower.includes("surely") || 
    lower.includes("exactly") || 
    lower.includes("agree") || 
    lower.includes("support") || 
    lower.includes("build") || 
    lower.includes("excel") || 
    lower.includes("achieve") || 
    lower.includes("can") || 
    lower.includes("forward")
  ) {
    return 'nodding';
  }

  return 'neutral';
};


export const AIMentor: React.FC<AIMentorProps> = ({ data }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingClips, setIsGeneratingClips] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioDataArray, setAudioDataArray] = useState<Uint8Array>(new Uint8Array(0));
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('neutral');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const introPlayed = useRef(false);

  // Dedicated Web Speech Synthesis references for Indian-English profile
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speakTimeoutRef = useRef<number | null>(null);

  // Indian-English syllable-timed lip-sync tracking states
  const currentWordRef = useRef<string>('');
  const currentWordSyllablesRef = useRef<number>(1);
  const lastWordBoundaryTimeRef = useRef<number>(0);
  const currentWordCharRef = useRef<number>(0);
  const lipSyncSmoothnessRef = useRef<{ openY: number; widthFactor: number }>({ openY: 0, widthFactor: 1.0 });

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping, isGeneratingClips]);

  // List and pre-cache Indian English Web Speech voices exclusively
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        
        // Exclusively prioritize Indian English (en-IN)
        let enINVoices = voices.filter(v => v.lang === 'en-IN' || v.lang === 'en_IN' || v.lang.replace('_', '-').startsWith('en-IN'));
        
        if (enINVoices.length === 0) {
          enINVoices = voices.filter(v => 
            v.lang.toLowerCase().includes('in') && v.lang.toLowerCase().startsWith('en')
          );
        }

        // Target high-quality female profiles first for Ananya
        const female = enINVoices.find(v => 
          v.name.toLowerCase().includes('female') || 
          v.name.toLowerCase().includes('heera') || 
          v.name.toLowerCase().includes('veena') || 
          v.name.toLowerCase().includes('neerja') ||
          v.name.toLowerCase().includes('google english (india)') ||
          v.name.toLowerCase().includes('hazel') ||
          v.name.toLowerCase().includes('zira')
        ) || enINVoices[0] || voices.find(v => v.lang.startsWith('en')) || voices[0];
        
        setSelectedVoice(female || null);
      };

      updateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
  }, []);

  // Initial greeting and voice cancellation hook
  useEffect(() => {
    if (!introPlayed.current) {
      playVoiceGreeting();
      introPlayed.current = true;
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (speakTimeoutRef.current) {
        cancelAnimationFrame(speakTimeoutRef.current);
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [selectedVoice]);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      analyserRef.current.connect(audioContextRef.current.destination);
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const updateVisualizer = () => {
    if (analyserRef.current && isSpeaking) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      setAudioDataArray(new Uint8Array(dataArray));
      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    } else {
      setAudioDataArray(new Uint8Array(0));
    }
  };

  // Exclusive Web Speech TTS Engine featuring en-IN profile selection and phonetics lipync modeling
  const speakText = (text: string) => {
    if (!audioEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel active synthesis first to keep responses prompt and non-overlapping
    window.speechSynthesis.cancel();
    if (currentUtteranceRef.current) {
      currentUtteranceRef.current.onstart = null;
      currentUtteranceRef.current.onend = null;
      currentUtteranceRef.current.onerror = null;
    }
    if (speakTimeoutRef.current) {
      cancelAnimationFrame(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }

    setIsSpeaking(false);
    setAudioDataArray(new Uint8Array(0));

    // Clean markdown structure for graceful pronunciation
    const cleanSpeech = text
      .replace(/\[Communication Script\]|\[Body Language Cue\]|\[Psychological Anchor\]/gi, '')
      .replace(/[\*\#\`\_]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    
    // Explicitly configure Indian English vocal profile
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    } else {
      utterance.lang = 'en-IN';
    }

    // Elegant and professional speed controls
    utterance.rate = 0.95; 
    utterance.pitch = 1.05;

    // Highly responsive animation frame feedback looping frequency bins with voice cadence
    const animateMouth = () => {
      if (!window.speechSynthesis.speaking) {
        setIsSpeaking(false);
        setAudioDataArray(new Uint8Array(0));
        return;
      }

      const now = performance.now();
      const elapsed = now - lastWordBoundaryTimeRef.current;
      
      // Calculate length-based duration of the word matching Indian English balanced delivery
      const syllableCount = currentWordSyllablesRef.current;
      const estimatedDuration = (syllableCount * 175) + 60; 
      let progress = Math.min(1.0, elapsed / estimatedDuration);

      // Get precise phoneme mouth configuration
      const shape = getPhonemeShapeForWord(currentWordRef.current, progress);

      // In Indian English, each syllable acts as an independent peak.
      // Form a clean absolute sine wave cycle over each syllable!
      const syllablePeriod = Math.PI * (progress * syllableCount);
      const syllableVowelOpen = Math.abs(Math.sin(syllablePeriod));

      // Scale open height based on phonetic targets
      const targetOpenY = syllableVowelOpen * shape.height * 14.5;
      const targetWidthFactor = shape.width;

      // Interpolate/Lerp to make mouth animations extremely organic and fluid
      const prevSmooth = lipSyncSmoothnessRef.current;
      const progressLerp = 0.24; // Fast and snappy responsive mouth
      const nextOpenY = prevSmooth.openY + (targetOpenY - prevSmooth.openY) * progressLerp;
      const nextWidthFactor = prevSmooth.widthFactor + (targetWidthFactor - prevSmooth.widthFactor) * progressLerp;

      lipSyncSmoothnessRef.current = { openY: nextOpenY, widthFactor: nextWidthFactor };

      // Generate spectrum frequencies matching this syllable configuration for audio waves
      const mockFreqs = new Uint8Array(32);
      const intensity = Math.min(255, Math.floor((nextOpenY / 14.5) * 180 + (Math.random() * 20)));
      for (let i = 0; i < 32; i++) {
        const decay = Math.exp(-i / 6.0);
        mockFreqs[i] = Math.max(0, Math.min(255, Math.floor(intensity * decay + (Math.random() * 15 - 7.5))));
      }

      setAudioDataArray(mockFreqs);
      speakTimeoutRef.current = requestAnimationFrame(animateMouth);
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIndex = event.charIndex;
        const remainingText = cleanSpeech.slice(charIndex);
        const match = remainingText.match(/^[\w']+/);
        const word = match ? match[0] : '';
        
        currentWordRef.current = word;
        currentWordSyllablesRef.current = countIndianEnglishSyllables(word);
        lastWordBoundaryTimeRef.current = performance.now();
        currentWordCharRef.current = charIndex;

        // Dynamic context window analysis to drive the AI's current facial emotion state
        const contextWindow = cleanSpeech.slice(Math.max(0, charIndex - 20), charIndex + 80);
        const activeEmotion = detectPhraseEmotion(contextWindow);
        setCurrentEmotion(activeEmotion);
      }
    };

    utterance.onstart = () => {
      setIsSpeaking(true);
      // Trigger default starting word & detect initial emotion
      const startingWord = cleanSpeech.split(/[\s\.,\?!;:\"\(\)]+/)[0] || '';
      currentWordRef.current = startingWord;
      currentWordSyllablesRef.current = countIndianEnglishSyllables(startingWord);
      lastWordBoundaryTimeRef.current = performance.now();
      
      const initialEmotion = detectPhraseEmotion(cleanSpeech.slice(0, 100));
      setCurrentEmotion(initialEmotion);
      animateMouth();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentEmotion('neutral');
      setAudioDataArray(new Uint8Array(0));
      if (speakTimeoutRef.current) {
        cancelAnimationFrame(speakTimeoutRef.current);
        speakTimeoutRef.current = null;
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentEmotion('neutral');
      setAudioDataArray(new Uint8Array(0));
      if (speakTimeoutRef.current) {
        cancelAnimationFrame(speakTimeoutRef.current);
        speakTimeoutRef.current = null;
      }
    };

    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const playVoiceGreeting = () => {
    const introText = "Namaste! I am Ananya, your Indian AI Career Strategist and Mentor at JobsEdge. I am here to guide your professional trajectory across Indian and global corporate environments, resume curation, interview preparation, and key behavioral skills. Whether you are aiming for prestigious product companies, innovative tech startups, or top consulting firms, I will equip you with tactical scripts, key strategies, and confident body language to excel. Let's carve out your elite career path.";
    setMessages([{ role: 'assistant', content: introText }]);
    speakText(introText);
  };

  const generateClips = async (messageIndex: number) => {
    const message = messages[messageIndex];
    if (message.role !== 'assistant' || message.clips || isGeneratingClips !== null) return;

    setIsGeneratingClips(messageIndex);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [{
            text: `
              Break down the following career advice into 4-6 concise "Audio Bites". 
              Each bite must be a standalone, high-impact insight that takes exactly 10 seconds to read aloud (approximately 25-30 words).
              Focus on making them "digestible" and "on-the-go" friendly.
              
              ADVISE TO SEGMENT:
              ${message.content}
            `
          }]
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
              description: "A 10-second audio bite (25-30 words)"
            }
          }
        }
      });

      const clipsTexts = safeJsonParse<string[]>(response.text || '', []);
      const generatedClips: AudioClip[] = clipsTexts.map((text, idx) => ({
        id: `clip-${messageIndex}-${idx}`,
        text
      }));

      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[messageIndex] = { ...newMessages[messageIndex], clips: generatedClips };
        return newMessages;
      });
    } catch (error) {
      console.error("Clip Generation Error:", error);
    } finally {
      setIsGeneratingClips(null);
    }
  };

  const playClip = async (text: string) => {
    speakText(text);
  };

  const handleSend = async (overrideInput?: string) => {
    const messageToSend = overrideInput || input;
    if (!messageToSend.trim() || isTyping) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const systemContext = `
        You are Ananya, a World-Class Indian Professional Mentor and Career Strategist.
        Context: The candidate is navigating the ${data.personalInfo.industry || 'modern professional'} landscape, targetting prestigious opportunities in India and globally.
        Current Resume Data: ${JSON.stringify(data, null, 2)}

        YOUR MANDATES:
        1. STRATEGIC CORRECTIVE: Fix resume errors with extreme precision using high-impact keywords, contextually aligned with Indian and global hiring standards.
        2. JOB APPLICATION: Advise on targeted outreach on professional platforms, high-conversion cover letters, and networking strategies across Indian tech hubs (like Bengaluru, Hyderabad, Gurugram, Pune, Mumbai) and international markets.
        3. MARKET SKILLSET: Identify high-ROI technical and strategic skills based on 2026+ industry trends in product and consulting.
        4. PERSONALITY & PRESENCE: Advise on elegant professional dressing sense (including contemporary Indian corporate wear such as smart Nehru jackets, clean bandhgalas, corporate saris with structured blazers, alongside Western corporate wear), sophisticated communication, and graceful body language. Provide scenario-specific micro-adjustments (e.g., "The Active Listening nod", "The Greeting Hand-Fold/Namaste" in formal entries, or "The Structured Pause" in video interviews).
        5. SCENARIO FEEDBACK: For any scenario mentioned, provide a 3-point tactical breakdown: [Communication Script] + [Body Language Cue] + [Psychological Anchor].
        6. SPEAKING & ACCENT: Your tone is exceptionally polite, intelligent, and authoritative with a pleasant Indian cultural warmth. Use elegant professional Indian English phrasing. Keep your first sentence high-impact.
        
        Keep responses elite, professional, cultural, and highly encouraging.
      `;

      const contents = [
        ...history,
        { role: 'user', parts: [{ text: messageToSend + "\n\nCRITICAL CONTEXT: " + systemContext }] }
      ];

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          tools: [{ googleSearch: {} }] as any,
        }
      });
      
      const responseText = result.text || "I encountered a synchronization error. Please try again.";
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);

      // Automatically TTS the response (with safety length check)
      if (audioEnabled) {
        speakText(responseText.slice(0, 1000));
      }

    } catch (error) {
      console.error("Mentor Service Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I encountered a neural synchronization block. Let's try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const getMouthData = () => {
    if (!isSpeaking) {
      const time = Date.now() * 0.003;
      const breathe = Math.sin(time) * 0.3;
      const isSmiling = currentEmotion === 'smiling';
      
      const leftX = 52.5;
      const rightX = 75.5;
      const centerY = 84 + breathe + (isSmiling ? -1.0 : 0);
      const upperY = 83.5 + breathe + (isSmiling ? -2.2 : 0);
      const lowerY = 84.5 + breathe + (isSmiling ? 1.0 : 0);
      
      return {
        leftX,
        rightX,
        centerY,
        upperY,
        lowerY,
        upperPath: `M ${leftX} ${centerY} Q 64 ${upperY} ${rightX} ${centerY}`,
        lowerPath: `M ${leftX} ${centerY} Q 64 ${lowerY} ${rightX} ${centerY}`,
        innerPath: `M ${leftX + 0.5} ${centerY} Q 64 ${centerY + 0.2} ${rightX - 0.5} ${centerY}`
      };
    }

    const { openY, widthFactor } = lipSyncSmoothnessRef.current;
    
    // Smile-assisted widening and corner lifts for a happy/welcoming expression trace
    const isSmiling = currentEmotion === 'smiling';
    const adjustedWidthFactor = isSmiling ? widthFactor * 1.15 : widthFactor;
    const halfWidth = 11.5 * adjustedWidthFactor;
    
    const leftX = 64 - halfWidth;
    const rightX = 64 + halfWidth;
    const cornerLift = isSmiling ? -1.2 : 0;
    const centerY = 83.5 + (openY * 0.08) + cornerLift;

    // Mouth curvature
    const upperY = centerY - (openY * (isSmiling ? 0.08 : 0.15)) - 0.5 + (isSmiling ? -2.0 : 0);
    const lowerY = centerY + openY + 0.5 + (isSmiling ? 0.8 : 0);

    return {
      leftX,
      rightX,
      centerY,
      upperY,
      lowerY,
      upperPath: `M ${leftX} ${centerY} Q 64 ${upperY} ${rightX} ${centerY}`,
      lowerPath: `M ${leftX} ${centerY} Q 64 ${lowerY} ${rightX} ${centerY}`,
      innerPath: `M ${leftX + 0.5} ${centerY} Q 64 ${centerY + (openY * 0.72)} ${rightX - 0.5} ${centerY}`
    };
  };

  const modules = [
    { title: "Strategic Dressing", icon: Shirt, prompt: "What is the ideal professional dressing sense for a Senior interview in my industry?" },
    { title: "Video Presence", icon: Globe, prompt: "Give me ultra-specific body language and lighting feedback for high-stakes video interviews. How do I project authority on camera?" },
    { title: "Elite Negotiation", icon: Scale, prompt: "How should my tonality and body language shift during a multi-six-figure salary negotiation?" },
    { title: "Power Communication", icon: BrainCircuit, prompt: "How can I improve my communication and body language for high-stakes meetings with C-Suite executives?" },
    { title: "Professional Persona", icon: UserCircle, prompt: "How can I develop a more authoritative yet authentic professional personality? Focus on communication style and presence." },
    { title: "Global Networking", icon: MessageSquare, prompt: "Strategic guidelines for communication and presence at an elite global industry conference." },
    { title: "Interview Combat", icon: ShieldCheck, prompt: "Mock interview: Ask me a difficult situational question based on my experience." }
  ];

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-12rem)] flex flex-col gap-8 pb-10">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes nodAnimation {
          0%, 100% { transform: translateY(0) scale(1); }
          35% { transform: translateY(5px) scale(0.98); }
          70% { transform: translateY(-1px) scale(1.02); }
        }
        @keyframes thinkAnimation {
          0%, 100% { transform: rotate(0deg) scale(1); }
          33% { transform: rotate(-2deg) scale(0.99); }
          66% { transform: rotate(2deg) scale(0.99); }
        }
        .animate-avatar-nod {
          animation: nodAnimation 1.4s infinite ease-in-out;
        }
        .animate-avatar-think {
          animation: thinkAnimation 2.6s infinite ease-in-out;
        }
        .emotion-border-smiling {
          border-color: rgba(244, 63, 94, 0.8) !important;
          box-shadow: 0 0 20px rgba(244, 63, 94, 0.5);
        }
        .emotion-border-thinking {
          border-color: rgba(168, 85, 247, 0.8) !important;
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
        }
        .emotion-border-nodding {
          border-color: rgba(34, 197, 94, 0.8) !important;
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
        }
      `}} />

      <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
        
        {/* Mentor Visualizer & Controls */}
        <div className="lg:w-80 flex flex-col gap-6">
          <div className="bg-slate-950 p-8 rounded-[40px] flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden group shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 opacity-50" />
            
            <div className="relative">
              <div 
                className={`w-32 h-32 rounded-full border-4 flex items-center justify-center relative overflow-hidden transition-all duration-500 ${
                  isSpeaking ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950' : ''
                } ${
                  currentEmotion === 'smiling' ? 'emotion-border-smiling border-pink-400' :
                  currentEmotion === 'thinking' ? 'emotion-border-thinking border-purple-500 animate-avatar-think' :
                  currentEmotion === 'nodding' ? 'emotion-border-nodding border-emerald-500 animate-avatar-nod' :
                  'border-indigo-500/30'
                }`}
              >
                <div 
                  className={`absolute inset-0 rounded-full animate-ping pointer-events-none transition-colors duration-500 ${
                    currentEmotion === 'smiling' ? 'bg-pink-500/20' :
                    currentEmotion === 'thinking' ? 'bg-purple-500/20' :
                    currentEmotion === 'nodding' ? 'bg-emerald-500/20' :
                    'bg-indigo-500/10'
                  }`} 
                  style={{ animationDuration: '3s' }} 
                />
                <img 
                  src={mentorAvatar} 
                  alt="AI Female Career Mentor" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover relative z-10"
                />

                {/* Real-time Lip-Sync Vector Overlay */}
                <div className="absolute inset-0 pointer-events-none z-20">
                  <svg width="128" height="128" viewBox="0 0 128 128" className="w-full h-full">
                    <defs>
                      <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity="0.85" />
                        <stop offset="50%" stopColor="#c084fc" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity="0.85" />
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.0" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Dark inner mouth cavity fill when speaking to look natural */}
                    {isSpeaking && (
                      <path 
                        d={getMouthData().innerPath} 
                        fill="#1e1b4b" 
                        opacity="0.5" 
                      />
                    )}

                    {/* Highly responsive lip curves */}
                    <path 
                      d={getMouthData().upperPath} 
                      fill="none" 
                      stroke="url(#neonGlow)" 
                      strokeWidth={isSpeaking ? "1.6" : "1"} 
                      filter="url(#glow)"
                      opacity={isSpeaking ? "1" : "0.45"}
                      className="transition-all duration-75"
                    />
                    <path 
                      d={getMouthData().lowerPath} 
                      fill="none" 
                      stroke="url(#neonGlow)" 
                      strokeWidth={isSpeaking ? "1.6" : "1"} 
                      filter="url(#glow)"
                      opacity={isSpeaking ? "1" : "0.45"}
                      className="transition-all duration-75"
                    />

                    {/* Smiling Cheek Accents for facial landmark tracking */}
                    {currentEmotion === 'smiling' && (
                      <>
                        <path 
                          d={`M ${getMouthData().leftX - 1.5} ${getMouthData().centerY - 1.5} Q ${getMouthData().leftX - 3} ${getMouthData().centerY - 4.5} ${getMouthData().leftX - 1} ${getMouthData().centerY - 6}`}
                          fill="none"
                          stroke="url(#neonGlow)"
                          strokeWidth="1.2"
                          opacity="0.75"
                          filter="url(#glow)"
                        />
                        <path 
                          d={`M ${getMouthData().rightX + 1.5} ${getMouthData().centerY - 1.5} Q ${getMouthData().rightX + 3} ${getMouthData().centerY - 4.5} ${getMouthData().rightX + 1} ${getMouthData().centerY - 6}`}
                          fill="none"
                          stroke="url(#neonGlow)"
                          strokeWidth="1.2"
                          opacity="0.75"
                          filter="url(#glow)"
                        />
                      </>
                    )}

                    {/* Pulsating facial landmarks for futuristic lip-sync mask tracking */}
                    {isSpeaking && (
                      <>
                        <circle cx={getMouthData().leftX} cy={getMouthData().centerY} r="1.2" fill="#c084fc" filter="url(#glow)" />
                        <circle cx={getMouthData().rightX} cy={getMouthData().centerY} r="1.2" fill="#c084fc" filter="url(#glow)" />
                        <circle cx="64" cy={getMouthData().upperY} r="1.2" fill="#818cf8" filter="url(#glow)" />
                        <circle cx="64" cy={getMouthData().lowerY} r="1.2" fill="#818cf8" filter="url(#glow)" />
                      </>
                    )}
                  </svg>
                </div>
              </div>
              
              {/* Real Audio Visualizer */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-1 h-12">
                {[...Array(12)].map((_, i) => {
                  const val = audioDataArray[i * 2] || 0;
                  const height = isSpeaking ? (val / 255) * 40 + 4 : 4;
                  return (
                    <motion.div
                      key={i}
                      animate={{ height }}
                      className={`w-1 rounded-full transition-colors duration-500 ${
                        currentEmotion === 'smiling' ? 'bg-pink-400' :
                        currentEmotion === 'thinking' ? 'bg-purple-400' :
                        currentEmotion === 'nodding' ? 'bg-emerald-400' :
                        'bg-indigo-500'
                      }`}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="relative z-10 pt-4">
              <h3 className="text-xl font-black text-white tracking-widest uppercase">JobsEdge AI Mentor</h3>
              <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-[0.3em] mt-1 flex items-center justify-center gap-1.5 min-h-[1.5rem]">
                {isSpeaking ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        currentEmotion === 'smiling' ? 'bg-pink-400' :
                        currentEmotion === 'thinking' ? 'bg-purple-400' :
                        currentEmotion === 'nodding' ? 'bg-emerald-500' :
                        'bg-indigo-400'
                      }`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        currentEmotion === 'smiling' ? 'bg-pink-500' :
                        currentEmotion === 'thinking' ? 'bg-purple-500' :
                        currentEmotion === 'nodding' ? 'bg-emerald-600' :
                        'bg-indigo-500'
                      }`} />
                    </span>
                    {currentEmotion === 'smiling' ? 'Ananya: Welcomer' :
                     currentEmotion === 'thinking' ? 'Ananya: Thinking' :
                     currentEmotion === 'nodding' ? 'Ananya: Encouraging' :
                     'Ananya: Speaking'}
                  </>
                ) : (
                  'Ananya: Indian AI Strategist'
                )}
              </p>
            </div>

            <div className="flex items-center gap-4 relative z-10">
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`p-4 rounded-2xl transition-all duration-300 ${audioEnabled ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}
              >
                {audioEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
              </button>
              <button
                onClick={() => playVoiceGreeting()}
                className="p-4 bg-slate-800 text-indigo-400 rounded-2xl hover:bg-slate-700 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
              >
                <Play size={18} fill="currentColor" /> Intro
              </button>
            </div>
          </div>

          <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 lg:pr-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Knowledge Modules</h4>
            {modules.map((m, i) => (
              <button
                key={i}
                onClick={() => handleSend(m.prompt)}
                className="w-full flex items-center gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl hover:border-indigo-200 dark:hover:border-indigo-900 hover:shadow-xl transition-all text-left group"
              >
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl transition-transform group-hover:scale-110">
                  <m.icon size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{m.title}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Chat Conversation Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.03),transparent)] pointer-events-none" />
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            <AnimatePresence>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <div className={`flex flex-col gap-3 max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${
                          m.role === 'user' 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-slate-900 text-indigo-400'
                        }`}>
                          {m.role === 'user' ? <UserCircle size={22} /> : <BrainCircuit size={22} />}
                        </div>
                        <div className={`p-6 rounded-[32px] text-[13px] leading-relaxed font-medium ${
                          m.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-800 shadow-sm'
                        }`}>
                          {m.content}
                          
                          {m.role === 'assistant' && (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Audio Digest</p>
                              {!m.clips ? (
                                <button
                                  onClick={() => generateClips(i)}
                                  disabled={isGeneratingClips !== null}
                                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all disabled:opacity-50"
                                >
                                  {isGeneratingClips === i ? (
                                    <Sparkles size={14} className="animate-spin" />
                                  ) : (
                                    <Clock size={14} />
                                  )}
                                  {isGeneratingClips === i ? "Synthesizing..." : "10s Bites"}
                                </button>
                              ) : (
                                <div className="flex gap-2">
                                  <span className="text-[10px] text-slate-400 italic font-medium">Bites Ready</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Clips Section */}
                      {m.role === 'assistant' && m.clips && (
                        <div className="w-full pl-14">
                          <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                            {m.clips.map((clip) => (
                              <button
                                key={clip.id}
                                onClick={() => playClip(clip.text)}
                                className="flex-shrink-0 w-48 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all text-left flex flex-col gap-2 group"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                                    <Headphones size={12} />
                                  </div>
                                  <Play size={12} className="text-slate-300 group-hover:text-indigo-500" fill="currentColor" />
                                </div>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                                  {clip.text}
                                </p>
                                <div className="mt-auto flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <Clock size={8} className="text-slate-400" />
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">~10 SECS</span>
                                  </div>
                                  <Volume1 size={10} className="text-indigo-300 opacity-0 group-hover:opacity-100" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                </motion.div>
              ))}
              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                  <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-400">
                    <BrainCircuit size={22} />
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[30px] rounded-tl-none flex gap-1.5 items-center">
                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
            <div className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Seek strategic counsel..."
                className="w-full pl-8 pr-20 py-6 bg-slate-50 dark:bg-slate-900 border-2 border-transparent rounded-[32px] text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all font-medium placeholder:text-slate-400 dark:text-white"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="absolute right-3 top-3 p-4 bg-indigo-600 text-white rounded-2xl hover:bg-slate-900 transition-all disabled:opacity-50 shadow-xl shadow-indigo-100 flex items-center justify-center"
              >
                <Mic size={20} />
              </button>
            </div>
            <p className="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Neural Advisor | Real-time Market Intelligence Decoded</p>
          </div>
        </div>
      </div>
    </div>
  );
};
