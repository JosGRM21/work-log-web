import React, { useState } from 'react';
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
import { Loader2, Lock } from 'lucide-react';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
    const { login } = useAuth();
    const [identifier, setIdentifier] = useState('admin@empresa.com');
    const [password, setPassword] = useState('PasswordSegura123!');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1 text-primary">
                        <div className="p-2 rounded-full bg-primary/10">
                            <Lock className="w-5 h-5 text-primary" />
                        </div>
                        <DialogTitle className="text-xl">Acceso Administrativo</DialogTitle>
                    </div>
                    <DialogDescription>
                        Ingrese sus credenciales de administrador para gestionar trabajos y evidencias multimedia.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                    <div className="grid gap-2">
                        <Label htmlFor="login-identifier">Correo Electrónico o Usuario</Label>
                        <Input
                            id="login-identifier"
                            type="email"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="admin@empresa.com"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="login-password">Contraseña</Label>
                        <Input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {errorMsg && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                            {errorMsg}
                        </div>
                    )}

                    <DialogFooter className="mt-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Iniciar Sesión
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};