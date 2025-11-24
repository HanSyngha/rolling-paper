import React, { useEffect, useState, useMemo } from 'react';
import Header from './components/Header';
import GroupSelector from './components/GroupSelector';
import MessageList from './components/MessageList';
import WriteModal from './components/WriteModal';
import { mockBackend } from './services/mockBackend';
import { Message, GroupId } from './types';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupId | 'all'>('all');
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to real-time updates (Local Storage Events)
  useEffect(() => {
    setIsLoading(true);
    // Mimic initial fetch delay
    setTimeout(() => {
        const unsubscribe = mockBackend.subscribe((updatedMessages) => {
            setMessages(updatedMessages);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, 500);
  }, []);

  const handleLike = (id: string) => {
    mockBackend.likeMessage(id);
  };

  const filteredMessages = useMemo(() => {
    if (selectedGroup === 'all') return messages;
    return messages.filter(m => m.group === selectedGroup);
  }, [messages, selectedGroup]);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-5xl font-black text-primary mb-4 tracking-tight">
            우리들의 마음을 전해요
          </h2>
          <p className="text-text-sub text-lg max-w-2xl mx-auto leading-relaxed">
            최선일 팀장님의 새로운 시작을 응원하며<br />
            각 그룹에서 감사의 마음을 담아 메시지를 남겼습니다.
          </p>
        </div>

        {/* Group Filter */}
        <GroupSelector 
          selectedGroup={selectedGroup} 
          onSelect={setSelectedGroup} 
        />

        {/* Content Area */}
        {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-64 bg-white rounded-xl shadow-sm border border-gray-100 animate-pulse">
                        <div className="h-40 bg-gray-200 w-full"></div>
                        <div className="p-4 space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="relative min-h-[400px]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-700">
                        {selectedGroup === 'all' 
                            ? `전체 메시지 (${messages.length})` 
                            : `${selectedGroup.toUpperCase()} 그룹 메시지 (${filteredMessages.length})`
                        }
                    </h3>
                </div>
                <MessageList 
                    messages={filteredMessages} 
                    onLike={handleLike} 
                />
            </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-30">
        <button 
          onClick={() => setIsWriteModalOpen(true)}
          className="flex items-center gap-3 px-6 h-16 rounded-full bg-primary text-white shadow-lg hover:shadow-2xl hover:bg-primary-light transition-all transform hover:-translate-y-1 active:scale-95 group"
        >
          <span className="material-symbols-outlined text-3xl group-hover:rotate-12 transition-transform">edit_note</span>
          <span className="text-lg font-bold pr-1">메시지 남기기</span>
        </button>
      </div>

      {/* Write Modal */}
      <WriteModal 
        isOpen={isWriteModalOpen} 
        onClose={() => setIsWriteModalOpen(false)}
        preSelectedGroup={selectedGroup}
      />

      <footer className="bg-white border-t border-border-light py-8 text-center mt-auto">
        <p className="text-text-sub text-sm">
            © 2025 Design Technology Team. All rights reserved.<br/>
            To Team Leader Choi Seon-il: Expressing Respect and Gratitude
        </p>
      </footer>
    </div>
  );
}

export default App;