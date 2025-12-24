import React from 'react'

export default function DailyMemory({ memoryImage, dateId, themeText, compact = false }) {
  if (!memoryImage) return null

  const formatDate = (dateId) => {
    if (!dateId) return null
    try {
      const date = new Date(dateId + 'T00:00:00')
      return date.toLocaleDateString('it-IT', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      })
    } catch (e) {
      return dateId
    }
  }

  if (compact) {
    return (
      <div className="group bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
        <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
          <img 
            src={memoryImage} 
            alt="Memory" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-white text-xs font-medium capitalize">
                {formatDate(dateId)}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden transition-all duration-300 hover:shadow-2xl">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              Ricordo del Giorno
            </h2>
            {dateId && (
              <p className="text-xs text-gray-500 mt-0.5 capitalize">
                {formatDate(dateId)}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="relative rounded-xl overflow-hidden aspect-video bg-gradient-to-br from-gray-100 to-gray-200 shadow-inner group">
          <img 
            src={memoryImage} 
            alt="Daily memory" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        
        {themeText && (
          <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 rounded-xl p-5 border-l-4 border-purple-400 shadow-sm">
            <p className="text-gray-800 leading-relaxed font-medium text-sm">
              {themeText}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
