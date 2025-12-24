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
      // Compress image
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
      
      // Create preview
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
    console.log('📅 [UPLOAD] Date ID:', dateId)
    console.log('👤 [UPLOAD] User ID:', user.uid)
    console.log('📝 [UPLOAD] Caption:', caption || '(none)')

    setUploading(true)
    try {
      // Upload to Firebase Storage
      const storagePath = `uploads/${user.uid}/${dateId}_${Date.now()}.jpg`
      console.log('📤 [UPLOAD] Uploading to Storage:', storagePath)
      const imageRef = ref(storage, storagePath)
      await uploadBytes(imageRef, selectedImage)
      console.log('✅ [UPLOAD] File uploaded to Storage')
      
      const imageUrl = await getDownloadURL(imageRef)
      console.log('🔗 [UPLOAD] Download URL obtained:', imageUrl)

      // Save to Firestore
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

      // Reset
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
      console.error('❌ [UPLOAD] Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      })
      alert('Errore durante il caricamento: ' + error.message)
    } finally {
      setUploading(false)
      console.log('🏁 [UPLOAD] Upload process completed')
    }
  }

  return (
    <div className="bg-blue-300 rounded-2xl shadow-sm border border-blue-400 p-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          La Tua Foto di Oggi
        </h2>
      </div>
      
      {preview ? (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-gray-900 text-sm min-h-24 resize-none"
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
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cambia Foto
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-red-600 hover:from-pink-600 hover:to-red-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="animate-fade-in">
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
            className="w-full px-4 py-12 border-2 border-dashed border-blue-300 rounded-xl text-center cursor-pointer hover:border-blue-400 hover:bg-white/60 transition-all inline-block bg-white/50"
          >
            <div className="flex flex-col items-center gap-3">
              <div>
                <span className="text-base font-medium text-gray-900">Seleziona una Foto</span>
                <p className="text-sm text-gray-500 mt-1">
                  Scegli la foto del tuo momento speciale di oggi
                </p>
              </div>
            </div>
          </label>
        </div>
      )}
    </div>
  )
}

