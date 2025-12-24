# 🔔 Setup Firebase Cloud Messaging (FCM)

Per abilitare le notifiche push anche quando l'app è completamente chiusa, segui questi passaggi:

## 1. Configura Firebase Cloud Messaging

### Passo 1: Ottieni la VAPID Key

1. Vai su [Firebase Console](https://console.firebase.google.com)
2. Seleziona il tuo progetto `mybubiiapp`
3. Vai su **Project Settings** (⚙️) → **Cloud Messaging**
4. Nella sezione **Web configuration**, clicca su **Generate key pair**
5. Copia la **VAPID key** generata

### Passo 2: Aggiorna il codice

Apri `src/App.jsx` e cerca la riga con `const vapidKey = 'YOUR_VAPID_KEY_HERE'` (circa riga 165). Sostituisci con la tua VAPID key:

```javascript
const vapidKey = 'LA_TUA_VAPID_KEY_QUI'
```

## 2. Deploy Cloud Functions

### Passo 1: Installa Firebase CLI

```bash
npm install -g firebase-tools
```

### Passo 2: Login a Firebase

```bash
firebase login
```

### Passo 3: Inizializza Firebase Functions (se non già fatto)

```bash
firebase init functions
```

Quando richiesto:
- Seleziona il progetto `mybubiiapp`
- Usa JavaScript
- Installa le dipendenze automaticamente: **Sì**

### Passo 4: Installa le dipendenze

```bash
cd cloud-functions
npm install
```

### Passo 5: Deploy

```bash
cd ..
firebase deploy --only functions
```

## 3. Struttura Database

La Cloud Function creerà automaticamente la collection `user_tokens` per salvare i token FCM. La struttura sarà:

```
user_tokens/
  {userId}/
    fcm_token: "token_fcm_qui"
    user_id: "userId"
    email: "user@example.com"
    updated_at: Timestamp
```

Non è necessaria una collection `users` separata - la funzione trova automaticamente il partner cercando nella collection `user_tokens`.

## 4. Test

1. Apri l'app su due dispositivi/browser diversi
2. Fai login con account diversi
3. Carica una foto da un account
4. L'altro account dovrebbe ricevere una notifica push (anche se l'app è chiusa!)

## ⚠️ Note Importanti

- Le notifiche FCM funzionano anche quando l'app è completamente chiusa
- Il Service Worker deve essere registrato correttamente
- I permessi notifiche devono essere concessi
- La Cloud Function deve essere deployata su Firebase
- L'app deve essere servita via HTTPS (richiesto per Service Workers e FCM)

## 🔧 Troubleshooting

### Notifiche non arrivano
1. Verifica che la VAPID key sia corretta in `src/App.jsx`
2. Controlla che la Cloud Function sia deployata: `firebase functions:log`
3. Verifica che il token FCM sia salvato in Firestore: `user_tokens/{userId}`
4. Controlla la console del browser per errori
5. Verifica che i permessi notifiche siano concessi nel browser

### Service Worker non si registra
1. Verifica che il file `public/sw.js` esista
2. Controlla la console per errori di registrazione
3. Assicurati che l'app sia servita via HTTPS (richiesto per Service Workers)

### Cloud Function non funziona
1. Controlla i log: `firebase functions:log`
2. Verifica che la funzione sia deployata: `firebase functions:list`
3. Assicurati che Firestore sia abilitato nel progetto Firebase
