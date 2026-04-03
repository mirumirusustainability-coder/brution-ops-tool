'use client';

import { useEffect, useState } from 'react';

type DeleteConfirmModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function DeleteConfirmModal({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInput('');
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (input !== '삭제' || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="삭제 를 입력해주세요"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-600"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={input !== '삭제' || submitting}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-md disabled:opacity-50"
          >
            {submitting ? '삭제 중...' : '확인'}
          </button>
        </div>
      </div>
    </div>
  );
}
