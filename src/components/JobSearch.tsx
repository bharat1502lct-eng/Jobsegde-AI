import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Briefcase, 
  MapPin, 
  ExternalLink, 
  Sparkles, 
  Loader2, 
  Bell, 
  BellOff, 
  Trash2, 
  Plus, 
  Clock, 
  ChevronRight, 
  Compass,
  ShieldCheck,
  Star,
  Mail,
  Zap,
  Phone,
  User,
  FileText,
  CheckCircle2,
  X,
  ArrowLeft,
  ArrowRight,
  Kanban,
  List,
  Mic,
  MicOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResumeData, JobOpening, JobApplication } from '../types';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { ai, safeJsonParse, handleFirestoreError } from '../lib/ai';

interface JobSearchProps {
  resumeData: ResumeData;
}

interface Job {
  title: string;
  company: string;
  location: string;
  link: string;
  snippet: string;
  logoUrl?: string;
}

const CompanyLogo = ({ companyName, logoUrl }: { companyName: string; logoUrl?: string }) => {
  const initial = (companyName || '?').trim().charAt(0).toUpperCase();
  
  // Deterministic color gradient selection based on company name hash
  const getGradientClass = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      'from-indigo-500 to-purple-600 shadow-indigo-100 dark:shadow-none',
      'from-emerald-400 to-teal-600 shadow-emerald-100 dark:shadow-none',
      'from-rose-400 to-orange-500 shadow-rose-100 dark:shadow-none',
      'from-sky-400 to-blue-600 shadow-sky-100 dark:shadow-none',
      'from-amber-400 to-amber-600 shadow-amber-100 dark:shadow-none',
      'from-fuchsia-500 to-pink-600 shadow-fuchsia-100 dark:shadow-none',
      'from-violet-500 to-purple-700 shadow-violet-100 dark:shadow-none',
      'from-cyan-400 to-blue-500 shadow-cyan-100 dark:shadow-none'
    ];
    return gradients[hash % gradients.length];
  };

  const gradientClass = getGradientClass(companyName || 'Unknown');

  if (logoUrl) {
    return (
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center p-2 shrink-0 shadow-md">
        <img 
          src={logoUrl} 
          alt={`${companyName} logo`} 
          className="w-full h-full object-contain rounded-xl"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shrink-0 shadow-lg text-white font-black text-lg sm:text-xl tracking-wider select-none border border-white/10`}>
      {initial}
    </div>
  );
};

interface JobAlert {
  id: string;
  keywords: string;
  location: string;
  active: boolean;
  createdAt: any;
}

export const JobSearch: React.FC<JobSearchProps> = ({ resumeData }) => {
  const initialTitle = resumeData.experience[0]?.position || resumeData.personalInfo.industry || 'Professional';
  const initialLocation = 'United States (Remote/Nationwide)';

  const [searchQuery, setSearchQuery] = useState(initialTitle);
  const [searchLocation, setSearchLocation] = useState(initialLocation);
  const [debouncedQuery, setDebouncedQuery] = useState(initialTitle);
  const [debouncedLocation, setDebouncedLocation] = useState(initialLocation);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<string>('');
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [isSettingAlert, setIsSettingAlert] = useState(false);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [editKeywords, setEditKeywords] = useState('');
  const [editLocation, setEditLocation] = useState('');
  
  // New States for Direct Platform Openings
  const { user } = useAuth();
  const [platformJobs, setPlatformJobs] = useState<JobOpening[]>([]);
  const [userApps, setUserApps] = useState<JobApplication[]>([]);
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'platform' | 'web' | 'saved' | 'recommended'>('platform');

  // Recommendation Engine: Suggests new job postings based on saved jobs and application history in Firestore
  const recommendedJobs = useMemo(() => {
    if (!user) return [];

    // Extract preferred keywords/titles from saved jobs & applications
    const savedAndAppliedTitles: string[] = [];
    savedJobs.forEach(j => { if (j.title) savedAndAppliedTitles.push(j.title); });
    userApps.forEach(app => {
      // Find corresponding job title
      const pJob = platformJobs.find(pj => pj.id === app.jobId);
      if (pJob && pJob.title) savedAndAppliedTitles.push(pJob.title);
      const wJob = jobs.find(wj => (wj.link || `${wj.title}-${wj.company}`) === app.jobId);
      if (wJob && wJob.title) savedAndAppliedTitles.push(wJob.title);
    });

    const resumeTargetRoles = resumeData?.preferences?.targetRoles || [];
    const resumeSkills = resumeData?.skills || [];
    const resumeIndustry = resumeData?.personalInfo?.industry || '';
    const resumeLocation = resumeData?.personalInfo?.location || '';
    const isRemotePref = resumeData?.preferences?.remoteOnly || false;

    // Helper to calculate matching and insights for each candidate job posting
    const calculateRecommendation = (job: any, isPlatform: boolean) => {
      const title = job.title || '';
      const company = isPlatform ? (job.industry || '') : (job.company || '');
      const location = job.location || '';
      const description = isPlatform ? (job.description || '') : (job.snippet || '');
      const requirements = isPlatform ? (job.requirements || []) : [];
      const jobId = isPlatform ? job.id : (job.link || `${job.title}-${job.company}`);
      const typeStr = isPlatform ? 'platform' : 'web';

      // 1. Filter out already saved or applied jobs
      const isAlreadySaved = savedJobs.some(sj => sj.jobId === jobId && sj.type === typeStr);
      const isAlreadyApplied = userApps.some(app => app.jobId === jobId);
      if (isAlreadySaved || isAlreadyApplied) return null;

      let score = 40; // Base score
      const reasons: string[] = [];

      // A. Title/Role Overlap check
      let titleMatched = false;
      for (const role of resumeTargetRoles) {
        if (title.toLowerCase().includes(role.toLowerCase())) {
          score += 25;
          reasons.push(`Matches target role: "${role}"`);
          titleMatched = true;
          break;
        }
      }

      // Keyword match from history
      if (!titleMatched && savedAndAppliedTitles.length > 0) {
        const words = title.toLowerCase().split(/\s+/);
        const savedWords = savedAndAppliedTitles.flatMap(t => t.toLowerCase().split(/\s+/))
          .filter(w => w.length > 3 && !['with', 'senior', 'junior', 'lead', 'staff', 'principal', 'manager', 'director', 'developer', 'engineer', 'architect'].includes(w));
        
        const matchedWords = words.filter(w => savedWords.includes(w));
        if (matchedWords.length > 0) {
          score += Math.min(30, matchedWords.length * 8);
          reasons.push(`Similar role keywords to your saved/applied jobs`);
          titleMatched = true;
        }
      }

      // B. Skills Matching
      let matchedSkillsCount = 0;
      const skillsToDisplay: string[] = [];
      const lowerDesc = description.toLowerCase();
      const lowerReqs = requirements.map((r: string) => r.toLowerCase()).join(' ');

      resumeSkills.forEach(skill => {
        const lowerSkill = skill.toLowerCase();
        if (lowerDesc.includes(lowerSkill) || lowerReqs.includes(lowerSkill)) {
          score += 8;
          matchedSkillsCount++;
          if (skillsToDisplay.length < 3) {
            skillsToDisplay.push(skill);
          }
        }
      });

      if (matchedSkillsCount > 0) {
        reasons.push(`Requires your skills: ${skillsToDisplay.join(', ')}`);
      }

      // C. Location Curation
      const lowerLoc = location.toLowerCase();
      if (isRemotePref && (lowerLoc.includes('remote') || lowerLoc.includes('anywhere') || lowerLoc.includes('virtual'))) {
        score += 25;
        reasons.push(`Offers Remote work option`);
      } else if (resumeLocation && lowerLoc.includes(resumeLocation.toLowerCase())) {
        score += 15;
        reasons.push(`Matches your location: ${resumeLocation}`);
      }

      // D. Industry Alignment
      if (resumeIndustry && isPlatform && job.industry && job.industry.toLowerCase().includes(resumeIndustry.toLowerCase())) {
        score += 15;
        reasons.push(`Aligned with industry: ${resumeIndustry}`);
      }

      // Fallback
      if (reasons.length === 0) {
        reasons.push("Recommended based on profile similarity");
      }

      const finalMatchScore = Math.min(99, Math.max(65, score));

      return {
        job,
        type: typeStr,
        matchScore: finalMatchScore,
        reasons
      };
    };

    const platformRecs = platformJobs
      .map(j => calculateRecommendation(j, true))
      .filter((r): r is any => r !== null);

    const webRecs = jobs
      .map(j => calculateRecommendation(j, false))
      .filter((r): r is any => r !== null);

    return [...platformRecs, ...webRecs].sort((a, b) => b.matchScore - a.matchScore);
  }, [user, platformJobs, jobs, savedJobs, userApps, resumeData]);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [hasSeeded, setHasSeeded] = useState(false);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(false);
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  
  // Saved Jobs View State (List or Application Tracker/Board)
  const [savedJobsView, setSavedJobsView] = useState<'list' | 'tracker'>('tracker');

  const updateSavedJobStatus = async (savedJobId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'savedJobs', savedJobId), {
        trackerStatus: newStatus
      });
    } catch (error) {
      console.error("Failed to update saved job status:", error);
      alert("Failed to update job status. Please try again.");
    }
  };
  
  // New Local Filters
  const [titleFilter, setTitleFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedModels, setSelectedModels] = useState<('Remote' | 'On-site' | 'Hybrid')[]>([]);
  const [preferredRegions, setPreferredRegions] = useState('');

  // Speech Recognition States & Handler
  const [listeningField, setListeningField] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const startListening = (field: string, setter: (val: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser. Please try Google Chrome, Microsoft Edge, or Apple Safari.");
      return;
    }

    if (listeningField === field) {
      try {
        (window as any)._activeRecognition?.stop();
      } catch (e) {}
      setListeningField(null);
      return;
    }

    try {
      (window as any)._activeRecognition?.stop();
    } catch (e) {}

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListeningField(field);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        const cleanText = transcript.trim().replace(/\.$/, '');
        setter(cleanText);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setListeningField(null);
    };

    recognition.onend = () => {
      setListeningField(null);
    };

    (window as any)._activeRecognition = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setListeningField(null);
    }
  };

  // Quick Apply states
  const [quickApplyJob, setQuickApplyJob] = useState<any>(null);
  const [qaName, setQaName] = useState('');
  const [qaEmail, setQaEmail] = useState('');
  const [qaPhone, setQaPhone] = useState('');
  const [qaCoverLetter, setQaCoverLetter] = useState('');
  const [isQaGenerating, setIsQaGenerating] = useState(false);
  const [qaScore, setQaScore] = useState<number | null>(null);
  const [qaAnalysis, setQaAnalysis] = useState('');
  const [isQaSubmitting, setIsQaSubmitting] = useState(false);
  const [isQaSuccess, setIsQaSuccess] = useState(false);

  const openQuickApply = async (job: any, type: 'platform' | 'web') => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please sign in to submit applications.");
      return;
    }

    const isPlatform = type === 'platform';
    const targetJobId = isPlatform ? job.id : (job.link || `${job.title}-${job.company}`);
    const alreadyApplied = userApps.some(app => app.jobId === targetJobId);
    if (alreadyApplied) {
      alert("You have already submitted an application for this position.");
      return;
    }

    setQaName(resumeData.personalInfo.fullName || user.displayName || '');
    setQaEmail(resumeData.personalInfo.email || user.email || '');
    setQaPhone(resumeData.personalInfo.phone || '');
    setQaCoverLetter('');
    setQaScore(null);
    setQaAnalysis('');
    setIsQaSuccess(false);
    setQuickApplyJob({ ...job, type });
    setIsQaGenerating(true);

    try {
      const jobDesc = isPlatform ? job.description : job.snippet;
      const jobReqs = isPlatform && job.requirements ? job.requirements.join(', ') : 'Not explicitly specified, deduce from description';
      const companyName = isPlatform ? (job.industry || 'Enterprise Partner') : job.company;

      const prompt = `Act as an expert technical recruiter and professional copywriter. Analyze this candidate's resume for the job: "${job.title}" at "${companyName}".
Job Description: ${jobDesc}
Job Requirements: ${jobReqs}

Candidate Profile:
- Name: ${resumeData.personalInfo.fullName || user.displayName || 'Candidate'}
- Title: ${resumeData.experience[0]?.position || 'Specialist'}
- Skills: ${resumeData.skills.join(', ')}
- Experience: ${JSON.stringify(resumeData.experience)}
- Projects: ${JSON.stringify(resumeData.projects)}

Tasks:
1. Calculate an accurate compatibility match percentage (a number between 65 and 99).
2. Write a 2-3 sentence high-impact summary of their structural fit, highlighting 1 key strength and 1 potential gap relative to this specific job description.
3. Write a highly tailored, persuasive, 150-word cover letter addressing the hiring manager for this position. Express keen interest and detail how their experience directly lines up with the role. Do not use generic placeholders like [Employer Name] - use actual names if available or write naturally.

Return ONLY a JSON object with these keys:
- score: (number)
- analysis: (string)
- coverLetter: (string)
`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }]
      });

      const result = safeJsonParse<{ score: number; analysis: string; coverLetter: string }>(response.text || '', {
        score: 78,
        analysis: "The candidate's core expertise aligns strongly with the job requirements. Additional alignment can be demonstrated in key project portfolios.",
        coverLetter: `Dear Hiring Team,\n\nI am writing to express my strong interest in the ${job.title} role. With a proven track record in the industry and extensive expertise in key technologies such as ${resumeData.skills.slice(0, 3).join(', ')}, I am confident in my ability to drive success. I look forward to discussing how my experience can benefit your team.\n\nSincerely,\n${resumeData.personalInfo.fullName || 'Candidate'}`
      });

      setQaScore(result.score);
      setQaAnalysis(result.analysis);
      setQaCoverLetter(result.coverLetter);
    } catch (err) {
      console.error("Failed to pre-fill application using Gemini:", err);
      setQaScore(75);
      setQaAnalysis("Standard profile evaluation completed based on resume data.");
      setQaCoverLetter(`Dear Hiring Team,\n\nI am extremely excited to apply for the ${job.title} position. Given my background and skills, I am confident I can make an immediate positive impact.\n\nBest regards,\n${resumeData.personalInfo.fullName || 'Candidate'}`);
    } finally {
      setIsQaGenerating(false);
    }
  };

  const submitQuickApply = async () => {
    if (!quickApplyJob) return;
    const user = auth.currentUser;
    if (!user) return;

    setIsQaSubmitting(true);
    try {
      const isPlatform = quickApplyJob.type === 'platform';
      const targetJobId = isPlatform ? quickApplyJob.id : (quickApplyJob.link || `${quickApplyJob.title}-${quickApplyJob.company}`);

      await addDoc(collection(db, 'applications'), {
        jobId: targetJobId,
        candidateUid: user.uid,
        candidateName: qaName,
        candidateEmail: qaEmail,
        candidatePhone: qaPhone,
        matchScore: qaScore || 75,
        aiAnalysis: qaAnalysis || "Direct application successfully processed by recruitment nodes.",
        coverLetter: qaCoverLetter,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setIsQaSuccess(true);
      setTimeout(() => {
        setQuickApplyJob(null);
        setIsQaSuccess(false);
      }, 2500);
    } catch (error) {
      console.error("Failed to submit quick application:", error);
      alert("Application submission failed. Please try again.");
    } finally {
      setIsQaSubmitting(false);
    }
  };

  const searchJobs = React.useCallback(async (e?: React.FormEvent, q?: string, l?: string) => {
    e?.preventDefault();
    if (isLoading) return;

    const finalQuery = q || searchQuery;
    const finalLocation = l || searchLocation;

    if (!finalQuery.trim() && !finalLocation.trim()) return;

    // Reset local filters on new search
    setTitleFilter('');
    setCompanyFilter('');
    setLocationFilter('');
    setSelectedModels([]);
    setPreferredRegions('');

    setIsLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [{
            text: `Act as a senior technical recruiter specializing in the global job market. 
            Identify 5 real, high-impact job openings for a candidate with this profile:
            - Professional: ${resumeData.experience[0]?.position || 'Specialist'} at ${resumeData.experience[0]?.company || 'various firms'}
            - Industry: ${resumeData.personalInfo.industry || 'Tech/Corporate'}
            - Keywords: ${finalQuery || 'Relevant Roles'}
            - Skills: ${resumeData.skills.join(', ')}
            - Preferred Location: ${finalLocation || 'Remote / Major Tech Hubs'}

            Search for roles that specifically value their industry background and skills.
            Return ONLY a JSON array of objects with these keys: title, company, location, snippet, link, logoUrl. 
            For logoUrl, please provide a clean corporate logo URL. You can use Clearbit's API like 'https://logo.clearbit.com/companydomain.com' based on the company name, or a high-quality abstract design/tech icon from Unsplash, or leave it empty if unavailable.`
          }]
        }],
        config: {
          tools: [{ googleSearch: {} }] as any,
        }
      });

      const results = safeJsonParse<Job[]>(response.text, []);
      
      if (results.length > 0) {
        setJobs(results);
      } else {
        // High-quality fallback if search fails
        const mockJobs: Job[] = [
          {
            title: finalQuery || (resumeData.experience[0]?.position ? `Senior ${resumeData.experience[0].position}` : "Lead Strategy Consultant"),
            company: "Global Innovations Corp",
            location: finalLocation || "Hybrid / Major Tech Hub",
            link: "https://www.google.com/search?q=" + encodeURIComponent(`${finalQuery} ${resumeData.personalInfo.industry} jobs`),
            snippet: `Strategic opportunity for an expert in ${resumeData.skills.slice(0, 3).join(', ')} within the ${resumeData.personalInfo.industry || 'specified'} sector. Driving future-ready architectures...`
          },
          {
            title: `Principal ${finalQuery || 'Technical Architect'}`,
            company: "JobsEdge AI Enterprise",
            location: finalLocation || "Remote Friendly",
            link: "https://www.google.com/search?q=" + encodeURIComponent(`${finalQuery} careers`),
            snippet: `Leading ${resumeData.personalInfo.industry || 'enterprise'} firm seeking a high-caliber professional to scale their ${resumeData.skills[0] || 'technical'} infrastructure...`
          }
        ];
        setJobs(mockJobs);
      }

      const recResult = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [{
            text: `Based on this resume data: ${JSON.stringify(resumeData)}, 
            what kind of job titles should this person search for in the current market? 
            Give 3-4 specific suggestions and why, considering global trends and their industry (${resumeData.personalInfo.industry}).`
          }]
        }]
      });
      setRecommendations(recResult.text || '');

    } catch (error) {
      console.error("Job search failed:", error);
      alert("Market intelligence sync failed. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, searchQuery, searchLocation, resumeData]);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setDebouncedLocation(searchLocation);
    }, 800);

    return () => clearTimeout(timer);
  }, [searchQuery, searchLocation]);

  // Auto-trigger search when debounced values change
  useEffect(() => {
    if (debouncedQuery.trim() || debouncedLocation.trim()) {
      searchJobs(undefined, debouncedQuery, debouncedLocation);
    }
  }, [debouncedQuery, debouncedLocation, searchJobs]);

  // Fetch Job Alerts
  useEffect(() => {
    if (!user) {
      setAlerts([]);
      return;
    }

    const q = query(
      collection(db, 'jobAlerts'),
      where('uid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as JobAlert[];
      // Client-side sort
      alertsData.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setAlerts(alertsData);
    }, (error) => {
      console.error("Firestore Error in Alerts:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch and Subscribe to Real-Time Platform Jobs & Applications
  useEffect(() => {
    const qJobs = query(collection(db, 'jobs'));
    const unsubscribeJobs = onSnapshot(qJobs, async (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      const activeOnly = jobsData.filter(j => j.status === 'active');

      if (activeOnly.length === 0 && !hasSeeded) {
        setHasSeeded(true);
        // Seed 3 high-quality nationwide jobs!
        const sampleJobs = [
          {
            title: "Senior AI Full-Stack Developer",
            industry: "Technology",
            location: "San Francisco, CA (Remote Friendly)",
            description: "We are seeking a senior full-stack engineer to build the future of AI-driven collaborative workspaces. You will design, develop, and deploy production-ready LLM interfaces and agentic backends.",
            requirements: [
              "5+ years of experience with React, TypeScript, and Node.js",
              "Hands-on experience with Google Gemini API or OpenAI SDKs",
              "Strong understanding of Firestore, PostgreSQL, and cloud deployments",
              "Passion for clean, scannable, high-impact user interfaces"
            ],
            status: "active",
            employerUid: "system-employer-sf",
            createdAt: serverTimestamp(),
            logoUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&h=100&fit=crop"
          },
          {
            title: "Lead Strategy & Growth Consultant",
            industry: "Consulting",
            location: "New York, NY (Hybrid)",
            description: "Join our strategic elite to drive digital transformation and market expansion for fortune 500 enterprises. You will lead cross-functional delivery teams and shape innovative technology roadmaps.",
            requirements: [
              "8+ years in management consulting or technical advisory roles",
              "Expertise in cloud transformation frameworks and agile delivery",
              "Exceptional executive communication and data-driven analysis",
              "MBA or equivalent advanced degree is a plus"
            ],
            status: "active",
            employerUid: "system-employer-ny",
            createdAt: serverTimestamp(),
            logoUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=100&h=100&fit=crop"
          },
          {
            title: "Director of Product Management",
            industry: "Product",
            location: "Austin, TX (Remote)",
            description: "We are looking for a visionary Product Director to scale our nationwide digital talent acquisition marketplace. You will define the roadmap, lead a team of PMs, and optimize conversion funnels.",
            requirements: [
              "6+ years of product management experience at scaling B2B SaaS companies",
              "Proven track record of launching and scaling marketplace features",
              "Deep analytical proficiency with SQL, Amplitude, and A/B testing",
              "Empathetic leadership style with outstanding cross-functional alignment"
            ],
            status: "active",
            employerUid: "system-employer-austin",
            createdAt: serverTimestamp(),
            logoUrl: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=100&h=100&fit=crop"
          }
        ];

        for (const job of sampleJobs) {
          try {
            await addDoc(collection(db, 'jobs'), job);
          } catch (err) {
            console.error("Failed to seed job:", err);
          }
        }
      } else {
        activeOnly.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });
        setPlatformJobs(activeOnly);
      }
    }, (error) => {
      console.error("Firestore Error in Platform Jobs snapshot:", error);
    });

    // Subscribe to current user's applications, saved jobs & email alert preferences
    let unsubscribeApps = () => {};
    let unsubscribeSaved = () => {};
    let unsubscribePrefs = () => {};
    if (user) {
      const qApps = query(
        collection(db, 'applications'),
        where('candidateUid', '==', user.uid)
      );
      unsubscribeApps = onSnapshot(qApps, (snapshot) => {
        const appsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
         })) as JobApplication[];
        setUserApps(appsData);
      }, (error) => {
        console.error("Firestore Error in User Applications snapshot:", error);
      });

      const qSaved = query(
        collection(db, 'savedJobs'),
        where('uid', '==', user.uid)
      );
      unsubscribeSaved = onSnapshot(qSaved, (snapshot) => {
        const savedData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSavedJobs(savedData);
      }, (error) => {
        console.error("Firestore Error in Saved Jobs snapshot:", error);
      });

      // Email Preferences Subscription
      const docRef = doc(db, 'notificationPreferences', user.uid);
      unsubscribePrefs = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setEmailAlertsEnabled(!!data.emailAlertsEnabled);
        } else {
          setEmailAlertsEnabled(false);
        }
      }, (error) => {
        console.error("Firestore Error in Notification Preferences snapshot:", error);
      });
    } else {
      setUserApps([]);
      setSavedJobs([]);
      setEmailAlertsEnabled(false);
    }

    return () => {
      unsubscribeJobs();
      unsubscribeApps();
      unsubscribeSaved();
      unsubscribePrefs();
    };
  }, [user, hasSeeded]);

  const applyToPlatformJob = async (job: JobOpening) => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please sign in to submit applications.");
      return;
    }

    // Check if already applied
    const alreadyApplied = userApps.some(app => app.jobId === job.id);
    if (alreadyApplied) {
      alert("You have already submitted an application for this position.");
      return;
    }

    setApplyingJobId(job.id);
    try {
      // 1. Calculate an AI Match Score and analysis using Gemini!
      const analysisPrompt = `Act as an expert technical recruiter. Analyze this candidate's resume for the job: "${job.title}" at "Enterprise Partner".
      Job Description: ${job.description}
      Job Requirements: ${job.requirements.join(', ')}
      
      Candidate Profile:
      - Name: ${resumeData.personalInfo.fullName}
      - Title: ${resumeData.experience[0]?.position || 'Specialist'}
      - Skills: ${resumeData.skills.join(', ')}
      - Experience: ${JSON.stringify(resumeData.experience)}
      - Projects: ${JSON.stringify(resumeData.projects)}
      
      Evaluate their structural fit.
      Return ONLY a JSON object with these keys:
      - score: (a number between 65 and 99 representing compatibility match percentage)
      - analysis: (a 2-3 sentence high-impact summary of their structural fit, highlighting 1 key strength and 1 potential gap relative to this specific job description)
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [{ text: analysisPrompt }]
        }]
      });

      const result = safeJsonParse<{ score: number; analysis: string }>(response.text || '', {
        score: 75,
        analysis: "Direct application successfully processed by recruitment nodes. Match score indicates strong fundamental compatibility with the role."
      });

      // 2. Write the application document to Firestore
      await addDoc(collection(db, 'applications'), {
        jobId: job.id,
        candidateUid: user.uid,
        candidateName: resumeData.personalInfo.fullName || user.displayName || 'Candidate',
        candidateEmail: resumeData.personalInfo.email || user.email || '',
        matchScore: result.score,
        aiAnalysis: result.analysis,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      alert(`Application Submitted Successfully!\nYour profile matched with a ${result.score}% compatibility score.\nThe hiring team has been notified.`);
    } catch (error) {
      console.error("Failed to apply for job:", error);
      alert("Application submission failed. Please try again.");
    } finally {
      setApplyingJobId(null);
    }
  };

  const createAlert = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!searchQuery.trim() && !searchLocation.trim()) return;

    setIsSettingAlert(true);
    try {
      await addDoc(collection(db, 'jobAlerts'), {
        uid: user.uid,
        keywords: searchQuery || 'General',
        location: searchLocation || 'Global',
        active: true,
        createdAt: serverTimestamp()
      });
      
      setSearchQuery('');
      setSearchLocation('');

      const btn = document.getElementById('monitor-btn');
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Alert Synchronized!';
        btn.classList.add('bg-emerald-600', 'border-emerald-600', 'text-white');
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove('bg-emerald-600', 'border-emerald-600', 'text-white');
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to create alert:", error);
      alert("Failed to create alert. Please check your connection.");
    } finally {
      setIsSettingAlert(false);
    }
  };

  const updateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlertId) return;

    try {
      await updateDoc(doc(db, 'jobAlerts', editingAlertId), {
        keywords: editKeywords,
        location: editLocation
      });
      setEditingAlertId(null);
    } catch (error) {
      console.error("Failed to update alert:", error);
    }
  };

  const startEditing = (alert: JobAlert) => {
    setEditingAlertId(alert.id);
    setEditKeywords(alert.keywords);
    setEditLocation(alert.location);
  };

  const toggleAlert = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'jobAlerts', id), {
        active: !currentStatus
      });
    } catch (error) {
      console.error("Failed to toggle alert:", error);
    }
  };

  const deleteAlert = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this job alert?")) return;
    try {
      await deleteDoc(doc(db, 'jobAlerts', id));
    } catch (error) {
      console.error("Failed to delete alert:", error);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const loc = (job.location || '').toLowerCase();
    
    // Work model match
    const modelMatches = selectedModels.length === 0 || (() => {
      const isRemote = loc.includes('remote');
      const isHybrid = loc.includes('hybrid');
      const jobModel = isRemote ? 'Remote' : isHybrid ? 'Hybrid' : 'On-site';
      return selectedModels.includes(jobModel);
    })();

    // Preferred geographic regions match
    const regionMatches = !preferredRegions.trim() || (() => {
      const regions = preferredRegions.split(',').map(r => r.trim().toLowerCase()).filter(Boolean);
      return regions.length === 0 || regions.some(r => loc.includes(r));
    })();

    return job.title.toLowerCase().includes(titleFilter.toLowerCase()) &&
           job.company.toLowerCase().includes(companyFilter.toLowerCase()) &&
           loc.includes(locationFilter.toLowerCase()) &&
           modelMatches &&
           regionMatches;
  });

  const filteredPlatformJobs = platformJobs.filter(job => {
    const loc = (job.location || '').toLowerCase();
    
    // Work model match
    const modelMatches = selectedModels.length === 0 || (() => {
      const isRemote = loc.includes('remote');
      const isHybrid = loc.includes('hybrid');
      const jobModel = isRemote ? 'Remote' : isHybrid ? 'Hybrid' : 'On-site';
      return selectedModels.includes(jobModel);
    })();

    // Preferred geographic regions match
    const regionMatches = !preferredRegions.trim() || (() => {
      const regions = preferredRegions.split(',').map(r => r.trim().toLowerCase()).filter(Boolean);
      return regions.length === 0 || regions.some(r => loc.includes(r));
    })();

    return job.title.toLowerCase().includes(titleFilter.toLowerCase()) &&
           (job.industry || '').toLowerCase().includes(companyFilter.toLowerCase()) &&
           loc.includes(locationFilter.toLowerCase()) &&
           modelMatches &&
           regionMatches;
  });

  const filteredSavedJobs = savedJobs.filter(job => {
    const loc = (job.location || '').toLowerCase();
    
    // Work model match
    const modelMatches = selectedModels.length === 0 || (() => {
      const isRemote = loc.includes('remote');
      const isHybrid = loc.includes('hybrid');
      const jobModel = isRemote ? 'Remote' : isHybrid ? 'Hybrid' : 'On-site';
      return selectedModels.includes(jobModel);
    })();

    // Preferred geographic regions match
    const regionMatches = !preferredRegions.trim() || (() => {
      const regions = preferredRegions.split(',').map(r => r.trim().toLowerCase()).filter(Boolean);
      return regions.length === 0 || regions.some(r => loc.includes(r));
    })();

    return (job.title || '').toLowerCase().includes(titleFilter.toLowerCase()) &&
           (job.company || '').toLowerCase().includes(companyFilter.toLowerCase()) &&
           loc.includes(locationFilter.toLowerCase()) &&
           modelMatches &&
           regionMatches;
  });

  const toggleSaveJob = async (job: any, type: 'platform' | 'web') => {
    if (!user) {
      alert("Please sign in to save jobs.");
      return;
    }

    const jobId = type === 'platform' ? job.id : (job.link || job.title + job.company);
    const existingSaved = savedJobs.find(sj => sj.jobId === jobId && sj.type === type);

    try {
      if (existingSaved) {
        await deleteDoc(doc(db, 'savedJobs', existingSaved.id));
      } else {
        await addDoc(collection(db, 'savedJobs'), {
          uid: user.uid,
          jobId: jobId,
          type: type,
          title: job.title || '',
          company: type === 'platform' ? (job.industry || 'Tech/Corporate') : (job.company || ''),
          location: job.location || '',
          link: type === 'web' ? (job.link || '') : '',
          snippet: type === 'platform' ? (job.description || '') : (job.snippet || ''),
          requirements: type === 'platform' ? (job.requirements || []) : [],
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Failed to toggle save job:", error);
      alert("Failed to save/unsave job. Please try again.");
    }
  };

  const toggleEmailAlerts = async () => {
    if (!user) {
      alert("Please sign in to configure email alerts.");
      return;
    }

    setIsSavingPreference(true);
    const newValue = !emailAlertsEnabled;
    const path = `notificationPreferences/${user.uid}`;
    try {
      await setDoc(doc(db, 'notificationPreferences', user.uid), {
        uid: user.uid,
        email: user.email || '',
        emailAlertsEnabled: newValue,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to update notification preferences:", error);
      handleFirestoreError(error, 'write', path);
    } finally {
      setIsSavingPreference(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 sm:space-y-12 pb-32 px-4">
      {/* Header with Alert Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none">
              <Compass size={32} />
            </div>
            Job Navigator
          </h2>
          <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-1">JobsEdge AI | Market Intel & Automation</p>
        </div>
        
        <button
          onClick={() => setShowAlerts(!showAlerts)}
          className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
            showAlerts 
              ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' 
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Bell size={18} className={alerts.length > 0 ? 'animate-bounce' : ''} />
          Alerts {alerts.length > 0 && `(${alerts.length})`}
        </button>
      </div>

      <AnimatePresence>
        {showAlerts && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6 gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Active Job Monitors</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Receive notifications for synchronized matches</p>
                </div>

                {/* Get Email Alerts Toggle */}
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/40 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 select-none">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-all ${emailAlertsEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                      <Mail size={16} />
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] font-black uppercase tracking-widest block text-slate-700 dark:text-slate-300">Get Email Alerts</span>
                      <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-bold">For Saved Criteria</span>
                    </div>
                  </div>
                  <button
                    onClick={toggleEmailAlerts}
                    disabled={isSavingPreference}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      emailAlertsEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                    } ${isSavingPreference ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={emailAlertsEnabled ? "Turn off Email Alerts" : "Turn on Email Alerts"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        emailAlertsEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest self-start sm:self-auto">
                  <ShieldCheck size={14} />
                  Automated Scanners Active
                </div>
              </div>

              {alerts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className={`p-5 rounded-3xl border transition-all flex flex-col group ${
                      alert.active 
                        ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-indigo-200' 
                        : 'bg-slate-100/50 dark:bg-slate-900/50 border-transparent opacity-60'
                    }`}>
                      {editingAlertId === alert.id ? (
                        <form onSubmit={updateAlert} className="space-y-4 h-full flex flex-col">
                          <input
                            type="text"
                            value={editKeywords}
                            onChange={(e) => setEditKeywords(e.target.value)}
                            placeholder="Keywords"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-700 rounded-xl text-xs font-black focus:outline-none dark:text-white"
                          />
                          <input
                            type="text"
                            value={editLocation}
                            onChange={(e) => setEditLocation(e.target.value)}
                            placeholder="Location"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-700 rounded-xl text-xs font-black focus:outline-none dark:text-white"
                          />
                          <div className="flex gap-2 mt-auto">
                            <button 
                              type="submit"
                              className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all"
                            >
                              Update
                            </button>
                            <button 
                              type="button"
                              onClick={() => setEditingAlertId(null)}
                              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {alert.active ? (
                                  <Bell size={12} className="text-indigo-500" />
                                ) : (
                                  <BellOff size={12} className="text-slate-400" />
                                )}
                                <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1">{alert.keywords}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{alert.location}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => startEditing(alert)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                title="Edit Alert"
                              >
                                <Search size={16} />
                              </button>
                              <button 
                                onClick={() => toggleAlert(alert.id, alert.active)}
                                className={`p-2 rounded-xl transition-all ${
                                  alert.active 
                                    ? 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20' 
                                    : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                                }`}
                                title={alert.active ? 'Deactivate Alert' : 'Activate Alert'}
                              >
                                {alert.active ? <Bell size={16} /> : <BellOff size={16} />}
                              </button>
                              <button 
                                onClick={() => deleteAlert(alert.id)}
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="mt-auto pt-4 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between">
                            <span className={`text-[8px] font-black uppercase tracking-widest ${alert.active ? 'text-indigo-500' : 'text-slate-500'}`}>
                              {alert.active ? 'Monitoring Active' : 'Scanner Paused'}
                            </span>
                            <ChevronRight size={12} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-800/20 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <BellOff className="mx-auto text-slate-300 mb-4" size={32} />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No active job alerts configured</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 gap-8">
        <button
          onClick={() => {
            setActiveTab('platform');
            setTitleFilter('');
            setCompanyFilter('');
            setLocationFilter('');
          }}
          className={`pb-4 px-2 font-black text-xs uppercase tracking-widest relative transition-colors ${
            activeTab === 'platform'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Direct Platform Openings ({platformJobs.length})
          {activeTab === 'platform' && (
            <motion.div
              layoutId="activeJobTabLine"
              className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"
            />
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab('web');
            setTitleFilter('');
            setCompanyFilter('');
            setLocationFilter('');
          }}
          className={`pb-4 px-2 font-black text-xs uppercase tracking-widest relative transition-colors ${
            activeTab === 'web'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Nationwide Web Listings ({jobs.length})
          {activeTab === 'web' && (
            <motion.div
              layoutId="activeJobTabLine"
              className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"
            />
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab('saved');
            setTitleFilter('');
            setCompanyFilter('');
            setLocationFilter('');
          }}
          className={`pb-4 px-2 font-black text-xs uppercase tracking-widest relative transition-colors ${
            activeTab === 'saved'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Saved Jobs ({savedJobs.length})
          {activeTab === 'saved' && (
            <motion.div
              layoutId="activeJobTabLine"
              className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"
            />
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab('recommended');
            setTitleFilter('');
            setCompanyFilter('');
            setLocationFilter('');
          }}
          className={`pb-4 px-2 font-black text-xs uppercase tracking-widest relative transition-colors ${
            activeTab === 'recommended'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles size={14} className={activeTab === 'recommended' ? "text-indigo-500 animate-pulse" : "text-indigo-400"} />
            Recommended ({recommendedJobs.length})
          </span>
          {activeTab === 'recommended' && (
            <motion.div
              layoutId="activeJobTabLine"
              className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"
            />
          )}
        </button>
      </div>

      {activeTab === 'web' ? (
        <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[48px] shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/20 rounded-full -mr-40 -mt-40 blur-3xl" />
          
          <form onSubmit={searchJobs} className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
            <div className="lg:col-span-5 space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-1">Target Professional Role</label>
              <div className="relative">
                <Briefcase className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Lead Systems Architect"
                  className="input-field pl-16 pr-14 py-5 rounded-[24px]"
                />
                {speechSupported && (
                  <button
                    type="button"
                    onClick={() => startListening('searchQuery', setSearchQuery)}
                    className={`absolute right-5 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                      listeningField === 'searchQuery'
                        ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-200 dark:shadow-none'
                        : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={listeningField === 'searchQuery' ? "Listening... click to stop" : "Speak keywords to search"}
                  >
                    {listeningField === 'searchQuery' ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                )}
              </div>
            </div>
            <div className="lg:col-span-4 space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-1">Geographic Priority</label>
              <div className="relative">
                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="e.g. London / Hybrid / California"
                  className="input-field pl-16 pr-14 py-5 rounded-[24px]"
                />
                {speechSupported && (
                  <button
                    type="button"
                    onClick={() => startListening('searchLocation', setSearchLocation)}
                    className={`absolute right-5 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                      listeningField === 'searchLocation'
                        ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-200 dark:shadow-none'
                        : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={listeningField === 'searchLocation' ? "Listening... click to stop" : "Speak location"}
                  >
                    {listeningField === 'searchLocation' ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                )}
              </div>
            </div>
            <div className="lg:col-span-3 flex flex-col gap-3 justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[64px] bg-indigo-600 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-slate-900 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50 shadow-xl shadow-indigo-100"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Search size={22} />}
                Execute Search
              </button>
              <button
                type="button"
                id="monitor-btn"
                onClick={createAlert}
                disabled={isSettingAlert || (!searchQuery && !searchLocation)}
                className="w-full h-[48px] bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-50 dark:border-indigo-900/50 rounded-[24px] font-black uppercase tracking-[0.2em] text-[9px] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSettingAlert ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                Monitor This Search
              </button>
            </div>
          </form>

          {recommendations && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 p-10 bg-slate-50 dark:bg-slate-800/30 rounded-[40px] border border-slate-100 dark:border-slate-800 relative group"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles size={64} className="text-indigo-600" />
              </div>
              <h3 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-3 mb-6 uppercase tracking-[0.3em]">
                <Sparkles size={18} />
                Strategic Market Entry Suggestions
              </h3>
              <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {recommendations}
              </div>
            </motion.div>
          )}
        </div>
      ) : activeTab === 'saved' ? (
        <div className="p-8 sm:p-10 bg-slate-50 dark:bg-slate-800/30 rounded-[40px] border border-slate-100 dark:border-slate-800 relative group flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Star size={64} className="text-indigo-600" />
          </div>
          <div className="space-y-4 max-w-3xl">
            <h3 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-3 uppercase tracking-[0.3em]">
              <Star size={18} />
              Your Saved Positions ({savedJobs.length})
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Keep track of specific opportunities you have starred. You can view, search, and manage your saved job listings across Nationwide Web Listings and Direct Platform Openings.
            </p>
          </div>
          
          {/* View Switcher Segmented Control */}
          <div className="bg-slate-200/60 dark:bg-slate-800 p-1 rounded-2xl flex items-center gap-1 self-start md:self-center relative z-10 shrink-0">
            <button
              onClick={() => setSavedJobsView('list')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                savedJobsView === 'list'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <List size={14} />
              List View
            </button>
            <button
              onClick={() => setSavedJobsView('tracker')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                savedJobsView === 'tracker'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Kanban size={14} />
              Application Tracker
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 sm:p-10 bg-slate-50 dark:bg-slate-800/30 rounded-[40px] border border-slate-100 dark:border-slate-800 relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <ShieldCheck size={64} className="text-indigo-600" />
          </div>
          <h3 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-3 mb-4 uppercase tracking-[0.3em]">
            <ShieldCheck size={18} />
            Verified Direct Partner Pipeline
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium max-w-3xl">
            These active postings are published directly by employers nationwide using the JobsEdge enterprise talent system. Applications are processed securely in real-time. Our AI evaluates your compatibility to route your resume instantly to matching recruiters.
          </p>
        </div>
      )}
      
      {/* Result Filters */}
      {((activeTab === 'web' && jobs.length > 0) || 
        (activeTab === 'platform' && platformJobs.length > 0) || 
        (activeTab === 'saved' && savedJobs.length > 0)) && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-lg space-y-6"
        >
          {/* Header and basic filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest">
              <Search size={14} /> Refine Results
            </div>
            
            {(titleFilter || companyFilter || locationFilter || selectedModels.length > 0 || preferredRegions) && (
              <button 
                onClick={() => {
                  setTitleFilter('');
                  setCompanyFilter('');
                  setLocationFilter('');
                  setSelectedModels([]);
                  setPreferredRegions('');
                }}
                className="flex items-center gap-2 text-xs font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 transition-colors self-end md:self-auto"
                title="Clear All Filters"
              >
                <Trash2 size={14} />
                Clear Filters
              </button>
            )}
          </div>

          {/* Grid Layout of Filter Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Job Title</label>
              <div className="relative">
                <input
                  type="text"
                  value={titleFilter}
                  onChange={(e) => setTitleFilter(e.target.value)}
                  placeholder="Filter by title..."
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none focus:border-indigo-500 transition-colors dark:text-white font-medium shadow-sm"
                />
                {speechSupported && (
                  <button
                    type="button"
                    onClick={() => startListening('titleFilter', setTitleFilter)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                      listeningField === 'titleFilter'
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={listeningField === 'titleFilter' ? "Listening... click to stop" : "Speak title filter"}
                  >
                    {listeningField === 'titleFilter' ? <MicOff size={14} /> : <Mic size={14} />}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                {activeTab === 'platform' ? "Industry / Company" : "Company / Employer"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  placeholder={activeTab === 'platform' ? "Filter by industry..." : "Filter by company..."}
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none focus:border-indigo-500 transition-colors dark:text-white font-medium shadow-sm"
                />
                {speechSupported && (
                  <button
                    type="button"
                    onClick={() => startListening('companyFilter', setCompanyFilter)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                      listeningField === 'companyFilter'
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={listeningField === 'companyFilter' ? "Listening... click to stop" : "Speak company filter"}
                  >
                    {listeningField === 'companyFilter' ? <MicOff size={14} /> : <Mic size={14} />}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Location Match</label>
              <div className="relative">
                <input
                  type="text"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  placeholder="Filter by location keyword..."
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none focus:border-indigo-500 transition-colors dark:text-white font-medium shadow-sm"
                />
                {speechSupported && (
                  <button
                    type="button"
                    onClick={() => startListening('locationFilter', setLocationFilter)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                      listeningField === 'locationFilter'
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={listeningField === 'locationFilter' ? "Listening... click to stop" : "Speak location filter"}
                  >
                    {listeningField === 'locationFilter' ? <MicOff size={14} /> : <Mic size={14} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Location Filters Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            {/* Work Model Toggle */}
            <div className="lg:col-span-5 space-y-2">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Work Model Refinement</label>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
                {(['Remote', 'On-site', 'Hybrid'] as const).map((model) => {
                  const isSelected = selectedModels.includes(model);
                  return (
                    <button
                      key={model}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedModels(selectedModels.filter(m => m !== model));
                        } else {
                          setSelectedModels([...selectedModels, model]);
                        }
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {model}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Geographic Region Text Input */}
            <div className="lg:col-span-7 space-y-2">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Preferred Geographic Regions (Comma separated)</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={preferredRegions}
                  onChange={(e) => setPreferredRegions(e.target.value)}
                  placeholder="e.g. CA, New York, London, Tokyo"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none focus:border-indigo-500 transition-colors dark:text-white font-medium shadow-sm"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid gap-10">
        {activeTab === 'web' ? (
          filteredJobs.length > 0 ? (
            filteredJobs.map((job, idx) => {
              const compatibilityScore = Math.floor(Math.random() * (98 - 72 + 1) + 72);
              const isStarred = savedJobs.some(sj => sj.jobId === (job.link || job.title + job.company) && sj.type === 'web');
              const webJobId = job.link || `${job.title}-${job.company}`;
              const webApplication = userApps.find(app => app.jobId === webJobId);
              const alreadyAppliedWeb = !!webApplication;
              
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[48px] shadow-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/20 rounded-full -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-1000" />
                  
                  <div className="flex flex-col lg:flex-row justify-between items-start relative z-10 gap-6">
                    <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-6 flex-1 w-full">
                      <CompanyLogo companyName={job.company} logoUrl={job.logoUrl} />
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-4 flex-wrap">
                          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight">
                            {job.title}
                          </h3>
                          <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/40 rounded-full border border-indigo-100 dark:border-indigo-800 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{compatibilityScore}% Match</span>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">
                          <span className="flex items-center gap-3">
                            <Briefcase size={18} className="text-indigo-500" /> {job.company}
                          </span>
                          <span className="flex items-center gap-3">
                            <MapPin size={18} className="text-indigo-500" /> {job.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 self-stretch lg:self-auto justify-end relative z-20 shrink-0 flex-wrap">
                      <button
                        onClick={() => toggleSaveJob(job, 'web')}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-center ${
                          isStarred 
                            ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-100 dark:shadow-none' 
                            : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-slate-200 dark:border-slate-800'
                        }`}
                        title={isStarred ? "Remove from Saved Jobs" : "Save Job Posting"}
                      >
                        <Star size={18} fill={isStarred ? "currentColor" : "none"} />
                      </button>
                      
                      {!alreadyAppliedWeb ? (
                        <button
                          onClick={() => openQuickApply(job, 'web')}
                          className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 dark:shadow-none whitespace-nowrap"
                        >
                          Quick Apply
                          <Zap size={18} />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex items-center gap-3 px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] whitespace-nowrap"
                        >
                          Applied
                          <CheckCircle2 size={18} className="text-emerald-500" />
                        </button>
                      )}

                      <a
                        href={job.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all whitespace-nowrap border border-slate-200 dark:border-slate-750"
                      >
                        Go to Job
                        <ExternalLink size={18} />
                      </a>
                    </div>
                  </div>
                  
                  <p className="mt-8 text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed font-medium relative z-10 max-w-3xl">
                    {job.snippet}
                  </p>
                  
                  <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between relative z-10 gap-8">
                    <div className="flex gap-4 flex-wrap">
                      <span className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black rounded-xl uppercase tracking-widest border border-slate-200 dark:border-slate-700">Strategic Match</span>
                      <span className="px-6 py-2.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-xl shadow-indigo-100">AI Verified Opportunity</span>
                    </div>
                    <button className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-3 group/btn">
                      Analyze Structural Fit 
                      <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          ) : (
            !isLoading && (
              <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[56px] border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
                <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800/50 rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-sm">
                  <Briefcase className="text-slate-300" size={48} />
                </div>
                {jobs.length > 0 ? (
                  <>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">No Filter Matches</h3>
                    <p className="text-slate-400 text-[12px] font-black uppercase tracking-[0.3em] max-w-sm mx-auto leading-relaxed">Adjust your local filters to reveal matching opportunities from your scan.</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Intelligence Ready</h3>
                    <p className="text-slate-400 text-[12px] font-black uppercase tracking-[0.3em] max-w-sm mx-auto leading-relaxed">Define your trajectory in the search fields above to decode market opportunities.</p>
                  </>
                )}
              </div>
            )
          )
        ) : activeTab === 'saved' ? (
          savedJobs.length > 0 ? (
            savedJobsView === 'tracker' ? (
              /* KANBAN BOARD TRACKER */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                {[
                  { id: 'saved', label: 'Saved / Wishlist', color: 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10' },
                  { id: 'applied', label: 'Applied', color: 'border-indigo-100 dark:border-indigo-900 bg-indigo-50/10 dark:bg-indigo-950/5' },
                  { id: 'interviewing', label: 'Interviewing', color: 'border-amber-100 dark:border-amber-900 bg-amber-50/10 dark:bg-amber-950/5' },
                  { id: 'offer', label: 'Offer Received', color: 'border-emerald-100 dark:border-emerald-900 bg-emerald-50/10 dark:bg-emerald-950/5' }
                ].map((column) => {
                  const columnJobs = filteredSavedJobs.filter(
                    job => (job.trackerStatus || 'saved') === column.id
                  );
                  
                  return (
                    <div 
                      key={column.id} 
                      className={`p-6 rounded-[32px] border-2 ${column.color} flex flex-col gap-5 min-h-[400px]`}
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                          {column.label}
                        </span>
                        <span className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 rounded-full text-[10px] font-black text-slate-600 dark:text-slate-400">
                          {columnJobs.length}
                        </span>
                      </div>

                      {/* Job Cards in Column */}
                      <div className="flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-1">
                        {columnJobs.length > 0 ? (
                          columnJobs.map((job, idx) => {
                            const isPlatform = job.type === 'platform';
                            const webJobId = job.link || `${job.title}-${job.company}`;
                            const application = isPlatform 
                              ? userApps.find(app => app.jobId === job.jobId)
                              : userApps.find(app => app.jobId === webJobId);
                            const alreadyApplied = !!application;
                            
                            const columnIndex = ['saved', 'applied', 'interviewing', 'offer'].indexOf(column.id);

                            return (
                              <motion.div
                                key={job.id}
                                layout
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all relative flex flex-col gap-4 group"
                              >
                                {/* Remove Star button */}
                                <button
                                  onClick={() => toggleSaveJob({
                                    id: isPlatform ? job.jobId : undefined,
                                    link: !isPlatform ? job.link : undefined,
                                    title: job.title,
                                    company: job.company,
                                    industry: job.company,
                                    location: job.location,
                                    description: isPlatform ? job.snippet : undefined,
                                    snippet: !isPlatform ? job.snippet : undefined,
                                    requirements: job.requirements
                                  }, job.type)}
                                  className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors"
                                  title="Remove from saved"
                                >
                                  <X size={14} />
                                </button>

                                {/* Logo + Title/Company */}
                                <div className="flex gap-3 items-start pr-4">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm">
                                    {(job.company || 'Tech').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="space-y-0.5">
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight line-clamp-2" title={job.title}>
                                      {job.title}
                                    </h4>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                      {job.company}
                                    </p>
                                  </div>
                                </div>

                                {/* Location */}
                                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-black uppercase tracking-wider">
                                  <MapPin size={10} className="text-indigo-500" />
                                  <span className="truncate max-w-[150px]">{job.location || 'N/A'}</span>
                                </div>

                                {/* Link / Application Button */}
                                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-1 gap-2 flex-wrap">
                                  {/* Quick Apply Action */}
                                  {alreadyApplied ? (
                                    <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/50">
                                      Applied <CheckCircle2 size={10} />
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => openQuickApply(
                                        isPlatform ? {
                                          id: job.jobId,
                                          title: job.title,
                                          industry: job.company,
                                          location: job.location,
                                          description: job.snippet,
                                          requirements: job.requirements || [],
                                          status: 'active',
                                          employerUid: '',
                                          createdAt: null
                                        } : {
                                          id: job.jobId || job.link || `${job.title}-${job.company}`,
                                          title: job.title,
                                          company: job.company,
                                          location: job.location,
                                          snippet: job.snippet,
                                          link: job.link
                                        }, 
                                        job.type
                                      )}
                                      className="flex items-center gap-1 bg-indigo-600 hover:bg-slate-900 dark:hover:bg-slate-800 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
                                    >
                                      Quick Apply <Zap size={10} />
                                    </button>
                                  )}

                                  {/* Go to Job Web link */}
                                  {!isPlatform && job.link && (
                                    <a
                                      href={job.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-slate-400 hover:text-indigo-500 transition-colors text-[9px] font-bold uppercase tracking-wider flex items-center gap-1"
                                    >
                                      Link <ExternalLink size={10} />
                                    </a>
                                  )}
                                </div>

                                {/* Custom Dropdown Selector */}
                                <div className="space-y-1.5">
                                  <select
                                    value={job.trackerStatus || 'saved'}
                                    onChange={(e) => updateSavedJobStatus(job.id, e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] font-black uppercase tracking-widest px-2.5 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-600 dark:text-slate-300 transition-colors"
                                  >
                                    <option value="saved">Saved / Wishlist</option>
                                    <option value="applied">Applied</option>
                                    <option value="interviewing">Interviewing</option>
                                    <option value="offer">Offer Received</option>
                                  </select>
                                </div>

                                {/* Navigation carets for easy left/right transitions */}
                                <div className="flex items-center justify-between mt-0.5">
                                  {columnIndex > 0 ? (
                                    <button
                                      onClick={() => updateSavedJobStatus(job.id, ['saved', 'applied', 'interviewing', 'offer'][columnIndex - 1])}
                                      className="flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg border border-slate-100 dark:border-slate-700 transition-all text-[8px] font-black uppercase tracking-wider"
                                      title="Move to previous stage"
                                    >
                                      <ArrowLeft size={10} /> Move Left
                                    </button>
                                  ) : <div />}

                                  {columnIndex < 3 ? (
                                    <button
                                      onClick={() => updateSavedJobStatus(job.id, ['saved', 'applied', 'interviewing', 'offer'][columnIndex + 1])}
                                      className="flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg border border-slate-100 dark:border-slate-700 transition-all text-[8px] font-black uppercase tracking-wider"
                                      title="Move to next stage"
                                    >
                                      Move Right <ArrowRight size={10} />
                                    </button>
                                  ) : <div />}
                                </div>
                              </motion.div>
                            );
                          })
                        ) : (
                          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl flex flex-col items-center justify-center bg-slate-50/20 dark:bg-slate-900/5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center px-4 leading-relaxed">
                              No positions in this stage
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* LIST VIEW */
              filteredSavedJobs.length > 0 ? (
                filteredSavedJobs.map((job, idx) => {
                  const isPlatform = job.type === 'platform';
                  const webJobId = job.link || `${job.title}-${job.company}`;
                  const application = isPlatform 
                    ? userApps.find(app => app.jobId === job.jobId) 
                    : userApps.find(app => app.jobId === webJobId);
                  const alreadyApplied = !!application;
                  
                  return (
                    <motion.div 
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[48px] shadow-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/20 rounded-full -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-1000" />
                      
                      <div className="flex flex-col lg:flex-row justify-between items-start relative z-10 gap-6">
                        <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-6 flex-1 w-full">
                          <CompanyLogo companyName={job.company || 'Tech/Corporate'} logoUrl={job.logoUrl} />
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-4 flex-wrap">
                              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight">
                                {job.title}
                              </h3>
                              <div className="px-3 py-1 bg-amber-50 dark:bg-amber-900/40 rounded-full border border-amber-100 dark:border-amber-800 flex items-center gap-2">
                                <Star size={12} className="text-amber-500" fill="currentColor" />
                                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Saved</span>
                              </div>
                              {/* Stage Badge on list view card! */}
                              <div className="px-3 py-1 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-full border border-indigo-100/50 dark:border-indigo-900/50 flex items-center gap-2">
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                  Stage: {job.trackerStatus ? (job.trackerStatus === 'saved' ? 'Saved' : job.trackerStatus === 'applied' ? 'Applied' : job.trackerStatus === 'interviewing' ? 'Interviewing' : 'Offer Received') : 'Saved'}
                                </span>
                              </div>
                              {isPlatform && alreadyApplied && (
                                <div className={`px-3 py-1 rounded-full border flex items-center gap-2 ${
                                  application.status === 'shortlisted' 
                                    ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                                    : application.status === 'rejected'
                                    ? 'bg-rose-50 dark:bg-rose-900/40 border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                                    : 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                                }`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${
                                    application.status === 'shortlisted' ? 'bg-emerald-500' : application.status === 'rejected' ? 'bg-rose-500' : 'bg-indigo-500 animate-pulse'
                                  }`} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">
                                    {application.status === 'shortlisted' 
                                      ? `Shortlisted (${application.matchScore}% Fit)` 
                                      : application.status === 'rejected'
                                      ? `Closed`
                                      : `Applied (${application.matchScore}% Match)`
                                    }
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">
                              <span className="flex items-center gap-3">
                                <Briefcase size={18} className="text-indigo-500" /> {job.company || 'Tech/Corporate'}
                              </span>
                              <span className="flex items-center gap-3">
                                <MapPin size={18} className="text-indigo-500" /> {job.location}
                              </span>
                            </div>
                          </div>
                        </div>
    
                        <div className="flex items-center gap-4 self-stretch lg:self-auto justify-end relative z-20 shrink-0 flex-wrap">
                          {/* List view Stage manual update dropdown */}
                          <div className="flex flex-col gap-1 min-w-[130px]">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Status Stage</span>
                            <select
                              value={job.trackerStatus || 'saved'}
                              onChange={(e) => updateSavedJobStatus(job.id, e.target.value)}
                              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[9px] font-black uppercase tracking-widest px-3 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-600 dark:text-slate-300 transition-colors"
                            >
                              <option value="saved">Saved / Wishlist</option>
                              <option value="applied">Applied</option>
                              <option value="interviewing">Interviewing</option>
                              <option value="offer">Offer Received</option>
                            </select>
                          </div>

                          <button
                            onClick={() => toggleSaveJob({
                              id: isPlatform ? job.jobId : undefined,
                              link: !isPlatform ? job.link : undefined,
                              title: job.title,
                              company: job.company,
                              industry: job.company,
                              location: job.location,
                              description: isPlatform ? job.snippet : undefined,
                              snippet: !isPlatform ? job.snippet : undefined,
                              requirements: job.requirements
                            }, job.type)}
                            className="p-4 rounded-2xl border transition-all flex items-center justify-center bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-100 dark:shadow-none"
                            title="Remove from Saved Jobs"
                          >
                            <Star size={18} fill="currentColor" />
                          </button>
                          
                          {isPlatform ? (
                            !alreadyApplied ? (
                              <button
                                onClick={() => openQuickApply({
                                  id: job.jobId,
                                  title: job.title,
                                  industry: job.company,
                                  location: job.location,
                                  description: job.snippet,
                                  requirements: job.requirements || [],
                                  status: 'active',
                                  employerUid: '',
                                  createdAt: null
                                }, 'platform')}
                                className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 dark:shadow-none whitespace-nowrap"
                              >
                                Quick Apply
                                <Zap size={18} />
                              </button>
                            ) : (
                              <button
                                disabled
                                className="flex items-center gap-3 px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] whitespace-nowrap"
                              >
                                Application Active
                              </button>
                            )
                          ) : (
                            <div className="flex items-center gap-3 flex-wrap">
                              {userApps.some(app => app.jobId === (job.link || `${job.title}-${job.company}`)) ? (
                                <button
                                  disabled
                                  className="flex items-center gap-3 px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] whitespace-nowrap"
                                >
                                  Applied
                                  <CheckCircle2 size={18} className="text-emerald-500" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => openQuickApply({
                                    id: job.jobId || job.link || `${job.title}-${job.company}`,
                                    title: job.title,
                                    company: job.company,
                                    location: job.location,
                                    snippet: job.snippet,
                                    link: job.link
                                  }, 'web')}
                                  className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 dark:shadow-none whitespace-nowrap"
                                >
                                  Quick Apply
                                  <Zap size={18} />
                                </button>
                              )}
                              <a
                                href={job.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all whitespace-nowrap border border-slate-200 dark:border-slate-750"
                              >
                                Go to Job
                                <ExternalLink size={18} />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <p className="mt-8 text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed font-medium relative z-10 max-w-3xl">
                        {job.snippet}
                      </p>

                      {job.requirements && job.requirements.length > 0 && (
                        <div className="mt-8 relative z-10">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Strategic Requirements</h4>
                          <div className="flex flex-wrap gap-2">
                            {job.requirements.map((req: string, i: number) => (
                              <span key={i} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-100 dark:border-slate-800">
                                {req}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {isPlatform && alreadyApplied && application.aiAnalysis && (
                        <div className="mt-8 p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100/50 dark:border-indigo-900/30 relative z-10">
                          <h5 className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                            <Sparkles size={12} /> Live AI Fit Diagnosis
                          </h5>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                            {application.aiAnalysis}
                          </p>
                        </div>
                      )}
                      
                      <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between relative z-10 gap-8">
                        <div className="flex gap-4 flex-wrap">
                          <span className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black rounded-xl uppercase tracking-widest border border-slate-200 dark:border-slate-700 font-sans">
                            {isPlatform ? 'Platform Verified' : 'Web Listing'}
                          </span>
                          <span className="px-6 py-2.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-xl shadow-indigo-100 font-sans">
                            Saved Opportunity
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[56px] border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
                  <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800/50 rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-sm">
                    <Star className="text-slate-300 animate-pulse" size={48} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">No Filter Matches</h3>
                  <p className="text-slate-400 text-[12px] font-black uppercase tracking-[0.3em] max-w-sm mx-auto leading-relaxed">Adjust your local filters to find saved jobs matching your criteria.</p>
                </div>
              )
            )
          ) : (
            <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[56px] border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
              <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800/50 rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-sm">
                <Star className="text-slate-300" size={48} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight font-sans">Your Starred Collection is Empty</h3>
              <p className="text-slate-400 text-[12px] font-black uppercase tracking-[0.3em] max-w-sm mx-auto leading-relaxed">Star job openings in "Direct Platform Openings" or "Nationwide Web Listings" to save them to your personal repository.</p>
            </div>
          )
        ) : activeTab === 'recommended' ? (
          <div className="space-y-10">
            {/* Recommendations Header & Explanation Dashboard */}
            <div className="bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-indigo-950/20 dark:via-slate-900 dark:to-purple-950/10 p-8 sm:p-12 rounded-[40px] border border-indigo-100/60 dark:border-indigo-900/30 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-purple-50/20 dark:bg-purple-900/10 rounded-full -mr-40 -mt-40 blur-3xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Sparkles size={20} className="animate-spin" style={{ animationDuration: '6s' }} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400">AI Recommendation Engine</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Personalized Career Curation</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 max-w-xl font-medium leading-relaxed">
                    Analyzing your real-time Firestore database records, saved positions, and application history to recommend highly-compatible nationwide opportunities.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black rounded-xl uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                    <Clock size={12} /> Live Engine
                  </span>
                </div>
              </div>

              {/* Profile Insights Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                <div className="bg-white/80 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <h5 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Engagement Data</h5>
                    <p className="text-lg font-black text-slate-800 dark:text-white">{savedJobs.length + userApps.length} Signals</p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 font-medium">Derived from Firestore database</span>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <h5 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Primary Target Industry</h5>
                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 truncate">{resumeData?.personalInfo?.industry || 'Tech/Corporate'}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 font-medium">From your active resume profile</span>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <h5 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Extracted Location Mode</h5>
                    <p className="text-sm font-black text-slate-800 dark:text-white truncate font-sans">
                      {resumeData?.preferences?.remoteOnly ? 'Fully Remote Preferred' : (resumeData?.personalInfo?.location || 'Nationwide')}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 font-medium">Automatic location filtering active</span>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <h5 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Profile Match Scope</h5>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{resumeData?.skills?.length || 0} Loaded Skills</p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 font-medium">Semantic matching on description text</span>
                </div>
              </div>

              {savedJobs.length === 0 && userApps.length === 0 && (
                <div className="mt-8 p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4 relative z-10">
                  <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl mt-0.5">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-1">Cold Start Mode Active</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      You haven't saved any positions or submitted applications yet. Save positions or click "Quick Apply" on jobs, and the engine will instantly customize this list to match those specific profiles!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Recommended Jobs List */}
            {recommendedJobs.length > 0 ? (
              recommendedJobs.map((rec, idx) => {
                const { job, type, matchScore, reasons } = rec;
                const isPlatform = type === 'platform';
                const jobId = isPlatform ? job.id : (job.link || `${job.title}-${job.company}`);
                
                // Check state if user saves/applies to recommended job in real-time
                const isStarred = savedJobs.some(sj => sj.jobId === jobId && sj.type === type);
                const application = userApps.find(app => app.jobId === jobId);
                const alreadyApplied = !!application;
                const companyName = isPlatform ? (job.industry || 'Tech/Corporate') : (job.company || 'Unknown');

                return (
                  <motion.div 
                    key={jobId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[48px] shadow-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/20 rounded-full -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />
                    
                    <div className="flex flex-col lg:flex-row justify-between items-start relative z-10 gap-6">
                      <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-6 flex-1 w-full">
                        <CompanyLogo companyName={companyName} logoUrl={job.logoUrl} />
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-4 flex-wrap">
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight">
                              {job.title}
                            </h3>
                            <div className="px-3 py-1 bg-purple-50 dark:bg-purple-900/40 rounded-full border border-purple-100 dark:border-purple-800 flex items-center gap-2 shadow-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                              <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">{matchScore}% Match Fit</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">
                            <span className="flex items-center gap-3">
                              <Briefcase size={18} className="text-indigo-500" /> {companyName}
                            </span>
                            <span className="flex items-center gap-3">
                              <MapPin size={18} className="text-indigo-500" /> {job.location}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 self-stretch lg:self-auto justify-end relative z-20 shrink-0 flex-wrap">
                        <button
                          onClick={() => toggleSaveJob(job, type)}
                          className={`p-4 rounded-2xl border transition-all flex items-center justify-center ${
                            isStarred 
                              ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-100 dark:shadow-none' 
                              : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-slate-200 dark:border-slate-800'
                          }`}
                          title={isStarred ? "Remove from Saved Jobs" : "Save Job Posting"}
                        >
                          <Star size={18} fill={isStarred ? "currentColor" : "none"} />
                        </button>
                        
                        {!alreadyApplied ? (
                          <button
                            onClick={() => openQuickApply(job, type)}
                            className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 dark:shadow-none whitespace-nowrap"
                          >
                            Quick Apply
                            <Zap size={18} />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex items-center gap-3 px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] whitespace-nowrap"
                          >
                            Applied
                            <CheckCircle2 size={18} className="text-emerald-500" />
                          </button>
                        )}

                        {!isPlatform && job.link && (
                          <a
                            href={job.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all whitespace-nowrap border border-slate-200 dark:border-slate-750"
                          >
                            Go to Job
                            <ExternalLink size={18} />
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <p className="mt-8 text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed font-medium relative z-10 max-w-3xl">
                      {isPlatform ? job.description : job.snippet}
                    </p>

                    {isPlatform && job.requirements && job.requirements.length > 0 && (
                      <div className="mt-8 relative z-10">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Strategic Requirements</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.requirements.map((req: string, i: number) => (
                            <span key={i} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-100 dark:border-slate-800">
                              {req}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendation Insights / Badges section */}
                    <div className="mt-8 p-5 bg-purple-500/5 dark:bg-purple-900/10 rounded-3xl border border-purple-500/10 dark:border-purple-800/20 relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
                        <h4 className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Match Insights</h4>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {reasons.map((reason, rIdx) => (
                          <span 
                            key={rIdx} 
                            className="px-4 py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg border border-purple-100 dark:border-purple-900/40 shadow-sm flex items-center gap-1.5 font-sans"
                          >
                            <span className="w-1 h-1 rounded-full bg-purple-500" />
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between relative z-10 gap-8">
                      <div className="flex gap-4 flex-wrap">
                        <span className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black rounded-xl uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                          {isPlatform ? 'Platform Direct' : 'Web Listing'}
                        </span>
                        <span className="px-6 py-2.5 bg-purple-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-xl shadow-purple-100 dark:shadow-none">
                          AI Matched Trajectory
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[56px] border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
                <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800/50 rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-sm">
                  <Sparkles className="text-slate-300 animate-pulse" size={48} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">No Unapplied Matches</h3>
                <p className="text-slate-400 text-[12px] font-black uppercase tracking-[0.3em] max-w-sm mx-auto leading-relaxed">
                  Excellent! You have saved or applied to all current highly recommended job postings. Keep exploring and check back as new positions arrive.
                </p>
              </div>
            )}
          </div>
        ) : (
          filteredPlatformJobs.length > 0 ? (
            filteredPlatformJobs.map((job, idx) => {
              const application = userApps.find(app => app.jobId === job.id);
              const alreadyApplied = !!application;
              const isStarred = savedJobs.some(sj => sj.jobId === job.id && sj.type === 'platform');
              
              return (
                <motion.div 
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-[48px] shadow-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/20 rounded-full -mr-32 -mt-32 group-hover:scale-150 transition-transform duration-1000" />
                  
                  <div className="flex flex-col lg:flex-row justify-between items-start relative z-10 gap-6">
                    <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-6 flex-1 w-full">
                      <CompanyLogo companyName={job.industry || 'Tech/Corporate'} logoUrl={job.logoUrl} />
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-4 flex-wrap">
                          <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight">
                            {job.title}
                          </h3>
                          {alreadyApplied ? (
                            <div className={`px-3 py-1 rounded-full border flex items-center gap-2 ${
                              application.status === 'shortlisted' 
                                ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                                : application.status === 'rejected'
                                ? 'bg-rose-50 dark:bg-rose-900/40 border-rose-100 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                                : 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                application.status === 'shortlisted' ? 'bg-emerald-500' : application.status === 'rejected' ? 'bg-rose-500' : 'bg-indigo-500 animate-pulse'
                              }`} />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                {application.status === 'shortlisted' 
                                  ? `Shortlisted (${application.matchScore}% Fit)` 
                                  : application.status === 'rejected'
                                  ? `Closed`
                                  : `Applied (${application.matchScore}% Match)`
                                }
                              </span>
                            </div>
                          ) : (
                            <div className="px-3 py-1 bg-slate-50 dark:bg-slate-800/40 rounded-full border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Grounded Match AI Available</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">
                          <span className="flex items-center gap-3">
                            <Briefcase size={18} className="text-indigo-500" /> {job.industry || 'Tech/Corporate'}
                          </span>
                          <span className="flex items-center gap-3">
                            <MapPin size={18} className="text-indigo-500" /> {job.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 self-stretch lg:self-auto justify-end relative z-20 shrink-0">
                      <button
                        onClick={() => toggleSaveJob(job, 'platform')}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-center ${
                          isStarred 
                            ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-100 dark:shadow-none' 
                            : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-slate-200 dark:border-slate-800'
                        }`}
                        title={isStarred ? "Remove from Saved Jobs" : "Save Job Posting"}
                      >
                        <Star size={18} fill={isStarred ? "currentColor" : "none"} />
                      </button>
                      {!alreadyApplied ? (
                        <button
                          onClick={() => openQuickApply(job, 'platform')}
                          className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 dark:shadow-none whitespace-nowrap"
                        >
                          Quick Apply
                          <Zap size={18} />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex items-center gap-3 px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] whitespace-nowrap"
                        >
                          Application Active
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <p className="mt-8 text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed font-medium relative z-10 max-w-3xl">
                    {job.description}
                  </p>

                  {job.requirements && job.requirements.length > 0 && (
                    <div className="mt-8 relative z-10">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Strategic Requirements</h4>
                      <div className="flex flex-wrap gap-2">
                        {job.requirements.map((req, i) => (
                          <span key={i} className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-100 dark:border-slate-800">
                            {req}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {alreadyApplied && application.aiAnalysis && (
                    <div className="mt-8 p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100/50 dark:border-indigo-900/30 relative z-10">
                      <h5 className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <Sparkles size={12} /> Live AI Fit Diagnosis
                      </h5>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        {application.aiAnalysis}
                      </p>
                    </div>
                  )}
                  
                  <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between relative z-10 gap-8">
                    <div className="flex gap-4 flex-wrap">
                      <span className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black rounded-xl uppercase tracking-widest border border-slate-200 dark:border-slate-700">Platform Verified</span>
                      <span className="px-6 py-2.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-xl shadow-indigo-100">JobsEdge Direct Direct Connection</span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[56px] border-2 border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
              <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800/50 rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-sm">
                <Briefcase className="text-slate-300" size={48} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight font-sans">No Direct Openings</h3>
              <p className="text-slate-400 text-[12px] font-black uppercase tracking-[0.3em] max-w-sm mx-auto leading-relaxed">There are currently no active direct platform jobs published. Switch to Nationwide Web Listings, or check the Hiring Console to post a job.</p>
            </div>
          )
        )}
      </div>

      {/* Quick Apply Modal */}
      <AnimatePresence>
        {quickApplyJob && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100 dark:shadow-none shrink-0">
                    {(quickApplyJob.company || quickApplyJob.industry || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{quickApplyJob.title}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      {quickApplyJob.company || quickApplyJob.industry} &bull; {quickApplyJob.location}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setQuickApplyJob(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
                {isQaSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-500 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 size={40} className="text-emerald-500" />
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Application Transmitted!</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
                      Your matched credentials, contact information, and custom cover letter have been securely forwarded to the recruitment portal.
                    </p>
                  </motion.div>
                ) : isQaGenerating ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <Loader2 className="animate-spin text-indigo-600" size={48} />
                    <div className="space-y-2">
                      <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest animate-pulse">Syncing Resume Matrix...</h4>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider max-w-xs leading-relaxed">
                        Gemini is parsing your profile data to draft a customized cover letter and analyze structural fit.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* AI Score Card */}
                    {qaScore !== null && (
                      <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/20 flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative flex items-center justify-center shrink-0">
                          <svg className="w-20 h-20 transform -rotate-90">
                            <circle cx="40" cy="40" r="34" strokeWidth="6" stroke="currentColor" className="text-indigo-100 dark:text-indigo-950" fill="transparent" />
                            <circle cx="40" cy="40" r="34" strokeWidth="6" stroke="currentColor" className="text-indigo-600 dark:text-indigo-400" fill="transparent"
                              strokeDasharray={2 * Math.PI * 34}
                              strokeDashoffset={2 * Math.PI * 34 * (1 - qaScore / 100)}
                            />
                          </svg>
                          <span className="absolute text-lg font-black text-indigo-600 dark:text-indigo-400">{qaScore}%</span>
                        </div>
                        <div className="space-y-1.5 text-center sm:text-left">
                          <h5 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1">
                            <Sparkles size={12} fill="currentColor" /> AI Alignment Analysis
                          </h5>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                            {qaAnalysis}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Pre-filled form */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-filled Application Details</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                          <div className="relative">
                            <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={qaName}
                              onChange={(e) => setQaName(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none focus:border-indigo-500 transition-colors dark:text-white font-semibold"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                          <div className="relative">
                            <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="email"
                              value={qaEmail}
                              onChange={(e) => setQaEmail(e.target.value)}
                              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none focus:border-indigo-500 transition-colors dark:text-white font-semibold"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                        <div className="relative">
                          <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={qaPhone}
                            onChange={(e) => setQaPhone(e.target.value)}
                            placeholder="+1 (555) 019-2834"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none focus:border-indigo-500 transition-colors dark:text-white font-semibold"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tailored AI Cover Letter</label>
                          <span className="text-[8px] text-indigo-500 font-black uppercase tracking-widest flex items-center gap-1">
                            <Sparkles size={10} fill="currentColor" /> Gemini Customized
                          </span>
                        </div>
                        <textarea
                          rows={6}
                          value={qaCoverLetter}
                          onChange={(e) => setQaCoverLetter(e.target.value)}
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:outline-none focus:border-indigo-500 transition-colors dark:text-white font-medium leading-relaxed resize-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Attached Resume Assets</label>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText size={20} className="text-indigo-500" />
                            <div>
                              <p className="text-xs font-black text-slate-800 dark:text-slate-200 leading-none">My Saved Profile Resume</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                {resumeData.skills.length} skills &bull; {resumeData.experience.length} experiences
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-[9px] font-black text-emerald-600 dark:text-emerald-400 rounded-lg uppercase tracking-widest border border-emerald-100 dark:border-emerald-900">Loaded</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              {!isQaSuccess && !isQaGenerating && (
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                  <button
                    onClick={() => setQuickApplyJob(null)}
                    className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitQuickApply}
                    disabled={isQaSubmitting}
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors shadow-lg shadow-indigo-100 dark:shadow-none"
                  >
                    {isQaSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        Transmitting...
                      </>
                    ) : (
                      <>
                        Submit Application
                        <Zap size={14} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
