import React, { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../firebaseConfig'

const ALLOWED_EMAILS = [
  'riccardoremec05@gmail.com',
  'alicebiancato5@gmail.com',
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    
    console.log('🔐 [LOGIN] Attempting login...')
    console.log('📧 [LOGIN] Email:', email)
    console.log('✅ [LOGIN] Allowed emails:', ALLOWED_EMAILS)
    
    if (!email || !password) {
      console.warn('⚠️ [LOGIN] Missing email or password')
      setError('Inserisci email e password')
      return
    }

    if (!ALLOWED_EMAILS.includes(email.toLowerCase())) {
      console.warn('🚫 [LOGIN] Email not authorized:', email)
      setError('Questa email non è autorizzata')
      return
    }

    console.log('✅ [LOGIN] Email is authorized, proceeding with Firebase auth...')
    setLoading(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      console.log('✅ [LOGIN] Login successful!')
      console.log('👤 [LOGIN] User:', {
        uid: userCredential.user.uid,
        email: userCredential.user.email
      })
    } catch (err) {
      console.error('❌ [LOGIN] Login failed:', err)
      console.error('❌ [LOGIN] Error code:', err.code)
      console.error('❌ [LOGIN] Error message:', err.message)
      
      // Traduci gli errori Firebase in messaggi user-friendly
      let errorMessage = 'Errore durante l\'accesso'
      
      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
        case 'auth/invalid-email':
          errorMessage = 'Email o password errata'
          break
        case 'auth/user-disabled':
          errorMessage = 'Questo account è stato disabilitato'
          break
        case 'auth/too-many-requests':
          errorMessage = 'Troppi tentativi falliti. Riprova più tardi'
          break
        case 'auth/network-request-failed':
          errorMessage = 'Errore di connessione. Verifica la tua connessione internet'
          break
        default:
          errorMessage = 'Errore durante l\'accesso. Riprova più tardi'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
      console.log('🏁 [LOGIN] Login process completed')
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Video Background - Always visible */}
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
        {/* Overlay scuro per mobile, gradient per desktop */}
        <div className="absolute inset-0 bg-black/50 lg:bg-gradient-to-r lg:from-black/60 lg:via-black/40 lg:to-transparent" />
      </div>

      {/* Desktop Left Side - Testimonial */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col justify-end p-12 text-white">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="text-2xl font-bold">MyBubiAPP</span>
          </div>
          <p className="text-3xl font-semibold mb-4 leading-tight">
            Semplicemente tutto ciò che io e il mio partner ci serviamo.
          </p>
          <p className="text-gray-300 text-lg">La nostra app per i momenti speciali</p>
        </div>
      </div>

      {/* Login Form Section */}
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
                Bentornato su MyBubiAPP
              </h1>
              <p className="text-gray-600 text-base">
                Condividi i tuoi momenti speciali con chi ami
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
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
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                    aria-label={showPassword ? "Nascondi password" : "Mostra password"}
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

              {/* Forgot Password & Remember Me */}
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    rememberMe ? 'bg-pink-500' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                      rememberMe ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                  <span className="ml-3 text-sm text-gray-700 font-normal">
                    Ricorda i dettagli di accesso
                  </span>
                </label>
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
                  Accedi
                </span>
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
            </form>

            {/* Footer Text */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                App privata per coppie 💕
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

