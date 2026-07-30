import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useEditorStore } from '../store/editorStore';
import { loadProjects, saveProject, type StoredVideoFile } from '../utils/storage';
import { Header } from '../components/Header';
import { RevolvingCarousel } from '../components/RevolvingCarousel';
import { Plus, SlidersHorizontal, Coffee, Film, Trash2, LogoPlay, LogoIcon, Facebook, Instagram, Globe, WhatsApp, DollarSign, Check, Copy, Mail, Send, KenyaFlag } from '../components/Icons';
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

  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    // Respect accessibility + skip on touch devices
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches || 'ontouchstart' in window) return;

    const gridEls = hero.querySelectorAll<HTMLElement>('[data-parallax="grid"]');
    const shapesLayer = hero.querySelector<HTMLElement>('[data-parallax="shapes"]');
    if (!gridEls.length) return;

    let targetX = 0, targetY = 0;
    let curX = 0, curY = 0;
    let startTime = performance.now();
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;  // -1 to 1
      targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    const onLeave = () => { targetX = 0; targetY = 0; };

    const animate = (time: number) => {
      const elapsed = (time - startTime) / 1000;

      // Smooth lerp toward target
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;

      // Base drift oscillation (replaces the old CSS keyframes)
      const driftY = Math.sin(elapsed * 0.3) * 1.5;
      const driftX = Math.sin(elapsed * 0.2) * 0.5;

      // Grid: 72° base tilt + mouse offset + drift
      const gridRX = 72 + curY * 3 + driftX;
      const gridRY = curX * 5 + driftY;
      const gridTransform = `rotateX(${gridRX}deg) rotateY(${gridRY}deg)`;

      gridEls.forEach(el => { el.style.transform = gridTransform; });

      // Shapes: more pronounced parallax for depth layering
      if (shapesLayer) {
        shapesLayer.style.transform = `rotateY(${curX * 8}deg) rotateX(${curY * 2}deg)`;
      }

      rafId = requestAnimationFrame(animate);
    };

    hero.addEventListener('mousemove', onMove, { passive: true });
    hero.addEventListener('mouseleave', onLeave);
    rafId = requestAnimationFrame(animate);

    return () => {
      hero.removeEventListener('mousemove', onMove);
      hero.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Header />

      {/* Hero Section */}
      <section ref={heroRef} className="relative overflow-hidden pt-20 pb-5 sm:pt-24 sm:pb-7">
        {/* 3D Perspective Grid Background */}
        <div
          className="absolute inset-0"
          style={{ perspective: '900px', perspectiveOrigin: '50% 20%' }}
        >
          {/* Animated grid floor — tall enough to fill section after 72° rotateX */}
          <div
            className="absolute left-0 right-0 top-0 h-[500%] hero-grid-floor"
            data-parallax="grid"
            style={{
              transformOrigin: 'center top',
              backgroundImage: `
                repeating-linear-gradient(
                  to right,
                  rgba(244, 63, 94, 0.06) 0px,
                  rgba(244, 63, 94, 0.06) 1px,
                  transparent 1px,
                  transparent 45px
                ),
                repeating-linear-gradient(
                  to bottom,
                  rgba(244, 63, 94, 0.06) 0px,
                  rgba(244, 63, 94, 0.06) 1px,
                  transparent 1px,
                  transparent 45px
                )
              `,
            }}
          />
          {/* Brighter center axis lines for that 'video editor grid' feel */}
          <div
            className="absolute left-0 right-0 top-0 h-[500%] hero-grid-axes"
            data-parallax="grid"
            style={{
              transformOrigin: 'center top',
              backgroundImage: `
                repeating-linear-gradient(
                  to right,
                  rgba(244, 63, 94, 0.15) 0px,
                  rgba(244, 63, 94, 0.15) 1px,
                  transparent 1px,
                  transparent 180px
                ),
                repeating-linear-gradient(
                  to bottom,
                  rgba(244, 63, 94, 0.15) 0px,
                  rgba(244, 63, 94, 0.15) 1px,
                  transparent 1px,
                  transparent 180px
                )
              `,
            }}
          />
          {/* Fade overlay at top for clean blend */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-transparent to-transparent" />
          {/* Warm bottom glow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-primary-500/12 rounded-full blur-[150px]" />

          {/* Floating 3D geometric shapes */}
          <div className="absolute inset-0 overflow-hidden hero-shapes-layer" data-parallax="shapes">
            {/* Cube 1 — rotating, top-left */}
            <div className="hero-shape" style={{ left: '10%', top: '20%' }}>
              <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-primary-500/30 rounded-sm hero-cube" 
                style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.1), rgba(244,63,94,0.05))' }} />
            </div>

            {/* Cube 2 — smaller, right side */}
            <div className="hero-shape" style={{ left: '75%', top: '28%' }}>
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border border-primary-400/25 rounded-sm hero-cube-2" />
            </div>

            {/* Cube 3 — tiny, mid-right */}
            <div className="hero-shape" style={{ left: '58%', top: '12%' }}>
              <div className="w-3 h-3 sm:w-4 sm:h-4 border border-primary-400/20 rounded-sm hero-cube-3" />
            </div>

            {/* Diamond — slowly spinning, center-top */}
            <div className="hero-shape" style={{ left: '46%', top: '10%' }}>
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-400/30 rotate-45 hero-diamond" 
                style={{ background: 'rgba(244,63,94,0.08)' }} />
            </div>

            {/* Large ring — pulsing, top area */}
            <div className="hero-shape" style={{ left: '18%', top: '6%' }}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-primary-400/20 hero-ring" />
            </div>

            {/* Small ring — right side */}
            <div className="hero-shape" style={{ left: '85%', top: '15%' }}>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-primary-400/15 hero-ring-2" />
            </div>

            {/* Particle cluster — floating dots, left area */}
            <div className="hero-shape" style={{ left: '6%', top: '38%' }}>
              <div className="flex gap-1 sm:gap-1.5">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary-500/50 hero-particle" />
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary-400/40 hero-particle" style={{ animationDelay: '1.2s' }} />
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary-400/35 hero-particle" style={{ animationDelay: '2.4s' }} />
              </div>
            </div>

            {/* Drift shape — moves in a slow oval, mid-left */}
            <div className="hero-shape" style={{ left: '28%', top: '35%' }}>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary-500/25 hero-drift" />
            </div>

            {/* Single particle — right bottom */}
            <div className="hero-shape" style={{ left: '68%', top: '38%' }}>
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-primary-400/40 hero-particle" style={{ animationDelay: '0.6s' }} />
            </div>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-4xl mx-auto">
            {/* Title */}
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
              <span className="text-gradient-hero" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Edit Videos
              </span>
              <br />
              <span className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Without the Bloat
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-lg md:text-xl text-surface-400 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-2 sm:px-0">
              Cut, crop, add voiceovers, and polish your videos — right in your browser. 
              Nothing to install, nothing to upload.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={() => setShowNewProject(true)}
                className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto group"
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
              <span className="text-gradient" style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.1em' }}>Nothing You Don't</span>
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
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary-500/10 mb-4 sm:mb-5">
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
            {/* Brand */}
            <Link to="/" className="flex items-center gap-2">
              <LogoIcon className="w-6 h-6 text-primary-400" />
              <span
                className="text-base sm:text-lg text-white tracking-wide"
                style={{ fontFamily: "'Dancing Script', cursive", fontWeight: 700 }}
              >
                FreeVid Editor
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
                className="w-9 h-9 rounded-xl bg-surface-800/80 border border-surface-700/50 flex items-center justify-center text-surface-400 hover:text-white hover:border-primary-500/40 hover:bg-surface-800 transition-all duration-200"
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
                    : 'bg-surface-800 text-surface-300 border border-surface-700 hover:border-primary-500/30 hover:text-white'
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
