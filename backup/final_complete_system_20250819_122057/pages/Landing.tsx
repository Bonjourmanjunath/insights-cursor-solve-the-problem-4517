import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Play,
  Star,
  Shield,
  Clock,
  Brain as BrainIcon,
  MessageSquare,
  Download,
  Zap,
  Dna,
  Activity,
  Target,
  Users,
  Globe,
  Sparkles,
  TrendingUp,
  Award,
  CheckCircle,
  Heart,
  Microscope,
  Pill,
  Stethoscope,
  BarChart3,
  FileText,
  MessageCircle,
  User,
  Building2,
  MapPin,
  FlaskConical,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView,
} from "framer-motion";
import { useEffect, useRef } from "react";
import { DNAAnimation } from "@/components/ui/dna-animation";

// Perfect Elegant Design
const PerfectElegantDesign = () => {
  const designRef = useRef(null);
  const isInView = useInView(designRef, { once: true });

  return (
    <div ref={designRef} className="relative w-40 h-40">
      {/* Perfect Central Core */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-8 h-8 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.9, 1, 0.9],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Elegant Inner Ring */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-20 h-20 border border-blue-400/50 rounded-full transform -translate-x-1/2 -translate-y-1/2"
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Sophisticated Middle Ring */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-28 h-28 border border-green-400/40 rounded-full transform -translate-x-1/2 -translate-y-1/2"
        animate={{
          rotate: [360, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Perfect Outer Ring */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-36 h-36 border border-white/30 rounded-full transform -translate-x-1/2 -translate-y-1/2"
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Elegant Corner Dots */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-blue-400/80 rounded-full"
          style={{
            left: `${50 + Math.cos((i * Math.PI) / 2) * 18}%`,
            top: `${50 + Math.sin((i * Math.PI) / 2) * 18}%`,
          }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.7,
          }}
        />
      ))}

      {/* Sophisticated Pulse Waves */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-32 h-32 border border-white/20 rounded-full transform -translate-x-1/2 -translate-y-1/2"
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.2, 0, 0.2],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />

      <motion.div
        className="absolute top-1/2 left-1/2 w-32 h-32 border border-blue-400/30 rounded-full transform -translate-x-1/2 -translate-y-1/2"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0, 0.15],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeOut",
          delay: 2,
        }}
      />

      {/* Floating Accent Elements */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-white/60 rounded-full"
        animate={{
          x: [0, 8, 0],
          y: [0, -8, 0],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />

      <motion.div
        className="absolute bottom-1/4 right-1/4 w-1.5 h-1.5 bg-blue-400/60 rounded-full"
        animate={{
          x: [0, -8, 0],
          y: [0, 8, 0],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      />
    </div>
  );
};

// Advanced Particle System with Healthcare Icons
const AdvancedParticleSystem = () => {
  const particles = [
    { icon: Heart, color: "text-red-400", delay: 0 },
    { icon: Microscope, color: "text-blue-400", delay: 0.5 },
    { icon: Pill, color: "text-green-400", delay: 1 },
    { icon: Stethoscope, color: "text-purple-400", delay: 1.5 },
    { icon: Dna, color: "text-cyan-400", delay: 2 },
    { icon: FlaskConical, color: "text-yellow-400", delay: 2.5 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(40)].map((_, i) => {
        const particle = particles[i % particles.length];
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              y: [0, -150, -300],
              x: [0, Math.random() * 80 - 40, Math.random() * 120 - 60],
              rotate: [0, 360],
            }}
            transition={{
              duration: 10 + Math.random() * 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 8 + particle.delay,
            }}
          >
            <particle.icon
              className={`h-5 w-5 ${particle.color} opacity-70 drop-shadow-lg`}
            />
          </motion.div>
        );
      })}
    </div>
  );
};

