import React, { useState, useCallback } from 'react';
import { useAuth } from '@/features/auth/context/auth-context.js';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/components/ui/toast';
import { Plus, LogIn, LogOut, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  onOpenLogin: () => void;
  onOpenCreate: () => void;
}

const NavbarComponent: React.FC<NavbarProps> = ({ onOpenLogin, onOpenCreate }) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      toast.add({
        title: 'Error al cerrar sesión en el servidor',
        description: (err as Error).message,
        type: 'warning',
      });
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, logout]);

  return (
    <header className="bg-black/85 backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-30 safe-top transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brandmark Google One Style */}
        <div className="flex items-center gap-2 min-w-0 cursor-default select-none">
          <span className="text-lg sm:text-2xl font-bold tracking-tight text-white font-heading truncate">
            MIBITURVEN
          </span>
        </div>

        {/* Acciones de Navegación y Sesión */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isLoading ? (
            <span className="text-xs text-[#9aa0a6] animate-pulse px-2">Verificando...</span>
          ) : isAuthenticated ? (
            <>
              {/* Perfil del Administrador (compacto en móvil/tablet, expandido en desktop) */}
              <div
                className="flex items-center gap-2.5 p-1 lg:pl-1.5 lg:pr-3 rounded-full bg-white/[0.05] border border-white/10"
                title={user?.name ? `${user.name} (Admin)` : 'Administrador'}
                aria-label={user?.name ? `Sesión iniciada como ${user.name}` : 'Administrador'}
              >
                <Avatar className="h-7 w-7 border border-[#1a73e8]/40">
                  <AvatarFallback className="text-[11px] font-medium bg-[#1a73e8]/20 text-[#4285F4]">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col text-left leading-none">
                  <span className="text-xs font-medium text-white truncate max-w-[120px]">
                    {user?.name}
                  </span>
                  <span className="text-[10px] text-[#4285F4] font-medium flex items-center gap-0.5 mt-0.5">
                    <ShieldCheck className="w-3 h-3 inline text-[#34a853]" /> Admin
                  </span>
                </div>
              </div>

              {/* Botón de Creación con Pill Google */}
              <Button
                size="sm"
                onClick={onOpenCreate}
                className="h-10 sm:h-9 px-3.5 sm:px-4 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium shadow-[0_0_15px_rgba(26,115,232,0.35)] transition-all"
              >
                <Plus className="w-4 h-4 mr-1 sm:mr-1.5 stroke-[2.5]" />
                <span className="sm:hidden">Nuevo</span>
                <span className="hidden sm:inline">Nuevo Trabajo</span>
              </Button>

              {/* Botón de Salir */}
              <Button
                variant="outline"
                size="sm"
                disabled={isLoggingOut}
                onClick={() => void handleLogout()}
                className="h-10 w-10 sm:w-auto sm:h-9 sm:px-3.5 rounded-full text-xs font-medium border-white/10 text-[#9aa0a6] hover:bg-destructive/15 hover:text-red-400 hover:border-destructive/30"
                title="Cerrar Sesión"
                aria-label="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4 sm:w-3.5 sm:h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={onOpenLogin}
              className="h-10 sm:h-9 px-4 sm:px-5 rounded-full text-xs font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-[0_0_15px_rgba(26,115,232,0.35)] transition-all"
            >
              <LogIn className="w-3.5 h-3.5 mr-1.5" />
              Acceso Admin
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export const Navbar = React.memo(NavbarComponent);