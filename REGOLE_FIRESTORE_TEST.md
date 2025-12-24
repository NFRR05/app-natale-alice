# 🔒 Regole Firestore per Test

Copia e incolla queste regole in Firebase Console → Firestore Database → Rules

## Regole Temporanee (per testare l'app)

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

## Cosa fanno queste regole?

- ✅ Permettono a **qualsiasi utente autenticato** di leggere e scrivere
- ✅ Funzionano per tutte le collezioni (`daily_posts`, `uploads`, ecc.)
- ⚠️ **Sono per TEST** - dopo aver verificato che funziona, usa regole più restrittive

## Come applicare

1. Vai su [Firebase Console](https://console.firebase.google.com)
2. Seleziona il progetto `mybubiiapp` (o `mybubiiapp2005`)
3. Vai su **Firestore Database** → **Rules** (nella barra laterale)
4. **Cancella** tutte le regole esistenti
5. **Copia e incolla** le regole sopra
6. Clicca su **"Publish"** in alto a destra
7. Attendi qualche secondo
8. Ricarica l'app nel browser

## Verifica che funzioni

Dopo aver applicato le regole, ricarica l'app. Dovresti vedere:
- ✅ Il tema del giorno
- ✅ La foto del ricordo (se hai popolato il documento `2025-12-23`)
- ✅ Nessun errore di timeout in console

## Regole Finali (da applicare DOPO i test)

Quando tutto funziona, sostituisci con regole più sicure (vedi README.md o GUIDA_COMPLETAMENTO.md)

