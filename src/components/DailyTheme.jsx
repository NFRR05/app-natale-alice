import React from 'react'

export default function DailyTheme({ theme, dateId }) {
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
    <div className="bg-pink-300 rounded-2xl shadow-sm border border-pink-400 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">
            Messaggio del Giorno
          </h2>
          {dateId && (
            <p className="text-xs text-gray-500 mt-0.5 capitalize">
              {formatDate(dateId)}
            </p>
          )}
        </div>
      </div>
      <div className="bg-white/80 rounded-xl p-5 border-l-4 border-pink-400">
        <p className="text-base text-gray-800 leading-relaxed font-normal">
          {theme || 'Nessun messaggio per oggi'}
        </p>
      </div>
    </div>
  )
}

