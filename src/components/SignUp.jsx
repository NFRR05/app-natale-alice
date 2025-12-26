import React, { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '../../firebaseConfig'

export default function SignUp({ onSwitchToLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validateUsername = (name) => {
    // Username must be 3-20 characters, alphanumeric and underscores only
    const regex = /^[a-zA-Z0-9_]{3,20}$/
    return regex.test(name)
  }

  const checkUsernameAvailable = async (name) => {
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('username_lowercase', '==', name.toLowerCase()))
    const snapshot = await getDocs(q)
    return snapshot.empty
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')

    console.log('📝 [SIGNUP] Starting signup process...')

    // Validations
    if (!email || !password || !confirmPassword || !username) {
      setError('Compila tutti i campi')
      return
    }

    if (!validateUsername(username)) {
      setError('Username deve essere 3-20 caratteri (lettere, numeri, underscore)')
      return
    }

    if (password.length < 6) {
      setError('La password deve essere almeno 6 caratteri')
      return
    }

    if (password !== confirmPassword) {
      setError('Le password non coincidono')
      return
    }

    setLoading(true)

    try {
      // Check if username is available
      console.log('🔍 [SIGNUP] Checking username availability...')
      const isAvailable = await checkUsernameAvailable(username)
      
      if (!isAvailable) {
        setError('Questo username è già in uso')
        setLoading(false)
        return
      }

      console.log('✅ [SIGNUP] Username available, creating account...')

      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      console.log('✅ [SIGNUP] Auth account created:', user.uid)

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: email.toLowerCase(),
        username: username,
        username_lowercase: username.toLowerCase(),
        display_name: username,
        created_at: new Date(),
        updated_at: new Date()
      })

      console.log('✅ [SIGNUP] User profile created in Firestore')
      console.log('🎉 [SIGNUP] Signup complete!')

    } catch (err) {
      console.error('❌ [SIGNUP] Error:', err)

      let errorMessage = 'Errore durante la registrazione'

      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Questa email è già registrata'
          break
        case 'auth/invalid-email':
          errorMessage = 'Email non valida'
          break
        case 'auth/weak-password':
          errorMessage = 'Password troppo debole'
          break
        case 'auth/network-request-failed':
          errorMessage = 'Errore di connessione'
          break
        default:
          errorMessage = err.message || 'Errore durante la registrazione'
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 w-full h-full">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/heartsfalling.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50 lg:bg-gradient-to-r lg:from-black/60 lg:via-black/40 lg:to-transparent" />
      </div>

      {/* Desktop Left Side */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-end p-12 text-white">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="text-2xl font-bold">MyBubiAPP</span>
          </div>
          <p className="text-3xl font-semibold mb-4 leading-tight">
            Condividi momenti speciali con chi ami
          </p>
          <p className="text-gray-300 text-lg">Crea il tuo account e inizia a condividere</p>
        </div>
      </div>

      {/* SignUp Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo - Mobile only */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <span className="text-3xl font-bold text-gray-900">MyBubiAPP</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 lg:p-10 w-full">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Crea Account
              </h1>
              <p className="text-gray-600 text-base">
                Registrati per iniziare a condividere
              </p>
            </div>

            <form onSubmit={handleSignUp} className="space-y-5">
              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                    className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-gray-900 text-base"
                    placeholder="il_tuo_username"
                    required
                    autoComplete="username"
                    maxLength={20}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">3-20 caratteri, lettere, numeri e underscore</p>
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-gray-900 text-base"
                  placeholder="la-tua-email@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-gray-900 text-base"
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Conferma Password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all text-gray-900 text-base"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-normal">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 to-red-600 hover:from-pink-600 hover:to-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              >
                <span className={`relative z-10 ${loading ? 'opacity-0' : 'opacity-100'}`}>
                  Registrati
                </span>
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
            </form>

            {/* Switch to Login */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Hai già un account?{' '}
                <button
                  onClick={onSwitchToLogin}
                  className="text-pink-600 hover:text-pink-700 font-semibold transition-colors"
                >
                  Accedi
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

