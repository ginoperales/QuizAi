import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty, Question, Language, ExplanationStyle } from '../types';
import { decodeHtml } from "./fileService";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      questionText: {
        type: Type.STRING,
        description: 'The text of the question.',
      },
      options: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: 'An array of 4 possible answers.',
      },
      correctAnswerIndex: {
        type: Type.INTEGER,
        description: 'The 0-based index of the correct answer in the options array.',
      },
      justification: {
        type: Type.STRING,
        description: 'A brief explanation for why the correct answer is correct.',
      },
    },
    required: ['questionText', 'options', 'correctAnswerIndex', 'justification'],
  },
};

const gradingSchema = {
    type: Type.OBJECT,
    properties: {
      score: {
        type: Type.INTEGER,
        description: 'A similarity score between 0 and 100, representing how close the user answer is to the correct answer in meaning. 100 is a perfect match.'
      },
      feedback: {
        type: Type.STRING,
        description: 'Brief, constructive feedback for the user in 1-2 sentences. Explain why the answer is correct or what it is missing.'
      }
    },
    required: ['score', 'feedback']
};

export const gradeWrittenAnswer = async (
    question: string,
    correctAnswer: string,
    userAnswer: string,
    language: Language
): Promise<{ score: number; feedback: string }> => {
    const languageMap = { en: 'English', es: 'Spanish' };

    const prompt = `
        You are an AI quiz grader. Evaluate the user's answer for the following question.
        The correct answer is provided for reference.
        Provide a similarity score from 0 to 100, where 100 is a perfect match in meaning.
        Also, provide brief, constructive feedback.
        The response language must be ${languageMap[language]}.
        Provide the output *only* in the JSON format specified in the response schema.

        Question: "${question}"
        Correct Answer for reference: "${correctAnswer}"
        User's Answer to grade: "${userAnswer}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: gradingSchema,
            },
        });

        const rawJson = response.text.trim();
        const result = JSON.parse(rawJson);
        
        if (typeof result.score !== 'number' || typeof result.feedback !== 'string') {
            throw new Error('Invalid format received from AI grader.');
        }

        return {
            score: result.score,
            feedback: result.feedback,
        };

    } catch (error) {
        console.error("Error grading answer with Gemini:", error);
        throw new Error("Failed to get grading from AI.");
    }
};

export const generateQuestionsFromText = async (
  textContent: string,
  difficulty: Difficulty,
  t: (key: any) => string,
  customPrompt?: string
): Promise<Question[]> => {
  
  const prompt = `
      Based on the following text, generate 5 multiple-choice questions of ${difficulty} difficulty.
      ${customPrompt ? `PRIORITIZE THE FOLLOWING INSTRUCTIONS: "${customPrompt}"` : ''}
      For each question, also provide a brief justification explaining why the correct answer is correct.
      The questions should be didactic and test understanding of the key concepts in the text.
      The language of the questions and justifications must be the same as the text provided.
      Provide the output *only* in the JSON format specified in the response schema. Do not include any other text, explanations, or markdown formatting.
      The "options" array must contain exactly 4 items. The first item in the options array must be the correct answer.
      The "correctAnswerIndex" must be 0.
      The "justification" must not be empty.

      Text:
      ---
      ${textContent}
      ---
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const rawText = response.text.trim();
    const startIndex = rawText.indexOf('[');
    const endIndex = rawText.lastIndexOf(']');

    if (startIndex === -1 || endIndex === -1) {
      console.error("Could not find JSON array in model response:", rawText);
      throw new Error("Invalid format received from API: no JSON array found.");
    }

    const jsonString = rawText.substring(startIndex, endIndex + 1);
    const generatedQuestions = JSON.parse(jsonString);

    // Validate, decode, and add unique IDs
    return generatedQuestions.map((q: any, index: number) => {
        if (!q.questionText || !q.options || q.options.length !== 4 || q.correctAnswerIndex === undefined || !q.justification) {
            throw new Error('Invalid question format received from API');
        }
        return {
          id: `${Date.now()}-${index}`,
          questionText: decodeHtml(q.questionText),
          options: q.options.map((opt: string) => decodeHtml(opt)),
          correctAnswerIndex: q.correctAnswerIndex,
          justification: decodeHtml(q.justification),
        };
    });
  } catch (error) {
    console.error("Error generating questions from Gemini:", error);
    throw new Error(t('errorGeneratingQuiz'));
  }
};

