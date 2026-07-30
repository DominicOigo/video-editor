import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditorStore } from '../store/editorStore';
import { processVideo, loadFFmpeg, formatTime, getExtension, getAudioExtension } from '../utils/ffmpeg';
import type { VideoClipInput, VoiceoverTrackInput } from '../utils/ffmpeg';
import { saveProject } from '../utils/storage';
import { Header } from '../components/Header';
import { VideoUploader } from '../components/VideoUploader';
import { VideoPlayer } from '../components/VideoPlayer';
import { Timeline } from '../components/Timeline';
import { VideoCropper } from '../components/VideoCropper';
import { VoiceoverStudio } from '../components/VoiceoverStudio';
import { QualitySettingsPanel } from '../components/QualitySettings';
import { ColorAdjustmentPanel } from '../components/ColorAdjustmentPanel';
import { StickerPanel } from '../components/StickerPanel';
import { AutoCaptionsPanel } from '../components/AutoCaptionsPanel';
import { ExportDialog } from '../components/ExportDialog';
import { TracksPanel } from '../components/TracksPanel';
import { TransitionPanel } from '../components/TransitionPanel';
import { KeyframeEditor } from '../components/KeyframeEditor';
import { TextOverlayPanel } from '../components/TextOverlayPanel';
import { useIsMobile, useIsTablet } from '../hooks/useMediaQuery';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from '../components/KeyboardShortcutsHelp';
import { AlertCircle, Film, Crop, Layers, Mic, Music, Sparkles, Move, RotateCw, Type as TypeIcon, Trash2, Undo2, Redo2, Download, X, Keyboard, SlidersHorizontal, Image, Captions, ChevronRight } from '../components/Icons';
import type { VideoFile, PlatformPreset } from '../types';
import { PLATFORM_PRESETS } from '../types';

