import React from 'react'

export default function PartnerPhoto({ partnerUpload, canSeePartnerPhoto }) {
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-rose-300 rounded-2xl shadow-sm border border-rose-400 p-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          La Foto del Tuo Partner
        </h2>
      </div>
      
      {partnerUpload ? (
        canSeePartnerPhoto ? (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
              <img 
                src={partnerUpload.image_url} 
                alt="Partner photo" 
                className="w-full h-full object-cover" 
              />
            </div>
            {partnerUpload.caption && (
              <div className="bg-white/80 rounded-lg p-4 border-l-4 border-rose-400">
                <p className="text-gray-700 text-sm leading-relaxed">
                  {partnerUpload.caption}
                </p>
              </div>
            )}
            {partnerUpload.timestamp && (
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Caricata alle {formatTimestamp(partnerUpload.timestamp)}
              </p>
            )}
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="text-center p-6 bg-white/95 rounded-xl shadow-xl mx-4 max-w-xs">
                <p className="text-gray-900 font-semibold text-base mb-2">
                  Carica la tua foto per sbloccare!
                </p>
                <p className="text-gray-600 text-xs leading-relaxed">
                  Una volta caricata la tua foto, potrai vedere quella del tuo partner
                </p>
              </div>
            </div>
            <img
              src={partnerUpload.image_url}
              alt="Blurred partner photo"
              className="w-full h-full object-cover opacity-30 blur-md"
            />
          </div>
        )
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 text-sm font-medium">
            Il tuo partner non ha ancora caricato la foto di oggi
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Torna più tardi per vedere il suo momento speciale
          </p>
        </div>
      )}
    </div>
  )
}

