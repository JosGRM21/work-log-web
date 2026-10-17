import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/auth-context.js';
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
      <DialogContent className="sm:max-w-md rounded-[24px] border-white/10 bg-[#080c14] shadow-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2.5 rounded-xl bg-[#1a73e8]/15 text-[#4285F4] border border-[#1a73e8]/30">
              <Lock className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4285F4] flex items-center gap-1">
                <Shield className="w-3 h-3" /> MIBITURVEN S.A.
              </span>
              <DialogTitle className="text-xl font-medium tracking-tight text-white font-heading">
                Acceso Administrativo
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-[#9aa0a6]">
            Ingrese sus credenciales autorizadas para gestionar trabajos y evidencias técnicas de
            las obras realizadas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="login-identifier" className="text-xs font-medium text-white">
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
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-[#9aa0a6] rounded-xl focus-visible:ring-2 focus-visible:ring-[#4285F4]/40"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="login-password" className="text-xs font-medium text-white">
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
              className="bg-white/[0.04] border-white/10 text-white placeholder:text-[#9aa0a6] rounded-xl focus-visible:ring-2 focus-visible:ring-[#4285F4]/40"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-red-400 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <DialogFooter className="mt-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto rounded-full border-white/10 text-[#9aa0a6] hover:text-white hover:bg-white/[0.06]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium rounded-full shadow-[0_0_15px_rgba(26,115,232,0.35)] transition-all"
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
