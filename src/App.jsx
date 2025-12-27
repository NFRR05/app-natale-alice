import React, { useState, useEffect, useRef } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { enableNetwork, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { auth, db, messaging, vapidKey } from '../firebaseConfig'
import { getToken, onMessage } from 'firebase/messaging'
import { ToastProvider } from './contexts/ToastContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Login from './components/Login'
import SignUp from './components/SignUp'
import Dashboard from './components/Dashboard'
import ChatRoom from './components/ChatRoom'
import AddChat from './components/AddChat'
import Profile from './components/Profile'

function App() {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authView, setAuthView] = useState('login') // 'login' or 'signup'
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard', 'chat', 'addChat', 'profile'
  const [selectedConversation, setSelectedConversation] = useState(null)
  const inactivityTimerRef = useRef(null)
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000 // 5 minutes

  useEffect(() => {
    console.log('🚀 [APP] Initializing app...')
    
    enableNetwork(db).then(() => {
      console.log('✅ [APP] Firestore network enabled')
    }).catch(err => {
      console.warn('⚠️ [APP] Could not enable Firestore network:', err)
    })
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('🔐 [APP] Auth state changed')
      if (currentUser) {
        console.log('✅ [APP] User is authenticated:', {
          uid: currentUser.uid,
          email: currentUser.email
        })
        setUser(currentUser)
        
        // Fetch or create user profile
        await fetchOrCreateUserProfile(currentUser)
        
        setupNotifications()
        setupPushNotifications(currentUser)
      } else {
        console.log('👤 [APP] No user authenticated')
        setUser(null)
        setUserProfile(null)
        setCurrentView('dashboard')
        setSelectedConversation(null)
      }
      setLoading(false)
    })
    return () => {
      clearInactivityTimer()
      unsubscribe()
    }
  }, [])

  const fetchOrCreateUserProfile = async (currentUser) => {
    try {
      console.log('👤 [APP] Fetching user profile...')
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
      
      if (userDoc.exists()) {
        console.log('✅ [APP] User profile found')
        setUserProfile(userDoc.data())
      } else {
        // Create basic profile if doesn't exist (for users who signed up before this update)
        console.log('📝 [APP] Creating user profile...')
        const newProfile = {
          uid: currentUser.uid,
          email: currentUser.email,
          username: currentUser.email.split('@')[0],
          username_lowercase: currentUser.email.split('@')[0].toLowerCase(),
          display_name: currentUser.email.split('@')[0],
          created_at: new Date(),
          updated_at: new Date()
        }
        await setDoc(doc(db, 'users', currentUser.uid), newProfile)
        setUserProfile(newProfile)
        console.log('✅ [APP] User profile created')
      }
    } catch (error) {
      console.error('❌ [APP] Error fetching/creating user profile:', error)
      // Create a minimal profile in memory even if Firestore fails
      setUserProfile({
        uid: currentUser.uid,
        email: currentUser.email,
        username: currentUser.email.split('@')[0]
      })
    }
  }

  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
  }

  useEffect(() => {
    if (!user) {
      clearInactivityTimer()
      return
    }

    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'keydown'
    ]

    const resetInactivityTimer = () => {
      clearInactivityTimer()
      inactivityTimerRef.current = setTimeout(() => {
        console.log('⏱️ [INACTIVITY] Auto-logging out...')
        signOut(auth)
      }, INACTIVITY_TIMEOUT)
    }

    const handleActivity = () => resetInactivityTimer()

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    resetInactivityTimer()

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      clearInactivityTimer()
    }
  }, [user])

  // Real-time listener for user profile updates (for streak, etc.)
  useEffect(() => {
    if (!user) {
      setUserProfile(null)
      return
    }

    console.log('👂 [APP] Setting up profile listener...')
    const unsubscribeProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          console.log('🔄 [APP] User profile updated (real-time):', docSnap.data())
          setUserProfile(docSnap.data())
        }
      },
      (error) => {
        console.error('❌ [APP] Error listening to profile updates:', error)
      }
    )

    return () => {
      console.log('🔇 [APP] Unsubscribing from profile updates')
      unsubscribeProfile()
    }
  }, [user])

  const setupNotifications = async () => {
    if (!('Notification' in window)) return

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
    }
    
    if (Notification.permission === 'granted') {
      scheduleDailyNotification()
    }
  }

  const setupPushNotifications = async (currentUser) => {
    if (!messaging) return

    try {
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
        } catch (swError) {
          console.error('❌ [FCM] Service worker registration failed:', swError)
          return
        }
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
      
      if (!vapidKey || vapidKey === 'YOUR_VAPID_KEY_HERE') return
      
      try {
        const token = await getToken(messaging, { vapidKey })
        if (token) {
          const tokenRef = doc(db, 'user_tokens', currentUser.uid)
          await setDoc(tokenRef, {
            user_id: currentUser.uid,
            email: currentUser.email,
            fcm_token: token,
            updated_at: new Date()
          }, { merge: true })
        }
      } catch (tokenError) {
        console.error('❌ [FCM] Error getting token:', tokenError)
      }

      onMessage(messaging, (payload) => {
        if (Notification.permission === 'granted') {
          new Notification(payload.notification?.title || 'MyBubiAPP', {
            body: payload.notification?.body || '',
            icon: payload.notification?.icon || '/favicon.svg',
            badge: '/favicon.svg'
          })
        }
      })
    } catch (error) {
      console.error('❌ [FCM] Error setting up push notifications:', error)
    }
  }

  const scheduleDailyNotification = () => {
    const now = new Date()
    const notificationTime = new Date()
    notificationTime.setHours(13, 0, 0, 0)
    
    if (now > notificationTime) {
      notificationTime.setDate(notificationTime.getDate() + 1)
    }
    
    const timeUntilNotification = notificationTime.getTime() - now.getTime()
    
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification('È ora della foto! 📸', {
          body: 'Non dimenticare di condividere il tuo momento speciale di oggi!',
          icon: '/favicon.png',
          badge: '/favicon.png',
          tag: 'daily-photo-reminder'
        })
      }
      scheduleDailyNotification()
    }, timeUntilNotification)
  }

  // Navigation handlers
  const handleSelectChat = (conversation) => {
    console.log('💬 [APP] Selecting conversation:', conversation.id)
    setSelectedConversation(conversation)
    setCurrentView('chat')
  }

  const handleAddChat = () => {
    setCurrentView('addChat')
  }

  const handleBackToDashboard = () => {
    setCurrentView('dashboard')
    setSelectedConversation(null)
  }

  const handleChatCreated = (conversation) => {
    console.log('✅ [APP] Chat created, opening:', conversation.id)
    setSelectedConversation(conversation)
    setCurrentView('chat')
  }

  const handleProfileClick = () => {
    setCurrentView('profile')
  }

  const handleProfileUpdate = (updatedProfile) => {
    setUserProfile(updatedProfile)
    setCurrentView('dashboard')
  }

  const handleAccountDeleted = () => {
    // User account deleted, will be logged out automatically
    setCurrentView('dashboard')
    setUserProfile(null)
  }

  // Expose profile click handler for Dashboard
  useEffect(() => {
    if (currentView === 'dashboard') {
      window.profileClickHandler = handleProfileClick
    } else {
      window.profileClickHandler = null
    }
    return () => {
      window.profileClickHandler = null
    }
  }, [currentView])

  // Loading screen
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

  // Not authenticated - show login or signup
  if (!user) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
            {authView === 'login' ? (
              <Login onSwitchToSignUp={() => setAuthView('signup')} />
            ) : (
              <SignUp onSwitchToLogin={() => setAuthView('login')} />
            )}
          </div>
        </ToastProvider>
      </ThemeProvider>
    )
  }

  // Authenticated - show app views
  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/20 to-rose-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-200">
        {currentView === 'dashboard' && (
          <Dashboard 
            user={user}
            userProfile={userProfile}
            onSelectChat={handleSelectChat}
            onAddChat={handleAddChat}
            onProfileClick={handleProfileClick}
          />
        )}
        
        {currentView === 'addChat' && (
          <AddChat 
            user={user}
            userProfile={userProfile}
            onBack={handleBackToDashboard}
            onChatCreated={handleChatCreated}
          />
        )}
        
        {currentView === 'chat' && selectedConversation && (
          <ChatRoom 
            user={user}
            conversation={selectedConversation}
            onBack={handleBackToDashboard}
          />
        )}

        {currentView === 'profile' && (
          <Profile 
            user={user}
            userProfile={userProfile}
            onBack={handleBackToDashboard}
            onProfileUpdate={handleProfileUpdate}
            onAccountDeleted={handleAccountDeleted}
          />
        )}
        </div>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
