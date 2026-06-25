import { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { ResumeData, View } from './types';
import { ResumeForm } from './components/ResumeForm';
import { ResumePreview } from './components/ResumePreview';
import { JobSearch } from './components/JobSearch';
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';
import { AIIntelligence } from './components/AIIntelligence';
import { AIConsultant } from './components/AIConsultant';
import { AIArchitect } from './components/AIArchitect';
import { TemplateLibrary } from './components/TemplateLibrary';
import { AIMentor } from './components/AIMentor';
import { HiringConsole } from './components/HiringConsole';
import { Profile } from './components/Profile';
import { TourModal } from './components/TourModal';
import { Landing } from './components/Landing';
import { exportToWord } from './lib/wordExport';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { 
  FileText, 
  Search, 
  Download, 
  Layout, 
  Eye, 
  EyeOff,
  Github,
  Linkedin,
  Briefcase,
  Moon,
  Sun,
  LogOut,
  Loader2,
  Sparkles,
  CheckCircle,
  FileDown,
  Menu,
  X as XIcon,
  Wand2,
  BrainCircuit,
  Compass,
  Building,
  Palette,
  Users,
  Bot,
  GraduationCap,
  Crown,
  User,
  HelpCircle,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const initialData: ResumeData = {
  template: 'professional',
  personalInfo: {
    fullName: 'Arjun Vardhan',
    email: 'arjun.vardhan@quantum-ai.io',
    phone: '+91 98765 43210',
    location: 'Bangalore, India',
    website: 'quantum-ai.io/arjun',
    linkedin: 'linkedin.com/in/arjunvardhan',
    github: 'github.com/arjunvardhan',
    industry: 'Artificial Intelligence & Cloud Infrastructure',
    summary: 'Visionary AI Engineering Leader with 12+ years of experience orchestrating large-scale neural architectures and distributed systems. Spearheaded the digital transformation of QuantumAI, resulting in a 40% increase in model training efficiency and $15M in infrastructure savings. Catalyzed the development of autonomous agent frameworks now deployed across Fortune 100 logistics networks, repositioning the organization as a global leader in Generative AI.',
  },
  experience: [
    {
      id: 'exp-1',
      company: 'Quantum Systems',
      position: 'Head of AI Engineering',
      location: 'San Francisco / Bangalore',
      startDate: '2020-01',
      endDate: 'Present',
      current: true,
      description: [
        'Orchestrated the re-architecture of a global LLM inference engine, achieving a 40% reduction in token latency and a 30% increase in concurrent user capacity for 5M+ monthly active users.',
        'Spearheaded the deployment of a proprietary RAG (Retrieval-Augmented Generation) pipeline, improving response accuracy by 45% and reducing hallucination rates by 60% across 200+ enterprise datasets.',
        'Catalyzed a $14M infrastructure cost reduction by engineering a custom orchestration layer that migrated 65% of non-critical inference workloads to spot instances with sub-second failover.',
        'Engineered a scalable vector database architecture handling 1B+ high-dimensional embeddings, resulting in a 50% decrease in query overhead and $2.5M yearly savings in storage costs.'
      ]
    },
    {
      id: 'exp-2',
      company: 'CloudScale Dynamics',
      position: 'Principal Solutions Architect',
      location: 'Hyderabad, India',
      startDate: '2016-05',
      endDate: '2019-12',
      current: false,
      description: [
        'Architected a multi-region Kubernetes-based AI training platform, enabling a 3x increase in modeling experimentation velocity and maintaining 99.999% system availability.',
        'Led the structural migration of 5PB+ high-velocity telemetry data to a serverless lakehouse, reducing data retrieval times by 70% and accelerating model convergence by 22%.',
        'Developed a real-time anomaly detection suite using unsupervised learning architectures, identifying $8.5M in potential financial leakage within the first 6 months of deployment.',
        'Pioneered the organization\'s transition to high-velocity MLOps, slashing model deployment lead time from 15 days to under 4 hours through automated CI/CD/CT pipelines.'
      ]
    }
  ],
  education: [
    {
      id: 'edu-1',
      school: 'Indian Institute of Technology (IIT), Bombay',
      degree: 'Master of Technology in Computer Science & AI',
      location: 'Mumbai, India',
      startDate: '2014',
      endDate: '2016',
      description: 'Specialized in Distributed Neural Networks and High-Performance Computing. Awarded the Institute Gold Medal for Research Excellence in Reinforcement Learning.'
    },
    {
      id: 'edu-2',
      school: 'National Institute of Technology (NIT), Surathkal',
      degree: 'Bachelor of Technology in Information Technology',
      location: 'Karnataka, India',
      startDate: '2010',
      endDate: '2014',
      description: 'Focused on Algorithmic Foundation and Systems Programming. Graduated in the Top 1% of the cohort.'
    }
  ],
  skills: ['Generative AI', 'LLM Fine-tuning', 'Distributed Systems', 'Cloud-Native Architecture', 'GPU Optimization', 'Scalable Microservices', 'Strategic Product Management', 'Technical Visionary Leadership'],
  projects: [
    {
      id: 'proj-1',
      name: 'Nexus Agentic Framework',
      link: 'github.com/quantum/nexus',
      description: 'Designed and deployed an open-source autonomous agent framework that utilizes multi-modal reasoning to solve complex supply chain disruptions in real-time. Achieved 20k+ stars on GitHub.'
    },
    {
      id: 'proj-2',
      name: 'Titan Cluster Monitor',
      link: 'github.com/quantum/titan',
      description: 'Architected a low-overhead monitoring solution for massive GPU clusters using eBPF, providing granular visibility into memory fragmentation and cache hits.'
    }
  ],
  certifications: ['AWS Certified Solutions Architect – Professional', 'Google Cloud Professional Machine Learning Engineer', 'Stanford Executive Leadership Program'],
  languages: ['English (Native)', 'Hindi (Native)', 'German (Working Proficiency)'],
  awards: ['AI Innovator of the Year 2023', 'Top 30 Under 30 Tech Leaders', 'Best Paper Award @ NeurIPS 2022'],
  preferences: {
    autoApply: false,
    remoteOnly: true,
    minSalary: '$250,000+',
    targetRoles: ['VP of Engineering', 'Director of AI', 'Head of Technology'],
  },
};

export function AppContent() {
  const { user, profile, loading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !profile && !loading) {
      const timer = setTimeout(() => {
        setAuthError("Synchronization with the cloud infrastructure is taking longer than expected. Please check your connection or refresh the pulse.");
      }, 8000);
      return () => clearTimeout(timer);
    } else {
      setAuthError(null);
    }
  }, [user, profile, loading]);
  const [preSelectedRole, setPreSelectedRoleState] = useState<'candidate' | 'employer' | null>(() => {
    return localStorage.getItem('preSelectedRole') as 'candidate' | 'employer' | null;
  });
  
  const setPreSelectedRole = (role: 'candidate' | 'employer' | null) => {
    setPreSelectedRoleState(role);
    if (role) {
      localStorage.setItem('preSelectedRole', role);
    } else {
      localStorage.removeItem('preSelectedRole');
    }
  };
  const [data, setData] = useState<ResumeData>(initialData);
  const [view, setView] = useState<View>('builder');
  const [showPreview, setShowPreview] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Load Resume Data
  useEffect(() => {
    if (user && profile?.onboardingCompleted) {
      const loadResume = async () => {
        try {
          const docRef = doc(db, 'resumes', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setData(docSnap.data() as ResumeData);
          }
          setHasLoaded(true);
        } catch (error) {
          console.error("Failed to load resume:", error);
          // If load fails, we still set hasLoaded to true to at least allow saving new changes 
          // but this is risky. Ideally we should retry.
          setHasLoaded(true);
        }
      };
      loadResume();
    }
  }, [user, profile?.onboardingCompleted]);

  // Save Resume Data (Debounced)
  useEffect(() => {
    if (!user || !profile?.onboardingCompleted || !hasLoaded) return;
    
    const saver = setTimeout(async () => {
      setIsSaving(true);
      try {
        await setDoc(doc(db, 'resumes', user.uid), data);
        console.log("Resume synchronized with cloud infrastructure.");
      } catch (error) {
        console.error("Failed to sync resume:", error);
      } finally {
        setTimeout(() => setIsSaving(false), 1000);
      }
    }, 2000);

    return () => clearTimeout(saver);
  }, [data, user, profile?.onboardingCompleted]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${data.personalInfo.fullName || 'Resume'}_${data.template.toUpperCase()}`,
  });

  const navItems = [
    { id: 'builder', label: 'Resume Builder', icon: Layout, premium: false, roles: ['candidate'] },
    { id: 'intelligence', label: 'ATS Analysis', icon: BrainCircuit, premium: false, roles: ['candidate'] },
    { id: 'architect', label: 'One-Click Synthesis', icon: Wand2, premium: false, roles: ['candidate'] },
    { id: 'jobs', label: 'Job Navigator', icon: Compass, premium: false, roles: ['candidate'] },
    { id: 'hiring', label: 'Hiring Console', icon: Building, premium: false, roles: ['employer'] },
    { id: 'mentor', label: 'AI Career Mentor', icon: Users, premium: false, roles: ['candidate', 'employer'] },
    { id: 'consultant', label: 'AI Career Expert', icon: Bot, premium: false, roles: ['candidate', 'employer'] },
    { id: 'templates', label: 'Design Gallery', icon: Palette, premium: false, roles: ['candidate'] },
    { id: 'profile', label: 'Control Center', icon: User, premium: false, roles: ['candidate', 'employer'] },
  ];

  const filteredNav = navItems.filter(item => {
    // If onboarding is completed and we have a role, filter strictly.
    // Otherwise, show common items.
    if (!profile?.role) return !item.roles || item.roles.includes('candidate'); 
    return !item.roles || item.roles.includes(profile.role);
  });

  useEffect(() => {
    if (profile?.onboardingCompleted) {
      if (profile.role === 'employer' && view === 'builder') {
        setView('hiring');
      } else if (profile.role === 'candidate' && view === 'hiring') {
        setView('builder');
      }
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-slate-950 gap-6">
        <div className="relative">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Initializing Neural Ecosystem...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-slate-950 p-6 text-center">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-3xl flex items-center justify-center mb-6 border border-rose-100 dark:border-rose-900/30">
          <XIcon size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3">Sync Anomaly Detected</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm leading-relaxed mb-8">{authError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-slate-900 transition-all"
        >
          Re-initialize Pulse
        </button>
      </div>
    );
  }

  if (!user) {
    if (!preSelectedRole) {
      return <Landing onSelectRole={setPreSelectedRole} />;
    }
    return <Auth preSelectedRole={preSelectedRole} onBack={() => setPreSelectedRole(null)} />;
  }

  if (!profile || !profile.onboardingCompleted) {
    return <Onboarding preSelectedRole={preSelectedRole} />;
  }

  const templates = [
    { id: 'ats', name: 'ATS Standard', icon: Layout },
    { id: 'modern', name: 'Modern Professional', icon: Layout },
    { id: 'executive', name: 'Executive Elite', icon: Layout },
    { id: 'minimalist', name: 'Minimalist Clean', icon: Layout },
  ] as const;

  const calculateProgress = () => {
    let score = 0;
    if (data.personalInfo.fullName) score += 10;
    if (data.personalInfo.summary) score += 10;
    if (data.experience.length > 0) score += 20;
    if (data.education.length > 0) score += 15;
    if (data.skills.length > 0) score += 15;
    if (data.projects.length > 0) score += 15;
    if (data.certifications.length > 0) score += 5;
    if (data.languages.length > 0) score += 5;
    if (data.awards.length > 0) score += 5;
    return Math.min(score, 100);
  };

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/30 transition-colors duration-500 pb-20 lg:pb-0">
      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 z-[70] lg:hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                    <FileText size={22} />
                  </div>
                  <span className="font-black text-slate-900 dark:text-white tracking-tight uppercase">JobsEdge AI</span>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors"
                >
                  <XIcon size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                {filteredNav.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setView(item.id as View);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 font-bold ${
                      view === item.id 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' 
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <item.icon size={22} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <button
                  onClick={() => {
                    handlePrint();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  <Download size={22} />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => {
                    setDarkMode(!darkMode);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  {darkMode ? <Sun size={22} /> : <Moon size={22} />}
                  <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
                </button>
                <button
                  onClick={() => signOut(auth)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-rose-500 font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                >
                  <LogOut size={22} />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Navigation Sidebar / Bottom Bar */}
      {/* Off-screen Resume for Printing (Ensures ref is always available across tabs) */}
      <div className="fixed left-[-9999px] top-[-9999px]" aria-hidden="true">
        <ResumePreview data={data} ref={printRef} />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 h-20 lg:h-auto lg:left-0 lg:top-0 lg:bottom-0 lg:w-24 glass-panel flex lg:flex-col items-center justify-around lg:justify-start py-4 lg:py-10 lg:gap-10 z-50 border-t lg:border-t-0 lg:border-r border-slate-200/60 dark:border-slate-800/60 lg:flex hidden">
        <motion.div 
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          className="hidden lg:flex w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[22px] items-center justify-center text-white shadow-2xl shadow-indigo-200 dark:shadow-indigo-900/20 cursor-pointer relative group"
        >
          <FileText size={30} strokeWidth={2.5} />
          <div className="absolute -right-2 -top-2 w-5 h-5 bg-rose-500 rounded-full border-4 border-white dark:border-slate-900" />
        </motion.div>
        
        <div className="flex lg:flex-col gap-4 sm:gap-8 flex-1 items-center justify-center">
          {filteredNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={`group relative p-3 sm:p-4 rounded-2xl transition-all duration-500 ${
                view === item.id 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40' 
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <item.icon size={24} />
              {item.premium && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white dark:border-slate-900" />
              )}
              <span className="hidden lg:block absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest whitespace-nowrap z-50">
                {item.label} {item.premium ? '(Pro)' : ''}
              </span>
            </button>
          ))}
          
          <div className="hidden lg:block h-px w-8 bg-slate-200 dark:bg-slate-800 mx-auto my-2" />
          
          <button
            onClick={() => handlePrint()}
            className="group relative p-3 sm:p-4 rounded-2xl text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 transition-all duration-500"
          >
            <Download size={24} />
            <span className="hidden lg:block absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest whitespace-nowrap z-50">
              Download PDF
            </span>
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="group relative p-3 sm:p-4 rounded-2xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition-all duration-500"
          >
            {darkMode ? <Sun size={24} /> : <Moon size={24} />}
            <span className="hidden lg:block absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest whitespace-nowrap z-50">
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          <button
            onClick={() => signOut(auth)}
            className="group relative p-3 sm:p-4 rounded-2xl text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 transition-all duration-500"
          >
            <LogOut size={24} />
            <span className="hidden lg:block absolute left-full ml-4 px-3 py-1.5 bg-rose-600 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest whitespace-nowrap z-50">
              Sign Out
            </span>
          </button>
        </div>

        <div className="hidden lg:flex flex-col gap-8 text-slate-300 dark:text-slate-600">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-all hover:scale-110">
            <Github size={22} />
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-all hover:scale-110">
            <Linkedin size={22} />
          </a>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="lg:pl-24 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl border-b border-slate-200/60 dark:border-slate-800/60 px-4 sm:px-8 lg:px-12 py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-center gap-4 z-40">
          <div className="flex items-center gap-4 sm:gap-10 w-full sm:w-auto justify-between sm:justify-start">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 rounded-xl bg-slate-100 dark:bg-slate-900 transition-colors"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 sm:gap-3">
                {view === 'builder' ? 'Resume Builder' : view === 'intelligence' ? 'Intelligence' : view === 'templates' ? 'Gallery' : view === 'architect' ? 'One-Click' : view === 'consultant' ? 'Consultant' : view === 'mentor' ? 'Mentor' : view === 'profile' ? 'Control Center' : view === 'hiring' ? 'Hiring Console' : 'Navigator'}
                <span className="text-[9px] sm:text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 sm:px-2 py-0.5 rounded-md uppercase tracking-[0.2em]">Pro</span>
                
                {isSaving && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-indigo-500 ml-2"
                  >
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] hidden sm:inline">Syncing...</span>
                  </motion.div>
                )}
              </h1>
              <p className="hidden sm:block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                {view === 'builder' 
                  ? 'Professional Narrative' 
                  : view === 'intelligence'
                  ? 'Strategic Intelligence Hub'
                  : view === 'architect'
                  ? 'Instant Professional Synthesis'
                  : view === 'consultant'
                  ? 'Elite Career Guidance'
                  : view === 'templates'
                  ? 'Visual Impact'
                  : view === 'profile'
                  ? 'Identity Management'
                  : view === 'hiring'
                  ? 'Enterprise Recruitment'
                  : 'Strategic Move'}
              </p>
            </div>

            {view === 'builder' && (
              <div className="hidden md:flex items-center gap-4 lg:gap-6">
                <div className="h-8 lg:h-10 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    <span>Strength</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{progress}%</span>
                  </div>
                  <div className="w-32 lg:w-48 h-1 lg:h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.4)]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
            <div className="hidden sm:flex items-center gap-1 bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800/60 overflow-x-auto max-w-[200px] lg:max-w-none">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setData({ ...data, template: t.id })}
                  className={`px-2 lg:px-4 py-1.5 lg:py-2 text-[9px] lg:text-[10px] font-black rounded-lg transition-all uppercase tracking-widest whitespace-nowrap ${
                    data.template === t.id
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-lg shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-200 dark:ring-slate-700'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  {t.name.split(' ')[0]}
                </button>
              ))}
            </div>
            
            <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1 lg:mx-2" />

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsTourOpen(true)}
                className="p-3 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30"
                title="Watch App Tour"
              >
                <HelpCircle size={22} />
              </button>

              {view === 'builder' && (
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="hidden lg:block p-3 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30"
                  title={showPreview ? 'Hide Preview' : 'Show Preview'}
                >
                  {showPreview ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              )}
              <button
                onClick={() => handlePrint()}
                className="btn-primary px-4 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-[11px]"
              >
                <Download size={16} className="sm:w-[18px]" />
                <span className="hidden xs:inline">PDF</span>
              </button>
              <button
                onClick={() => exportToWord(data)}
                className="flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-[11px] font-black rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all uppercase tracking-widest"
              >
                <FileDown size={16} className="sm:w-[18px] text-indigo-600" />
                <span className="hidden xs:inline">Word</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 lg:p-12">
          <AnimatePresence mode="wait">
            {view === 'builder' ? (
              <motion.div
                key="builder"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`grid gap-8 sm:gap-12 ${showPreview ? 'lg:grid-cols-2' : 'max-w-4xl mx-auto'}`}
              >
                {/* Mobile View Switcher */}
                <div className="lg:hidden flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setMobileTab('edit')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                      mobileTab === 'edit' 
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-lg' 
                        : 'text-slate-400'
                    }`}
                  >
                    Edit Data
                  </button>
                  <button
                    onClick={() => setMobileTab('preview')}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                      mobileTab === 'preview' 
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-lg' 
                        : 'text-slate-400'
                    }`}
                  >
                    Live Preview
                  </button>
                </div>

                <div className={`space-y-8 sm:space-y-10 ${mobileTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
                  <div className="bg-indigo-900 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] text-white relative overflow-hidden shadow-2xl shadow-indigo-200 dark:shadow-none">
                    <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-white/10 rounded-full -mr-24 sm:-mr-32 -mt-24 sm:-mt-32 blur-3xl" />
                    <div className="relative z-10 flex gap-4 sm:gap-6 items-center">
                      <div className="p-3 sm:p-4 bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl shrink-0">
                        <Briefcase size={24} className="sm:w-[32px] text-indigo-200" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg sm:text-xl font-bold tracking-tight">ATS Optimization</h3>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                            <span className="text-rose-400 text-[10px] font-black">*</span>
                            <span className="text-[8px] text-indigo-100 font-black uppercase tracking-tighter">ATS Mandatory</span>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-indigo-200/80 mt-1 font-medium line-clamp-2 sm:line-clamp-none">
                          Your resume is being engineered for maximum parseability.
                        </p>
                      </div>
                    </div>
                  </div>
                  <ResumeForm data={data} onChange={setData} />
                </div>

                {showPreview && (
                  <div className={`lg:sticky lg:top-32 h-auto lg:h-[calc(100vh-10rem)] overflow-y-auto lg:pr-6 custom-scrollbar ${mobileTab === 'edit' ? 'hidden lg:block' : 'block'}`}>
                    <div className="bg-slate-200/50 dark:bg-slate-900/50 p-4 sm:p-8 lg:p-12 rounded-[24px] sm:rounded-[32px] lg:rounded-[40px] border border-slate-200/60 dark:border-slate-800/60 shadow-inner overflow-x-auto flex justify-center">
                      <div className="min-w-[800px] lg:min-w-0 origin-top scale-[0.45] sm:scale-[0.7] md:scale-[0.8] lg:scale-100 my-[-25%] sm:my-[-10%] lg:my-0">
                        <ResumePreview data={data} ref={resumeRef} />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : view === 'intelligence' ? (
              <motion.div
                key="intelligence"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <AIIntelligence data={data} onDataChange={setData} isPremium={true} setView={setView} />
              </motion.div>
            ) : view === 'architect' ? (
              <motion.div
                key="architect"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <AIArchitect data={data} onDataChange={setData} />
              </motion.div>
            ) : view === 'consultant' ? (
              <motion.div
                key="consultant"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <AIConsultant data={data} />
              </motion.div>
            ) : view === 'mentor' ? (
              <motion.div
                key="mentor"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <AIMentor data={data} />
              </motion.div>
            ) : view === 'templates' ? (
              <motion.div
                key="templates"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <TemplateLibrary 
                  data={data} 
                  isPremium={true}
                  onSelect={(t) => {
                    setData({ ...data, template: t });
                    setView('builder');
                  }} 
                />
              </motion.div>
            ) : view === 'jobs' ? (
              <motion.div
                key="jobs"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <JobSearch resumeData={data} />
              </motion.div>
            ) : view === 'hiring' ? (
              <motion.div
                key="hiring"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <HiringConsole />
              </motion.div>
            ) : view === 'profile' ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <Profile 
                setView={setView} 
                openTour={() => setIsTourOpen(true)}
              />
              </motion.div>
            ) : (
              <div className="flex items-center justify-center py-32 bg-white dark:bg-slate-900 rounded-[40px] m-4 border-2 border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-slate-400 font-black uppercase tracking-widest">Protocol Offline</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="mt-20 py-12 px-8 border-t border-slate-200/60 dark:border-slate-800/60 transition-colors duration-500">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <FileText size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">JobsEdge AI</h4>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Empowering professional narratives</p>
              </div>
            </div>

            <div className="flex gap-6">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-3 bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-2xl transition-all duration-300 hover:scale-110"
              >
                <Github size={20} />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-3 bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-2xl transition-all duration-300 hover:scale-110"
              >
                <Linkedin size={20} />
              </a>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">© 2026 JOBS EDGE AI</p>
            </div>
          </div>
        </footer>
      </main>

      <TourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
        @media print {
          .resume-preview {
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
        @container (max-width: 600px) {
          .resume-preview {
            font-size: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
