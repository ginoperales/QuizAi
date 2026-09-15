import { describe, expect, it } from 'vitest';
import { calculateLocalSimilarity } from './geminiService';

describe('calculateLocalSimilarity', () => {
  it('no infla el resultado cuando la referencia repite palabras', () => {
    expect(calculateLocalSimilarity('alpha', 'alpha alpha beta')).toBe(80);
  });

  it('normaliza mayúsculas y tildes', () => {
    expect(calculateLocalSimilarity('educacion activa', 'Educación activa')).toBe(100);
  });

  it('devuelve cero para entradas vacías', () => {
    expect(calculateLocalSimilarity('', 'respuesta')).toBe(0);
  });
});
