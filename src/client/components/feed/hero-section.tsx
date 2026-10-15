import React from 'react';
import { Card } from '@/components/ui/card';
import { Briefcase, CheckCircle2, Clock, Camera, Shield, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  totalWorks: number;
  completedCount: number;
  inProgressCount: number;
  totalMediaCount: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  totalWorks,
  completedCount,
  inProgressCount,
  totalMediaCount,
}) => {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-amber-950/10 p-6 sm:p-8 lg:p-10 shadow-lg shadow-black/5">
      {/* Efectos decorativos de fondo */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-20 w-60 h-60 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6">
        {/* Badge Institucional y Título */}
        <div className="flex flex-col items-start gap-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-semibold tracking-wide uppercase">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span>Cliente: MIBITURVEN S.A. — Minería Binacional Turquía-Venezuela</span>
            <Sparkles className="w-3 h-3 text-amber-400 hidden sm:inline" />
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-tight">
            Bitácora y Dossier de{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600">
              Obras Industriales
            </span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Registro oficial y cronológico de proyectos, servicios técnicos, montajes y
            mantenimientos ejecutados para <strong>MIBITURVEN S.A.</strong> Cada intervención cuenta
            con respaldo documental mediante evidencias fotográficas y audiovisuales fechadas.
          </p>
        </div>

        {/* Grid de Métricas / KPIs Operativos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2">
          {/* KPI 1: Total Trabajos */}
          <Card className="p-4 sm:p-5 bg-card/70 border-border/70 backdrop-blur-md flex flex-col justify-between hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Obras</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {totalWorks}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Proyectos en bitácora
              </span>
            </div>
          </Card>

          {/* KPI 2: Concluidos */}
          <Card className="p-4 sm:p-5 bg-card/70 border-border/70 backdrop-blur-md flex flex-col justify-between hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Concluidos</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                {completedCount}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Trabajos entregados
              </span>
            </div>
          </Card>

          {/* KPI 3: En Proceso */}
          <Card className="p-4 sm:p-5 bg-card/70 border-border/70 backdrop-blur-md flex flex-col justify-between hover:border-cyan-500/30 transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">En Curso</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-cyan-600 dark:text-cyan-400 tracking-tight">
                {inProgressCount}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                En desarrollo activo
              </span>
            </div>
          </Card>

          {/* KPI 4: Evidencias Multimedia */}
          <Card className="p-4 sm:p-5 bg-card/70 border-border/70 backdrop-blur-md flex flex-col justify-between hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Evidencias</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Camera className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {totalMediaCount}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Fotos y videos cargados
              </span>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
