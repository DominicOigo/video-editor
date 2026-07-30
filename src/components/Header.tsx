import { Link } from 'react-router-dom';

interface HeaderProps {
  transparent?: boolean;
  rightContent?: React.ReactNode;
}

export function Header({ transparent = false, rightContent }: HeaderProps) {
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 ${
        transparent
          ? 'bg-transparent'
          : 'bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-surface-800/50'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-bold text-white tracking-tight">
            FreeVid Editor
          </span>
        </Link>

        {rightContent && (
          <div className="flex items-center gap-2 sm:gap-3">{rightContent}</div>
        )}
      </div>
    </header>
  );
}
