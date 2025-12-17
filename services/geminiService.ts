import {
    GoogleGenAI,
    Modality,
    LiveServerMessage,
    Type,
    Session,
} from "@google/genai";
import {
    Lesson,
    PronunciationFeedback,
    WordTiming,
    Scenario,
    Sentence,
} from "../types";

// This file assumes that process.env.API_KEY is set in the environment.
// Do not add any code to handle the API key manually in the UI.
let ai: GoogleGenAI | null = null;

const getAiClient = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

export async function generateSpeech(text: string): Promise<string> {
    if (!text || !text.trim()) {
        throw new Error("Input text for speech generation cannot be empty.");
    }
    try {
        const genAI = getAiClient();
        const prompt = `Speak the following text in Farsi: ${text}`;

        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: "Kore" },
                    },
                },
            },
        });

        if (
            !response ||
            !response.candidates ||
            response.candidates.length === 0
        ) {
            console.error("Empty response from Gemini API:", response);
            throw new Error(
                "Keine Antwort von der API erhalten. Möglicherweise ist das Kontingent erschöpft.",
            );
        }

        const base64Audio =
            response.candidates[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            console.error(
                "No audio data in response:",
                JSON.stringify(response, null, 2),
            );
            throw new Error("No audio data received from API.");
        }

        return base64Audio;
    } catch (error) {
        console.error("Gemini API error in generateSpeech:", error);

        if (error instanceof Error) {
            if (
                error.message.includes("RESOURCE_EXHAUSTED") ||
                error.message.includes("429")
            ) {
                throw new Error(
                    "API-Limit erreicht. Bitte versuche es in ein paar Minuten erneut.",
                );
            } else if (
                error.message.includes("PERMISSION_DENIED") ||
                error.message.includes("401") ||
                error.message.includes("403")
            ) {
                throw new Error("API-Schlüssel ungültig oder abgelaufen.");
            } else if (
                error.message.includes("NOT_FOUND") ||
                error.message.includes("404")
            ) {
                throw new Error(
                    "Model nicht gefunden. Bitte Admin kontaktieren.",
                );
            } else if (
                error.message.includes("fetch") ||
                error.message.includes("network")
            ) {
                throw new Error(
                    "Netzwerkfehler. Bitte Internetverbindung prüfen.",
                );
            }
            throw error;
        }
        throw new Error("Failed to generate speech from Gemini API.");
    }
}

export async function getWordTimings(
    farsiSentence: string,
): Promise<WordTiming[]> {
    try {
        const genAI = getAiClient();
        const prompt = `
            Analyze the following Farsi sentence and provide the start and end time for each word.
            Sentence: "${farsiSentence}"
            Provide the output as a JSON array, where each object has "word" (the Farsi word), "startTime" (in seconds), and "endTime" (in seconds).
            The words in the JSON array must match the words in the sentence exactly, including punctuation attached to words.
        `;

        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING },
                            startTime: { type: Type.NUMBER },
                            endTime: { type: Type.NUMBER },
                        },
                        required: ["word", "startTime", "endTime"],
                    },
                },
            },
        });

        const jsonResponse = JSON.parse(response.text);
        return jsonResponse as WordTiming[];
    } catch (error) {
        console.error("Gemini API error in getWordTimings:", error);
        throw new Error("Failed to get word timings from Gemini API.");
    }
}

export async function getPronunciationFeedback(
    correctSentence: string,
    userAttempt: string,
): Promise<PronunciationFeedback> {
    try {
        const genAI = getAiClient();
        const prompt = `
            A German-speaking student is learning Farsi.
            The correct Farsi sentence is: "${correctSentence}"
            The student's attempt was transcribed as: "${userAttempt}"
            
            Analyze the pronunciation mistakes and provide feedback in JSON format.
        `;

        const response = await genAI.models.generateContent({
            model: "gemini-2.0-flash-lite",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        germanExplanation: {
                            type: Type.STRING,
                            description:
                                "A concise, specific, and encouraging feedback in German on the pronunciation mistakes. Focus on phonemes or common errors for German speakers. Keep it simple. Start directly with the feedback.",
                        },
                        farsiCorrection: {
                            type: Type.STRING,
                            description:
                                "A short, simple phrase in Farsi that a teacher would use to correct the student. For example, suggest the correct pronunciation by saying 'اینطور بگو:' followed by the correct phrase, or focus on the mispronounced word.",
                        },
                    },
                    required: ["germanExplanation", "farsiCorrection"],
                },
            },
        });

        const jsonResponse = JSON.parse(response.text);

        return {
            germanText: jsonResponse.germanExplanation,
            farsiAudioText: jsonResponse.farsiCorrection,
        };
    } catch (error) {
        console.error("Gemini API error in getPronunciationFeedback:", error);
        throw new Error(
            "Failed to get pronunciation feedback from Gemini API.",
        );
    }
}

