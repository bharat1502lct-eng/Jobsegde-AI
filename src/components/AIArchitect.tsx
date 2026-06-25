import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wand2, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  Bot, 
  Cpu, 
  Network,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layout,
  Briefcase,
  GraduationCap,
  Code
} from 'lucide-react';
import { ai, safeJsonParse } from '../lib/ai';
import { ResumeData } from '../types';

interface AIArchitectProps {
  data: ResumeData;
  onDataChange: (data: ResumeData) => void;
}

export const AIArchitect: React.FC<AIArchitectProps> = ({ data, onDataChange }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<'ready' | 'processing' | 'done'>('ready');
  const [error, setError] = useState<string | null>(null);

  const handleBulkGenerate = async () => {
    setIsGenerating(true);
    setStep('processing');
    setError(null);
    
    try {
      const prompt = `As a world-class Executive Resume Strategist and Elite Career Architect, generate a comprehensive, high-impact resume content package.
      
      CRITICAL FOCUS: 
      - Use high-velocity action verbs (Orchestrated, Spearheaded, Catalyzed, Re-engineered, Architected, Leveraged).
      - Quantify EVERYTHING: Focus on revenue growth (e.g., $10M+), cost savings (e.g., 30% reduction), efficiency %, team scale, and user reach (e.g., 50M+ users).
      - Strategic Tone: Narrative must reflect a candidate capable of visionary leadership and high-stakes decision-making.
      - Industry Specificity: Use deep technical lexicon appropriate for the industry (e.g., LLMs, RAG, Kubernetes, MLOps, Heterogeneous Computing, Edge AI).

      EXAMPLE BULLET FORMULA: [Action Verb] + [Specific Quantifiable Metric] + [Strategic Context/Technology] + [Business Outcome].
      Example: "Orchestrated the re-architecture of a global LLM inference engine, achieving a 40% reduction in token latency and $2M in annual cloud overhead savings."

      CANDIDATE: ${data.personalInfo.fullName}
      TARGET INDUSTRY: ${data.personalInfo.industry || 'Global Technology / High-Growth Sector'}
      CORE COMPETENCIES: ${data.skills.join(', ')}

      EXPERIENCE NODES:
      ${data.experience.map(e => `- ${e.position} at ${e.company} (ID: ${e.id})`).join('\n')}

      EDUCATION NODES:
      ${data.education.map(e => `- ${e.degree} from ${e.school} (ID: ${e.id})`).join('\n')}

      PROJECT NODES:
      ${data.projects.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')}

      INSTRUCTIONS:
      1. Summary: A 3-4 sentence powerhouse executive summary using deep industry lexicon and highlighting strategic USP.
      2. Experience: For EACH experience ID, generate 4 elite-tier achievement bullets using: [Forced Action Verb] + [Quantifiable Outcome] + [Strategic Context].
      3. Education: For EACH education ID, generate a 2-sentence description highlighting strategic foundation and academic honors.
      4. Projects: For EACH project ID, generate a 3-sentence technical narrative highlighting complexity, architecture, and high-impact outcomes.
      5. Certifications: 5 industry-standard elite certifications.
      6. Awards: 3-5 high-honor professional recognitions.
      7. Languages: 2-3 globally relevant professional languages.

      RESPONSE FORMAT: JSON ONLY.
      {
        "summary": "...",
        "experience": [{ "id": "...", "bullets": ["...", "...", "...", "..."] }],
        "education": [{ "id": "...", "description": "..." }],
        "projects": [{ "id": "...", "description": "..." }],
        "certifications": ["...", "..."],
        "awards": ["...", "..."],
        "languages": ["...", "..."]
      }`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const parsedData = safeJsonParse<any>(result.text || '', {});

      let newData = { ...data };

      if (parsedData.summary) {
        newData.personalInfo = { ...newData.personalInfo, summary: parsedData.summary };
      }

      if (parsedData.experience) {
        newData.experience = newData.experience.map(exp => {
          const match = parsedData.experience.find((e: any) => e.id === exp.id);
          if (match) return { ...exp, description: match.bullets };
          return exp;
        });
      }

      if (parsedData.education) {
        newData.education = newData.education.map(edu => {
          const match = parsedData.education.find((e: any) => e.id === edu.id);
          if (match) return { ...edu, description: match.description };
          return edu;
        });
      }

      if (parsedData.projects) {
        newData.projects = newData.projects.map(proj => {
          const match = parsedData.projects.find((p: any) => p.id === proj.id);
          if (match) return { ...proj, description: match.description };
          return proj;
        });
      }

      if (parsedData.certifications) {
        newData.certifications = Array.from(new Set([...newData.certifications, ...parsedData.certifications]));
      }

      if (parsedData.awards) {
        newData.awards = Array.from(new Set([...newData.awards, ...parsedData.awards]));
      }

      if (parsedData.languages) {
        newData.languages = Array.from(new Set([...newData.languages, ...parsedData.languages]));
      }

      onDataChange(newData);
      setStep('done');
    } catch (error: any) {
      console.error("Architect Sync failed:", error);
      setError("Architectural synthesis interrupted. The neural model encountered a mapping anomaly. Please verify your profile data density.");
      setStep('ready');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-32 pt-12 text-center lg:text-left">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mx-auto lg:mx-0 shadow-lg shadow-indigo-100 dark:shadow-none"
        >
          <Sparkles size={14} />
          Autonomous Narrative Synthesis
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[0.95]"
        >
          One-Click <span className="text-indigo-600 block sm:inline">Executive Engine</span>
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed"
        >
          Deploy our advanced neural cluster to reconstruct your entire professional trajectory. We synthesize high-impact summaries, quantifiable achievements, and technical narratives in one unified pass.
        </motion.p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 relative">
        {/* Progress Grid */}
        <div className="space-y-4">
          {[
            { id: 'summary', label: 'Executive Summary', icon: Layout, desc: 'High-octane professional synthesis' },
            { id: 'experience', label: 'achievement Bullets', icon: Briefcase, desc: 'Quantifiable outcome-driven narratives' },
            { id: 'education', label: 'Academic Foundation', icon: GraduationCap, desc: 'Strategic academic focus points' },
            { id: 'projects', label: 'Strategic Initiatives', icon: Code, desc: 'Technical complexity deconstruction' }
          ].map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + (i * 0.1) }}
              className={`p-6 bg-white dark:bg-slate-900 rounded-[32px] border transition-all flex items-center gap-5 ${
                step === 'processing' ? 'border-indigo-100 animate-pulse' : 'border-slate-100 dark:border-slate-800'
              }`}
            >
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                <item.icon size={24} />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{item.label}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Action Panel */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-indigo-100/50 dark:shadow-none flex flex-col items-center justify-center space-y-10">
          <div className="relative">
            <div className="w-32 h-32 bg-indigo-600 rounded-[40px] flex items-center justify-center text-white shadow-2xl shadow-indigo-300 dark:shadow-indigo-900/40 relative z-10 overflow-hidden">
               <motion.div
                 animate={step === 'processing' ? { rotate: 360 } : {}}
                 transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
               >
                 {step === 'done' ? <CheckCircle2 size={48} /> : <Wand2 size={48} />}
               </motion.div>
               {step === 'processing' && (
                 <motion.div 
                   initial={{ y: 50 }}
                   animate={{ y: -50 }}
                   transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                   className="absolute inset-0 bg-white/20 w-full h-20 blur-xl"
                 />
               )}
            </div>
          </div>

          <div className="space-y-3">
             <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
               {step === 'ready' ? 'System Ready' : step === 'processing' ? 'Synthesizing...' : 'Synthesis Complete'}
             </h3>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Neural Engine v4.0 Active</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-100 dark:border-rose-800 rounded-2xl text-[10px] font-black uppercase tracking-widest leading-relaxed"
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} />
                Error Detected
              </div>
              {error}
            </motion.div>
          )}

          <button
            onClick={handleBulkGenerate}
            disabled={isGenerating}
            className={`w-full py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 active:scale-95 ${
              step === 'done' 
                ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-200' 
                : 'bg-indigo-600 text-white shadow-xl shadow-indigo-300'
            }`}
          >
            {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Wand2 size={18} />}
            {step === 'done' ? 'Re-Synthesize Narrative' : 'Execute Full Synthesis'}
          </button>

          {step === 'done' && (
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest"
            >
              Changes applied successfully to Resume Builder
            </motion.p>
          )}
        </div>
      </div>
      
      {/* Bot Legend */}
      <div className="p-8 bg-slate-900 rounded-[40px] text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Bot size={120} />
        </div>
        <div className="flex items-center gap-8 relative z-10">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-indigo-400 border border-white/10 backdrop-blur-sm">
            <Cpu size={32} />
          </div>
          <div className="text-left space-y-1">
            <h4 className="text-xl font-black tracking-tight uppercase">Parallel Intelligence</h4>
            <p className="text-sm text-slate-400 font-medium">We process 12+ career dimensions simultaneously for cohesive tone and internal narrative alignment.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 relative z-10 justify-center">
          <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
            <Network size={12} className="text-indigo-400" />
            Global Context
          </div>
          <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={12} className="text-emerald-400" />
            ATS Compliant
          </div>
        </div>
      </div>
    </div>
  );
};
