import { Question, CompletedQuiz } from '../types';

declare const XLSX: any; // From CDN script

export const decodeHtml = (html: string | undefined): string => {
    if (typeof window === 'undefined' || !html) return html || '';
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    } catch (e) {
        console.error("Failed to parse HTML string", e);
        return html;
    }
};

export const safeSpreadsheetCell = (value: unknown): string | number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const text = String(value ?? '');
    return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
};


export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

export const parseCorrectAnswerIndex = (rawValue: unknown, isOneBased = false): number => {
    if (rawValue === null || rawValue === undefined) return -1;
    const str = String(rawValue).trim().toUpperCase();
    if (!str) return -1;

    // Letters A-D or variants
    if (str === 'A' || str === 'OPCIÓN 1' || str === 'OPCION 1' || str === 'OPTION 1' || str === 'OPCIÓN A' || str === 'OPCION A') return 0;
    if (str === 'B' || str === 'OPCIÓN 2' || str === 'OPCION 2' || str === 'OPTION 2' || str === 'OPCIÓN B' || str === 'OPCION B') return 1;
    if (str === 'C' || str === 'OPCIÓN 3' || str === 'OPCION 3' || str === 'OPTION 3' || str === 'OPCIÓN C' || str === 'OPCION C') return 2;
    if (str === 'D' || str === 'OPCIÓN 4' || str === 'OPCION 4' || str === 'OPTION 4' || str === 'OPCIÓN D' || str === 'OPCION D') return 3;

    const num = Number(str);
    if (Number.isInteger(num)) {
        if (isOneBased) {
            if (num >= 1 && num <= 4) return num - 1;
        } else {
            if (num >= 0 && num <= 3) return num;
            if (num === 4) return 3; // 4 is always 4th option (index 3)
        }
    }

    return -1;
};

