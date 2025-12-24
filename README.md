# 📸 Il Nostro Album - App Romantica per Coppie

Un'app romantica e privata per condividere foto quotidiane tra due persone, perfetta come regalo di Natale! 🎄✨

**Versione 2.0 - React Web App** (Mobile-First, Christmas Themed)

## 🎯 Caratteristiche

- ✅ Autenticazione email/password (accesso limitato a 2 email)
- ✅ Tema del Giorno personalizzabile
- ✅ Ricordo del Giorno (foto casuale dalla collezione)
- ✅ Sfida Quotidiana: carica una foto con didascalia
- ✅ Sistema di sblocco: non puoi vedere la foto del partner finché non carichi la tua
- ✅ Notifiche giornaliere alle 13:00 (Web Notifications API)
- ✅ Interfaccia completamente in italiano
- ✅ Design romantico con tema natalizio 🎄
- ✅ Mobile-first responsive design
- ✅ Compressione automatica delle immagini

## 📋 Prerequisiti

- Node.js 18+ installato sul tuo computer
- Account Firebase (gratuito)
- Browser moderno (Chrome, Firefox, Safari, Edge)

## 🚀 Installazione

### 1. Installa le dipendenze

Apri il terminale nella cartella del progetto e esegui:

```bash
npm install
```

### 2. Configura Firebase

1. Vai su [console.firebase.google.com](https://console.firebase.google.com)
2. Crea un nuovo progetto (o usa uno esistente)
3. Abilita i seguenti servizi:
   - **Authentication**: 
     - Vai su "Authentication" → "Get Started"
     - Abilita "Email/Password" come metodo di accesso
     - Crea manualmente i due utenti con le email che vuoi autorizzare
   
   - **Firestore Database**:
     - Vai su "Firestore Database" → "Create Database"
     - Scegli "Start in test mode" (per ora, puoi restringere le regole dopo)
     - Scegli una regione (es. europe-west)
   
   - **Storage**:
     - Vai su "Storage" → "Get Started"
     - Scegli "Start in test mode"
     - Scegli la stessa regione di Firestore

4. **Ottieni le credenziali**:
   - Vai su "Impostazioni progetto" (icona ingranaggio) → "Configurazione"
   - Scorri fino a "Le tue app" e clicca sull'icona web `</>`
   - Copia le credenziali di configurazione

5. **Incolla le credenziali in `firebaseConfig.js`**:
   - Apri `firebaseConfig.js`
   - Sostituisci i valori con le tue credenziali Firebase

### 3. Configura le email autorizzate

Apri `src/components/Login.jsx` e modifica l'array `ALLOWED_EMAILS`:

```javascript
const ALLOWED_EMAILS = [
  'tua-email@example.com',    // Sostituisci con la prima email
  'partner-email@example.com', // Sostituisci con la seconda email
];
```

### 4. Avvia l'app in modalità sviluppo

```bash
npm run dev
```

L'app si aprirà automaticamente nel browser su `http://localhost:3000`

### 5. Build per produzione

```bash
npm run build
```

I file ottimizzati saranno nella cartella `dist/` e possono essere deployati su qualsiasi hosting statico (Vercel, Netlify, Firebase Hosting, etc.)

## 🗄️ Struttura Database Firestore

### Collezione: `users`

Documenti con ID = `uid` (generato automaticamente da Firebase Auth)

```javascript
{
  uid: "user123",
  email: "user@example.com",
  pushToken: "expo-push-token-xxx" // Opzionale per notifiche push
}
```

**Nota**: Questa collezione viene creata automaticamente quando necessario. Non è obbligatoria per il funzionamento base.

### Collezione: `daily_posts`

Documenti con ID = `date_id` (formato: `YYYY-MM-DD`)

```javascript
{
  date_id: "2024-12-25",
  theme_text: "Il nostro primo Natale insieme",
  memory_image_url: "https://firebasestorage.googleapis.com/..."
}
```

**Come popolare**:
1. Vai su Firebase Console → Firestore Database
2. Crea una collezione chiamata `daily_posts`
3. Crea un documento con ID = data (es. `2024-12-25`)
4. Aggiungi i campi:
   - `theme_text` (stringa): Il tema del giorno
   - `memory_image_url` (stringa): URL della foto del ricordo

### Collezione: `uploads`

Documenti con ID = `${date_id}_${user_id}` (es. `2024-12-25_user123`)

```javascript
{
  date_id: "2024-12-25",
  user_id: "user123",
  image_url: "https://firebasestorage.googleapis.com/...",
  caption: "La nostra foto di oggi!",
  timestamp: Timestamp // Generato automaticamente
}
```

**Nota**: Questa collezione viene popolata automaticamente quando gli utenti caricano foto.

## 📸 Come Popolare i Ricordi del Giorno

### Metodo 1: Manuale tramite Firebase Console

1. **Carica le foto su Firebase Storage**:
   - Vai su Firebase Console → Storage
   - Crea una cartella `memories/`
   - Carica le foto che vuoi usare
   - Per ogni foto, clicca su di essa e copia l'URL di download

2. **Crea i documenti in Firestore**:
   - Vai su Firestore Database
   - Collezione `daily_posts`
   - Crea un documento con ID = data (es. `2024-12-25`)
   - Aggiungi:
     - Campo `theme_text`: "Il nostro primo Natale insieme"
     - Campo `memory_image_url`: (incolla l'URL della foto)

3. **Ripeti per ogni giorno** che vuoi programmare

**📅 Quando è visibile un documento?**
- Un documento con ID `2024-12-25` sarà visibile **DAL 25 dicembre in poi** (25, 26, 27, ecc.)
- L'app mostra sempre il documento più recente che sia <= alla data odierna
- Puoi creare documenti per giorni futuri: saranno visibili automaticamente quando arriva quella data

## 🔒 Regole di Sicurezza Firestore (Importante!)

Dopo aver testato l'app, **restringi le regole di sicurezza** in Firestore:

1. Vai su Firestore Database → Regole
2. Sostituisci con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Utenti possono leggere/scrivere solo i propri dati
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Tutti possono leggere i daily_posts, solo admin può scrivere
    match /daily_posts/{dateId} {
      allow read: if request.auth != null;
      allow write: if false; // Solo tramite admin SDK
    }
    
    // Uploads: puoi leggere solo quelli del giorno corrente e del tuo partner
    match /uploads/{uploadId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                     request.resource.data.user_id == request.auth.uid;
      allow update, delete: if request.auth != null && 
                             resource.data.user_id == request.auth.uid;
    }
  }
}
```

### Regole di Sicurezza Storage

Dopo aver testato l'app, **configura anche le regole di Storage**:

1. Vai su Storage → Rules
2. Sostituisci con:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Memories: solo lettura per utenti autenticati
    match /memories/{fileName} {
      allow read: if request.auth != null;
      allow write: if false; // Solo tramite console o admin SDK
    }
    
    // Uploads: utenti possono leggere/scrivere solo nella loro cartella
    match /uploads/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Nota**: Durante i test, puoi usare regole più permissive (`allow read, write: if request.auth != null;`) e restringere dopo.

## 🎨 Personalizzazione

### Colori

I colori romantici e natalizi sono definiti in `tailwind.config.js`. Puoi modificarli:

- Rosa principale: `#ff6b9d`
- Sfondo: Gradiente da `#ffc0cb` a `#f8fafc`
- Colori natalizi: rosso, verde, oro disponibili come `christmas-red`, `christmas-green`, `christmas-gold`

