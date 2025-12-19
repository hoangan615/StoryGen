
import React, { useState, useEffect } from 'react';
import ProjectList from './components/ProjectList';
import ProjectWorkspace from './components/ProjectWorkspace';
import { Project, Language, Genre, Tone, StoryLength, VoiceName } from './types';
import { APP_SETTINGS } from './settings';
import { Sparkles, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'workspace'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('fableforge_projects');
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('fableforge_projects', JSON.stringify(projects));
      setStorageError(null);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
        setStorageError("Bộ nhớ đầy! Hãy xóa bớt dự án cũ.");
      }
    }
  }, [projects]);

  const handleNewProject = () => {
    // Create Default Empty Project
    const newProject: Project = {
      id: crypto.randomUUID(),
      title: "Truyện Mới",
      content: "",
      status: 'draft',
      config: {
        idea: "",
        language: Language.VI, // Default to Vietnamese for VN users
        genre: Genre.CO_TICH,
        tone: Tone.VUI_VE,
        length: StoryLength.SHORT,
        voice: VoiceName.Puck
      },
      models: {
        storyModel: APP_SETTINGS.AVAILABLE_MODELS.STORY[0].value,
        imageModel: APP_SETTINGS.AVAILABLE_MODELS.IMAGE[0].value,
        audioModel: APP_SETTINGS.AVAILABLE_MODELS.AUDIO[0].value,
        videoModel: APP_SETTINGS.AVAILABLE_MODELS.VEO[0]?.value || '' // Handle case where no video models exist
      },
      usage: {
        story: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
        audio: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
        image: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 }, // Init image usage
        total: 0
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setProjects(prev => [newProject, ...prev]);
    setCurrentProject(newProject);
    setView('workspace');
  };

  const handleOpenProject = (id: string) => {
    const proj = projects.find(p => p.id === id);
    if (proj) {
      // Ensure stats/models exist for old projects
      if (!proj.usage) proj.usage = { 
        story: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 }, 
        audio: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 }, 
        image: { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 },
        total: 0 
      };
      if (!proj.usage.image) proj.usage.image = { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 }; // Backfill image usage if missing

      if (!proj.models) proj.models = { 
          storyModel: APP_SETTINGS.AVAILABLE_MODELS.STORY[0].value, 
          imageModel: APP_SETTINGS.AVAILABLE_MODELS.IMAGE[0].value, 
          audioModel: APP_SETTINGS.AVAILABLE_MODELS.AUDIO[0].value, 
          videoModel: APP_SETTINGS.AVAILABLE_MODELS.VEO[0]?.value || ''
      };
      
      setCurrentProject(proj);
      setView('workspace');
    }
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa dự án này?")) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (currentProject?.id === id) {
        setView('dashboard');
        setCurrentProject(null);
      }
    }
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setCurrentProject(updatedProject);
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-200 font-sans">
      
      {storageError && (
        <div className="bg-red-900/80 text-white p-1 text-center text-xs flex items-center justify-center border-b border-red-700 z-50">
          <AlertTriangle className="w-3 h-3 mr-2" /> {storageError}
        </div>
      )}

      {view === 'dashboard' ? (
         <div className="flex-grow overflow-auto bg-[url('https://images.unsplash.com/photo-1519681393798-38e43269d877?auto=format&fit=crop&q=80')] bg-cover bg-fixed">
            <div className="min-h-full bg-slate-950/90 backdrop-blur-sm p-4 md:p-8">
                <header className="max-w-6xl mx-auto flex justify-between items-center mb-12">
                     <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30"><Sparkles className="w-6 h-6 text-white"/></div>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">FableForge AI</span>
                     </div>
                </header>
                <ProjectList 
                  projects={projects} 
                  onNewProject={handleNewProject} 
                  onOpenProject={handleOpenProject}
                  onDeleteProject={handleDeleteProject}
                />
            </div>
         </div>
      ) : (
        currentProject && (
          <ProjectWorkspace 
            key={currentProject.id}
            project={currentProject} 
            onUpdateProject={handleUpdateProject}
            onBack={() => setView('dashboard')}
          />
        )
      )}
    </div>
  );
};

export default App;
