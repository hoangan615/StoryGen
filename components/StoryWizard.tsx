
import React, { useState, useEffect } from 'react';
import { Wand2, BookOpen, Music, Mic, Globe } from 'lucide-react';
import { GENRES, TONES, LENGTHS, VOICE_OPTIONS, SAMPLE_PROMPTS, LANGUAGES } from '../constants';
import { StoryConfig, Genre, Tone, StoryLength, VoiceName, Language } from '../types';
import Button from './Button';

interface StoryWizardProps {
  onGenerate: (config: StoryConfig) => void;
  isGenerating: boolean;
}

const StoryWizard: React.FC<StoryWizardProps> = ({ onGenerate, isGenerating }) => {
  const [config, setConfig] = useState<StoryConfig>({
    idea: '',
    language: Language.EN, // Default
    genre: Genre.CO_TICH,
    tone: Tone.VUI_VE,
    length: StoryLength.SHORT,
    voice: VoiceName.Puck
  });

  const handleInputChange = (field: keyof StoryConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleRandomPrompt = () => {
    const prompts = SAMPLE_PROMPTS[config.language];
    const random = prompts[Math.floor(Math.random() * prompts.length)];
    handleInputChange('idea', random);
  };

  // Reset idea when language changes to avoid language mismatch in prompt
  useEffect(() => {
    handleInputChange('idea', '');
  }, [config.language]);

  return (
    <div className="w-full max-w-3xl mx-auto bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 md:p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent font-serif">
            New Project
          </h2>
          <p className="text-slate-400">Configure your story settings below.</p>
        </div>

        {/* Language Selection - Prominently placed */}
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
          <label className="flex items-center text-sm font-medium text-slate-300 mb-3">
            <Globe className="w-4 h-4 mr-2 text-indigo-400" /> Story Language
          </label>
          <div className="grid grid-cols-2 gap-4">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                onClick={() => handleInputChange('language', lang.value)}
                className={`flex items-center justify-center px-4 py-3 rounded-lg border transition-all ${
                  config.language === lang.value
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                }`}
                disabled={isGenerating}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Idea Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">Story Idea / Prompt</label>
          <div className="relative">
            <textarea
              value={config.idea}
              onChange={(e) => handleInputChange('idea', e.target.value)}
              placeholder={config.language === Language.VI ? "Ví dụ: Một cô gái tìm thấy chiếc đồng hồ quay ngược thời gian..." : "E.g., A lonely astronaut finds a flower on Mars..."}
              className="w-full h-32 bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
              disabled={isGenerating}
            />
            <button
              onClick={handleRandomPrompt}
              className="absolute bottom-4 right-4 text-xs bg-slate-800 hover:bg-slate-700 text-indigo-400 px-3 py-1 rounded-full border border-indigo-900/50 transition-colors"
              disabled={isGenerating}
            >
              {config.language === Language.VI ? 'Gợi ý cho tôi' : 'Surprise Me'}
            </button>
          </div>
        </div>

        {/* Selectors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-slate-300">
              <BookOpen className="w-4 h-4 mr-2 text-indigo-400" /> Genre
            </label>
            <select
              value={config.genre}
              onChange={(e) => handleInputChange('genre', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              disabled={isGenerating}
            >
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-slate-300">
              <Music className="w-4 h-4 mr-2 text-indigo-400" /> Tone
            </label>
            <select
              value={config.tone}
              onChange={(e) => handleInputChange('tone', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              disabled={isGenerating}
            >
              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Length</label>
            <select
              value={config.length}
              onChange={(e) => handleInputChange('length', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              disabled={isGenerating}
            >
              {LENGTHS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-slate-300">
              <Mic className="w-4 h-4 mr-2 text-indigo-400" /> Narrator Voice
            </label>
            <select
              value={config.voice}
              onChange={(e) => handleInputChange('voice', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              disabled={isGenerating}
            >
              {VOICE_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <div className="pt-4">
          <Button 
            onClick={() => onGenerate(config)} 
            className="w-full text-lg h-14"
            disabled={!config.idea.trim()}
            isLoading={isGenerating}
          >
            {isGenerating ? 'Writing Story...' : (
              <>
                <Wand2 className="w-5 h-5 mr-2" /> 
                {config.language === Language.VI ? 'Tạo Câu Chuyện' : 'Generate Story'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StoryWizard;
