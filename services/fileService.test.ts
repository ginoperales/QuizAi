import { describe, expect, it } from 'vitest';
import { safeSpreadsheetCell } from './fileService';

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
