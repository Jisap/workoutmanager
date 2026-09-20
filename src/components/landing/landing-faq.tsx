'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown, HelpCircle, ShieldCheck, Zap, Database, Smartphone } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  icon: React.ComponentType<{ className?: string }>;
}

const faqs: FAQItem[] = [
  {
    question: '¿En qué se diferencia Workout Manager de una app convencional o un bloc de notas?',
    answer: 'La mayoría de apps se limitan a guardar números aislados. Workout Manager está estructurado con precisión biomecánica: calcula tu 1RM estimado en tiempo real con la fórmula Epley, registra RPE, controla la intensidad relativa de cada levantamiento, cataloga ejercicios por grupo muscular y proyecta tus curvas de sobrecarga progresiva sin publicidad ni fricción.',
    icon: Zap,
  },
  {
    question: '¿Es compatible tanto para culturismo/hipertrofia como para Powerlifting o Hyrox?',
    answer: 'Totalmente. El motor soporta ejercicios tradicionales de pesas, movimientos olímpicos de halterofilia, bloques funcionales de Hyrox (SkiErg, Sled Push, Burpees) y entrenamientos por intervalos de alta intensidad con métricas adaptadas.',
    icon: Database,
  },
  {
    question: '¿Puedo crear y guardar mis propias rutinas y plantillas personalizadas?',
    answer: 'Sí. Puedes crear plantillas desde cero, clonar sesiones que hayas completado para repetirlas con un clic, o importar programas clásicos (PPL, Torso/Pierna, 5/3/1, Full Body) y editarlos como desees.',
    icon: ShieldCheck,
  },
  {
    question: '¿Funciona de manera óptima en teléfonos móviles durante el gimnasio?',
    answer: 'Absolutamente. La interfaz ha sido diseñada mobile-first pensando en su uso ágil en la sala de pesas: botones numéricos rápidos, selectores de RPE táctiles y acceso inmediato a tu historial de levantamientos sin menús innecesarios.',
    icon: Smartphone,
  },
  {
    question: '¿Puedo seguir benchmarks oficiales como Fran o Murph, y mi peso corporal?',
    answer: 'Sí. Tienes un catálogo de 24 WODs oficiales (Girls, Héroes y clásicos) que se carga en un clic con sus cargas Rx; el sistema agrupa tus intentos, calcula tu mejora de tiempo y separa marcas Rx de Scaled. Además puedes registrar tu peso, % de grasa, masa muscular, IMC y perímetros, con gráfica de evolución y lectura automática de peso frente a volumen entrenado.',
    icon: Zap,
  },
  {
    question: '¿Mis datos están seguros y sincronizados en la nube?',
    answer: 'Sí, utilizamos infraestructura de base de datos segura y autenticación robusta con Clerk. Tus registros de entrenamientos, marcas personales y notas están siempre respaldados y accesibles desde cualquier dispositivo en tiempo real.',
    icon: HelpCircle,
  },
];

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const prefersReducedMotion = useReducedMotion();

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {faqs.map((faq, idx) => {
        const isOpen = openIndex === idx;
        const Icon = faq.icon;
        return (
          <motion.div
            key={idx}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ delay: Math.min(idx * 0.06, 0.3), duration: 0.45, ease: 'easeOut' }}
            className={`rounded-2xl border transition-colors duration-300 overflow-hidden ${
              isOpen
                ? 'border-blue-500/40 bg-zinc-900/80 shadow-lg shadow-blue-500/5'
                : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/60'
            }`}
          >
            <button
              onClick={() => toggle(idx)}
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${idx}`}
              className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className={`p-2 rounded-xl border transition-colors ${
                  isOpen ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-base sm:text-lg font-semibold text-zinc-100">
                  {faq.question}
                </span>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-zinc-400 transition-transform duration-300 shrink-0 ${
                  isOpen ? 'rotate-180 text-blue-400' : ''
                }`}
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="answer"
                  id={`faq-panel-${idx}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-5 sm:px-6 pb-6 pt-1 text-sm sm:text-base text-zinc-400 leading-relaxed border-t border-zinc-800/50">
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
