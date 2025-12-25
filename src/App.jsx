import React, { useState, useEffect, useRef } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { enableNetwork, collection, doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db, messaging, vapidKey } from '../firebaseConfig'
import { getToken, onMessage } from 'firebase/messaging'
import Login from './components/Login'
import Home from './components/Home'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const inactivityTimerRef = useRef(null)
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000 // 5 minutes in milliseconds

  useEffect(() => {
    console.log('🚀 [APP] Initializing app...')
    console.log('🔍 [APP] Checking auth state...')
    
    // Forza la connessione online di Firestore
    enableNetwork(db).then(() => {
      console.log('✅ [APP] Firestore network enabled')
    }).catch(err => {
      console.warn('⚠️ [APP] Could not enable Firestore network:', err)
    })
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('🔐 [APP] Auth state changed')
      if (currentUser) {
        console.log('✅ [APP] User is authenticated:', {
          uid: currentUser.uid,
          email: currentUser.email
        })
        setUser(currentUser)
        setupNotifications()
        setupPushNotifications(currentUser)
      } else {
        console.log('👤 [APP] No user authenticated')
        setUser(null)
      }
      setLoading(false)
      console.log('✅ [APP] App initialized')
    })
    return () => {
      console.log('🧹 [APP] Cleaning up auth listener')
      clearInactivityTimer()
      unsubscribe()
    }
  }, [])

  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      console.log('⏱️ [INACTIVITY] Clearing inactivity timer')
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
  }

  useEffect(() => {
    if (!user) {
      clearInactivityTimer()
      return
    }

    console.log('⏱️ [INACTIVITY] Setting up inactivity timer (5 minutes)')
    
    // List of events that indicate user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ]

    const resetInactivityTimer = () => {
      clearInactivityTimer()
      console.log('⏱️ [INACTIVITY] Resetting inactivity timer (5 minutes)')
      inactivityTimerRef.current = setTimeout(() => {
        console.log('⏱️ [INACTIVITY] Inactivity timeout reached (5 minutes)')
        console.log('🚪 [INACTIVITY] Auto-logging out due to inactivity...')
        handleAutoLogout()
      }, INACTIVITY_TIMEOUT)
    }

    const handleAutoLogout = async () => {
      try {
        console.log('🔒 [INACTIVITY] Forcing logout due to inactivity')
        await signOut(auth)
        console.log('✅ [INACTIVITY] Auto-logout successful')
      } catch (error) {
        console.error('❌ [INACTIVITY] Auto-logout error:', error)
      }
    }

    // Reset timer on any user activity
    const handleActivity = () => {
      resetInactivityTimer()
    }

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Start the timer
    resetInactivityTimer()

    // Cleanup function
    return () => {
      console.log('🧹 [INACTIVITY] Cleaning up activity listeners')
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      clearInactivityTimer()
    }
  }, [user])

  const setupNotifications = async () => {
    console.log('🔔 [NOTIFICATIONS] Setting up notifications...')
    
    if (!('Notification' in window)) {
      console.warn('⚠️ [NOTIFICATIONS] Browser does not support notifications')
      return
    }

    console.log('📱 [NOTIFICATIONS] Current permission:', Notification.permission)

    if (Notification.permission === 'default') {
      console.log('🔔 [NOTIFICATIONS] Requesting permission...')
      const permission = await Notification.requestPermission()
      console.log('📱 [NOTIFICATIONS] Permission result:', permission)
      if (permission !== 'granted') {
        console.warn('⚠️ [NOTIFICATIONS] Permission denied')
        return
      }
    }
    
    if (Notification.permission === 'granted') {
      console.log('✅ [NOTIFICATIONS] Permission granted, scheduling notification')
      scheduleDailyNotification()
    }
  }

  // Setup Firebase Cloud Messaging (FCM) for push notifications
  const setupPushNotifications = async (currentUser) => {
    if (!messaging) {
      console.warn('⚠️ [FCM] Messaging not available')
      return
    }

    try {
      console.log('🔔 [FCM] Setting up push notifications...')
      
      // Register service worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/'
          })
          console.log('✅ [FCM] Service worker registered:', registration.scope)
        } catch (swError) {
          console.error('❌ [FCM] Service worker registration failed:', swError)
          return
        }
      } else {
        console.error('❌ [FCM] Service workers not supported in this browser')
        return
      }

      // Request notification permission
      console.log('🔔 [FCM] Requesting notification permission...')
      const permission = await Notification.requestPermission()
      console.log('📱 [FCM] Permission result:', permission)
      
      if (permission !== 'granted') {
        console.warn('⚠️ [FCM] Notification permission denied or dismissed. Permission:', permission)
        console.warn('⚠️ [FCM] User must grant notification permission for push notifications to work')
        return
      }
      
      console.log('✅ [FCM] Notification permission granted!')

      // Get FCM token
      console.log('🔑 [FCM] Checking VAPID key...')
      console.log('🔑 [FCM] VAPID key exists:', !!vapidKey)
      console.log('🔑 [FCM] VAPID key is placeholder:', vapidKey === 'YOUR_VAPID_KEY_HERE')
      
      if (!vapidKey || vapidKey === 'YOUR_VAPID_KEY_HERE') {
        console.error('❌ [FCM] VAPID key not configured!')
        console.error('❌ [FCM] Current VAPID key value:', vapidKey ? 'Set but invalid' : 'Not set')
        console.error('❌ [FCM] Get it from Firebase Console → Cloud Messaging → Web Push certificates')
        return
      }
      
      console.log('✅ [FCM] VAPID key is valid, requesting FCM token...')
      console.log('🔑 [FCM] VAPID key preview:', vapidKey.substring(0, 20) + '...')
      
      try {
        const token = await getToken(messaging, { vapidKey })
        
        if (token) {
          console.log('✅ [FCM] FCM token obtained:', token.substring(0, 20) + '...')
          console.log('💾 [FCM] Saving token to Firestore...')
          
          // Save token to Firestore
          const tokenRef = doc(collection(db, 'user_tokens'), currentUser.uid)
          await setDoc(tokenRef, {
            user_id: currentUser.uid,
            email: currentUser.email,
            fcm_token: token,
            updated_at: new Date()
          }, { merge: true })
          
          console.log('✅ [FCM] Token saved to Firestore successfully!')
          console.log('👤 [FCM] User ID:', currentUser.uid)
          console.log('📧 [FCM] Email:', currentUser.email)
        } else {
          console.warn('⚠️ [FCM] No FCM token available')
          console.warn('⚠️ [FCM] This might happen if:')
          console.warn('⚠️ [FCM] - Service worker is not registered correctly')
          console.warn('⚠️ [FCM] - VAPID key is incorrect')
          console.warn('⚠️ [FCM] - Permission was not granted')
        }
      } catch (tokenError) {
        console.error('❌ [FCM] Error getting FCM token:', tokenError)
        console.error('❌ [FCM] Error code:', tokenError.code)
        console.error('❌ [FCM] Error message:', tokenError.message)
        console.error('❌ [FCM] Full error:', tokenError)
      }

      // Handle foreground messages
      onMessage(messaging, (payload) => {
        console.log('📨 [FCM] Foreground message received:', payload)
        
        // Show notification even when app is in foreground
        if (Notification.permission === 'granted') {
          new Notification(payload.notification?.title || 'MyBubiAPP', {
            body: payload.notification?.body || '',
            icon: payload.notification?.icon || '/favicon.svg',
            badge: '/favicon.svg',
            tag: payload.data?.type || 'default',
            data: payload.data || {}
          })
        }
      })
    } catch (error) {
      console.error('❌ [FCM] Error setting up push notifications:', error)
      console.error('❌ [FCM] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      })
    }
  }

  const scheduleDailyNotification = () => {
    const now = new Date()
    const notificationTime = new Date()
    notificationTime.setHours(13, 0, 0, 0)
    
    // If it's already past 13:00 today, schedule for tomorrow
    if (now > notificationTime) {
      notificationTime.setDate(notificationTime.getDate() + 1)
    }
    
    const timeUntilNotification = notificationTime.getTime() - now.getTime()
    const hoursUntil = Math.floor(timeUntilNotification / (1000 * 60 * 60))
    const minutesUntil = Math.floor((timeUntilNotification % (1000 * 60 * 60)) / (1000 * 60))
    
    console.log('⏰ [NOTIFICATIONS] Notification scheduled for:', notificationTime.toLocaleString('it-IT'))
    console.log('⏰ [NOTIFICATIONS] Time until notification:', `${hoursUntil}h ${minutesUntil}m`)
    
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        console.log('🔔 [NOTIFICATIONS] Sending notification now!')
        new Notification('È ora della foto! 📸', {
          body: 'Non dimenticare di condividere il tuo momento speciale di oggi!',
          icon: '/favicon.png',
          badge: '/favicon.png',
          tag: 'daily-photo-reminder'
        })
      }
      // Schedule next day
      scheduleDailyNotification()
    }, timeUntilNotification)
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/single-heart.mp4" type="video/mp4" />
        </video>
        {/* Overlay con testo */}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <p className="text-white font-medium text-lg">Caricamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {!user ? <Login /> : <Home user={user} />}
    </div>
  )
}

export default App

