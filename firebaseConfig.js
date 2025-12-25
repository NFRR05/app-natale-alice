import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// TODO: Sostituisci con le tue credenziali Firebase
// Vai su console.firebase.google.com -> Impostazioni progetto -> Configurazione web
const firebaseConfig = {
  apiKey: "AIzaSyDcsC8bc2YhHZTYf6KfLAQkPCpCO-p_-7E",
  authDomain: "mybubiiapp.firebaseapp.com",
  projectId: "mybubiiapp",
  storageBucket: "mybubiiapp.firebasestorage.app",
  messagingSenderId: "252209352860",
  appId: "1:252209352860:web:9aaaecbc5e12e331b49d59",
  measurementId: "G-LYWGPS09HC"
};

// VAPID Key per Firebase Cloud Messaging (FCM)
// Ottieni questa chiave da Firebase Console → Impostazioni progetto → Cloud Messaging → Web Push certificates
// Genera una nuova key pair se non esiste già
export const vapidKey = 'BOIAhV6RofwqbDY3HfRbupMmt4QQ1_4aOk_daBQoyt05hLaaewiAAb_NWUYEgWBpmYu3zgq5gArvGiRjojaBqBQ' // TODO: Sostituisci con la tua VAPID key da Firebase Console

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Inizializza i servizi
export const auth = getAuth(app);

// Inizializza Firestore - specifica il database ID (diverso dal project ID)
// Il progetto è "mybubiiapp" ma il database Firestore si chiama "mybubiiapp2005"
export const db = getFirestore(app, 'mybubiiapp2005');

// Forza la connessione online all'avvio
console.log('🔧 [FIREBASE] Initializing Firestore connection...');
enableNetwork(db).then(() => {
  console.log('✅ [FIREBASE] Firestore network enabled successfully');
}).catch(err => {
  console.error('❌ [FIREBASE] Could not enable network:', err);
});

export const storage = getStorage(app);

// Initialize Firebase Cloud Messaging (FCM) for push notifications
// Only initialize if in browser and service worker is supported
let messaging = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.warn('⚠️ [FCM] Messaging not available:', error);
  }
}
export { messaging };

export default app;

