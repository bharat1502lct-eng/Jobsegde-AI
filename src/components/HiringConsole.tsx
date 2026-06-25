import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Plus, 
  Users, 
  Briefcase, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  Sparkles, 
  Loader2,
  BrainCircuit,
  LayoutDashboard,
  Send,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { JobOpening, JobApplication } from '../types';
import { ai, safeJsonParse } from '../lib/ai';

export const HiringConsole: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'post-job' | 'candidates'>('dashboard');
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  const [newJob, setNewJob] = useState({
    title: '',
    industry: '',
    location: '',
    description: '',
    requirements: [] as string[]
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const qJobs = query(
      collection(db, 'jobs'),
      where('employerUid', '==', user.uid)
    );

    const unsubJobs = onSnapshot(qJobs, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as JobOpening[];
      // Sort on client side to avoid missing index error
      jobsData.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setJobs(jobsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore Error in Jobs:", error);
      setIsLoading(false);
    });

    // Applications query
    const unsubApps = onSnapshot(collection(db, 'applications'), (snapshot) => {
      const appsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as JobApplication[];
      setApplications(appsData);
    }, (error) => {
      console.error("Firestore Error in Applications:", error);
    });

    return () => {
      unsubJobs();
      unsubApps();
    };
  }, []);

  const handleGenerateJob = async () => {
    if (!newJob.title || !newJob.industry) {
      alert("Please enter a title and industry first.");
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `As an elite AI corporate recruiter, generate a compelling, high-impact job description and a list of 5 key requirements for:
      Title: ${newJob.title}
      Industry: ${newJob.industry}
      Location: ${newJob.location || 'Remote'}
      
      Format the response as JSON with keys: description (string), requirements (array of strings).`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }]
      });
      
      const data = safeJsonParse<{ description: string; requirements: string[] }>(response.text || '', { description: '', requirements: [] });
      if (data) {
        setNewJob(prev => ({
          ...prev,
          description: data.description,
          requirements: data.requirements
        }));
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePostJob = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!newJob.title || !newJob.description) {
      alert("Please fill in the title and description.");
      return;
    }

    try {
      if (editingJobId) {
        await updateDoc(doc(db, 'jobs', editingJobId), {
          ...newJob,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'jobs'), {
          ...newJob,
          status: 'active',
          employerUid: user.uid,
          createdAt: serverTimestamp()
        });
      }
      setView('dashboard');
      setNewJob({ title: '', industry: '', location: '', description: '', requirements: [] });
      setEditingJobId(null);
    } catch (error) {
      console.error("Operation failed:", error);
    }
  };

  const prepEdit = (job: JobOpening) => {
    setNewJob({
      title: job.title,
      industry: job.industry,
      location: job.location,
      description: job.description,
      requirements: job.requirements
    });
    setEditingJobId(job.id);
    setView('post-job');
  };

  const analyzeCandidate = async (app: JobApplication) => {
    const job = jobs.find(j => j.id === app.jobId);
    if (!job) return;

    try {
      const prompt = `As an elite AI recruiter, analyze this candidate's application for the role: ${job.title}.
      Candidate Name: ${app.candidateName}
      Match Score: ${app.matchScore}%
      Candidate Data: ${JSON.stringify(app)}
      
      Provide a concise (2-3 sentences), high-impact analysis of their structural fit, identifying one key strength and one potential gap.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }]
      });

      await updateDoc(doc(db, 'applications', app.id), {
        aiAnalysis: response.text || "Analysis complete."
      });
    } catch (error) {
      console.error("AI Analysis failed:", error);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'shortlisted' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'applications', id), { status });
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("System sync error.");
    }
  };

  const activeJobs = jobs.filter(j => j.status === 'active');
  const userApplications = applications.filter(app => jobs.some(j => j.id === app.jobId));

  const stats = [
    { label: 'Active Openings', value: activeJobs.length.toString(), icon: Briefcase, color: 'text-indigo-600' },
    { label: 'Total Applicants', value: userApplications.length.toString(), icon: Users, color: 'text-emerald-600' },
    { label: 'Shortlisted', value: userApplications.filter(a => a.status === 'shortlisted').length.toString(), icon: CheckCircle, color: 'text-indigo-500' },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Hiring Infrastructure...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-32 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-4">
            <div className="p-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl shadow-xl">
              <Building size={32} />
            </div>
            Hiring Console
          </h2>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-1">JobsEdge AI | Enterprise Talent Acquisition</p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            onClick={() => setView('dashboard')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              view === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setView('post-job')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              view === 'post-job' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Post Job
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl group hover:border-indigo-200 transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <div className={`p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl ${stat.color} group-hover:scale-110 transition-transform`}>
                      <stat.icon size={24} />
                    </div>
                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</span>
                  </div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</h4>
                </div>
              ))}
            </div>

            {/* Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Active Jobs */}
              <div className="lg:col-span-12 space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Active Positions</h3>
                  <button 
                    onClick={() => setView('post-job')}
                    className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-slate-900 transition-colors"
                  >
                    <Plus size={14} /> Post New Position
                  </button>
                </div>

                {activeJobs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {activeJobs.map((job) => (
                      <div key={job.id} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-xl hover:border-indigo-300 transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-full -mr-16 -mt-16 blur-2xl" />
                        <div className="flex justify-between items-start mb-6 relative z-10">
                          <div>
                            <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">{job.title}</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{job.industry} • {job.location}</p>
                          </div>
                          <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full text-emerald-600 text-[8px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">
                            Active
                          </div>
                        </div>
                        <div className="flex items-center gap-6 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 relative z-10">
                          <button 
                            onClick={() => {
                              setSelectedJobId(job.id);
                              setView('candidates');
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100"
                          >
                            <Users size={14} /> Review {applications.filter(a => a.jobId === job.id).length} Applicants
                          </button>
                          <button 
                            onClick={() => prepEdit(job)}
                            className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"
                            title="Edit Listing"
                          >
                            <LayoutDashboard size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <Briefcase className="mx-auto text-slate-300 mb-4" size={48} />
                    <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase">No Active Openings</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Deploy your first talent acquisition node today.</p>
                    <button 
                      onClick={() => setView('post-job')}
                      className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 shadow-xl shadow-indigo-100"
                    >
                      Post New Job
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {view === 'post-job' && (
          <motion.div
            key="post-job"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto space-y-8"
          >
            <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[48px] border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/20 rounded-full -mr-40 -mt-40 blur-3xl" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 mb-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Position Title</label>
                  <input
                    type="text"
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    placeholder="e.g. Senior Machine Learning Engineer"
                    className="input-field py-4 rounded-2xl"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Industry Sector</label>
                  <input
                    type="text"
                    value={newJob.industry}
                    onChange={(e) => setNewJob({ ...newJob, industry: e.target.value })}
                    placeholder="e.g. FinTech / AI Research"
                    className="input-field py-4 rounded-2xl"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Deployment Location</label>
                  <input
                    type="text"
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    placeholder="e.g. Remote / London, UK"
                    className="input-field py-4 rounded-2xl"
                  />
                </div>
                <div className="flex items-end flex-col justify-end">
                   <button
                    onClick={handleGenerateJob}
                    disabled={isGenerating || !newJob.title || !newJob.industry}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} className="text-indigo-400" />}
                    Generate Description with AI
                  </button>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-2">AI Node v4.0 Active</p>
                </div>
              </div>

              <div className="space-y-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Position Narrative</label>
                  <textarea
                    value={newJob.description}
                    onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                    rows={8}
                    placeholder="Describe the technical scope and impact..."
                    className="input-field py-4 rounded-3xl"
                  />
                </div>

                {newJob.requirements.length > 0 && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Strategic Requirements</label>
                    <div className="grid gap-3">
                      {newJob.requirements.map((req, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
                          <CheckCircle size={16} className="text-indigo-500" />
                          {req}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4">
                   <button
                    onClick={() => setView('dashboard')}
                    className="px-8 py-4 bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all font-sans"
                  >
                    Discard Draft
                  </button>
                  <button
                    onClick={handlePostJob}
                    className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 shadow-xl shadow-indigo-100 transition-all flex items-center gap-3"
                  >
                    <Send size={16} />
                    Finalize & Post Position
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'candidates' && (
          <motion.div
            key="candidates"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                  {selectedJobId ? `Candidates for ${jobs.find(j => j.id === selectedJobId)?.title}` : 'All Applicants'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">AI-Ranked based on structural compatibility</p>
              </div>
              {selectedJobId && (
                <button 
                  onClick={() => setSelectedJobId(null)}
                  className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-slate-900"
                >
                  View All Candidates
                </button>
              )}
            </div>

            <div className="grid gap-6">
              {(selectedJobId 
                ? applications.filter(a => a.jobId === selectedJobId) 
                : userApplications
              ).length > 0 ? (
                (selectedJobId 
                  ? applications.filter(a => a.jobId === selectedJobId) 
                  : userApplications
                ).sort((a, b) => b.matchScore - a.matchScore).map((app, idx) => (
                  <div key={app.id} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-xl group hover:border-indigo-300 transition-all relative overflow-hidden">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                       <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-600">
                          <Users size={32} />
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-slate-900 dark:text-white mb-1">{app.candidateName}</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{app.candidateEmail}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full uppercase tracking-widest">
                               {jobs.find(j => j.id === app.jobId)?.title}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-12 sm:gap-20">
                        <div className="text-center">
                          <div className={`text-4xl font-black mb-1 ${app.matchScore > 85 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                            {app.matchScore}%
                          </div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Match Score</div>
                        </div>

                        <div className="flex items-center gap-3">
                          {app.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleUpdateStatus(app.id, 'shortlisted')}
                                className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all font-sans" 
                                title="Shortlist Candidate"
                              >
                                <CheckCircle size={24} />
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(app.id, 'rejected')}
                                className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all font-sans" 
                                title="Reject Candidate"
                              >
                                <XCircle size={24} />
                              </button>
                            </>
                          )}
                          {app.status !== 'pending' && (
                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                              app.status === 'shortlisted' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                            }`}>
                              {app.status}
                            </span>
                          )}
                          <button className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all">
                            View Resume
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex items-start gap-4">
                      <BrainCircuit size={20} className="text-indigo-500 shrink-0 mt-1" />
                      <div>
                        <div className="flex justify-between items-center mt-2">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Fit Analysis</h5>
                          {!app.aiAnalysis && (
                            <button 
                              onClick={() => analyzeCandidate(app)}
                              className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 flex items-center gap-1 font-sans"
                            >
                              <Sparkles size={12} /> Analyze Profile
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                          {app.aiAnalysis || "Syncing neural profile for strategic fit analysis..."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <Users className="mx-auto text-slate-300 mb-4" size={48} />
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase">No Applicants Yet</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your listing is being distributed across the JobsEdge neural network.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
