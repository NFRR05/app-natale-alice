# ✅ Checklist Pre-Deploy e Post-Deploy

## 🔔 Stato Notifiche

### 1. Cloud Functions (FCM Backend)
- [ ] **Deploy Cloud Functions completato?**
  - Esegui: `firebase deploy --only functions`
  - Se hai errori di permessi, aspetta 2-3 minuti e riprova
  - Verifica che la funzione `notifyPartnerOnUpload` sia deployata

- [ ] **Verifica deploy:**
  ```bash
  firebase functions:list
  ```

### 2. FCM Client (Frontend)
- [x] ✅ VAPID key configurata in `src/App.jsx`
- [ ] **Test notifiche in locale:**
  1. Apri l'app su due browser/dispositivi diversi
  2. Fai login con account diversi
  3. Carica una foto da un account
  4. L'altro account dovrebbe ricevere una notifica

### 3. Service Worker
- [x] ✅ Service Worker creato in `public/sw.js`
- [ ] **Verifica che funzioni:**
  - Apri DevTools → Application → Service Workers
  - Dovresti vedere `sw.js` registrato

## 🚀 Deploy su Vercel

### Passo 1: Push su GitHub

1. **Inizializza Git (se non già fatto):**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Collega alla tua repo GitHub:**
   ```bash
   git remote add origin https://github.com/NFRR05/app-natale-alice.git
   git branch -M main
   git push -u origin main
   ```

### Passo 2: Deploy su Vercel

1. **Vai su [vercel.com](https://vercel.com)**
2. **Login con GitHub**
3. **Clicca "Add New Project"**
4. **Importa la repo `app-natale-alice`**
5. **Configurazione automatica:**
   - Vercel dovrebbe rilevare automaticamente Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

6. **Environment Variables (se necessario):**
   - Normalmente non servono, Firebase usa le credenziali nel codice
   - Se vuoi usare variabili d'ambiente, aggiungi:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - etc.

7. **Clicca "Deploy"**

### Passo 3: Verifica Post-Deploy

- [ ] L'app si carica correttamente
- [ ] Il login funziona
- [ ] Le foto si caricano
- [ ] Il Service Worker si registra (controlla DevTools)
- [ ] Le notifiche funzionano (testa con 2 account)

## 🔧 Configurazioni Importanti

### HTTPS
- ✅ Vercel fornisce HTTPS automaticamente (necessario per Service Workers e FCM)

### Service Worker
- ✅ Il file `public/sw.js` sarà servito correttamente da Vercel
- ✅ Verifica che sia accessibile su: `https://tuo-dominio.vercel.app/sw.js`

### Firebase Hosting (Alternativa)
Se preferisci usare Firebase Hosting invece di Vercel:

```bash
# Installa Firebase CLI (se non già fatto)
npm install -g firebase-tools

# Login
firebase login

# Inizializza hosting
firebase init hosting

# Build
npm run build

# Deploy
firebase deploy --only hosting
```

## 📱 Test Notifiche in Produzione

1. **Apri l'app deployata su Vercel**
2. **Fai login con account 1**
3. **Apri l'app su un altro dispositivo/browser con account 2**
4. **Carica una foto da account 1**
5. **Account 2 dovrebbe ricevere notifica push**

### Se le notifiche non funzionano:

1. **Verifica Service Worker:**
   - DevTools → Application → Service Workers
   - Dovrebbe essere attivo

2. **Verifica FCM Token:**
   - Console del browser → cerca "FCM Token obtained"
   - Verifica in Firestore: `user_tokens/{userId}` → dovrebbe avere `fcm_token`

3. **Verifica Cloud Function:**
   - Firebase Console → Functions → Logs
   - Dovresti vedere log quando carichi una foto

4. **Verifica permessi notifiche:**
   - Il browser deve aver concesso i permessi
   - Controlla: DevTools → Application → Notifications

## 🎯 Prossimi Passi

- [ ] Test completo delle funzionalità in produzione
- [ ] Verifica notifiche push funzionano
- [ ] Test su mobile (se possibile)
- [ ] Configura dominio personalizzato (opzionale)
- [ ] Ottimizza performance (se necessario)

