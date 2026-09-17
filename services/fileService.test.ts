import { describe, expect, it } from 'vitest';
import { safeSpreadsheetCell, parseCorrectAnswerIndex } from './fileService';

describe('safeSpreadsheetCell', () => {
  it.each(['=1+1', '+cmd', '-2+3', '@SUM(A1:A2)', '\tformula', '\rformula'])(
    'neutraliza contenido que una hoja podría ejecutar: %p',
    value => expect(safeSpreadsheetCell(value)).toBe(`'${value}`),
  );

  it('conserva texto y números seguros', () => {
    expect(safeSpreadsheetCell('contenido')).toBe('contenido');
    expect(safeSpreadsheetCell(42)).toBe(42);
  });
});

describe('parseCorrectAnswerIndex', () => {
  it('soporta índices base-0 (0 a 3)', () => {
    expect(parseCorrectAnswerIndex(0)).toBe(0);
    expect(parseCorrectAnswerIndex(1)).toBe(1);
    expect(parseCorrectAnswerIndex(2)).toBe(2);
    expect(parseCorrectAnswerIndex(3)).toBe(3);
    expect(parseCorrectAnswerIndex('0')).toBe(0);
    expect(parseCorrectAnswerIndex('3')).toBe(3);
  });

  it('soporta índices base-1 (1 a 4)', () => {
    expect(parseCorrectAnswerIndex(1, true)).toBe(0);
    expect(parseCorrectAnswerIndex(2, true)).toBe(1);
    expect(parseCorrectAnswerIndex(3, true)).toBe(2);
    expect(parseCorrectAnswerIndex(4, true)).toBe(3);
    expect(parseCorrectAnswerIndex('4')).toBe(3); // 4 siempre es la 4ta opción
  });

  it('soporta letras A, B, C, D en mayúsculas y minúsculas', () => {
    expect(parseCorrectAnswerIndex('A')).toBe(0);
    expect(parseCorrectAnswerIndex('b')).toBe(1);
    expect(parseCorrectAnswerIndex('C')).toBe(2);
    expect(parseCorrectAnswerIndex('d')).toBe(3);
    expect(parseCorrectAnswerIndex('Opción A')).toBe(0);
    expect(parseCorrectAnswerIndex('Option 2')).toBe(1);
  });

  it('retorna -1 para valores inválidos', () => {
    expect(parseCorrectAnswerIndex(null)).toBe(-1);
    expect(parseCorrectAnswerIndex(undefined)).toBe(-1);
    expect(parseCorrectAnswerIndex('')).toBe(-1);
    expect(parseCorrectAnswerIndex('E')).toBe(-1);
    expect(parseCorrectAnswerIndex(5)).toBe(-1);
    expect(parseCorrectAnswerIndex(-1)).toBe(-1);
  });
});
