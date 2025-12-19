import React, { useState, useEffect } from 'react';
import StoryWizard from './components/StoryWizard';
import ProjectList from './components/ProjectList';
import ProjectWorkspace from './components/ProjectWorkspace';
import { StoryConfig, Project } from './types';
import { generateStoryText } from './services/geminiService';
import { Sparkles, PenTool, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'wizard' | 'workspace'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [storageError, setStorageError] = useState<string | null>(null);

  // Load projects from local storage on mount
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

  // Save projects whenever they change, with error handling for quota
  useEffect(() => {
    try {
      localStorage.setItem('fableforge_projects', JSON.stringify(projects));
      setStorageError(null); // Clear error if save succeeds
    } catch (e: any) {
      console.error("Storage save failed:", e);
      if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
        setStorageError("Storage full! Your latest changes are saved in memory but won't persist after reload. Please delete old projects.");
      }
    }
  }, [projects]);

  const handleNewProject = () => {
    setView('wizard');
  };

  const handleCreateStory = async (config: StoryConfig) => {
    setIsGenerating(true);
    setLoadingMsg(config.length.includes('50,000') ? 'Writing an epic (this may take a moment)...' : 'Weaving your story...');
    
    try {
      const storyData = await generateStoryText(config);
      
      const newProject: Project = {
        id: crypto.randomUUID(),
        title: storyData.title,
        content: storyData.content,
        config: config,
        status: 'story_generated',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      setProjects(prev => [newProject, ...prev]);
      setCurrentProject(newProject);
      setView('workspace');
    } catch (error) {
      console.error(error);
      alert("Failed to generate story. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenProject = (id: string) => {
    const proj = projects.find(p => p.id === id);
    if (proj) {
      setCurrentProject(proj);
      setView('workspace');
    }
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
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

  const handleBackToDashboard = () => {
    setCurrentProject(null);
    setView('dashboard');
  };

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1519681393798-38e43269d877?auto=format&fit=crop&q=80')] bg-cover bg-fixed bg-center">
      <div className="min-h-screen bg-slate-950/90 backdrop-blur-sm flex flex-col">
        
        {/* Navbar */}
        <header className="border-b border-slate-800 bg-slate-900/50 sticky top-0 z-50 backdrop-blur-md">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={handleBackToDashboard}
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                FableForge AI
              </span>
            </div>
            {view !== 'dashboard' && (
              <button onClick={handleBackToDashboard} className="text-sm text-slate-400 hover:text-white transition-colors">
                Back to Dashboard
              </button>
            )}
          </div>
        </header>

        {/* Storage Warning */}
        {storageError && (
          <div className="bg-red-900/80 text-white p-3 text-center text-sm flex items-center justify-center border-b border-red-700">
            <AlertTriangle className="w-4 h-4 mr-2" />
            {storageError}
          </div>
        )}

        {/* Main Content */}
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex flex-col">
          
          {isGenerating ? (
             <div className="flex-grow flex flex-col items-center justify-center text-center space-y-6 animate-pulse">
                <div className="w-24 h-24 relative">
                    <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full animate-ping"></div>
                    <div className="relative bg-slate-800 rounded-full p-6 border border-slate-700 flex items-center justify-center">
                        <PenTool className="w-10 h-10 text-indigo-400" />
                    </div>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{loadingMsg}</h3>
                    <p className="text-slate-400">Consulting the Muse (Gemini 3 Pro)...</p>
                </div>
             </div>
          ) : (
            <>
              {view === 'dashboard' && (
                <ProjectList 
                  projects={projects} 
                  onNewProject={handleNewProject} 
                  onOpenProject={handleOpenProject}
                  onDeleteProject={handleDeleteProject}
                />
              )}

              {view === 'wizard' && (
                <div className="flex flex-col items-center justify-center flex-grow">
                   <button onClick={() => setView('dashboard')} className="mb-8 text-slate-500 hover:text-white flex items-center">
                      Cancel
                   </button>
                   <StoryWizard onGenerate={handleCreateStory} isGenerating={false} />
                </div>
              )}

              {view === 'workspace' && currentProject && (
                <ProjectWorkspace 
                  key={currentProject.id} // CRITICAL: Forces component reset on project switch
                  project={currentProject} 
                  onUpdateProject={handleUpdateProject}
                  onBack={handleBackToDashboard}
                />
              )}
            </>
          )}

        </main>

        <footer className="py-6 text-center text-slate-500 text-sm border-t border-slate-800 bg-slate-900/50">
          <p>© {new Date().getFullYear()} FableForge AI. Projects stored locally.</p>
        </footer>

      </div>
    </div>
  );
};

export default App;