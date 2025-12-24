import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, enableNetwork, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Inizializza i servizi
export const auth = getAuth(app);

// Inizializza Firestore - DISABILITATA PERSISTENZA OFFLINE (solo memoria)
// Questo previene errori "INTERNAL ASSERTION FAILED" causati da cache IndexedDB corrotta
// Usa memoryLocalCache() invece della persistenza su disco (IndexedDB)
// Specifica anche il database ID (diverso dal project ID)
// Il progetto è "mybubiiapp" ma il database Firestore si chiama "mybubiiapp2005"
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  databaseId: 'mybubiiapp2005'
});

// Forza la connessione online all'avvio
console.log('🔧 [FIREBASE] Initializing Firestore connection...');
enableNetwork(db).then(() => {
  console.log('✅ [FIREBASE] Firestore network enabled successfully');
}).catch(err => {
  console.error('❌ [FIREBASE] Could not enable network:', err);
});

export const storage = getStorage(app);

export { app };
export default app;

