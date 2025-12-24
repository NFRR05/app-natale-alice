# 🔒 Regole Firestore per Produzione

## ⚠️ IMPORTANTE: Applica queste regole SOLO dopo aver verificato che l'app funziona correttamente!

## Regole di Sicurezza Consigliate

Copia e incolla queste regole in Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Utenti possono leggere/scrivere solo i propri dati (se usi la collezione users)
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Tutti gli utenti autenticati possono leggere i daily_posts
    // SOLO admin (via Admin SDK o Console) può scrivere
    match /daily_posts/{dateId} {
      allow read: if request.auth != null;
      allow write: if false; // Nessun utente può scrivere, solo admin tramite console/SDK
    }
    
    // Uploads: gli utenti possono leggere tutti gli uploads (per vedere le foto del partner)
    // Ma possono creare/aggiornare solo i propri uploads
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

## Cosa fanno queste regole?

### ✅ `daily_posts`
- **Lettura**: Qualsiasi utente autenticato può leggere (vedere i temi del giorno)
- **Scrittura**: Nessuno può scrivere tramite l'app web (solo tu tramite Firebase Console o Admin SDK)

### ✅ `uploads`
- **Lettura**: Qualsiasi utente autenticato può leggere (per vedere le foto del partner)
- **Creazione**: Puoi creare solo uploads dove `user_id` corrisponde al tuo UID
- **Modifica/Cancellazione**: Puoi modificare/cancellare solo i tuoi uploads

## Come applicare

1. Vai su [Firebase Console](https://console.firebase.google.com)
2. Seleziona il progetto `mybubiiapp`
3. Vai su **Firestore Database** → **Rules**
4. **Cancella** le regole attuali (quelle permissive)
5. **Copia e incolla** le regole sopra
6. Clicca su **"Publish"** in alto a destra
7. ⏰ Attendi 10-30 secondi per la propagazione
8. ✅ Testa l'app per verificare che funzioni ancora

## Test dopo aver applicato le regole

Dopo aver pubblicato le regole, testa:

1. ✅ **Login** - dovrebbe funzionare
2. ✅ **Visualizzazione daily_posts** - dovresti vedere i temi del giorno
3. ✅ **Upload foto** - dovresti poter caricare una foto
4. ✅ **Visualizzazione foto del partner** - dovresti vedere la foto del partner dopo aver caricato la tua

## Se qualcosa non funziona

Se dopo aver applicato le regole l'app smette di funzionare:

1. Verifica di essere loggato
2. Controlla la console del browser per errori
3. Se necessario, torna temporaneamente alle regole permissive per i test

---

## 📝 Nota sulla Collezione `users`

Se non usi la collezione `users` (l'app funziona senza), puoi rimuovere quella sezione delle regole:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo questa sezione se non usi la collezione users
    match /daily_posts/{dateId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    
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

