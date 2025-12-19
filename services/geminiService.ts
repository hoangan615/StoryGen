import { GoogleGenAI, Modality, Type } from "@google/genai";
import { StoryConfig, Language } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- 1. Story Generation ---
export const generateStoryText = async (config: StoryConfig): Promise<{ title: string; content: string }> => {
  // Using gemini-3-pro-preview for large context window (handling 10k+ words better)
  const model = "gemini-3-pro-preview";
  
  const langInstruction = config.language === Language.VI 
    ? "WRITE THE STORY STRICTLY IN VIETNAMESE." 
    : "WRITE THE STORY IN ENGLISH.";

  const prompt = `
    You are a professional author. Write a fictional story based on these criteria:
    - Idea: ${config.idea}
    - Genre: ${config.genre}
    - Tone: ${config.tone}
    - Target Length: Approx ${config.length}
    - Language: ${config.language}

    ${langInstruction}

    Structure the story clearly with:
    1. Beginning (Introduction)
    2. Middle (Development)
    3. Climax
    4. Ending (Resolution)

    Output strictly in JSON format with two fields: 
    - "title": A creative title for the story.
    - "content": The full story text formatted with paragraph breaks (\\n).
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING }
          },
          required: ["title", "content"]
        }
      }
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Story generation failed:", error);
    throw new Error("Failed to generate story text.");
  }
};

// --- 2. Image Generation ---
export const generateStoryImage = async (storyTitle: string, storySummary: string): Promise<string> => {
  const model = "gemini-2.5-flash-image";
  const prompt = `Create a cinematic, digital illustration for a story book cover. Title: "${storyTitle}". Context: ${storySummary.substring(0, 300)}... No text on image. High fantasy art style, atmospheric lighting.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    // Fallback if no inline data (rare)
    return `https://picsum.photos/1280/720?grayscale&blur=2`;
  } catch (error) {
    console.error("Image generation failed:", error);
    return `https://picsum.photos/1280/720?grayscale&blur=2`; 
  }
};

// --- 3. Audio Generation (TTS) ---
export const generateStoryAudio = async (text: string, voiceName: string, language: Language): Promise<string> => {
  const model = "gemini-2.5-flash-preview-tts";

  // Limit characters significantly to ensure reliability (max ~2000 chars for a single TTS turn)
  const MAX_CHARS = 2000;
  
  if (!text || text.trim().length === 0) throw new Error("No text provided for audio generation");

  // Clean markdown (*, #, _) from text to improve TTS quality and prevent weird pauses
  const cleanText = text.replace(/[\*\_#`]/g, '');

  const textToSpeak = cleanText.length > MAX_CHARS 
    ? cleanText.substring(0, MAX_CHARS) + (language === Language.VI ? "... (Câu chuyện còn dài)" : "... (Story continues)")
    : cleanText;

  try {
    console.log(`Generating audio for ${textToSpeak.length} characters with voice ${voiceName}`);
    
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: textToSpeak }] }],
      config: {
        // Use string "AUDIO" explicitly to avoid potential Enum import issues in some environments
        responseModalities: ["AUDIO" as any], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
        console.error("No candidates returned", response);
        throw new Error("API returned no candidates. Likely a safety block or overload.");
    }

    const base64Audio = candidate.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      console.error("Gemini response missing audio data:", JSON.stringify(response, null, 2));
      throw new Error("No audio data returned from API");
    }

    return base64Audio;
  } catch (error: any) {
    console.error("Audio generation failed details:", error);
    throw new Error(error.message || "Failed to generate audio.");
  }
};
