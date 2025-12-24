import React, { useState, useEffect, useRef } from 'react'
import { signOut } from 'firebase/auth'
import { 
  collection, 
  doc, 
  getDoc, 
  query, 
  where, 
  getDocs, 
  enableNetwork,
  waitForPendingWrites,
  onSnapshot,
  setDoc
} from 'firebase/firestore'
import { auth, db } from '../../firebaseConfig'
import DailyMemory from './DailyMemory'
import PhotoUpload from './PhotoUpload'
import PartnerPhoto from './PartnerPhoto'

export default function Home({ user }) {
  const [dailyPosts, setDailyPosts] = useState([]) // Array di oggetti { date_id, theme_text, memory_image_url }
  const [myUpload, setMyUpload] = useState(null)
  const [partnerUpload, setPartnerUpload] = useState(null)
  const [dateId, setDateId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  const partnerUploadListenerRef = useRef(null)

  useEffect(() => {
    loadDailyData()
    // NO TIMEOUT - lascia che le query completino naturalmente
    // Il loading spinner resterà attivo finché loadDailyData() non completa
    
    // Cleanup quando il componente viene smontato o l'utente cambia
    return () => {
      if (partnerUploadListenerRef.current) {
        console.log('🧹 [HOME] Cleaning up partner upload listener')
        partnerUploadListenerRef.current()
        partnerUploadListenerRef.current = null
      }
    }
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
    console.log('🔧 [HOME] Firebase Config Check:')
    console.log('🔧 [HOME] - Project ID:', db.app.options.projectId)
    console.log('🔧 [HOME] - Auth Domain:', db.app.options.authDomain)
    console.log('🔧 [HOME] - Database URL:', db.app.options.databaseURL || 'N/A')
    console.log('🔧 [HOME] - App Name:', db.app.name)
    
    // Verifica importante: controlla se l'utente ha un token valido
    try {
      const token = await auth.currentUser?.getIdToken()
      console.log('🔧 [HOME] - User token exists:', !!token)
      if (token) {
        console.log('🔧 [HOME] - Token preview:', token.substring(0, 20) + '...')
      }
    } catch (tokenError) {
      console.error('❌ [HOME] Error getting user token:', tokenError)
    }

    // Reset states
    setError(null)
    setLoading(true)
    setDataLoaded(false)

    const today = new Date()
    const todayId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    setDateId(todayId)
    console.log('📅 [HOME] Date ID:', todayId)

    try {
      // Load daily theme and memory - NO TIMEOUT, solo log dettagliati
      console.log('📖 [HOME] ===== STARTING DAILY POST FETCH =====')
      console.log('📖 [HOME] Looking for document ID:', todayId)
      console.log('📖 [HOME] User authenticated:', !!user, user?.uid)
      console.log('📖 [HOME] DB instance:', db)
      
      // Carica tutti i documenti fino alla data odierna
      let dailyPostFound = false
      
      try {
        console.log('📖 [HOME] ===== FETCHING ALL DAILY POSTS =====')
        console.log('📖 [HOME] Step 1: Ensuring network is enabled...')
        try {
          await enableNetwork(db)
          console.log('✅ [HOME] Network enabled for collection query')
        } catch (networkError) {
          // Ignora errori "already-exists" - sono errori interni di Firestore non critici
          if (networkError.code !== 'already-exists') {
            console.warn('⚠️ [HOME] enableNetwork() error (continuing anyway):', networkError)
          }
        }
        
        console.log('📖 [HOME] Step 2: Creating collection reference...')
        const dailyPostsRef = collection(db, 'daily_posts')
        console.log('📖 [HOME] Collection reference created:', dailyPostsRef.path)
        console.log('📖 [HOME] Collection ID:', dailyPostsRef.id)
        console.log('📖 [HOME] Collection path:', dailyPostsRef.path)
        console.log('📖 [HOME] Database project ID:', db.app.options.projectId)
        console.log('📖 [HOME] Database app name:', db.app.name)
        
        console.log('📖 [HOME] Step 3: Calling getDocs() (cache + server)...')
        const startTime = Date.now()
        // Usa getDocs() normale che prova cache e poi server
        // Aggiungi un timeout per evitare di aspettare troppo
        const getDocsPromise = getDocs(dailyPostsRef)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('getDocs timeout after 20 seconds')), 20000)
        )
        
        const allDocs = await Promise.race([getDocsPromise, timeoutPromise])
        const endTime = Date.now()
        console.log(`⏱️ [HOME] getDocs() completed in ${endTime - startTime}ms`)
        console.log('📖 [HOME] Query source:', allDocs.metadata.fromCache ? 'cache' : 'server')
        console.log('📖 [HOME] Query metadata:', {
          hasPendingWrites: allDocs.metadata.hasPendingWrites,
          isFromCache: allDocs.metadata.fromCache
        })
        
        console.log('📦 [HOME] Step 4: Processing documents...')
        console.log('📦 [HOME] Total documents fetched:', allDocs.size)
        console.log('📦 [HOME] Document IDs:', allDocs.docs.map(d => d.id))
        console.log('📦 [HOME] Empty collection?', allDocs.empty)
        
        // Log dettagliato se la collezione è vuota
        if (allDocs.empty) {
          console.warn('⚠️ [HOME] Collection is EMPTY!')
          console.warn('⚠️ [HOME] Possible reasons:')
          console.warn('⚠️ [HOME] 1. Document was created in a different Firebase project')
          console.warn('⚠️ [HOME] 2. Firestore rules are blocking read access')
          console.warn('⚠️ [HOME] 3. Collection name is wrong (expected: daily_posts)')
          console.warn('⚠️ [HOME] 4. Database is in a different region')
        }
        
        // Filtra i documenti con Document ID <= todayId e ordina (dal più vecchio al più recente)
        const validDocs = allDocs.docs
          .filter(doc => {
            const isValid = doc.id <= todayId
            console.log(`📋 [HOME] Document ${doc.id} <= ${todayId}? ${isValid}`)
            return isValid
          })
          .sort((a, b) => a.id.localeCompare(b.id)) // Ordine crescente (dal più vecchio al più recente)
        
        console.log('📋 [HOME] Valid documents (<= today):', validDocs.length)
        console.log('📋 [HOME] Valid document IDs:', validDocs.map(d => d.id))
        
        if (validDocs.length > 0) {
          // Converti tutti i documenti validi in un array
          const posts = validDocs.map(doc => ({
            date_id: doc.id,
            theme_text: doc.data().theme_text || 'Nessun messaggio per oggi',
            memory_image_url: doc.data().memory_image_url || null
          }))
          setDailyPosts(posts)
          dailyPostFound = true
          console.log(`✅ [HOME] Found ${posts.length} daily posts to display`)
          console.log('✅ [HOME] Posts:', posts.map(p => p.date_id))
        } else {
          console.log('ℹ️ [HOME] No valid documents found (no posts <= today)')
          setDailyPosts([])
        }
      } catch (error) {
          console.error('❌ [HOME] ===== ERROR IN getDocs() =====')
          console.error('❌ [HOME] Error name:', error.name)
          console.error('❌ [HOME] Error message:', error.message)
          console.error('❌ [HOME] Error code:', error.code)
          console.error('❌ [HOME] Error stack:', error.stack)
          console.error('❌ [HOME] Full error object:', error)
          if (error.code === 'permission-denied') {
            console.warn('⚠️ [HOME] Permission denied - check Firestore rules')
            setError('Permessi insufficienti. Verifica le regole di Firestore. Le regole devono permettere la lettura per utenti autenticati.')
          } else if (error.code === 'unavailable' || error.message?.includes('offline')) {
            console.error('❌ [HOME] Firestore connection error - client appears offline')
            console.error('❌ [HOME] This usually means:')
            console.error('❌ [HOME] 1. Firestore rules are blocking access (most likely)')
            console.error('❌ [HOME] 2. Network connectivity issue')
            console.error('❌ [HOME] 3. Firestore database not initialized in Firebase Console')
            setError('Impossibile connettersi a Firestore. Verifica: 1) Le regole Firestore permettono lettura per utenti autenticati? 2) Il database Firestore è stato creato in Firebase Console?')
          }
          if (!dailyPostFound) {
            setDailyPosts([])
          }
        }
      
      console.log('🏁 [HOME] ===== DAILY POST FETCH COMPLETED =====')
      console.log('🏁 [HOME] Final status - Found:', dailyPostFound)

      // Load uploads for today - NO TIMEOUT, solo log dettagliati
      console.log('📸 [HOME] ===== STARTING UPLOADS FETCH =====')
      console.log('📸 [HOME] Looking for uploads with date_id:', todayId)
      let myUploadData = null
      let partnerUploadData = null
      
      try {
        console.log('📸 [HOME] Step 1: Ensuring network is enabled...')
        try {
          await enableNetwork(db)
          console.log('✅ [HOME] Network enabled for uploads query')
        } catch (networkError) {
          // Ignora errori "already-exists" - sono errori interni di Firestore non critici
          if (networkError.code !== 'already-exists') {
            console.warn('⚠️ [HOME] enableNetwork() error (continuing anyway):', networkError)
          }
        }
        
        console.log('📸 [HOME] Step 2: Creating collection reference...')
        const uploadsRef = collection(db, 'uploads')
        console.log('📸 [HOME] Collection reference created:', uploadsRef.path)
        
        console.log('📸 [HOME] Step 3: Creating query...')
        const q = query(uploadsRef, where('date_id', '==', todayId))
        console.log('📸 [HOME] Query created')
        
        console.log('📸 [HOME] Step 4: Calling getDocs() with query (cache + server)...')
        const startTime = Date.now()
        // Usa getDocs() normale che prova cache e poi server
        const querySnapshot = await getDocs(q)
        const endTime = Date.now()
        console.log(`⏱️ [HOME] getDocs() completed in ${endTime - startTime}ms`)
        console.log('📸 [HOME] Query source:', querySnapshot.metadata.fromCache ? 'cache' : 'server')

        console.log('📸 [HOME] Step 4: Processing uploads...')
        console.log('📸 [HOME] Total uploads found:', querySnapshot.size)

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data()
        console.log('📸 [HOME] Found upload:', {
            doc_id: docSnap.id,
          user_id: data.user_id,
            current_user_id: user.uid,
          isMine: data.user_id === user.uid,
            hasImage: !!data.image_url,
            date_id: data.date_id,
            allFields: Object.keys(data)
        })
        if (data.user_id === user.uid) {
          myUploadData = data
            console.log('📸 [HOME] This is MY upload')
        } else {
          partnerUploadData = data
            console.log('📸 [HOME] This is PARTNER upload')
        }
      })

        console.log('✅ [HOME] ===== UPLOADS FETCH COMPLETED =====')
        console.log('✅ [HOME] Final uploads status:', {
        myUpload: !!myUploadData,
        partnerUpload: !!partnerUploadData,
        canSeePartner: !!(myUploadData && myUploadData.image_url)
      })
      } catch (error) {
        // Ignora errori "already-exists" e "INTERNAL ASSERTION FAILED" - sono errori interni di Firestore
        if (error.code === 'already-exists' || 
            (error.message && error.message.includes('INTERNAL ASSERTION FAILED'))) {
          console.warn('⚠️ [HOME] Ignoring internal Firestore error - this is harmless:', error.message)
          // Continua normalmente, la query può comunque funzionare
        } else {
          console.error('❌ [HOME] ===== ERROR IN UPLOADS FETCH =====')
          console.error('❌ [HOME] Error name:', error.name)
          console.error('❌ [HOME] Error message:', error.message)
          console.error('❌ [HOME] Error code:', error.code)
          console.warn('⚠️ [HOME] Continuing without uploads data')
          // Continua con valori null, l'app funzionerà comunque
        }
      }

      setMyUpload(myUploadData)
      setPartnerUpload(partnerUploadData)
      setDataLoaded(true)
      setLoading(false)
      console.log('🏁 [HOME] Data loading completed successfully')
      
      // Salva il token FCM in Firestore per questo utente
      saveFCMToken()
      
      // Setup listener per monitorare nuovi upload del partner in tempo reale
      // TEMPORANEAMENTE DISABILITATO per evitare conflitti con getDocs()
      // L'errore "INTERNAL ASSERTION FAILED" si verifica quando onSnapshot() viene chiamato
      // sulla stessa collezione dove abbiamo appena fatto getDocs()
      // TODO: Riabilitare quando risolto il conflitto Firestore
      // setTimeout(() => {
      //   try {
      //     setupPartnerUploadListener()
      //   } catch (error) {
      //     console.error('❌ [HOME] Error setting up partner listener:', error)
      //     setTimeout(() => {
      //       try {
      //         setupPartnerUploadListener()
      //       } catch (retryError) {
      //         console.error('❌ [HOME] Retry also failed:', retryError)
      //       }
      //     }, 3000)
      //   }
      // }, 10000) // Delay molto lungo per evitare conflitti
    } catch (error) {
      console.error('❌ [HOME] Error loading data:', error)
      console.error('❌ [HOME] Error details:', {
        code: error.code,
        message: error.message
      })
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

  // Salva il token FCM in Firestore
  const saveFCMToken = async () => {
    if (!user) return
    
    try {
      const fcmToken = localStorage.getItem('fcmToken')
      if (fcmToken) {
        const userTokenRef = doc(db, 'user_tokens', user.uid)
        await setDoc(userTokenRef, {
          fcm_token: fcmToken,
          user_id: user.uid,
          email: user.email,
          updated_at: new Date()
        }, { merge: true })
        console.log('✅ [HOME] FCM token saved to Firestore')
      }
    } catch (error) {
      console.error('❌ [HOME] Error saving FCM token:', error)
    }
  }

  // Setup listener per monitorare nuovi upload del partner
  const setupPartnerUploadListener = () => {
    if (!user || !dateId) {
      console.log('⚠️ [HOME] Cannot setup listener - missing user or dateId', { user: !!user, dateId })
      return
    }

    console.log('👂 [HOME] Setting up partner upload listener...')
    
    // Cancella listener precedente se esiste
    if (partnerUploadListenerRef.current) {
      console.log('🧹 [HOME] Cleaning up previous listener')
      try {
        partnerUploadListenerRef.current()
      } catch (cleanupError) {
        console.warn('⚠️ [HOME] Error cleaning up previous listener:', cleanupError)
      }
      partnerUploadListenerRef.current = null
    }

    // Usa un piccolo delay aggiuntivo per assicurarsi che Firestore sia completamente pronto
    setTimeout(() => {
      try {
        // Crea query per upload del partner di oggi
        const uploadsRef = collection(db, 'uploads')
        const q = query(
          uploadsRef,
          where('date_id', '==', dateId)
        )

        console.log('👂 [HOME] Creating onSnapshot listener...')

        // Ascolta in tempo reale per nuovi documenti
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            console.log('👂 [HOME] Snapshot update received, checking for new uploads...')
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const uploadData = change.doc.data()
                const uploadUserId = uploadData.user_id

                // Verifica se è un upload del partner (non dell'utente corrente)
                if (uploadUserId && uploadUserId !== user.uid) {
                  console.log('🔔 [HOME] Partner uploaded a new photo!', uploadData)
                  
                  // Mostra notifica
                  showPartnerUploadNotification()
                }
              }
            })
          },
          (error) => {
            console.error('❌ [HOME] Partner upload listener error:', error)
            // Se c'è un errore, prova a riconnettere dopo 5 secondi
            setTimeout(() => {
              console.log('🔄 [HOME] Retrying partner upload listener...')
              setupPartnerUploadListener()
            }, 5000)
          }
        )

        partnerUploadListenerRef.current = unsubscribe
        console.log('✅ [HOME] Partner upload listener active')
      } catch (error) {
        console.error('❌ [HOME] Failed to setup partner upload listener:', error)
      }
    }, 1000) // Delay aggiuntivo di 1 secondo per sicurezza
  }

  // Mostra notifica quando il partner carica una foto
  const showPartnerUploadNotification = async () => {
    // Verifica permessi notifiche
    if (!('Notification' in window)) {
      console.warn('⚠️ [NOTIFICATIONS] Browser does not support notifications')
      return
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.warn('⚠️ [NOTIFICATIONS] Permission denied')
        return
      }
    }

    if (Notification.permission === 'granted') {
      // Se il service worker è disponibile, usalo per mostrare la notifica
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: 'Nuova foto dal partner! 💕',
          options: {
            body: 'Il tuo partner ha caricato una nuova foto. Apri l\'app per vederla!',
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            tag: 'partner-upload',
            requireInteraction: false,
            vibrate: [200, 100, 200]
          }
        })
      } else {
        // Fallback: usa Notification API direttamente
        new Notification('Nuova foto dal partner! 💕', {
          body: 'Il tuo partner ha caricato una nuova foto. Apri l\'app per vederla!',
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: 'partner-upload'
        })
      }
    }
  }

  const canSeePartnerPhoto = myUpload && myUpload.image_url

  // Show loading spinner while fetching
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-pink-50/30">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-200"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-pink-600 absolute top-0 left-0"></div>
          </div>
          <p className="text-gray-900 font-medium text-base mt-4">Caricamento dati...</p>
          <p className="text-gray-500 text-sm mt-1">Attendere prego...</p>
        </div>
      </div>
    )
  }

  // If there's an error or data wasn't loaded successfully, don't show the home page
  // Show error screen instead
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-pink-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
            MyBubiAPP
          </h1>
            </div>
          <button
            onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Esci
          </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Grid Layout for better organization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Daily Posts */}
          <div className="space-y-6">
            {(() => {
              const todayPost = dailyPosts.find(post => post.date_id === dateId)
              const pastPosts = dailyPosts.filter(post => post.date_id < dateId).sort((a, b) => b.date_id.localeCompare(a.date_id)) // Ordine decrescente (dal più recente al più vecchio)
              
              return (
                <>
                  {/* Memoria del Giorno - solo quella di oggi */}
                  {todayPost?.memory_image_url && (
                    <DailyMemory 
                      memoryImage={todayPost.memory_image_url} 
                      dateId={todayPost.date_id} 
                      themeText={todayPost.theme_text}
                    />
                  )}
                  
                  {/* Tutti i Ricordi - tutte le memorie passate */}
                  {pastPosts.length > 0 && (
                    <div className="bg-purple-300 rounded-2xl shadow-sm border border-purple-400 p-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Tutti i Ricordi</h2>
                      <div className="space-y-6">
                        {pastPosts.map((post) => (
                          post.memory_image_url && (
                            <DailyMemory key={post.date_id} memoryImage={post.memory_image_url} dateId={post.date_id} />
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>

          {/* Right Column - User Actions */}
          <div className="space-y-6">
        {/* Show my uploaded photo if exists */}
        {myUpload?.image_url && (
              <div className="bg-sky-300 rounded-2xl shadow-sm border border-sky-400 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    La Tua Foto di Oggi
            </h2>
                </div>
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                <img 
                  src={myUpload.image_url} 
                  alt="My upload" 
                      className="w-full h-full object-cover" 
                />
              </div>
              {myUpload.caption && (
                    <div className="bg-white/80 rounded-lg p-4 border-l-4 border-sky-400">
                      <p className="text-gray-700 text-sm leading-relaxed">
                  {myUpload.caption}
                </p>
                    </div>
              )}
              {myUpload.timestamp && (
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                  Caricata alle {myUpload.timestamp.toDate ? myUpload.timestamp.toDate().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Photo Upload Component (only show if not uploaded yet) */}
        {!myUpload?.image_url && (
          <PhotoUpload user={user} dateId={dateId} onUploadComplete={loadDailyData} />
        )}

            {/* Partner Photo */}
        <PartnerPhoto partnerUpload={partnerUpload} canSeePartnerPhoto={canSeePartnerPhoto} />
          </div>
        </div>
      </div>
    </div>
  )
}

