# 🎯 Guida Completa - Completamento Setup

Questa guida ti accompagna passo-passo per completare la configurazione dell'app dopo aver fatto il build.

## ✅ Controllo Preliminare

Prima di iniziare, verifica che hai già fatto:
- ✅ Installato le dipendenze (`npm install`)
- ✅ Configurato Firebase in `firebaseConfig.js` (vedo che è già configurato!)
- ✅ Configurato le email autorizzate in `src/components/Login.jsx` (vedo che sono già configurate!)
- ✅ Creato gli utenti in Firebase Authentication

## 📋 Passi da Completare

### 🔐 PASSO 1: Verifica Utenti in Firebase Authentication

1. Vai su [Firebase Console](https://console.firebase.google.com)
2. Seleziona il progetto `mybubiiapp`
3. Vai su **Authentication** → **Users**
4. Verifica che esistano i 2 utenti con queste email:
   - `riccardoremec05@gmail.com`
   - `alicebiancato5@gmail.com`
5. Se non esistono, clicca su **"Add user"** e creali manualmente con una password

**⚠️ IMPORTANTE**: Salva le password che imposti! Le userai per accedere all'app.

---

### 🗄️ PASSO 2: Configura Firestore Database

L'app usa 3 collezioni. La collezione `uploads` viene creata automaticamente, ma devi verificare/creare le altre:

#### 2.1. Verifica/Crea la collezione `daily_posts`

1. Vai su **Firestore Database** nella Firebase Console
2. Se non esiste già, clicca su **"Start collection"** o **"Aggiungi raccolta"**
3. Nome collezione: `daily_posts`
4. Non creare documenti ora (li creerai dopo quando carichi le foto dei ricordi)

**La collezione `uploads` verrà creata automaticamente quando gli utenti caricano foto, non devi crearla manualmente!**

#### 2.2. Configura le Regole di Sicurezza Firestore

1. Vai su **Firestore Database** → **Regole** (Rules)
2. **PER ORA, per testare l'app**, puoi lasciare le regole in "test mode":
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.time < timestamp.date(2025, 12, 31);
       }
     }
   }
   ```

3. **DOPO aver testato l'app**, sostituisci con le regole di sicurezza più restrittive (vedi PASSO 5)

---

### 📦 PASSO 3: Configura Firebase Storage

#### 3.1. Verifica che Storage sia abilitato

1. Vai su **Storage** nella Firebase Console
2. Se non è ancora abilitato, clicca su **"Get Started"**
3. Scegli **"Start in test mode"** (per ora)
4. Scegli la stessa regione di Firestore

#### 3.2. Configura le Regole di Storage

1. Vai su **Storage** → **Rules**
2. **PER ORA, per testare**, usa queste regole:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
3. Clicca su **"Publish"**

**DOPO aver testato l'app, restringi le regole** (vedi PASSO 5)

---

### 📸 PASSO 4: Popola i Ricordi del Giorno (OPZIONALE)

Questa parte è opzionale ma rende l'app più speciale! Puoi farlo anche dopo aver testato l'app.

#### 4.1. Carica le foto su Firebase Storage

1. Vai su **Storage** nella Firebase Console
2. Clicca su **"Upload file"** o crea una cartella `memories/`
3. Carica le foto che vuoi usare come "Ricordi del Giorno"
4. Per ogni foto caricata:
   - Clicca sulla foto
   - Copia l'**URL di download** (lo vedi nel pannello a destra)

#### 4.2. Crea i documenti in Firestore

1. Vai su **Firestore Database**
2. Clicca sulla collezione `daily_posts`
3. Clicca su **"Add document"** o **"Aggiungi documento"**
4. Come **Document ID**, usa il formato data: `YYYY-MM-DD` (es. `2024-12-25` per Natale)
5. Aggiungi questi campi:
   - Campo `theme_text` (tipo: string): es. "Il nostro primo Natale insieme"
   - Campo `memory_image_url` (tipo: string): incolla l'URL della foto che hai copiato prima
6. Clicca su **"Save"**

**Esempio**:
- Document ID: `2024-12-25`
- `theme_text`: "Il nostro primo Natale insieme 🎄"
- `memory_image_url`: `https://firebasestorage.googleapis.com/v0/b/...`

