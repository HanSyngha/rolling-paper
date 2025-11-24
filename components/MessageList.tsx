import React from 'react';
import { Message, GROUPS } from '../types';

interface MessageListProps {
  messages: Message[];
  onLike: (id: string) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onLike, onEdit, onDelete }) => {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
           <span className="material-symbols-outlined text-4xl text-gray-400">rate_review</span>
        </div>
        <h3 className="text-xl font-bold text-gray-700 mb-2">아직 메시지가 없네요</h3>
        <p className="text-gray-500">첫 번째 응원의 주인공이 되어보세요!</p>
      </div>
    );
  }

  // Helper to format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
      {messages.map((msg) => {
        const groupInfo = GROUPS.find(g => g.id === msg.group);
        return (
          <div 
            key={msg.id}
            className="group flex flex-col bg-white rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-border-light overflow-hidden animate-slide-up"
          >
            <div className="p-5 flex flex-col flex-1">
              {/* Group Badge */}
              <div className="mb-3 flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${groupInfo?.color.replace('bg-', 'bg-') || 'bg-gray-400'}`}></span>
                <span className="text-xs font-semibold text-text-sub uppercase tracking-wider">
                  {groupInfo?.name || 'Unknown Group'}
                </span>
              </div>

              {/* Message Content */}
              <p className="text-text-main text-base font-medium leading-relaxed mb-6 flex-1 whitespace-pre-line">
                {msg.content}
              </p>

              {/* Footer: Author & Date */}
              <div className="flex items-end justify-between mt-auto pt-4 border-t border-gray-100">
                <div>
                  <p className="text-text-main font-bold text-sm mb-0.5">{msg.author} <span className="text-gray-400 font-normal">드림</span></p>
                  <p className="text-text-sub text-xs">{formatDate(msg.timestamp)}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  {/* Edit Button */}
                  <button
                    onClick={() => onEdit(msg)}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="수정하기"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => onDelete(msg)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="삭제하기"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>

                  {/* Like Button */}
                  <button
                    onClick={() => onLike(msg.id)}
                    className="p-1.5 flex items-center gap-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="좋아요"
                  >
                    <span className={`material-symbols-outlined text-base ${msg.likes > 0 ? 'fill-current text-red-500' : ''}`}>favorite</span>
                    {msg.likes > 0 && <span className="text-xs font-medium">{msg.likes}</span>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;