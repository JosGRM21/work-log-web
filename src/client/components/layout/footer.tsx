import React from 'react';
import { Pickaxe, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/80 bg-card/60 backdrop-blur-md mt-auto py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-border/50">
          {/* Logomarca y Contexto */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <Pickaxe className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-foreground block">
                MIBITURVEN S.A.
              </span>
              <span className="text-xs text-muted-foreground">
                Minería Binacional Turquía-Venezuela — Dossier de Obras
              </span>
            </div>
          </div>

          {/* Indicador de Estado Operativo */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Repositorio Operativo & Auditable</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground text-center sm:text-left">
          <p className="max-w-xl leading-relaxed">
            Este catálogo documenta las obras de ingeniería, fabricación metalmecánica,
            mantenimiento y servicios técnicos prestados a <strong>MIBITURVEN S.A.</strong> con
            respaldo de evidencias audiovisuales.
          </p>
          <p className="font-mono text-[11px] text-muted-foreground/80">
            © {currentYear} • Dossier Técnico Operativo
          </p>
        </div>
      </div>
    </footer>
  );
};