export const parseSpreadsheet = (file: File): Promise<Question[]> => {
    return new Promise((resolve, reject) => {
        if (typeof XLSX === 'undefined') {
            reject(new Error("La librería de procesamiento de hojas de cálculo (XLSX) no está disponible en el navegador. Revisa tu conexión a internet o desactiva bloqueadores de scripts."));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                if (!sheetName) throw new Error('La hoja de cálculo seleccionada está vacía.');
                const worksheet = workbook.Sheets[sheetName];
                const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (!json || json.length <= 1) {
                    throw new Error('La hoja de cálculo no contiene filas de datos. Descarga la plantilla de Excel para ver el formato requerido.');
                }

                // Detect if rows use 1-based indexing (1 to 4) instead of 0 to 3:
                // If any answer is 4, or if all numeric answers are between 1 and 4 with no row containing 0.
                const dataRows = json.slice(1, 201);
                let hasZero = false;
                let hasFour = false;

                dataRows.forEach(row => {
                    if (row && row[5] !== undefined) {
                        const val = String(row[5]).trim();
                        if (val === '0') hasZero = true;
                        if (val === '4') hasFour = true;
                    }
                });

                const isOneBased = hasFour || !hasZero;

                const questions: Question[] = dataRows
                    .map((row, index) => {
                        if (!row || row.length < 6) return null; // Must have question, 4 options, and answer index

                        const questionText = decodeHtml(String(row[0] ?? '')).trim();
                        const options = row.slice(1, 5).map(value => decodeHtml(String(value ?? '')).trim());
                        const correctAnswerIndex = parseCorrectAnswerIndex(row[5], isOneBased);

                        if (
                            !questionText ||
                            options.length !== 4 ||
                            options.some(option => !option) ||
                            correctAnswerIndex < 0 ||
                            correctAnswerIndex > 3
                        ) return null;

                        const question: Question = {
                            id: `${file.name}-${index}`,
                            questionText: questionText.slice(0, 2_000),
                            options: options.map(option => option.slice(0, 1_000)),
                            correctAnswerIndex,
                        };
                        
                        if (row[6]) {
                            question.justification = decodeHtml(String(row[6])).trim().slice(0, 5_000);
                        }
                        
                        return question;
                    })
                    .filter((q): q is Question => q !== null);
                
                if (questions.length === 0) {
                    throw new Error('No se encontraron preguntas con el formato esperado. Asegúrate de incluir: Pregunta, 4 opciones y la respuesta correcta (0-3, 1-4 o A-D). Puedes descargar la plantilla como guía.');
                }

                resolve(questions);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

export const readFileAsBase64 = (file: File): Promise<{ mimeType: string, data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const parts = result.split(',');
      if (parts.length !== 2) {
        return reject(new Error("Invalid data URL format."));
      }
      const header = parts[0];
      const data = parts[1];
      const mimeTypeMatch = header.match(/:(.*?);/);
      if (!mimeTypeMatch || !mimeTypeMatch[1]) {
        return reject(new Error("Could not determine MIME type from data URL."));
      }
      resolve({ mimeType: mimeTypeMatch[1], data });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const addHeader = (doc: any, title: string, t: (key: string) => string) => {
    const pageWidth = doc.internal.pageSize.width;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    doc.text(t('APP_TITLE'), 15, 12);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40);
    doc.text(title, pageWidth / 2, 22, { align: 'center' });
};

const addFooter = (doc: any) => {
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 25, pageHeight - 10);
    }
};

// FIX: Implement and export missing functions
export const exportToPdf = async (questions: Question[], t: (key: any) => string) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const maxLineWidth = pageWidth - margin * 2;
    let yPosition = 35;
    const lineHeight = 7;
    const questionSpacing = 15;
    const sectionSpacing = 5;

    addHeader(doc, t('favorites'), t);

    const checkPageBreak = (spaceNeeded: number) => {
        if (yPosition + spaceNeeded > pageHeight - margin) {
            doc.addPage();
            yPosition = 25;
            // No need to add header again, addFooter handles page iteration
        }
    };

    questions.forEach((q, index) => {
        // Question Text
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const questionText = `${index + 1}. ${decodeHtml(q.questionText)}`;
        const questionLines = doc.splitTextToSize(questionText, maxLineWidth);
        checkPageBreak(questionLines.length * lineHeight + sectionSpacing);
        doc.text(questionLines, margin, yPosition);
        yPosition += questionLines.length * lineHeight + sectionSpacing;

        // Options
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        q.options.forEach((opt, i) => {
            const isCorrect = i === q.correctAnswerIndex;
            if (isCorrect) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(34, 139, 34); // ForestGreen
            } else {
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100); // Gray
            }
            const optionText = `- ${decodeHtml(opt)}`;
            const optionLines = doc.splitTextToSize(optionText, maxLineWidth - 5);
            checkPageBreak(optionLines.length * lineHeight + 2);
            doc.text(optionLines, margin + 5, yPosition);
            yPosition += optionLines.length * lineHeight + 2;
            doc.setTextColor(40); // Reset color
            doc.setFont('helvetica', 'normal');
        });

        // Justification
        if (q.justification) {
            yPosition += sectionSpacing;
            checkPageBreak(lineHeight * 2);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`${t('justification')}:`, margin, yPosition);
            yPosition += lineHeight;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(40);
            const justificationLines = doc.splitTextToSize(decodeHtml(q.justification), maxLineWidth - 5);
            checkPageBreak(justificationLines.length * lineHeight);
            doc.text(justificationLines, margin + 5, yPosition);
            yPosition += justificationLines.length * lineHeight;
        }

        yPosition += questionSpacing;
        checkPageBreak(questionSpacing); // Check space for next question
    });

    addFooter(doc);
    doc.save(`${t('favorites')}.pdf`);
};

