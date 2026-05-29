import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty, Question, Language, ExplanationStyle, AssistantAiModel } from '../types';
import { decodeHtml } from "./fileService";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

// DEEPSEEK CONFIGURATION
const DEEPSEEK_API_KEY = "sk-5b7819ca82d443ff8e464e325c8e5e58";
const DEFAULT_ASSISTANT_MODEL: AssistantAiModel = 'gemini-2.5-flash';

const isDeepSeekModel = (model: AssistantAiModel) => model === 'deepseek-chat';

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

// ==========================================
// 1. LOCAL ALGORITHM FALLBACKS (TERTIARY)
// ==========================================

export const generateQuestionsLocally = (text: string, difficulty: Difficulty): Question[] => {
  // Split the text into logical sentences
  const sentences = text
    .split(/[.!?\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 25 && s.length < 150);

  const questions: Question[] = [];
  
  const fallbackQuestions: Question[] = [
    {
      id: `local-${Date.now()}-0`,
      questionText: "¿Cuál es el concepto principal discutido en el texto proveído?",
      options: [
        "El desarrollo y comprensión profunda de los temas presentados.",
        "La memorización sin justificación de conceptos aislados.",
        "El descarte de información y falta de análisis.",
        "La inactividad y desinterés en el aprendizaje de nuevas materias."
      ],
      correctAnswerIndex: 0,
      justification: "El texto se enfoca en el análisis y asimilación activa de las ideas explicadas en la lectura."
    },
    {
      id: `local-${Date.now()}-1`,
      questionText: "¿Qué beneficio principal ofrece realizar un análisis detallado del contenido?",
      options: [
        "Permite identificar la estructura clave y los puntos de justificación esenciales.",
        "Aumenta la velocidad de lectura sin retención real.",
        "Evita que el usuario tenga que repasar o razonar en el futuro.",
        "Reemplaza por completo el uso de herramientas didácticas adicionales."
      ],
      correctAnswerIndex: 0,
      justification: "Un estudio concienzudo estructura la mente y permite ubicar las justificaciones teóricas de fondo."
    },
    {
      id: `local-${Date.now()}-2`,
      questionText: "¿Cuál de las siguientes afirmaciones se alinea mejor con el texto didáctico?",
      options: [
        "El razonamiento activo y autoevaluación potencian el aprendizaje a largo plazo.",
        "La lectura superficial es suficiente para dominar temas complejos.",
        "No es necesario justificar las respuestas en los cuestionarios de alta calidad.",
        "Los retos educativos deben evitarse por ser demasiado frustrantes."
      ],
      correctAnswerIndex: 0,
      justification: "El razonamiento y la explicación didáctica permiten retener mejor los conceptos analizados."
    },
    {
      id: `local-${Date.now()}-3`,
      questionText: "¿Cuál es el rol de las justificaciones didácticas en este cuestionario?",
      options: [
        "Proveer retroalimentación inmediata y aclarar el porqué de la respuesta correcta.",
        "Confundir al usuario con alternativas similares.",
        "Hacer que el cuestionario tome más tiempo del necesario.",
        "Reemplazar por completo el texto de lectura original."
      ],
      correctAnswerIndex: 0,
      justification: "La justificación explica de forma clara el razonamiento lógico detrás de la respuesta correcta."
    },
    {
      id: `local-${Date.now()}-4`,
      questionText: "¿Qué actitud promueve la autoevaluación activa según la didáctica moderna?",
      options: [
        "La curiosidad, análisis crítico y mejora constante del estudiante.",
        "La memorización robótica sin entendimiento conceptual.",
        "La frustración y el abandono de los retos pranteados.",
        "El desinterés en buscar explicaciones más profundas a los fallos."
      ],
      correctAnswerIndex: 0,
      justification: "Analizar los fallos promueve un aprendizaje proactivo y reflexivo en el estudiante."
    }
  ];

  let qIndex = 0;
  for (const sentence of sentences) {
    if (questions.length >= 5) break;
    
    // Find a good capitalized or long word to blank out
    const words = sentence.split(/\s+/).map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ""));
    const keyWords = words.filter(w => w.length > 5 && /^[A-ZÁÉÍÓÚ]/.test(w));
    const commonWords = words.filter(w => w.length > 6);
    
    const targetWord = keyWords[0] || commonWords[0];
    if (!targetWord) continue;
    
    const questionText = sentence.replace(new RegExp(`\\b${targetWord}\\b`, 'i'), "_______");
    
    // Generate dummy options
    const dummyOptions = [
      targetWord,
      targetWord + " secundario",
      "Concepto alternativo",
      "Concepto opuesto"
    ];
    
    questions.push({
      id: `local-${Date.now()}-${qIndex++}`,
      questionText: `Según la lectura, complete el espacio en blanco: "${questionText}"`,
      options: dummyOptions,
      correctAnswerIndex: 0,
      justification: `La opción correcta es '${targetWord}' porque encaja perfectamente en la afirmación: "${sentence}".`
    });
  }

  // Fill up to 5 questions with fallbacks if needed
  while (questions.length < 5) {
    const fallbackQ = fallbackQuestions[questions.length % fallbackQuestions.length];
    questions.push({
      ...fallbackQ,
      id: `local-${Date.now()}-${questions.length}`
    });
  }

  return questions;
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


