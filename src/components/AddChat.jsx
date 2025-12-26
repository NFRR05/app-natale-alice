import React, { useState, useEffect, useCallback } from 'react'
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc,
  serverTimestamp,
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore'
import { db } from '../../firebaseConfig'

export default function AddChat({ user, userProfile, onBack, onChatCreated }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Debounced search function
  const searchUsers = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 1) {
      setSearchResults([])
      setError('')
      return
    }

    setSearching(true)
    setError('')

    try {
      console.log('🔍 [ADDCHAT] Searching for:', searchTerm)
      
      const searchLower = searchTerm.toLowerCase().trim()
      
      // Firestore prefix search using range query
      // This finds all usernames that START WITH the search term
      const usersRef = collection(db, 'users')
      const q = query(
        usersRef, 
        where('username_lowercase', '>=', searchLower),
        where('username_lowercase', '<', searchLower + '\uf8ff'),
        orderBy('username_lowercase'),
        limit(10) // Limit results for performance
      )
      
      const snapshot = await getDocs(q)
      
      const results = []
      snapshot.forEach((docSnap) => {
        const userData = docSnap.data()
        // Don't include current user
        if (userData.uid !== user.uid) {
          results.push(userData)
        }
      })

      console.log('🔍 [ADDCHAT] Found:', results.length, 'users')
      setSearchResults(results)
      
      if (results.length === 0 && searchTerm.length >= 2) {
        setError('Nessun utente trovato')
      }
    } catch (err) {
      console.error('❌ [ADDCHAT] Search error:', err)
      // Check if it's an index error
      if (err.message?.includes('index')) {
        setError('Creazione indice in corso... riprova tra qualche minuto')
      } else {
        setError('Errore durante la ricerca')
      }
    } finally {
      setSearching(false)
    }
  }, [user.uid])

  // Debounce effect - search after user stops typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchUsers])

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/\s/g, '') // Remove spaces
    setSearchQuery(value)
  }

  const startConversation = async (otherUser) => {
    setCreating(true)
    setError('')

    try {
      console.log('💬 [ADDCHAT] Starting conversation with:', otherUser.username)

      // Check if conversation already exists
      const conversationsRef = collection(db, 'conversations')
      const q1 = query(
        conversationsRef,
        where('participants', 'array-contains', user.uid)
      )
      
      const existingConvos = await getDocs(q1)
      let existingConvo = null
      
      existingConvos.forEach((docSnap) => {
        const data = docSnap.data()
        if (data.participants.includes(otherUser.uid)) {
          existingConvo = { id: docSnap.id, ...data }
        }
      })

      if (existingConvo) {
        console.log('💬 [ADDCHAT] Conversation already exists:', existingConvo.id)
        // Fetch other user data and add to convo
        const otherUserDoc = await getDoc(doc(db, 'users', otherUser.uid))
        onChatCreated({
          ...existingConvo,
          otherUser: otherUserDoc.exists() ? otherUserDoc.data() : otherUser
        })
        return
      }

      // Create new conversation
      const convoId = [user.uid, otherUser.uid].sort().join('_')
      
      const conversationData = {
        participants: [user.uid, otherUser.uid],
        participant_usernames: {
          [user.uid]: userProfile?.username || user.email,
          [otherUser.uid]: otherUser.username
        },
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        created_by: user.uid
      }
      
      await setDoc(doc(db, 'conversations', convoId), conversationData)

      console.log('✅ [ADDCHAT] Conversation created:', convoId)

      // Wait a moment for Firestore to propagate the new document
      await new Promise(resolve => setTimeout(resolve, 200))

      // Pass complete conversation object with otherUser
      onChatCreated({
        id: convoId,
        ...conversationData,
        created_at: new Date(), // Use current time for client-side display
        updated_at: new Date(),
        otherUser
      })

    } catch (err) {
      console.error('❌ [ADDCHAT] Error creating conversation:', err)
      setError('Errore durante la creazione della chat')
      setCreating(false)
    }
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

  // Highlight matching part of username
  const highlightMatch = (username) => {
    if (!searchQuery) return username
    const lowerUsername = username.toLowerCase()
    const lowerQuery = searchQuery.toLowerCase()
    
    if (lowerUsername.startsWith(lowerQuery)) {
      return (
        <>
          <span className="text-pink-600 font-bold">{username.slice(0, searchQuery.length)}</span>
          {username.slice(searchQuery.length)}
        </>
      )
    }
    return username
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-pink-50/20 to-rose-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-gray-200/50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 h-16">
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100/80 text-gray-700 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Nuova Chat</h1>
              <p className="text-xs text-gray-500">Cerca un utente per iniziare</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Search Input */}
        <div className="mb-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Cerca per username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
              <input
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                placeholder="Inizia a digitare..."
                className="w-full pl-9 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-gray-900 text-base"
                autoFocus
              />
              {/* Search/Loading indicator */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {searching ? (
                  <div className="w-5 h-5 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
                ) : searchQuery ? (
                  <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>
            </div>
            
            {/* Live search hint */}
            <p className="mt-2 text-xs text-gray-500">
              {searchQuery 
                ? `Cercando utenti che iniziano con "${searchQuery}"...`
                : 'I risultati appariranno mentre digiti'
              }
            </p>

            {/* Error */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <span>Risultati</span>
              <span className="bg-pink-100 text-pink-600 text-xs px-2 py-0.5 rounded-full">
                {searchResults.length}
              </span>
            </h3>
            {searchResults.map((resultUser) => (
              <div
                key={resultUser.uid}
                className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-4 hover:shadow-xl transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  {resultUser.profile_picture_url ? (
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-pink-200 shadow-lg">
                      <img 
                        src={resultUser.profile_picture_url} 
                        alt={resultUser.display_name || resultUser.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarColor(resultUser.username)} flex items-center justify-center shadow-lg`}>
                      <span className="text-white font-bold text-lg">
                        {getInitials(resultUser.display_name || resultUser.username)}
                      </span>
                    </div>
                  )}
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {resultUser.display_name || resultUser.username}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      @{highlightMatch(resultUser.username)}
                    </p>
                  </div>
                  
                  {/* Add Button */}
                  <button
                    onClick={() => startConversation(resultUser)}
                    disabled={creating}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-red-600 hover:from-pink-600 hover:to-red-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2"
                  >
                    {creating ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    )}
                    Chatta
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State - No query yet */}
        {!searchQuery && (
          <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-6 border border-pink-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Come funziona</h4>
                <p className="text-sm text-gray-600">
                  Digita le prime lettere dell'username della persona che cerchi.
                  I risultati appariranno automaticamente mentre scrivi!
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs bg-white px-3 py-1 rounded-full text-gray-600 border border-pink-200">
                    @M → Marco, Maria, Max...
                  </span>
                  <span className="text-xs bg-white px-3 py-1 rounded-full text-gray-600 border border-pink-200">
                    @Al → Alice, Alex, Alberto...
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No results state */}
        {searchQuery && searchResults.length === 0 && !searching && !error && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-gray-600">Nessun utente trovato con "@{searchQuery}"</p>
            <p className="text-gray-400 text-sm mt-1">Prova con lettere diverse</p>
          </div>
        )}
      </main>
    </div>
  )
}
