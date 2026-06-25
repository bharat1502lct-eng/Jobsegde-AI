export type TemplateType = 
  | 'ats' | 'modern' | 'executive' | 'minimalist' 
  | 'classic' | 'creative' | 'professional' | 'sidebar' 
  | 'bold' | 'elegant' | 'technical' | 'compact'
  | 'academic' | 'management' | 'design' | 'sales'
  | 'marketing' | 'customer-service' | 'medical' | 'legal'
  | 'banking' | 'startup' | 'consultant' | 'architect' | 'developer';

export interface ResumeData {
  template: TemplateType;
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    linkedin: string;
    github: string;
    industry: string;
    summary: string;
  };
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  certifications: string[];
  languages: string[];
  awards: string[];
  preferences: {
    autoApply: boolean;
    remoteOnly: boolean;
    minSalary: string;
    targetRoles: string[];
  };
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string[];
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Project {
  id: string;
  name: string;
  link: string;
  description: string;
}

export interface ATSSectionAnalysis {
  sectionName: string;
  rating: 'excellent' | 'warning' | 'critical';
  score: number;
  checks: { label: string; passed: boolean }[];
  findings: string[];
  recommendation: string;
  improvedSnippet?: string;
}

export interface ATSResult {
  score: number;
  tips: { title: string; description: string; actionLabel: string; type: 'content' | 'format' | 'keyword' }[];
  missingKeywords: string[];
  strengths: string[];
  checklist: { label: string; passed: boolean; critical: boolean }[];
  sectionAnalysis?: ATSSectionAnalysis[];
}

export type View = 'builder' | 'jobs' | 'intelligence' | 'templates' | 'architect' | 'consultant' | 'mentor' | 'pricing' | 'ats' | 'profile' | 'hiring';

export type PlanType = 'free' | 'monthly' | 'quarterly' | 'half-yearly' | 'nine-months' | 'yearly';

export interface UserProfile {
  uid: string;
  fullName: string;
  id: string; // Add id for consistent usage
  email: string;
  onboardingCompleted: boolean;
  role: 'candidate' | 'employer';
  subscription: {
    plan: PlanType;
    status: 'active' | 'inactive' | 'expired';
    expiryDate: string | null;
  };
  usage: {
    aiGenerations: number;
    resumesCreated: number;
  };
  createdAt?: string;
}

export interface JobOpening {
  id: string;
  title: string;
  industry: string;
  location: string;
  description: string;
  requirements: string[];
  status: 'active' | 'closed';
  employerUid: string;
  createdAt: any;
  logoUrl?: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  candidateUid: string;
  candidateName: string;
  candidateEmail: string;
  matchScore: number;
  aiAnalysis: string;
  status: 'pending' | 'shortlisted' | 'rejected';
  createdAt: any;
  coverLetter?: string;
  candidatePhone?: string;
}