**📅 IMPORTANTE - Quando è visibile un documento?**
- Un documento con ID `2024-12-25` sarà visibile **DAL 25 dicembre in poi** (25, 26, 27, ecc.)
- L'app mostra sempre il documento più recente che sia <= alla data odierna
- Se crei un documento per il 25 dicembre, sarà visibile anche il 26, 27, 28... fino a quando non crei un documento con una data più recente
- Questo significa che puoi creare documenti per giorni futuri e saranno visibili automaticamente quando arriva quella data

Ripeti per ogni giorno che vuoi programmare!

---

### 🔒 PASSO 5: Configura Regole di Sicurezza Finali (DA FARE DOPO I TEST)

**⚠️ FAI QUESTO SOLO DOPO AVER TESTATO CHE L'APP FUNZIONA!**

#### 5.1. Regole Firestore Finali

Vai su **Firestore Database** → **Regole** e sostituisci con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Utenti possono leggere/scrivere solo i propri dati
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Tutti gli utenti autenticati possono leggere i daily_posts
    // Solo admin può scrivere (via console o admin SDK)
    match /daily_posts/{dateId} {
      allow read: if request.auth != null;
      allow write: if false; // Solo tramite admin SDK o console
    }
    
    // Uploads: tutti possono leggere (per vedere foto del partner)
    // Solo il proprietario può creare/modificare/cancellare
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

Clicca su **"Publish"**

#### 5.2. Regole Storage Finali

Vai su **Storage** → **Rules** e sostituisci con:

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

Clicca su **"Publish"**

---

### 🧪 PASSO 6: Testa l'Applicazione

1. Avvia l'app in modalità sviluppo:
   ```bash
   npm run dev
   ```

2. Apri il browser su `http://localhost:5173` (o l'URL mostrato nel terminale)

3. Testa:
   - ✅ Login con una delle email autorizzate
   - ✅ Visualizzazione della home
   - ✅ Upload di una foto (se c'è un tema del giorno configurato)
   - ✅ Visualizzazione della foto del partner (dopo l'upload)

4. Se tutto funziona, puoi fare il build per produzione:
   ```bash
   npm run build
   ```

5. I file ottimizzati saranno nella cartella `dist/` e possono essere deployati!

---

### 🚀 PASSO 7: Deploy (OPZIONALE)

Puoi deployare l'app su vari servizi gratuiti:

#### Opzione 1: Vercel (Consigliato - Più Semplice)
1. Vai su [vercel.com](https://vercel.com) e registrati/login
2. Clicca su **"New Project"**
3. Connetti il repository GitHub (o carica la cartella `dist/`)
4. Seleziona il progetto
5. Vercel rileva automaticamente Vite
6. Clicca su **"Deploy"**
7. L'app sarà live in pochi secondi!

#### Opzione 2: Netlify
1. Vai su [netlify.com](https://netlify.com)
2. Trascina la cartella `dist/` nella pagina di deploy
3. Fatto!

#### Opzione 3: Firebase Hosting
1. Installa Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Inizializza: `firebase init hosting`
4. Seleziona `dist` come cartella pubblica
5. Deploy: `firebase deploy`

---

## 🎯 Checklist Finale

- [ ] Utenti creati in Firebase Authentication
- [ ] Firestore Database configurato (collezione `daily_posts` creata)
- [ ] Storage configurato
- [ ] Regole Firestore in test mode (per ora)
- [ ] Regole Storage in test mode (per ora)
- [ ] App testata localmente con `npm run dev`
- [ ] (Opzionale) Ricordi del giorno popolati
- [ ] (Dopo test) Regole di sicurezza finali applicate
- [ ] (Opzionale) App deployata

---

## ❓ Domande Frequenti

### Perché devo creare gli utenti manualmente?
Firebase Authentication richiede che gli utenti siano creati tramite la console o tramite registrazione. Per un'app privata per 2 persone, è più sicuro creare gli utenti manualmente.

### Posso aggiungere più di 2 utenti?
Sì! Modifica l'array `ALLOWED_EMAILS` in `src/components/Login.jsx` e aggiungi più email.

### Le foto vengono compresse?
Sì! L'app comprime automaticamente le foto prima dell'upload (max 1080px, max 1MB). Questo riduce i costi di Storage del 90-95%!

### Quando devo restringere le regole?
Dopo aver verificato che tutto funziona correttamente in test mode. Le regole restrittive proteggono i tuoi dati da accessi non autorizzati.

---

## 🎉 Complimenti!

Se sei arrivato qui, hai completato il setup! L'app è pronta per essere usata.

**Buon Natale e tanti ricordi felici! ❤️🎄✨**