export const generateQuestionsFromImage = async (
  imageData: string,
  mimeType: string,
  difficulty: Difficulty,
  t: (key: any) => string,
  customPrompt?: string
): Promise<Question[]> => {
  const imagePart = {
    inlineData: {
      mimeType,
      data: imageData,
    },
  };

  const promptPart = {
    text: `
      Extract the text from this image. Based on the extracted text, generate 5 multiple-choice questions of ${difficulty} difficulty.
      ${customPrompt ? `PRIORITIZE THE FOLLOWING INSTRUCTIONS: "${customPrompt}"` : ''}
      For each question, also provide a brief justification explaining why the correct answer is correct.
      The questions should be didactic and test understanding of the key concepts in the text.
      The language of the questions and justifications must be the same as the text provided in the image.
      Provide the output *only* in the JSON format specified in the response schema. Do not include any other text, explanations, or markdown formatting.
      The "options" array must contain exactly 4 items. The first item in the options array must be the correct answer.
      The "correctAnswerIndex" must be 0.
      The "justification" must not be empty.
    `,
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, promptPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const rawText = response.text.trim();
    const startIndex = rawText.indexOf('[');
    const endIndex = rawText.lastIndexOf(']');

    if (startIndex === -1 || endIndex === -1) {
      console.error("Could not find JSON array in model response:", rawText);
      throw new Error("Invalid format received from API: no JSON array found.");
    }

    const jsonString = rawText.substring(startIndex, endIndex + 1);
    const generatedQuestions = JSON.parse(jsonString);

    // Validate, decode, and add unique IDs
    return generatedQuestions.map((q: any, index: number) => {
      if (!q.questionText || !q.options || q.options.length !== 4 || q.correctAnswerIndex === undefined || !q.justification) {
        throw new Error('Invalid question format received from API');
      }
      return {
        id: `${Date.now()}-${index}`,
        questionText: decodeHtml(q.questionText),
        options: q.options.map((opt: string) => decodeHtml(opt)),
        correctAnswerIndex: q.correctAnswerIndex,
        justification: decodeHtml(q.justification),
      };
    });
  } catch (error) {
    console.error("Error generating questions from Gemini (Image):", error);
    throw new Error(t('errorGeneratingQuiz'));
  }
};

export const getDeeperExplanation = async (
  question: string,
  answer: string,
  justification: string,
  language: Language,
  style: ExplanationStyle
): Promise<string> => {
  const languageMap = {
    en: 'English',
    es: 'Spanish',
  };

  const prompt = `
    A user is taking a quiz and asked for a better explanation for a question.
    Please provide a simple, clear, and didactic explanation of the underlying concept.
    Use an analogy or a simple example if possible.
    The explanation style must be: "${style}".
    The response must be in ${languageMap[language]}. Do not provide any other text or formatting.

    Question: "${question}"
    Correct Answer: "${answer}"
    Original Justification: "${justification}"

    Deeper Explanation in a ${style} style:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error getting deeper explanation from Gemini:", error);
    throw new Error("Failed to get explanation from AI.");
  }
};

export const calculateLocalSimilarity = (userAnswer: string, referenceText: string): number => {
  const clean = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "") // Remove punctuation
      .split(/\s+/)
      .filter(w => w.length > 2); // Only words longer than 2 chars
  };

  const userWords = clean(userAnswer);
  const refWords = clean(referenceText);

  if (userWords.length === 0 || refWords.length === 0) return 0;

  // Count intersections
  const userSet = new Set(userWords);
  let intersectionCount = 0;
  
  refWords.forEach(w => {
    if (userSet.has(w)) {
      intersectionCount++;
    }
  });

  // Calculate Jaccard coefficient or simple ratio
  const unionCount = new Set([...userWords, ...refWords]).size;
  const jaccard = intersectionCount / unionCount;
  
  // Also calculate overlap relative to the shorter text
  const minWords = Math.min(userWords.length, refWords.length);
  const overlapRatio = intersectionCount / minWords;
  
  // Combined score (weighted average)
  const score = Math.round((jaccard * 0.4 + overlapRatio * 0.6) * 100);
  return Math.min(100, Math.max(0, score));
};