/// <reference lib="dom" />

import React, { useState, useRef, useEffect } from 'react';
import { Project, Genre, Tone, StoryLength, VoiceName, Language } from '../types';
import { GENRES, TONES, LENGTHS, VOICE_OPTIONS, LANGUAGES } from '../constants';
import { APP_SETTINGS } from '../settings';
import { generateStoryAudio, generateStoryImage, generateStoryText, generateVeoVideo } from '../services/geminiService';
import { decodeAudio, generateVideoBlob, blobToBase64, audioBufferToWav, generateSRTString } from '../utils/mediaUtils';
import { renderVideoViaServer } from '../utils/serverRender'; 
import { calculateCost, formatCurrency } from '../utils/costUtils';
import Button from './Button';
import { Play, Pause, Video, Save, ArrowLeft, Download, PenTool, Image as ImageIcon, Music, DollarSign, Sparkles, Captions, Server, AlertCircle, Rocket, Cpu, Upload } from 'lucide-react';

interface ProjectWorkspaceProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  onBack: () => void;
}

type VideoQuality = '720p' | '1080p';

const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ project, onUpdateProject, onBack }) => {
  // --- Local State ---
  const [config, setConfig] = useState(project.config);
  const [models, setModels] = useState(project.models);
  const [editedContent, setEditedContent] = useState(project.content);
  
  // Sync if project changes externally
  useEffect(() => { 
      setConfig(project.config);
      setModels(project.models);
      setEditedContent(project.content);
  }, [project.id]);

  // Loading States
  const [loadingState, setLoadingState] = useState({
      story: false,
      image: false,
      audio: false,
      veo: false,
      video: false,
      server: false
  });

  const [videoQuality, setVideoQuality] = useState<VideoQuality>('720p');
  const [videoFps, setVideoFps] = useState<number>(30); 
  const [showSubtitles, setShowSubtitles] = useState(true);

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Audio Buffer
  useEffect(() => {
    const loadAudio = async () => {
      if (project.audioData) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;
        try {
          const buffer = await decodeAudio(project.audioData, ctx);
          setAudioBuffer(buffer);
        } catch (e) {
          console.error("Audio decode error", e);
        }
      } else {
        setAudioBuffer(null);
      }
    };
    loadAudio();
    return () => { if(audioContextRef.current) audioContextRef.current.close(); }
  }, [project.audioData]);

  // --- Cost Calculation ---
  const currentCost = calculateCost(
    project.usage, 
    models, 
    project.imageSource, 
    !!project.animatedVideoData
  );

  // --- Handlers ---
  const updateConfig = (field: keyof typeof config, value: any) => {
      const newConfig = { ...config, [field]: value };
      setConfig(newConfig);
      onUpdateProject({ ...project, config: newConfig });
  };

  const updateModel = (field: keyof typeof models, value: any) => {
      const newModels = { ...models, [field]: value };
      setModels(newModels);
      onUpdateProject({ ...project, models: newModels });
  };

  // ... (Keep existing generation handlers) ...
  const handleGenerateStory = async () => {
    setLoadingState(prev => ({...prev, story: true}));
    try {
      const result = await generateStoryText(config, models.storyModel);
      const updatedUsage = {
          ...project.usage,
          story: result.usage,
          total: (project.usage.total - project.usage.story.totalTokens) + result.usage.totalTokens
      };
      setEditedContent(result.content);
      onUpdateProject({ 
          ...project, config, models, title: result.title, content: result.content, usage: updatedUsage, status: 'story_generated', updatedAt: Date.now() 
      });
    } catch (e: any) { alert(`Lỗi tạo truyện: ${e.message}`); } finally { setLoadingState(prev => ({...prev, story: false})); }
  };

  const handleGenerateAudio = async () => {
    if (!editedContent.trim()) { alert("Vui lòng nhập nội dung!"); return; }
    setLoadingState(prev => ({...prev, audio: true}));
    try {
      const result = await generateStoryAudio(editedContent, config.voice, config.language, models.audioModel);
      const updatedUsage = {
          ...project.usage,
          audio: result.usage,
          total: (project.usage.story.totalTokens) + result.usage.totalTokens + (project.usage.image?.totalTokens || 0)
      };
      onUpdateProject({ 
          ...project, content: editedContent, config, models, audioData: result.audioData, usage: updatedUsage, status: 'audio_generated', updatedAt: Date.now() 
      });
    } catch (e: any) { alert(`Lỗi tạo Audio: ${e.message}`); } finally { setLoadingState(prev => ({...prev, audio: false})); }
  };

  const handleGenerateImage = async () => {
    setLoadingState(prev => ({...prev, image: true}));
    try {
      const summary = editedContent.substring(0, 300) || config.idea;
      const { imageData, usage } = await generateStoryImage(project.title, summary, models.imageModel);
      const updatedUsage = {
          ...project.usage, image: usage, total: project.usage.story.totalTokens + project.usage.audio.totalTokens + usage.totalTokens
      };
      onUpdateProject({ 
          ...project, content: editedContent, config, models, imageUrl: imageData, imageSource: 'ai', usage: updatedUsage, updatedAt: Date.now() 
      });
    } catch (e: any) { alert(`Lỗi tạo Ảnh: ${e.message}`); } finally { setLoadingState(prev => ({...prev, image: false})); }
  };

  const handleGenerateVeo = async () => {
    if (!project.imageUrl) return;
    const win = window as any;
    if (win.aistudio) {
      const hasKey = await win.aistudio.hasSelectedApiKey();
      if (!hasKey) { try { await win.aistudio.openSelectKey(); } catch (e) { return; } }
    }
    setLoadingState(prev => ({...prev, veo: true}));
    try {
      const veoData = await generateVeoVideo(project.imageUrl, models.videoModel);
      onUpdateProject({ ...project, animatedVideoData: veoData, updatedAt: Date.now() });
    } catch (e: any) { alert(`Lỗi tạo Veo Video: ${e.message}`); } finally { setLoadingState(prev => ({...prev, veo: false})); }
  };

  // --- Browser Render (Canvas) ---
  const handleExportVideoCanvas = async () => {
      if (!audioBuffer || !project.imageUrl) return;
      setLoadingState(prev => ({...prev, video: true}));
      try {
          const cfg = APP_SETTINGS.VIDEO.QUALITY[videoQuality];
          const blob = await generateVideoBlob(project.imageUrl, audioBuffer, {
              width: cfg.WIDTH, height: cfg.HEIGHT, bitrate: cfg.BITRATE, fps: videoFps,
              subtitles: showSubtitles ? editedContent : undefined 
          });
          const base64Video = await blobToBase64(blob);
          onUpdateProject({ ...project, videoData: base64Video, updatedAt: Date.now() });
      } catch (e) { alert('Lỗi xuất video'); } finally { setLoadingState(prev => ({...prev, video: false})); }
  };

  // --- Node.js Server Render ---
  const handleExportVideoServer = async () => {
    if (!audioBuffer || !project.imageUrl) return;
    setLoadingState(prev => ({...prev, server: true}));
    try {
        const subtitlesText = showSubtitles ? editedContent : null;
        const videoData = await renderVideoViaServer(
            project.imageUrl,
            audioBuffer,
            subtitlesText
        );
        
        // Save to project for preview/download
        onUpdateProject({ ...project, videoData, updatedAt: Date.now() });
        
        // Auto Download
        const a = document.createElement('a');
        a.href = videoData;
        a.download = `story-server-${project.id}.mp4`;
        a.click();
        
    } catch (e: any) {
        alert(`Lỗi Server Render: ${e.message}`);
    } finally {
        setLoadingState(prev => ({...prev, server: false}));
    }
  };

  const togglePlayback = async () => {
    if (!audioContextRef.current || !audioBuffer) return;
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
    if (isPlaying) {
      sourceNodeRef.current?.stop();
      sourceNodeRef.current = null;
      pausedAtRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      setIsPlaying(false);
    } else {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      startTimeRef.current = audioContextRef.current.currentTime - pausedAtRef.current;
      source.start(0, pausedAtRef.current);
      sourceNodeRef.current = source;
      source.onended = () => { setIsPlaying(false); pausedAtRef.current = 0; };
      setIsPlaying(true);
    }
  };

  const handleDownloadImage = () => {
    if (!project.imageUrl) return;
    const a = document.createElement('a'); a.href = project.imageUrl; a.download = `image-${project.id}.png`; a.click();
  };
  const handleDownloadAudio = () => {
    if (!audioBuffer) return;
    const blob = audioBufferToWav(audioBuffer); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `audio-${project.id}.wav`; a.click(); URL.revokeObjectURL(url);
  };

  const hasVeoModels = APP_SETTINGS.AVAILABLE_MODELS.VEO.length > 0;

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 animate-in fade-in zoom-in duration-300">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
          <div className="flex items-center space-x-3">
              <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-slate-400"/></button>
              <h1 className="text-xl font-serif font-bold text-white truncate max-w-md">{project.title || "Dự án mới"}</h1>
          </div>
          <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <div className="text-xs text-slate-400">
                      <span className="block text-slate-500">Chi phí ước tính</span>
                      <span className="font-mono text-white font-bold">{formatCurrency(currentCost)}</span>
                  </div>
              </div>
          </div>
      </div>

      {/* Main Grid Layout */}
      <div className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-0 min-h-0">
          
          {/* LEFT: Configuration Panel */}
          <div className="md:col-span-3 border-r border-slate-800 bg-slate-900/30 overflow-y-auto custom-scrollbar p-4 space-y-6">
              {/* Story Settings */}
              <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center"><PenTool className="w-4 h-4 mr-2"/> Cấu Hình Truyện</h3>
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs text-slate-500 block mb-1">Ngôn Ngữ</label>
                          <select value={config.language} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateConfig('language', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white">
                              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-xs text-slate-500 block mb-1">Thể Loại</label>
                          <select value={config.genre} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateConfig('genre', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white">
                              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-xs text-slate-500 block mb-1">Tông Giọng</label>
                          <select value={config.tone} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateConfig('tone', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white">
                              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-xs text-slate-500 block mb-1">Độ Dài</label>
                          <select value={config.length} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateConfig('length', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white">
                              {LENGTHS.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-xs text-slate-500 block mb-1">Ý Tưởng / Prompt</label>
                          <textarea 
                              value={config.idea} 
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateConfig('idea', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white h-24 resize-none"
                              placeholder="Nhập ý tưởng câu chuyện..."
                          />
                      </div>
                  </div>
              </section>

              <hr className="border-slate-800" />

              {/* Model Selection */}
              <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center"><Cpu className="w-4 h-4 mr-2"/> Chọn AI Model</h3>
                  
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs text-slate-500 block mb-1">Model Viết Truyện</label>
                          <select value={models.storyModel} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateModel('storyModel', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-300">
                              {APP_SETTINGS.AVAILABLE_MODELS.STORY.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-xs text-slate-500 block mb-1">Model Tạo Ảnh</label>
                          <select value={models.imageModel} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateModel('imageModel', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-300">
                              {APP_SETTINGS.AVAILABLE_MODELS.IMAGE.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-xs text-slate-500 block mb-1">Model Giọng Đọc (TTS)</label>
                          <select value={models.audioModel} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateModel('audioModel', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-300">
                              {APP_SETTINGS.AVAILABLE_MODELS.AUDIO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                          </select>
                      </div>
                  </div>
              </section>
          </div>

          {/* MIDDLE: Content Editor */}
          <div className="md:col-span-5 flex flex-col border-r border-slate-800 bg-slate-900/10">
              <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/30">
                  <h3 className="text-sm font-bold text-slate-300">Kịch Bản / Nội Dung</h3>
                  <div className="flex space-x-2">
                      <Button variant="secondary" onClick={() => onUpdateProject({...project, content: editedContent, config, models})} className="h-8 px-3 text-xs">
                          <Save className="w-3 h-3 mr-1"/> Lưu Nháp
                      </Button>
                      <Button onClick={handleGenerateStory} isLoading={loadingState.story} className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700">
                          <Sparkles className="w-3 h-3 mr-1"/> Viết Truyện
                      </Button>
                  </div>
              </div>
              <textarea 
                  value={editedContent} 
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedContent(e.target.value)} 
                  className="flex-grow w-full bg-transparent p-6 text-slate-200 text-lg leading-relaxed focus:outline-none resize-none font-serif"
                  placeholder="Bạn có thể tự nhập truyện vào đây hoặc để AI viết..."
              />
          </div>

          {/* RIGHT: Media & Export */}
          <div className="md:col-span-4 flex flex-col overflow-y-auto custom-scrollbar bg-slate-900/30 p-4 space-y-6">
              
              {/* Image Control */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-white flex items-center"><ImageIcon className="w-4 h-4 mr-2 text-purple-400"/> Hình Ảnh</h4>
                      <input type="file" ref={fileInputRef} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const file = e.target.files?.[0];
                          if(file) {
                              const r = new FileReader();
                              r.onload = () => onUpdateProject({
                                  ...project, imageUrl: r.result as string, imageSource: 'upload', updatedAt: Date.now()
                              });
                              r.readAsDataURL(file);
                          }
                      }} className="hidden" />
                      {project.imageUrl && (
                         <div className="flex items-center space-x-1">
                             <button onClick={handleDownloadImage} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-slate-700 border border-slate-700 flex items-center">
                               <Download className="w-3 h-3 mr-1"/> PNG
                             </button>
                         </div>
                      )}
                  </div>
                  <div 
                      className="aspect-video bg-slate-950 rounded-lg overflow-hidden mb-3 border border-slate-800 relative group cursor-pointer hover:border-slate-600 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                  >
                      {project.imageUrl ? (
                          <>
                              <img src={project.imageUrl} className="w-full h-full object-cover" />
                              <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-[10px] text-white rounded">
                                  {project.imageSource === 'upload' ? 'Upload' : 'AI Gen'}
                              </div>
                          </>
                      ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                              <Upload className="w-6 h-6 opacity-50"/>
                              <span className="text-xs">Tải ảnh lên hoặc tạo AI</span>
                          </div>
                      )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" onClick={handleGenerateImage} isLoading={loadingState.image} className="h-8 text-xs">Tạo Ảnh AI</Button>
                      {hasVeoModels && (
                        <Button variant="primary" onClick={handleGenerateVeo} isLoading={loadingState.veo} disabled={!project.imageUrl} className="h-8 text-xs bg-purple-600 hover:bg-purple-700">Tạo Video (Veo)</Button>
                      )}
                  </div>
              </div>

              {/* Audio Control */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                      <h4 className="text-sm font-bold text-white flex items-center"><Music className="w-4 h-4 mr-2 text-indigo-400"/> Giọng Đọc</h4>
                      {audioBuffer && (
                          <button onClick={handleDownloadAudio} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-slate-700 border border-slate-700 flex items-center">
                            <Download className="w-3 h-3 mr-1"/> WAV
                          </button>
                      )}
                  </div>
                  <div className="mb-3">
                      <label className="text-xs text-slate-500 block mb-1">Chọn Giọng</label>
                      <select value={config.voice} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateConfig('voice', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white">
                          {VOICE_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                      </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" onClick={handleGenerateAudio} isLoading={loadingState.audio} className="h-8 text-xs">Tạo Giọng Đọc</Button>
                      <Button variant="primary" onClick={togglePlayback} disabled={!audioBuffer} className="h-8 text-xs bg-indigo-600">
                          {isPlaying ? <Pause className="w-3 h-3 mr-1"/> : <Play className="w-3 h-3 mr-1"/>} Nghe Thử
                      </Button>
                  </div>
              </div>

              {/* Export Control */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex-grow flex flex-col">
                  <h4 className="text-sm font-bold text-white mb-3 flex items-center"><Video className="w-4 h-4 mr-2 text-green-400"/> Render Video</h4>
                  
                  {/* GLOBAL SUBTITLE TOGGLE */}
                   <button onClick={() => setShowSubtitles(!showSubtitles)} className={`w-full mb-3 flex justify-center items-center text-[10px] px-2 py-1.5 rounded border transition-colors ${showSubtitles ? 'bg-indigo-900/30 text-indigo-300 border-indigo-800' : 'border-slate-800 text-slate-500 hover:bg-slate-800'}`}>
                          <Captions className="w-3 h-3 mr-1"/> Chèn Phụ đề vào MP4: {showSubtitles ? 'BẬT' : 'TẮT'}
                   </button>

                  {/* 1. SERVER RENDER (NODE.JS) - RECOMMENDED */}
                  <div className="mb-4">
                    <Button 
                      variant="primary" 
                      onClick={handleExportVideoServer} 
                      isLoading={loadingState.server} 
                      disabled={!project.imageUrl || !project.audioData} 
                      className="w-full h-10 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-none shadow-lg shadow-emerald-900/20"
                    >
                      <Server className="w-4 h-4 mr-2" /> 
                      {loadingState.server ? 'Đang gửi Server...' : 'Render bằng Server (Node.js)'}
                    </Button>
                    <p className="text-[10px] text-slate-500 mt-1 text-center">
                      *Yêu cầu chạy terminal: "npm run dev"
                    </p>
                  </div>

                  <hr className="border-slate-700 mb-4 opacity-50" />

                  {/* 2. LEGACY RENDER (SLOW) */}
                  <div className="space-y-3 mt-auto">
                      <div className="flex justify-between items-center">
                          <h5 className="text-[10px] font-bold text-slate-500 uppercase">Legacy Render (Canvas)</h5>
                          <div className="flex space-x-1">
                              <button onClick={() => setVideoQuality('720p')} className={`px-2 py-1 rounded text-[10px] border ${videoQuality === '720p' ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-800 text-slate-500'}`}>720p</button>
                              <button onClick={() => setVideoQuality('1080p')} className={`px-2 py-1 rounded text-[10px] border ${videoQuality === '1080p' ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-800 text-slate-500'}`}>1080p</button>
                          </div>
                      </div>

                      {project.videoData ? (
                           <div className="grid grid-cols-2 gap-2">
                               <a href={project.videoData} download="story.mp4" className="block w-full"><Button className="w-full h-9 text-xs bg-green-600 hover:bg-green-700"><Download className="w-3 h-3 mr-1"/> Tải Video</Button></a>
                               <Button variant="secondary" onClick={handleExportVideoCanvas} isLoading={loadingState.video} className="h-9 text-xs">Render Lại</Button>
                           </div>
                      ) : (
                          <Button variant="secondary" onClick={handleExportVideoCanvas} isLoading={loadingState.video} disabled={!project.imageUrl || !project.audioData} className="w-full h-9 text-xs">
                             {loadingState.video ? 'Đang Render (1x speed)...' : 'Render Chậm (Canvas)'}
                          </Button>
                      )}
                      <p className="text-[10px] text-slate-600 text-center">
                        *Lưu ý: Render Canvas không hỗ trợ phụ đề trong file xuất.
                      </p>
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
};

export default ProjectWorkspace;