import React from 'react';

interface HeaderProps {
  onDownload?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onDownload }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border-light shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-accent/20 p-2 rounded-lg text-primary">
            <span className="material-symbols-outlined">diversity_1</span>
          </div>
          <h1 className="text-lg md:text-xl font-bold text-primary tracking-tight">
            To. 최선일 팀장님
          </h1>
        </div>

        <div className="flex items-center gap-3">
            {onDownload && (
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                title="TXT 파일 다운로드"
              >
                <span className="material-symbols-outlined text-base">download</span>
                <span className="hidden md:inline text-sm font-medium">다운로드</span>
              </button>
            )}
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                LIVE
            </span>
            <div className="text-right">
                <p className="text-xs text-text-sub">From.</p>
                <p className="text-sm font-bold text-primary">All Team Members</p>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;