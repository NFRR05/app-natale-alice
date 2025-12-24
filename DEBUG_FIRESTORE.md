# 🔍 Debug Firestore - Verifica Problemi

## Checklist da verificare:

### 1. Verifica il progetto Firebase corretto

Il `firebaseConfig.js` usa `projectId: "mybubiiapp"` ma hai mostrato uno screenshot con `mybubiiapp2005`.

**Verifica:**
- Quale progetto stai usando nella Firebase Console?
- Se è `mybubiiapp2005`, devi aggiornare `firebaseConfig.js` con le credenziali corrette

### 2. Verifica le regole di Firestore

Apri Firebase Console → Firestore Database → Rules

**Le regole dovrebbero essere ESATTAMENTE così:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Controlla:**
- ✅ Hai cliccato "Publish" dopo aver modificato?
- ✅ Non ci sono errori di sintassi (la console mostra errori?)
- ✅ Le regole sono state pubblicate (ci vogliono 1-2 secondi)

### 3. Verifica nella Console del Browser

Apri la console (F12) → Tab "Network" (Rete)

**Cerca richieste a Firebase:**
- Dovresti vedere richieste a `firestore.googleapis.com`
- Controlla se ci sono errori 403 (Forbidden) o 401 (Unauthorized)
- Se vedi errori, copia qui il messaggio esatto

### 4. Test veloce - Verifica che l'utente sia autenticato

Nella console del browser, dopo il login, esegui:

```javascript
// Apri la console (F12) e incolla questo:
import { auth } from './firebaseConfig.js'
console.log('User:', auth.currentUser)
```

Dovresti vedere l'utente autenticato.

### 5. Verifica che la collezione esista

Nella Firebase Console:
- Vai su Firestore Database
- Verifica che la collezione `daily_posts` esista
- Verifica che il documento `2025-12-23` esista
- Clicca sul documento e verifica che abbia i campi:
  - `theme_text` (string)
  - `memory_image_url` (string)

### 6. Test diretto - Prova a leggere un documento

Apri la console del browser e prova questo:

```javascript
import { db } from './firebaseConfig.js'
import { doc, getDoc } from 'firebase/firestore'

const testDoc = doc(db, 'daily_posts', '2025-12-23')
getDoc(testDoc).then(snap => {
  console.log('Document exists:', snap.exists())
  console.log('Data:', snap.data())
}).catch(err => {
  console.error('Error:', err)
})
```

**Cosa vedi?**
- Se vedi "Document exists: true" → il problema è nel codice React
- Se vedi un errore → il problema è nelle regole/configurazione

### 7. Verifica la data

L'app calcola la data come: `2025-12-23`

**Verifica:**
- Oggi è davvero il 23 dicembre 2025?
- Se no, crea un documento con la data corretta (es. `2024-12-23` se oggi è 23 dicembre 2024)

## Cosa inviarmi per aiutarti meglio:

1. Screenshot delle regole di Firestore (così vedo se sono corrette)
2. Screenshot della tab Network con gli errori (se ci sono)
3. Il risultato del test diretto (punto 6)
4. Il projectId corretto (mybubiiapp o mybubiiapp2005?)