export const exportToExcel = (questions: Question[], t: (key: any) => string) => {
    const data = questions.map(q => ({
        [t('question')]: safeSpreadsheetCell(decodeHtml(q.questionText)),
        [`${t('option')} 1`]: safeSpreadsheetCell(decodeHtml(q.options[0])),
        [`${t('option')} 2`]: safeSpreadsheetCell(decodeHtml(q.options[1])),
        [`${t('option')} 3`]: safeSpreadsheetCell(decodeHtml(q.options[2])),
        [`${t('option')} 4`]: safeSpreadsheetCell(decodeHtml(q.options[3])),
        [`${t('correctAnswer')} Index (0-3)`]: q.correctAnswerIndex,
        [t('justification')]: safeSpreadsheetCell(decodeHtml(q.justification)),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t('favorites'));
    XLSX.writeFile(workbook, `${t('favorites')}.xlsx`);
};

export const downloadExcelTemplate = (t: (key: string) => string) => {
    const headers = [
      'Question', 
      'Option1', 
      'Option2', 
      'Option3', 
      'Option4', 
      'CorrectAnswerIndex (0-3)', 
      'Justification (Optional)'
    ];
    const example = [
        "What is the capital of France?",
        "Berlin",
        "Madrid",
        "Paris",
        "Rome",
        2,
        "Paris is the capital and most populous city of France."
    ];
    const data = [headers, example];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths for better readability
    const columnWidths = [
        { wch: 50 }, // Question
        { wch: 20 }, // Option1
        { wch: 20 }, // Option2
        { wch: 20 }, // Option3
        { wch: 20 }, // Option4
        { wch: 25 }, // CorrectAnswerIndex
        { wch: 50 }, // Justification
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Quiz Template");
    XLSX.writeFile(workbook, "quiz_template.xlsx");
};

export const exportQuizReportToPdf = async (quiz: CompletedQuiz, t: (key: any) => string) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const maxLineWidth = pageWidth - margin * 2;
    let yPosition = 35;
    const lineHeight = 7;
    const questionSpacing = 12;
    const sectionSpacing = 5;
    
    const isCompleted = Object.keys(quiz.userAnswers).length === quiz.totalQuestions;

    addHeader(doc, t('quizDetails'), t);

    // Summary section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${t('completedOn')}:`, margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(quiz.date).toLocaleString(), margin + 45, yPosition);

    doc.setFont('helvetica', 'bold');
    doc.text(`${t('score')}:`, margin, yPosition + lineHeight);
    doc.setFont('helvetica', 'normal');
    const percentage = quiz.totalQuestions > 0 ? Math.round((quiz.score / quiz.totalQuestions) * 100) : 0;
    doc.text(`${quiz.score} / ${quiz.totalQuestions} (${percentage}%)`, margin + 45, yPosition + lineHeight);

    doc.setFont('helvetica', 'bold');
    doc.text(`${t('difficulty')}:`, margin, yPosition + lineHeight * 2);
    doc.setFont('helvetica', 'normal');
    doc.text(t(quiz.difficulty), margin + 45, yPosition + lineHeight * 2);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`${t('status')}:`, margin, yPosition + lineHeight * 3);
    doc.setFont('helvetica', 'normal');
    doc.text(isCompleted ? t('completed') : t('inProgress'), margin + 45, yPosition + lineHeight * 3);
    
    yPosition += lineHeight * 5;

    const checkPageBreak = (spaceNeeded: number) => {
        if (yPosition + spaceNeeded > pageHeight - margin) {
            doc.addPage();
            yPosition = 25;
        }
    };
    
    quiz.questions.forEach((q, index) => {
        // Question Text
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const questionText = `${index + 1}. ${decodeHtml(q.questionText)}`;
        const questionLines = doc.splitTextToSize(questionText, maxLineWidth);
        checkPageBreak(questionLines.length * lineHeight + sectionSpacing);
        doc.text(questionLines, margin, yPosition);
        yPosition += questionLines.length * lineHeight + sectionSpacing;

        // Options
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        q.options.forEach((opt, i) => {
            const isCorrect = i === q.correctAnswerIndex;
            const isUserAnswer = quiz.userAnswers[q.id] === i;
            let prefix = '';
            
            if (isCorrect && isUserAnswer) {
                prefix = `[${t('correct')}] `;
                doc.setTextColor(34, 139, 34); // ForestGreen
            } else if (isUserAnswer && !isCorrect) {
                prefix = `[${t('yourAnswer')}] `;
                doc.setTextColor(220, 20, 60); // Crimson
            } else if (isCorrect) {
                prefix = `[${t('correctAnswer')}] `;
                doc.setTextColor(34, 139, 34); // ForestGreen for correct answer not chosen
            } else {
                prefix = '';
                doc.setTextColor(100); // Gray
            }
            
            const optionText = `${prefix}${decodeHtml(opt)}`;
            const optionLines = doc.splitTextToSize(optionText, maxLineWidth - 5);
            checkPageBreak(optionLines.length * lineHeight + 3);
            doc.text(optionLines, margin + 5, yPosition);
            yPosition += optionLines.length * lineHeight + 3;
            doc.setTextColor(40); // Reset color
        });

        // Unanswered section
        if (quiz.userAnswers[q.id] === undefined) {
            yPosition += 2;
            checkPageBreak(lineHeight);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(255, 165, 0); // Orange
            doc.text(`- ${t('unanswered')} -`, margin + 5, yPosition);
            yPosition += lineHeight;
            doc.setTextColor(40);
        }

        // Justification
        if (q.justification) {
            yPosition += sectionSpacing;
            checkPageBreak(lineHeight * 2);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`${t('justification')}:`, margin, yPosition);
            yPosition += lineHeight;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(40);
            const justificationLines = doc.splitTextToSize(decodeHtml(q.justification), maxLineWidth - 5);
            checkPageBreak(justificationLines.length * lineHeight);
            doc.text(justificationLines, margin + 5, yPosition);
            yPosition += justificationLines.length * lineHeight;
        }

        yPosition += questionSpacing;
        checkPageBreak(questionSpacing);
    });
    
    addFooter(doc);
    doc.save(`${t('quizDetails')}-${quiz.id}.pdf`);
}

