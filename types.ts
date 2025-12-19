
export enum Language {
  VI = 'Vietnamese',
  EN = 'English'
}

// Updated with Vietnamese values directly for better prompt context
export enum Genre {
  TIEN_HIEP = 'Tiên Hiệp (Tu Tiên)',
  KIEM_HIEP = 'Kiếm Hiệp',
  NGON_TINH = 'Ngôn Tình (Lãng Mạn)',
  XUYEN_KHONG = 'Xuyên Không',
  TRINH_THAM = 'Trinh Thám / Bí Ẩn',
  KINH_DI = 'Kinh Dị / Ma Quái',
  KHOA_HOC_VIEN_TUONG = 'Khoa Học Viễn Tưởng (Sci-Fi)',
  CO_TICH = 'Cổ Tích / Thần Thoại',
  HAI_HUOC = 'Hài Hước',
  DOI_THUONG = 'Đời Thường (Slice of Life)',
  HOC_DUONG = 'Học Đường',
  LICH_SU = 'Lịch Sử / Dã Sử',
  HANH_DONG = 'Hành Động / Phiêu Lưu'
}

export enum Tone {
  VUI_VE = 'Vui vẻ / Hạnh phúc',
  HAI_HUOC = 'Hài hước / Châm biếm',
  U_AM = 'U ám / Đen tối',
  HOI_HOP = 'Hồi hộp / Kịch tính',
  CAM_DONG = 'Cảm động / Sâu lắng',
  NHE_NHANG = 'Nhẹ nhàng / Thư giãn',
  HUNG_HON = 'Hùng hồn / Sử thi',
  LANG_MAN = 'Lãng mạn / Ngọt ngào',
  BI_TRANG = 'Bi tráng / Buồn bã',
  KY_BI = 'Kỳ bí / Ma mị'
}

export enum StoryLength {
  FLASH = '200 từ (Cực ngắn)',
  VERY_SHORT = '500 từ (Ngắn)',
  SHORT = '1,000 từ (Vừa)',
  MEDIUM = '3,000 từ (Chi tiết)',
  LONG = '5,000+ từ (Dài)'
}

export enum VoiceName {
  Puck = 'Puck', 
  Charon = 'Charon', 
  Kore = 'Kore', 
  Fenrir = 'Fenrir', 
  Zephyr = 'Zephyr' 
}

export interface ModelConfig {
  storyModel: string;
  imageModel: string;
  audioModel: string;
  videoModel: string;
}

export interface StoryConfig {
  idea: string;
  language: Language;
  genre: Genre;
  tone: Tone;
  length: StoryLength;
  voice: VoiceName;
}

export interface UsageStats {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

export interface ProjectUsage {
  story: UsageStats;
  audio: UsageStats;
  image?: UsageStats; // Added image token usage
  total: number; // Grand total tokens
}

export type ProjectStatus = 'draft' | 'story_generated' | 'audio_generated';

export interface Project {
  id: string;
  title: string;
  config: StoryConfig;
  models: ModelConfig; // Selected models
  usage: ProjectUsage; // Token usage stats
  content: string;
  status: ProjectStatus;
  imageUrl?: string;
  imageSource?: 'ai' | 'upload'; // Track source for cost calculation
  audioData?: string;
  videoData?: string; // Base64 canvas video data (Slideshow)
  animatedVideoData?: string; // Base64 Veo video data (AI Animation)
  createdAt: number;
  updatedAt: number;
}
