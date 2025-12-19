import { Genre, Tone, StoryLength, VoiceName, Language } from './types';

export const LANGUAGES = [
  { value: Language.VI, label: 'Tiếng Việt 🇻🇳' },
  { value: Language.EN, label: 'English 🇺🇸' }
];

export const GENRES = Object.values(Genre);
export const TONES = Object.values(Tone);
export const LENGTHS = Object.values(StoryLength);
export const VOICES = Object.values(VoiceName);

export const SAMPLE_PROMPTS = {
  [Language.EN]: [
    "A robot who discovers it loves gardening.",
    "A detective creating a new color.",
    "The last library on a sunken island."
  ],
  [Language.VI]: [
    "Một chú robot phát hiện ra mình yêu thích làm vườn.",
    "Thám tử tìm ra một màu sắc mới chưa từng tồn tại.",
    "Thư viện cuối cùng trên một hòn đảo bị chìm."
  ]
};