// ==========================================
// 2. DEEPSEEK API CALL HANDLERS (SECONDARY)
// ==========================================

export const generateQuestionsFromTextWithDeepSeek = async (
  textContent: string,
  difficulty: Difficulty,
  customPrompt?: string
): Promise<Question[]> => {
  const prompt = `
    Based on the following text, generate 5 multiple-choice questions of ${difficulty} difficulty.
    ${customPrompt ? `PRIORITIZE THE FOLLOWING INSTRUCTIONS: "${customPrompt}"` : ''}
    For each question, also provide a brief justification explaining why the correct answer is correct.
    The questions should be didactic and test understanding of the key concepts in the text.
    The language of the questions and justifications must be the same as the text provided.
    
    Provide the output in JSON format adhering strictly to this JSON Schema:
    {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "questionText": { "type": "string" },
          "options": { 
            "type": "array", 
            "items": { "type": "string" }
          },
          "correctAnswerIndex": { "type": "integer" },
          "justification": { "type": "string" }
        },
        "required": ["questionText", "options", "correctAnswerIndex", "justification"]
      }
    }

    The "options" array must contain exactly 4 items. The first item in the options array must be the correct answer, and the "correctAnswerIndex" must be 0.
    The "justification" must not be empty.
    Output ONLY valid JSON. No explanations, no markdown codeblocks, just a JSON array.

    Text:
    ---
    ${textContent}
    ---
  `;

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const rawText = data.choices[0].message.content.trim();
  
  // Parse output
  const startIndex = rawText.indexOf('[');
  const endIndex = rawText.lastIndexOf(']');
  
  let questionsList: any[] = [];
  if (startIndex !== -1 && endIndex !== -1) {
    const jsonString = rawText.substring(startIndex, endIndex + 1);
    questionsList = JSON.parse(jsonString);
  } else {
    // Attempt parsing as direct JSON object if DeepSeek returned an object containing the list
    const parsedObj = JSON.parse(rawText);
    if (Array.isArray(parsedObj)) {
      questionsList = parsedObj;
    } else {
      const possibleArray = Object.values(parsedObj).find(val => Array.isArray(val));
      if (Array.isArray(possibleArray)) {
        questionsList = possibleArray;
      } else {
        throw new Error("Could not find JSON array in DeepSeek response.");
      }
    }
  }

  return questionsList.map((q: any, index: number) => {
    if (!q.questionText || !q.options || q.options.length !== 4 || q.correctAnswerIndex === undefined || !q.justification) {
        throw new Error('Invalid question format received from DeepSeek');
    }
    return {
      id: `${Date.now()}-${index}`,
      questionText: decodeHtml(q.questionText),
      options: q.options.map((opt: string) => decodeHtml(opt)),
      correctAnswerIndex: q.correctAnswerIndex,
      justification: decodeHtml(q.justification),
    };
  });
};

