/**
 * Features Page
 * 
 * Design Rationale:
 * - Apple-style minimalism in pure black/white
 * - Clear hierarchy and generous whitespace
 * - Subtle, professional animations with Framer Motion
 * - Mobile-first responsive layout
 */

import React from 'react';
import { motion } from 'framer-motion';

const sectionTitle = (
  title: React.ReactNode,
  subtitle?: string,
) => (
  <div className="relative text-center mb-16">
    {/* Subtle dotted background */}
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,_rgba(0,0,0,0.06)_1px,_transparent_1px)] [background-size:12px_12px] rounded-3xl" />

    <motion.h1
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative text-4xl md:text-5xl font-bold text-black"
    >
      {title}
    </motion.h1>
    {subtitle && (
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative text-lg md:text-xl text-gray-600 mt-4 max-w-3xl mx-auto"
      >
        {subtitle}
      </motion.p>
    )}
  </div>
);

const Features: React.FC = () => {
  const groups = [
    {
      title: 'Transcript Processing',
      features: [
        { name: 'Drag & Drop Upload', desc: 'Upload audio/video with validation, progress, and large-file support.' },
        { name: 'Language Detection', desc: 'Auto-detect 15+ languages with confidence scoring.' },
        { name: 'Real-time Transcription', desc: 'Azure Speech AI with high accuracy and speed.' },
        { name: 'Smart Translation', desc: 'Original preserved with English translation side-by-side.' },
        { name: 'I:/R: Formatting', desc: 'Interviewer/Respondent formatting for healthcare interviews.' },
        { name: 'Export Options', desc: 'PDF, Word, and Text with branding and timestamps.' },
      ],
    },
    {
      title: 'Project Management (Coming Soon)',
      features: [
        { name: 'Projects & Teams', desc: 'Organize research by project, collaborate in real-time.' },
        { name: 'Analytics', desc: 'Usage metrics and performance insights.' },
        { name: 'Reporting', desc: 'Export executive summaries and visual reports.' },
      ],
    },
    {
      title: 'Content Analysis (Coming Soon)',
      features: [
        { name: 'AI Insights', desc: 'Key themes, trends, and sentiment at a glance.' },
        { name: 'Comparisons', desc: 'Cross-market or cross-respondent comparisons.' },
        { name: 'Recommendations', desc: 'Next-step suggestions powered by AI.' },
      ],
    },
  ];

  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="px-4 sm:px-6 lg:px-8 py-20">
        {/* Gradient badge */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 shadow-sm">
            ✨ Advanced Features
          </span>
        </div>
        {sectionTitle(
          <>
            Powerful Features for{' '}
            <span className="bg-gradient-to-r from-black via-blue-500 to-purple-500 bg-clip-text text-transparent">
              Healthcare Research
            </span>
          </>,
          'Everything you need to streamline healthcare research — clean, fast, and reliable.'
        )}

        {/* Feature Groups */}
        <div className="space-y-20">
          {groups.map((group) => (
            <div key={group.title}>
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-2xl md:text-3xl font-semibold text-black mb-8 text-center"
              >
                {group.title}
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.features.map((f, i) => (
                  <motion.div
                    key={f.name}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: (i % 3) * 0.06 }}
                    viewport={{ once: true }}
                    className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <h3 className="text-lg font-semibold text-black">{f.name}</h3>
                    <p className="text-gray-600 mt-2">{f.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Features;