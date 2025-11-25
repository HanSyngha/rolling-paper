import React, { useState } from 'react';
import { Message, GROUPS } from '../types';
import { backend } from '../services/backend';

interface MessageListProps {
  messages: Message[];
  onLike: (id: string) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, onLike, onEdit, onDelete }) => {
  // 비공개 메시지 내용 표시 상태 (메시지 ID -> 내용)
  const [revealedContents, setRevealedContents] = useState<Record<string, string>>({});
  // 비밀번호 입력 모달 상태
  const [passwordModal, setPasswordModal] = useState<{ messageId: string; password: string; error: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // 비공개 메시지 내용 보기 핸들러
  const handleRevealContent = async () => {
    if (!passwordModal) return;

    setIsVerifying(true);
    try {
      const content = await backend.getPrivateContent(passwordModal.messageId, passwordModal.password);
      if (content !== null) {
        setRevealedContents(prev => ({ ...prev, [passwordModal.messageId]: content }));
        setPasswordModal(null);
      } else {
        setPasswordModal({ ...passwordModal, error: '비밀번호가 일치하지 않습니다.' });
      }
    } catch (error) {
      setPasswordModal({ ...passwordModal, error: '오류가 발생했습니다.' });
    } finally {
      setIsVerifying(false);
    }
  };

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
                {/* 비공개 배지 */}
                {msg.isPrivate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                    <span className="material-symbols-outlined text-xs">lock</span>
                    비공개
                  </span>
                )}
              </div>

              {/* Message Content */}
              {msg.isPrivate && !revealedContents[msg.id] ? (
                // 비공개 메시지 - 내용 숨김
                <div className="flex-1 mb-6">
                  <div className="flex flex-col items-center justify-center py-6 px-4 bg-purple-50 rounded-lg border border-purple-100">
                    <span className="material-symbols-outlined text-3xl text-purple-400 mb-2">visibility_off</span>
                    <p className="text-purple-600 font-medium mb-3">비공개 글입니다</p>
                    <button
                      onClick={() => setPasswordModal({ messageId: msg.id, password: '', error: '' })}
                      className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">key</span>
                      내용 보기
                    </button>
                  </div>
                </div>
              ) : (
                // 공개 메시지 또는 이미 공개된 비공개 메시지
                <p className="text-text-main text-base font-medium leading-relaxed mb-6 flex-1 whitespace-pre-line">
                  {revealedContents[msg.id] || msg.content}
                </p>
              )}

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

      {/* 비밀번호 입력 모달 */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setPasswordModal(null)}
          ></div>

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl text-purple-600">lock</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">비공개 메시지</h3>
                <p className="text-sm text-gray-500">비밀번호를 입력해주세요</p>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleRevealContent(); }}>
              <input
                type="password"
                value={passwordModal.password}
                onChange={(e) => setPasswordModal({ ...passwordModal, password: e.target.value, error: '' })}
                placeholder="비밀번호"
                autoFocus
                className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 bg-white transition-all outline-none mb-3"
              />

              {passwordModal.error && (
                <p className="text-red-500 text-sm mb-3">{passwordModal.error}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPasswordModal(null)}
                  className="flex-1 h-11 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || !passwordModal.password}
                  className="flex-1 h-11 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                      확인 중...
                    </>
                  ) : (
                    '확인'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;