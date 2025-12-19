import React, { useState, useEffect, useRef } from 'react';
import { Project } from '../types';
import { Play, Pause, Download, Video, ArrowLeft } from 'lucide-react';
import Button from './Button';
import { decodeAudio, generateVideoBlob } from '../utils/mediaUtils';

interface StoryResultProps {
  story: Project;
  onReset: () => void;
}

const StoryResult: React.FC<StoryResultProps> = ({ story, onReset }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  // Initialize Audio
  useEffect(() => {
    const initAudio = async () => {
      if (story.audioData) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;
        try {
          const buffer = await decodeAudio(story.audioData, ctx);
          setAudioBuffer(buffer);
        } catch (e) {
          console.error("Audio decode error", e);
        }
      }
    };
    initAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [story.audioData]);

  const togglePlayback = () => {
    if (!audioContextRef.current || !audioBuffer) return;

    if (isPlaying) {
      // Pause
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
        pausedAtRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      }
      setIsPlaying(false);
    } else {
      // Play
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      startTimeRef.current = audioContextRef.current.currentTime - pausedAtRef.current;
      source.start(0, pausedAtRef.current);
      sourceNodeRef.current = source;
      
      source.onended = () => {
        setIsPlaying(false);
        pausedAtRef.current = 0;
      };

      setIsPlaying(true);
    }
  };

  const handleExportVideo = async () => {
    if (!audioBuffer || !story.imageUrl) return;
    
    setIsExportingVideo(true);
    try {
      const url = await generateVideoBlob(story.imageUrl, audioBuffer);
      setVideoUrl(url);
    } catch (e) {
      console.error("Video export failed", e);
      alert("Failed to create video. Please try again.");
    } finally {
      setIsExportingVideo(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      {/* Navigation */}
      <button 
        onClick={onReset}
        className="flex items-center text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Create New Story
      </button>

      {/* Main Content Card */}
      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Left Col: Visuals & Actions */}
        <div className="space-y-6">
          <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-900 group">
             {story.imageUrl ? (
               <img 
                 src={story.imageUrl} 
                 alt={story.title} 
                 className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
               />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-slate-600">No Image</div>
             )}
             
             {/* Audio Overlay Controls */}
             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button 
                  onClick={togglePlayback}
                  className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all transform hover:scale-110"
                >
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                </button>
             </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
             <Button 
               variant="secondary" 
               onClick={togglePlayback}
               disabled={!audioBuffer}
             >
               {isPlaying ? <><Pause className="w-4 h-4 mr-2" /> Pause</> : <><Play className="w-4 h-4 mr-2" /> Listen</>}
             </Button>

             {!videoUrl ? (
               <Button 
                 variant="primary" 
                 onClick={handleExportVideo}
                 isLoading={isExportingVideo}
                 disabled={!audioBuffer || !story.imageUrl}
               >
                 <Video className="w-4 h-4 mr-2" /> Generate Video
               </Button>
             ) : (
               <a 
                 href={videoUrl} 
                 download={`${story.title.replace(/\s+/g, '_')}.webm`}
                 className="w-full"
               >
                 <Button variant="primary" className="w-full bg-green-600 hover:bg-green-700 text-white">
                   <Download className="w-4 h-4 mr-2" /> Download Video
                 </Button>
               </a>
             )}
          </div>
        </div>

        {/* Right Col: Story Text */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-xl h-full flex flex-col">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-indigo-300 font-serif leading-tight">
            {story.title}
          </h1>
          <div className="prose prose-invert prose-lg max-w-none overflow-y-auto pr-2 custom-scrollbar flex-grow max-h-[500px]">
            {story.content.split('\n').map((para, i) => (
              para.trim() && <p key={i} className="mb-4 leading-relaxed text-slate-300">{para}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryResult;