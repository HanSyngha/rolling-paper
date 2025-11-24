import React, { useState, useEffect } from 'react';
import { Message } from '../types';
import { backend } from '../services/backend';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  password: string;
}

const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, message, password }) => {
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (message) {
      setAuthor(message.author);
      setContent(message.content);
    }
  }, [message]);

  if (!isOpen || !message) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author || !content || !password) return;

    setIsSubmitting(true);

    try {
      await backend.updateMessage(
        message.id,
        { author, content },
        password
      );

      onClose();
    } catch (error) {
      console.error('Failed to update message:', error);
      alert('메시지 수정에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAuthor('');
    setContent('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-bg-light rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-light flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-bold text-primary">메시지 수정하기</h2>
            <p className="text-sm text-text-sub">메시지 내용을 수정할 수 있습니다.</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="edit-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="flex flex-col gap-2">
              <label htmlFor="edit-name" className="text-base font-medium text-text-main">이름</label>
              <input
                id="edit-name"
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full h-14 px-4 rounded-lg border border-border-light focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white transition-all outline-none"
              />
            </div>

            {/* Group (Read-only) */}
            <div className="flex flex-col gap-2">
              <label className="text-base font-medium text-text-main">소속</label>
              <div className="w-full h-14 px-4 rounded-lg border border-gray-200 bg-gray-50 flex items-center text-gray-600">
                {message.group}
              </div>
              <p className="text-xs text-gray-500">소속은 변경할 수 없습니다.</p>
            </div>

            {/* Message Area */}
            <div className="flex flex-col gap-2">
              <label htmlFor="edit-message" className="text-base font-medium text-text-main flex justify-between">
                <span>메시지 내용</span>
                <span className={`text-sm ${content.length > 500 ? 'text-red-500' : 'text-text-sub'}`}>
                  {content.length}/500
                </span>
              </label>
              <textarea
                id="edit-message"
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
        <div className="p-6 bg-white border-t border-border-light flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 h-14 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            form="edit-form"
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 h-14 rounded-lg font-bold text-lg text-white flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all ${
              isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-light active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                수정 중...
              </>
            ) : (
              '수정 완료'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