export async function getHelpForSentence(
    sentence: Sentence,
    question: string,
): Promise<string> {
    try {
        const genAI = getAiClient();
        const prompt = `
            You are a friendly and concise Farsi language tutor for a German-speaking beginner. 
            The user is currently working on decoding a specific sentence and has a question. 
            Your answer must be in German and directly address the user's question in the context of the provided sentence.
            Keep your explanation clear, simple, and focused. Avoid overly complex grammatical terms.

            **Sentence Context:**
            - Farsi: "${sentence.farsi}"
            - Latin Transcription: "${sentence.latin}"
            - German Translation: "${sentence.germanTranslation}"

            **User's Question:**
            "${question}"

            Please provide your answer now.
        `;

        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Gemini API error in getHelpForSentence:", error);
        throw new Error("Failed to get help from the AI tutor.");
    }
}

export async function generateRoleplayScenarios(
    systemInstruction: string,
): Promise<Scenario[]> {
    try {
        const genAI = getAiClient();
        const prompt = `Based on the following system instruction for a Farsi language tutor, generate exactly three distinct, engaging role-play scenario DESCRIPTIONS for the student to choose from. These should be short, one-sentence descriptions of a situation (e.g., "Ordering food in a restaurant" or "Meeting a new colleague at work"), NOT the first line of dialogue.

For each scenario description, provide both the Farsi text and its simple German translation. Return them as a JSON array of objects.

System Instruction:
---
${systemInstruction}
---

Your response must be a valid JSON array, where each object has a "farsi" key (the scenario description in Farsi) and a "german" key (the German translation of the description). For example: [{"farsi": "سفارش غذا در یک رستوران", "german": "Essen in einem Restaurant bestellen"}, {"farsi": "...", "german": "..."}]
`;
        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            farsi: {
                                type: Type.STRING,
                                description:
                                    "The role-play scenario description in Farsi.",
                            },
                            german: {
                                type: Type.STRING,
                                description:
                                    "The German translation of the Farsi scenario description.",
                            },
                        },
                        required: ["farsi", "german"],
                    },
                },
            },
        });
        const jsonResponse = JSON.parse(response.text);
        return jsonResponse as Scenario[];
    } catch (error) {
        console.error("Gemini API error in generateRoleplayScenarios:", error);
        throw new Error("Failed to generate role-play scenarios.");
    }
}

export async function generateFarsiTTSFromGerman(
    germanText: string,
): Promise<string> {
    if (!germanText || !germanText.trim()) {
        throw new Error("Input text for TTS generation cannot be empty.");
    }
    try {
        const genAI = getAiClient();
        const prompt = `A German student wants to inject the following intent into a Farsi conversation. First, translate the user's intent from German to Farsi. Then, speak ONLY the resulting Farsi translation in a clear, neutral Farsi voice.
German Intent: "${germanText}"`;

        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash-live",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: "Kore" },
                    },
                },
            },
        });

        const base64Audio =
            response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error(
                "No audio data received from API for TTS injection.",
            );
        }

        return base64Audio;
    } catch (error) {
        console.error("Gemini API error in generateFarsiTTSFromGerman:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to generate injected speech from Gemini API.");
    }
}

export function connectToLiveChat(
    systemInstruction: string,
    callbacks: {
        onopen: () => void;
        onmessage: (message: LiveServerMessage) => Promise<void>;
        onerror: (e: ErrorEvent) => void;
        onclose: (e: CloseEvent) => void;
    },
): Promise<Session> {
    const genAI = getAiClient();

    const sessionPromise = genAI.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
            },
            systemInstruction,
            outputAudioTranscription: {},
            inputAudioTranscription: {},
        },
    });

    return sessionPromise;
}
