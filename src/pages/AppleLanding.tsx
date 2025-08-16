/**
 * Apple-Style Landing Page Component - Enhanced with Transcript Features
 * 
 * Design Rationale:
 * - ElevenLabs-style hero section with flowing background shapes
 * - Central card with II icon and clean typography
 * - Showcase transcript features with stunning visual examples
 * - Dynamic animations and professional marketing content
 * - Step-by-step workflow demonstration
 * - Beautiful imagery with subtle shadows and effects
 * - Mobile-first responsive design
 * - Integration with existing DNA animation and Magic UI components
 * - WCAG2.1 AA accessibility compliance
 */

import React, { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import AppleNavbar from '@/components/ui/apple-navbar';
import AppleButton from '@/components/ui/apple-button';
import AppleCard from '@/components/ui/apple-card';
import AppleFooter from '@/components/ui/apple-footer';
import { DNAAnimation } from '@/components/ui/dna-animation';
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text';
import { SparklesText } from '@/components/ui/sparkles-text';
import { NumberTicker } from '@/components/ui/number-ticker';
import { GridPattern } from '@/components/ui/grid-pattern';
import { AnimatedBeam } from '@/components/ui/animated-beam';
import { BorderBeam } from '@/components/ui/border-beam';
import { MagicCard } from '@/components/ui/magic-card';
import AnimatedWaves from '@/components/ui/animated-waves';
import FloatingElements from '@/components/ui/floating-elements';
import { 
  Upload, 
  Languages, 
  FileText, 
  Download, 
  Play, 
  Edit3, 
  Globe, 
  Zap,
  CheckCircle,
  ArrowRight,
  Clock,
  Users,
  Shield,
  BarChart3,
  Mic,
  Volume2,
  Settings,
  Eye,
  Pause,
  Calendar,
  Flag,
  ChevronDown,
  X,
  Linkedin,
  Github,
  Youtube,
  MessageCircle,
  Table,
  Brain,
  MessageSquare,
  ScrollText,
  CheckCircle2
} from 'lucide-react';

const AppleLanding: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const [activeFeature, setActiveFeature] = useState(0);

  const stats = [
    { label: 'Languages Supported', value: 15, suffix: '+', icon: <Globe className="w-6 h-6" /> },
    { label: 'Processing Speed', value: 10, suffix: 'x faster', icon: <Zap className="w-6 h-6" /> },
    { label: 'Accuracy Rate', value: 99, suffix: '%', icon: <CheckCircle className="w-6 h-6" /> },
    { label: 'Active Users', value: 5000, suffix: '+', icon: <Users className="w-6 h-6" /> }
  ];

  const features = [
    {
      title: 'Drag & Drop Upload',
      description: 'Simply drag your audio/video files into our intuitive interface. Supports MP3, MP4, WAV, M4A up to 500MB.',
      icon: <Upload className="w-8 h-8" />,
      color: 'from-blue-500 to-cyan-500',
      demo: 'Upload Interface'
    },
    {
      title: 'Automatic Language Detection',
      description: 'Our AI instantly detects 15+ languages including Italian, Spanish, French, German, Japanese, and Chinese.',
      icon: <Languages className="w-8 h-8" />,
      color: 'from-green-500 to-emerald-500',
      demo: 'Language Detection'
    },
    {
      title: 'Real-time Transcription',
      description: 'Advanced Azure Speech AI converts speech to text with 99% accuracy in real-time.',
      icon: <FileText className="w-8 h-8" />,
      color: 'from-purple-500 to-pink-500',
      demo: 'Live Transcription'
    },
    {
      title: 'Smart Translation',
      description: 'Automatic translation to English while preserving the original text for reference.',
      icon: <Globe className="w-8 h-8" />,
      color: 'from-orange-500 to-red-500',
      demo: 'Translation Preview'
    },
    {
      title: 'I:/R: Formatting',
      description: 'Intelligent speaker identification with Interviewer/Respondent formatting for healthcare research.',
      icon: <Users className="w-8 h-8" />,
      color: 'from-indigo-500 to-blue-500',
      demo: 'Speaker Format'
    },
    {
      title: 'Export & Share',
      description: 'Export in PDF, Word, or Text formats with FMR Global Health branding and timestamps.',
      icon: <Download className="w-8 h-8" />,
      color: 'from-teal-500 to-cyan-500',
      demo: 'Export Options'
    }
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Upload Your Files',
      description: 'Drag & drop audio/video files or click to browse. We support all major formats.',
      icon: <Upload className="w-6 h-6" />
    },
    {
      step: '02',
      title: 'AI Processing',
      description: 'Our AI detects language, transcribes speech, and translates to English automatically.',
      icon: <Zap className="w-6 h-6" />
    },
    {
      step: '03',
      title: 'Review & Edit',
      description: 'Edit metadata, review transcriptions, and format speaker identification.',
      icon: <Edit3 className="w-6 h-6" />
    },
    {
      step: '04',
      title: 'Export & Share',
      description: 'Export in multiple formats with professional branding and timestamps.',
      icon: <Download className="w-6 h-6" />
    }
  ];

  const testimonials = [
    {
      name: 'Dr. Sarah Chen',
      role: 'Research Director, PharmaCorp',
      content: 'FMR QualAI transformed our research workflow. The automatic transcription and translation saved us weeks of manual work.',
      avatar: '👩‍⚕️'
    },
    {
      name: 'Prof. Marco Rossi',
      role: 'Clinical Research Lead, MedTech Europe',
      content: 'The I:/R: formatting is perfect for our healthcare interviews. The accuracy is incredible.',
      avatar: '👨‍⚕️'
    },
    {
      name: 'Dr. Emily Johnson',
      role: 'Market Research Manager, HealthTech Inc',
      content: '15+ languages supported means we can conduct global research without language barriers.',
      avatar: '👩‍💼'
    }
  ];

  const productShowcases = [
    {
      title: 'Upload Interface',
      subtitle: 'Drag & Drop Experience',
      gradient: 'from-blue-500/20 via-cyan-500/20 to-blue-600/20',
      content: (
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
              <div className="text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Drag & drop audio/video files here</p>
                <p className="text-xs text-gray-500 mt-1">or click to browse your computer</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span>Supported: .mp3, .mp4, .wav, .m4a</span>
              <span>Max: 500MB</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Language Detection',
      subtitle: 'AI-Powered Recognition',
      gradient: 'from-green-500/20 via-emerald-500/20 to-teal-500/20',
      content: (
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <Languages className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">Detected Language</span>
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Italian</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Confidence</span>
                <span className="text-green-600 font-medium">99.2%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-1 rounded-full" style={{width: '99.2%'}}></div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'I:/R: Formatting',
      subtitle: 'Speaker Identification',
      gradient: 'from-purple-500/20 via-pink-500/20 to-rose-500/20',
      content: (
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  I
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">Regarding vector-borne diseases, what do you identify as the primary challenges, difficulties, and greatest satisfactions in your experience?</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  R
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">Personally, the main challenges are associated with the most prevalent diseases in our region. Specifically, with filariasis...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  // Project Management with Analysis - dynamic images (drop files into /public/pm/ with these names)
  const projectSteps = [
    { title: 'Configure Project', desc: 'Define goals, markets, respondent types, timelines', icon: Settings },
    { title: 'Upload Documents', desc: 'Transcripts, guides, notes, and reference materials', icon: FileText },
    { title: 'Run Analysis (22+)', desc: 'Healthcare-specific modes with structured outputs', icon: BarChart3 },
  ];

  const projectImages = [
    {
      title: 'Concept Brief',
      tag: 'Project Overview',
      src: '/pm/concept-test.svg',
      bullets: ['Stakeholder: HCP', 'Country: France', 'Language: EN', '4 Documents'],
      icon: CheckCircle2,
    },
    {
      title: 'Research Dashboard',
      tag: 'Dashboard',
      src: '/pm/dashboard.svg',
      bullets: ['Total Projects • Active Transcripts', 'Analysis Complete • Documents', 'Recent Projects list', 'Quick Actions'],
      icon: BarChart3,
    },
    {
      title: 'Mode Analysis',
      tag: 'Journey/Table Output',
      src: '/pm/mode-analysis.svg',
      bullets: ['Stages • Actions • Emotions', 'Triggers • Duration', 'Friction • Touchpoints', 'Journey Flow'],
      icon: Table,
    },
    {
      title: 'Strategic Themes',
      tag: 'Theme Summary',
      src: '/pm/strategic-themes.svg',
      bullets: ['Top themes extracted', 'Rationale per theme', 'Supporting quotes', 'Export to Excel'],
      icon: Brain,
    },
    {
      title: 'Executive Summary',
      tag: 'Narrative Output',
      src: '/pm/executive-summary.svg',
      bullets: ['Concise narrative', 'Clear recommendations', 'Slide-ready bullets', 'Market context'],
      icon: ScrollText,
    },
    {
      title: 'AI Research Assistant',
      tag: 'Chat Over Insights',
      src: '/pm/ai-assistant.svg',
      bullets: ['Analysis data ready', 'Ask for barriers or themes', 'Quote extraction', 'Create summaries'],
      icon: MessageSquare,
    },
  ];

  const contentAnalysisImages = [
    {
      title: 'Content Analysis (Platform)',
      tag: 'Content Platform',
      src: '/pm/content-analysis-platform.svg',
      bullets: ['Auto-categorized by question', 'Respondent-aligned QUOTE / SUMMARY / THEME', 'Per-interview columns', 'Export-ready'],
    },
    {
      title: 'Excel Export',
      tag: 'Excel Export',
      src: '/pm/content-analysis-excel.svg',
      bullets: ['Sheet view by category', 'Columns per respondent', 'Rows for QUOTE / SUMMARY / THEME', 'Clean formatting'],
    },
  ];

  // Lightweight replicas to display if PNGs are not present
  const AnalysisReplica: React.FC<{ kind: string }> = ({ kind }) => {
    if (kind === 'Project Overview') {
      return (
        <div className="h-80 bg-white p-4 text-[12px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 font-semibold">CB</div>
              <div>
                <div className="h-3 w-44 bg-gray-200 rounded mb-1" />
                <div className="h-2.5 w-72 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-full bg-red-500 text-white text-[11px] font-semibold">HIGH</span>
              <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[11px]">Concept Testing</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4">
            <div className="flex gap-2"><span className="text-gray-700 font-semibold">Stakeholder:</span><span className="text-gray-600">HCP</span></div>
            <div className="flex gap-2"><span className="text-gray-700 font-semibold">Country:</span><span className="text-gray-600">France</span></div>
            <div className="flex gap-2"><span className="text-gray-700 font-semibold">Therapy Area:</span><span className="text-gray-600">Not specified</span></div>
            <div className="flex gap-2"><span className="text-gray-700 font-semibold">Language:</span><span className="text-gray-600">EN</span></div>
          </div>
          <div className="mt-3 border-t border-gray-200 pt-2">
            <div className="text-[11px] font-semibold text-gray-700">RESEARCH GOAL</div>
            <div className="space-y-1 mt-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-3 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-blue-100 bg-indigo-50/70 h-12 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-extrabold text-blue-600">4</div>
              <div className="text-[11px] font-semibold text-blue-600 tracking-wide">DOCUMENTS</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-4 text-[11px]">
            <div>
              <div className="text-gray-700 font-semibold">CREATED</div>
              <div className="text-gray-600 mt-1">Jul 25, 2025</div>
            </div>
            <div>
              <div className="text-gray-700 font-semibold">UPDATED</div>
              <div className="text-gray-600 mt-1">Aug 7, 2025</div>
            </div>
            <div>
              <div className="text-gray-700 font-semibold">DEADLINE</div>
              <div className="text-gray-600 mt-1">Jun 14, 2026</div>
            </div>
          </div>
        </div>
      )
    }
    if (kind === 'Setup & Context') {
      return (
        <div className="h-80 bg-white p-4 text-[12px]">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="h-2 w-24 bg-gray-200 rounded" />
                <div className="h-8 rounded-lg bg-gray-50 border border-gray-100" />
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 h-16" />
        </div>
      )
    }
    if (kind === 'Dashboard') {
      return (
        <div className="h-80 bg-white p-4 text-[12px]">
          <div className="flex">
            {/* Sidebar */}
            <div className="w-24 mr-3">
              <div className="h-6 w-20 rounded bg-gray-200 mb-3" />
              <div className="space-y-2">
                <div className="h-7 rounded-md bg-blue-50 border border-blue-200" />
                <div className="h-7 rounded-md bg-gray-50 border" />
                <div className="h-7 rounded-md bg-gray-50 border" />
              </div>
            </div>
            {/* Main content */}
            <div className="flex-1">
              <div className="h-6 w-48 rounded bg-gray-200 mb-3" />
              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-gray-50 border" />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <div className="h-6 w-32 rounded bg-gray-200" />
                  <div className="h-20 rounded-lg bg-gray-50 border" />
                  <div className="h-20 rounded-lg bg-gray-50 border" />
                  <div className="h-20 rounded-lg bg-gray-50 border" />
                </div>
                <div className="space-y-2">
                  <div className="h-6 w-28 rounded bg-gray-200" />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-lg bg-gray-50 border" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    if (kind === 'Journey/Table Output') {
      return (
        <div className="h-80 bg-white p-3">
          <div className="flex items-center gap-2 text-[11px] text-gray-600 mb-2">
            <span className="px-2 py-1 rounded-full border border-blue-400 text-blue-600">Mode Analysis</span>
            <span>Strategic Themes</span>
            <span>Summary</span>
          </div>
          <div className="grid grid-cols-9 gap-2 text-[11px] mb-2">
            {['Quote','Stage','Action','Emotion','Trigger','Duration','Friction','Touchpoint','Journey'].map(h => (
              <div key={h} className="px-2 py-1 rounded bg-gray-50 border border-gray-200 text-gray-700 font-medium text-[10px]">{h}</div>
            ))}
          </div>
          <div className="grid grid-cols-9 gap-2">
            {Array.from({ length: 27 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-50 border border-gray-100 rounded" />
            ))}
          </div>
        </div>
      )
    }
    if (kind === 'Theme Summary') {
      return (
        <div className="h-80 bg-white p-3">
          <div className="flex items-center gap-2 text-[11px] text-gray-600 mb-2">
            <span>Mode Analysis</span>
            <span className="px-2 py-1 rounded-full border border-blue-400 text-blue-600">Strategic Themes</span>
            <span>Summary</span>
          </div>
          <div className="mb-2 text-[12px] font-semibold text-gray-800">Strategic Themes Summary</div>
          <div className="grid grid-cols-12 gap-2 text-[10px] font-medium text-gray-700">
            <div className="col-span-3 px-2 py-1 rounded bg-gray-50 border border-gray-200">Theme</div>
            <div className="col-span-5 px-2 py-1 rounded bg-gray-50 border border-gray-200">Rationale</div>
            <div className="col-span-4 px-2 py-1 rounded bg-gray-50 border border-gray-200">Supporting Quotes</div>
          </div>
          <div className="mt-2 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <div className="col-span-3 h-10 rounded bg-gray-50 border border-gray-100" />
                <div className="col-span-5 h-10 rounded bg-gray-50 border border-gray-100" />
                <div className="col-span-4 h-10 rounded bg-gray-50 border border-gray-100" />
              </div>
            ))}
          </div>
        </div>
      )
    }
    if (kind === 'Narrative Output') {
      return (
        <div className="h-80 bg-white p-4">
          <div className="text-[13px] font-semibold text-gray-900 mb-2">Executive Summary</div>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-3 bg-gray-100 rounded" />
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <div className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11px]">Re-run Analysis</div>
            <div className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11px]">Export to Excel</div>
          </div>
        </div>
      )
    }
    if (kind === 'Content Platform') {
      return (
        <div className="h-80 bg-white p-3">
          <div className="grid grid-cols-12 gap-2 text-[11px]">
            <div className="col-span-3 rounded-lg bg-gradient-to-b from-gray-50 to-white border border-gray-200 p-2">
              <div className="text-[12px] font-semibold text-gray-800 mb-2">Question Category</div>
              {['Warm-up','Satisfaction & Challenges','Diagnosis & Decision-Making'].map((t) => (
                <div key={t} className="h-10 rounded bg-white/90 border border-gray-200 mb-2 flex items-center px-2 text-gray-700 text-[11px] shadow-sm">{t}</div>
              ))}
            </div>
            <div className="col-span-9 rounded-lg border border-gray-200 bg-white">
              <div className="grid grid-cols-3 gap-2 p-2 text-[12px] font-semibold text-gray-800">
                <div className="text-center rounded-md py-1 bg-gradient-to-r from-sky-50 to-indigo-50">Jane Doe</div>
                <div className="text-center rounded-md py-1 bg-gradient-to-r from-emerald-50 to-teal-50">Camille Dupont</div>
                <div className="text-center rounded-md py-1 bg-gradient-to-r from-fuchsia-50 to-purple-50">Yamada Tarō</div>
              </div>
              <div className="grid grid-cols-3 gap-2 px-2 pb-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="rounded-lg bg-white border border-gray-200 p-2 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                    <div className="text-[10px] font-semibold text-blue-700 inline-block px-1.5 py-0.5 rounded bg-blue-50">QUOTE</div>
                    <div className="h-2 mt-1 bg-gray-200 rounded" />
                    <div className="text-[10px] font-semibold text-green-700 mt-2 inline-block px-1.5 py-0.5 rounded bg-green-50">SUMMARY</div>
                    <div className="h-2 mt-1 bg-gray-200 rounded" />
                    <div className="text-[10px] font-semibold text-purple-700 mt-2 inline-block px-1.5 py-0.5 rounded bg-purple-50">THEME</div>
                    <div className="h-2 mt-1 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    }
    if (kind === 'Excel Export') {
      return (
        <div className="h-80 bg-white p-3">
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-4 text-[11px] font-medium text-gray-800 bg-gradient-to-r from-gray-50 via-sky-50 to-indigo-50 border-b border-gray-200">
              <div className="px-2 py-1">Question Category</div>
              <div className="px-2 py-1">Jane Doe</div>
              <div className="px-2 py-1">Camille Dupont</div>
              <div className="px-2 py-1">Yamada Tarō</div>
            </div>
            {Array.from({ length: 6 }).map((_, r) => (
              <div key={r} className="grid grid-cols-4 text-[11px] border-b border-gray-100">
                <div className="px-2 py-2 bg-white font-semibold text-gray-700">{r % 3 === 0 ? 'QUOTE' : r % 3 === 1 ? 'SUMMARY' : 'THEME'}</div>
                <div className="px-2 py-2 bg-blue-50/40"><div className="h-2 bg-blue-100 rounded" /></div>
                <div className="px-2 py-2 bg-green-50/40"><div className="h-2 bg-green-100 rounded" /></div>
                <div className="px-2 py-2 bg-purple-50/40"><div className="h-2 bg-purple-100 rounded" /></div>
              </div>
            ))}
          </div>
        </div>
      )
    }
    // Chat Over Insights
    return (
      <div className="h-80 bg-white p-4">
        <div className="text-[13px] font-semibold text-gray-900">AI Research Assistant</div>
        <div className="mt-2 text-[11px] text-green-700 bg-green-50 inline-flex px-2 py-1 rounded">Analysis Data Ready</div>
        <div className="mt-3 space-y-3">
          <div className="max-w-[75%] rounded-2xl px-3 py-2 bg-gray-50 border border-gray-100 text-[12px]" />
          <div className="ml-auto max-w-[70%] rounded-2xl px-3 py-2 bg-indigo-50 border border-indigo-100 text-[12px]" />
          <div className="max-w-[60%] rounded-2xl px-3 py-2 bg-gray-50 border border-gray-100 text-[12px]" />
        </div>
        <div className="mt-3 flex gap-2 text-[11px] text-gray-700">
          <div className="px-2 py-1 rounded-full bg-gray-50 border">What makes HCPs hesitant?</div>
          <div className="px-2 py-1 rounded-full bg-gray-50 border">List friction points in digital experience</div>
        </div>
      </div>
    )
  };

  const ImageCard: React.FC<{ img: { title: string; tag: string; src: string } }> = ({ img }) => {
    const [useImage, setUseImage] = useState(true);
    return (
      <div className="rounded-2xl overflow-hidden border border-gray-100 bg-gray-50">
        {useImage ? (
          <img
            src={img.src}
            alt={img.title}
            className="w-full h-80 object-cover object-top"
            onError={() => setUseImage(false)}
          />
        ) : (
          <AnalysisReplica kind={img.tag} />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <AnimatedWaves />
      <FloatingElements />

      {/* Navigation */}
      <AppleNavbar />

      {/* ElevenLabs Style Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 lg:py-32 flex items-center justify-center min-h-screen">
        <div className="max-w-2xl mx-auto text-center">
          {/* Central Card - ElevenLabs Style */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="bg-white/95 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/20"
          >
            {/* II Icon with subtle animation */}
            <motion.div 
              className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-8"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Pause className="w-8 h-8 text-white" />
            </motion.div>

            {/* Main Headline with staggered animation */}
            <motion.h1 
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black mb-8 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Create with the highest quality
              <br />
              <motion.span 
                className="bg-gradient-to-r from-black to-gray-600 bg-clip-text text-transparent"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: "200% 200%",
                }}
              >
                AI Research Platform
              </motion.span>
            </motion.h1>

            {/* CTA Button with hover animation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <AppleButton size="lg" variant="primary" className="mb-6">
                <Link to="/auth">GET STARTED FREE</Link>
              </AppleButton>
            </motion.div>

            {/* Login Link */}
            <motion.p 
              className="text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              Already have an account?{' '}
              <Link to="/auth" className="text-blue-600 hover:underline font-medium">
                Log in
              </Link>
            </motion.p>

            {/* Social Icons with staggered animation */}
            <motion.div 
              className="flex items-center justify-center space-x-4 mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
            >
              {[
                { icon: X, name: 'Twitter' },
                { icon: Linkedin, name: 'LinkedIn' },
                { icon: Github, name: 'GitHub' },
                { icon: Youtube, name: 'YouTube' },
                { icon: MessageCircle, name: 'Discord' }
              ].map((social, index) => (
                <motion.div
                  key={social.name}
                  className="w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: 1.2 + index * 0.1,
                    type: "spring",
                    stiffness: 300
                  }}
                >
                  <social.icon className="w-4 h-4 text-black" />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Voice Chat Widget - Bottom Right with entrance animation */}
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 1.5, type: "spring", stiffness: 200 }}
          className="absolute bottom-8 right-8"
        >
          <motion.div 
            className="bg-black text-white px-4 py-3 rounded-full flex items-center space-x-3 shadow-lg cursor-pointer"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Mic className="w-4 h-4" />
            <span className="font-medium">VOICE CHAT</span>
            <Flag className="w-4 h-4" />
            <ChevronDown className="w-4 h-4" />
          </motion.div>
          <motion.p 
            className="text-xs text-gray-500 mt-2 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 2 }}
          >
            Powered by FMR QualAI Conversational AI
          </motion.p>
        </motion.div>
      </section>

      {/* Product Showcase Section - ElevenLabs Style */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 lg:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-black mb-4">
              See FMR QualAI in Action
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the future of transcript processing with our intuitive, AI-powered platform.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {productShowcases.map((showcase, index) => (
              <motion.div
                key={showcase.title}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  duration: 0.6, 
                  delay: index * 0.2,
                  type: "spring",
                  stiffness: 100
                }}
                viewport={{ once: true }}
                className="relative group"
                whileHover={{ y: -10 }}
              >
                <motion.div 
                  className={`absolute inset-0 bg-gradient-to-br ${showcase.gradient} rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-300`}
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.6, 0.8, 0.6]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.5
                  }}
                />
                <motion.div 
                  className="relative bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="space-y-4">
                    <motion.div 
                      className="text-center"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <h3 className="text-xl font-bold text-black mb-1">{showcase.title}</h3>
                      <p className="text-sm text-gray-600">{showcase.subtitle}</p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      {showcase.content}
                    </motion.div>
                    <motion.div 
                      className="flex items-center justify-center pt-4"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                    >
                      <motion.button 
                        className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Play className="w-4 h-4" />
                        <span>Try Demo</span>
                      </motion.button>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Transcript Feature Showcase - Based on User's Screenshot */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-black mb-4">
              Professional Transcript Management
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Complete transcript processing with automatic language detection, translation, and I:/R: formatting.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden"
          >
            {/* Header Section */}
            <div className="bg-gray-50 p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-semibold text-black">20250731-150536.MP4</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">completed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <Play className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <Edit3 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <Download className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
              
              {/* Metadata */}
              <div className="flex items-center space-x-6 mt-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Created: Aug 06, 2025</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>Updated: 22:50</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Flag className="w-4 h-4" />
                  <span>Italian</span>
                </div>
              </div>

              {/* Audio Player */}
              <div className="flex items-center space-x-4 mt-4">
                <span className="text-sm text-gray-600">0:00</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full w-1/3"></div>
                </div>
                <span className="text-sm text-gray-600">2:10</span>
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-gray-600" />
                  <div className="w-16 bg-gray-200 rounded-full h-1">
                    <div className="bg-blue-500 h-1 rounded-full w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6">
              <h4 className="font-semibold text-black mb-4">Formatted Transcript (I:/R:)</h4>
              <div className="space-y-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    I
                  </div>
                  <p className="text-gray-800">Regarding vector-borne diseases, what do you identify as the primary challenges, difficulties, and greatest satisfactions in your experience?</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    R
                  </div>
                  <p className="text-gray-800">Personally, the main challenges are associated with the most prevalent diseases in our region. Specifically, with filariasis, at least within the urban setting, we have largely managed to maintain control, thanks to the sustained efforts of our colleagues over the years. Currently, leishmaniasis is emerging more significantly, even in our areas, alt...</p>
                </div>
              </div>

              {/* Original and Translation */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h5 className="font-medium text-black mb-2">Original (Italian)</h5>
                  <p className="text-sm text-gray-700">Gli argomenti che spontaneamente le vengono in mente, malattia da vettore, quali possono essere le sfide maggiori, le difficoltà, le soddisfazioni maggiori? Ah, cioè inteso personalmente, vabbè, le s...</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h5 className="font-medium text-black mb-2">English Translation</h5>
                  <p className="text-sm text-gray-700">The topics that spontaneously come to mind for you—vector-borne diseases—what do you see as the biggest challenges, the difficulties, the greatest satisfactions? Ah, you mean personally, well, the bi...</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Project Management with Analysis - Real Showcase */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 lg:py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        {/* dotted bg */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,_rgba(0,0,0,0.05)_1px,_transparent_1px)] [background-size:12px_12px]" />
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 shadow-sm mb-6">
              📊 Project Management with Analysis
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-black mb-4">
              See FMR QualAI Project Workflow in Action
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Configure projects, upload research materials, and generate healthcare-specific analyses across 22+ modes.
            </p>
          </motion.div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {projectSteps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-gray-200 p-6 bg-white shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center mb-4">
                  <s.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-black">{s.title}</h3>
                <p className="text-gray-600 mt-2 text-sm">{s.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Image Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {projectImages.map((img, index) => (
              <motion.div
                key={img.title}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative group"
              >
                <div className="absolute inset-0 rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-300 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200" />
                <div className="relative rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <div className="text-sm font-medium text-gray-800">{img.title}</div>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{img.tag}</span>
                  </div>
                  <div className="px-4 pb-4">
                    <ImageCard img={img} />
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] text-gray-700">
                      {img.bullets?.map((b: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400" />
                          <span className="truncate">{b}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-center">
                      <button className="mt-4 inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white bg-black hover:bg-gray-900">
                        ▶ Try Demo
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <a href="/features" className="inline-flex items-center px-5 py-3 rounded-full text-sm font-medium text-white bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 hover:opacity-95">
              View All Analysis Modes (22+)
            </a>
          </div>
        </div>
      </section>

      {/* Content Analysis - Platform and Excel */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 lg:py-24 bg-white relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 shadow-sm mb-6">
              🧠 Content Analysis
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-black mb-4">Automatic Content Analysis by Question and Respondent</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Identify themes from interview discussions, align quotes to each respondent, and export a clean Excel with QUOTE / SUMMARY / THEME per question.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {contentAnalysisImages.map((img, index) => (
              <motion.div
                key={img.title}
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative group"
              >
                <div className="absolute inset-0 rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-300 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200" />
                <div className="relative rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <div className="text-sm font-medium text-gray-800">{img.title}</div>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{img.tag}</span>
                  </div>
                  <div className="px-4 pb-4">
                    <ImageCard img={img as any} />
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] text-gray-700">
                      {img.bullets?.map((b: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400" />
                          <span className="truncate">{b}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-center">
                      <button className="mt-4 inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white bg-black hover:bg-gray-900">▶ Try Demo</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-black mb-4">
              Powerful Features for Modern Research
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From upload to export, every step is optimized for healthcare research professionals.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                onHoverStart={() => setActiveFeature(index)}
              >
                <MagicCard className="h-full">
                  <div className="p-6 space-y-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center text-white shadow-lg`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-black">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                    <div className="pt-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {feature.demo}
                      </span>
                    </div>
                  </div>
                </MagicCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-black mb-4">
              Simple 4-Step Workflow
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From raw audio to professional transcripts in minutes, not hours.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {workflowSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <AppleCard padding="lg" className="h-full">
                  <div className="text-center space-y-4">
                    <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto">
                      {step.step}
                    </div>
                    <div className="w-8 h-8 text-gray-600 mx-auto">
                      {step.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-black">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </AppleCard>
                
                {index < workflowSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-gray-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-black mb-4">
              Trusted by Research Leaders
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See what healthcare research professionals are saying about FMR QualAI.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <AppleCard padding="lg" className="h-full">
                  <div className="space-y-4">
                    <div className="text-3xl">{testimonial.avatar}</div>
                    <p className="text-gray-600 leading-relaxed">
                      "{testimonial.content}"
                    </p>
                    <div>
                      <div className="font-semibold text-black">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                    </div>
                  </div>
                </AppleCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 lg:py-24 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white">
              Ready to transform your research?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Join thousands of researchers who trust FMR QualAI to deliver actionable insights.
            </p>
            <AppleButton size="lg" variant="secondary">
              <Link to="/auth">Start Your Free Trial</Link>
            </AppleButton>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <AppleFooter />
    </div>
  );
};

export default AppleLanding; 