export const getDeeperExplanationWithDeepSeek = async (
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

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.5
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
};

export const gradeWrittenAnswerWithDeepSeek = async (
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
    
    Provide the output in JSON format adhering strictly to this schema:
    {
      "score": <integer score between 0 and 100>,
      "feedback": "<constructive feedback string>"
    }
    Output ONLY valid JSON.

    Question: "${question}"
    Correct Answer for reference: "${correctAnswer}"
    User's Answer to grade: "${userAnswer}"
  `;

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const rawText = data.choices[0].message.content.trim();
  const result = JSON.parse(rawText);
  
  if (typeof result.score !== 'number' || typeof result.feedback !== 'string') {
    throw new Error('Invalid format received from DeepSeek grader.');
  }

  return {
    score: result.score,
    feedback: result.feedback,
  };
};

export const interpretMultipleChoiceAnswerWithAi = async (
  question: string,
  options: string[],
  spokenAnswer: string,
  language: Language,
  model: AssistantAiModel = DEFAULT_ASSISTANT_MODEL
): Promise<{ optionIndex: number | null; confidence: number; feedback: string }> => {
  const languageMap = { en: 'English', es: 'Spanish' };
  const optionsText = options
    .map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`)
    .join('\n');
  const prompt = `
    You are a hands-free quiz assistant. The user answered a multiple-choice question by voice.
    Match the spoken answer to the closest option. If the answer is unclear, return null.
    Respond in ${languageMap[language]} using only valid JSON with this shape:
    {
      "optionIndex": <0-based option index or null>,
      "confidence": <number from 0 to 100>,
      "feedback": "<brief confirmation or clarification>"
    }

    Question:
    ${question}

    Options:
    ${optionsText}

    Spoken answer:
    ${spokenAnswer}
  `;

  if (isDeepSeekModel(model)) {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content.trim());
    return {
      optionIndex: typeof result.optionIndex === 'number' ? result.optionIndex : null,
      confidence: typeof result.confidence === 'number' ? result.confidence : 0,
      feedback: typeof result.feedback === 'string' ? result.feedback : '',
    };
  }

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          optionIndex: {
            type: Type.INTEGER,
            nullable: true,
            description: '0-based option index, or null if unclear.'
          },
          confidence: {
            type: Type.INTEGER,
            description: 'Confidence from 0 to 100.'
          },
          feedback: {
            type: Type.STRING,
            description: 'Brief confirmation or clarification.'
          }
        },
        required: ['optionIndex', 'confidence', 'feedback']
      }
    },
  });

  const result = JSON.parse(response.text.trim());
  return {
    optionIndex: typeof result.optionIndex === 'number' ? result.optionIndex : null,
    confidence: typeof result.confidence === 'number' ? result.confidence : 0,
    feedback: typeof result.feedback === 'string' ? result.feedback : '',
  };
};


// ==========================================
// 3. EXPORTED WRAPPERS WITH MULTI-TIER FALLBACKS
// ==========================================

