import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Loader2, ShieldCheck, HelpCircle, BadgeAlert } from 'lucide-react';

interface AuthProps {
  preSelectedRole: 'candidate' | 'employer';
  onBack: () => void;
}

export const Auth: React.FC<AuthProps> = ({ preSelectedRole, onBack }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      // Force account selection to let users pick or switch Google accounts easily
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError('The Google login popup was blocked. Please enable popups in your browser settings and try again.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Login process was closed. Please click the authentication button to retry.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Handled silently by the system
      } else {
        setError(`Ecosystem Authentication Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = preSelectedRole === 'employer' ? 'Job Provider / Recruiter' : 'Job Seeker / Candidate';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-slate-950 p-6 relative overflow-hidden">
      {/* Decorative ambient background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        id="auth_sso_card"
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 px-8 py-10 rounded-[32px] border border-slate-200/80 dark:border-slate-800 shadow-2xl relative overflow-hidden z-10"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />
        
        {/* Navigation Back Button */}
        <button 
          id="auth_back_btn"
          onClick={onBack}
          className="absolute top-8 left-8 p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-all"
          title="Back to role selection"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="text-center mt-6 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-5 shadow-lg shadow-indigo-500/25 dark:shadow-none">
            <ShieldCheck size={32} className="stroke-[1.5]" />
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Secure Entry Portal
          </h2>
          
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 rounded-full border border-indigo-100/50 dark:border-indigo-900/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${preSelectedRole === 'employer' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
            </span>
            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none">
              {roleLabel}
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Information Notice emphasizing secure Google-First Authentication */}
          <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-805/70 relative">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <BadgeAlert size={12} className="text-indigo-500" />
              Ecosystem Protocol Notice
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
              JobsEdge manages security and authentication keys server-side using encrypted Google Single Sign-On (SSO). Standard password fields are inactive to enforce zero password leakage.
            </p>
          </div>

          {/* Core Action: Single Sign-On Google Button */}
          <motion.button
            id="google_auth_sso_button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-4.5 bg-indigo-600 hover:bg-slate-950 dark:hover:bg-slate-800 text-white border border-transparent rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3.5 shadow-xl shadow-indigo-500/15 dark:shadow-none disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="animate-spin text-white" size={18} />
            ) : (
              <>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.117 0-5.643-2.525-5.643-5.643 0-3.117 2.525-5.643 5.643-5.643 1.35 0 2.585.476 3.565 1.258l2.42-2.42C16.63 4.122 14.562 3 12.24 3 6.905 3 2.57 7.334 2.57 12.667c0 5.332 4.335 9.666 9.67 9.666 5.56 0 9.245-3.911 9.245-9.406 0-.63-.056-1.242-.2-1.642H12.24z" />
                </svg>
                Continue with Google
              </>
            )}
          </motion.button>

          {/* Error Feedbacks */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                key="auth_error_container"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="text-rose-500 text-xs font-bold bg-rose-50 dark:bg-rose-955/20 p-4 rounded-xl border border-rose-100 dark:border-rose-950/20 flex items-start gap-2.5">
                  <span className="mt-0.5" role="img" aria-label="Warning label">⚠️</span>
                  <div className="leading-tight">{error}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Informative Footer explaining Google OAuth */}
        <div className="text-center mt-10 pt-6 border-t border-slate-100 dark:border-slate-805/70">
          <div className="inline-flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <ShieldCheck size={11} className="text-emerald-500" />
            Active Protection Active Guard
          </div>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-2 tracking-wide">
            SSO uses OAuth 2.0. No data is stored or shared without explicit permission.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
