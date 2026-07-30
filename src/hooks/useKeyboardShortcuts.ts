import { useEffect, useCallback, useRef, useState } from 'react';

export interface KeyboardShortcutHandlers {
  // Playback
  togglePlay: () => void;
  stepFrame: (direction: 1 | -1) => void;
  seekBig: (direction: 1 | -1) => void;

  // Trim
  setTrimIn: () => void;
  setTrimOut: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;

  // Recording
  toggleRecording?: () => void;

  // Navigation
  openExport: () => void;
  closePanel: () => void;
  closeExport: () => void;
  showExport: boolean;

  // Tab cycling
  setActiveTab: (tabIndex: number) => void;
  activeTabIndex: number;
  totalTabs: number;

  // Misc
  deleteSelected?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Keep handlers in a ref to avoid stale closures without re-registering the listener
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInputFocused =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable;

    // Allow typing in inputs/textareas/editable elements
    if (isInputFocused) {
      if (e.key === 'Escape') {
        (target as HTMLElement).blur();
        e.preventDefault();
      }
      return;
    }

    const h = handlersRef.current;

    switch (e.key.toLowerCase()) {
      // Playback
      case ' ':
        e.preventDefault();
        h.togglePlay();
        break;

      case 'k':
        e.preventDefault();
        h.togglePlay();
        break;

      case 'j':
        e.preventDefault();
        h.stepFrame(-1);
        break;

      case 'l':
        e.preventDefault();
        h.stepFrame(1);
        break;

      // Frame stepping
      case 'arrowleft':
        e.preventDefault();
        if (e.shiftKey) {
          h.seekBig(-1);
        } else {
          h.stepFrame(-1);
        }
        break;

      case 'arrowright':
        e.preventDefault();
        if (e.shiftKey) {
          h.seekBig(1);
        } else {
          h.stepFrame(1);
        }
        break;

      // Trim in/out
      case 'i':
        e.preventDefault();
        h.setTrimIn();
        break;

      case 'o':
        e.preventDefault();
        h.setTrimOut();
        break;

      // Recording
      case 'r':
        if (h.toggleRecording) {
          e.preventDefault();
          h.toggleRecording();
        }
        break;

      // Export
      case 'e':
        e.preventDefault();
        if (h.showExport) {
          h.closeExport();
        } else {
          h.openExport();
        }
        break;

      // Tab navigation
      case '1':
      case '2':
      case '3':
      case '4': {
        const tabIdx = parseInt(e.key) - 1;
        if (tabIdx < h.totalTabs) {
          e.preventDefault();
          h.setActiveTab(tabIdx);
        }
        break;
      }

      // Close panels
      case 'escape':
        e.preventDefault();
        if (h.showExport) {
          h.closeExport();
        } else {
          h.closePanel();
        }
        break;

      // Help
      case '?':
        if (!e.shiftKey) break;
        e.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
        break;

      // Undo/Redo
      case 'z':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (e.shiftKey) {
            h.redo();
          } else {
            h.undo();
          }
        }
        break;

      // Delete
      case 'delete':
      case 'backspace':
        if (h.deleteSelected) {
          e.preventDefault();
          h.deleteSelected();
        }
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    showShortcutsHelp,
    setShowShortcutsHelp,
  };
}
