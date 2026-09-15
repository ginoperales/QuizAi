import { describe, expect, it } from 'vitest';
import { normalizeGeneratedQuestions, normalizeStoredQuestions, shuffleQuestionOptions } from './quizLogic';

describe('shuffleQuestionOptions', () => {
  it('preserva la respuesta correcta después de barajar', () => {
    const question = {
      id: 'q1',
      questionText: 'Pregunta',
      options: ['A', 'B', 'C', 'D'],
      correctAnswerIndex: 2,
      justification: 'Porque C',
    };

    const shuffled = shuffleQuestionOptions(question, () => 0);

    expect(shuffled.options[shuffled.correctAnswerIndex]).toBe('C');
    expect(shuffled.options).not.toEqual(question.options);
    expect(question.options).toEqual(['A', 'B', 'C', 'D']);
  });
});

describe('normalizeStoredQuestions', () => {
  it('acepta preguntas históricas sin justificación y preserva el ID', () => {
    const [question] = normalizeStoredQuestions([{
      id: 'histórica-1',
      questionText: 'Pregunta',
      options: ['A', 'B', 'C', 'D'],
      correctAnswerIndex: 1,
    }]);
    expect(question.id).toBe('histórica-1');
    expect(question.justification).toBeTruthy();
  });
});

describe('normalizeGeneratedQuestions', () => {
  it('acepta y recorta preguntas válidas', () => {
    const [question] = normalizeGeneratedQuestions([{
      questionText: '  Pregunta  ',
      options: [' A ', 'B', 'C', 'D'],
      correctAnswerIndex: 0,
      justification: '  Justificación  ',
    }]);

    expect(question.questionText).toBe('Pregunta');
    expect(question.options[0]).toBe('A');
  });

  it.each([-1, 4, 1.5, '0'])('rechaza el índice inválido %p', correctAnswerIndex => {
    expect(() => normalizeGeneratedQuestions([{
      questionText: 'Pregunta',
      options: ['A', 'B', 'C', 'D'],
      correctAnswerIndex,
      justification: 'Justificación',
    }])).toThrow(/formato inválido/);
  });

  it('rechaza opciones duplicadas', () => {
    expect(() => normalizeGeneratedQuestions([{
      questionText: 'Pregunta',
      options: ['A', 'A', 'C', 'D'],
      correctAnswerIndex: 0,
      justification: 'Justificación',
    }])).toThrow(/formato inválido/);
  });
});
