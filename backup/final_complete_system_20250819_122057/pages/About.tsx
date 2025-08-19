/**
 * About Page
 * 
 * Design Rationale:
 * - Clean storytelling with subtle gradient accents
 */

import React from 'react';
import { motion } from 'framer-motion';

const About: React.FC = () => {
  const timeline = [
    { year: '2018', title: 'Founded', desc: 'FMR Global Health begins its AI research journey.' },
    { year: '2021', title: 'Platform Alpha', desc: 'Early platform for AI-driven transcript intelligence.' },
    { year: '2024', title: 'QualAI', desc: 'Launch of FMR QualAI for healthcare research teams.' },
  ];

  return (
    <main className="bg-black">
      {/* Hero */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 text-center relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,_rgba(0,0,0,0.05)_1px,_transparent_1px)] [background-size:12px_12px]" />
        <div className="relative flex justify-center mb-6">
          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 shadow-sm">
            📖 Our Story
          </span>
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-4xl md:text-5xl font-bold text-black"
        >
          About{' '}
          <span className="bg-gradient-to-r from-black via-pink-500 to-purple-500 bg-clip-text text-transparent">
            FMR Global Health
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative text-lg md:text-xl text-gray-600 mt-4 max-w-3xl mx-auto"
        >
          Transforming healthcare research with AI-powered insights and cutting-edge transcription technology
        </motion.p>
      </section>

      {/* Mission / Vision / Values */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { t: 'Mission', d: 'Revolutionize healthcare research with AI insights and seamless transcription that accelerates discovery.' },
            { t: 'Vision', d: 'Every research team has access to world-class AI tools that improve patient outcomes globally.' },
            { t: 'Values', d: 'Innovation, accuracy, security, and collaboration guide everything we do.' },
          ].map((x, i) => (
            <motion.div
              key={x.t}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              viewport={{ once: true }}
              className="border border-gray-200 rounded-2xl p-8 bg-white shadow-sm"
            >
              <h2 className="text-2xl font-semibold text-black mb-2">{x.t}</h2>
              <p className="text-gray-600">{x.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <motion.h3
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-semibold text-black text-center mb-10"
          >
            Our Journey
          </motion.h3>
          <div className="space-y-6">
            {timeline.map((t, i) => (
              <motion.div
                key={t.year}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                viewport={{ once: true }}
                className="border border-gray-200 rounded-2xl p-6 bg-white"
              >
                <div className="flex items-center justify-between">
                  <p className="text-black font-semibold">{t.title}</p>
                  <span className="text-gray-500 text-sm">{t.year}</span>
                </div>
                <p className="text-gray-600 mt-2">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default About;