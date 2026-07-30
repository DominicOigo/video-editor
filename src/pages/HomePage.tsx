import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useEditorStore } from '../store/editorStore';
import { loadProjects, saveProject, type StoredVideoFile } from '../utils/storage';
import { Header } from '../components/Header';
import { RevolvingCarousel } from '../components/RevolvingCarousel';
import { Plus, SlidersHorizontal, Coffee, Film, Trash2, LogoPlay, Facebook, Instagram, Globe, WhatsApp, DollarSign, Check, Copy, Mail, Send, KenyaFlag } from '../components/Icons';
import { ContactForm } from '../components/ContactForm';
import type { VideoFile } from '../types';

export function HomePage() {
  const navigate = useNavigate();
  const { projects, projectActions } = useEditorStore();
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [projectPage, setProjectPage] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const PROJECTS_PER_PAGE = 4;

  const totalPages = Math.max(1, Math.ceil(projects.length / PROJECTS_PER_PAGE));
  const safePage = Math.min(projectPage, totalPages - 1);
  const paginatedProjects = projects.slice(
    safePage * PROJECTS_PER_PAGE,
    (safePage + 1) * PROJECTS_PER_PAGE
  );

  // Reset page when it exceeds available pages (e.g. deleting last item)
  useEffect(() => {
    if (projectPage >= totalPages) {
      setProjectPage(Math.max(0, totalPages - 1));
    }
  }, [projectPage, totalPages]);

  useEffect(() => {
    loadProjects().then((savedEntries) => {
      if (savedEntries.length > 0) {
        const store = useEditorStore.getState();
        for (const entry of savedEntries) {
          store.projectActions.restoreProject(entry.project);
        }
      }
      setLoaded(true);
    });
  }, []);

  const handleCreateProject = () => {
    const name = projectName.trim() || `Project ${projects.length + 1}`;
    const project = projectActions.createProject(name);
    saveProject(project);
    setShowNewProject(false);
    setProjectName('');
    navigate(`/editor/${project.id}`);
  };

  const handleOpenProject = (id: string) => {
    projectActions.setCurrentProject(id);
    navigate(`/editor/${id}`);
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    projectActions.deleteProject(id);
  };



  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-24 pb-10 sm:pt-28 sm:pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-4 sm:mb-6 leading-tight tracking-tight">
              <span className="text-gradient-hero">
                Edit Videos
              </span>
              <br />
              <span className="text-white">
                Without the Bloat
              </span>
            </h1>

            <p className="text-sm sm:text-lg md:text-xl text-surface-400 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-2 sm:px-0">
              Cut, crop, add voiceovers, and polish your videos — right in your browser. 
              Nothing to install, nothing to upload.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={() => setShowNewProject(true)}
                className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                New Project
              </button>
              {projects.length > 0 && (
                <button
                  onClick={() => {
                    document.getElementById('projects-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto"
                >
                  <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Open Recent
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section — 3D Orbital Carousel */}
      <section className="py-10 sm:py-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-4 sm:mb-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              Everything You Need,{' '}
              <span className="text-gradient">Nothing You Don't</span>
            </h2>
            <p className="text-surface-400 text-sm sm:text-base max-w-2xl mx-auto px-4 sm:px-0">
              A straightforward video editor that just works — no subscriptions, 
              no cloud uploads, no nonsense.
            </p>
          </div>
        </div>

        <RevolvingCarousel />
      </section>

      {/* Support & Contact Section */}
      <section className="py-10 sm:py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              {/* Support Card */}
              <div className="card text-center flex flex-col items-center p-6 sm:p-8">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-400/20 mb-4 sm:mb-5">
                  <Coffee className="w-6 h-6 sm:w-7 sm:h-7 text-primary-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  Buy Me a Coffee
                </h3>
                <p className="text-surface-400 text-xs sm:text-sm mb-5 leading-relaxed">
                  If FreeVid Editor helps you, consider sending a small token. 
                  Every bit keeps the project alive and improving.
                </p>
                <SupportButton />
              </div>

              {/* Contact Card */}
              <div className="card text-center flex flex-col items-center p-6 sm:p-8">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 mb-4 sm:mb-5">
                  <Mail className="w-6 h-6 sm:w-7 sm:h-7 text-sky-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                  Talk to the Developer
                </h3>
                <p className="text-surface-400 text-xs sm:text-sm mb-5 leading-relaxed">
                  Have an idea, found a bug, or want a new feature? 
                  I personally read every suggestion.
                </p>
                <button
                  onClick={() => setShowContact(true)}
                  className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full group"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Send Suggestion
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      {projects.length > 0 && (
        <section id="projects-section" className="py-10 sm:py-16 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold">
                Your <span className="text-gradient">Projects</span>
              </h2>
              {totalPages > 1 && (
                <span className="text-xs text-surface-500">
                  Page {projectPage + 1} of {totalPages}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {paginatedProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleOpenProject(project.id)}
                  className="card text-left group glass-hover relative overflow-hidden cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenProject(project.id); } }}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-surface-800 to-surface-900 mb-3 sm:mb-4 flex items-center justify-center overflow-hidden">
                    {project.video?.url ? (
                      <video
                        src={project.video.url}
                        className="w-full h-full object-cover"
                        muted
                        onLoadedData={(e) => {
                          const video = e.currentTarget;
                          video.currentTime = 1;
                        }}
                      />
                    ) : (
                      <div className="text-surface-600">
                        <Film className="w-10 h-10 sm:w-12 sm:h-12" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base text-white truncate">{project.name}</h3>
                      <p className="text-xs sm:text-sm text-surface-500 mt-0.5 sm:mt-1">
                        {project.video
                          ? `${project.video.name} • ${Math.round(project.video.duration)}s`
                          : 'No media added'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      className="p-1.5 sm:p-2 text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>

                  {/* Timestamp */}
                  <p className="text-xs text-surface-600 mt-1.5 sm:mt-2">
                    {new Date(project.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setProjectPage((p) => Math.max(0, p - 1))}
                  disabled={projectPage === 0}
                  className="p-2 rounded-lg text-surface-500 hover:text-white hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
                  </svg>
                </button>

                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setProjectPage(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                      projectPage === i
                        ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                        : 'text-surface-500 hover:text-white hover:bg-surface-800 border border-transparent'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setProjectPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={projectPage === totalPages - 1}
                  className="p-2 rounded-lg text-surface-500 hover:text-white hover:bg-surface-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Contact Form */}
      <ContactForm
        isOpen={showContact}
        onClose={() => setShowContact(false)}
      />

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="card max-w-md w-full mx-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-2">Create New Project</h2>
            <p className="text-surface-400 text-sm mb-6">
              Give your project a name to get started.
            </p>

            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Awesome Video"
              className="input-field mb-6"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNewProject(false);
                  setProjectName('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={handleCreateProject} className="btn-primary">
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-surface-800/50 mt-10 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col items-center gap-4 sm:gap-5">
            {/* Brand — matches Header exactly */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <LogoPlay className="text-white w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-sm sm:text-base font-bold text-white">
                Free<span className="text-primary-400">Vid</span> Editor
              </span>
            </Link>

            {/* Tagline */}
            <p className="text-surface-500 text-xs sm:text-sm max-w-md text-center leading-relaxed">
              Everything runs right in your browser. No uploads, no servers, 
              no data leaves your machine.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-3">
              <a
                href="https://web.facebook.com/profile.php?id=100073109214659"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-surface-800/80 border border-surface-700/50 flex items-center justify-center text-surface-400 hover:text-white hover:border-primary-400/40 hover:bg-surface-800 transition-all duration-200"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/dominic.oigo/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-surface-800/80 border border-surface-700/50 flex items-center justify-center text-surface-400 hover:text-pink-400 hover:border-pink-500/40 hover:bg-surface-800 transition-all duration-200"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://dominic-oigo.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-surface-800/80 border border-surface-700/50 flex items-center justify-center text-surface-400 hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-surface-800 transition-all duration-200"
                aria-label="Website"
              >
                <Globe className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/254796060722"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-surface-800/80 border border-surface-700/50 flex items-center justify-center text-surface-400 hover:text-green-400 hover:border-green-500/40 hover:bg-surface-800 transition-all duration-200"
                aria-label="WhatsApp"
              >
                <WhatsApp className="w-4 h-4" />
              </a>
            </div>

            {/* Divider */}
            <div className="w-12 h-px bg-surface-800" />

            {/* Bottom row */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-xs text-surface-500">
              <span>© {new Date().getFullYear()} FreeVid Editor</span>
              <span className="hidden sm:inline text-surface-700">·</span>
              <span>
                Created by{' '}
                <a
                  href="https://dominic-oigo.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-surface-400 hover:text-primary-400 transition-colors"
                >
                  Dominic Oigo
                </a>
              </span>
              <span className="hidden sm:inline text-surface-700">·</span>
              <span className="flex items-center gap-1.5">
                <KenyaFlag className="w-4 h-4" />
                <span className="text-surface-400 font-medium">Kenya</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SupportButton() {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const PAYMENT_NUMBER = '0796060722';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(PAYMENT_NUMBER);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = PAYMENT_NUMBER;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 group"
      >
        <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
        Send Support
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="card max-w-sm w-full animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white">Send via M-Pesa</h3>
                <p className="text-xs sm:text-sm text-surface-400">
                  Send to <span className="text-green-400 font-medium">0796060722</span>
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-surface-800/50 rounded-xl p-4 mb-5">
              <p className="text-surface-300 text-xs sm:text-sm font-medium mb-3">
                How to send:
              </p>
              <ol className="space-y-2">
                {[
                  'Go to M-Pesa on your phone',
                  'Select Lipa na M-Pesa',
                  'Select Send Money',
                  `Enter number: ${PAYMENT_NUMBER}`,
                  'Enter any amount you wish',
                  'Enter your M-Pesa PIN and send',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-surface-400">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500/15 text-primary-400 flex items-center justify-center text-[10px] font-semibold">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  copied
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-surface-800 text-surface-300 border border-surface-700 hover:border-primary-400/30 hover:text-white'
                }`}
              >
                {copied ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4" />
                    Copied!
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <Copy className="w-4 h-4" />
                    Copy Number
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-800 text-surface-400 border border-surface-700 hover:text-white transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
