import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Mail, 
  Calendar, 
  ChevronRight, 
  Zap, 
  ShieldCheck, 
  BarChart3, 
  FileText, 
  Building,
  CreditCard,
  Crown,
  LogOut,
  Bell,
  Play,
  Edit2,
  Check,
  X as XIcon,
  Loader2
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { updateDoc, doc } from 'firebase/firestore';
import { View } from '../types';

interface ProfileProps {
  setView: (view: View) => void;
  openTour: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ setView, openTour }) => {
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.fullName || '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync edit name if profile changes externally while not editing
  React.useEffect(() => {
    if (!isEditing && profile) {
      setEditName(profile.fullName);
    }
  }, [profile, isEditing]);

  if (!profile) return null;

  const handleSave = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        fullName: editName.trim()
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const usageStats = [
    { label: 'AI Generations', value: profile.usage.aiGenerations, max: 'Unlimited', icon: Zap },
    { label: 'Resumes Created', value: profile.usage.resumesCreated, max: 'Unlimited', icon: FileText },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 px-4">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <User size={32} className="text-indigo-600" />
            Control Center
          </h2>
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] mt-1 ml-1">Manage your identity and career node status.</p>
        </div>
        
        <button
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 px-6 py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Card */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-8 sm:p-10 shadow-2xl shadow-indigo-100/50 dark:shadow-none relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
            
            <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-[32px] flex items-center justify-center text-indigo-600 shadow-inner border border-white dark:border-slate-700">
                <User size={48} strokeWidth={1.5} />
              </div>
              
              <div className="text-center sm:text-left flex-1 space-y-2">
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                  {isEditing ? (
                    <div className="flex-1 w-full max-w-sm">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-indigo-500 rounded-xl text-lg font-black focus:outline-none dark:text-white"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">{profile.fullName}</h3>
                  )}

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg hover:bg-emerald-600 transition-all disabled:opacity-50"
                        >
                          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setEditName(profile.fullName);
                          }}
                          className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"
                        >
                          <XIcon size={18} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                      >
                        <Edit2 size={12} />
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap justify-center sm:justify-start gap-4 pt-2">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                    <Mail size={14} className="text-indigo-600" />
                    {profile.email}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                    <Calendar size={14} className="text-indigo-600" />
                    Joined {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Role Selection (Newly integrated) */}
          <section className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 p-8 sm:p-10 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
              <ShieldCheck size={100} />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-2">Protocol Mode</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Define your primary objective in the JobsEdge ecosystem.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={async () => {
                    await updateDoc(doc(db, 'users', profile.uid), { role: 'candidate' });
                  }}
                  className={`p-6 text-left rounded-3xl border-2 transition-all ${
                    profile.role === 'candidate' 
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-600' 
                      : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <User size={24} className={profile.role === 'candidate' ? 'text-indigo-600' : 'text-slate-400'} />
                    {profile.role === 'candidate' && <BarChart3 size={16} className="text-indigo-600" />}
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">I'm looking for a job</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Focus on AI Resume Sync & Navigation</p>
                </button>

                <button
                  onClick={async () => {
                    await updateDoc(doc(db, 'users', profile.uid), { role: 'employer' });
                  }}
                  className={`p-6 text-left rounded-3xl border-2 transition-all ${
                    profile.role === 'employer' 
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-600' 
                      : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Building size={24} className={profile.role === 'employer' ? 'text-indigo-600' : 'text-slate-400'} />
                    {profile.role === 'employer' && <BarChart3 size={16} className="text-indigo-600" />}
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">I'm hiring talent</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Focus on Recruitment & Candidate Scoring</p>
                </button>
              </div>
            </div>
          </section>

          {/* Usage Stats */}
          <section className="grid sm:grid-cols-2 gap-6">
            {usageStats.map((stat, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-indigo-600">
                    <stat.icon size={20} />
                  </div>
                  <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Protocol Stats</span>
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</span>
                    <span className="text-slate-400 font-medium text-sm">/ {stat.max}</span>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full"
                    style={{ width: stat.max === 'Unlimited' ? '100%' : `${(stat.value / Number(stat.max)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-8">
          {/* Watch App Tour Section */}
          <section className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-[32px] p-8 text-white relative overflow-hidden group cursor-pointer animate-fade-in" onClick={openTour}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform" />
            
            <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-white/20 rounded-[20px] flex items-center justify-center backdrop-blur-md border border-white/20 group-hover:scale-105 transition-transform shrink-0">
                <Play size={24} fill="currentColor" />
              </div>
              
              <div className="text-center sm:text-left lg:text-center flex-1">
                <h4 className="text-lg font-black mb-1 italic">New to JobsEdge AI?</h4>
                <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-4">Master the full neural ecosystem in 30 seconds.</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl group-hover:bg-indigo-50 transition-colors">
                  Launch App Tour <ChevronRight size={14} />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                <Bell size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Market Alerts</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Notifications</p>
              </div>
            </div>
            <div className="w-10 h-6 bg-indigo-600 rounded-full flex items-center px-1">
              <div className="w-4 h-4 bg-white rounded-full translate-x-4" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
