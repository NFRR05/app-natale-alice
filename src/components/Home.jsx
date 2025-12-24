import React, { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { 
  collection, 
  doc, 
  getDoc, 
  query, 
  where, 
  getDocs, 
  enableNetwork,
  waitForPendingWrites 
} from 'firebase/firestore'
import { auth, db } from '../../firebaseConfig'
import DailyMemory from './DailyMemory'
import PhotoUpload from './PhotoUpload'
import PartnerPhoto from './PartnerPhoto'

export default function Home({ user }) {
  const [dailyPosts, setDailyPosts] = useState([])
  const [myUpload, setMyUpload] = useState(null)
  const [partnerUpload, setPartnerUpload] = useState(null)
  const [dateId, setDateId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    loadDailyData()
  }, [user])

  const loadDailyData = async () => {
    if (!user) {
      console.warn('⚠️ [HOME] No user, skipping data load')
      setError('Nessun utente autenticato')
      setLoading(false)
      setDataLoaded(false)
      return
    }

    console.log('📅 [HOME] Loading daily data...')
    console.log('👤 [HOME] User:', { uid: user.uid, email: user.email })
    
    // Reset states
    setError(null)
    setLoading(true)
    setDataLoaded(false)

    const today = new Date()
    const todayId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    setDateId(todayId)
    console.log('📅 [HOME] Date ID:', todayId)

    try {
      // Enable network once at the start
      console.log('🔧 [HOME] Ensuring network is enabled...')
      try {
        await enableNetwork(db)
        console.log('✅ [HOME] Network enabled')
      } catch (networkError) {
        if (networkError.code !== 'already-exists') {
          console.warn('⚠️ [HOME] enableNetwork() error (continuing anyway):', networkError)
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Load daily posts
      console.log('📖 [HOME] ===== STARTING DAILY POST FETCH =====')
      let dailyPostFound = false
      
      try {
        const dailyPostsRef = collection(db, 'daily_posts')
        const getDocsPromise = getDocs(dailyPostsRef)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getDocs timeout after 20 seconds')), 20000)
        )
        
        const allDocs = await Promise.race([getDocsPromise, timeoutPromise])
        
        const validDocs = allDocs.docs
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
        console.error('❌ [HOME] Error in getDocs():', error)
        if (error.code === 'permission-denied') {
          setError('Permessi insufficienti. Verifica le regole di Firestore.')
        } else if (error.code === 'unavailable' || error.message?.includes('offline')) {
          setError('Impossibile connettersi a Firestore. Verifica la connessione.')
        }
        if (!dailyPostFound) {
          setDailyPosts([])
        }
      }

      // Load uploads
      console.log('📸 [HOME] ===== STARTING UPLOADS FETCH =====')
      let myUploadData = null
      let partnerUploadData = null
      
      const fetchUploadsWithRetry = async (maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            try {
              await waitForPendingWrites(db)
            } catch (waitError) {
              // Ignore
            }
            
            if (attempt > 1) {
              const delay = Math.min(200 * attempt, 1000)
              await new Promise(resolve => setTimeout(resolve, delay))
            }
            
            const uploadsRef = collection(db, 'uploads')
            const q = query(uploadsRef, where('date_id', '==', todayId))
            const querySnapshot = await getDocs(q)

            querySnapshot.forEach((docSnap) => {
              const data = docSnap.data()
              if (data.user_id === user.uid) {
                myUploadData = data
              } else {
                partnerUploadData = data
              }
            })
            
            return
          } catch (error) {
            const isInternalError = error.message?.includes('INTERNAL ASSERTION') || 
                                   error.message?.includes('Unexpected state') ||
                                   error.code === 'already-exists'
            
            if (isInternalError && attempt < maxRetries) {
              continue
            } else if (isInternalError) {
              return
            } else {
              throw error
            }
          }
        }
      }
      
      try {
        await fetchUploadsWithRetry()
      } catch (error) {
        console.error('❌ [HOME] Error in uploads fetch:', error)
      }

      setMyUpload(myUploadData)
      setPartnerUpload(partnerUploadData)
      setDataLoaded(true)
      setLoading(false)
      console.log('🏁 [HOME] Data loading completed successfully')
    } catch (error) {
      console.error('❌ [HOME] Error loading data:', error)
      setError(error.message || 'Impossibile caricare i dati del giorno. Riprova più tardi.')
      setLoading(false)
      setDataLoaded(false)
    }
  }

  const handleLogout = async () => {
    console.log('🚪 [HOME] Logging out...')
    try {
      await signOut(auth)
      console.log('✅ [HOME] Logout successful')
    } catch (error) {
      console.error('❌ [HOME] Logout error:', error)
      alert('Errore durante il logout: ' + error.message)
    }
  }

  const canSeePartnerPhoto = myUpload && myUpload.image_url

  // Show loading video while fetching
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
          <p className="text-white font-medium text-lg">Caricamento dati...</p>
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
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">{error || 'Impossibile caricare i dati. La pagina non può essere visualizzata.'}</p>
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
              onClick={handleLogout}
              className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Esci e Accedi di Nuovo
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
      {/* Elegant Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                MyBubiAPP
              </h1>
              <p className="text-xs text-gray-500">I nostri momenti speciali</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 rounded-lg transition-all duration-200 backdrop-blur-sm"
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Left Column - Memories */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            {/* Today's Memory */}
            {todayPost?.memory_image_url && (
              <div className="group">
                <DailyMemory 
                  memoryImage={todayPost.memory_image_url} 
                  dateId={todayPost.date_id} 
                  themeText={todayPost.theme_text}
                />
              </div>
            )}

            {/* Past Memories */}
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
          </div>

          {/* Right Column - Today's Actions */}
          <div className="space-y-6 lg:space-y-8">
            {/* My Upload */}
            {myUpload?.image_url ? (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <div className="p-6 border-b border-gray-100">
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
                  {myUpload.timestamp && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Caricata alle {myUpload.timestamp.toDate ? myUpload.timestamp.toDate().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <PhotoUpload user={user} dateId={dateId} onUploadComplete={loadDailyData} />
            )}

            {/* Partner Photo */}
            <PartnerPhoto partnerUpload={partnerUpload} canSeePartnerPhoto={canSeePartnerPhoto} />
          </div>
        </div>
      </main>
    </div>
  )
}
