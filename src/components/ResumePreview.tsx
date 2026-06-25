import React from 'react';
import { ResumeData, TemplateType } from '../types';
import { Globe, Linkedin, Github, Mail, Phone, MapPin } from 'lucide-react';

interface ResumePreviewProps {
  data: ResumeData;
  templateOverride?: TemplateType;
}

export const ResumePreview = React.forwardRef<HTMLDivElement, ResumePreviewProps>(
  ({ data, templateOverride }, ref) => {
    // Helper to get template-specific styles
    const getTemplateConfig = (template: TemplateType) => {
      const configs: Record<string, any> = {
        ats: { font: 'font-serif', accent: 'text-slate-900', border: 'border-slate-900', bg: 'bg-white', text: 'text-slate-900' },
        modern: { font: 'font-sans', accent: 'text-indigo-600', border: 'border-indigo-100', bg: 'bg-white', text: 'text-slate-800' },
        executive: { font: 'font-serif', accent: 'text-indigo-950', border: 'border-slate-200', bg: 'bg-white', italic: true, text: 'text-slate-900' },
        minimalist: { font: 'font-sans', accent: 'text-slate-950', border: 'border-transparent', bg: 'bg-white', thin: true, text: 'text-slate-800' },
        technical: { font: 'font-mono', accent: 'text-cyan-600', border: 'border-cyan-100', bg: 'bg-white', text: 'text-slate-800' },
        creative: { font: 'font-sans', accent: 'text-pink-600', border: 'border-pink-100', bg: 'bg-white', rounded: true, text: 'text-slate-800' },
        startup: { font: 'font-sans', accent: 'text-indigo-500', border: 'border-indigo-100', bg: 'bg-white', text: 'text-indigo-900' },
        developer: { font: 'font-mono', accent: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-slate-950', dark: true, text: 'text-slate-200' },
        architect: { font: 'font-sans', accent: 'text-blue-600', border: 'border-blue-100', bg: 'bg-white', text: 'text-slate-900' },
        consultant: { font: 'font-sans', accent: 'text-indigo-700', border: 'border-indigo-200', bg: 'bg-white', text: 'text-slate-800' },
        classic: { font: 'font-serif', accent: 'text-slate-800', border: 'border-slate-800', bg: 'bg-white', text: 'text-slate-900' },
        professional: { font: 'font-sans', accent: 'text-neutral-800', border: 'border-neutral-200', bg: 'bg-white', text: 'text-neutral-900' },
        bold: { font: 'font-sans', accent: 'text-red-600', border: 'border-red-600', bg: 'bg-white', text: 'text-slate-900' },
        elegant: { font: 'font-serif', accent: 'text-amber-700', border: 'border-amber-200', bg: 'bg-[#fffcf5]', text: 'text-slate-900' },
        compact: { font: 'font-sans', accent: 'text-slate-700', border: 'border-slate-200', bg: 'bg-white', text: 'text-slate-900', tight: true },
        academic: { font: 'font-serif', accent: 'text-blue-900', border: 'border-blue-900', bg: 'bg-white', text: 'text-slate-900' },
        management: { font: 'font-sans', accent: 'text-indigo-900', border: 'border-indigo-900', bg: 'bg-white', text: 'text-slate-900' }
      };
      
      // Default fallback for the 25 variants
      return configs[template] || configs.modern;
    };

    const activeTemplate = templateOverride || data.template;
    const config = getTemplateConfig(activeTemplate);

    const SidebarLayout = ({ sidebar, main }: { sidebar: React.ReactNode, main: React.ReactNode }) => (
      <div className={`flex min-h-[11in] w-full max-w-[8.5in] mx-auto overflow-hidden shadow-lg ${config.bg} ${config.font}`}>
        <div className="w-[30%] bg-slate-900 text-white p-8 space-y-8">
          {sidebar}
        </div>
        <div className="flex-1 p-10 space-y-10">
          {main}
        </div>
      </div>
    );

    const StandardLayout = ({ children }: { children: React.ReactNode }) => (
      <div className={`p-12 shadow-lg min-h-[11in] w-full max-w-[8.5in] mx-auto ${config.bg} ${config.font} ${config.dark ? 'text-slate-300' : 'text-slate-800'}`}>
        {children}
      </div>
    );

    const renderSections = () => (
      <>
        {/* Header */}
        <header className={`mb-8 ${activeTemplate === 'ats' ? 'text-center' : 'text-left'}`}>
          <h1 className={`text-3xl font-black uppercase tracking-tight ${config.dark ? 'text-white' : 'text-slate-900'}`}>
            {data.personalInfo.fullName || 'Professional Identity'}
          </h1>
          <div className="text-[9pt] font-bold uppercase tracking-widest text-slate-500 mt-3 flex flex-wrap gap-x-6 gap-y-2 items-center">
            {data.personalInfo.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className={config.accent} />
                {data.personalInfo.location}
              </span>
            )}
            {data.personalInfo.phone && (
              <span className="flex items-center gap-1.5">
                <Phone size={12} className={config.accent} />
                {data.personalInfo.phone}
              </span>
            )}
            {data.personalInfo.email && (
              <span className="flex items-center gap-1.5">
                <Mail size={12} className={config.accent} />
                <span className={config.accent}>{data.personalInfo.email}</span>
              </span>
            )}
            {data.personalInfo.website && (
              <a 
                href={data.personalInfo.website.startsWith('http') ? data.personalInfo.website : `https://${data.personalInfo.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
              >
                <Globe size={12} className={config.accent} />
                {data.personalInfo.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {data.personalInfo.linkedin && (
              <a 
                href={data.personalInfo.linkedin.startsWith('http') ? data.personalInfo.linkedin : `https://${data.personalInfo.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
              >
                <Linkedin size={12} className={config.accent} />
                {data.personalInfo.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '')}
              </a>
            )}
            {data.personalInfo.github && (
              <a 
                href={data.personalInfo.github.startsWith('http') ? data.personalInfo.github : `https://${data.personalInfo.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
              >
                <Github size={12} className={config.accent} />
                {data.personalInfo.github.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
              </a>
            )}
          </div>
        </header>

        {/* Summary */}
        {data.personalInfo.summary && (
          <section className="mb-8">
            <h2 className={`text-[10pt] font-black uppercase tracking-[0.2em] mb-3 pb-1 border-b ${config.border} ${config.accent}`}>
              Strategic Narrative
            </h2>
            <p className="text-[10pt] leading-relaxed font-medium">
              {data.personalInfo.summary}
            </p>
          </section>
        )}

        {/* Experience */}
        {data.experience.length > 0 && (
          <section className="mb-8">
            <h2 className={`text-[10pt] font-black uppercase tracking-[0.2em] mb-4 pb-1 border-b ${config.border} ${config.accent}`}>
              Professional Trajectory
            </h2>
            <div className="space-y-6">
              {data.experience.map((exp) => (
                <div key={exp.id} className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <h3 className={`text-[12pt] font-black tracking-tight ${config.dark ? 'text-white' : 'text-slate-900'}`}>{exp.company}</h3>
                    <span className="text-[9pt] font-black text-slate-400">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                  </div>
                  <div className="flex justify-between items-center italic text-[10pt] font-bold text-slate-500">
                    <span className={config.accent}>{exp.position}</span>
                    <span className="text-[9pt]">{exp.location}</span>
                  </div>
                  <ul className="space-y-1.5 ml-4">
                    {exp.description.map((bullet, i) => (
                      <li key={i} className="text-[9.5pt] leading-relaxed flex gap-2">
                        <span className={`mt-2 w-1 h-1 rounded-full shrink-0 ${config.dark ? 'bg-slate-700' : 'bg-slate-300'}`} />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {data.skills.length > 0 && (
          <section className="mb-8">
            <h2 className={`text-[10pt] font-black uppercase tracking-[0.2em] mb-3 pb-1 border-b ${config.border} ${config.accent}`}>
              Core Competencies
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.skills.map((skill, i) => (
                <span key={i} className={`px-2 py-1 rounded text-[8pt] font-black uppercase tracking-widest border ${config.dark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {data.education.length > 0 && (
          <section className="mb-8">
            <h2 className={`text-[10pt] font-black uppercase tracking-[0.2em] mb-3 pb-1 border-b ${config.border} ${config.accent}`}>
              Academic Foundation
            </h2>
            <div className="space-y-4">
              {data.education.map((edu) => (
                <div key={edu.id} className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className={`text-[11pt] font-black ${config.dark ? 'text-white' : 'text-slate-900'}`}>{edu.school}</h4>
                    <span className="text-[9pt] font-black text-slate-400">{edu.startDate} — {edu.endDate}</span>
                  </div>
                  <p className="text-[10pt] font-bold text-slate-500">{edu.degree}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {data.projects.length > 0 && (
          <section className="mb-8">
            <h2 className={`text-[10pt] font-black uppercase tracking-[0.2em] mb-3 pb-1 border-b ${config.border} ${config.accent}`}>
              Strategic Initiatives
            </h2>
            <div className="space-y-4">
              {data.projects.map((project) => (
                <div key={project.id} className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <h4 className={`text-[11pt] font-black ${config.dark ? 'text-white' : 'text-slate-900'}`}>{project.name}</h4>
                    <span className="text-[9pt] font-black text-slate-400">{project.link}</span>
                  </div>
                  <p className="text-[9.5pt] leading-relaxed font-medium text-slate-500">
                    {project.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Certifications */}
        {data.certifications.length > 0 && (
          <section className="mb-8">
            <h2 className={`text-[10pt] font-black uppercase tracking-[0.2em] mb-3 pb-1 border-b ${config.border} ${config.accent}`}>
              Global Credentials
            </h2>
            <div className="flex flex-wrap gap-3">
              {data.certifications.map((cert, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${config.accent}`} />
                  <span className={`text-[9.5pt] font-medium ${config.dark ? 'text-slate-300' : 'text-slate-600'}`}>{cert}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Awards */}
        {data.awards.length > 0 && (
          <section className="mb-8">
            <h2 className={`text-[10pt] font-black uppercase tracking-[0.2em] mb-3 pb-1 border-b ${config.border} ${config.accent}`}>
              Professional Honors
            </h2>
            <div className="space-y-2">
              {data.awards.map((award, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 text-indigo-500 font-bold">•</span>
                  <span className={`text-[9.5pt] font-medium leading-relaxed ${config.dark ? 'text-slate-300' : 'text-slate-600'}`}>{award}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Languages */}
        {data.languages.length > 0 && (
          <section className="mb-8">
            <h2 className={`text-[10pt] font-black uppercase tracking-[0.2em] mb-3 pb-1 border-b ${config.border} ${config.accent}`}>
              Linguistic Mastery
            </h2>
            <div className="flex flex-wrap gap-4">
              {data.languages.map((lang, i) => (
                <span key={i} className={`text-[9.5pt] font-bold ${config.dark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {lang}
                </span>
              ))}
            </div>
          </section>
        )}
      </>
    );

    const SidebarContent = () => (
      <>
        <div className="space-y-4 pt-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-black">
            {data.personalInfo.fullName.charAt(0) || 'P'}
          </div>
          <h1 className="text-2xl font-black tracking-tight leading-tight">{data.personalInfo.fullName}</h1>
          <div className="space-y-3 pt-2">
            {data.personalInfo.location && (
              <div className="flex items-center gap-3 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                <MapPin size={14} className="text-indigo-500" /> {data.personalInfo.location}
              </div>
            )}
            {data.personalInfo.email && (
              <div className="flex items-center gap-3 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                <Mail size={14} className="text-indigo-500" /> {data.personalInfo.email}
              </div>
            )}
            {data.personalInfo.phone && (
              <div className="flex items-center gap-3 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                <Phone size={14} className="text-indigo-500" /> {data.personalInfo.phone}
              </div>
            )}
            <div className="h-px bg-white/10 my-4" />
            <div className="flex gap-4">
              {data.personalInfo.linkedin && (
                <a 
                  href={data.personalInfo.linkedin.startsWith('http') ? data.personalInfo.linkedin : `https://${data.personalInfo.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/5 hover:bg-indigo-600 rounded-lg border border-white/10 transition-all text-slate-300 hover:text-white"
                  title="LinkedIn"
                >
                  <Linkedin size={16} />
                </a>
              )}
              {data.personalInfo.github && (
                <a 
                  href={data.personalInfo.github.startsWith('http') ? data.personalInfo.github : `https://${data.personalInfo.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/5 hover:bg-indigo-600 rounded-lg border border-white/10 transition-all text-slate-300 hover:text-white"
                  title="GitHub"
                >
                  <Github size={16} />
                </a>
              )}
              {data.personalInfo.website && (
                <a 
                  href={data.personalInfo.website.startsWith('http') ? data.personalInfo.website : `https://${data.personalInfo.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/5 hover:bg-indigo-600 rounded-lg border border-white/10 transition-all text-slate-300 hover:text-white"
                  title="Website"
                >
                  <Globe size={16} />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Expertise</h3>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((s, i) => (
              <span key={i} className="px-2 py-1 bg-white/5 text-[9px] font-bold rounded border border-white/10">{s}</span>
            ))}
          </div>
        </div>

        {data.languages.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Linguistic Mastery</h3>
            <div className="space-y-2">
              {data.languages.map((l, i) => (
                <div key={i} className="text-[10px] font-bold text-slate-400">{l}</div>
              ))}
            </div>
          </div>
        )}

        {data.certifications.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Global Credentials</h3>
            <div className="space-y-3">
              {data.certifications.map((c, i) => (
                <div key={i} className="text-[9px] font-bold text-slate-400 border-l border-white/10 pl-3 py-1">{c}</div>
              ))}
            </div>
          </div>
        )}
      </>
    );

    const MainContent = () => (
      <>
        {data.personalInfo.summary && (
          <section className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Profile</h2>
            <p className="text-sm font-medium leading-relaxed">{data.personalInfo.summary}</p>
          </section>
        )}
        {data.experience.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Trajectory</h2>
            <div className="space-y-8">
              {data.experience.map(exp => (
                <div key={exp.id} className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-lg font-black">{exp.company}</h3>
                    <span className="text-[10px] font-black text-slate-400">{exp.startDate} - {exp.endDate}</span>
                  </div>
                  <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">{exp.position}</p>
                  <ul className="space-y-1 pl-4">
                    {exp.description.map((b, i) => <li key={i} className="text-xs leading-relaxed text-slate-500">• {b}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.awards.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Professional Honors</h2>
            <div className="space-y-3">
              {data.awards.map((a, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl text-[11px] font-bold text-slate-600 border border-slate-100 flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  {a}
                </div>
              ))}
            </div>
          </section>
        )}
      </>
    );

    return (
      <div ref={ref} className="w-full">
        {data.template === 'sidebar' ? (
          <SidebarLayout sidebar={<SidebarContent />} main={<MainContent />} />
        ) : (
          <StandardLayout>
            {renderSections()}
          </StandardLayout>
        )}
      </div>
    );
  }
);

ResumePreview.displayName = 'ResumePreview';
