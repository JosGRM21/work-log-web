import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiClientError } from '../../src/client/api/client.js';

describe('Frontend API Client (Unit)', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('debe enviar la cabecera credentials: include para soporte de cookies de sesión', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ data: [] }),
        });
        global.fetch = mockFetch;

        await apiClient.get('/works');

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const [, options] = mockFetch.mock.calls[0];
        expect(options.credentials).toBe('include');
        expect(options.method).toBe('GET');
    });

    it('debe serializar payloads en JSON para peticiones POST', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ id: 'work-1' }),
        });
        global.fetch = mockFetch;

        const payload = { title: 'Trabajo Test', status: 'pending' };
        const res = await apiClient.post('/works', payload);

        expect(res).toEqual({ id: 'work-1' });
        const [, options] = mockFetch.mock.calls[0];
        expect(options.method).toBe('POST');
        expect(options.body).toBe(JSON.stringify(payload));
    });

    it('debe parsear respuestas de error uniformes y arrojar ApiClientError', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({
                error: {
                    code: 'BAD_REQUEST',
                    message: 'El título es obligatorio.',
                    details: [],
                },
            }),
        });
        global.fetch = mockFetch;

        await expect(apiClient.post('/works', {})).rejects.toThrowError(ApiClientError);
        await expect(apiClient.post('/works', {})).rejects.toMatchObject({
            statusCode: 400,
            code: 'BAD_REQUEST',
            message: 'El título es obligatorio.',
        });
    });

    it('debe retornar undefined sin intentar parsear JSON ante respuestas 204 No Content', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 204,
            statusText: 'No Content',
            headers: new Headers(),
        });
        global.fetch = mockFetch;

        const res = await apiClient.delete('/works/work-123');
        expect(res).toBeUndefined();
    });
});