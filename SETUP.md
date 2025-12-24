# 🚀 Guida Rapida al Setup

## Passi Essenziali

### 1. Installazione Dipendenze
```bash
npm install
```

### 2. Configurazione Firebase

1. Crea progetto su [Firebase Console](https://console.firebase.google.com)
2. Abilita:
   - ✅ Authentication (Email/Password)
   - ✅ Firestore Database
   - ✅ Storage
3. Copia le credenziali da "Configurazione" → "Web app"
4. Incolla in `firebaseConfig.js`

### 3. Configura Email Autorizzate

Modifica `App.js` riga 30-33:
```javascript
const ALLOWED_EMAILS = [
  'tua-email@example.com',
  'partner-email@example.com',
];
```

### 4. Crea Utenti in Firebase

1. Vai su Authentication → Users
2. Aggiungi manualmente i 2 utenti con le email autorizzate
3. Imposta password per ciascuno

### 5. Popola i Ricordi (Opzionale)

1. Carica foto su Storage → cartella `memories/`
2. In Firestore, crea collezione `daily_posts`
3. Crea documento con ID = data (es. `2024-12-25`)
4. Aggiungi campi:
   - `theme_text`: "Il tema del giorno"
   - `memory_image_url`: URL della foto da Storage

### 6. Avvia l'App
```bash
npx expo start
```

## ⚠️ Note Importanti

- Le email devono essere create manualmente in Firebase Authentication
- Le regole Firestore sono in "test mode" - restringile dopo i test
- Le notifiche funzionano meglio su app compilata (non solo Expo Go)

## 🎯 Struttura Database

### `daily_posts/{date_id}`
```json
{
  "theme_text": "Tema del giorno",
  "memory_image_url": "https://..."
}
```

### `uploads/{date_id}_{user_id}`
```json
{
  "date_id": "2024-12-25",
  "user_id": "uid",
  "image_url": "https://...",
  "caption": "Didascalia",
  "timestamp": "Timestamp"
}
```

