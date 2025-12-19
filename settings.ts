
export const APP_SETTINGS = {
  MODELS: {
    STORY: "gemini-3-pro-preview",
    IMAGE: "gemini-2.5-flash-image",
    AUDIO: "gemini-2.5-flash-preview-tts",
    VEO: "veo-3.1-fast-generate-preview",
  },
  LIMITS: {
    MAX_TTS_CHARS: 2000,
  },
  VIDEO: {
    DEFAULT_FPS: 30,
    QUALITY: {
      '720p': {
        WIDTH: 720,
        HEIGHT: 1280,
        BITRATE: 2500000, // 2.5 Mbps
      },
      '1080p': {
        WIDTH: 1080,
        HEIGHT: 1920,
        BITRATE: 5000000, // 5 Mbps
      }
    }
  }
};
