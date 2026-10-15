import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, Shield } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIdentifier('');
      setPassword('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await login(identifier, password);
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl border-border/80 bg-background shadow-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Lock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> MIBITURVEN S.A.
              </span>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                Acceso Administrativo
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Ingrese sus credenciales autorizadas para gestionar trabajos y evidencias técnicas de
            las obras realizadas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="login-identifier" className="text-xs font-semibold text-foreground">
              Correo Electrónico o Usuario
            </Label>
            <Input
              id="login-identifier"
              type="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin@mibiturven.com"
              autoComplete="username"
              required
              autoFocus
              className="bg-card/70 border-border/80 focus-visible:ring-amber-500/30"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="login-password" className="text-xs font-semibold text-foreground">
              Contraseña
            </Label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
              className="bg-card/70 border-border/80 focus-visible:ring-amber-500/30"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <DialogFooter className="mt-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-xs"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar Sesión
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
