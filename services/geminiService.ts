import { GoogleGenAI, Modality, Type } from "@google/genai";
import { StoryConfig, Language } from '../types';
import { APP_SETTINGS } from '../settings';

// Helper to ensure fresh instance with latest key (important for paid features like Veo)
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- 1. Story Generation ---
export const generateStoryText = async (config: StoryConfig): Promise<{ title: string; content: string }> => {
  const ai = getAiClient();
  const model = APP_SETTINGS.MODELS.STORY;
  
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
  const ai = getAiClient();
  const model = APP_SETTINGS.MODELS.IMAGE;
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
    return `https://picsum.photos/1280/720?grayscale&blur=2`;
  } catch (error) {
    console.error("Image generation failed:", error);
    return `https://picsum.photos/1280/720?grayscale&blur=2`; 
  }
};

// --- 3. Audio Generation (TTS) ---
export const generateStoryAudio = async (text: string, voiceName: string, language: Language): Promise<string> => {
  const ai = getAiClient();
  const model = APP_SETTINGS.MODELS.AUDIO;
  const MAX_CHARS = APP_SETTINGS.LIMITS.MAX_TTS_CHARS;
  
  if (!text || text.trim().length === 0) throw new Error("No text provided for audio generation");

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
        responseModalities: ["AUDIO" as any], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("API returned no candidates.");

    const base64Audio = candidate.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data returned from API");

    return base64Audio;
  } catch (error: any) {
    console.error("Audio generation failed details:", error);
    throw new Error(error.message || "Failed to generate audio.");
  }
};

// --- 4. Veo Video Generation ---
export const generateVeoVideo = async (imageBase64: string): Promise<string> => {
  const ai = getAiClient();
  const model = APP_SETTINGS.MODELS.VEO;

  // Extract base64 data and mimeType from data URL (e.g. "data:image/png;base64,.....")
  const match = imageBase64.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image format for Veo");
  
  const mimeType = match[1];
  const imageBytes = match[2];

  try {
    // Determine aspect ratio based on image or default to 9:16 for mobile
    // Veo fast preview supports 16:9 or 9:16.
    
    let operation = await ai.models.generateVideos({
      model,
      prompt: "Cinematic motion, atmospheric lighting, high quality, 4k", // Prompt is required/optional but good to have
      image: {
        imageBytes,
        mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16' // Defaulting to portrait for this app context
      }
    });

    console.log("Veo operation started...");

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      console.log("Polling Veo status...");
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Veo generation finished but no video URI returned.");

    // Fetch the video content
    // Important: Append API Key to download link
    const videoResponse = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
    const videoBlob = await videoResponse.blob();

    // Convert to base64 to store in project (consistent with other assets)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(videoBlob);
    });

  } catch (error: any) {
    console.error("Veo generation failed:", error);
    throw new Error(error.message || "Failed to animate image with Veo.");
  }
};
