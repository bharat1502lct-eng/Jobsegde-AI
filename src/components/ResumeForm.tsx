import React, { useState } from 'react';
import { ResumeData, Experience, Education, Project } from '../types';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  ChevronDown, 
  X, 
  FileText, 
  Briefcase, 
  GraduationCap, 
  Code, 
  Award, 
  Globe,
  Linkedin,
  Github,
  ExternalLink
} from 'lucide-react';
import { ai, safeJsonParse, handleFirestoreError } from '../lib/ai';
import { motion, AnimatePresence } from 'motion/react';

interface ResumeFormProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
}

interface ValidationErrors {
  [key: string]: string;
}

export const ResumeForm: React.FC<ResumeFormProps> = ({ data, onChange }) => {
  const [activeSection, setActiveSection] = useState<string>('personal');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    // Basic Indian phone validation: +91 followed by 10 digits or just 10 digits
    return /^(?:\+91[\-\s]?)?[0-9]{10}$/.test(phone.replace(/\s/g, ''));
  };

  const validateURL = (url: string) => {
    if (!url) return true;
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const setFieldError = (fieldId: string, error: string) => {
    setErrors(prev => ({ ...prev, [fieldId]: error }));
  };

  const updatePersonalInfo = (field: keyof ResumeData['personalInfo'], value: string) => {
    // Clear error on change
    if (errors[`personal-${field}`]) {
      setFieldError(`personal-${field}`, '');
    }

    if (!value && (field === 'fullName' || field === 'location' || field === 'email')) {
      setFieldError(`personal-${field}`, `${field === 'fullName' ? 'Full name' : field === 'location' ? 'Location' : 'Email'} is required`);
    } else if (field === 'email' && value && !validateEmail(value)) {
      setFieldError(`personal-email`, 'Please enter a valid professional email');
    } else if (field === 'phone' && value && !validatePhone(value)) {
      setFieldError(`personal-phone`, 'Please enter a valid 10-digit phone number');
    }

    onChange({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value },
    });
  };

  const updateExperience = (id: string, field: keyof Experience, value: any) => {
    if (errors[`exp-${id}-${field}`]) {
      setFieldError(`exp-${id}-${field}`, '');
    }

    if (!value && (field === 'company' || field === 'position')) {
      setFieldError(`exp-${id}-${field}`, `${field === 'company' ? 'Organization' : 'Role'} is required`);
    }

    let updatedExperience = data.experience.map((exp) => {
      if (exp.id === id) {
        const newExp = { ...exp, [field]: value };
        // If current is toggled on, set endDate to 'Present'
        if (field === 'current' && value === true) {
          newExp.endDate = 'Present';
        }
        return newExp;
      }
      return exp;
    });

    onChange({
      ...data,
      experience: updatedExperience,
    });
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    if (errors[`edu-${id}-${field}`]) {
      setFieldError(`edu-${id}-${field}`, '');
    }

    if (!value && (field === 'school' || field === 'degree')) {
      setFieldError(`edu-${id}-${field}`, `${field === 'school' ? 'Institution' : 'Degree'} is required`);
    }

    onChange({
      ...data,
      education: data.education.map((edu) => (edu.id === id ? { ...edu, [field]: value } : edu)),
    });
  };

  const updateProject = (id: string, field: keyof Project, value: string) => {
    if (errors[`proj-${id}-${field}`]) {
      setFieldError(`proj-${id}-${field}`, '');
    }

    if (!value && field === 'name') {
      setFieldError(`proj-${id}-name`, 'Project name is required');
    } else if (field === 'link' && value && !validateURL(value)) {
      setFieldError(`proj-${id}-link`, 'Please enter a valid URL');
    }

    onChange({
      ...data,
      projects: data.projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    });
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: crypto.randomUUID(),
      company: '',
      position: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: [''],
    };
    onChange({ ...data, experience: [...data.experience, newExp] });
  };

  const removeExperience = (id: string) => {
    onChange({ ...data, experience: data.experience.filter((exp) => exp.id !== id) });
  };

  const addBullet = (expId: string) => {
    onChange({
      ...data,
      experience: data.experience.map((exp) =>
        exp.id === expId ? { ...exp, description: [...exp.description, ''] } : exp
      ),
    });
  };

  const updateBullet = (expId: string, idx: number, value: string) => {
    onChange({
      ...data,
      experience: data.experience.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              description: exp.description.map((b, i) => (i === idx ? value : b)),
            }
          : exp
      ),
    });
  };

  const removeBullet = (expId: string, idx: number) => {
    onChange({
      ...data,
      experience: data.experience.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              description: exp.description.filter((_, i) => i !== idx),
            }
          : exp
      ),
    });
  };

  const addEducation = () => {
    const newEdu: Education = {
      id: crypto.randomUUID(),
      school: '',
      degree: '',
      location: '',
      startDate: '',
      endDate: '',
      description: '',
    };
    onChange({ ...data, education: [...data.education, newEdu] });
  };

  const removeEducation = (id: string) => {
    onChange({ ...data, education: data.education.filter((edu) => edu.id !== id) });
  };

  const addProject = () => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: '',
      link: '',
      description: '',
    };
    onChange({ ...data, projects: [...data.projects, newProject] });
  };

  const removeProject = (id: string) => {
    onChange({ ...data, projects: data.projects.filter((p) => p.id !== id) });
  };

  const handleSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const skills = e.target.value.split(',').map((s) => s.trim());
    onChange({ ...data, skills });
  };

  const generateAISuggestion = async (type: string, id?: string, context?: string) => {
    setIsGenerating(id || type);
    try {
      let prompt = "";
      switch (type) {
        case 'summary':
          prompt = `As a Senior Executive Headhunter and Elite Resume Strategist, craft a high-impact executive summary for a ${data.template} profile.

          Candidate: ${data.personalInfo.fullName}
          Industry: ${data.personalInfo.industry || 'High-Growth Tech / Global Management'}
          Core Expertise: ${data.skills.join(', ')}
          Latest Role: ${data.experience[0]?.position || 'Experienced Professional'} at ${data.experience[0]?.company || 'Market Leader'}.

          CRITICAL DIRECTIVES:
          1. STRATEGIC LEADERSHIP: Highlight "Visionary Leadership", "Operational Excellence", and "Stakeholder Management".
          2. QUANTIFIABLE IMPACT: Every claim must imply scale. Use forceful action verbs (e.g., Orchestrated, Spearheaded, Catalyzed, Engineered).
          3. INDUSTRY LEXICON: Integrate deep-domain terminology specific to ${data.personalInfo.industry || 'the sector'}. 
          4. VALUE PROPOSITION: Clearly state the candidate's unique ability to drive ROI, efficiency, or innovation.
          5. ATS OPTIMIZATION: Seamlessly blend top-tier industry keywords while maintaining a sophisticated, executive tone.

          TONE: Decisive, authoritative, and achievement-oriented.
          FORMAT: 3-4 dense, strategic sentences in a narrative format.
          Constraint: Return ONLY the raw summary text. No quotes, no intro, no preamble.`;
          break;
        case 'experience_bullets':
          prompt = `As an Elite Resume Writer, transform the following role into a series of high-octane achievement bullets: ${context || 'Senior Professional'}.
          Industry: ${data.personalInfo.industry || 'relevant industry'}.
          
          STRATEGIC FORMULA: [Forceful Action Verb] + [Quantifiable Result/Metric] + [Strategic Method/Context].
          
          REQUIREMENTS:
          - Use numbers, percentages, and currencies (e.g., "$5M budget", "40% efficiency", "Team of 50").
          - Focus on leadership, cross-functional collaboration, and industry-wide impact.
          - Avoid generic tasks; emphasize strategic wins and problem-solving at scale.
          
          Return 3-4 distinct bullets, each on a new line, no symbols at the start.`;
          break;
        case 'education_description':
          prompt = `Write a professional, concise description for a ${context || 'Degree'} at ${data.education.find(e => e.id === id)?.school || 'University'} in the context of the ${data.personalInfo.industry || 'professional'} landscape. 
          Focus on: Academic honors (like CGPA, Rank), relevant high-level coursework, research initiatives, or leadership in student organizations relevant to a future in ${data.personalInfo.industry || 'industry'}. 
          Return 1-2 professional sentences.`;
          break;
        case 'skills_list':
          prompt = `As an elite technical talent strategist, analyze this profile and suggest 12-15 high-impact, industry-specific skills to elevate this resume.
          Target Industry: ${data.personalInfo.industry || 'Global Tech'}.
          Professional Trajectory: ${data.experience.map(e => `${e.position} at ${e.company}`).join(', ')}.
          Current Focus: ${data.skills.join(', ')}.

          Strategic Directive: Identify top-tier technical and leadership competencies that are currently trending in the ${data.personalInfo.industry || 'specified'} sector and align with the candidate's career trajectory. Include both "hard" technical tools and "soft" strategic leadership capacities.
          Return ONLY a comma-separated list, no preamble.`;
          break;
        case 'project_description':
          prompt = `As an elite technical narrative specialist, synthesize a high-impact description for the project: ${context || 'Strategic Initiative'}.
          Target Industry: ${data.personalInfo.industry || 'Global Tech'}.
          Relevant Core Skills: ${data.skills.join(', ')}.

          Strategic Directive: Craft a concise, 2-3 sentence narrative that highlights technical complexity, sophisticated problem-solving, and measurable business or technical outcomes within the ${data.personalInfo.industry || 'specified'} sector. Focus on how the listed skills were leveraged to deliver strategic value.
          Tone: Production-grade, technical, and achievement-oriented.
          Return ONLY the description text, no preamble or conversational filler.`;
          break;
        case 'certifications_list':
          prompt = `As a career strategist, suggest 5-7 high-value, industry-recognized certifications for a professional in the ${data.personalInfo.industry || 'current'} industry with this background:
          Current Roles: ${data.experience.map(e => e.position).join(', ')}.
          Expertise: ${data.skills.join(', ')}.
          Focus on: Certifications with high ROI in terms of the ${data.personalInfo.industry || 'Global'} market trends.
          Return ONLY a comma-separated list of certification names.`;
          break;
        case 'awards_list':
          prompt = `Suggest 5-7 professional or academic awards, honors, or recognition categories that would realistically elevate the profile of a professional in ${data.personalInfo.industry || 'their field'} with this background:
          Current Roles: ${data.experience.map(e => e.position).join(', ')}.
          Key Skills: ${data.skills.slice(0, 5).join(', ')}.
          Focus: Achievements that signal leadership, innovation, or excellence in the ${data.personalInfo.industry || 'relevant'} ecosystem.
          Return ONLY a comma-separated list of award/honor titles.`;
          break;
        case 'languages_list':
          prompt = `As a global talent strategist, suggest 3-5 professional languages that would provide a competitive edge for a professional in the ${data.personalInfo.industry || 'specified'} industry.
          Include English if appropriate, and suggest languages based on global market demand in ${data.personalInfo.industry || 'that sector'}.
          Format: Language (Proficiency Level), e.g., Mandarin (Professional), German (Conversational).
          Return ONLY a comma-separated list.`;
          break;
        default:
          return;
      }

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const response = result.text?.trim() || '';
      
      if (type === 'summary') {
        updatePersonalInfo('summary', response);
      } else if (type === 'experience_bullets' && id) {
        const bullets = response.split('\n').filter(b => b.trim()).map(b => b.replace(/^[•\-\*\d\.\s]+/, '').trim());
        onChange({
          ...data,
          experience: data.experience.map(exp => 
            exp.id === id ? { ...exp, description: [...exp.description.filter(d => d.trim()), ...bullets] } : exp
          )
        });
      } else if (type === 'education_description' && id) {
        updateEducation(id, 'description', response);
      } else if (type === 'skills_list') {
        const newSkills = response.split(',').map(s => s.trim()).filter(s => s);
        onChange({ ...data, skills: Array.from(new Set([...data.skills, ...newSkills])) });
      } else if (type === 'project_description' && id) {
        updateProject(id, 'description', response);
      } else if (type === 'certifications_list') {
        const items = response.split(',').map(s => s.trim()).filter(s => s);
        onChange({ ...data, certifications: Array.from(new Set([...data.certifications, ...items])) });
      } else if (type === 'awards_list') {
        const items = response.split(',').map(s => s.trim()).filter(s => s);
        onChange({ ...data, awards: Array.from(new Set([...data.awards, ...items])) });
      } else if (type === 'languages_list') {
        const items = response.split(',').map(s => s.trim()).filter(s => s);
        onChange({ ...data, languages: Array.from(new Set([...data.languages, ...items])) });
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
    } finally {
      setIsGenerating(null);
    }
  };

  const updateList = (field: 'certifications' | 'languages' | 'awards', value: string) => {
    const items = value.split(',').map((s) => s.trim()).filter(s => s);
    onChange({ ...data, [field]: items });
  };  const generateFullResumeAI = async () => {
    setIsGenerating('full_resume');
    try {
      const prompt = `As a world-class Executive JobsEdge AI Specialist, generate a comprehensive, high-impact resume content package.

      CANDIDATE: ${data.personalInfo.fullName}
      TARGET INDUSTRY: ${data.personalInfo.industry || 'Global Tech'}
      CORE SKILLS: ${data.skills.join(', ')}

      EXPERIENCE:
      ${data.experience.map(e => `- ${e.position} at ${e.company} (ID: ${e.id})`).join('\n')}

      EDUCATION:
      ${data.education.map(e => `- ${e.degree} from ${e.school} (ID: ${e.id})`).join('\n')}

      PROJECTS:
      ${data.projects.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')}

      INSTRUCTIONS:
      1. Summary: A 3-4 sentence powerhouse executive summary using deep industry lexicon.
      2. Experience: For EACH experience ID provided, generate 4 quantifiable achievement bullets using the [Action Verb] + [Result] + [Context] formula.
      3. Education: For EACH education ID provided, generate a 2-sentence description highlighting academic foundation.
      4. Projects: For EACH project ID provided, generate a 3-sentence technical narrative highlighting complexity and outcomes.
      5. Certifications: 5 industry-standard certifications.
      6. Awards: 3-5 realistic professional honors.
      7. Languages: 2-3 professional languages.

      RESPONSE FORMAT:
      Return ONLY a structured JSON object.
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

      const parsedData = safeJsonParse<{
        summary: string;
        experience: { id: string; bullets: string[] }[];
        education: { id: string; description: string }[];
        projects: { id: string; description: string }[];
        certifications: string[];
        awards: string[];
        languages: string[];
      }>(result.text, {
        summary: '',
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        awards: [],
        languages: []
      });

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

      onChange(newData);
    } catch (error) {
      console.error("Full AI Generation failed:", error);
    } finally {
      setIsGenerating(null);
    }
  };

  const SectionHeader = ({ id, title, icon: Icon }: { id: string; title: string; icon: any }) => (
    <button
      onClick={() => setActiveSection(activeSection === id ? '' : id)}
      className={`w-full flex items-center justify-between p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] transition-all duration-500 border ${
        activeSection === id 
          ? 'bg-white border-indigo-200 shadow-xl shadow-indigo-100/50 ring-1 ring-indigo-50' 
          : 'bg-white/50 border-slate-200 hover:bg-white hover:border-indigo-100 shadow-sm'
      } mb-3 sm:mb-4 group`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-500 ${
          activeSection === id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'
        }`}>
          <Icon size={18} className="sm:w-[20px]" />
        </div>
        <span className={`font-black uppercase tracking-widest text-[9px] sm:text-[11px] ${activeSection === id ? 'text-slate-900' : 'text-slate-500'}`}>{title}</span>
      </div>
      <div className={`transition-transform duration-500 ${activeSection === id ? 'rotate-180' : ''}`}>
        <ChevronDown size={18} className={activeSection === id ? 'text-indigo-500' : 'text-slate-300 sm:w-[20px]'} />
      </div>
    </button>
  );

  return (
    <div className="space-y-2 max-w-3xl mx-auto pb-24">
      {/* Universal JobsEdge AI Button */}
      <div className="mb-8 p-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-[24px] shadow-xl shadow-indigo-100 flex overflow-hidden">
        <button
          onClick={generateFullResumeAI}
          disabled={!!isGenerating}
          className="w-full bg-white hover:bg-slate-50 transition-all py-6 rounded-[22px] flex items-center justify-center gap-4 group disabled:opacity-80"
        >
          <div className={`p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform duration-500 ${isGenerating === 'full_resume' ? 'animate-spin' : ''}`}>
            <Sparkles size={24} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">JobsEdge AI Engine</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-none">Synthesize full resume content & narratives</p>
          </div>
          {isGenerating === 'full_resume' && (
            <div className="ml-4 flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
        </button>
      </div>

      {/* Personal Info */}
      <div className="overflow-hidden">
        <SectionHeader id="personal" title="Personal Identity" icon={FileText} />
        <AnimatePresence>
          {activeSection === 'personal' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 sm:p-10 bg-white rounded-[24px] sm:rounded-[32px] border border-indigo-50 shadow-2xl shadow-indigo-100/30 mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8"
            >
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Full Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={data.personalInfo.fullName}
                  onChange={(e) => updatePersonalInfo('fullName', e.target.value)}
                  className={`input-field ${errors['personal-fullName'] ? 'border-rose-500 ring-rose-500/20 ring-1' : ''}`}
                  placeholder="Arjun Sharma"
                />
                {errors['personal-fullName'] && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1 uppercase tracking-wider">{errors['personal-fullName']}</p>}
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Professional Email <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  value={data.personalInfo.email}
                  onChange={(e) => updatePersonalInfo('email', e.target.value)}
                  className={`input-field ${errors['personal-email'] ? 'border-rose-500 ring-rose-500/20 ring-1' : ''}`}
                  placeholder="arjun@career.in"
                />
                {errors['personal-email'] && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1 uppercase tracking-wider">{errors['personal-email']}</p>}
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Phone Number</label>
                <input
                  type="text"
                  value={data.personalInfo.phone}
                  onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                  className={`input-field ${errors['personal-phone'] ? 'border-rose-500 ring-rose-500/20 ring-1' : ''}`}
                  placeholder="+91 98765 43210"
                />
                {errors['personal-phone'] && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1 uppercase tracking-wider">{errors['personal-phone']}</p>}
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Location <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={data.personalInfo.location}
                  onChange={(e) => updatePersonalInfo('location', e.target.value)}
                  className={`input-field ${errors['personal-location'] ? 'border-rose-500 ring-rose-500/20 ring-1' : ''}`}
                  placeholder="Bangalore, Karnataka"
                />
                {errors['personal-location'] && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1 uppercase tracking-wider">{errors['personal-location']}</p>}
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Target Industry <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={data.personalInfo.industry}
                  onChange={(e) => updatePersonalInfo('industry', e.target.value)}
                  className="input-field"
                  placeholder="FinTech, E-commerce, Aerospace..."
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Website</label>
                <div className="relative group">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input
                    type="text"
                    value={data.personalInfo.website}
                    onChange={(e) => updatePersonalInfo('website', e.target.value)}
                    className="input-field pl-12 pr-12"
                    placeholder="quantum-ai.io/arjun"
                  />
                  {data.personalInfo.website && (
                    <a 
                      href={data.personalInfo.website.startsWith('http') ? data.personalInfo.website : `https://${data.personalInfo.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-50 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg transition-all shadow-sm border border-slate-100"
                      title="Visit Website"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">LinkedIn</label>
                <div className="relative group">
                  <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input
                    type="text"
                    value={data.personalInfo.linkedin}
                    onChange={(e) => updatePersonalInfo('linkedin', e.target.value)}
                    className="input-field pl-12 pr-12"
                    placeholder="linkedin.com/in/arjun"
                  />
                  {data.personalInfo.linkedin && (
                    <a 
                      href={data.personalInfo.linkedin.startsWith('http') ? data.personalInfo.linkedin : `https://${data.personalInfo.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-50 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg transition-all shadow-sm border border-slate-100"
                      title="Visit LinkedIn"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">GitHub</label>
                <div className="relative group">
                  <Github className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input
                    type="text"
                    value={data.personalInfo.github}
                    onChange={(e) => updatePersonalInfo('github', e.target.value)}
                    className="input-field pl-12 pr-12"
                    placeholder="github.com/arjun"
                  />
                  {data.personalInfo.github && (
                    <a 
                      href={data.personalInfo.github.startsWith('http') ? data.personalInfo.github : `https://${data.personalInfo.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-50 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg transition-all shadow-sm border border-slate-100"
                      title="Visit GitHub"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 space-y-3">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Executive Summary</label>
                  <button
                    onClick={() => generateAISuggestion('summary')}
                    disabled={!!isGenerating}
                    className="flex items-center gap-2 text-[9px] bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-all font-black uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-indigo-100"
                  >
                    <Sparkles size={12} className={isGenerating === 'summary' ? 'animate-pulse' : ''} />
                    {isGenerating === 'summary' ? 'Crafting...' : 'JobsEdge AI'}
                  </button>
                </div>
                <textarea
                  value={data.personalInfo.summary}
                  onChange={(e) => updatePersonalInfo('summary', e.target.value)}
                  className="input-field min-h-[140px] leading-relaxed resize-none"
                  placeholder="Synthesize your career trajectory and core value proposition..."
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Experience */}
      <div className="overflow-hidden">
        <SectionHeader id="experience" title="Professional Trajectory" icon={Briefcase} />
        <AnimatePresence>
          {activeSection === 'experience' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 sm:p-10 bg-white rounded-[24px] sm:rounded-[32px] border border-indigo-50 shadow-2xl shadow-indigo-100/30 mb-8 space-y-8 sm:space-y-10"
            >
              {data.experience.map((exp) => (
                <div key={exp.id} className="p-6 sm:p-8 border border-white rounded-[20px] sm:rounded-[24px] bg-indigo-50/5 space-y-6 sm:space-y-8 relative group ring-1 ring-indigo-50/50">
                  <button
                    onClick={() => removeExperience(exp.id)}
                    className="absolute top-6 right-6 p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Organization <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                        className={`input-field bg-white ${errors[`exp-${exp.id}-company`] ? 'border-rose-500 ring-rose-500/20 ring-1' : ''}`}
                        placeholder="Tata Consultancy Services"
                      />
                      {errors[`exp-${exp.id}-company`] && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1 uppercase tracking-wider">{errors[`exp-${exp.id}-company`]}</p>}
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Strategic Role <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={exp.position}
                        onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                        className={`input-field bg-white ${errors[`exp-${exp.id}-position`] ? 'border-rose-500 ring-rose-500/20 ring-1' : ''}`}
                        placeholder="Senior Software Engineer"
                      />
                      {errors[`exp-${exp.id}-position`] && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1 uppercase tracking-wider">{errors[`exp-${exp.id}-position`]}</p>}
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Commencement</label>
                      <input
                        type="text"
                        value={exp.startDate}
                        onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                        className="input-field bg-white"
                        placeholder="Jan 2020"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Conclusion</label>
                      <input
                        type="text"
                        value={exp.endDate}
                        disabled={exp.current}
                        onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                        className="input-field bg-white disabled:bg-indigo-50/10 disabled:text-slate-300"
                        placeholder="Present"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-1">
                    <input
                      type="checkbox"
                      checked={exp.current}
                      onChange={(e) => updateExperience(exp.id, 'current', e.target.checked)}
                      id={`current-${exp.id}`}
                      className="w-5 h-5 text-indigo-600 border-slate-300 rounded-lg focus:ring-indigo-500 transition-all cursor-pointer"
                    />
                    <label htmlFor={`current-${exp.id}`} className="text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">Current Engagement</label>
                  </div>
                  <div className="space-y-5">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Strategic Impact & Achievements</label>
                      <button
                        onClick={() => generateAISuggestion('experience_bullets', exp.id, exp.position)}
                        disabled={!!isGenerating}
                        className="flex items-center gap-2 text-[9px] bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-all font-black uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-indigo-100"
                      >
                        <Sparkles size={12} className={isGenerating === exp.id ? 'animate-pulse' : ''} />
                        {isGenerating === exp.id ? 'Analyzing...' : 'AI Strategist'}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {exp.description.map((bullet, idx) => (
                        <div key={idx} className="flex gap-3 group/bullet">
                          <input
                            type="text"
                            value={bullet}
                            onChange={(e) => updateBullet(exp.id, idx, e.target.value)}
                            className="input-field bg-white text-sm"
                            placeholder="Quantify impact: 'Increased revenue by 40% through...'"
                          />
                          <button
                            onClick={() => removeBullet(exp.id, idx)}
                            className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover/bullet:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => addBullet(exp.id)}
                      className="flex items-center gap-2 text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-[0.2em] px-2 py-2 rounded-xl hover:bg-indigo-50 transition-all"
                    >
                      <Plus size={16} /> Add Achievement
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={addExperience}
                className="w-full p-8 border-2 border-dashed border-slate-200 rounded-[24px] text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-4 font-black uppercase tracking-[0.2em] text-[11px]"
              >
                <Plus size={24} /> Add Professional Engagement
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skills */}
      <div className="overflow-hidden">
        <SectionHeader id="skills" title="Core Competencies" icon={Award} />
        <AnimatePresence>
          {activeSection === 'skills' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 sm:p-10 bg-white rounded-[24px] sm:rounded-[32px] border border-indigo-50 shadow-2xl shadow-indigo-100/30 mb-8 space-y-6 sm:space-y-8"
            >
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Technical Expertise (Comma separated)</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={data.skills.join(', ')}
                    onChange={handleSkillsChange}
                    className="input-field flex-1"
                    placeholder="Cloud Architecture, Distributed Systems, Strategic Leadership..."
                  />
                  <button
                    onClick={() => generateAISuggestion('skills_list')}
                    disabled={!!isGenerating}
                    className="flex items-center gap-2 text-[9px] bg-indigo-600 text-white px-6 py-1.5 rounded-xl hover:bg-indigo-700 transition-all font-black uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-indigo-100 whitespace-nowrap"
                  >
                    <Sparkles size={14} className={isGenerating === 'skills_list' ? 'animate-pulse' : ''} />
                    {isGenerating === 'skills_list' ? 'Analyzing...' : 'AI Skill Scout'}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                {data.skills.map((skill, i) => (
                  <span key={i} className="px-4 py-2 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-xl border border-indigo-100 uppercase tracking-widest shadow-sm">{skill}</span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* New Sections: Certifications, Languages, Awards */}
      <div className="overflow-hidden">
        <SectionHeader id="additional" title="Distinctions & Global Reach" icon={Globe} />
        <AnimatePresence>
          {activeSection === 'additional' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 sm:p-10 bg-white rounded-[24px] sm:rounded-[32px] border border-indigo-50 shadow-2xl shadow-indigo-100/30 mb-8 space-y-6 sm:space-y-8"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Certifications (Comma separated)</label>
                  <button
                    onClick={() => generateAISuggestion('certifications_list')}
                    disabled={!!isGenerating}
                    className="flex items-center gap-2 text-[9px] bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-all font-black uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-indigo-100"
                  >
                    <Sparkles size={12} className={isGenerating === 'certifications_list' ? 'animate-pulse' : ''} />
                    {isGenerating === 'certifications_list' ? 'Analyzing...' : 'AI Credentiary'}
                  </button>
                </div>
                <input
                  type="text"
                  value={data.certifications.join(', ')}
                  onChange={(e) => updateList('certifications', e.target.value)}
                  className="input-field"
                  placeholder="AWS Certified Solutions Architect, PMP..."
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Languages (Comma separated)</label>
                  <button
                    onClick={() => generateAISuggestion('languages_list')}
                    disabled={!!isGenerating}
                    className="flex items-center gap-2 text-[9px] bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-all font-black uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-indigo-100"
                  >
                    <Sparkles size={12} className={isGenerating === 'languages_list' ? 'animate-pulse' : ''} />
                    {isGenerating === 'languages_list' ? 'Analyzing...' : 'AI Polyglot'}
                  </button>
                </div>
                <input
                  type="text"
                  value={data.languages.join(', ')}
                  onChange={(e) => updateList('languages', e.target.value)}
                  className="input-field"
                  placeholder="English (Native), Mandarin (Fluent), German (Professional)..."
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Awards & Honors (Comma separated)</label>
                  <button
                    onClick={() => generateAISuggestion('awards_list')}
                    disabled={!!isGenerating}
                    className="flex items-center gap-2 text-[9px] bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-all font-black uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-indigo-100"
                  >
                    <Sparkles size={12} className={isGenerating === 'awards_list' ? 'animate-pulse' : ''} />
                    {isGenerating === 'awards_list' ? 'Analyzing...' : 'AI Laureate'}
                  </button>
                </div>
                <input
                  type="text"
                  value={data.awards.join(', ')}
                  onChange={(e) => updateList('awards', e.target.value)}
                  className="input-field"
                  placeholder="Forbes 30 Under 30, Innovation Excellence Award..."
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Education */}
      <div className="overflow-hidden">
        <SectionHeader id="education" title="Academic Foundation" icon={GraduationCap} />
        <AnimatePresence>
          {activeSection === 'education' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 sm:p-10 bg-white rounded-[24px] sm:rounded-[32px] border border-slate-200 shadow-2xl shadow-slate-200/50 mb-8 space-y-8 sm:space-y-10"
            >
              {data.education.map((edu) => (
                <div key={edu.id} className="p-6 sm:p-8 border border-slate-100 rounded-[20px] sm:rounded-[24px] bg-slate-50/30 space-y-6 sm:space-y-8 relative group ring-1 ring-slate-100">
                  <button
                    onClick={() => removeEducation(edu.id)}
                    className="absolute top-6 right-6 p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Institution <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={edu.school}
                        onChange={(e) => updateEducation(edu.id, 'school', e.target.value)}
                        className={`input-field bg-white ${errors[`edu-${edu.id}-school`] ? 'border-rose-500 ring-rose-500/20 ring-1' : ''}`}
                        placeholder="IIT Delhi"
                      />
                      {errors[`edu-${edu.id}-school`] && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1 uppercase tracking-wider">{errors[`edu-${edu.id}-school`]}</p>}
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Academic Degree <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                        className={`input-field bg-white ${errors[`edu-${edu.id}-degree`] ? 'border-rose-500 ring-rose-500/20 ring-1' : ''}`}
                        placeholder="B.Tech Computer Science"
                      />
                      {errors[`edu-${edu.id}-degree`] && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1 uppercase tracking-wider">{errors[`edu-${edu.id}-degree`]}</p>}
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Commencement</label>
                      <input
                        type="text"
                        value={edu.startDate}
                        onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                        className="input-field bg-white"
                        placeholder="2016"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Completion</label>
                      <input
                        type="text"
                        value={edu.endDate}
                        onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)}
                        className="input-field bg-white"
                        placeholder="2018"
                      />
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Academic Honors & Focus</label>
                      <button
                        onClick={() => generateAISuggestion('education_description', edu.id, edu.degree)}
                        disabled={!!isGenerating}
                        className="flex items-center gap-2 text-[9px] bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-all font-black uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-indigo-100"
                      >
                        <Sparkles size={12} className={isGenerating === edu.id ? 'animate-pulse' : ''} />
                        {isGenerating === edu.id ? 'Analyzing...' : 'AI Academic'}
                      </button>
                    </div>
                    <textarea
                      value={edu.description}
                      onChange={(e) => updateEducation(edu.id, 'description', e.target.value)}
                      className="input-field bg-white min-h-[100px] leading-relaxed resize-none"
                      placeholder="Ranked in Top 1% of JEE, 9.5 CGPA, Research in Distributed Systems..."
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addEducation}
                className="w-full p-8 border-2 border-dashed border-slate-200 rounded-[24px] text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-4 font-black uppercase tracking-[0.2em] text-[11px]"
              >
                <Plus size={24} /> Add Academic Foundation
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Projects */}
      <div className="overflow-hidden">
        <SectionHeader id="projects" title="Strategic Initiatives" icon={Code} />
        <AnimatePresence>
          {activeSection === 'projects' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 sm:p-10 bg-white rounded-[24px] sm:rounded-[32px] border border-slate-200 shadow-2xl shadow-slate-200/50 mb-8 space-y-8 sm:space-y-10"
            >
              {data.projects.map((project) => (
                <div key={project.id} className="p-6 sm:p-8 border border-slate-100 rounded-[20px] sm:rounded-[24px] bg-slate-50/30 space-y-6 sm:space-y-8 relative group ring-1 ring-slate-100">
                  <button
                    onClick={() => removeProject(project.id)}
                    className="absolute top-6 right-6 p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1">Initiative Name <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        value={project.name}
                        onChange={(e) => updateProject(project.id, 'name', e.target.value)}
                        className={`input-field bg-white ${errors[`proj-${project.id}-name`] ? 'border-rose-500 ring-rose-500/20 ring-1' : ''}`}
                        placeholder="Open Source Contribution"
                      />
                      {errors[`proj-${project.id}-name`] && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1 uppercase tracking-wider">{errors[`proj-${project.id}-name`]}</p>}
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Digital Footprint (Link)</label>
                      <input
                        type="text"
                        value={project.link}
                        onChange={(e) => updateProject(project.id, 'link', e.target.value)}
                        className={`input-field bg-white ${errors[`proj-${project.id}-link`] ? 'border-rose-500 ring-rose-500/20 ring-1' : ''}`}
                        placeholder="github.com/project"
                      />
                      {errors[`proj-${project.id}-link`] && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1 uppercase tracking-wider">{errors[`proj-${project.id}-link`]}</p>}
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Strategic Narrative</label>
                      <button
                        onClick={() => generateAISuggestion('project_description', project.id, project.name)}
                        disabled={!!isGenerating}
                        className="flex items-center gap-2 text-[9px] bg-indigo-600 text-white px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-all font-black uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-indigo-100"
                      >
                        <Sparkles size={12} className={isGenerating === project.id ? 'animate-pulse' : ''} />
                        {isGenerating === project.id ? 'Analyzing...' : 'AI Architect'}
                      </button>
                    </div>
                    <textarea
                      value={project.description}
                      onChange={(e) => updateProject(project.id, 'description', e.target.value)}
                      className="input-field bg-white min-h-[120px] leading-relaxed resize-none"
                      placeholder="Synthesize the technical complexity and strategic outcomes..."
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addProject}
                className="w-full p-8 border-2 border-dashed border-slate-200 rounded-[24px] text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-4 font-black uppercase tracking-[0.2em] text-[11px]"
              >
                <Plus size={24} /> Add Strategic Initiative
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Certifications */}
      <div className="overflow-hidden">
        <SectionHeader id="certifications" title="Global Credentials" icon={Award} />
        <AnimatePresence>
          {activeSection === 'certifications' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 sm:p-10 bg-white rounded-[24px] sm:rounded-[32px] border border-slate-200 shadow-2xl shadow-slate-200/50 mb-8 space-y-6"
            >
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Certifications (Comma Separated)</label>
                <textarea
                  value={data.certifications.join(', ')}
                  onChange={(e) => updateList('certifications', e.target.value)}
                  className="input-field min-h-[100px] leading-relaxed resize-none"
                  placeholder="AWS Solutions Architect, PMP, Google Cloud Architect..."
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Languages */}
      <div className="overflow-hidden">
        <SectionHeader id="languages" title="Linguistic Mastery" icon={Globe} />
        <AnimatePresence>
          {activeSection === 'languages' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 sm:p-10 bg-white rounded-[24px] sm:rounded-[32px] border border-slate-200 shadow-2xl shadow-slate-200/50 mb-8 space-y-6"
            >
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Languages (Comma Separated)</label>
                <textarea
                  value={data.languages.join(', ')}
                  onChange={(e) => updateList('languages', e.target.value)}
                  className="input-field min-h-[100px] leading-relaxed resize-none"
                  placeholder="English (Fluent), Hindi (Native), German (B2)..."
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Achievements */}
      <div className="overflow-hidden">
        <SectionHeader id="awards" title="Professional Honors" icon={Award} />
        <AnimatePresence>
          {activeSection === 'awards' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 sm:p-10 bg-white rounded-[24px] sm:rounded-[32px] border border-slate-200 shadow-2xl shadow-slate-200/50 mb-8 space-y-6"
            >
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Achievements (Comma Separated)</label>
                <textarea
                  value={data.awards.join(', ')}
                  onChange={(e) => updateList('awards', e.target.value)}
                  className="input-field min-h-[100px] leading-relaxed resize-none"
                  placeholder="Employee of the Year, Hackathon Winner, Patent Holder..."
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
