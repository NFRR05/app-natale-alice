# 🔔 Setup Notifiche Push (FCM)

Questa guida spiega come configurare le notifiche push che funzionano anche quando il browser è chiuso.

## 📋 Requisiti

1. **Firebase Cloud Messaging (FCM)** abilitato nel progetto
2. **Service Worker** registrato
3. **VAPID Key** generata da Firebase Console
4. **Cloud Functions** deployate

## 🚀 Passi per il Setup

### 1. Genera la VAPID Key

1. Vai su [Firebase Console](https://console.firebase.google.com)
2. Seleziona il tuo progetto (`mybubiiapp`)
3. Vai su **Impostazioni progetto** (icona ingranaggio) → **Cloud Messaging**
4. Scorri fino a **Web Push certificates**
5. Se non esiste già, clicca su **Generate key pair**
6. Copia la **Key pair** generata (questa è la tua VAPID key)

### 2. Aggiungi la VAPID Key all'App

Apri `src/App.jsx` e cerca questa riga:

```javascript
const vapidKey = 'YOUR_VAPID_KEY_HERE' // You'll need to get this from Firebase Console
```

Sostituisci `YOUR_VAPID_KEY_HERE` con la VAPID key che hai copiato.

**Esempio:**
```javascript
const vapidKey = 'BKxY...' // La tua VAPID key completa
```

### 3. Deploya le Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Questo deployerà:
- `notifyPartnerOnUpload`: Notifica quando il partner carica una foto
- `notifyMidnightMemory`: Notifica ogni mezzanotte quando c'è un nuovo ricordo

### 4. Verifica il Service Worker

Il service worker è già configurato in `public/firebase-messaging-sw.js`.

Assicurati che:
- Il file sia accessibile all'URL `/firebase-messaging-sw.js`
- Il service worker sia registrato correttamente (controlla la console del browser)

### 5. Testa le Notifiche

1. **Apri l'app nel browser**
2. **Accedi con un account**
3. **Controlla la console** - dovresti vedere:
   ```
   ✅ [FCM] Service worker registered
   ✅ [FCM] FCM token obtained
   ✅ [FCM] Token saved to Firestore
   ```

4. **Verifica in Firestore**:
   - Vai su Firestore Database
   - Controlla la collezione `user_tokens`
   - Dovresti vedere un documento con il tuo `user_id` e `fcm_token`

## 📱 Come Funzionano le Notifiche

### 1. Notifica Partner Upload
- **Quando**: Quando il partner carica una foto
- **Trigger**: Cloud Function `notifyPartnerOnUpload` si attiva automaticamente
- **Funziona**: ✅ Anche quando il browser è chiuso

### 2. Notifica Mezzanotte (Nuovo Ricordo)
- **Quando**: Ogni giorno alle 00:00 (mezzanotte) ora italiana
- **Trigger**: Cloud Function `notifyMidnightMemory` schedulata
- **Condizione**: Solo se esiste un `daily_posts` per oggi con `memory_image_url`
- **Funziona**: ✅ Anche quando il browser è chiuso

### 3. Notifica Giornaliera 13:00
- **Quando**: Ogni giorno alle 13:00
- **Trigger**: Web Notifications API (solo quando browser è aperto)
- **Funziona**: ⚠️ Solo quando il browser/tab è aperto

## 🔧 Troubleshooting

### Le notifiche non funzionano quando il browser è chiuso

1. **Verifica la VAPID key**:
   - Assicurati che sia corretta in `src/App.jsx`
   - Deve essere la stessa della Firebase Console

2. **Verifica il Service Worker**:
   - Apri DevTools → Application → Service Workers
   - Dovresti vedere `firebase-messaging-sw.js` registrato
   - Se non c'è, controlla che il file esista in `public/`

3. **Verifica i permessi**:
   - Il browser deve aver concesso i permessi per le notifiche
   - Controlla in Impostazioni del browser

4. **Verifica i token FCM**:
   - Controlla Firestore → `user_tokens`
   - Ogni utente deve avere un documento con `fcm_token`

5. **Verifica le Cloud Functions**:
   ```bash
   firebase functions:log
   ```
   - Controlla i log per errori

### Le notifiche funzionano solo quando il browser è aperto

- Questo significa che FCM non è configurato correttamente
- Verifica che:
  - La VAPID key sia corretta
  - Il service worker sia registrato
  - I token FCM siano salvati in Firestore

## 📝 Note Importanti

1. **HTTPS richiesto**: Le notifiche push funzionano solo su HTTPS (o localhost in sviluppo)

2. **Browser supportati**:
   - ✅ Chrome/Edge (desktop e mobile)
   - ✅ Firefox (desktop)
   - ⚠️ Safari (supporto limitato)
   - ❌ Opera (supporto limitato)

3. **Permessi utente**: L'utente deve concedere i permessi per le notifiche quando richiesto

4. **Token FCM**: I token possono scadere o cambiare. L'app li aggiorna automaticamente quando necessario.

## 🎯 Struttura Database

### Collezione: `user_tokens`

Documenti con ID = `user_id` (uid dell'utente)

```javascript
{
  user_id: "NfZ3JqEcfjPkzpykzs7YXpjUOPF3",
  email: "user@example.com",
  fcm_token: "dKxY...", // Token FCM per push notifications
  updated_at: Timestamp
}
```

Questa collezione viene popolata automaticamente quando l'utente accede all'app.

