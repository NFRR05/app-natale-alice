import React, { useState, useEffect, useRef } from 'react'
import { 
  collection, 
  doc, 
  getDoc, 
  query, 
  where, 
  getDocs, 
  enableNetwork,
  waitForPendingWrites,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore'
import { useToast } from '../contexts/ToastContext'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import imageCompression from 'browser-image-compression'
import { db, storage } from '../../firebaseConfig'
import DailyMemory from './DailyMemory'
import PhotoUpload from './PhotoUpload'
import PartnerPhoto from './PartnerPhoto'

// Special users who have access to daily memories feature
const SPECIAL_USERS_EMAILS = [
  'riccardoremec@gmail.com',
  'alicebiancato5@gmail.com'
]

export default function ChatRoom({ user, conversation, onBack }) {
  const { showToast } = useToast()
  const [dailyPosts, setDailyPosts] = useState([])
  const [myUpload, setMyUpload] = useState(null)
  const [partnerUpload, setPartnerUpload] = useState(null)
  const [dateId, setDateId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // Edit form states
  const [editCaption, setEditCaption] = useState('')
  const [editImage, setEditImage] = useState(null)
  const [editPreview, setEditPreview] = useState(null)
  const editFileInputRef = useRef(null)

  const partnerId = conversation.participants.find(p => p !== user.uid)
  const partnerInfo = conversation.otherUser

  // Check if both users in this conversation are special users
  // Only riccardoremec@gmail.com and alicebiancato5@gmail.com have memory feature
  const hasMemoryFeature = () => {
    if (!partnerInfo) return false
    
    const userEmail = user.email?.toLowerCase()
    const partnerEmail = partnerInfo.email?.toLowerCase()
    
    if (!userEmail || !partnerEmail) return false
    
    return SPECIAL_USERS_EMAILS.includes(userEmail) && 
           SPECIAL_USERS_EMAILS.includes(partnerEmail)
  }

  const isMemoryFeatureEnabled = hasMemoryFeature()

  useEffect(() => {
    loadDailyData()
  }, [user, conversation])

  const loadDailyData = async () => {
    if (!user || !conversation) {
      console.warn('⚠️ [CHATROOM] No user or conversation')
      setError('Sessione non valida')
      setLoading(false)
      setDataLoaded(false)
      return
    }

    console.log('📅 [CHATROOM] Loading daily data for conversation:', conversation.id)
    
    setError(null)
    setLoading(true)
    setDataLoaded(false)

    const today = new Date()
    const todayId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    setDateId(todayId)

    try {
      await enableNetwork(db).catch(() => {})
      
      // Wait a bit for new conversations to propagate in Firestore
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Verify conversation exists first
      try {
        const convDoc = await getDoc(doc(db, 'conversations', conversation.id))
        if (!convDoc.exists()) {
          console.warn('⚠️ [CHATROOM] Conversation does not exist yet')
          setError('Conversazione non trovata. Riprova tra un attimo.')
          setLoading(false)
          setDataLoaded(false)
          return
        }
      } catch (err) {
        console.warn('⚠️ [CHATROOM] Error checking conversation:', err)
        // Continue anyway
      }
      
      // Only load daily posts if both users are special users
      let dailyPostFound = false
      
      if (isMemoryFeatureEnabled) {
        try {
          const dailyPostsRef = collection(db, 'conversations', conversation.id, 'daily_posts')
          const allDocs = await getDocs(dailyPostsRef).catch(err => {
            // If subcollection doesn't exist or query fails, just return empty
            console.warn('⚠️ [CHATROOM] Error loading daily_posts (expected for new conversations):', err.message)
            return { docs: [] }
          })
          
          // Check if allDocs has docs property (from getDocs) or is an error response
          const docs = allDocs.docs || []
          const validDocs = docs
            .filter(doc => doc.id <= todayId)
            .sort((a, b) => a.id.localeCompare(b.id))
          
          if (validDocs.length > 0) {
            const posts = validDocs.map(doc => ({
              date_id: doc.id,
              theme_text: doc.data().theme_text || 'Nessun messaggio per oggi',
              memory_image_url: doc.data().memory_image_url || null
            }))
            setDailyPosts(posts)
            dailyPostFound = true
          } else {
            setDailyPosts([])
          }
        } catch (error) {
          // Ignore errors for daily_posts - it's optional
          console.warn('⚠️ [CHATROOM] Error loading daily posts (continuing anyway):', error.message)
          setDailyPosts([])
        }
      } else {
        // Memory feature disabled - set empty array
        console.log('📝 [CHATROOM] Memory feature disabled for this conversation')
        setDailyPosts([])
      }

      // Load uploads for this conversation
      let myUploadData = null
      let partnerUploadData = null
      
      try {
        await waitForPendingWrites(db).catch(() => {})
        
        const uploadsRef = collection(db, 'conversations', conversation.id, 'uploads')
        const q = query(uploadsRef, where('date_id', '==', todayId))
        const querySnapshot = await getDocs(q).catch(err => {
          // If subcollection doesn't exist yet (new conversation), return empty
          console.warn('⚠️ [CHATROOM] Error loading uploads (expected for new conversations):', err.message)
          return { forEach: () => {} } // Return empty snapshot-like object
        })

        if (querySnapshot && querySnapshot.forEach) {
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data()
            if (data.user_id === user.uid) {
              myUploadData = { ...data, docId: docSnap.id }
            } else if (data.user_id === partnerId) {
              partnerUploadData = { ...data, docId: docSnap.id }
            }
          })
        }
      } catch (error) {
        // Ignore upload errors - just continue with empty uploads
        console.warn('⚠️ [CHATROOM] Error loading uploads (continuing anyway):', error.message)
      }

      setMyUpload(myUploadData)
      setPartnerUpload(partnerUploadData)
      setDataLoaded(true)
      setLoading(false)
    } catch (error) {
      console.error('❌ [CHATROOM] Error loading data:', error)
      setError(error.message || 'Impossibile caricare i dati')
      setLoading(false)
      setDataLoaded(false)
    }
  }

  const handlePhotoUpload = async (file, caption) => {
    console.log('📤 [CHATROOM] Uploading photo...')
    
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1080,
        useWebWorker: true
      }
      
      const compressedFile = await imageCompression(file, options)
      
      // Upload to storage
      const storagePath = `conversations/${conversation.id}/${user.uid}/${dateId}_${Date.now()}.jpg`
      const imageRef = ref(storage, storagePath)
      await uploadBytes(imageRef, compressedFile)
      const imageUrl = await getDownloadURL(imageRef)
      
      // Save to Firestore
      const uploadDocId = `${dateId}_${user.uid}`
      await setDoc(doc(db, 'conversations', conversation.id, 'uploads', uploadDocId), {
        user_id: user.uid,
        date_id: dateId,
        image_url: imageUrl,
        caption: caption || '',
        timestamp: serverTimestamp(),
        conversation_id: conversation.id
      })
      
      // Update conversation's updated_at
      await updateDoc(doc(db, 'conversations', conversation.id), {
        updated_at: serverTimestamp(),
        last_message: '📸 Nuova foto condivisa'
      })
      
      console.log('✅ [CHATROOM] Photo uploaded successfully')
      await loadDailyData()
      
    } catch (error) {
      console.error('❌ [CHATROOM] Upload error:', error)
      throw error
    }
  }

  // Open edit modal
  const openEditModal = () => {
    setEditCaption(myUpload?.caption || '')
    setEditImage(null)
    setEditPreview(null)
    setShowEditModal(true)
  }

  // Handle edit image select
  const handleEditImageSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1080,
        useWebWorker: true
      }
      
      const compressedFile = await imageCompression(file, options)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditPreview(reader.result)
        setEditImage(compressedFile)
      }
      reader.readAsDataURL(compressedFile)
    } catch (error) {
      console.error('❌ [EDIT] Error compressing image:', error)
      showToast('Errore durante la compressione dell\'immagine', 'error')
    }
  }

  // Handle delete photo
  const handleDeletePhoto = async () => {
    if (!myUpload) return
    
    setIsDeleting(true)
    
    try {
      const uploadDocId = `${dateId}_${user.uid}`
      await deleteDoc(doc(db, 'conversations', conversation.id, 'uploads', uploadDocId))
      
      if (myUpload.image_url) {
        try {
          const url = new URL(myUpload.image_url)
          const pathMatch = url.pathname.match(/\/o\/(.+)\?/)
          if (pathMatch) {
            const storagePath = decodeURIComponent(pathMatch[1])
            const storageRef = ref(storage, storagePath)
            await deleteObject(storageRef)
          }
        } catch (storageError) {
          console.warn('⚠️ [DELETE] Could not delete from Storage:', storageError)
        }
      }
      
      setMyUpload(null)
      setShowDeleteModal(false)
    } catch (error) {
      console.error('❌ [DELETE] Error deleting photo:', error)
      showToast('Errore durante l\'eliminazione: ' + error.message, 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle edit photo
  const handleEditPhoto = async () => {
    if (!myUpload) return
    
    setIsEditing(true)
    
    try {
      const uploadDocId = `${dateId}_${user.uid}`
      let newImageUrl = myUpload.image_url
      
      if (editImage) {
        const storagePath = `conversations/${conversation.id}/${user.uid}/${dateId}_${Date.now()}.jpg`
        const imageRef = ref(storage, storagePath)
        await uploadBytes(imageRef, editImage)
        newImageUrl = await getDownloadURL(imageRef)
        
        if (myUpload.image_url) {
          try {
            const url = new URL(myUpload.image_url)
            const pathMatch = url.pathname.match(/\/o\/(.+)\?/)
            if (pathMatch) {
              const oldStoragePath = decodeURIComponent(pathMatch[1])
              const oldStorageRef = ref(storage, oldStoragePath)
              await deleteObject(oldStorageRef)
            }
          } catch (e) {
            console.warn('⚠️ [EDIT] Could not delete old image:', e)
          }
        }
      }
      
      await updateDoc(doc(db, 'conversations', conversation.id, 'uploads', uploadDocId), {
        image_url: newImageUrl,
        caption: editCaption,
        updated_at: serverTimestamp()
      })
      
      setMyUpload({
        ...myUpload,
        image_url: newImageUrl,
        caption: editCaption
      })
      
      setShowEditModal(false)
      setEditImage(null)
      setEditPreview(null)
    } catch (error) {
      console.error('❌ [EDIT] Error editing photo:', error)
      showToast('Errore durante la modifica: ' + error.message, 'error')
    } finally {
      setIsEditing(false)
    }
  }

  const canSeePartnerPhoto = myUpload && myUpload.image_url

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/single-heart.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <p className="text-white font-medium text-lg">Caricamento...</p>
        </div>
      </div>
    )
  }

  // Error screen
  if (error || !dataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-white to-pink-50/30">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Errore nel Caricamento</h2>
          <p className="text-gray-600 mb-6 text-sm">{error || 'Impossibile caricare i dati.'}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setError(null)
                setLoading(true)
                loadDailyData()
              }}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-pink-500 to-red-600 hover:from-pink-600 hover:to-red-700 text-white font-medium rounded-lg transition-all"
            >
              Riprova
            </button>
            <button
              onClick={onBack}
              className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Torna alle Chat
            </button>
          </div>
        </div>
      </div>
    )
  }

  const todayPost = dailyPosts.find(post => post.date_id === dateId)
  const pastPosts = dailyPosts.filter(post => post.date_id < dateId).sort((a, b) => b.date_id.localeCompare(a.date_id))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/20 to-rose-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100/80 text-gray-700 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3 flex-1">
              {partnerInfo?.profile_picture_url ? (
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-pink-200 shadow-md">
                  <img 
                    src={partnerInfo.profile_picture_url} 
                    alt={partnerInfo.display_name || partnerInfo.username}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-md">
                  <span className="text-white font-bold">
                    {(partnerInfo?.display_name || partnerInfo?.username || '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {partnerInfo?.display_name || partnerInfo?.username || 'Chat'}
                </h1>
                <p className="text-xs text-gray-500">@{partnerInfo?.username}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className={`grid grid-cols-1 gap-6 lg:gap-8 ${isMemoryFeatureEnabled ? 'lg:grid-cols-3' : 'lg:grid-cols-1 max-w-2xl mx-auto'}`}>
          
          {/* Left Column - Memories (ONLY for riccardo + alice) */}
          {isMemoryFeatureEnabled && (
            <div className="lg:col-span-2 space-y-6 lg:space-y-8">
              {todayPost?.memory_image_url && (
                <div className="group">
                  <DailyMemory 
                    memoryImage={todayPost.memory_image_url} 
                    dateId={todayPost.date_id} 
                    themeText={todayPost.theme_text}
                  />
                </div>
              )}

              {pastPosts.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Ricordi Passati</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pastPosts.map((post) => (
                      post.memory_image_url && (
                        <DailyMemory 
                          key={post.date_id} 
                          memoryImage={post.memory_image_url} 
                          dateId={post.date_id}
                          compact={true}
                        />
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Empty memories state (only shown for special users when no memories yet) */}
              {dailyPosts.length === 0 && (
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">I vostri ricordi</h3>
                  <p className="text-gray-600 text-sm">
                    I vostri momenti speciali appariranno qui
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Right Column - Photo Upload Section */}
          <div className={isMemoryFeatureEnabled ? 'space-y-10 lg:space-y-12' : 'w-full space-y-10 lg:space-y-12'}>
            {/* My Upload */}
            {myUpload?.image_url ? (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-md">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">La Tua Foto</h3>
                        <p className="text-xs text-gray-500">Oggi</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={openEditModal}
                        className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all duration-200 hover:scale-110"
                        title="Modifica foto"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-600 transition-all duration-200 hover:scale-110"
                        title="Elimina foto"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-gradient-to-br from-gray-100 to-gray-200 shadow-inner">
                    <img 
                      src={myUpload.image_url} 
                      alt="My upload" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {myUpload.caption && (
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border-l-4 border-blue-400">
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {myUpload.caption}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <PhotoUpload 
                user={user} 
                dateId={dateId} 
                onUploadComplete={loadDailyData}
                conversationId={conversation.id}
              />
            )}

            {/* Partner Photo */}
            <PartnerPhoto 
              partnerUpload={partnerUpload} 
              canSeePartnerPhoto={canSeePartnerPhoto}
              partnerName={partnerInfo?.display_name || partnerInfo?.username}
            />
          </div>
        </div>
      </main>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Elimina Foto</h3>
                  <p className="text-sm text-gray-500">Questa azione non può essere annullata</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Sei sicuro di voler eliminare la tua foto di oggi?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleDeletePhoto}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Elimina'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden my-8">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Modifica Foto</h3>
                    <p className="text-sm text-gray-500">Cambia foto o didascalia</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditImage(null)
                    setEditPreview(null)
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto</label>
                <div className="relative rounded-xl overflow-hidden aspect-video bg-gradient-to-br from-gray-100 to-gray-200 shadow-inner">
                  <img 
                    src={editPreview || myUpload?.image_url} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                  {editPreview && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      Nuova foto
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={editFileInputRef}
                  onChange={handleEditImageSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => editFileInputRef.current?.click()}
                  className="mt-3 w-full px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Cambia Foto
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Didascalia</label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder="Scrivi qualcosa di speciale..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 text-sm min-h-24 resize-none"
                  rows="3"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditImage(null)
                    setEditPreview(null)
                  }}
                  disabled={isEditing}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleEditPhoto}
                  disabled={isEditing}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                >
                  {isEditing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Salva
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

