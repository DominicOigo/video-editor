import { X } from './Icons';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Playback',
    shortcuts: [
      { keys: 'Space / K', description: 'Play / Pause' },
      { keys: '← →', description: 'Step backward / forward 1 frame' },
      { keys: 'Shift + ← →', description: 'Jump backward / forward 5 seconds' },
      { keys: 'J', description: 'Step backward 1 frame' },
      { keys: 'L', description: 'Step forward 1 frame' },
    ],
  },
  {
    title: 'Editing',
    shortcuts: [
      { keys: 'I', description: 'Set trim in point (start)' },
      { keys: 'O', description: 'Set trim out point (end)' },
    ],
  },
  {
    title: 'Recording',
    shortcuts: [
      { keys: 'R', description: 'Toggle voiceover recording' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: '1 – 4', description: 'Switch first 4 tabs' },
      { keys: 'E', description: 'Open / Close export dialog' },
      { keys: 'Esc', description: 'Close panel or dialog' },
      { keys: '?', description: 'Toggle this help overlay' },
    ],
  },
];

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="max-w-lg w-full mx-4 bg-surface-900 border border-surface-800/50 rounded-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-800/50">
          <div>
            <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
            <p className="text-sm text-surface-400 mt-0.5">
              Master the editor with quick keybindings
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-surface-500 hover:text-white rounded-lg hover:bg-surface-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts groups */}
        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.keys}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-surface-300">{shortcut.description}</span>
                    <span className="inline-flex items-center gap-1">
                      {shortcut.keys.split(' ').map((part, i) => {
                        // Check if it's a key name or a modifier/separator
                        const isModifier = part === 'Shift' || part === 'Ctrl' || part === 'Alt';
                        const isPlus = part === '+';
                        const isArrow = part === '←' || part === '→';
                        if (isPlus) {
                          return <span key={i} className="text-surface-600 text-xs mx-0.5">+</span>;
                        }
                        if (part === '/' || part === '–') {
                          return <span key={i} className="text-surface-600 text-xs mx-0.5">{part}</span>;
                        }
                        // Arrow keys with special style
                        if (isArrow) {
                          return (
                            <kbd
                              key={i}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-surface-800 text-surface-200 text-xs font-mono border border-surface-700/50"
                            >
                              {part}
                            </kbd>
                          );
                        }
                        // Regular key + modifiers
                        return (
                          <kbd
                            key={i}
                            className={`inline-flex items-center px-2 h-7 rounded-lg text-xs font-mono border ${
                              isModifier
                                ? 'bg-surface-800/50 text-surface-400 border-surface-700/30'
                                : 'bg-surface-800 text-surface-200 border-surface-700/50'
                            }`}
                          >
                            {part}
                          </kbd>
                        );
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-surface-950/50 border-t border-surface-800/50">
          <p className="text-xs text-surface-500 text-center">
            Press <kbd className="inline-flex items-center px-1.5 h-5 rounded bg-surface-800 text-surface-300 text-xs font-mono border border-surface-700/50">?</kbd> anywhere to toggle this overlay
          </p>
        </div>
      </div>
    </div>
  );
}
