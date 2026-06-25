import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Lightbulb, 
  TrendingUp, 
  ShieldCheck,
  Zap,
  ChevronRight,
  BrainCircuit,
  MessageCircle
} from 'lucide-react';
import { ai } from '../lib/ai';
import { ResumeData } from '../types';
import { InterviewMockup } from './InterviewMockup';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIConsultantProps {
  data: ResumeData;
}

export const AIConsultant: React.FC<AIConsultantProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'advisor' | 'mockup'>('advisor');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: `Hello! I'm your AI Resume Consultant. I've analyzed your current profile. How can I help you improve your career narrative today?` 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const systemContext = `
        You are an Elite Career Consultant and Resume Expert. 
        Current Resume Data: ${JSON.stringify(data)}
        
        Provide specific, actionable, and high-impact advice. 
        Focus on ATS Optimization, Action Verbs, and Industry Positioning.
      `;

      const contents = [
        ...history.map(h => ({ role: h.role as 'user' | 'model', parts: h.parts })),
        { role: 'user' as const, parts: [{ text: userMessage + "\n\nContext for AI: " + systemContext }] }
      ];

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents
      });
      
      const responseText = result.text || "I encountered an error sync. Please try again.";
      
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (error) {
      console.error("Consultant Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I encountered an error sync. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = [
    "How can I improve my Summary?",
    "What core skills am I missing?",
    "How to quantify my experience better?",
    "ATS compliance check of my bullets."
  ];

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Visual Tab Selection */}
      <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl md:w-fit self-start border border-slate-200/50 dark:border-slate-800/60 shadow-sm shrink-0">
        <button
          onClick={() => setActiveTab('advisor')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer ${
            activeTab === 'advisor'
              ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-100/5'
              : 'text-slate-455 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquare size={12} />
          Resume Strategic Advisor
        </button>
        <button
          onClick={() => setActiveTab('mockup')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer ${
            activeTab === 'mockup'
              ? 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-100/5'
              : 'text-slate-455 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <BrainCircuit size={12} />
          Voice Interview Mockup
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'advisor' ? (
          <motion.div
            key="advisor"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-16rem)] min-h-[500px]"
          >

        {/* Chat Area */}
        <div className="lg:col-span-2 flex flex-col bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-indigo-100/20 dark:shadow-none overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <Bot size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Neural Consultant</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Live Intelligence</span>
                </div>
              </div>
            </div>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
          >
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    m.role === 'user' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-200 dark:shadow-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-none font-medium'
                  }`}>
                    {m.content}
                  </div>
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">
                  <Bot size={16} />
                </div>
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-none flex gap-1 items-center">
                  <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                  <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                  <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                </div>
              </motion.div>
            )}
          </div>

          <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
            <div className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about your resume strategy..."
                className="w-full pl-6 pr-16 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 group-hover:border-indigo-300 transition-all dark:text-white"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="absolute right-2 top-2 p-3 bg-indigo-600 text-white rounded-xl hover:bg-slate-900 transition-all disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:border-indigo-200 dark:hover:border-indigo-500 hover:text-indigo-600 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6 hidden lg:block overflow-y-auto custom-scrollbar">
          <div className="bg-slate-900 p-8 rounded-[40px] text-white space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Lightbulb size={100} />
            </div>
            <div className="space-y-2 relative z-10">
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Strategic Insight</h4>
              <p className="text-sm text-slate-300 font-medium leading-relaxed">
                I can help you translate passive roles into active achievements using the **Context-Action-Result** framework.
              </p>
            </div>
            <div className="space-y-3 relative z-10">
              <div className="flex items-center gap-3 text-[11px] font-bold text-indigo-200 bg-white/5 p-3 rounded-xl border border-white/10">
                <ShieldCheck size={16} />
                ATS Compliance Expert
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold text-indigo-200 bg-white/5 p-3 rounded-xl border border-white/10">
                <TrendingUp size={16} />
                Market Trend Analyzer
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="space-y-2">
              <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Industry Pulse</h4>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Top Trending Competencies</p>
            </div>
            <div className="space-y-3">
              {["Generative AI Engineering", "Product Strategy", "Growth Hacking", "Distributed Systems"].map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl group hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all cursor-default">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 group-hover:text-indigo-600">{s}</span>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-[40px] border border-indigo-100 dark:border-indigo-900/40 text-center space-y-4">
            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto shadow-sm">
              <Lightbulb size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Pro Tip</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Ask me to "ATS-ify" specific sections to ensure they bypass digital filters seamlessly.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
        ) : (
          <motion.div
            key="mockup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full"
          >
            <InterviewMockup data={data} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
