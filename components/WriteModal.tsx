import React, { useState } from 'react';
import { GROUPS, GroupId, Message } from '../types';
import { mockBackend } from '../services/mockBackend';

interface WriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedGroup: GroupId | 'all';
}

const WriteModal: React.FC<WriteModalProps> = ({ isOpen, onClose, preSelectedGroup }) => {
  const [author, setAuthor] = useState('');
  const [group, setGroup] = useState<GroupId | ''>(preSelectedGroup !== 'all' ? preSelectedGroup : '');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author || !group || !content) return;

    setIsSubmitting(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      author,
      group: group as GroupId,
      content,
      timestamp: Date.now(),
      likes: 0
    };

    mockBackend.addMessage(newMessage);
    
    // Reset and close
    setAuthor('');
    setContent('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-bg-light rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-light flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-bold text-primary">마음 전하기</h2>
            <p className="text-sm text-text-sub">팀장님께 따뜻한 메시지를 남겨주세요.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="write-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-base font-medium text-text-main">이름</label>
                <input
                  id="name"
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="이름을 입력하세요"
                  className="w-full h-14 px-4 rounded-lg border border-border-light focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white transition-all outline-none"
                />
              </div>

              {/* Group Select */}
              <div className="flex flex-col gap-2">
                <label htmlFor="group" className="text-base font-medium text-text-main">소속</label>
                <div className="relative">
                  <select
                    id="group"
                    required
                    value={group}
                    onChange={(e) => setGroup(e.target.value as GroupId)}
                    className="w-full h-14 px-4 pr-10 rounded-lg border border-border-light focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white appearance-none transition-all outline-none bg-none"
                  >
                    <option value="" disabled>소속 그룹을 선택하세요</option>
                    {GROUPS.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <span className="material-symbols-outlined">expand_more</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex flex-col gap-2">
              <label htmlFor="message" className="text-base font-medium text-text-main flex justify-between">
                <span>따뜻한 메시지</span>
                <span className={`text-sm ${content.length > 500 ? 'text-red-500' : 'text-text-sub'}`}>
                  {content.length}/500
                </span>
              </label>
              <textarea
                id="message"
                required
                maxLength={500}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="팀장님께 전하고 싶은 마음을 여기에 적어주세요."
                className="w-full min-h-[160px] p-4 rounded-lg border border-border-light focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white resize-none transition-all outline-none"
              ></textarea>
            </div>

          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white border-t border-border-light">
          <button 
            form="write-form"
            type="submit"
            disabled={isSubmitting}
            className={`w-full h-14 rounded-lg font-bold text-lg text-white flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all ${
              isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-light active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                전송 중...
              </>
            ) : (
              '마음 전달하기'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default WriteModal;