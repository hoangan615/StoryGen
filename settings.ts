
export const APP_SETTINGS = {
  AVAILABLE_MODELS: {
    STORY: [
      { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (Rất Rẻ - Nhanh)" },
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Cân bằng - Phổ biến)" },
      { value: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview (Thế hệ mới - Free Tier)" },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Thông minh - Giá cao)" },
      { value: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview (Thông minh nhất - Free Tier)" },
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Cũ)" },
      { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite (Cũ - Rẻ)" }
    ],
    IMAGE: [
      { value: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image (Nhanh - Rẻ)" },
      { value: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image (Chất lượng cao - Free Tier)" }
    ],
    AUDIO: [
      { value: "gemini-2.5-flash-preview-tts", label: "Gemini 2.5 Flash TTS (Giọng đọc chuẩn)" },
      { value: "gemini-2.5-pro-preview-tts", label: "Gemini 2.5 Pro TTS (Giọng đọc cao cấp)" },
      { value: "gemini-2.5-flash-native-audio-preview-12-2025", label: "Gemini 2.5 Flash Native Audio (Experimental)" }
    ],
    VEO: [] // No Veo models in the requested list
  },
  
  // Pricing Estimation (USD) based on standard Google Cloud pricing
  PRICING: {
    'gemini-2.5-flash-lite': { input: 0.0375, output: 0.15 },
    'gemini-2.5-flash-lite-preview-09-2025': { input: 0.0375, output: 0.15 },
    'gemini-2.0-flash-lite': { input: 0.0375, output: 0.15 },
    'gemini-2.5-flash': { input: 0.075, output: 0.30 },
    'gemini-2.5-flash-preview-09-2025': { input: 0.075, output: 0.30 },
    'gemini-3-flash-preview': { input: 0.075, output: 0.30 },
    'gemini-2.0-flash': { input: 0.10, output: 0.40 },
    'gemini-2.5-pro': { input: 3.50, output: 10.50 },
    'gemini-3-pro-preview': { input: 3.50, output: 10.50 },
    'gemini-2.5-flash-image': { perUnit: 0.04 }, 
    'gemini-3-pro-image-preview': { perUnit: 0.08 },
    'gemini-2.5-flash-preview-tts': { per1kChars: 0.004 }, 
    'gemini-2.5-pro-preview-tts': { per1kChars: 0.008 },
    'gemini-2.5-flash-native-audio-preview-12-2025': { input: 0.075, output: 0.30 }
  },

  LIMITS: {
    MAX_TTS_CHARS: 10000,
  },
  VIDEO: {
    FPS_OPTIONS: [
        { value: 15, label: "15 FPS (Nhanh - Nhẹ máy)" },
        { value: 30, label: "30 FPS (Mượt mà)" },
        { value: 60, label: "60 FPS (Cao cấp - Nặng)" }
    ],
    DEFAULT_FPS: 30,
    QUALITY: {
      '720p': {
        WIDTH: 720,
        HEIGHT: 1280,
        BITRATE: 2500000,
      },
      '1080p': {
        WIDTH: 1080,
        HEIGHT: 1920,
        BITRATE: 5000000,
      }
    }
  }
};
