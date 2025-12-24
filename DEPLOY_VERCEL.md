# 🚀 Guida Deploy su Vercel

## ✅ La tua repo GitHub va bene!

La repo `NFRR05/app-natale-alice` è perfetta per il deploy. Procedi così:

## Passo 1: Push del codice su GitHub

```bash
# Se non hai ancora fatto il commit iniziale
git add .
git commit -m "Initial commit - MyBubiAPP"

# Collega alla tua repo (se non già fatto)
git remote add origin https://github.com/NFRR05/app-natale-alice.git
git branch -M main
git push -u origin main
```

## Passo 2: Deploy su Vercel

### Opzione A: Via Dashboard Web (Consigliato)

1. **Vai su [vercel.com](https://vercel.com)**
2. **Login con GitHub** (collega il tuo account GitHub)
3. **Clicca "Add New..." → "Project"**
4. **Importa la repo:**
   - Cerca `app-natale-alice`
   - Clicca "Import"
5. **Configurazione:**
   - **Framework Preset:** Vite (dovrebbe essere rilevato automaticamente)
   - **Root Directory:** `./` (lasciare vuoto)
   - **Build Command:** `npm run build` (automatico)
   - **Output Directory:** `dist` (automatico)
   - **Install Command:** `npm install` (automatico)
6. **Clicca "Deploy"**

### Opzione B: Via CLI

```bash
# Installa Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Segui le istruzioni:
# - Link to existing project? No
# - Project name: app-natale-alice
# - Directory: ./
# - Override settings? No
```

## Passo 3: Verifica Deploy

Dopo il deploy, Vercel ti darà un URL tipo:
- `https://app-natale-alice.vercel.app`

**Test:**
1. Apri l'URL in un browser
2. Verifica che l'app si carichi
3. Testa il login
4. Controlla che tutto funzioni

## 🔔 Test Notifiche

### Prima del test:
- [ ] Cloud Functions deployate: `firebase deploy --only functions`
- [ ] VAPID key configurata (già fatto ✅)

### Test:
1. Apri l'app deployata su Vercel su **2 dispositivi/browser diversi**
2. Fai login con **2 account diversi**
3. Carica una foto da un account
4. L'altro account dovrebbe ricevere una notifica push

## ⚠️ Note Importanti

### HTTPS
- ✅ Vercel fornisce HTTPS automaticamente
- ✅ Necessario per Service Workers e FCM

### Service Worker
- Il file `public/sw.js` sarà servito correttamente
- Verifica: `https://tuo-dominio.vercel.app/sw.js` dovrebbe essere accessibile

### Firebase Functions
- Le Cloud Functions sono separate e deployate su Firebase
- Non vengono deployate su Vercel
- Funzionano indipendentemente dall'hosting

## 🐛 Troubleshooting

### Build fallisce su Vercel
- Verifica che `package.json` abbia lo script `build`
- Controlla i log di build su Vercel

### Service Worker non funziona
- Verifica che l'app sia servita via HTTPS
- Controlla DevTools → Application → Service Workers

### Notifiche non arrivano
- Verifica Cloud Functions deployate
- Controlla i log: `firebase functions:log`
- Verifica FCM token salvato in Firestore

## 📝 File Creati

Ho creato:
- ✅ `vercel.json` - Configurazione Vercel
- ✅ `DEPLOY_CHECKLIST.md` - Checklist completa
- ✅ `DEPLOY_VERCEL.md` - Questa guida

Buon deploy! 🚀

