import React, { useEffect, useRef, useMemo } from 'react';
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
 * Componente de conteo animado optimizado sin re-renderizados de React por frame
 */
const AnimatedMetricValue: React.FC<AnimatedMetricValueProps> = ({
  value,
  duration = 1000,
  delay = 0,
  isLoading = false,
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const initialValueRef = useRef(value);
  const displayedValueRef = useRef(value);
  const isVisible = !isLoading;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const startVal = displayedValueRef.current;
    if (startVal === value) {
      if (spanRef.current) {
        spanRef.current.textContent = value.toLocaleString('es-ES');
      }
      return;
    }

    let frameId: number | undefined;
    let startTime: number | null = null;
    let lastRendered = startVal;

    const timerId = window.setTimeout(() => {
      const animate = (timestamp: number) => {
        if (startTime === null) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = duration <= 0 ? 1 : Math.min(elapsed / duration, 1);

        // Curva easeOutExpo para un frenado elegante al llegar al número final
        const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = Math.round(startVal + (value - startVal) * easedProgress);

        if (current !== lastRendered) {
          lastRendered = current;
          displayedValueRef.current = current;
          if (spanRef.current) {
            spanRef.current.textContent = current.toLocaleString('es-ES');
          }
        }

        if (progress < 1) {
          frameId = window.requestAnimationFrame(animate);
        } else {
          displayedValueRef.current = value;
          if (spanRef.current) {
            spanRef.current.textContent = value.toLocaleString('es-ES');
          }
        }
      };

      frameId = window.requestAnimationFrame(animate);
    }, delay);

    return () => {
      window.clearTimeout(timerId);
      if (frameId !== undefined) window.cancelAnimationFrame(frameId);
    };
  }, [value, duration, delay, isLoading]);

  return (
    <span
      ref={spanRef}
      className={`inline-block tabular-nums transition-[opacity,transform] duration-500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
    >
      {initialValueRef.current.toLocaleString('es-ES')}
    </span>
  );
};

const HeroSectionComponent: React.FC<HeroSectionProps> = ({
  totalWorks,
  completedCount,
  inProgressCount,
  totalMediaCount,
  isLoading = false,
}) => {
  const kpiItems = useMemo(
    () => [
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
    ],
    [totalWorks, completedCount, inProgressCount, totalMediaCount],
  );

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Bloque Superior: Tipografía calibrada al estilo Google One */}
      <div className="flex flex-col items-center text-center gap-3 sm:gap-5 max-w-4xl mx-auto px-1 sm:px-2 mb-7 sm:mb-14 md:mb-16">
        <h1 className="text-[clamp(1.85rem,7.2vw,4rem)] font-semibold tracking-[-0.025em] text-white leading-[1.08] font-heading">
          Registro de{' '}
          <span className="text-[#669df6] block sm:inline font-semibold">
            Trabajos y Obras
          </span>
        </h1>

        <p className="text-[13px] sm:text-base md:text-[17px] text-[#c4c7c5] leading-relaxed max-w-2xl mx-auto font-sans font-normal">
          Catálogo de servicios técnicos y mantenimiento realizados para MIBITURVEN, respaldados con registro fotográfico y audiovisual.
        </p>
      </div>

      {/* Franja de Métricas (KPIs): bento 2x2 compacto en móvil, franja abierta en desktop */}
      <div className="w-full max-w-5xl mx-auto pt-1 sm:pt-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-y-8 sm:gap-x-6 lg:gap-0">
          {kpiItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="group relative flex flex-col items-center text-center py-3 px-3 sm:py-0 sm:px-8 rounded-[10px] sm:rounded-none bg-white/[0.03] sm:bg-transparent border border-white/[0.07] sm:border-0 transition-transform duration-300 [@media(hover:hover)]:hover:-translate-y-0.5"
              >
                {index > 0 && (
                  <div
                    className="hidden lg:block absolute left-0 top-1 bottom-1 w-px bg-gradient-to-b from-transparent via-white/[0.12] to-transparent"
                    aria-hidden="true"
                  />
                )}

                <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2.5">
                  <Icon
                    className={`w-3.5 h-3.5 ${item.accentText} opacity-85 group-hover:opacity-100 transition-opacity shrink-0`}
                  />
                  <span className="text-[11px] sm:text-[13px] font-medium tracking-wide text-[#e8eaed] group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                </div>

                <div className="text-[28px] sm:text-5xl md:text-[52px] font-semibold tracking-[-0.03em] text-white font-heading leading-none my-0.5 sm:my-1 flex justify-center w-full">
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

export const HeroSection = React.memo(HeroSectionComponent);