export const gradeWrittenAnswer = async (
    question: string,
    correctAnswer: string,
    userAnswer: string,
    language: Language,
    model: AssistantAiModel = DEFAULT_ASSISTANT_MODEL
): Promise<{ score: number; feedback: string }> => {
    if (isDeepSeekModel(model)) {
        try {
            console.log("Attempting answer grading with selected DeepSeek model...");
            return await gradeWrittenAnswerWithDeepSeek(question, correctAnswer, userAnswer, language);
        } catch (deepseekError) {
            console.warn("Selected DeepSeek grading failed, falling back to Gemini:", deepseekError);
        }
    }

    // PRIORITY 1: Selected Google Gemini API
    try {
        console.log(`Attempting answer grading with ${model}...`);
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

        const response = await ai.models.generateContent({
            model,
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

    } catch (geminiError) {
        console.warn("Gemini grading failed, falling back to DeepSeek API:", geminiError);
        
        // PRIORITY 2: DeepSeek API
        try {
            console.log("Attempting answer grading with DeepSeek...");
            return await gradeWrittenAnswerWithDeepSeek(question, correctAnswer, userAnswer, language);
        } catch (deepseekError) {
            console.error("DeepSeek grading also failed. Throwing to trigger local similarity fallback.", deepseekError);
            
            // PRIORITY 3: Throw error to trigger local Jaccard fallback in UI components
            throw new Error("Failed to evaluate answer with AI models.");
        }
    }
};

export const generateQuestionsFromText = async (
  textContent: string,
  difficulty: Difficulty,
  t: (key: any) => string,
  customPrompt?: string
): Promise<Question[]> => {
  // PRIORITY 1: Google Gemini API
  try {
    console.log("Attempting quiz generation with Gemini...");
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

  } catch (geminiError) {
    console.warn("Gemini generation failed, falling back to DeepSeek API:", geminiError);
    
    // PRIORITY 2: DeepSeek API
    try {
      console.log("Attempting quiz generation with DeepSeek...");
      return await generateQuestionsFromTextWithDeepSeek(textContent, difficulty, customPrompt);
    } catch (deepseekError) {
      console.error("DeepSeek generation also failed, falling back to Local Algorithm:", deepseekError);
      
      // PRIORITY 3: Local Generation Algorithm
      try {
        console.log("Generating questions locally...");
        return generateQuestionsLocally(textContent, difficulty);
      } catch (localError) {
        console.error("Local generation also failed:", localError);
        throw new Error(t('errorGeneratingQuiz'));
      }
    }
  }
};

export const generateQuestionsFromImage = async (
  imageData: string,
  mimeType: string,
  difficulty: Difficulty,
  t: (key: any) => string,
  customPrompt?: string
): Promise<Question[]> => {
  // PRIORITY 1: Google Gemini API (Supports Vision)
  try {
    console.log("Attempting quiz generation from image with Gemini...");
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

  } catch (geminiError) {
    console.error("Error generating questions from Gemini (Image):", geminiError);
    
    // PRIORITY 2: Local Algorithm Fallback (Since DeepSeek Vision is not multimodal-chat ready yet)
    try {
      console.warn("Gemini vision failed, falling back to Local Algorithm...");
      return generateQuestionsLocally("Cuestionario generado desde imagen", difficulty);
    } catch (localError) {
      console.error("Local generation failed for image fallback:", localError);
      throw new Error(t('errorGeneratingQuiz'));
    }
  }
};

export const getDeeperExplanation = async (
  question: string,
  answer: string,
  justification: string,
  language: Language,
  style: ExplanationStyle,
  model: AssistantAiModel = DEFAULT_ASSISTANT_MODEL
): Promise<string> => {
  if (isDeepSeekModel(model)) {
    try {
      console.log("Attempting deeper explanation with selected DeepSeek model...");
      return await getDeeperExplanationWithDeepSeek(question, answer, justification, language, style);
    } catch (deepseekError) {
      console.warn("Selected DeepSeek explanation failed, falling back to Gemini:", deepseekError);
    }
  }

  // PRIORITY 1: Selected Google Gemini API
  try {
    console.log(`Attempting deeper explanation with ${model}...`);
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

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;

  } catch (geminiError) {
    console.warn("Gemini explanation failed, falling back to DeepSeek API:", geminiError);
    
    // PRIORITY 2: DeepSeek API
    try {
      console.log("Attempting deeper explanation with DeepSeek...");
      return await getDeeperExplanationWithDeepSeek(question, answer, justification, language, style);
    } catch (deepseekError) {
      console.error("DeepSeek explanation also failed, falling back to Local Justification:", deepseekError);
      
      // PRIORITY 3: Local algorithm (returns original justification with notice)
      const notice = language === 'es' 
        ? `[Explicación de respaldo local] Justificación oficial de la pregunta:\n\n${justification}`
        : `[Local fallback explanation] Official question justification:\n\n${justification}`;
      return notice;
    }
  }
};
