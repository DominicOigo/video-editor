import { useCallback, useRef, useState } from 'react';
import { Upload } from './Icons';

interface VideoUploaderProps {
  onVideoSelect: (file: File) => void;
}

export function VideoUploader({ onVideoSelect }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('video/')) return;
      onVideoSelect(file);
    },
    [onVideoSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => inputRef.current?.click();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="p-4">
      <button
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`w-full aspect-video rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-3 cursor-pointer group ${
          isDragging
            ? 'border-primary-500 bg-primary-500/10 scale-[1.02]'
            : 'border-surface-700/50 bg-surface-900/50 hover:border-surface-600/50 hover:bg-surface-800/50'
        }`}
      >
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
          isDragging
            ? 'bg-primary-500/20 scale-110'
            : 'bg-surface-800 group-hover:bg-surface-700'
        }`}>
          <Upload className={`w-7 h-7 transition-colors ${
            isDragging ? 'text-primary-400' : 'text-surface-400'
          }`} />
        </div>
        <div className="text-center">
          <p className={`text-sm font-medium transition-colors ${
            isDragging ? 'text-primary-300' : 'text-surface-300'
          }`}>
            {isDragging ? 'Drop your video here' : 'Drop video or click to browse'}
          </p>
          <p className="text-xs text-surface-500 mt-1">
            MP4, WebM, MOV, AVI — any format
          </p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
