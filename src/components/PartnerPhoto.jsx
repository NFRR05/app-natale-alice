import React from 'react'

export default function PartnerPhoto({ partnerUpload, canSeePartnerPhoto }) {
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden transition-all duration-300 hover:shadow-2xl">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">La Foto del Partner</h3>
            <p className="text-xs text-gray-500">Il suo momento speciale</p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {partnerUpload ? (
          canSeePartnerPhoto ? (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden aspect-video bg-gradient-to-br from-gray-100 to-gray-200 shadow-inner group">
                <img 
                  src={partnerUpload.image_url} 
                  alt="Partner photo" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              {partnerUpload.caption && (
                <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-4 border-l-4 border-rose-400 shadow-sm">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {partnerUpload.caption}
                  </p>
                </div>
              )}
              {partnerUpload.timestamp && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Caricata alle {formatTimestamp(partnerUpload.timestamp)}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden aspect-video bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="text-center p-8 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl mx-4 max-w-sm border border-white/20">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
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
                className="w-full h-full object-cover opacity-20 blur-2xl scale-110"
              />
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 text-sm font-medium mb-1">
              Il tuo partner non ha ancora caricato la foto di oggi
            </p>
            <p className="text-gray-400 text-xs">
              Torna più tardi per vedere il suo momento speciale
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
