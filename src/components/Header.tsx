import { Link } from 'react-router-dom';
import { useIsMobile } from '../hooks/useMediaQuery';
import { LogoPlay } from './Icons';

interface HeaderProps {
  transparent?: boolean;
  rightContent?: React.ReactNode;
}

export function Header({ transparent = false, rightContent }: HeaderProps) {
  const isMobile = useIsMobile();

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 ${
        transparent
          ? 'bg-transparent'
          : 'bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-surface-800/50'
      }`}
    >
      <div className={`max-w-7xl mx-auto ${isMobile ? 'px-4 h-14' : 'px-6 h-16'} flex items-center justify-between`}>
        <Link to="/" className="flex items-center gap-2 group">
          <div className={`rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform ${
            isMobile ? 'w-7 h-7' : 'w-8 h-8'
          }`}>
            <LogoPlay className={`text-white ${isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
          </div>
          <span className={`font-bold text-white ${isMobile ? 'text-base' : 'text-lg'}`}>
            free<span className="text-orange-400">Dom</span> Editor
          </span>
        </Link>

        {rightContent && (
          <div className="flex items-center gap-2 sm:gap-3">{rightContent}</div>
        )}
      </div>
    </header>
  );
}
