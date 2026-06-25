import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layout, Check, Sparkles, Filter, CheckCircle2, Eye } from 'lucide-react';
import { TemplateType, ResumeData } from '../types';
import { ResumePreview } from './ResumePreview';

interface TemplateLibraryProps {
  data: ResumeData;
  onSelect: (template: TemplateType) => void;
  isPremium?: boolean;
  onUpgrade?: () => void;
}

interface TemplateMetadata {
  id: TemplateType;
  name: string;
  category: 'Modern' | 'Traditional' | 'Creative' | 'Tech' | 'Industry-Specific';
  previewColor: string;
  isPopular?: boolean;
  isPremium?: boolean;
}

const ALL_TEMPLATES: TemplateMetadata[] = [
  { id: 'ats', name: 'Standard ATS', category: 'Traditional', previewColor: '#64748b', isPopular: true, isPremium: false },
  { id: 'modern', name: 'Modern Pro', category: 'Modern', previewColor: '#4f46e5', isPopular: true, isPremium: false },
  { id: 'executive', name: 'Executive Elite', category: 'Traditional', previewColor: '#1e1b4b', isPremium: false },
  { id: 'minimalist', name: 'Clean Minimal', category: 'Modern', previewColor: '#94a3b8', isPremium: false },
  { id: 'classic', name: 'Oxford Classic', category: 'Traditional', previewColor: '#0f172a', isPremium: false },
  { id: 'creative', name: 'Artisan Narrative', category: 'Creative', previewColor: '#ec4899', isPremium: false },
  { id: 'professional', name: 'Corporate Standard', category: 'Modern', previewColor: '#2563eb', isPremium: false },
  { id: 'sidebar', name: 'Modern Sidebar', category: 'Modern', previewColor: '#334155', isPremium: false },
  { id: 'bold', name: 'Bold Accent', category: 'Creative', previewColor: '#f97316', isPremium: false },
  { id: 'elegant', name: 'Elegant Serif', category: 'Modern', previewColor: '#7c3aed', isPremium: false },
  { id: 'technical', name: 'Technical Stack', category: 'Tech', previewColor: '#06b6d4', isPopular: true, isPremium: false },
  { id: 'compact', name: 'Space Saver', category: 'Traditional', previewColor: '#65a30d', isPremium: false },
  { id: 'academic', name: 'Curriculum Vitae', category: 'Traditional', previewColor: '#dc2626', isPremium: false },
  { id: 'management', name: 'Director Level', category: 'Industry-Specific', previewColor: '#0f172a', isPremium: false },
  { id: 'design', name: 'Designer Grid', category: 'Creative', previewColor: '#fbbf24', isPremium: false },
  { id: 'sales', name: 'Sales Closer', category: 'Industry-Specific', previewColor: '#ea580c', isPremium: false },
  { id: 'marketing', name: 'Creative Strategist', category: 'Creative', previewColor: '#db2777', isPremium: false },
  { id: 'customer-service', name: 'Lead Concierge', category: 'Industry-Specific', previewColor: '#0891b2', isPremium: false },
  { id: 'medical', name: 'Healthcare Pro', category: 'Industry-Specific', previewColor: '#059669', isPremium: false },
  { id: 'legal', name: 'Advocate Legal', category: 'Industry-Specific', previewColor: '#4b5563', isPremium: false },
  { id: 'banking', name: 'Asset Manager', category: 'Industry-Specific', previewColor: '#111827', isPremium: false },
  { id: 'startup', name: 'Unicorn Founder', category: 'Tech', previewColor: '#6366f1', isPremium: false },
  { id: 'consultant', name: 'Strategic Advisory', category: 'Industry-Specific', previewColor: '#4338ca', isPremium: false } as any,
  { id: 'architect', name: 'System Designer', category: 'Tech', previewColor: '#0891b2', isPremium: false },
  { id: 'developer', name: 'Code Architect', category: 'Tech', previewColor: '#10b981', isPopular: true, isPremium: false }
];

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({ data, onSelect, isPremium, onUpgrade }) => {
  const [filter, setFilter] = React.useState<string>('All');
  const [hoveredTemplate, setHoveredTemplate] = React.useState<TemplateType | null>(null);
  const categories = ['All', ...new Set(ALL_TEMPLATES.map(t => t.category))];

  const filtered = filter === 'All' 
    ? ALL_TEMPLATES 
    : ALL_TEMPLATES.filter(t => t.category === filter);

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Layout size={32} className="text-indigo-600" />
            Template Gallery
          </h2>
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] mt-1 ml-1">Curated for maximum ATS parseability and visual impact.</p>
        </div>

        <div className="flex bg-indigo-50/50 p-1.5 rounded-2xl border border-indigo-100 overflow-x-auto max-w-full custom-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                filter === cat 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-indigo-400 hover:text-indigo-600 hover:bg-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 px-4 sm:px-0">
        {filtered.map((template, i) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => setHoveredTemplate(template.id)}
            onMouseLeave={() => setHoveredTemplate(null)}
            onClick={() => {
              onSelect(template.id);
            }}
            className={`group cursor-pointer rounded-[40px] border-2 transition-all duration-700 bg-white relative overflow-hidden flex flex-col ${
              data.template === template.id 
                ? 'border-indigo-600 shadow-[0_32px_64px_-16px_rgba(79,70,229,0.2)]' 
                : 'border-indigo-50/50 hover:border-indigo-400 hover:shadow-[0_40px_80px_-24px_rgba(79,70,229,0.15)] hover:-translate-y-2'
            }`}
          >
            {/* Interactive Preview Container */}
            <div className="relative h-[480px] bg-white overflow-hidden border-b border-indigo-50 group-hover:bg-indigo-50/10 transition-colors duration-700">
               {/* Template Identity Color Bar */}
               <div 
                className="absolute top-0 left-0 w-full h-2 z-20" 
                style={{ backgroundColor: template.previewColor }}
              />

              {/* illustrative background image */}
              <div className="absolute inset-0 opacity-[0.03] blur-3xl group-hover:opacity-10 transition-opacity duration-700">
                <img 
                  src={`https://picsum.photos/seed/${template.id}/800/1200`} 
                  alt="" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="w-[850px] bg-white rounded-lg shadow-2xl origin-top scale-[0.38] transition-all duration-700 ease-out group-hover:scale-[0.41] group-hover:-translate-y-4 pointer-events-none ring-1 ring-slate-100">
                  <ResumePreview data={data} templateOverride={template.id} />
                </div>
              </div>

              {/* Selection Overlay */}
              <AnimatePresence>
                {data.template === template.id && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-indigo-600/5 backdrop-blur-[1px] flex items-center justify-center z-30"
                  >
                    <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-xl transform scale-110">
                      <CheckCircle2 size={24} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hover Badge */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500 z-10" />
              
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 z-40">
                <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl">
                  <Eye size={12} /> Live Preview
                </div>
              </div>
              
              {template.isPopular && (
                <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1.5 z-40">
                  <Sparkles size={10} /> Popular
                </div>
              )}
            </div>

            <div className="p-6 space-y-2 bg-white relative z-40">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{template.category}</span>
                {data.template === template.id && (
                  <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Active Choice</span>
                )}
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none group-hover:text-indigo-600 transition-colors">{template.name}</h3>
            </div>

            {/* Bottom Accent */}
            <div className={`absolute bottom-0 left-0 w-full h-1.5 transition-all duration-500 z-50 ${
              data.template === template.id ? 'bg-indigo-600' : 'bg-transparent group-hover:bg-indigo-200'
            }`} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};
