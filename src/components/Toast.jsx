import React, { useEffect } from 'react'

export default function Toast({ message, type = 'success', onClose, duration = 2000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColor = type === 'success' 
    ? 'bg-green-500' 
    : type === 'error' 
    ? 'bg-red-500' 
    : 'bg-blue-500'

  const icon = type === 'success' ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ) : type === 'error' ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-slide-down">
      <div className={`
        ${bgColor} 
        text-white 
        px-4 py-3 
        rounded-xl 
        shadow-2xl 
        flex items-center gap-3 
        min-w-[280px] 
        max-w-[90vw] 
        backdrop-blur-sm
        border border-white/20
      `}>
        <div className="flex-shrink-0">
          {icon}
        </div>
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity"
          aria-label="Chiudi"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

