import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../db/client.js';
import { AppError } from '../errors/app-error.js';
import { verifyPassword } from '../utils/password.js';
import { createSessionToken, revokeSessionToken } from '../utils/session.js';
import type { UserSummary } from '../../shared/types.js';

export interface LoginResult {
    token: string;
    user: UserSummary;
}

export class AuthService {
    constructor(private readonly db: PrismaClient = defaultPrisma) { }

    async authenticateUser(identifier: unknown, password: unknown): Promise<LoginResult> {
        if (
            typeof identifier !== 'string' ||
            typeof password !== 'string' ||
            !identifier.trim() ||
            !password
        ) {
            throw AppError.badRequest('El identificador y la contraseña son obligatorios.');
        }

        const normalizedEmail = identifier.trim().toLowerCase();

        const user = await this.db.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            throw AppError.unauthorized('Credenciales inválidas. Compruebe el correo y la contraseña.');
        }

        const passwordMatches = await verifyPassword(password, user.passwordHash);
        if (!passwordMatches) {
            throw AppError.unauthorized('Credenciales inválidas. Compruebe el correo y la contraseña.');
        }

        const token = createSessionToken(user.id, user.email);

        return {
            token,
            user: {
                id: user.id,
                name: user.fullName,
                email: user.email,
            },
        };
    }

    revokeSession(token: string | undefined): void {
        revokeSessionToken(token);
    }
}

export const authService = new AuthService();