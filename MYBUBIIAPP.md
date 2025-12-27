# 📱 MyBubiApp - Documentazione Completa

App web moderna per condividere foto e momenti speciali tra utenti, con sistema di chat multi-utente, profili personalizzati e notifiche push.

---

## 🚀 Tecnologie Utilizzate

### Frontend Framework & Libraries
- **React 18.2.0** - Libreria UI moderna e performante
- **React DOM 18.2.0** - Rendering React per il web
- **Vite 5.0.8** - Build tool veloce e moderno per sviluppo e produzione

### Styling
- **Tailwind CSS 3.3.2** - Framework CSS utility-first per design responsive
- **PostCSS 8.4.32** - Processore CSS
- **Autoprefixer 10.4.16** - Aggiunge automaticamente vendor prefixes
- **clsx 2.1.1** - Utility per gestire classi CSS condizionali
- **tailwind-merge 3.4.0** - Merge intelligente di classi Tailwind

### Backend & Database
- **Firebase 10.14.1** - Piattaforma backend completa di Google
  - **Firebase Authentication** - Autenticazione email/password
  - **Cloud Firestore** - Database NoSQL real-time
  - **Firebase Storage** - Storage per file e immagini
  - **Firebase Cloud Messaging (FCM)** - Notifiche push

### Utilities
- **browser-image-compression 2.0.2** - Compressione immagini lato client
- **lucide-react 0.562.0** - Icone SVG moderne

### Development Tools
- **@vitejs/plugin-react 4.2.1** - Plugin Vite per React
- **sharp 0.34.5** - Processamento immagini (per build)

---

## ✨ Funzionalità Esistenti

### 🔐 Autenticazione & Gestione Utenti

#### 1. **Registrazione (Sign Up)**
- Form di registrazione con validazione
- Creazione account con email e password
- Validazione username (3-20 caratteri, lettere, numeri, underscore)
- Controllo disponibilità username (univoco)
- Creazione automatica profilo utente in Firestore
- Generazione automatica username basato su email se non specificato

#### 2. **Login**
- Login con email e password
- Gestione stato autenticazione persistente
- Redirect automatico dopo login
- Gestione errori di autenticazione

#### 3. **Gestione Profilo Utente**
- **Modifica Username**: Cambio username con validazione e controllo disponibilità
- **Modifica Display Name**: Nome visualizzato personalizzabile
- **Foto Profilo**: 
  - Upload foto profilo con compressione automatica
  - Visualizzazione foto o iniziali come fallback
  - Eliminazione foto profilo esistente quando si carica una nuova
- **Eliminazione Account**: 
  - Eliminazione completa account con conferma password
  - Rimozione dati utente da Firestore
  - Eliminazione foto profilo da Storage
  - Reautenticazione richiesta per sicurezza

### 💬 Sistema Multi-Utente & Chat

#### 4. **Dashboard**
- Lista tutte le conversazioni dell'utente
- Aggiornamento real-time delle conversazioni (onSnapshot)
- Visualizzazione nome partner, ultimo messaggio, timestamp
- Navigazione rapida alle chat
- Stato caricamento e gestione errori

#### 5. **Creazione Nuove Chat (Add Chat)**
- Ricerca utenti per username
- **Live Search**: Ricerca in tempo reale con debouncing (300ms)
- Visualizzazione risultati ricerca con avatar e nome
- Creazione nuova conversazione
- Validazione esistenza conversazione (evita duplicati)

#### 6. **Chat Room**
- Visualizzazione foto condivise nella conversazione
- **Memory of the Day**: Feature speciale solo per utenti specifici (riccardoremec@gmail.com e alicebiancato5@gmail.com)
- Upload foto con didascalia
- Visualizzazione foto partner
- Sistema di sblocco: non puoi vedere foto partner finché non carichi la tua
- Edit e delete foto caricate
- Aggiornamento real-time foto condivise
- Visualizzazione informazioni partner (nome, avatar)

### 📸 Gestione Foto

#### 7. **Upload Foto**
- Selezione foto da dispositivo
- **Compressione automatica**:
  - Max 1MB di dimensione
  - Max 1080px di larghezza/altezza
  - Formato JPEG
  - Compressione lato client con browser-image-compression
- Preview foto prima dell'upload
- Aggiunta didascalia opzionale
- Upload su Firebase Storage
- Salvataggio metadati in Firestore
- Aggiornamento timestamp conversazione

#### 8. **Modifica Foto**
- Edit foto già caricate
- Sostituzione foto con nuova immagine
- Mantenimento didascalia esistente o modifica
- Compressione nuova foto prima dell'upload

#### 9. **Eliminazione Foto**
- Eliminazione foto con conferma
- Rimozione file da Storage
- Rimozione documento da Firestore
- Modal di conferma per sicurezza

### 🔔 Notifiche

#### 10. **Sistema Notifiche Push**
- Richiesta permesso notifiche browser
- Integrazione Firebase Cloud Messaging (FCM)
- Salvataggio token FCM nel database
- Notifiche quando:
  - Nuova conversazione creata (invito chat)
  - Nuova foto caricata in conversazione
