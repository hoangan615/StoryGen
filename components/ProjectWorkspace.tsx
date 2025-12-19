import React, { useState, useRef, useEffect } from 'react';
import { Project } from '../types';
import { generateStoryAudio, generateStoryImage } from '../services/geminiService';
import { decodeAudio, generateVideoBlob } from '../utils/mediaUtils';
import Button from './Button';
import { Play, Pause, Video, Save, ArrowLeft, Download, RefreshCw, PenTool, Image as ImageIcon, Music } from 'lucide-react';

interface ProjectWorkspaceProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
  onBack: () => void;
}

const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ project, onUpdateProject, onBack }) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'media'>('editor');
  
  // Initialize with current content, but allow updates if prop changes
  const [editedContent, setEditedContent] = useState(project.content);

  // Sync state if the project content is updated externally (e.g. initial load or regeneration)
  useEffect(() => {
    setEditedContent(project.content);
  }, [project.content]);

  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  // Load Audio if exists
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
    return () => {
        if(audioContextRef.current) audioContextRef.current.close();
    }
  }, [project.audioData]);

  const handleSaveContent = () => {
    onUpdateProject({
      ...project,
      content: editedContent,
      updatedAt: Date.now()
    });
    alert('Story draft saved!');
  };

  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);
    try {
      // NOTE: We rely on 'project' prop being up-to-date with any existing imageUrl
      const audioData = await generateStoryAudio(editedContent, project.config.voice, project.config.language);
      
      onUpdateProject({
        ...project, 
        content: editedContent, // Ensure content is synced with what was spoken
        audioData,
        status: 'audio_generated',
        updatedAt: Date.now()
      });
    } catch (e: any) {
      console.error(e);
      alert(`Audio Generation Error: ${e.message}`);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);
    try {
      const imageUrl = await generateStoryImage(project.title, editedContent);
      onUpdateProject({
        ...project,
        imageUrl, // Updates the image, keeps everything else
        updatedAt: Date.now()
      });
    } catch (e: any) {
      alert(`Image Generation Error: ${e.message}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const togglePlayback = () => {
    if (!audioContextRef.current || !audioBuffer) return;

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

  const handleExportVideo = async () => {
      if (!audioBuffer || !project.imageUrl) return;
      setIsExportingVideo(true);
      try {
          const url = await generateVideoBlob(project.imageUrl, audioBuffer);
          setVideoUrl(url);
      } catch (e) {
          console.error(e);
          alert('Failed to render video');
      } finally {
          setIsExportingVideo(false);
      }
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-800/80 backdrop-blur p-4 rounded-xl border border-slate-700">
        <div className="flex items-center">
          <button onClick={onBack} className="mr-4 p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white font-serif">{project.title}</h2>
            <div className="flex items-center text-xs text-slate-400 space-x-3">
               <span>{project.config.length}</span>
               <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
               <span>{project.config.language}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
            <button 
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${activeTab === 'editor' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
                <PenTool className="w-4 h-4 mr-2" /> Story Editor
            </button>
            <button 
                onClick={() => setActiveTab('media')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center ${activeTab === 'media' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
                <Video className="w-4 h-4 mr-2" /> Media Studio
            </button>
        </div>
      </div>

      {/* Editor Tab */}
      {activeTab === 'editor' && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
                <p className="text-slate-400 text-sm">Edit the generated story before creating audio. Changes here affect the narration.</p>
                <Button variant="secondary" onClick={handleSaveContent} className="py-2 h-10">
                    <Save className="w-4 h-4 mr-2" /> Save Draft
                </Button>
            </div>
            <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full h-[60vh] bg-slate-900 border border-slate-700 rounded-xl p-6 text-lg leading-relaxed text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none font-serif"
            />
        </div>
      )}

      {/* Media Tab */}
      {activeTab === 'media' && (
        <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Visuals */}
            <div className="space-y-6">
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center"><ImageIcon className="w-5 h-5 mr-2 text-purple-400"/> Cover Art</h3>
                    <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden mb-4 border border-slate-700 relative group">
                        {project.imageUrl ? (
                            <img src={project.imageUrl} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">No Image Generated</div>
                        )}
                    </div>
                    <Button onClick={handleGenerateImage} isLoading={isGeneratingImage} variant="secondary" className="w-full">
                        <RefreshCw className="w-4 h-4 mr-2" /> {project.imageUrl ? 'Regenerate Cover' : 'Generate Cover'}
                    </Button>
                </div>

                 <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center"><Music className="w-5 h-5 mr-2 text-pink-400"/> Narration</h3>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-400">Current Voice: <span className="text-indigo-400 font-medium">{project.config.voice}</span></p>
                        <Button onClick={handleGenerateAudio} isLoading={isGeneratingAudio} variant="secondary" className="w-full">
                            <RefreshCw className="w-4 h-4 mr-2" /> {project.audioData ? 'Regenerate Audio' : 'Generate Audio'}
                        </Button>
                        
                        {project.audioData && (
                             <Button onClick={togglePlayback} disabled={!audioBuffer} variant="primary" className="w-full bg-indigo-600">
                                {isPlaying ? <><Pause className="w-4 h-4 mr-2"/> Pause</> : <><Play className="w-4 h-4 mr-2"/> Play Audio</>}
                             </Button>
                        )}
                    </div>
                 </div>
            </div>

            {/* Right: Export */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center"><Video className="w-5 h-5 mr-2 text-green-400"/> Video Export</h3>
                    <p className="text-slate-400 mb-4">Combine your cover image and narration into an MP4 video ready for social media.</p>
                    
                    <div className="space-y-4">
                        <div className={`p-4 rounded-lg border ${project.imageUrl ? 'border-green-900/50 bg-green-900/20' : 'border-red-900/50 bg-red-900/20'}`}>
                            <div className="flex items-center text-sm">
                                <div className={`w-2 h-2 rounded-full mr-2 ${project.imageUrl ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                {project.imageUrl ? 'Cover Image Ready' : 'Cover Image Missing'}
                            </div>
                        </div>
                        <div className={`p-4 rounded-lg border ${project.audioData ? 'border-green-900/50 bg-green-900/20' : 'border-red-900/50 bg-red-900/20'}`}>
                            <div className="flex items-center text-sm">
                                <div className={`w-2 h-2 rounded-full mr-2 ${project.audioData ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                {project.audioData ? 'Audio Track Ready' : 'Audio Track Missing'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 space-y-4">
                    {!videoUrl ? (
                        <Button 
                            onClick={handleExportVideo} 
                            isLoading={isExportingVideo} 
                            disabled={!project.imageUrl || !project.audioData}
                            className="w-full h-14 text-lg"
                        >
                            Render Video
                        </Button>
                    ) : (
                         <a 
                            href={videoUrl} 
                            download={`${project.title.replace(/\s+/g, '_')}.webm`}
                            className="w-full block"
                         >
                            <Button variant="primary" className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg">
                                <Download className="w-5 h-5 mr-2" /> Download MP4
                            </Button>
                         </a>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ProjectWorkspace;