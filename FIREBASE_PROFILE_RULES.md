# 🔥 Firebase Rules Update for Profile Feature

This document shows the **UPDATED** Firebase rules needed to support the new Profile feature (profile pictures, username changes, account deletion).

---

## 🔐 Updated Firestore Rules

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
      
      // Users can delete their own profile (for account deletion)
      allow delete: if isAuthenticated() && isOwner(userId);
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
      // Allow deletion for account deletion
      allow delete: if isAuthenticated() && isOwner(userId);
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

### 🔴 Changes Made:
1. **Users collection**: Added `allow delete` - Users can now delete their own profile
2. **User tokens**: Added `allow delete` - Users can delete their FCM token

---

## 🗂️ Updated Storage Rules

Go to **Firebase Console → Storage → Rules** and replace with:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Helper function
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // ==========================================
    // PROFILE PICTURES
    // Path: profile_pictures/{userId}/{fileName}
    // ==========================================
    match /profile_pictures/{userId}/{fileName} {
      // Authenticated users can read profile pictures
      allow read: if isAuthenticated();
      
      // Users can upload/delete their own profile picture
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // ==========================================
    // CONVERSATION PHOTOS
    // Path: conversations/{conversationId}/{userId}/{fileName}
    // ==========================================
    match /conversations/{conversationId}/{userId}/{fileName} {
      // Authenticated users can read (participants will have access via Firestore)
      allow read: if isAuthenticated();
      
      // Users can only upload to their own folder
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // ==========================================
    // LEGACY UPLOADS (if still used)
    // Path: uploads/{userId}/{fileName}
    // ==========================================
    match /uploads/{userId}/{fileName} {
      // Authenticated users can read
      allow read: if isAuthenticated();
      
      // Only owner can write
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // ==========================================
    // PUBLIC ASSETS (videos, icons, etc.)
    // ==========================================
    match /{allPaths=**} {
      allow read: if true;
    }
  }
}
```

### 🔴 Changes Made:
1. **Added profile_pictures path** - Users can upload/delete their own profile pictures at `profile_pictures/{userId}/{fileName}`

---

## 📊 Updated Firestore Data Structure

The `users` collection now includes an optional `profile_picture_url` field:

```
users/
  └── {userId}/
        ├── uid: string
        ├── email: string
        ├── username: string
        ├── username_lowercase: string
        ├── display_name: string
        ├── profile_picture_url: string (optional)  ← NEW FIELD
        ├── created_at: timestamp
        └── updated_at: timestamp
```

---

## ✅ Quick Update Checklist

- [ ] **1. Update Firestore Rules**
  - Go to Firestore Database → Rules
  - Replace with the updated rules above
  - Click **Publish**

- [ ] **2. Update Storage Rules**
  - Go to Storage → Rules
  - Replace with the updated rules above
  - Click **Publish**

- [ ] **3. Test the Profile Feature**
  - Click profile icon in Dashboard
  - Try changing username
  - Try uploading a profile picture
  - Verify it appears in Dashboard header

---

## 🎉 Done!

Your app now supports:
- ✅ Profile pictures (with initials as fallback)
- ✅ Username changes
- ✅ Display name changes
- ✅ Account deletion (with password confirmation)

