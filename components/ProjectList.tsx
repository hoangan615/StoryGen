import React from 'react';
import { Plus, Book, Trash2, Calendar } from 'lucide-react';
import { Project } from '../types';
import Button from './Button';

interface ProjectListProps {
  projects: Project[];
  onNewProject: () => void;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onNewProject, onOpenProject, onDeleteProject }) => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white font-serif">My Projects</h2>
          <p className="text-slate-400">Manage your stories and productions.</p>
        </div>
        <Button onClick={onNewProject}>
          <Plus className="w-5 h-5 mr-2" /> New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center">
          <Book className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-medium text-slate-300 mb-2">No projects yet</h3>
          <p className="text-slate-500 mb-6">Create your first story to get started.</p>
          <Button onClick={onNewProject} variant="secondary">Create Project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all group"
            >
              <div className="h-32 bg-slate-900 relative">
                {project.imageUrl ? (
                  <img src={project.imageUrl} alt={project.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
                    <Book className="w-8 h-8 text-slate-600" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${
                    project.status === 'draft' ? 'bg-slate-700 text-slate-300' :
                    project.status === 'story_generated' ? 'bg-blue-900/80 text-blue-200' :
                    'bg-green-900/80 text-green-200'
                  }`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              
              <div className="p-5">
                <h3 className="text-xl font-semibold text-white mb-2 line-clamp-1 font-serif">{project.title || "Untitled Project"}</h3>
                <div className="flex items-center space-x-4 text-sm text-slate-400 mb-4">
                  <span className="flex items-center">
                    <span className="mr-1">{project.config.language === 'Vietnamese' ? '🇻🇳' : '🇺🇸'}</span>
                    {project.config.genre}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="secondary" 
                    className="flex-1 text-sm py-2"
                    onClick={() => onOpenProject(project.id)}
                  >
                    Open Studio
                  </Button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectList;
