import React from 'react';

const Modal = ({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
  footer,
  disableClose = false,
  maxWidthClass = 'max-w-lg',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        onClick={onClose}
        disabled={disableClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[3px] transition-opacity duration-300"
        aria-label="Close modal overlay"
      />
      <div
        className={`relative w-full ${maxWidthClass} rounded-3xl border border-white/60 bg-white/95 shadow-2xl shadow-slate-900/25 transition-all duration-300 ease-out animate-[modalIn_.25s_ease-out_forwards]`}
      >
        <div className="px-6 py-5 md:px-7 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800">{title}</h2>
            {subtitle ? <p className="text-sm text-slate-500 mt-1">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={disableClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all disabled:opacity-60"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5 md:px-7">{children}</div>
        {footer ? <div className="px-6 pb-6 md:px-7 md:pb-7">{footer}</div> : null}
      </div>
    </div>
  );
};

export default Modal;
