import React, { useState, useRef } from 'react'
import imageCompression from 'browser-image-compression'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { storage, db } from '../../firebaseConfig'

export default function PhotoUpload({ user, dateId, onUploadComplete }) {
  const [selectedImage, setSelectedImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleImageSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) {
      console.warn('⚠️ [UPLOAD] No file selected')
      return
    }

    console.log('📷 [UPLOAD] Image selected:', {
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: file.type
    })

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1080,
        useWebWorker: true
      }
      
      console.log('🗜️ [UPLOAD] Compressing image...')
      const compressedFile = await imageCompression(file, options)
      console.log('✅ [UPLOAD] Image compressed:', {
        originalSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        compressedSize: (compressedFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        reduction: ((1 - compressedFile.size / file.size) * 100).toFixed(1) + '%'
      })
      
      const reader = new FileReader()
      reader.onloadend = () => {
        console.log('🖼️ [UPLOAD] Preview created')
        setPreview(reader.result)
        setSelectedImage(compressedFile)
      }
      reader.readAsDataURL(compressedFile)
    } catch (error) {
      console.error('❌ [UPLOAD] Error compressing image:', error)
      alert('Errore durante la compressione dell\'immagine')
    }
  }

  const handleUpload = async () => {
    if (!selectedImage) {
      console.warn('⚠️ [UPLOAD] No image selected for upload')
      alert('Seleziona prima una foto')
      return
    }

    console.log('☁️ [UPLOAD] Starting upload...')
    setUploading(true)
    try {
      const storagePath = `uploads/${user.uid}/${dateId}_${Date.now()}.jpg`
      console.log('📤 [UPLOAD] Uploading to Storage:', storagePath)
      const imageRef = ref(storage, storagePath)
      await uploadBytes(imageRef, selectedImage)
      console.log('✅ [UPLOAD] File uploaded to Storage')
      
      const imageUrl = await getDownloadURL(imageRef)
      console.log('🔗 [UPLOAD] Download URL obtained:', imageUrl)

      const uploadData = {
        date_id: dateId,
        user_id: user.uid,
        image_url: imageUrl,
        caption: caption || '',
        timestamp: serverTimestamp(),
      }

      const firestorePath = `${dateId}_${user.uid}`
      console.log('💾 [UPLOAD] Saving to Firestore:', firestorePath)
      const uploadRef = doc(db, 'uploads', firestorePath)
      await setDoc(uploadRef, uploadData)
      console.log('✅ [UPLOAD] Data saved to Firestore')

      setSelectedImage(null)
      setPreview(null)
      setCaption('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      console.log('🎉 [UPLOAD] Upload completed successfully!')
      alert('Foto caricata con successo! 🎉')
      if (onUploadComplete) {
        onUploadComplete()
      }
    } catch (error) {
      console.error('❌ [UPLOAD] Upload error:', error)
      alert('Errore durante il caricamento: ' + error.message)
    } finally {
      setUploading(false)
      console.log('🏁 [UPLOAD] Upload process completed')
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden transition-all duration-300 hover:shadow-2xl">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">La Tua Foto</h3>
            <p className="text-xs text-gray-500">Condividi il tuo momento</p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {preview ? (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden aspect-video bg-gradient-to-br from-gray-100 to-gray-200 shadow-inner">
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aggiungi una didascalia
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Scrivi qualcosa di speciale..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 text-sm min-h-24 resize-none bg-white/50 backdrop-blur-sm"
                rows="3"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedImage(null)
                  setPreview(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all duration-200 backdrop-blur-sm"
              >
                Cambia
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {uploading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Caricamento...
                  </span>
                ) : (
                  'Carica Foto'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className="block w-full px-6 py-16 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-cyan-50/50 transition-all duration-300 group bg-gradient-to-br from-gray-50/50 to-white/50"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Seleziona una Foto
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Clicca per scegliere il tuo momento speciale
                  </p>
                </div>
              </div>
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