- Gestione permessi (granted, denied, default)
- Supporto notifiche foreground e background
- Icona campanella nel Dashboard per gestire permessi

### 🎨 UI/UX Features

#### 11. **Sistema Toast Notifications**
- Notifiche toast non invasive
- Tipi: success (verde), error (rosso), info (blu)
- Scompaiono automaticamente dopo 2 secondi
- Chiusura manuale disponibile
- Animazione slide-down
- Posizione top-center
- Context API per gestione globale

#### 12. **Design Moderno**
- Design mobile-first responsive
- Tema colorato con gradienti pink/rose
- Backdrop blur effects
- Ombre e effetti hover
- Animazioni fluide
- Icone SVG moderne (Lucide React)
- Avatar con iniziali colorate quando manca foto profilo

#### 13. **Loading States**
- Indicatori di caricamento per operazioni async
- Skeleton screens dove appropriato
- Gestione stati di errore con messaggi chiari

### 🗄️ Struttura Database Firestore

#### Collezione: `users`
```javascript
{
  uid: "user123",
  email: "user@example.com",
  username: "username",
  username_lowercase: "username", // per ricerca case-insensitive
  display_name: "Nome Visualizzato",
  profile_picture_url: "https://...",
  created_at: Timestamp,
  updated_at: Timestamp
}
```

#### Collezione: `conversations`
```javascript
{
  id: "user1_user2", // formato: uid1_uid2 (ordinato alfabeticamente)
  participants: ["uid1", "uid2"],
  created_at: Timestamp,
  updated_at: Timestamp,
  last_message: "Ultimo messaggio..."
}
```

#### Subcollezione: `conversations/{id}/uploads`
```javascript
{
  id: "date_uid",
  date_id: "2024-12-25",
  user_id: "uid",
  image_url: "https://...",
  caption: "Didascalia opzionale",
  timestamp: Timestamp,
  conversation_id: "conversation_id"
}
```

#### Collezione: `user_tokens`
```javascript
{
  uid: "user123",
  fcm_token: "fcm-token-string",
  updated_at: Timestamp
}
```

### 📁 Struttura Storage Firebase

- `profile_pictures/{userId}/{timestamp}.jpg` - Foto profilo utenti
- `conversations/{conversationId}/{userId}/{dateId}_{timestamp}.jpg` - Foto condivise nelle chat

---

## 🏗️ Architettura Componenti

### Componenti Principali

1. **App.jsx** - Componente root, gestione routing e stato globale
2. **Login.jsx** - Form di login
3. **SignUp.jsx** - Form di registrazione
4. **Dashboard.jsx** - Lista conversazioni e navigazione principale
5. **AddChat.jsx** - Ricerca e creazione nuove chat
6. **ChatRoom.jsx** - Chat individuale con foto condivise
7. **PhotoUpload.jsx** - Componente per upload foto
8. **PartnerPhoto.jsx** - Visualizzazione foto partner
9. **Profile.jsx** - Gestione profilo utente
10. **DailyMemory.jsx** - Feature "Memory of the Day" (solo utenti speciali)
11. **Toast.jsx** - Componente toast notification
12. **ToastContext.jsx** - Context per gestione toast globale

---

## 🔒 Sicurezza & Privacy

- Autenticazione Firebase con email/password
- Regole Firestore per controllo accessi
- Regole Storage per controllo upload/download
- Reautenticazione richiesta per operazioni critiche (eliminazione account)
- Validazione input lato client
- Sanitizzazione dati prima del salvataggio

---

## 📱 Caratteristiche Tecniche

### Performance
- Lazy loading dove possibile
- Compressione immagini lato client
- Ottimizzazione query Firestore
- Uso di `onSnapshot` per real-time updates efficienti

### Responsive Design
- Mobile-first approach
- Breakpoints Tailwind per tablet e desktop
- Touch-friendly interface
- Gestione viewport mobile

### Browser Support
- Chrome (raccomandato)
- Firefox
- Safari
- Edge
- Richiede supporto ES6+ e Fetch API

---

## 🚀 Script Disponibili

```bash
npm run dev      # Avvia server sviluppo (Vite)
npm run build    # Build per produzione
npm run preview  # Preview build produzione
```

---

## 📝 Note Importanti

- **Username**: Deve essere unico, 3-20 caratteri (lettere, numeri, underscore)
- **Foto**: Compressione automatica a max 1MB, formato JPEG
- **Notifiche**: Richiedono permesso browser e supporto FCM
- **Memory of the Day**: Feature limitata a utenti specifici configurati nel codice
- **Conversazioni**: ID generato ordinando alfabeticamente gli UID dei partecipanti
- **Storage**: Path strutturato per organizzare foto per conversazione/utente

---

## 🎯 Versione Attuale

**v2.0.0** - React Web App Multi-Utente

*Ultimo aggiornamento: Gennaio 2025*

