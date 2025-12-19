export enum Language {
  VI = 'Vietnamese',
  EN = 'English'
}

export enum Genre {
  FANTASY = 'Fantasy',
  SCI_FI = 'Sci-Fi',
  MYSTERY = 'Mystery',
  ROMANCE = 'Romance',
  HORROR = 'Horror',
  ADVENTURE = 'Adventure',
  DRAMA = 'Drama',
  LIFE = 'Life / Slice of Life'
}

export enum Tone {
  WHIMSICAL = 'Whimsical',
  DARK = 'Dark',
  SUSPENSEFUL = 'Suspenseful',
  EMOTIONAL = 'Emotional',
  HUMOROUS = 'Humorous',
  INSPIRING = 'Inspiring',
  CALM = 'Calm'
}

export enum StoryLength {
  FLASH = '200 words',
  VERY_SHORT = '500 words',
  SHORT = '1,000 words',
  MEDIUM = '5,000 words',
  LONG = '10,000 words',
  NOVEL = '20,000 words',
  EPIC = '50,000 words'
}

export enum VoiceName {
  Puck = 'Puck', // Male
  Charon = 'Charon', // Male
  Kore = 'Kore', // Female
  Fenrir = 'Fenrir', // Male
  Zephyr = 'Zephyr' // Female
}

export interface StoryConfig {
  idea: string;
  language: Language;
  genre: Genre;
  tone: Tone;
  length: StoryLength;
  voice: VoiceName;
}

export type ProjectStatus = 'draft' | 'story_generated' | 'audio_generated';

export interface Project {
  id: string;
  title: string;
  config: StoryConfig;
  content: string;
  status: ProjectStatus;
  imageUrl?: string;
  audioData?: string;
  createdAt: number;
  updatedAt: number;
}