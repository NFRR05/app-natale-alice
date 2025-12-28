import React, { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  setDoc,
  onSnapshot,
  orderBy
} from 'firebase/firestore'
import { getToken } from 'firebase/messaging'
import { auth, db, messaging, vapidKey } from '../../firebaseConfig'
import { useTheme } from '../contexts/ThemeContext'

export default function Dashboard({ user, userProfile, onSelectChat, onAddChat, onProfileClick }) {
  const { theme, toggleTheme } = useTheme()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notificationStatus, setNotificationStatus] = useState('default') // 'default', 'granted', 'denied', 'unsupported'

  // Check notification permission status
  useEffect(() => {
    if (!('Notification' in window)) {
      setNotificationStatus('unsupported')
      return
    }
    setNotificationStatus(Notification.permission)
  }, [])

  // Request notification permission and save FCM token
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      // Browser doesn't support notifications - handled by notificationStatus state
      return
    }

    try {
      console.log('🔔 [DASHBOARD] Requesting notification permission...')
      const permission = await Notification.requestPermission()
      setNotificationStatus(permission)
      console.log('🔔 [DASHBOARD] Permission result:', permission)

      if (permission === 'granted' && messaging) {
        // Get and save FCM token
        try {
          const token = await getToken(messaging, { vapidKey })
          if (token) {
            console.log('✅ [DASHBOARD] FCM token obtained')
            await setDoc(doc(db, 'user_tokens', user.uid), {
              user_id: user.uid,
              email: user.email,
              username: userProfile?.username || '',
              fcm_token: token,
              updated_at: new Date()
            }, { merge: true })
            console.log('✅ [DASHBOARD] FCM token saved to Firestore')
          }
        } catch (tokenError) {
          console.error('❌ [DASHBOARD] Error getting FCM token:', tokenError)
        }
      }
    } catch (error) {
      console.error('❌ [DASHBOARD] Error requesting permission:', error)
    }
  }

  useEffect(() => {
    if (!user) return

    console.log('📋 [DASHBOARD] Loading conversations for user:', user.uid)
    
    // Subscribe to conversations where user is a participant
    const conversationsRef = collection(db, 'conversations')
    const q = query(
      conversationsRef, 
      where('participants', 'array-contains', user.uid),
      orderBy('updated_at', 'desc')
    )

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log('📋 [DASHBOARD] Conversations snapshot received:', snapshot.docs.length)
      
      const convos = []
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        
        // Get the other participant's info
        const otherUserId = data.participants.find(p => p !== user.uid)
        let otherUser = null
        
        if (otherUserId) {
          try {
            const otherUserDoc = await getDoc(doc(db, 'users', otherUserId))
            if (otherUserDoc.exists()) {
              otherUser = otherUserDoc.data()
            }
          } catch (err) {
            console.warn('⚠️ [DASHBOARD] Could not fetch user:', otherUserId)
          }
        }
        
        convos.push({
          id: docSnap.id,
          ...data,
          otherUser
        })
      }
      
      setConversations(convos)
      setLoading(false)
    }, (err) => {
      console.error('❌ [DASHBOARD] Error loading conversations:', err)
      setError(err.message)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleLogout = async () => {
    console.log('🚪 [DASHBOARD] Logging out...')
    try {
      await signOut(auth)
      console.log('✅ [DASHBOARD] Logout successful')
    } catch (error) {
      console.error('❌ [DASHBOARD] Logout error:', error)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Adesso'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min fa`
    if (diff < 86400000) return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    if (diff < 604800000) return date.toLocaleDateString('it-IT', { weekday: 'short' })
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getAvatarColor = (str) => {
    if (!str) return 'from-gray-400 to-gray-500'
    const colors = [
      'from-pink-400 to-rose-500',
      'from-violet-400 to-purple-500',
      'from-blue-400 to-cyan-500',
      'from-emerald-400 to-teal-500',
      'from-amber-400 to-orange-500',
      'from-red-400 to-pink-500',
    ]
    const index = str.charCodeAt(0) % colors.length
    return colors[index]
  }

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
          <p className="text-white font-medium text-lg">Caricamento chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/20 to-rose-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                MyBubiAPP
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ciao, @{userProfile?.username || user.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-300 transition-all"
                title={theme === 'dark' ? 'Modalità chiara' : 'Modalità scura'}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              {/* Profile Icon */}
              <button
                onClick={() => {
                  if (onProfileClick) {
                    onProfileClick()
                  } else if (window.profileClickHandler) {
                    window.profileClickHandler()
                  }
                }}
                className="relative p-2 rounded-lg hover:bg-gray-100/80 text-gray-700 transition-all"
                title="Profilo"
              >
                {userProfile?.profile_picture_url ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-pink-200">
                    <img 
                      src={userProfile.profile_picture_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center border-2 border-pink-200">
                    <span className="text-white font-bold text-sm">
                      {(userProfile?.display_name || userProfile?.username || user.email?.split('@')[0] || '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </button>
              
              {/* Notification Bell */}
              {notificationStatus !== 'unsupported' && (
                <button
                  onClick={requestNotificationPermission}
                  className={`relative p-2 rounded-lg transition-all duration-200 ${
                    notificationStatus === 'granted'
                      ? 'text-green-600 bg-green-50 hover:bg-green-100'
                      : notificationStatus === 'denied'
                      ? 'text-red-500 bg-red-50 hover:bg-red-100'
                      : 'text-amber-500 bg-amber-50 hover:bg-amber-100 animate-pulse'
                  }`}
                  title={
                    notificationStatus === 'granted'
                      ? 'Notifiche attive'
                      : notificationStatus === 'denied'
                      ? 'Notifiche bloccate - clicca per info'
                      : 'Clicca per attivare le notifiche'
                  }
                >
                  {notificationStatus === 'granted' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
                    </svg>
                  ) : notificationStatus === 'denied' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm0-15.5c2.49 0 4 2.02 4 4.5v.1l2 2V11c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68c-.24.06-.47.15-.69.23L12 7.1V6.5zM5.41 3.35L4 4.76l2.81 2.81C6.29 8.57 6 9.74 6 11v5l-2 2v1h14.24l1.74 1.74 1.41-1.41L5.41 3.35zM16 17H8v-6c0-.68.12-1.32.34-1.9L16 16.76V17z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  )}
                  {/* Pulsing dot for default state */}
                  {notificationStatus === 'default' && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                  )}
                </button>
              )}
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-lg transition-all duration-200"
              >
                Esci
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Title Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Le tue Chat</h2>
            <button
              onClick={onAddChat}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-red-600 hover:from-pink-600 hover:to-red-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nuova Chat
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            {conversations.length === 0 
              ? 'Inizia una nuova conversazione!'
              : `${conversations.length} conversazion${conversations.length === 1 ? 'e' : 'i'}`
            }
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        {/* Conversations List */}
        {conversations.length === 0 ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nessuna chat ancora</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Inizia a condividere momenti speciali con qualcuno!
            </p>
            <button
              onClick={onAddChat}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-red-600 hover:from-pink-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Inizia una Chat
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => onSelectChat(convo)}
                className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 text-left group"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  {convo.otherUser?.profile_picture_url ? (
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-pink-200 shadow-lg group-hover:scale-110 transition-transform">
                      <img 
                        src={convo.otherUser.profile_picture_url} 
                        alt={convo.otherUser.display_name || convo.otherUser.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarColor(convo.otherUser?.username)} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <span className="text-white font-bold text-lg">
                        {getInitials(convo.otherUser?.display_name || convo.otherUser?.username)}
                      </span>
                    </div>
                  )}
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {convo.otherUser?.display_name || convo.otherUser?.username || 'Utente'}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {formatDate(convo.updated_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      @{convo.otherUser?.username || 'unknown'}
                    </p>
                    {convo.last_message && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate mt-1">
                        {convo.last_message}
                      </p>
                    )}
                  </div>
                  
                  {/* Arrow */}
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

