import React from 'react';
import { motion } from 'motion/react';
import { User, Building, Sparkles, ArrowRight, Briefcase } from 'lucide-react';

interface LandingProps {
  onSelectRole: (role: 'candidate' | 'employer') => void;
}

export const Landing: React.FC<LandingProps> = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-4xl relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-indigo-100 dark:border-indigo-800 shadow-sm">
            <Sparkles size={14} />
            Next-Gen Talent Ecosystem
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
            Welcome to <span className="text-indigo-600">JobsEdge AI</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">
            The world's most advanced AI-powered platform for career growth and organizational excellence. Select your path to begin.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Candidate Path */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => onSelectRole('candidate')}
            className="group relative bg-white dark:bg-slate-900 p-10 rounded-[48px] border border-slate-200 dark:border-slate-800 shadow-2xl hover:border-indigo-400 transition-all text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-500" />
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-200 dark:shadow-none group-hover:scale-110 transition-transform">
                <User size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-4 uppercase">Job Seeker</h3>
              <p className="text-slate-400 dark:text-slate-500 text-sm font-bold leading-relaxed mb-8 uppercase tracking-widest">
                Optimize your trajectory. Build ATS-proof resumes, get AI mentorship, and navigate elite career opportunities.
              </p>
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest group-hover:gap-4 transition-all">
                Enter Ecosystem <ArrowRight size={16} />
              </div>
            </div>
          </motion.button>

          {/* Employer Path */}
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => onSelectRole('employer')}
            className="group relative bg-slate-900 p-10 rounded-[48px] border border-slate-800 shadow-2xl hover:border-indigo-500/50 transition-all text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-500" />

            <div className="relative z-10">
              <div className="w-16 h-16 bg-white text-slate-900 rounded-2xl flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform">
                <Building size={32} />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight mb-4 uppercase">Job Provider</h3>
              <p className="text-slate-400 text-sm font-bold leading-relaxed mb-8 uppercase tracking-widest">
                Source elite talent. Post high-impact positions, score candidates with AI, and architect your dream organization.
              </p>
              <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-widest group-hover:gap-4 transition-all">
                Deploy Console <ArrowRight size={16} />
              </div>
            </div>
          </motion.button>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-20 text-center"
        >
          <div className="flex items-center justify-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all">
             <Briefcase size={24} className="text-slate-400" />
             <div className="w-px h-8 bg-slate-300 dark:bg-slate-700 mx-4" />
             <Sparkles size={24} className="text-slate-400" />
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.4em] mt-8">JobsEdge Neural Network Collective</p>
        </motion.div>
      </div>
    </div>
  );
};
