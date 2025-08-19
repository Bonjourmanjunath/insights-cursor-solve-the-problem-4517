/**
 * Pricing Page
 * 
 * Design Rationale:
 * - Pure black/white with gentle gradients for emphasis
 * - Clear conversion hierarchy (most popular, CTAs)
 */

import React from 'react';
import { motion } from 'framer-motion';

const plans = [
  {
    name: 'Free Trial',
    price: '$0',
    cadence: '/month',
    cta: 'Start Free Trial',
    features: ['3 transcripts per month', 'Basic transcription', 'Language detection', 'Community support'],
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$99',
    cadence: '/month',
    cta: 'Get Started',
    features: ['50 transcripts per month', 'All transcription features', 'I:/R: formatting', 'Export options', 'Priority support'],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    cadence: 'pricing',
    cta: 'Contact Sales',
    features: ['Unlimited transcripts', 'Custom integrations', 'Advanced analytics', 'HIPAA compliance', 'Dedicated support'],
    highlighted: false,
  },
];

const Pricing: React.FC = () => {
  return (
    <main className="bg-black">
      {/* Hero */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 text-center relative overflow-hidden">
        {/* dotted bg */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,_rgba(0,0,0,0.05)_1px,_transparent_1px)] [background-size:12px_12px]" />

        {/* gradient badge */}
        <div className="relative flex justify-center mb-6">
          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 shadow-sm">
            💰 Transparent Pricing
          </span>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-4xl md:text-5xl font-bold text-black"
        >
          Simple,{' '}
          <span className="bg-gradient-to-r from-black via-sky-500 to-purple-500 bg-clip-text text-transparent">
            Transparent
          </span>{' '}
          Pricing
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative text-lg md:text-xl text-gray-600 mt-4 max-w-3xl mx-auto"
        >
          Choose the plan that fits your research needs. No hidden fees, cancel anytime.
        </motion.p>
      </section>

      {/* Plans */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              viewport={{ once: true }}
              className={`relative rounded-2xl border ${
                p.highlighted ? 'border-purple-300 shadow-lg' : 'border-gray-200 shadow-sm'
              } p-8 bg-white`}
            >
              {p.highlighted && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 shadow">
                  Most Popular
                </span>
              )}

              <h3 className="text-xl font-semibold text-black">{p.name}</h3>
              <div className="flex items-end gap-1 mt-4">
                <span className="text-4xl font-bold text-black">{p.price}</span>
                <span className="text-gray-600 mb-1">{p.cadence}</span>
              </div>
              <ul className="mt-6 space-y-2 text-gray-700">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-black" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button className={`mt-8 w-full rounded-2xl px-5 py-3 text-sm font-medium transition-all ${
                p.highlighted
                  ? 'text-white bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 hover:opacity-95'
                  : 'border border-gray-300 text-black hover:bg-gray-50'
              }`}>
                {p.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comparison Summary */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-semibold text-black text-center mb-8"
          >
            What’s included in every plan
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Secure & private', 'WCAG AA accessible', 'Fast support'].map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-gray-200 p-6 bg-white text-center"
              >
                <p className="text-black font-medium">{item}</p>
                <p className="text-gray-600 text-sm mt-2">Production-grade reliability and thoughtful UX in every tier.</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl mx-auto">
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-2xl font-semibold text-black text-center mb-10"
          >
            Frequently Asked Questions
          </motion.h3>
          <div className="space-y-6">
            {[
              { q: 'How accurate is the transcription?', a: 'Our AI achieves 99% accuracy using Azure Speech Services with specialized healthcare models.' },
              { q: 'What file formats are supported?', a: 'We support .mp3, .mp4, .wav, .m4a files up to 500MB with auto format detection.' },
              { q: 'Is my data secure?', a: 'Yes—enterprise-grade security with HIPAA compliance, encryption in transit and at rest.' },
            ].map((item) => (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="rounded-2xl border border-gray-200 p-6 bg-white"
              >
                <p className="text-black font-medium">{item.q}</p>
                <p className="text-gray-600 mt-2">{item.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Pricing;