# 🔥 Firebase Setup for Multi-User System

This guide explains all the Firebase configurations needed for the new multi-user chat system.

---

## 📊 1. Firestore Database Structure

The app now uses the following collections:

### `users` Collection
Stores user profiles with usernames.

```
users/
  └── {userId}/
        ├── uid: string
        ├── email: string
        ├── username: string
        ├── username_lowercase: string  (for case-insensitive search)
        ├── display_name: string
        ├── created_at: timestamp
        └── updated_at: timestamp
```

### `conversations` Collection
Stores chat relationships between users.

```
conversations/
  └── {conversationId}/
        ├── participants: array [uid1, uid2]
        ├── participant_usernames: map { uid1: "username1", uid2: "username2" }
        ├── created_at: timestamp
        ├── updated_at: timestamp
        ├── created_by: string (uid)
        ├── last_message: string (optional)
        │
        ├── uploads/  (subcollection)
        │     └── {dateId_userId}/
        │           ├── user_id: string
        │           ├── date_id: string
        │           ├── image_url: string
        │           ├── caption: string
        │           ├── timestamp: timestamp
        │           └── conversation_id: string
        │
        └── daily_posts/  (subcollection - optional, for memories)
              └── {dateId}/
                    ├── theme_text: string
                    └── memory_image_url: string
```

---

## 🔐 2. Firestore Security Rules

Go to **Firebase Console → Firestore Database → Rules** and replace with:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // ==========================================
    // USERS COLLECTION
    // ==========================================
    match /users/{userId} {
      // Allow public read for:
      // - Username availability check during signup
      // - User search after login
      // This is safe: only username/email are stored (like Twitter)
      allow read: if true;
      
      // Users can only create/update their own profile
      allow create: if isAuthenticated() && isOwner(userId);
      allow update: if isAuthenticated() && isOwner(userId);
      
      // Users cannot delete profiles
      allow delete: if false;
    }
    
    // ==========================================
    // CONVERSATIONS COLLECTION
    // ==========================================
    match /conversations/{conversationId} {
      // Helper: check if user is a participant
      function isParticipant() {
        return isAuthenticated() && 
               request.auth.uid in resource.data.participants;
      }
      
      function willBeParticipant() {
        return isAuthenticated() && 
               request.auth.uid in request.resource.data.participants;
      }
      
      // Participants can read the conversation
      allow read: if isParticipant();
      
      // Authenticated users can create conversations they're part of
      allow create: if isAuthenticated() && willBeParticipant();
      
      // Participants can update the conversation
      allow update: if isParticipant();
      
      // Don't allow deletion (preserve history)
      allow delete: if false;
      
      // ------------------------------------------
      // UPLOADS SUBCOLLECTION (within conversation)
      // ------------------------------------------
      match /uploads/{uploadId} {
        // Participants can read uploads
        allow read: if isAuthenticated() && 
                       request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        
        // Participants can create their own uploads
        allow create: if isAuthenticated() && 
                        request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants &&
                        request.resource.data.user_id == request.auth.uid;
        
        // Users can update/delete their own uploads
        allow update, delete: if isAuthenticated() && 
                                 resource.data.user_id == request.auth.uid;
      }
      
      // ------------------------------------------
      // DAILY_POSTS SUBCOLLECTION (within conversation)
      // ------------------------------------------
      match /daily_posts/{postId} {
        // Participants can read daily posts
        allow read: if isAuthenticated() && 
                       request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        
        // Participants can create/update daily posts
        allow create, update: if isAuthenticated() && 
                                 request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
        
        allow delete: if false;
      }
    }
    
    // ==========================================
    // USER TOKENS (for push notifications)
    // ==========================================
    match /user_tokens/{userId} {
      allow read, write: if isAuthenticated() && isOwner(userId);
    }
    
    // ==========================================
    // LEGACY: Old uploads collection (if still used)
    // ==========================================
    match /uploads/{uploadId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && 
                       request.resource.data.user_id == request.auth.uid;
      allow update, delete: if isAuthenticated() && 
                               resource.data.user_id == request.auth.uid;
    }
    
    // ==========================================
    // LEGACY: Old daily_posts collection (if still used)
    // ==========================================
    match /daily_posts/{postId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
  }
}
```

---

## 📇 3. Firestore Indexes

You need to create composite indexes for queries. Go to **Firebase Console → Firestore Database → Indexes → Add Index**:

### Index 1: Conversations by participant
| Collection ID | Fields Indexed | Query Scope |
|---------------|----------------|-------------|
| `conversations` | `participants` (Arrays) + `updated_at` (Descending) | Collection |

### Index 2: Users by username (for search)
| Collection ID | Fields Indexed | Query Scope |
|---------------|----------------|-------------|
| `users` | `username_lowercase` (Ascending) | Collection |

### Index 3: Uploads by date (within conversations)
| Collection ID | Fields Indexed | Query Scope |
|---------------|----------------|-------------|
| `uploads` | `date_id` (Ascending) | Collection Group |

> **💡 Tip:** If you see an error in the browser console about missing indexes, Firebase provides a direct link to create the required index automatically!

---

## 🗂️ 4. Storage Rules

Go to **Firebase Console → Storage → Rules** and update:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Helper function
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Conversation uploads
    match /conversations/{conversationId}/{userId}/{fileName} {
      // Allow read if authenticated
      allow read: if isAuthenticated();
      
      // Allow write only to own folder
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // Legacy uploads folder
    match /uploads/{userId}/{fileName} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // Allow reading public assets
    match /{allPaths=**} {
      allow read: if true;
    }
  }
}
```

