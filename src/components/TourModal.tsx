import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Sparkles, CheckCircle2 } from 'lucide-react';

interface TourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TourModal: React.FC<TourModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl overflow-hidden border border-white/10"
          >
            <div className="absolute top-6 right-6 z-20">
              <button
                onClick={onClose}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all border border-white/20"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col">
              {/* Video Header */}
              <div className="p-8 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center gap-6">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <Play size={28} fill="currentColor" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight leading-tight">Mastering JobsEdge AI</h2>
                  <p className="text-indigo-100/80 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Strategic Operations Briefing • 30 Seconds</p>
                </div>
              </div>

              {/* Video Player */}
              <div className="relative aspect-video bg-black">
                <video
                  autoPlay
                  controls
                  className="w-full h-full object-cover"
                  src="https://cdn.pixabay.com/vimeo/803816550/cloud-154944.mp4?width=1280&hash=8f2762e1a3c7c8b0e8b2f9f1b2f9f1b2f9f1b2f9"
                />
              </div>

              {/* Tips / Features */}
              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-800/30">
                {[
                  { title: 'Neural Synthesis', desc: 'Generate multi-modal professional narratives instantly.' },
                  { title: 'Market Intelligence', desc: 'Real-time job matching via global strategic nodes.' },
                  { title: 'ATS Dominance', desc: 'Zero-latency score optimization for elite visibility.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="mt-1">
                      <CheckCircle2 size={18} className="text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-1">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                <button
                  onClick={onClose}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
