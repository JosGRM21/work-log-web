import React, { useEffect, useState } from 'react';
import { Briefcase, CheckCircle2, Clock, Camera } from 'lucide-react';

interface HeroSectionProps {
  totalWorks: number;
  completedCount: number;
  inProgressCount: number;
  totalMediaCount: number;
  isLoading?: boolean;
}

interface AnimatedMetricValueProps {
  value: number;
  duration?: number;
  delay?: number;
  isLoading?: boolean;
}

/**
 * Componente de conteo animado con curva easeOutExpo y entrada suave (blur + fade)
 */
const AnimatedMetricValue: React.FC<AnimatedMetricValueProps> = ({
  value,
  duration = 1400,
  delay = 0,
  isLoading = false,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setIsVisible(false);
      setDisplayValue(0);
      return;
    }

    let frameId: number;
    let startTime: number | null = null;

    const timerId = window.setTimeout(() => {
      setIsVisible(true);

      if (value === 0) {
        setDisplayValue(0);
        return;
      }

      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Curva easeOutExpo para un frenado elegante al llegar al número final
        const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        setDisplayValue(Math.round(easedProgress * value));

        if (progress < 1) {
          frameId = window.requestAnimationFrame(animate);
        } else {
          setDisplayValue(value);
        }
      };

      frameId = window.requestAnimationFrame(animate);
    }, delay);

    return () => {
      window.clearTimeout(timerId);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [value, duration, delay, isLoading]);

  return (
    <span
      className={`inline-block tabular-nums transition-all duration-700 ease-out ${isVisible
          ? 'opacity-100 translate-y-0 blur-0'
          : 'opacity-0 translate-y-2 blur-[4px]'
        }`}
    >
      {displayValue.toLocaleString('es-ES')}
    </span>
  );
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  totalWorks,
  completedCount,
  inProgressCount,
  totalMediaCount,
  isLoading = false,
}) => {
  const kpiItems = [
    {
      id: 'total',
      label: 'Total de obras',
      value: totalWorks,
      icon: Briefcase,
      accentText: 'text-[#8ab4f8]',
    },
    {
      id: 'completed',
      label: 'Concluidos',
      value: completedCount,
      icon: CheckCircle2,
      accentText: 'text-[#81c995]',
    },
    {
      id: 'in_progress',
      label: 'En curso',
      value: inProgressCount,
      icon: Clock,
      accentText: 'text-[#fdd663]',
    },
    {
      id: 'media',
      label: 'Evidencias',
      value: totalMediaCount,
      icon: Camera,
      accentText: 'text-[#c58af9]',
    },
  ];

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Bloque Superior: Tipografía calibrada al estilo Google One */}
      <div className="flex flex-col items-center text-center gap-5 max-w-4xl mx-auto px-2 mb-14 sm:mb-20">
        {/* Titular Principal: Blanco puro con acento azul Google AI y peso equilibrado */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-semibold tracking-[-0.025em] text-white leading-[1.1] font-heading">
          Registro de{' '}
          <span className="text-[#669df6] block sm:inline font-semibold">
            Trabajos y Obras
          </span>
        </h1>

        {/* Subtítulo descriptivo con contraste limpio */}
        <p className="text-sm sm:text-base md:text-[17px] text-[#c4c7c5] leading-relaxed max-w-2xl mx-auto font-sans font-normal">
          Catálogo de servicios técnicos y mantenimiento realizados para MIBITURVEN, respaldados con registro fotográfico y audiovisual.
        </p>
      </div>

      {/* Franja de Métricas (KPIs) Abierta: Sin recuadros tradicionales */}
      <div className="w-full max-w-5xl mx-auto pt-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6 lg:gap-0">
          {kpiItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="group relative flex flex-col items-center text-center px-4 sm:px-8 transition-transform duration-300 hover:-translate-y-0.5"
              >
                {/* Divisor vertical sutil (solo entre columnas en pantallas grandes) */}
                {index > 0 && (
                  <div
                    className="hidden lg:block absolute left-0 top-1 bottom-1 w-px bg-gradient-to-b from-transparent via-white/[0.12] to-transparent"
                    aria-hidden="true"
                  />
                )}

                {/* Encabezado del KPI: Ícono + Etiqueta */}
                <div className="flex items-center justify-center gap-2 mb-2.5">
                  <Icon
                    className={`w-3.5 h-3.5 ${item.accentText} opacity-80 group-hover:opacity-100 transition-opacity`}
                  />
                  <span className="text-xs sm:text-[13px] font-medium tracking-wide text-[#e8eaed] group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                </div>

                {/* Número Principal Animado */}
                <div className="text-4xl sm:text-5xl md:text-[52px] font-semibold tracking-[-0.03em] text-white font-heading leading-none my-1 flex justify-center w-full">
                  <AnimatedMetricValue
                    value={item.value}
                    delay={index * 110}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};