import { Question } from '../types';

export const shuffleQuestionOptions = (
  question: Question,
  random: () => number = Math.random
): Question => {
  if (
    !Array.isArray(question.options) ||
    question.options.length === 0 ||
    !Number.isInteger(question.correctAnswerIndex) ||
    question.correctAnswerIndex < 0 ||
    question.correctAnswerIndex >= question.options.length
  ) {
    throw new Error('La pregunta contiene opciones o un índice de respuesta inválidos.');
  }

  const shuffled = question.options.map((option, originalIndex) => ({ option, originalIndex }));
  for (let index = shuffled.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  return {
    ...question,
    options: shuffled.map(item => item.option),
    correctAnswerIndex: shuffled.findIndex(item => item.originalIndex === question.correctAnswerIndex),
  };
};

export const normalizeGeneratedQuestions = (value: unknown): Omit<Question, 'id'>[] => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 200) {
    throw new Error('La respuesta no contiene una lista válida de preguntas.');
  }

  return value.map((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') {
      throw new Error(`La pregunta ${index + 1} no es válida.`);
    }

    const record = candidate as Record<string, unknown>;
    const questionText = typeof record.questionText === 'string' ? record.questionText.trim() : '';
    const justification = typeof record.justification === 'string' ? record.justification.trim() : '';
    const options = Array.isArray(record.options)
      ? record.options.map(option => typeof option === 'string' ? option.trim() : '')
      : [];
    const correctAnswerIndex = record.correctAnswerIndex;

    if (
      !questionText ||
      questionText.length > 2_000 ||
      !justification ||
      justification.length > 5_000 ||
      options.length !== 4 ||
      options.some(option => !option || option.length > 1_000) ||
      new Set(options.map(option => option.toLocaleLowerCase())).size !== options.length ||
      !Number.isInteger(correctAnswerIndex) ||
      (correctAnswerIndex as number) < 0 ||
      (correctAnswerIndex as number) >= options.length
    ) {
      throw new Error(`La pregunta ${index + 1} tiene un formato inválido.`);
    }

    return {
      questionText,
      options,
      correctAnswerIndex: correctAnswerIndex as number,
      justification,
    };
  });
};

export const normalizeStoredQuestions = (value: unknown): Question[] => {
  if (!Array.isArray(value) || value.length === 0 || value.length > 200) {
    throw new Error('El cuestionario no contiene una lista válida de preguntas.');
  }

  return value.map((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') {
      throw new Error(`La pregunta ${index + 1} no es válida.`);
    }
    const record = candidate as Record<string, unknown>;
    const normalized = normalizeGeneratedQuestions([{
      ...record,
      justification: typeof record.justification === 'string' && record.justification.trim()
        ? record.justification
        : 'Sin justificación disponible.',
    }])[0];
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    if (!id || id.length > 200) throw new Error(`La pregunta ${index + 1} no tiene un ID válido.`);
    return { id, ...normalized };
  });
};
