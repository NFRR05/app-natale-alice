# 🔍 Debug Connessione Firestore

## Problema: "client is offline"

Se vedi l'errore "Failed to get document because the client is offline", segui questi passi:

### 1. Verifica le Regole Firestore (PRIMA COSA!)

1. Vai su [Firebase Console](https://console.firebase.google.com)
2. Seleziona il progetto `mybubiiapp`
3. Vai su **Firestore Database** → **Rules**
4. **Copia e incolla** queste regole (sostituisci tutto):

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

5. Clicca su **"Publish"** in alto a destra
6. **ATTENDI 10-30 secondi** per la propagazione
7. Ricarica l'app nel browser (Ctrl+R o F5)

### 2. Verifica che il Database sia stato creato

1. In Firebase Console, vai su **Firestore Database**
2. Verifica che vedi la collezione `daily_posts`
3. Verifica che il documento `2025-12-23` esista

### 3. Verifica la Tab Network nel Browser

1. Apri DevTools (F12)
2. Vai su **Network** tab
3. Ricarica la pagina
4. Cerca chiamate a `firestore.googleapis.com` o `googleapis.com`
5. Controlla se ci sono errori:
   - **403 Forbidden** = Problema con le regole Firestore
   - **401 Unauthorized** = Problema con l'autenticazione
   - **Network error** = Problema di connessione

### 4. Svuota la Cache del Browser

1. Apri DevTools (F12)
2. Tasto destro sul pulsante di ricarica
3. Seleziona **"Empty Cache and Hard Reload"**

### 5. Verifica le Credenziali

Apri `firebaseConfig.js` e verifica che:
- `projectId` sia esattamente `"mybubiiapp"` (non `mybubiiapp2005`)
- Tutti gli altri valori siano corretti

### 6. Test Diretto delle Regole

In Firebase Console → Firestore Database → Rules, clicca su **"Rules Playground"**:
- Collezione: `daily_posts`
- Documento: `2025-12-23`
- Autenticato: ✅ Sì
- Email: `riccardoremec05@gmail.com`
- Test: **Read**
- Dovrebbe risultare **✅ Allowed**

Se il test risulta **❌ Denied**, le regole non sono corrette!

## Se Nulla Funziona

1. Verifica che il progetto Firebase sia attivo (non in pausa)
2. Verifica che non ci siano problemi di rete/firewall
3. Prova su un altro browser o in modalità incognito
4. Verifica nella console Firebase che non ci siano errori o limiti raggiunti

