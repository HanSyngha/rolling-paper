import React, { useState } from 'react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (password: string) => Promise<boolean>;
  onSuccess: (password: string) => void;
  title: string;
  description: string;
}

const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  onVerify,
  onSuccess,
  title,
  description
}) => {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setIsVerifying(true);
    setError('');

    try {
      const isValid = await onVerify(password);

      if (isValid) {
        onSuccess(password);
        setPassword('');
        onClose();
      } else {
        setError('비밀번호가 일치하지 않습니다.');
      }
    } catch (error) {
      setError('비밀번호 확인 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
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
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-light">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">lock</span>
            <div>
              <h2 className="text-lg font-bold text-primary">{title}</h2>
              <p className="text-sm text-text-sub">{description}</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex flex-col gap-3">
            <label htmlFor="verify-password" className="text-sm font-medium text-text-main">
              비밀번호
            </label>
            <input
              id="verify-password"
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="비밀번호를 입력하세요"
              className={`w-full h-12 px-4 rounded-lg border ${
                error ? 'border-red-500' : 'border-border-light'
              } focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white transition-all outline-none`}
            />
            {error && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isVerifying}
              className="flex-1 h-12 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isVerifying || !password}
              className={`flex-1 h-12 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all ${
                isVerifying || !password
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-light'
              }`}
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
  );
};

export default PasswordModal;