// Animated Analysis Showcase with Dynamic Scroll Transformations
const AnimatedAnalysisShowcase = () => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.8]);

  const analysisTypes = [
    {
      icon: BarChart3,
      title: "FMR Dish Analysis",
      description: "Core qualitative insights organized by questions",
      color: "from-blue-500 to-purple-600",
      delay: 0,
    },
    {
      icon: Activity,
      title: "Mode Analysis",
      description: "Analysis tailored to your project type",
      color: "from-green-500 to-blue-600",
      delay: 0.2,
    },
    {
      icon: BrainIcon,
      title: "Strategic Themes",
      description: "High-level themes and strategic insights",
      color: "from-purple-500 to-pink-600",
      delay: 0.4,
    },
    {
      icon: FileText,
      title: "Executive Summary",
      description: "Condensed insights and recommendations",
      color: "from-orange-500 to-red-600",
      delay: 0.6,
    },
  ];

  return (
    <section className="py-40 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, type: "spring", stiffness: 100 }}
          viewport={{ once: true }}
          style={{ y, scale, opacity }}
          className="text-center mb-20"
        >
          <h2 className="text-6xl md:text-7xl font-bold mb-12 leading-tight">
            See How{" "}
            <motion.span
              className="bg-gradient-to-r from-white via-green-400 to-blue-400 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                backgroundSize: "200% 200%",
              }}
            >
              Analysis
            </motion.span>{" "}
            Works
          </h2>
          <p className="text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Experience the power of AI-driven healthcare research analysis
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {analysisTypes.map((type, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: type.delay,
                type: "spring",
                stiffness: 100,
              }}
              viewport={{ once: true }}
              whileHover={{
                y: -10,
                scale: 1.02,
                transition: { duration: 0.3 },
              }}
              style={{
                y: useTransform(scrollYProgress, [0, 1], [0, index * 10]),
              }}
              className="group"
            >
              <div className="relative bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 hover:border-white/30 transition-all duration-500 hover:shadow-2xl hover:shadow-white/10 h-full">
                {/* Gradient Background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${type.color} opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity duration-500`}
                />

                {/* Icon with 3D Effect */}
                <motion.div
                  className={`relative w-16 h-16 bg-gradient-to-r ${type.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                  whileHover={{ rotateY: 180 }}
                  transition={{ duration: 0.6 }}
                >
                  <type.icon className="h-8 w-8 text-white" />
                </motion.div>

                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 group-hover:bg-clip-text transition-all duration-300">
                  {type.title}
                </h3>
                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                  {type.description}
                </p>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Animated Project Cards Showcase with Dynamic Scroll Transformations
const AnimatedProjectCardsShowcase = () => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.05]);

  const projects = [
    {
      title: "Wound Care Personas and Customer Journey Mapping",
      description:
        "Understand each milestone encountered along the Decision Making Journey: HCP's insights on their emotional and rational journey...",
      documents: 3,
      priority: "MEDIUM",
      delay: 0,
    },
    {
      title: "Customer Journey Mapping Wound Care",
      description: "No description provided",
      documents: 3,
      priority: "MEDIUM",
      delay: 0.2,
    },
  ];

  return (
    <section className="py-40 px-4 sm:px-6 lg:px-8 bg-white/5 backdrop-blur-sm relative">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, type: "spring", stiffness: 100 }}
          viewport={{ once: true }}
          style={{ y, scale }}
          className="text-center mb-20"
        >
          <h2 className="text-6xl md:text-7xl font-bold mb-12 leading-tight">
            Project{" "}
            <motion.span
              className="bg-gradient-to-r from-white via-blue-400 to-purple-400 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                backgroundSize: "200% 200%",
              }}
            >
              Management
            </motion.span>
          </h2>
          <p className="text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Organize and manage your healthcare research projects with ease
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: project.delay,
                type: "spring",
                stiffness: 100,
              }}
              viewport={{ once: true }}
              whileHover={{
                y: -5,
                scale: 1.01,
                transition: { duration: 0.3 },
              }}
              style={{
                y: useTransform(scrollYProgress, [0, 1], [0, index * 15]),
              }}
              className="group"
            >
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 hover:border-white/30 transition-all duration-500 hover:shadow-2xl hover:shadow-white/10">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Building2 className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 group-hover:bg-clip-text transition-all duration-300">
                        {project.title}
                      </h3>
                    </div>
                  </div>
                  <Badge className="px-3 py-1.5 font-semibold rounded-full bg-blue-500/20 text-blue-300 border-blue-400/30">
                    {project.priority}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-400 mb-6 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                  {project.description}
                </p>

                {/* Project Details */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <User className="h-4 w-4" />
                    <span>Not specified</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin className="h-4 w-4" />
                    <span>Not specified</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <FlaskConical className="h-4 w-4" />
                    <span>Not specified</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Globe className="h-4 w-4" />
                    <span>EN</span>
                  </div>
                </div>

                {/* Documents Count */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 text-center mb-6">
                  <motion.div
                    className="text-4xl font-bold text-blue-600 mb-2"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: project.delay + 0.3 }}
                    viewport={{ once: true }}
                  >
                    {project.documents}
                  </motion.div>
                  <div className="text-sm font-semibold text-blue-700 uppercase tracking-wide">
                    Documents
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 bg-white/5 hover:bg-blue-50 border-white/20 hover:border-blue-300 text-white hover:text-blue-700 font-medium"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 bg-white/5 hover:bg-green-50 border-white/20 hover:border-green-300 text-white hover:text-green-700 font-medium"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analyze
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/5 hover:bg-purple-50 border-white/20 hover:border-purple-300 text-white hover:text-purple-700 font-medium"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Interactive Floating Cards with 3D Hover Effects
const InteractiveFloatingCards = () => {
  const cards = [
    {
      icon: BrainIcon,
      title: "AI Analysis",
      description: "22+ research methodologies",
      gradient: "from-blue-500 via-purple-500 to-pink-500",
      delay: 0,
    },
    {
      icon: MessageSquare,
      title: "Real-time Chat",
      description: "Instant insights",
      gradient: "from-green-500 via-cyan-500 to-blue-500",
      delay: 0.2,
    },
    {
      icon: Download,
      title: "Smart Export",
      description: "PDF, Word, Excel",
      gradient: "from-orange-500 via-red-500 to-pink-500",
      delay: 0.4,
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "HIPAA compliant",
      gradient: "from-purple-500 via-pink-500 to-red-500",
      delay: 0.6,
    },
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
      {cards.map((card, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 50, rotateX: -15 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{
            duration: 0.8,
            delay: card.delay,
            type: "spring",
            stiffness: 100,
          }}
          viewport={{ once: true }}
          whileHover={{
            y: -20,
            rotateY: 5,
            scale: 1.05,
            transition: { duration: 0.3 },
          }}
          className="group perspective-1000"
        >
          <div className="relative bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 hover:border-white/30 transition-all duration-500 hover:shadow-2xl hover:shadow-white/10">
            {/* Gradient Background */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity duration-500`}
            />

            {/* Icon with 3D Effect */}
            <motion.div
              className={`relative w-16 h-16 bg-gradient-to-r ${card.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
              whileHover={{ rotateY: 180 }}
              transition={{ duration: 0.6 }}
            >
              <card.icon className="h-8 w-8 text-white" />
            </motion.div>

            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 group-hover:bg-clip-text transition-all duration-300">
              {card.title}
            </h3>
            <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
              {card.description}
            </p>

            {/* Hover Glow Effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Animated Stats with Counter Animation
const AnimatedStatsWithCounter = () => {
  const stats = [
    { number: 37, label: "Years Experience", icon: Award, suffix: "" },
    { number: 50, label: "Countries", icon: Globe, suffix: "+" },
    { number: 10, label: "HCPs Interviewed", icon: Users, suffix: "K+" },
    { number: 99, label: "Accuracy", icon: CheckCircle, suffix: "%" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 30, scale: 0.8 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.8,
            delay: index * 0.1,
            type: "spring",
            stiffness: 100,
          }}
          viewport={{ once: true }}
          whileHover={{ scale: 1.05, y: -5 }}
          className="text-center group"
        >
          <motion.div
            className="flex justify-center mb-4"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
          >
            <stat.icon className="h-10 w-10 text-green-400 group-hover:text-green-300 transition-colors duration-300" />
          </motion.div>

          <motion.div
            className="text-4xl font-bold text-white mb-2"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{
              duration: 0.5,
              delay: index * 0.1 + 0.3,
              type: "spring",
              stiffness: 200,
            }}
            viewport={{ once: true }}
          >
            {stat.number}
            {stat.suffix}
          </motion.div>

          <div className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Scroll-triggered Parallax Hero with Dynamic Transformations
const ParallaxHero = () => {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -300]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const x = useTransform(scrollYProgress, [0, 1], [0, 50]);

  return (
    <section className="relative py-40 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center">
      <AdvancedParticleSystem />

      <div className="max-w-7xl mx-auto text-center relative z-10">
        {/* DNA Animation with FMR QualAI Text */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.3 }}
          className="flex flex-col items-center justify-center gap-8 mb-16"
        >
          {/* DNA Animation */}
          <motion.div
            animate={{
              rotateY: [0, 360],
              scale: [1, 1.05, 1],
            }}
            transition={{
              rotateY: { duration: 8, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            <DNAAnimation
              size={220}
              speed={1.2}
              color1="#3b82f6"
              color2="#10b981"
              className="opacity-90"
            />
          </motion.div>

          {/* FMR QualAI Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.5 }}
            className="text-center"
          >
            <h1 className="text-8xl md:text-9xl font-bold leading-tight tracking-tight mb-8">
              <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                FMR QualAI
              </span>
            </h1>
            <p className="text-3xl md:text-4xl font-medium text-gray-300">
              by FMR Global Health
            </p>
          </motion.div>
        </motion.div>

        {/* Subtitle with Dynamic Color Changes */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1,
            delay: 0.4,
            type: "spring",
            stiffness: 100,
          }}
          style={{ y: y3 }}
          className="text-3xl md:text-4xl text-gray-300 mb-20 max-w-5xl mx-auto leading-relaxed"
        >
          Every{" "}
          <motion.span
            className="text-white font-medium"
            animate={{ color: ["#ffffff", "#10b981", "#ffffff"] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            interview
          </motion.span>
          , captured.
          <br />
          Every{" "}
          <motion.span
            className="text-white font-medium"
            animate={{ color: ["#ffffff", "#3b82f6", "#ffffff"] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          >
            insight
          </motion.span>
          , actionable.
          <br />
          Everywhere,{" "}
          <motion.span
            className="text-white font-medium"
            animate={{ color: ["#ffffff", "#8b5cf6", "#ffffff"] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          >
            seamless
          </motion.span>
          .
        </motion.p>

        {/* Animated Stats with Scroll-triggered Transformations */}
        <AnimatedStatsWithCounter />

        {/* CTA Button with Dynamic Hover Effects */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1,
            delay: 0.8,
            type: "spring",
            stiffness: 100,
          }}
          className="flex justify-center mt-20"
        >
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              size="lg"
              asChild
              className="bg-gradient-to-r from-white to-gray-100 text-black hover:from-gray-100 hover:to-white px-16 py-10 text-2xl rounded-full font-medium transition-all duration-300 shadow-2xl hover:shadow-white/20 relative overflow-hidden group"
            >
              <Link to="/auth">
                <span className="relative z-10">Start Free Trial</span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6 }}
                />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Animated Feature Cards
const AnimatedFeatureCards = () => {
  const features = [
    {
      icon: BrainIcon,
      title: "AI Analysis",
      description: "22+ research methodologies",
      color: "from-blue-500 to-purple-600",
    },
    {
      icon: MessageSquare,
      title: "Real-time Chat",
      description: "Instant insights",
      color: "from-green-500 to-blue-600",
    },
    {
      icon: Download,
      title: "Smart Export",
      description: "PDF, Word, Excel",
      color: "from-orange-500 to-red-600",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "HIPAA compliant",
      color: "from-purple-500 to-pink-600",
    },
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
      {features.map((feature, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
          viewport={{ once: true }}
          className="group relative"
        >
          <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105">
            <div
              className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
            >
              <feature.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {feature.title}
            </h3>
            <p className="text-sm text-gray-400">{feature.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Animated Trust Badges
const AnimatedTrustBadges = () => {
  const badges = ["WHO", "FDA", "NIH", "CDC", "ESOMAR", "BHBIA"];

  return (
    <div className="flex flex-wrap justify-center gap-6 mt-12">
      {badges.map((badge, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          viewport={{ once: true }}
          className="px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/20 text-white/80 text-sm font-medium hover:bg-white/10 transition-all duration-300"
        >
          {badge}
        </motion.div>
      ))}
    </div>
  );
};

// Animated Transcript Showcase
const AnimatedTranscriptShowcase = () => {
  return (
    <section className="py-40 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, type: "spring", stiffness: 100 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-6xl md:text-7xl font-bold mb-12 leading-tight">
            Smart{" "}
            <motion.span
              className="bg-gradient-to-r from-white via-green-400 to-blue-400 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                backgroundSize: "200% 200%",
              }}
            >
              Transcription
            </motion.span>
          </h2>
          <p className="text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            AI-powered transcription with I:/R: formatting and multi-language
            support
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* English Transcript */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02 }}
            className="group"
          >
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 hover:border-white/30 transition-all duration-500 hover:shadow-2xl hover:shadow-white/10">
              <h3 className="text-2xl font-bold text-white mb-6 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 group-hover:bg-clip-text transition-all duration-300">
                Formatted Transcript (I:/R:)
              </h3>

              <div className="bg-gray-800/50 rounded-2xl p-6 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  viewport={{ once: true }}
                  className="space-y-4 text-gray-300"
                >
                  <div className="flex gap-3">
                    <span className="font-bold text-green-400">I:</span>
                    <span>
                      Can you tell me about your workplace, what type of
                      facility is it, and what department are you affiliated
                      with?
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-blue-400">R:</span>
                    <span>
                      I work at a general university hospital. We have a
                      specialized center that manages all aspects related to the
                      foot.
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-green-400">I:</span>
                    <span>What is your title or position?</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-blue-400">R:</span>
                    <span>I am the deputy director of the center.</span>
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-800/30 rounded-xl p-4">
                  <h4 className="font-semibold text-white mb-2">
                    Original (Japanese)
                  </h4>
                  <p className="text-gray-400 text-xs">
                    日本語の原文がここに表示されます...
                  </p>
                </div>
                <div className="bg-gray-800/30 rounded-xl p-4">
                  <h4 className="font-semibold text-white mb-2">
                    English Translation
                  </h4>
                  <p className="text-gray-400 text-xs">
                    English translation appears here...
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Japanese Transcript */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02 }}
            className="group"
          >
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 hover:border-white/30 transition-all duration-500 hover:shadow-2xl hover:shadow-white/10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  Untitled design (2).mp4
                </h3>
                <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                  completed
                </Badge>
              </div>

              <div className="bg-gray-800/50 rounded-2xl p-6 mb-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  viewport={{ once: true }}
                  className="space-y-4 text-gray-300"
                >
                  <div className="flex gap-3">
                    <span className="font-bold text-green-400">I:</span>
                    <span>
                      職場について教えてください。どのような施設で、どの部署に所属していますか？
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-blue-400">R:</span>
                    <span>
                      総合大学病院で働いています。足に関連するすべての側面を管理する専門センターがあります。
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-green-400">I:</span>
                    <span>あなたの役職や立場は何ですか？</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-blue-400">R:</span>
                    <span>私はそのセンターの副所長を務めています。</span>
                  </div>
                </motion.div>
              </div>

              <div className="flex gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Play
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Animated AI Chat Showcase
const AnimatedAIChatShowcase = () => {
  return (
    <section className="py-40 px-4 sm:px-6 lg:px-8 bg-white/5 backdrop-blur-sm relative">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, type: "spring", stiffness: 100 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-6xl md:text-7xl font-bold mb-12 leading-tight">
            AI{" "}
            <motion.span
              className="bg-gradient-to-r from-white via-purple-400 to-pink-400 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                backgroundSize: "200% 200%",
              }}
            >
              Research Assistant
            </motion.span>
          </h2>
          <p className="text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Ask questions about your analysis and get instant insights
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  AI Research Assistant
                </h3>
                <p className="text-sm text-gray-400">
                  Ask questions about your Manjunath Gangavati analysis and
                  insights.
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-yellow-400" />
                  <span className="text-sm text-yellow-300">
                    Context Available: This AI has access to your FMR Dish
                    analysis, strategic themes, and project insights.
                  </span>
                </div>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-sm text-green-300">
                    Analysis Data Ready - Chat assistant has access to your FMR
                    analysis data.
                  </span>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-gray-800/50 rounded-2xl p-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <BrainIcon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-300 mb-2">
                    Hello! I'm your qualitative research assistant for Manjunath
                    Gangavati. I have access to your analysis data and can help
                    you explore insights, extract quotes, and identify themes.
                    Try asking about barriers, themes, or specific findings!
                  </p>
                  <span className="text-xs text-gray-500">17:45:25</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Enhanced Floating Background Elements
const FloatingBackgroundElements = () => {
  const elements = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 8 + 4,
    color: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"][
      Math.floor(Math.random() * 6)
    ],
    delay: Math.random() * 2,
    duration: Math.random() * 3 + 2,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {elements.map((element) => (
        <motion.div
          key={element.id}
          className="absolute w-2 h-2 rounded-full opacity-20"
          style={{
            left: `${element.x}%`,
            top: `${element.y}%`,
            width: `${element.size}px`,
            height: `${element.size}px`,
            backgroundColor: element.color,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: element.duration,
            repeat: Infinity,
            delay: element.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

const Landing = () => {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Enhanced Floating Background Elements */}
      <FloatingBackgroundElements />

      {/* Animated Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05)_0%,transparent_50%)]"></div>
      <motion.div
        style={{ y }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(0,255,0,0.03)_0%,transparent_50%)]"
      />

      {/* Hero Section */}
      <ParallaxHero />

      {/* AI Capabilities Section */}
      <section className="py-40 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          {/* DNA Animation in AI Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="absolute left-10 top-1/2 transform -translate-y-1/2 z-10"
          >
            <DNAAnimation
              size={100}
              speed={2}
              color1="#8b5cf6"
              color2="#f59e0b"
              className="opacity-60"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, type: "spring", stiffness: 100 }}
            viewport={{ once: true }}
            className="text-center mb-32"
          >
            <motion.h2
              className="text-7xl md:text-8xl font-bold mb-12 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Get useful{" "}
              <motion.span
                className="bg-gradient-to-r from-white via-green-400 to-blue-400 bg-clip-text text-transparent"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear",
                }}
                style={{
                  backgroundSize: "200% 200%",
                }}
              >
                insights
              </motion.span>
              <br />
              to all your research questions
            </motion.h2>
            <motion.p
              className="text-2xl text-gray-300 max-w-5xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            >
              Ask any question across all your past interviews and let our AI
              find the insights you are looking for instantly. Hosted safely and
              securely.
            </motion.p>
          </motion.div>

          {/* Interactive Floating Cards */}
          <InteractiveFloatingCards />
        </div>
      </section>

      {/* Analysis Showcase Section */}
      <AnimatedAnalysisShowcase />

      {/* Project Cards Showcase Section */}
      <AnimatedProjectCardsShowcase />

      {/* Transcript Showcase Section */}
      <AnimatedTranscriptShowcase />

      {/* AI Chat Showcase Section */}
      <AnimatedAIChatShowcase />

      {/* Comparison Section with Enhanced Animations */}
      <section className="py-40 px-4 sm:px-6 lg:px-8 bg-white/5 backdrop-blur-sm relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, type: "spring", stiffness: 100 }}
            viewport={{ once: true }}
            className="grid lg:grid-cols-2 gap-32 items-center"
          >
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <motion.h3
                className="text-4xl font-bold mb-16 text-gray-300"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                Without FMR QualAI
              </motion.h3>
              <div className="space-y-12">
                {[
                  {
                    icon: Clock,
                    text: "Wasting time on manual interview notes",
                  },
                  {
                    icon: MessageSquare,
                    text: "Forgetting important details and insights",
                  },
                  { icon: Download, text: "Writing manual research reports" },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    viewport={{ once: true }}
                    whileHover={{ x: 10, scale: 1.02 }}
                    className="flex items-start space-x-6 group"
                  >
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <item.icon className="h-10 w-10 text-gray-400 mt-2 flex-shrink-0 group-hover:text-gray-300 transition-colors duration-300" />
                    </motion.div>
                    <p className="text-gray-300 text-xl group-hover:text-gray-200 transition-colors duration-300">
                      {item.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <motion.h3
                className="text-4xl font-bold mb-16 text-white"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                With FMR QualAI
              </motion.h3>
              <div className="space-y-12">
                {[
                  {
                    icon: Shield,
                    text: "Save time and get automatic interview summaries",
                    color: "text-green-400",
                  },
                  {
                    icon: Brain,
                    text: "Get the insights you need in seconds",
                    color: "text-green-400",
                  },
                  {
                    icon: Zap,
                    text: "Automate research reports & actionable items",
                    color: "text-green-400",
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    viewport={{ once: true }}
                    whileHover={{ x: -10, scale: 1.02 }}
                    className="flex items-start space-x-6 group"
                  >
                    <motion.div
                      whileHover={{ rotate: 360, scale: 1.2 }}
                      transition={{ duration: 0.6 }}
                    >
                      <item.icon
                        className={`h-10 w-10 ${item.color} mt-2 flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}
                      />
                    </motion.div>
                    <p className="text-white text-xl group-hover:text-green-100 transition-colors duration-300">
                      {item.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA with Enhanced Animations */}
      <section className="py-40 px-4 sm:px-6 lg:px-8 bg-white/5 backdrop-blur-sm relative">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, type: "spring", stiffness: 100 }}
            viewport={{ once: true }}
            className="text-6xl md:text-7xl font-bold mb-12"
          >
            Ready to love your
            <br />
            <motion.span
              className="bg-gradient-to-r from-white via-green-400 to-blue-400 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                backgroundSize: "200% 200%",
              }}
            >
              research workflow
            </motion.span>{" "}
            again?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-2xl mb-16 text-gray-300"
          >
            Try FMR QualAI now!
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              size="lg"
              asChild
              className="bg-gradient-to-r from-white via-gray-100 to-white text-black hover:from-gray-100 hover:via-white hover:to-gray-100 px-16 py-8 text-2xl rounded-full font-medium transition-all duration-300 shadow-2xl hover:shadow-white/20 relative overflow-hidden group"
            >
              <Link to="/auth">
                <span className="relative z-10">Start Free Trial</span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.8 }}
                />
              </Link>
            </Button>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
            className="text-sm text-gray-500 mt-12"
          >
            HIPAA Compliant | Windows 10+ | macOS 13.1+
          </motion.p>
        </div>
      </section>
    </div>
  );
};

export default Landing;
