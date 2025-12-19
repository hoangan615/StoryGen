import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../types';
import { generateStoryAudio, generateStoryImage, generateVeoVideo } from '../services/geminiService';
import { decodeAudio, generateVideoBlob, blobToBase64 } from '../utils/mediaUtils';
import Button from './Button';
import { Play, Pause, Video, Save, ArrowLeft, Download, RefreshCw, PenTool, Image as ImageIcon, Music, Trash2, Settings, Upload, Clapperboard, Sparkles } from 'lucide-react';
import { APP_SETTINGS } from '../settings';

interface ProjectWorkspaceProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  onBack: () => void;
}

type VideoQuality = '720p' | '1080p';

const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ project, onUpdateProject, onBack }) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'media'>('editor');
  
  // Initialize with current content
  const [editedContent, setEditedContent] = useState(project.content);
  useEffect(() => { setEditedContent(project.content); }, [project.content]);

  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [isGeneratingVeo, setIsGeneratingVeo] = useState(false);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>('720p');

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Audio
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

  const handleSaveContent = () => {
    onUpdateProject({ ...project, content: editedContent, updatedAt: Date.now() });
    alert('Story draft saved!');
  };

  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);
    try {
      const audioData = await generateStoryAudio(editedContent, project.config.voice, project.config.language);
      onUpdateProject({ ...project, content: editedContent, audioData, status: 'audio_generated', updatedAt: Date.now() });
    } catch (e: any) {
      alert(`Audio Generation Error: ${e.message}`);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    try {
      const imageUrl = await generateStoryImage(project.title, editedContent);
      onUpdateProject({ ...project, imageUrl, updatedAt: Date.now() });
    } catch (e: any) {
      alert(`Image Generation Error: ${e.message}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateProject({ ...project, imageUrl: reader.result as string, updatedAt: Date.now() });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateVeo = async () => {
    if (!project.imageUrl) return;

    // Check for API Key selection for paid features
    const win = window as any;
    if (win.aistudio) {
      const hasKey = await win.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        try {
           await win.aistudio.openSelectKey();
        } catch (e) {
           console.error("Key selection failed/cancelled", e);
           return; 
        }
      }
    }

    setIsGeneratingVeo(true);
    try {
      const veoData = await generateVeoVideo(project.imageUrl);
      onUpdateProject({ ...project, animatedVideoData: veoData, updatedAt: Date.now() });
    } catch (e: any) {
      alert(`Veo Generation Error: ${e.message}`);
    } finally {
      setIsGeneratingVeo(false);
    }
  };

  const togglePlayback = async () => {
    if (!audioContextRef.current || !audioBuffer) return;

    // Resume context if suspended (browser policy)
    if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
    }

    if (isPlaying) {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
        pausedAtRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      }
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

  const handleDeleteAsset = (type: 'image' | 'audio' | 'video' | 'veo') => {
    if(!window.confirm(`Delete this ${type}?`)) return;
    const updates: Partial<Project> = { updatedAt: Date.now() };
    if (type === 'image') updates.imageUrl = undefined;
    if (type === 'audio') updates.audioData = undefined;
    if (type === 'video') updates.videoData = undefined;
    if (type === 'veo') updates.animatedVideoData = undefined;
    onUpdateProject({ ...project, ...updates });
  };

  const handleExportVideo = async () => {
      if (!audioBuffer || !project.imageUrl) return;
      setIsExportingVideo(true);
      try {
          const config = APP_SETTINGS.VIDEO.QUALITY[videoQuality];
          const blob = await generateVideoBlob(project.imageUrl, audioBuffer, {
              width: config.WIDTH, height: config.HEIGHT, bitrate: config.BITRATE, fps: APP_SETTINGS.VIDEO.DEFAULT_FPS
          });
          const base64Video = await blobToBase64(blob);
          onUpdateProject({ ...project, videoData: base64Video, updatedAt: Date.now() });
      } catch (e) {
          alert('Failed to render video');
      } finally {
          setIsExportingVideo(false);
      }
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-800/80 backdrop-blur p-4 rounded-xl border border-slate-700 gap-4">
        <div className="flex items-center overflow-hidden">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-300 flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white font-serif truncate">{project.title}</h2>
            <div className="flex items-center text-xs text-slate-400 space-x-3">
               <span>{project.config.length}</span>
               <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
               <span>{project.config.language}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2 w-full md:w-auto">
            <button onClick={() => setActiveTab('editor')} className={`flex-1 md:flex-none justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${activeTab === 'editor' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                <PenTool className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Story</span> Editor
            </button>
            <button onClick={() => setActiveTab('media')} className={`flex-1 md:flex-none justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${activeTab === 'media' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                <Video className="w-4 h-4 mr-2" /> Media <span className="hidden sm:inline">Studio</span>
            </button>
        </div>
      </div>

      {activeTab === 'editor' && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-4 md:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <p className="text-slate-400 text-sm">Edit text before generating audio.</p>
                <Button variant="secondary" onClick={handleSaveContent} className="w-full sm:w-auto py-2 h-10 text-sm">
                    <Save className="w-4 h-4 mr-2" /> Save Draft
                </Button>
            </div>
            <textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} className="w-full h-[50vh] md:h-[60vh] bg-slate-900 border border-slate-700 rounded-xl p-4 md:p-6 text-base md:text-lg leading-relaxed text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none font-serif" />
        </div>
      )}

      {activeTab === 'media' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            <div className="md:col-span-5 space-y-6">
                {/* Image Section with Upload and Veo */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 md:p-6 relative">
                    <div className="flex justify-between items-center mb-4">
                         <h3 className="text-lg font-bold text-white flex items-center"><ImageIcon className="w-5 h-5 mr-2 text-purple-400"/> Cover Art</h3>
                         <div className="flex space-x-2">
                             <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                             <button onClick={() => fileInputRef.current?.click()} className="text-slate-500 hover:text-indigo-400 transition-colors" title="Upload Image">
                                 <Upload className="w-4 h-4" />
                             </button>
                             {project.imageUrl && (
                                 <button onClick={() => handleDeleteAsset('image')} className="text-slate-500 hover:text-red-500 transition-colors" title="Delete Image">
                                     <Trash2 className="w-4 h-4" />
                                 </button>
                             )}
                         </div>
                    </div>
                    
                    <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden mb-4 border border-slate-700 relative group">
                        {project.imageUrl ? (
                            <img src={project.imageUrl} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">No Image Generated</div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <Button onClick={handleGenerateImage} isLoading={isGeneratingImage} variant="secondary" className="text-sm">
                            <RefreshCw className="w-4 h-4 mr-2" /> {project.imageUrl ? 'Regen' : 'Generate'}
                        </Button>
                        <Button onClick={handleGenerateVeo} isLoading={isGeneratingVeo} disabled={!project.imageUrl} variant="primary" className="text-sm bg-purple-600 hover:bg-purple-700">
                             <Sparkles className="w-4 h-4 mr-2" /> Animate
                        </Button>
                    </div>
                </div>

                 {/* Veo Result Section (Only shows if exists) */}
                 {project.animatedVideoData && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 md:p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center"><Clapperboard className="w-5 h-5 mr-2 text-pink-500"/> Veo Animation</h3>
                            <button onClick={() => handleDeleteAsset('veo')} className="text-slate-500 hover:text-red-500" title="Delete Veo Video"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <video src={project.animatedVideoData} controls autoPlay loop className="w-full rounded-lg border border-slate-700 shadow-lg" />
                    </div>
                 )}

                 {/* Audio Section */}
                 <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 md:p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center"><Music className="w-5 h-5 mr-2 text-pink-400"/> Narration</h3>
                         {project.audioData && (
                             <button onClick={() => handleDeleteAsset('audio')} className="text-slate-500 hover:text-red-500" title="Delete Audio"><Trash2 className="w-4 h-4" /></button>
                         )}
                    </div>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-400">Voice: <span className="text-indigo-400 font-medium">{project.config.voice}</span></p>
                        <Button onClick={handleGenerateAudio} isLoading={isGeneratingAudio} variant="secondary" className="w-full">
                            <RefreshCw className="w-4 h-4 mr-2" /> {project.audioData ? 'Regenerate' : 'Generate'}
                        </Button>
                        {project.audioData && (
                             <Button onClick={togglePlayback} disabled={!audioBuffer} variant="primary" className="w-full bg-indigo-600">
                                {isPlaying ? <><Pause className="w-4 h-4 mr-2"/> Pause</> : <><Play className="w-4 h-4 mr-2"/> Play</>}
                             </Button>
                        )}
                    </div>
                 </div>
            </div>

            {/* Right Column: Final Export */}
            <div className="md:col-span-7 bg-slate-800/50 border border-slate-700 rounded-2xl p-4 md:p-6 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center"><Video className="w-5 h-5 mr-2 text-green-400"/> Final Export</h3>
                        <p className="text-slate-400 text-sm mt-1">Combine image & audio into a 9:16 video.</p>
                    </div>
                    {project.videoData && <button onClick={() => handleDeleteAsset('video')} className="text-slate-500 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>}
                </div>

                <div className="flex-grow flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-700/50 p-4 mb-6 min-h-[300px] md:min-h-[400px]">
                    {project.videoData ? (
                        <video src={project.videoData} controls className="max-h-[50vh] md:max-h-[500px] w-auto h-auto rounded-lg shadow-2xl border border-slate-700" />
                    ) : (
                        <div className="aspect-[9/16] h-[40vh] md:h-[500px] max-w-full border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                            <Video className="w-12 h-12 mb-2 opacity-50" />
                            <span>Preview Area</span>
                        </div>
                    )}
                </div>

                <div className="space-y-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center justify-between">
                         <label className="text-sm font-medium text-slate-300 flex items-center"><Settings className="w-4 h-4 mr-2" /> Quality</label>
                         <div className="flex space-x-2">
                             <button onClick={() => setVideoQuality('720p')} className={`px-3 py-1 rounded text-xs border ${videoQuality === '720p' ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-700 border-slate-600'}`}>720p</button>
                             <button onClick={() => setVideoQuality('1080p')} className={`px-3 py-1 rounded text-xs border ${videoQuality === '1080p' ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-700 border-slate-600'}`}>1080p</button>
                         </div>
                    </div>
                    {!project.videoData ? (
                        <Button onClick={handleExportVideo} isLoading={isExportingVideo} disabled={!project.imageUrl || !project.audioData} className="w-full h-12 text-lg">Render Video</Button>
                    ) : (
                         <div className="grid grid-cols-2 gap-3">
                             <a href={project.videoData} download={`${project.title.replace(/\s+/g, '_')}_tiktok.webm`} className="w-full block">
                                <Button variant="primary" className="w-full bg-green-600 hover:bg-green-700 h-12"><Download className="w-4 h-4 mr-2" /> Download</Button>
                             </a>
                             <Button onClick={handleExportVideo} isLoading={isExportingVideo} variant="secondary" className="w-full h-12"><RefreshCw className="w-4 h-4 mr-2" /> Re-Render</Button>
                         </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ProjectWorkspace;