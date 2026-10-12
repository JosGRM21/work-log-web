import React from 'react';
import { useAuth } from '../../context/auth-context.js';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, LogIn, LogOut, ShieldCheck } from 'lucide-react';

interface NavbarProps {
    onOpenLogin: () => void;
    onOpenCreate: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLogin, onOpenCreate }) => {
    const { user, isAuthenticated, isLoading, logout } = useAuth();

    return (
        <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm select-none shadow-xs">
                        BT
                    </div>
                    <div>
                        <h1 className="text-base sm:text-lg font-semibold text-foreground tracking-tight leading-tight">
                            Bitácora de Trabajos
                        </h1>
                        <p className="text-xs text-muted-foreground hidden sm:block">
                            Registro visual y cronológico de proyectos
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    {isLoading ? (
                        <span className="text-xs text-muted-foreground animate-pulse">Verificando...</span>
                    ) : isAuthenticated ? (
                        <>
                            <div className="hidden sm:flex items-center gap-2 mr-1">
                                <Avatar className="h-8 w-8 border border-border">
                                    <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">
                                        {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start leading-tight">
                                    <span className="text-xs font-medium text-foreground">{user?.name}</span>
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                        <ShieldCheck className="w-3 h-3 text-primary inline" /> Admin
                                    </span>
                                </div>
                            </div>
                            <Button size="sm" onClick={onOpenCreate} className="shadow-xs">
                                <Plus className="w-4 h-4 mr-1" />
                                Nuevo Trabajo
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => logout()} title="Cerrar Sesión">
                                <LogOut className="w-4 h-4 sm:mr-1" />
                                <span className="hidden sm:inline">Salir</span>
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" size="sm" onClick={onOpenLogin}>
                            <LogIn className="w-4 h-4 mr-1" />
                            Acceso Admin
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
};