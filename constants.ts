
import { Genre, Tone, StoryLength, VoiceName, Language } from './types';

export const LANGUAGES = [
  { value: Language.VI, label: 'Tiếng Việt 🇻🇳' },
  { value: Language.EN, label: 'English 🇺🇸' }
];

export const GENRES = Object.values(Genre);
export const TONES = Object.values(Tone);
export const LENGTHS = Object.values(StoryLength);

// Map Enum to UI Labels
export const VOICE_OPTIONS = [
  { value: VoiceName.Puck, label: 'Puck (Nam - Trầm ấm)' },
  { value: VoiceName.Charon, label: 'Charon (Nam - Sâu sắc)' },
  { value: VoiceName.Kore, label: 'Kore (Nữ - Dịu dàng)' },
  { value: VoiceName.Fenrir, label: 'Fenrir (Nam - Mạnh mẽ)' },
  { value: VoiceName.Zephyr, label: 'Zephyr (Nữ - Trong trẻo)' }
];

export const VOICES = Object.values(VoiceName);

export const SAMPLE_PROMPTS = {
  [Language.EN]: [
    "A robot who discovers it loves gardening.",
    "A detective creating a new color.",
    "The last library on a sunken island."
  ],
  [Language.VI]: [
    "Một chàng trai xuyên không về thời Âu Lạc.",
    "Bí ẩn về ngôi làng ma ám ở Đà Lạt.",
    "Chuyện tình giữa một lập trình viên AI và cô gái bán cà phê.",
    "Cuộc chiến giữa các vị thần Sơn Tinh Thủy Tinh thời hiện đại."
  ]
};
