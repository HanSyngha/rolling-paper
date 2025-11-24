import React from 'react';

const Header: React.FC = () => {
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