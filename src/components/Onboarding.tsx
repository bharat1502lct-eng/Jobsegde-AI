import React, { useState, useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, ArrowRight, Loader2, Sparkles, Play, X, CheckCircle2 } from 'lucide-react';

interface OnboardingProps {
  preSelectedRole: 'candidate' | 'employer' | null;
}

export const Onboarding: React.FC<OnboardingProps> = ({ preSelectedRole }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'candidate' | 'employer'>(preSelectedRole || 'candidate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (preSelectedRole) {
      setRole(preSelectedRole);
    }
  }, [preSelectedRole]);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim()) {
      if (preSelectedRole) {
        setStep(3);
      } else {
        setStep(2);
      }
    }
  };

  const handleStep2 = () => {
    setStep(3);
  };

  const handleComplete = async () => {
    if (!auth.currentUser) return;

    setLoading(true);
    setError('');

    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userDocRef, {
        uid: auth.currentUser.uid,
        id: auth.currentUser.uid,
        fullName,
        email: auth.currentUser.email,
        onboardingCompleted: true,
        role,
        subscription: {
          plan: 'free',
          status: 'active',
          expiryDate: null
        },
        usage: {
          aiGenerations: 0,
          resumesCreated: 0
        },
        createdAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("Firestore Error: ", JSON.stringify({
        error: err.message,
        operationType: 'write',
        path: `users/${auth.currentUser?.uid}`,
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          emailVerified: auth.currentUser?.emailVerified,
          isAnonymous: auth.currentUser?.isAnonymous,
        }
      }));
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-slate-950 p-4">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
                  <Sparkles size={28} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Complete Profile</h2>
                  <p className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] mt-1">Let's personalize your JobsEdge AI experience.</p>
                </div>
              </div>

              <form onSubmit={handleStep1} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Arjun Sharma"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="email"
                      value={auth.currentUser?.email || ''}
                      disabled
                      className="w-full pl-14 pr-6 py-4 bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 font-medium cursor-not-allowed"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!fullName}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 dark:shadow-none disabled:opacity-50"
                >
                  Continue to Role Selection
                  <ArrowRight size={20} />
                </button>
              </form>
            </div>
          </motion.div>
        ) : step === 2 ? (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full max-w-lg bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                  <User size={28} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Your Intent</h2>
                  <p className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] mt-1">Select your primary objective on the platform.</p>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setRole('candidate')}
                  className={`w-full p-6 text-left rounded-3xl border-2 transition-all group ${
                    role === 'candidate' 
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-600' 
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">I'm looking for a job</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">AI-powered resume building & job navigation</p>
                    </div>
                    <div className={`p-3 rounded-xl ${role === 'candidate' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                      <Sparkles size={20} />
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setRole('employer')}
                  className={`w-full p-6 text-left rounded-3xl border-2 transition-all group ${
                    role === 'employer' 
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-600' 
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">I'm hiring talent</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Intelligent recruitment & application scoring</p>
                    </div>
                    <div className={`p-3 rounded-xl ${role === 'employer' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                      <ArrowRight size={20} />
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={handleStep2}
                className="w-full mt-8 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 dark:shadow-none"
              >
                Continue to App Tour
                <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-4xl bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-full -mr-48 -mt-48 blur-3xl" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl ">
                  <Play size={24} fill="currentColor" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Intelligence Briefing</h2>
                  <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1 ml-1 text-left">Master the JobsEdge AI ecosystem in 30 seconds.</p>
                </div>
              </div>

              {/* Video Player Placeholder */}
              <div className="w-full aspect-video bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl mb-10 relative group">
                <video 
                  autoPlay
                  controls
                  className="w-full h-full object-cover"
                  src="https://cdn.pixabay.com/vimeo/803816550/cloud-154944.mp4?width=1280&hash=8f2762e1a3c7c8b0e8b2f9f1b2f9f1b2f9f1b2f9"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white mb-4">
                    <Play size={40} fill="currentColor" />
                  </div>
                  <p className="text-white text-xs font-black uppercase tracking-[0.2em]">Neural Deployment Tour</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full mb-10">
                {[
                  { icon: CheckCircle2, label: 'Resume Sync', sub: 'Neural synthesis complete' },
                  { icon: CheckCircle2, label: 'ATS Analysis', sub: 'Strategy node active' },
                  { icon: CheckCircle2, label: 'Career Pilot', sub: 'Autonomous mode ready' }
                ].map((item, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
                    <item.icon size={20} className="text-indigo-600 mb-3" />
                    <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">{item.label}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{item.sub}</p>
                  </div>
                ))}
              </div>

              {error && (
                <p className="w-full text-rose-500 text-xs font-bold bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 mb-6">
                  {error}
                </p>
              )}

              <button
                onClick={handleComplete}
                disabled={loading}
                className="w-full sm:w-auto px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-900 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 dark:shadow-none disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    Initialize Professional Sovereignty
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