### Testi

Tutti i testi dell'interfaccia sono in italiano e possono essere modificati direttamente nei componenti in `src/components/`.

## 🐛 Risoluzione Problemi

### "Firebase: Error (auth/user-not-found)"
- Assicurati di aver creato gli utenti in Firebase Authentication
- Verifica che le email siano corrette

### "Permission denied" su Firestore
- Controlla le regole di sicurezza in Firebase Console
- Assicurati che l'utente sia autenticato

### Notifiche non funzionano
- Verifica che il browser supporti le notifiche (Chrome, Firefox, Safari, Edge)
- Assicurati di aver concesso i permessi quando richiesto
- Le notifiche funzionano solo se il browser è aperto (per le notifiche web)

### Foto non si caricano
- Verifica che Storage sia abilitato in Firebase
- Controlla le regole di Storage (devono permettere upload agli utenti autenticati)
- Verifica la connessione internet

## 📝 Note Importanti

1. **Email hardcoded**: Le email autorizzate sono hardcoded in `src/components/Login.jsx` per sicurezza. Modificale prima di distribuire l'app.

2. **Notifiche web**: Le notifiche utilizzano l'API Web Notifications del browser. Funzionano solo se il browser è aperto e l'utente ha concesso i permessi.

3. **Storage**: Le foto vengono caricate su Firebase Storage nella cartella `uploads/{userId}/{date}_{timestamp}.jpg`
   - **Compressione automatica**: Le foto vengono automaticamente compresse e ridimensionate prima dell'upload
   - Dimensioni ottimizzate: max 1080px di larghezza, max 1MB, formato JPEG
   - Risultato: foto grandi vengono ridotte drasticamente (risparmio ~90-95%)
   - Questo minimizza i costi di Firebase Storage

4. **Mobile-First**: L'app è progettata mobile-first e funziona perfettamente su smartphone, tablet e desktop.

5. **Deploy**: Puoi deployare l'app su:
   - Vercel (consigliato)
   - Netlify
   - Firebase Hosting
   - GitHub Pages
   - Qualsiasi hosting statico

## 🎁 Buon Natale!

Spero che questa app porti gioia e ricordi speciali alla coppia che la userà! ❤️🎄✨