export const exportQuizForEvaluationToPdf = async (quiz: CompletedQuiz, t: (key: any) => string) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const maxLineWidth = pageWidth - margin * 2;
    let yPosition = 35;
    const lineHeight = 7;
    const questionSpacing = 15;

    addHeader(doc, t('examTitle'), t);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${t('name')}: _________________________`, margin, yPosition);
    doc.text(`${t('date')}: _________________________`, pageWidth / 2 + 10, yPosition);
    yPosition += questionSpacing;

    const checkPageBreak = (spaceNeeded: number) => {
        if (yPosition + spaceNeeded > pageHeight - margin) {
            doc.addPage();
            yPosition = 25;
        }
    };

    quiz.questions.forEach((q, index) => {
        // Question Text
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const questionText = `${index + 1}. ${decodeHtml(q.questionText)}`;
        const questionLines = doc.splitTextToSize(questionText, maxLineWidth);
        checkPageBreak(questionLines.length * lineHeight + 5);
        doc.text(questionLines, margin, yPosition);
        yPosition += questionLines.length * lineHeight + 5;

        // Options
        doc.setFont('helvetica', 'normal');
        q.options.forEach((opt, i) => {
            const optionText = `  ${String.fromCharCode(97 + i)}) ${decodeHtml(opt)}`;
            const optionLines = doc.splitTextToSize(optionText, maxLineWidth - 10);
            checkPageBreak(optionLines.length * lineHeight + 3);
            doc.text(optionLines, margin + 5, yPosition);
            yPosition += optionLines.length * lineHeight + 3;
        });
        yPosition += questionSpacing / 2;
        checkPageBreak(questionSpacing);
    });

    addFooter(doc);
    doc.save(`${t('examTitle')}-${quiz.id}.pdf`);
}

export const exportQuizWithKeyToPdf = async (quiz: CompletedQuiz, t: (key: any) => string) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const maxLineWidth = pageWidth - margin * 2;
    let yPosition = 35;
    const lineHeight = 7;
    const questionSpacing = 15;

    const checkPageBreak = (spaceNeeded: number) => {
        if (yPosition + spaceNeeded > pageHeight - margin) {
            doc.addPage();
            yPosition = 25;
        }
    };
    
    // Exam Part
    addHeader(doc, t('examTitle'), t);
    
    quiz.questions.forEach((q, index) => {
        // Question Text
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const questionText = `${index + 1}. ${decodeHtml(q.questionText)}`;
        const questionLines = doc.splitTextToSize(questionText, maxLineWidth);
        checkPageBreak(questionLines.length * lineHeight + 5);
        doc.text(questionLines, margin, yPosition);
        yPosition += questionLines.length * lineHeight + 5;

        // Options
        doc.setFont('helvetica', 'normal');
        q.options.forEach((opt) => {
            const optionText = `  o  ${decodeHtml(opt)}`;
            const optionLines = doc.splitTextToSize(optionText, maxLineWidth - 10);
            checkPageBreak(optionLines.length * lineHeight + 3);
            doc.text(optionLines, margin + 5, yPosition);
            yPosition += optionLines.length * lineHeight + 3;
        });
        yPosition += questionSpacing / 2;
        checkPageBreak(questionSpacing);
    });

    // Answer Key Part
    doc.addPage();
    yPosition = 35;
    addHeader(doc, t('answerKey'), t);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    quiz.questions.forEach((q, index) => {
        const answerText = `${index + 1}. ${decodeHtml(q.options[q.correctAnswerIndex])}`;
        const answerLines = doc.splitTextToSize(answerText, maxLineWidth);
        checkPageBreak(answerLines.length * (lineHeight) + 4);
        doc.text(answerLines, margin, yPosition);
        yPosition += answerLines.length * (lineHeight) + 4;
    });


    addFooter(doc);
    doc.save(`${t('examTitle')}-con-clave-${quiz.id}.pdf`);
}

export const exportQuizBackupToExcel = (quiz: CompletedQuiz, t: (key: any, options?: any) => string) => {
    // 1. Create Summary Data
    const summaryData = [
        [t('name'), safeSpreadsheetCell(quiz.name || t('untitledQuiz'))],
        [t('date'), new Date(quiz.date).toLocaleString()],
        [t('difficulty'), t(quiz.difficulty)],
        [t('score'), `${quiz.score} / ${quiz.totalQuestions}`],
        [t('status'), t('completed')]
    ];
    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);

    // 2. Create Questions Data
    const maxExplanations = Object.values(quiz.savedExplanations || {}).reduce((max, arr) => Math.max(max, arr.length), 0);
    const explanationHeaders = Array.from({ length: maxExplanations }, (_, i) => t('explanationColumn', { n: i + 1 }));

    const questionsHeaders = [
        '#',
        t('question'),
        t('option') + ' 1',
        t('option') + ' 2',
        t('option') + ' 3',
        t('option') + ' 4',
        t('correctAnswer'),
        t('yourAnswer'),
        t('result'),
        t('justification'),
        ...explanationHeaders
    ];

    const questionsData = quiz.questions.map((q, index) => {
        const userAnswerIndex = quiz.userAnswers[q.id];
        const yourAnswerText = userAnswerIndex !== undefined ? q.options[userAnswerIndex] : t('unanswered');
        let resultText = t('unanswered');
        if (userAnswerIndex !== undefined) {
            resultText = userAnswerIndex === q.correctAnswerIndex ? t('correct') : t('incorrect');
        }

        const savedExps = quiz.savedExplanations?.[q.id] || [];
        const explanationCells = Array.from({ length: maxExplanations }, (_, i) => safeSpreadsheetCell(decodeHtml(savedExps[i] || '')));

        return [
            index + 1,
            safeSpreadsheetCell(decodeHtml(q.questionText)),
            ...q.options.map(opt => safeSpreadsheetCell(decodeHtml(opt))),
            safeSpreadsheetCell(decodeHtml(q.options[q.correctAnswerIndex])),
            safeSpreadsheetCell(decodeHtml(yourAnswerText)),
            safeSpreadsheetCell(resultText),
            safeSpreadsheetCell(decodeHtml(q.justification)),
            ...explanationCells
        ];
    });

    const questionsWorksheet = XLSX.utils.aoa_to_sheet([questionsHeaders, ...questionsData]);
    
    // Set column widths
    const summaryWidths = [{ wch: 20 }, { wch: 50 }];
    summaryWorksheet['!cols'] = summaryWidths;
    const explanationWidths = Array(maxExplanations).fill({ wch: 60 });
    const questionsWidths = [
        { wch: 5 },  // #
        { wch: 60 }, // Question
        { wch: 30 }, // Opt 1
        { wch: 30 }, // Opt 2
        { wch: 30 }, // Opt 3
        { wch: 30 }, // Opt 4
        { wch: 30 }, // Correct Answer
        { wch: 30 }, // Your Answer
        { wch: 15 }, // Result
        { wch: 60 }, // Justification
        ...explanationWidths
    ];
    questionsWorksheet['!cols'] = questionsWidths;

    // 3. Create Workbook and Download
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, t('summary'));
    XLSX.utils.book_append_sheet(workbook, questionsWorksheet, t('questions'));

    const safeName = (quiz.name || quiz.id).replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `Quiz_Backup_${safeName}.xlsx`);
};
