// Cloud Functions per inviare notifiche FCM quando il partner carica una foto
// Deploy con: firebase deploy --only functions

const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()

// Trigger quando viene creato un nuovo upload
exports.notifyPartnerOnUpload = functions.firestore
  .document('uploads/{uploadId}')
  .onCreate(async (snap, context) => {
    const uploadData = snap.data()
    const uploadUserId = uploadData.user_id
    const dateId = uploadData.date_id

    console.log('📸 [FUNCTION] New upload detected:', {
      uploadId: context.params.uploadId,
      userId: uploadUserId,
      dateId: dateId
    })

    // Trova il token FCM del partner
    // Cerca nella collection user_tokens tutti i token e trova quello diverso dall'utente corrente
    const allTokensSnapshot = await admin.firestore().collection('user_tokens').get()
    const partnerTokenDoc = allTokensSnapshot.docs.find(doc => {
      const tokenData = doc.data()
      return tokenData.user_id && tokenData.user_id !== uploadUserId && tokenData.fcm_token
    })

    if (!partnerTokenDoc) {
      console.log('⚠️ [FUNCTION] Partner FCM token not found')
      return null
    }

    const partnerFCMToken = partnerTokenDoc.data().fcm_token
    const partnerUserId = partnerTokenDoc.data().user_id
    
    console.log('✅ [FUNCTION] Found partner token:', {
      partnerUserId: partnerUserId,
      hasToken: !!partnerFCMToken
    })

    // Prepara il messaggio
    const message = {
      notification: {
        title: 'Nuova foto dal partner! 💕',
        body: 'Il tuo partner ha caricato una nuova foto. Apri l\'app per vederla!',
      },
      data: {
        type: 'partner_upload',
        date_id: dateId,
        upload_id: context.params.uploadId
      },
      token: partnerFCMToken,
      webpush: {
        notification: {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          vibrate: [200, 100, 200]
        }
      }
    }

    // Invia la notifica
    try {
      const response = await admin.messaging().send(message)
      console.log('✅ [FUNCTION] Notification sent successfully:', response)
      return { success: true, messageId: response }
    } catch (error) {
      console.error('❌ [FUNCTION] Error sending notification:', error)
      return { success: false, error: error.message }
    }
  })

