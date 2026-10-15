import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth-context.js';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, LogIn, LogOut, ShieldCheck, Sun, Moon, Pickaxe } from 'lucide-react';

interface NavbarProps {
  onOpenLogin: () => void;
  onOpenCreate: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLogin, onOpenCreate }) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Inicializar tema desde clase html o preferencia guardada
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      setIsDarkMode(false);
      localStorage.setItem('theme', 'light');
    } else {
      root.classList.add('dark');
      setIsDarkMode(true);
      localStorage.setItem('theme', 'dark');
    }
  };

  return (
    <header className="border-b border-border/80 bg-card/85 backdrop-blur-xl sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
        {/* Brandmark Corporativo */}
        <div className="flex items-center gap-3.5 group cursor-default">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-300">
              <Pickaxe className="w-5 h-5 text-slate-950 stroke-[2.2]" />
            </div>
            <div
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background"
              title="Sistema Activo"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                MIBITURVEN{' '}
                <span className="text-amber-500 font-extrabold text-sm sm:text-base">S.A.</span>
              </span>
              <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Minería Binacional
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium tracking-tight">
              Bitácora Técnica de Obras & Mantenimiento
            </p>
          </div>
        </div>

        {/* Acciones de Navegación y Sesión */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Selector de Tema */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-xl"
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Alternar tema visual"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 transition-transform hover:-rotate-12" />
            )}
          </Button>

          <div className="h-5 w-px bg-border/60 hidden sm:block" />

          {isLoading ? (
            <span className="text-xs text-muted-foreground animate-pulse px-2">Verificando...</span>
          ) : isAuthenticated ? (
            <>
              {/* Perfil del Administrador */}
              <div className="hidden lg:flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl bg-muted/40 border border-border/50">
                <Avatar className="h-7 w-7 border border-amber-500/40">
                  <AvatarFallback className="text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left leading-none pr-1">
                  <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                    {user?.name}
                  </span>
                  <span className="text-[10px] text-amber-500 font-medium flex items-center gap-0.5 mt-0.5">
                    <ShieldCheck className="w-3 h-3 inline" /> Admin
                  </span>
                </div>
              </div>

              {/* Botón de Creación */}
              <Button
                size="sm"
                onClick={onOpenCreate}
                className="h-9 px-3 sm:px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold shadow-sm shadow-amber-500/25 border border-amber-400/30 transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-1 sm:mr-1.5 stroke-[2.5]" />
                <span>Nuevo Trabajo</span>
              </Button>

              {/* Botón de Salir */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => logout()}
                className="h-9 text-xs font-medium border-border/70 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                title="Cerrar Sesión"
              >
                <LogOut className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenLogin}
              className="h-9 text-xs font-medium border-border/70 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-500 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              Acceso Admin
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
