/**
 * Contact Page
 * 
 * Design Rationale:
 * - Simple contact entry with clear, accessible form
 * - Pure black/white, subtle animations
 */

import React from 'react';
import { motion } from 'framer-motion';

const Contact: React.FC = () => {
  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 text-center relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,_rgba(0,0,0,0.05)_1px,_transparent_1px)] [background-size:12px_12px]" />
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-4xl md:text-5xl font-bold text-black"
        >
          Contact
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative text-lg md:text-xl text-gray-600 mt-4 max-w-2xl mx-auto"
        >
          We’re here to help with your research needs.
        </motion.p>
      </section>

      {/* Info + Form + Support/Demo */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form UI only */}
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06 }}
            viewport={{ once: true }}
            className="border border-gray-200 rounded-2xl p-8 bg-white"
            onSubmit={(e) => e.preventDefault()}
            aria-label="Contact form"
          >
            <h2 className="text-2xl font-semibold text-black mb-6">Send us a message</h2>
            <div className="grid grid-cols-1 gap-4">
              <label className="text-sm font-medium text-black" htmlFor="name">Name *</label>
              <input id="name" name="name" className="rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black" required />

              <label className="text-sm font-medium text-black mt-4" htmlFor="email">Email *</label>
              <input id="email" name="email" type="email" className="rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black" required />

              <label className="text-sm font-medium text-black mt-4" htmlFor="company">Company</label>
              <input id="company" name="company" className="rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black" />

              <label className="text-sm font-medium text-black mt-4" htmlFor="message">Message *</label>
              <textarea id="message" name="message" rows={5} className="rounded-2xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black" required />

              <button type="submit" className="mt-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white px-6 py-3 font-medium hover:opacity-95">
                Send Message
              </button>
            </div>
          </motion.form>

          <div className="grid grid-cols-1 gap-8">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="border border-gray-200 rounded-2xl p-8 bg-white"
            >
              <h2 className="text-2xl font-semibold text-black">Contact Information</h2>
              <div className="mt-6 space-y-3 text-gray-700">
                <p><span className="font-medium text-black">Email:</span> support@fmrglobalhealth.com</p>
                <p><span className="font-medium text-black">Phone:</span> +1 (555) 123-4567</p>
                <p><span className="font-medium text-black">Address:</span> FMR Global Health, Research District, Tech City</p>
                <p><span className="font-medium text-black">Hours:</span> Monday–Friday, 9 AM – 6 PM EST</p>
              </div>
            </motion.div>

            {/* Support */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.06 }}
              viewport={{ once: true }}
              className="border border-gray-200 rounded-2xl p-8 bg-white"
            >
              <h3 className="text-xl font-semibold text-black mb-4">Support</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800 text-sm">
                <p><span className="font-medium text-black">Response time:</span> Within 24 hours</p>
                <p><span className="font-medium text-black">Priority support:</span> For Pro users</p>
                <p><span className="font-medium text-black">Dedicated manager:</span> For Enterprise</p>
                <p><span className="font-medium text-black">Community support:</span> For Free Trial users</p>
              </div>
            </motion.div>

            {/* Schedule Demo */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              viewport={{ once: true }}
              className="border border-gray-200 rounded-2xl p-8 bg-white"
            >
              <h3 className="text-xl font-semibold text-black mb-4">Schedule a Demo</h3>
              <div className="text-gray-800 text-sm space-y-2">
                <p>Want to see FMR QualAI in action? Schedule a personalized demo with our team.</p>
                <p><span className="font-medium text-black">Duration:</span> 30-minute personalized demo</p>
                <p><span className="font-medium text-black">Availability:</span> Monday–Friday, flexible hours</p>
                <p><span className="font-medium text-black">Format:</span> Video call or in-person</p>
                <p><span className="font-medium text-black">Follow-up:</span> Custom implementation plan</p>
              </div>
              <button className="mt-6 w-full rounded-2xl border border-gray-800 px-6 py-3 font-medium hover:bg-gray-50">
                Schedule Demo
              </button>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Contact;