type Tab = 'media' | 'crop' | 'adjust' | 'text' | 'stickers' | 'transitions' | 'animate' | 'voice' | 'tracks' | 'captions' | 'quality';

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const {
    projectActions,
    videoActions,
    trimActions,
    cropActions,
    voiceoverActions,
    qualityActions,
    exportProgress,
    exportActions,
    trackActions,
    textActions,
    colorActions,
    stickerActions,
    undoActions,
    undoStack,
    redoStack,
  } = useEditorStore();

  const projectFromList = useEditorStore((s) => s.projects.find((p) => p.id === projectId));

  const [activeTab, setActiveTab] = useState<Tab>('media');
  const [showPanel, setShowPanel] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [voiceoverStudioOpen, setVoiceoverStudioOpen] = useState(false);
  const [animateClipId, setAnimateClipId] = useState<string | null>(null);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const FRAME_STEP = 1 / 30; // ~1 frame at 30fps
  const BIG_STEP = 5; // 5 seconds for shift+arrow

  // Refs for keyboard shortcuts to avoid stale closures
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const durationRef = useRef(duration);
  durationRef.current = duration;

  // Tab switcher helper - defined early to avoid TDZ issues
  const tabIds: Tab[] = ['media', 'crop', 'adjust', 'text', 'stickers', 'transitions', 'animate', 'voice', 'tracks', 'captions', 'quality'];

  // Set project context on mount
  useEffect(() => {
    if (projectId) {
      const existing = useEditorStore.getState().projects.find((p) => p.id === projectId);
      if (existing) {
        projectActions.setCurrentProject(projectId);
      } else {
        navigate('/');
      }
    }
  }, [projectId, navigate, projectActions]);

  // Save project periodically
  useEffect(() => {
    if (!projectFromList) return;
    const timer = setInterval(() => {
      saveProject(projectFromList);
      setLastSaved(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, [projectFromList]);

  // Preload FFmpeg
  useEffect(() => {
    loadFFmpeg().catch((err) => {
      console.warn('FFmpeg preload failed, will retry on export:', err);
    });
  }, []);

  const [audioFiles, setAudioFiles] = useState<{ url: string; name: string; duration: number }[]>([]);
  const audioUrlsRef = useRef<string[]>([]);

  // Revoke audio blob URLs on unmount
  useEffect(() => {
    return () => {
      audioUrlsRef.current.forEach(URL.revokeObjectURL);
    };
  }, []);

  const handleAudioSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('audio/')) return;

      // Get audio duration
      const url = URL.createObjectURL(file);
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.src = url;

      try {
        await new Promise<void>((resolve, reject) => {
          audio.onloadedmetadata = () => resolve();
          audio.onerror = () => reject(new Error('Failed to load audio'));
          setTimeout(() => reject(new Error('Timeout')), 10000);
          audio.load();
        });
      } catch (err) {
        URL.revokeObjectURL(url);
        console.error('Failed to load audio:', err);
        return;
      }

      const duration = audio.duration;

      audioUrlsRef.current.push(url);
      setAudioFiles((prev) => [...prev, { url, name: file.name, duration }]);

      // Add to first audio track, creating one if needed
      const currentProject = projectFromList;
      if (!currentProject) return;
      let audioTrack = currentProject.tracks.find((t) => t.type === 'audio');
      if (!audioTrack) {
        trackActions.addTrack('audio', 'Audio 1');
        // Re-read project after adding track
        const updatedProject = useEditorStore.getState().projects.find((p) => p.id === currentProject.id);
        audioTrack = updatedProject?.tracks.find((t) => t.type === 'audio');
        if (!audioTrack) return;
      }
      trackActions.addClip(audioTrack.id, {
        id: crypto.randomUUID(),
        name: file.name,
        type: 'audio',
        sourceStart: 0,
        sourceEnd: duration,
        offset: 0,
        duration,
        volume: 1,
        blobUrl: url,
        speed: 1,
        transitionIn: { type: 'none', duration: 0.5 },
        transitionOut: { type: 'none', duration: 0.5 },
      });
    },
    [projectFromList, trackActions]
  );

  const handleVideoSelect = useCallback(
    async (file: File) => {
      setUploadLoading(true);
      setLoadingMessage('Loading video...');

      try {
        const url = URL.createObjectURL(file);

        // Get video metadata
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = url;

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            setDuration(video.duration);
            resolve();
          };
          video.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load video'));
          };
          setTimeout(() => {
            URL.revokeObjectURL(url);
            reject(new Error('Timeout loading video'));
          }, 10000);
          video.load();
        });

        const videoFile: VideoFile = {
          id: crypto.randomUUID(),
          name: file.name,
          file,
          url,
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          size: file.size,
          uploadedAt: Date.now(),
        };

        videoActions.setVideo(videoFile);
        setActiveTab('crop');
        if (isMobile) setShowPanel(false);
      } catch (error) {
        console.error('Failed to load video:', error);
      } finally {
        setUploadLoading(false);
        setLoadingMessage('');
      }
    },
    [videoActions, isMobile]
  );

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleDuration = useCallback((dur: number) => {
    setDuration(dur);
    const store = useEditorStore.getState();
    const currentProject = store.projects.find(p => p.id === projectId);
    if (currentProject && currentProject.trimRange.end === 0) {
      trimActions.setTrimRange({ start: 0, end: dur });
    }
  }, [projectId, trimActions]);

  const handleSeek = useCallback((time: number) => {
    setSeekTo(time);
    setCurrentTime(time);
  }, []);

  const handleSeekDone = useCallback(() => {
    setSeekTo(null);
  }, []);

  // Keyboard shortcut handlers
  // Undo/Redo
  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const stepFrame = useCallback(
    (direction: 1 | -1) => {
      const ct = currentTimeRef.current;
      const dur = durationRef.current;
      const newTime = Math.max(0, Math.min(ct + direction * FRAME_STEP, dur));
      setSeekTo(newTime);
      setCurrentTime(newTime);
    },
    []
  );

  const seekBig = useCallback(
    (direction: 1 | -1) => {
      const ct = currentTimeRef.current;
      const dur = durationRef.current;
      const newTime = Math.max(0, Math.min(ct + direction * BIG_STEP, dur));
      setSeekTo(newTime);
      setCurrentTime(newTime);
    },
    []
  );

  const setTrimIn = useCallback(() => {
    if (!projectFromList) return;
    trimActions.setTrimRange({ ...projectFromList.trimRange, start: currentTimeRef.current });
  }, [projectFromList, trimActions]);

  const setTrimOut = useCallback(() => {
    if (!projectFromList) return;
    trimActions.setTrimRange({ ...projectFromList.trimRange, end: currentTimeRef.current });
  }, [projectFromList, trimActions]);

  const activeTabIndex = tabIds.indexOf(activeTab);
  const setTabFromIndex = useCallback(
    (index: number) => {
      setActiveTab(tabIds[index] || 'media');
    },
    []
  );

  const { showShortcutsHelp, setShowShortcutsHelp } = useKeyboardShortcuts({
    togglePlay,
    stepFrame,
    seekBig,
    setTrimIn,
    setTrimOut,
    undo: () => undoActions.undo(),
    redo: () => undoActions.redo(),
    openExport: () => setShowExport(true),
    closePanel: () => {
      if (isMobile) setShowPanel(false);
    },
    closeExport: () => setShowExport(false),
    showExport,
    setActiveTab: setTabFromIndex,
    activeTabIndex,
    totalTabs: tabIds.length,
  });

  const handleSave = useCallback(() => {
    if (!projectFromList) return;
    saveProject(projectFromList);
    setLastSaved(Date.now());
  }, [projectFromList]);

  const handleExport = useCallback(async (preset?: PlatformPreset) => {
    if (preset) {
      const config = PLATFORM_PRESETS.find((p) => p.id === preset);
      if (config) {
        qualityActions.setQualitySettings({
          resolution: config.resolution,
          framerate: config.framerate,
          bitrate: config.bitrate,
          format: config.format,
          enhanceQuality: false,
          denoise: false,
          stabilize: false,
          upscale: false,
          audioDenoise: false,
          audioNormalize: false,
        });

        const p = useEditorStore.getState().projects.find(proj => proj.id === projectId);
        if (p?.video) {
          const vw = p.video.width;
          const vh = p.video.height;
          const targetRatio = config.aspectValue;
          const videoRatio = vw / vh;

          let cropW: number, cropH: number;
          if (videoRatio > targetRatio) {
            cropH = vh;
            cropW = Math.round(vh * targetRatio);
          } else {
            cropW = vw;
            cropH = Math.round(vw / targetRatio);
          }

          cropActions.setCropRegion({
            x: Math.round((vw - cropW) / 2),
            y: Math.round((vh - cropH) / 2),
            width: cropW,
            height: cropH,
          });
        }
      }
    }
    const store = useEditorStore.getState();
    const p = store.projects.find(proj => proj.id === projectId);
    if (!p?.video?.file) return;

    try {
      setExportLoading(true);
      setLoadingMessage('Loading FFmpeg engine...');
      await loadFFmpeg();
      setExportLoading(false);
      setLoadingMessage('');

      exportActions.setExportProgress({
        stage: 'preparing',
        progress: 0,
        message: 'Preparing to export...',
      });

      // Collect all voiceover tracks from legacy array and from track system
      const voiceoverTracks: VoiceoverTrackInput[] = [];
      for (const track of p.voiceoverTracks) {
        let blob = track.blob;
        if (!blob) {
          try {
            const response = await fetch(track.url);
            blob = await response.blob();
          } catch { continue; }
        }
        voiceoverTracks.push({ blob, offset: track.offset, volume: track.volume });
      }
      // Also collect from voiceover-type tracks (track system)
      for (const track of p.tracks.filter((t) => t.type === 'voiceover')) {
        for (const clip of track.clips) {
          if (voiceoverTracks.some((v) => v.blob === clip.blob)) continue;
          let blob = clip.blob;
          if (!blob && clip.blobUrl) {
            try {
              const response = await fetch(clip.blobUrl);
              blob = await response.blob();
            } catch { continue; }
          }
          if (blob) voiceoverTracks.push({ blob, offset: clip.offset, volume: clip.volume });
        }
      }

      // Gather audio clips from audio tracks
      const exportAudioClips: { blob: Blob; offset: number; volume: number }[] = [];
      for (const track of p.tracks.filter((t) => t.type === 'audio')) {
        for (const clip of track.clips) {
          const blob = clip.blob;
          if (blob) {
            exportAudioClips.push({ blob, offset: clip.offset, volume: clip.volume });
          } else if (clip.blobUrl) {
            try {
              const response = await fetch(clip.blobUrl);
              exportAudioClips.push({ blob: await response.blob(), offset: clip.offset, volume: clip.volume });
            } catch {}
          }
        }
      }

      // Build video clips from all video track clips
      const videoTrack = p.tracks.find((t) => t.type === 'video');
      const rawVideoClips = videoTrack?.clips || [];
      const videoClips: VideoClipInput[] = rawVideoClips.map((clip) => ({
        sourceStart: clip.sourceStart,
        sourceEnd: clip.sourceEnd,
        offset: clip.offset,
        duration: clip.duration,
        speed: clip.speed !== 1 ? clip.speed : undefined,
        transitionIn: clip.transitionIn.type !== 'none' ? clip.transitionIn : undefined,
        transitionOut: clip.transitionOut.type !== 'none' ? clip.transitionOut : undefined,
        keyframes: clip.keyframes && clip.keyframes.length >= 2 ? clip.keyframes : undefined,
      }));

      const isMultiClip = videoClips.length > 0;

      const firstClip = rawVideoClips[0];
      const processOptions: Parameters<typeof processVideo>[1] = {
        cropRegion: p.cropRegion,
        qualitySettings: p.qualitySettings,
        textOverlays: p.textOverlays || [],
        audioClips: exportAudioClips.length > 0 ? exportAudioClips : undefined,
        onProgress: (progress, message) => {
          exportActions.setExportProgress({
            stage: progress === 100 ? 'finalizing' : 'processing',
            progress,
            message,
          });
        },
        colorAdjustments: p.colorAdjustments,
        stickers: p.stickers || [],
        originalWidth: p.video.width,
        originalHeight: p.video.height,
      };
      if (isMultiClip) {
        processOptions.videoClips = videoClips;
        if (voiceoverTracks.length > 0) processOptions.voiceoverTracks = voiceoverTracks;
      } else {
        processOptions.trimRange = p.trimRange;
        processOptions.voiceoverBlob = voiceoverTracks[0]?.blob || null;
        processOptions.voiceoverOffset = voiceoverTracks[0]?.offset || 0;
        processOptions.voiceoverVolume = voiceoverTracks[0]?.volume || 1.0;
        if (firstClip) {
          if (firstClip.transitionIn.type !== 'none') processOptions.transitionIn = firstClip.transitionIn;
          if (firstClip.transitionOut.type !== 'none') processOptions.transitionOut = firstClip.transitionOut;
          if (firstClip.keyframes && firstClip.keyframes.length >= 2) processOptions.keyframes = firstClip.keyframes;
          if (firstClip.speed !== 1) processOptions.speed = firstClip.speed;
        }
      }

      const resultBlob = await processVideo(p.video.file, processOptions);

      const outputUrl = URL.createObjectURL(resultBlob);

      exportActions.setExportProgress({
        stage: 'complete',
        progress: 100,
        message: 'Export complete!',
        outputUrl,
      });
    } catch (error) {
      setExportLoading(false);
      exportActions.setExportProgress({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Export failed',
      });
    }
  }, [projectId, exportActions]);

  const handleFastExport = useCallback(async () => {
    const store = useEditorStore.getState();
    const p = store.projects.find(proj => proj.id === projectId);
    if (!p?.video?.file) return;

    try {
      setExportLoading(true);
      setLoadingMessage('Uploading video...');

      // 1. Upload video to blob storage
      const videoResp = await fetch('/api/get-upload-url?filename=video' + getExtension(p.video.file.name || 'input.mp4'), {
        method: 'POST',
        headers: { 'Content-Type': p.video.file.type },
        body: p.video.file,
      });
      if (!videoResp.ok) throw new Error('Failed to upload video');
      const { url: videoBlobUrl } = await videoResp.json();

      // 2. Upload voiceovers
      const voiceoverUploads: { url: string; offset: number; volume: number }[] = [];
      for (const track of p.voiceoverTracks) {
        const blob = track.blob || await (await fetch(track.url)).blob();
        setLoadingMessage(`Uploading voiceover...`);
        const voResp = await fetch('/api/get-upload-url?filename=voiceover_' + track.id + '.wav', {
          method: 'POST',
          headers: { 'Content-Type': blob.type },
          body: blob,
        });
        if (!voResp.ok) { console.warn('Failed to upload voiceover'); continue; }
        const { url: voUrl } = await voResp.json();
        voiceoverUploads.push({ url: voUrl, offset: track.offset, volume: track.volume });
      }
      // Also collect from track system
      for (const track of p.tracks.filter((t) => t.type === 'voiceover')) {
        for (const clip of track.clips) {
          const blob = clip.blob || (clip.blobUrl ? await (await fetch(clip.blobUrl)).blob() : null);
          if (!blob) continue;
          setLoadingMessage(`Uploading audio...`);
          const voResp = await fetch('/api/get-upload-url?filename=voiceover_clip_' + clip.id + '.wav', {
            method: 'POST',
            headers: { 'Content-Type': blob.type },
            body: blob,
          });
          if (!voResp.ok) { console.warn('Failed to upload voiceover clip'); continue; }
          const { url: voUrl } = await voResp.json();
          voiceoverUploads.push({ url: voUrl, offset: clip.offset, volume: clip.volume });
        }
      }

      // 3. Upload audio clips
      const audioUploads: { url: string; ext: string; offset: number; volume: number }[] = [];
      for (const track of p.tracks.filter((t) => t.type === 'audio')) {
        for (const clip of track.clips) {
          const blob = clip.blob || (clip.blobUrl ? await (await fetch(clip.blobUrl)).blob() : null);
          if (!blob) continue;
          setLoadingMessage(`Uploading audio clip...`);
          const ext = getAudioExtension(blob);
          const audResp = await fetch('/api/get-upload-url?filename=audio_clip_' + clip.id + '.' + ext, {
            method: 'POST',
            headers: { 'Content-Type': blob.type },
            body: blob,
          });
          if (!audResp.ok) { console.warn('Failed to upload audio clip'); continue; }
          const { url: audUrl } = await audResp.json();
          audioUploads.push({ url: audUrl, ext, offset: clip.offset, volume: clip.volume });
        }
      }

      setLoadingMessage('Processing on server...');
      setExportLoading(false);

      exportActions.setExportProgress({
        stage: 'processing',
        progress: 10,
        message: 'Server processing...',
      });

      // 4. Detect if input has audio
      const hasAudio = true;

      // 5. Build editing params
      const videoTrack = p.tracks.find((t) => t.type === 'video');
      const videoClips = videoTrack?.clips.map((c) => ({
        sourceStart: c.sourceStart,
        sourceEnd: c.sourceEnd,
        offset: c.offset,
        duration: c.duration,
        speed: c.speed !== 1 ? c.speed : undefined,
        transitionIn: c.transitionIn.type !== 'none' ? c.transitionIn : undefined,
        transitionOut: c.transitionOut.type !== 'none' ? c.transitionOut : undefined,
        keyframes: c.keyframes && c.keyframes.length >= 2 ? c.keyframes : undefined,
      })) || [];

      const exportBody: Record<string, unknown> = {
        videoUrl: videoBlobUrl,
        qualitySettings: p.qualitySettings,
        cropRegion: p.cropRegion,
        originalWidth: p.video.width,
        originalHeight: p.video.height,
        textOverlays: p.textOverlays || [],
        colorAdjustments: p.colorAdjustments,
        stickers: p.stickers || [],
        voiceovers: voiceoverUploads,
        audioClips: audioUploads,
        inputHasAudio: hasAudio,
      };

      if (videoClips.length > 0) {
        exportBody.videoClips = videoClips;
      } else {
        exportBody.trimRange = p.trimRange;
      }

      // 6. Call export API
      const exportResp = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportBody),
      });

      if (!exportResp.ok) {
        const errData = await exportResp.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || `Export failed: ${exportResp.status}`);
      }

      const { url: resultUrl } = await exportResp.json() as { url: string };

      exportActions.setExportProgress({
        stage: 'complete',
        progress: 100,
        message: 'Export complete!',
        outputUrl: resultUrl,
      });
    } catch (error) {
      setExportLoading(false);
      exportActions.setExportProgress({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Export failed',
      });
    }
  }, [projectId, exportActions]);

  if (!projectFromList) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-surface-800 mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-surface-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Project Not Found</h2>
          <p className="text-surface-400 mb-6">This project may have been deleted.</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const projectData = projectFromList;

  // Extract video clips for live preview props
  const previewVideoTrack = projectData.tracks.find((t) => t.type === 'video');
  const firstClip = previewVideoTrack?.clips[0];
  const previewClips = previewVideoTrack?.clips.map((c) => ({
    sourceStart: c.sourceStart,
    sourceEnd: c.sourceEnd,
    offset: c.offset,
    duration: c.duration,
    speed: c.speed,
  })) || [];

  const tabs: { id: Tab; label: string; title: string; icon: React.ReactNode }[] = [
    { id: 'media', label: 'Media', title: 'Upload or manage your video and background music', icon: <Film className="w-5 h-5" /> },
    { id: 'crop', label: 'Crop', title: 'Crop and resize your video', icon: <Crop className="w-5 h-5" /> },
    { id: 'adjust', label: 'Adjust', title: 'Color correction — brightness, contrast, saturation', icon: <SlidersHorizontal className="w-5 h-5" /> },
    { id: 'text', label: 'Text', title: 'Add text overlays to your video', icon: <TypeIcon className="w-5 h-5" /> },
    { id: 'stickers', label: 'Stickers', title: 'Add emoji stickers to your video', icon: <Image className="w-5 h-5" /> },
    { id: 'transitions', label: 'Transitions', title: 'Add fade, slide, wipe, and zoom transitions', icon: <Move className="w-5 h-5" /> },
    { id: 'animate', label: 'Animate', title: 'Animate your clips with keyframes', icon: <RotateCw className="w-5 h-5" /> },
    { id: 'voice', label: 'Voice', title: 'Record voiceover narration with effects', icon: <Mic className="w-5 h-5" /> },
    { id: 'tracks', label: 'Tracks', title: 'Manage video and audio track layers', icon: <Layers className="w-5 h-5" /> },
    { id: 'captions', label: 'Captions', title: 'Generate auto-captions from speech', icon: <Captions className="w-5 h-5" /> },
    { id: 'quality', label: 'Quality', title: 'Export resolution, bitrate, and format settings', icon: <Sparkles className="w-5 h-5" /> },
  ];

  const handleTabChange = (tabId: Tab) => {
    setActiveTab(tabId);
    if (isMobile) {
      setShowPanel(tabId !== activeTab || !showPanel);
    }
  };

  // Render the tab content panel
  const renderTabContent = () => {
    return (
      <>
        {activeTab === 'media' && (
          <div>
            {projectData.video ? (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <Film className="w-5 h-5 text-primary-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{projectData.video.name}</p>
                    <p className="text-xs text-surface-500">
                      {formatTime(projectData.video.duration)} • {Math.round(projectData.video.size / 1024 / 1024)}MB
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-surface-900/50 text-center">
                    <div className="text-surface-400">Resolution</div>
                    <div className="text-white font-medium">{projectData.video.width}×{projectData.video.height}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-900/50 text-center">
                    <div className="text-surface-400">Duration</div>
                    <div className="text-white font-medium">{projectData.video.duration.toFixed(1)}s</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (window.confirm('Remove this video and all edits? This can be undone with Ctrl+Z.')) {
                      videoActions.removeVideo();
                    }
                  }}
                  className="w-full btn-secondary text-sm py-2"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Remove Video
                </button>

                {/* Background Music Upload */}
                <div className="pt-2 border-t border-surface-800/30">
                  <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                    Background Music
                  </h4>
                  <p className="text-[10px] text-surface-500 mb-2 leading-relaxed">
                    Add MP3, WAV, or other audio files to mix with your video.
                  </p>
                  <label className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border-2 border-dashed border-surface-700/50 bg-surface-900/50 hover:border-surface-600/50 hover:bg-surface-800/50 cursor-pointer transition-all text-xs text-surface-400 hover:text-surface-200">
                    <Music className="w-4 h-4" />
                    {audioFiles.length > 0 ? `+ Add Another (${audioFiles.length} loaded)` : 'Choose Audio File'}
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAudioSelect(file).catch(console.error);
                        e.target.value = '';
                      }}
                    />
                  </label>

                  {/* Loaded audio files */}
                  {audioFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {audioFiles.map((af, i) => (
                        <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-900/50">
                          <Music className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="text-[10px] text-white truncate flex-1">{af.name}</span>
                          <span className="text-[10px] text-surface-500">{af.duration.toFixed(1)}s</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <VideoUploader onVideoSelect={handleVideoSelect} />
            )}
          </div>
        )}

        {activeTab === 'crop' && projectData.video && (
          <VideoCropper
            videoSrc={projectData.video.url}
            cropRegion={projectData.cropRegion}
            onCropChange={(region) => cropActions.setCropRegion(region)}
            videoWidth={projectData.video.width}
            videoHeight={projectData.video.height}
          />
        )}

        {activeTab === 'voice' && projectData.video && (
          <div className="p-4 space-y-3">
            <button
              onClick={() => setVoiceoverStudioOpen(true)}
              className="w-full btn-primary text-sm py-2.5"
            >
              <Mic className="w-4 h-4 mr-2" />
              Open Voiceover Studio
            </button>
            <p className="text-[10px] text-surface-500 text-center leading-relaxed">
              Record narration with voice effects — pitch, gender presets, reverb, and more
            </p>
          </div>
        )}

        {activeTab === 'quality' && (
          <QualitySettingsPanel
            settings={projectData.qualitySettings}
            onChange={(settings) => qualityActions.setQualitySettings(settings)}
            onUpdate={(key, value) => qualityActions.updateQualitySetting(key, value)}
          />
        )}

        {activeTab === 'tracks' && (
          <TracksPanel
            tracks={projectData.tracks}
            onRenameTrack={(trackId, name) => trackActions.renameTrack(trackId, name)}
            onToggleMute={(trackId) => trackActions.toggleMute(trackId)}
            onSetVolume={(trackId, volume) => trackActions.setTrackVolume(trackId, volume)}
            onAddTrack={(type) => trackActions.addTrack(type)}
            onRemoveTrack={(trackId) => trackActions.removeTrack(trackId)}
            onReorderTracks={(from, to) => trackActions.reorderTracks(from, to)}
            onSetClipSpeed={(trackId, clipId, speed) => trackActions.updateClip(trackId, clipId, { speed })}
          />
        )}

        {activeTab === 'adjust' && projectData.video && (
          <ColorAdjustmentPanel
            adjustments={projectData.colorAdjustments}
            onUpdate={(key, value) => colorActions.updateColorAdjustment(key, value)}
          />
        )}

        {activeTab === 'captions' && projectData.video && (
          <AutoCaptionsPanel
            duration={duration || projectData.video?.duration || 0}
            currentTime={currentTime}
            onAddCaption={(o) => textActions.addTextOverlay(o)}
            existingOverlays={projectData.textOverlays || []}
          />
        )}

        {activeTab === 'stickers' && projectData.video && (
          <StickerPanel
            stickers={projectData.stickers || []}
            duration={duration || projectData.video?.duration || 0}
            currentTime={currentTime}
            onAdd={(s) => stickerActions.addSticker(s)}
            onUpdate={(id, u) => stickerActions.updateSticker(id, u)}
            onRemove={(id) => stickerActions.removeSticker(id)}
          />
        )}

        {activeTab === 'transitions' && (
          <TransitionPanel
            tracks={projectData.tracks}
            onSetClipTransitionIn={(trackId, clipId, config) => trackActions.setClipTransitionIn(trackId, clipId, config)}
            onSetClipTransitionOut={(trackId, clipId, config) => trackActions.setClipTransitionOut(trackId, clipId, config)}
          />
        )}

        {activeTab === 'text' && projectData.video && (
          <TextOverlayPanel
            textOverlays={projectData.textOverlays || []}
            duration={duration || projectData.video?.duration || 0}
            currentTime={currentTime}
            onAdd={(o) => textActions.addTextOverlay(o)}
            onUpdate={(id, u) => textActions.updateTextOverlay(id, u)}
            onRemove={(id) => textActions.removeTextOverlay(id)}
          />
        )}

        {activeTab === 'animate' && (
          <div className="p-4">
            {(() => {
              const videoTrack = projectData.tracks.find((t) => t.type === 'video');
              const clips = videoTrack?.clips || [];
              const selectedClip = clips.find((c) => c.id === animateClipId) || clips[0];

              if (clips.length === 0) {
                return (
                  <div className="p-4 rounded-xl bg-surface-900/50 border border-surface-800/50 text-center">
                    <p className="text-surface-500 text-xs">No video clip to animate</p>
                  </div>
                );
              }

              const kfs = selectedClip.keyframes || [];

              return (
                <div className="space-y-3">
                  {/* Clip selector */}
                  <div className="flex flex-wrap gap-1">
                    {clips.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setAnimateClipId(c.id)}
                        className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                          (selectedClip.id === c.id)
                            ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                            : 'bg-surface-900/50 text-surface-400 border border-surface-800/50 hover:border-surface-600'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-surface-400">
                    <span className="font-medium text-white">{selectedClip.name}</span>
                    <span>—</span>
                    <span>{selectedClip.duration.toFixed(1)}s</span>
                    <span className="px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-300 text-[10px]">
                      {kfs.length} keyframe{kfs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {videoTrack && (
                    <KeyframeEditor
                      keyframes={kfs}
                      clipDuration={selectedClip.duration}
                      currentTime={currentTime}
                      clipOffset={selectedClip.offset}
                      onAddKeyframe={(time) => trackActions.addKeyframe(videoTrack.id, selectedClip.id, time)}
                      onUpdateKeyframe={(id, updates) => trackActions.updateKeyframe(videoTrack.id, selectedClip.id, id, updates)}
                      onRemoveKeyframe={(id) => trackActions.removeKeyframe(videoTrack.id, selectedClip.id, id)}
                    />
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Empty states for tabs when no video */}
        {activeTab !== 'media' && !projectData.video && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 mb-3 mx-auto text-surface-400">{tabs.find((t) => t.id === activeTab)?.icon}</div>
            <p className="text-surface-500 text-sm">
              Upload a video to use this feature
            </p>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <Header
        transparent={false}
        rightContent={
          <>
            {/* Undo/Redo */}
            <button
              onClick={() => undoActions.undo()}
              disabled={!canUndo}
              className="p-2 text-surface-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-surface-800/50 transition-all"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => undoActions.redo()}
              disabled={!canRedo}
              className="p-2 text-surface-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-surface-800/50 transition-all"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            {projectData.video && (
              <>
                {/* Save */}
                <button
                  onClick={handleSave}
                  className="p-2 text-surface-500 hover:text-white rounded-lg hover:bg-surface-800/50 transition-all"
                  title="Save"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                </button>
                {lastSaved && (
                  <span className="text-[10px] text-emerald-500/60 hidden lg:flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                    Saved
                  </span>
                )}
                {/* Reset */}
                <button
                  onClick={() => projectActions.resetAll()}
                  className="p-2 text-surface-500 hover:text-red-400 rounded-lg hover:bg-surface-800/50 transition-all"
                  title="Reset all edits"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}
            <span className="text-sm text-surface-400 hidden sm:block">
              {projectData.video ? projectData.video.name : 'No video'}
            </span>
            {projectData.video && (
              <button onClick={() => setShowExport(true)} className="btn-primary text-sm px-4 py-2">
                <Download className="w-4 h-4 mr-1.5" />
                Export
              </button>
            )}
          </>
        }
      />

      {/* Loading overlay */}
      {(uploadLoading || exportLoading) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center px-6">
            <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">{loadingMessage}</p>
          </div>
        </div>
      )}

      <div className={`flex flex-col flex-1 ${isMobile ? 'pt-16' : 'pt-16'}`}>
        {/* Main editor area */}
        <div className="flex-1 flex min-h-0">
          {/* Sidebar - desktop & tablet */}
          {!isMobile && (
            <>
              {/* Vertical icon rail */}
              <div className={`flex-shrink-0 bg-surface-950/50 border-r border-surface-800/50 overflow-x-visible overflow-y-auto ${
                isTablet ? 'w-14' : 'w-14'
              }`}>
                <div className="flex flex-col py-1">
                  {tabs.map((tab) => (
                    <div key={tab.id} className="relative group">
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        title={tab.title}
                        className={`relative flex items-center justify-center w-full h-11 transition-all duration-200 ${
                          activeTab === tab.id
                            ? 'text-primary-300 bg-primary-500/5'
                            : 'text-surface-500 hover:text-surface-300 hover:bg-surface-900/50'
                        }`}
                      >
                        <div className="w-5 h-5">{tab.icon}</div>
                        {activeTab === tab.id && (
                          <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary-500 rounded-full" />
                        )}
                      </button>
                      {/* Hover label */}
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 rounded-lg bg-surface-800 border border-surface-700/50 text-xs text-white font-medium whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none z-50 shadow-xl">
                        {tab.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Tab content panel */}
              <div className={`flex-shrink-0 bg-surface-950/50 border-r border-surface-800/50 overflow-y-auto ${
                isTablet ? 'w-48' : 'w-64 lg:w-72'
              }`}>
                {renderTabContent()}
              </div>
            </>
          )}

          {/* Center - Video Preview */}
          <div className="flex-1 flex flex-col min-w-0 bg-black/20">
            {/* Player */}
            <div className="flex-1 flex items-center justify-center p-2 sm:p-4 lg:p-6">
              <div className="w-full max-w-4xl">
                {voiceoverStudioOpen && projectData.video ? (
                  <VoiceoverStudio
                    videoSrc={projectData.video.url}
                    currentTime={currentTime}
                    onBack={() => setVoiceoverStudioOpen(false)}
                    onSave={(track) => {
                      voiceoverActions.addVoiceover(track);
                      setVoiceoverStudioOpen(false);
                    }}
                    existingCount={projectData.voiceoverTracks.length}
                  />
                ) : projectData.video ? (
                  <VideoPlayer
                    src={projectData.video.url}
                    onTimeUpdate={handleTimeUpdate}
                    onDuration={handleDuration}
                    onPlayStateChange={setIsPlaying}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    seekTo={seekTo}
                    onSeekDone={handleSeekDone}
                    textOverlays={projectData.textOverlays || []}
                    videoWidth={projectData.video.width}
                    videoHeight={projectData.video.height}
                    cropRegion={projectData.cropRegion}
                    trimRange={projectData.trimRange}
                    playbackSpeed={firstClip?.speed || 1}
                    keyframes={firstClip?.keyframes && firstClip.keyframes.length >= 2 ? firstClip.keyframes : undefined}
                    clipOffset={firstClip?.offset || 0}
                    videoClips={previewClips.length > 1 ? previewClips : undefined}
                    voiceoverTracks={projectData.voiceoverTracks}
                    colorAdjustments={projectData.colorAdjustments}
                    audioTrackClips={projectData.tracks
                      .filter((t) => t.type === 'audio')
                      .flatMap((t) =>
                        t.clips
                          .filter((c) => c.blobUrl)
                          .map((c) => ({
                            blobUrl: c.blobUrl!,
                            offset: c.offset,
                            volume: c.volume,
                            duration: c.duration,
                          }))
                      )}
                  />
                ) : (
                  <div className="aspect-video rounded-xl bg-surface-900/30 border border-surface-800/30 flex items-center justify-center">
                    <div className="text-center px-4">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-surface-800/50 mx-auto mb-4 flex items-center justify-center">
                        <Film className="w-8 h-8 sm:w-10 sm:h-10 text-surface-600" />
                      </div>
                      <p className="text-surface-500 text-base sm:text-lg font-medium mb-2">No video loaded</p>
                      <p className="text-surface-600 text-sm">{isMobile ? 'Tap the tabs below to upload' : 'Click Media tab to upload a video'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            {projectData.video && (
              <div className="border-t border-surface-800/50 bg-surface-950/30">
                <Timeline
                  duration={duration}
                  currentTime={currentTime}
                  tracks={projectData.tracks}
                  trimStart={projectData.trimRange.start}
                  trimEnd={projectData.trimRange.end}
                  onTrimStartChange={(time) =>
                    trimActions.setTrimRange({ ...projectData.trimRange, start: time })
                  }
                  onTrimEndChange={(time) =>
                    trimActions.setTrimRange({ ...projectData.trimRange, end: time })
                  }
                  onSeek={handleSeek}
                  onToggleMute={(trackId) => trackActions.toggleMute(trackId)}
                  onReorderTracks={(from, to) => trackActions.reorderTracks(from, to)}
                  onMoveClip={(trackId, clipId, newOffset) => trackActions.moveClip(trackId, clipId, newOffset)}
                  onMoveClipToTrack={(fromTrackId, toTrackId, clipId, newOffset) => trackActions.moveClipToTrack(fromTrackId, toTrackId, clipId, newOffset)}
                  onSplitClip={(trackId, clipId, splitTime) => trackActions.splitClip(trackId, clipId, splitTime)}
                  onDuplicateClip={(trackId, clipId) => trackActions.duplicateClip(trackId, clipId)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Bottom tab navigation */}
      {isMobile && (
        <>
          {/* Mobile tab bar — core tabs + More */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-950/95 backdrop-blur-xl border-t border-surface-800/50 safe-area-bottom">
            <div className="flex">
              {tabs.slice(0, 4).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  title={tab.title}
                  className={`flex-1 py-2 text-[10px] font-medium transition-all duration-200 relative ${
                    activeTab === tab.id
                      ? 'text-primary-300'
                      : 'text-surface-500 hover:text-surface-300'
                  }`}
                >
                  <div className="w-5 h-5 mb-0.5 mx-auto">{tab.icon}</div>
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute top-0 left-4 right-4 h-0.5 bg-primary-500 rounded-full" />
                  )}
                </button>
              ))}
              {/* More button */}
              <button
                onClick={() => setMobileMoreOpen(true)}
                className={`flex-1 py-2 text-[10px] font-medium transition-all duration-200 ${
                  tabs.slice(4).some((t) => t.id === activeTab)
                    ? 'text-primary-300'
                    : 'text-surface-500 hover:text-surface-300'
                }`}
              >
                <div className="w-5 h-5 mb-0.5 mx-auto flex items-center justify-center">
                  <ChevronRight className="w-4 h-4" />
                </div>
                More
              </button>
            </div>
          </div>

          {/* Mobile: Slide-up panel for active tab */}
          {showPanel && (
            <div className="fixed inset-0 z-30 flex flex-col pointer-events-none">
              <div
                className="flex-1 bg-black/40 backdrop-blur-sm pointer-events-auto"
                onClick={() => setShowPanel(false)}
              />
              <div className="bg-surface-950 border-t border-surface-800/50 rounded-t-2xl pointer-events-auto max-h-[60vh] overflow-y-auto animate-slide-up">
                <div className="flex items-center justify-between p-4 border-b border-surface-800/50 sticky top-0 bg-surface-950/95 backdrop-blur-xl z-10">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5">{tabs.find(t => t.id === activeTab)?.icon}</span>
                    <span className="text-sm font-semibold text-white">{tabs.find(t => t.id === activeTab)?.label}</span>
                  </div>
                  <button
                    onClick={() => setShowPanel(false)}
                    className="p-2 text-surface-500 hover:text-white rounded-lg hover:bg-surface-800 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {renderTabContent()}
              </div>
            </div>
          )}

          {/* Mobile: More tools grid */}
          {mobileMoreOpen && (
            <div className="fixed inset-0 z-50 flex flex-col pointer-events-none">
              <div
                className="flex-1 bg-black/40 backdrop-blur-sm pointer-events-auto"
                onClick={() => setMobileMoreOpen(false)}
              />
              <div className="bg-surface-950 border-t border-surface-800/50 rounded-t-2xl pointer-events-auto animate-slide-up">
                <div className="flex items-center justify-between p-4 border-b border-surface-800/50 sticky top-0 bg-surface-950/95 backdrop-blur-xl z-10">
                  <h3 className="text-sm font-semibold text-white">More Tools</h3>
                  <button
                    onClick={() => setMobileMoreOpen(false)}
                    className="p-2 text-surface-500 hover:text-white rounded-lg hover:bg-surface-800 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 p-4">
                  {tabs.slice(4).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setMobileMoreOpen(false);
                        handleTabChange(tab.id);
                      }}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                        activeTab === tab.id
                          ? 'bg-primary-500/10 text-primary-300 border border-primary-500/20'
                          : 'bg-surface-900/50 text-surface-400 border border-surface-800/40 hover:border-surface-600'
                      }`}
                    >
                      <div className="w-6 h-6">{tab.icon}</div>
                      <span className="text-[10px] font-medium">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Keyboard shortcut hint - bottom right */}
      {projectData.video && (
        <button
          onClick={() => setShowShortcutsHelp(true)}
          className={`fixed right-4 z-30 w-10 h-10 rounded-xl bg-surface-800/80 border border-surface-700/50 backdrop-blur-sm flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-700/80 transition-all shadow-lg group ${
            isMobile ? 'bottom-20' : 'bottom-4'
          }`}
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard className="w-5 h-5" />
          <span className="tooltip">Keyboard Shortcuts (<kbd className="ml-1 px-1 py-0.5 rounded bg-surface-700 text-[10px]">?</kbd>)</span>
        </button>
      )}

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExport}
        onClose={() => {
          setShowExport(false);
          if (exportProgress?.stage === 'complete' && exportProgress.outputUrl) {
            URL.revokeObjectURL(exportProgress.outputUrl);
          }
          exportActions.setExportProgress(null);
        }}
        onExport={handleExport}
        onFastExport={handleFastExport}
        exportProgress={exportProgress}
        isMobile={isMobile}
      />
    </div>
  );
}
