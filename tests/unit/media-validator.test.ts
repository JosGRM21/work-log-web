import { describe, it, expect } from 'vitest';
import { Buffer } from 'node:buffer';
import {
  detectMagicBytes,
  validateMediaQuota,
  validateFileSizeBytes,
  isValidUuid,
} from '../../src/server/validators/media.validator.js';
import { AppError } from '../../src/server/errors/app-error.js';

describe('Media Validator (Unit)', () => {
  describe('isValidUuid', () => {
    it('debe validar correctamente UUIDs v4', () => {
      expect(isValidUuid('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe(true);
      expect(isValidUuid('invalido-uuid')).toBe(false);
    });
  });

  describe('detectMagicBytes (RNF-SEC-03)', () => {
    it('debe reconocer una cabecera JPEG válida', () => {
      const jpegHeader = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const result = detectMagicBytes(jpegHeader);
      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('image/jpeg');
      expect(result?.mediaType).toBe('image');
      expect(result?.extension).toBe('jpg');
    });

    it('debe reconocer una cabecera PNG válida', () => {
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      const result = detectMagicBytes(pngHeader);
      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('image/png');
      expect(result?.mediaType).toBe('image');
      expect(result?.extension).toBe('png');
    });

    it('debe reconocer una cabecera WebP válida', () => {
      const webpHeader = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      const result = detectMagicBytes(webpHeader);
      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('image/webp');
      expect(result?.mediaType).toBe('image');
      expect(result?.extension).toBe('webp');
    });

    it('debe reconocer una cabecera MP4 válida (ftyp en offset 4)', () => {
      const mp4Header = Buffer.from([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32,
      ]);
      const result = detectMagicBytes(mp4Header);
      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('video/mp4');
      expect(result?.mediaType).toBe('video');
      expect(result?.extension).toBe('mp4');
    });

    it('debe reconocer una cabecera WebM válida (EBML 1A 45 DF A3)', () => {
      const webmHeader = Buffer.from([
        0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f,
      ]);
      const result = detectMagicBytes(webmHeader);
      expect(result).not.toBeNull();
      expect(result?.mimeType).toBe('video/webm');
      expect(result?.mediaType).toBe('video');
      expect(result?.extension).toBe('webm');
    });

    it('debe rechazar binarios ejecutables Windows (MZ) camuflados', () => {
      const exeHeader = Buffer.from([
        0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
      ]);
      expect(detectMagicBytes(exeHeader)).toBeNull();
    });

    it('debe rechazar scripts de shell o texto plano', () => {
      const scriptHeader = Buffer.from('#!/bin/bash\necho "Malicioso"\n');
      expect(detectMagicBytes(scriptHeader)).toBeNull();
    });

    it('debe retornar null ante búferes incompletos (< 12 bytes)', () => {
      const shortBuffer = Buffer.from([0xff, 0xd8, 0xff]);
      expect(detectMagicBytes(shortBuffer)).toBeNull();
    });
  });

  describe('validateMediaQuota (RN-03)', () => {
    it('debe permitir subidas dentro del límite (máx 20 fotos, máx 4 videos)', () => {
      expect(() => validateMediaQuota(10, 2, 5, 1)).not.toThrow();
      expect(() => validateMediaQuota(19, 3, 1, 1)).not.toThrow();
    });

    it('debe rechazar si la suma de fotos supera 20', () => {
      expect(() => validateMediaQuota(18, 0, 3, 0)).toThrowError(AppError);
    });

    it('debe rechazar si la suma de videos supera 4', () => {
      expect(() => validateMediaQuota(0, 3, 0, 2)).toThrowError(AppError);
    });
  });

  describe('validateFileSizeBytes (RNF-STOR-01)', () => {
    it('debe aceptar fotos de hasta 10 MB y videos de hasta 150 MB', () => {
      expect(() => validateFileSizeBytes(10 * 1024 * 1024, 'image')).not.toThrow();
      expect(() => validateFileSizeBytes(150 * 1024 * 1024, 'video')).not.toThrow();
    });

    it('debe lanzar AppError 413 si una foto excede 10 MB', () => {
      expect(() => validateFileSizeBytes(10 * 1024 * 1024 + 1, 'image')).toThrowError(AppError);
    });

    it('debe lanzar AppError 413 si un video excede 150 MB', () => {
      expect(() => validateFileSizeBytes(150 * 1024 * 1024 + 1, 'video')).toThrowError(AppError);
    });
  });
});
