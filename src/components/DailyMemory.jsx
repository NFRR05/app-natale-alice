import React from 'react'

export default function DailyMemory({ memoryImage, dateId, themeText }) {
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

  return (
    <div className="bg-purple-300 rounded-2xl shadow-sm border border-purple-400 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">
            Ricordo del Giorno
          </h2>
          {dateId && (
            <p className="text-xs text-gray-500 mt-0.5 capitalize">
              {formatDate(dateId)}
            </p>
          )}
        </div>
      </div>
      <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100 mb-4">
        <img 
          src={memoryImage} 
          alt="Daily memory" 
          className="w-full h-full object-cover" 
        />
      </div>
      {themeText && (
        <div className="bg-white/80 rounded-xl p-5 border-l-4 border-purple-400">
          <p className="text-base text-gray-800 leading-relaxed font-normal">
            {themeText}
          </p>
        </div>
      )}
    </div>
  )
}