---

## ✅ 5. Quick Setup Checklist

### Step-by-Step:

- [ ] **1. Open Firebase Console** → [console.firebase.google.com](https://console.firebase.google.com)

- [ ] **2. Go to Firestore Database → Rules**
  - Copy and paste the security rules from Section 2
  - Click **Publish**

- [ ] **3. Go to Firestore Database → Indexes**
  - Create the composite indexes from Section 3
  - Wait for indexes to build (can take a few minutes)

- [ ] **4. Go to Storage → Rules**
  - Copy and paste the storage rules from Section 4
  - Click **Publish**

- [ ] **5. Enable Authentication** (if not already)
  - Go to **Authentication → Sign-in method**
  - Enable **Email/Password**

- [ ] **6. Deploy Cloud Functions** (for push notifications)
  - Run `firebase deploy --only functions`
  - Wait for deployment to complete

---

## 🧪 6. Testing the Setup

After configuring Firebase:

1. **Create a new account** using the Sign Up form
2. **Check Firestore** → You should see a new document in `users` collection
3. **Search for another user** by username
4. **Start a conversation** → Check `conversations` collection
5. **Upload a photo** → Check `conversations/{id}/uploads` subcollection

---

## 🚨 7. Troubleshooting

### "Missing or insufficient permissions"
- Check that your Firestore rules are published
- Verify the user is authenticated
- Check browser console for the exact path that failed

### "The query requires an index"
- Click the link in the error message to auto-create the index
- Wait 2-5 minutes for the index to build

### Users can't find each other
- Make sure `username_lowercase` field exists
- Search is case-insensitive but requires exact match

### Photos not loading
- Check Storage rules are published
- Verify the storage path matches the rules

---

## 📝 8. Database Naming

Your app uses a custom Firestore database named `mybubiiapp2005` (not the default).

This is already configured in `firebaseConfig.js`:
```javascript
export const db = getFirestore(app, 'mybubiiapp2005');
```

Make sure you're editing rules for the correct database in Firebase Console!

---

## 🔔 9. Deploy Cloud Functions (for Push Notifications)

The app includes Firebase Cloud Functions that send push notifications when:
- Someone invites you to a new chat
- Your partner uploads a photo

### Deploy the Functions:

1. **Install Firebase CLI** (if not installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Deploy the functions**:
   ```bash
   cd C:\MyBubiApp
   firebase deploy --only functions
   ```

4. **Wait for deployment** (takes 1-2 minutes)

### What gets deployed:

| Function | Trigger | What it does |
|----------|---------|--------------|
| `notifyChatInvite` | New conversation created | Notifies invited user |
| `notifyPartnerOnConversationUpload` | New photo in conversation | Notifies partner |
| `notifyPartnerOnUpload` | Legacy upload trigger | For backwards compatibility |
| `notifyMidnightMemory` | Daily at midnight | Notifies about new memories |
| `notifyEvery2Hours` | Every 2 hours | Reminder notifications |
| `notifyDaily1420` | Daily at 14:20 | Special time notification |
| `testNotificationNow` | HTTP request | Test notifications |

### Test the notifications:

After deploying, visit this URL to test:
```
https://us-central1-mybubiiapp.cloudfunctions.net/testNotificationNow
```

---

## 🎉 Done!

Once you've completed these steps, your multi-user chat system will be fully functional!

Users can:
- ✅ Sign up with username
- ✅ Search for other users
- ✅ Start conversations
- ✅ Share daily photos
- ✅ See partner's photos (after uploading their own)
- ✅ Receive push notifications for chat invites
- ✅ Receive push notifications for new photos

