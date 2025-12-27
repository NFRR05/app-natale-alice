import React from 'react'

export default function StreakBadge({ streakCount = 0 }) {
  if (!streakCount || streakCount === 0) {
    return null
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-full shadow-lg animate-pulse">
      {/* Fire Icon */}
      <svg 
        className="w-5 h-5 text-white drop-shadow-sm" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path 
          fillRule="evenodd" 
          d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.88A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" 
          clipRule="evenodd" 
        />
      </svg>
      
      {/* Streak Count */}
      <span className="text-white font-bold text-sm drop-shadow-sm">
        {streakCount}
      </span>
    </div>
  )
}

