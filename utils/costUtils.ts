
import { APP_SETTINGS } from '../settings';
import { ProjectUsage, ModelConfig } from '../types';

export const calculateCost = (
  usage: ProjectUsage, 
  models: ModelConfig, 
  imageSource: 'ai' | 'upload' | undefined, 
  hasVideo: boolean
): number => {
  let totalCost = 0;

  // 1. Story Text Cost
  const storyModelPrice = APP_SETTINGS.PRICING[models.storyModel as keyof typeof APP_SETTINGS.PRICING] || { input: 0, output: 0 };
  if ('input' in storyModelPrice) {
    totalCost += (usage.story.promptTokens / 1_000_000) * storyModelPrice.input;
    totalCost += (usage.story.candidatesTokens / 1_000_000) * storyModelPrice.output;
  }

  // 2. Audio Cost (TTS)
  const audioModelPrice = APP_SETTINGS.PRICING[models.audioModel as keyof typeof APP_SETTINGS.PRICING];
  if (audioModelPrice && 'input' in audioModelPrice) {
     // If pricing is token based
     totalCost += (usage.audio.promptTokens / 1_000_000) * audioModelPrice.input;
     totalCost += (usage.audio.candidatesTokens / 1_000_000) * audioModelPrice.output;
  } else if (audioModelPrice && 'per1kChars' in audioModelPrice) {
      // Crude estimate: 1 token ~= 4 chars. 
      const estimatedChars = usage.audio.promptTokens * 4; 
      totalCost += (estimatedChars / 1000) * audioModelPrice.per1kChars;
  }

  // 3. Image Cost (Only charge if source is AI)
  if (imageSource === 'ai') {
    const imagePrice = APP_SETTINGS.PRICING[models.imageModel as keyof typeof APP_SETTINGS.PRICING];
    if (imagePrice && 'perUnit' in imagePrice) {
      totalCost += imagePrice.perUnit;
    }
  }

  // 4. Video (Veo) Cost
  if (hasVideo) {
    const videoPrice = APP_SETTINGS.PRICING[models.videoModel as keyof typeof APP_SETTINGS.PRICING];
    if (videoPrice && 'perUnit' in videoPrice) {
      totalCost += videoPrice.perUnit;
    }
  }

  return totalCost;
};

export const formatCurrency = (amount: number): string => {
  if (amount > 0 && amount < 0.0001) return "< $0.0001";
  if (amount === 0) return "$0.00";
  return `$${amount.toFixed(4)}`;
};
