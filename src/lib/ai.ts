import { GoogleGenAI, Modality, Type, Schema } from '@google/genai';

// Retrieve the Gemini API Key from either build-time injected process.env or Vite's standard import.meta.env
const getApiKey = (): string => {
  try {
    const key = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!key) {
      console.warn("⚠️ [JobsEdge AI] GEMINI_API_KEY or VITE_GEMINI_API_KEY is not configured. AI features will fail until a key is supplied.");
      return "";
    }
    return key;
  } catch (e) {
    return "";
  }
};

const API_KEY = getApiKey();

export const ai = new GoogleGenAI({ apiKey: API_KEY || 'MISSING_API_KEY' });

/**
 * Safely parses a JSON string, handling potential markdown wrappers.
 */
export const safeJsonParse = <T>(text: string, fallback: T): T => {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) return fallback;
    return JSON.parse(jsonMatch[0]) as T;
  } catch (e) {
    console.error("Failed to parse AI JSON:", e);
    return fallback;
  }
};

/**
 * Standard TTS helper
 */
export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      } as any,
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("Speech Synthesis Error:", error);
    return null;
  }
};

export const handleFirestoreError = (error: any, operationType: string, path: string | null = null) => {
  if (error?.message?.includes('Missing or insufficient permissions')) {
    const errorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo: {
        userId: 'system',
        email: 'system@ais',
        emailVerified: true,
        isAnonymous: false,
        providerInfo: []
      }
    };
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
};
