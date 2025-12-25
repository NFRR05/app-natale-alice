// Cloud Functions per inviare notifiche FCM quando il partner carica una foto
// e per notifiche a mezzanotte quando viene sbloccato un nuovo ricordo
// Deploy con: firebase deploy --only functions

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Get Firestore instance - use default database
// Note: If you have multiple databases, you may need to specify the database ID
const db = admin.firestore();

// Trigger quando viene creato un nuovo upload
exports.notifyPartnerOnUpload = functions.firestore
    .document("uploads/{uploadId}")
  .onCreate(async (snap, context) => {
      const uploadData = snap.data();
      const uploadUserId = uploadData.user_id;
      const dateId = uploadData.date_id;

      console.log("📸 [FUNCTION] New upload detected:", {
      uploadId: context.params.uploadId,
      userId: uploadUserId,
        dateId: dateId,
      });

    // Trova il token FCM del partner
      // Cerca nella collection user_tokens tutti i token e trova quello
      // diverso dall'utente corrente
      const allTokensSnapshot = await db.collection("user_tokens").get();
      const partnerTokenDoc = allTokensSnapshot.docs.find((doc) => {
        const tokenData = doc.data();
        return tokenData.user_id && tokenData.user_id !== uploadUserId &&
               tokenData.fcm_token;
      });

    if (!partnerTokenDoc) {
        console.log("⚠️ [FUNCTION] Partner FCM token not found");
        return null;
    }

      const partnerFCMToken = partnerTokenDoc.data().fcm_token;
      const partnerUserId = partnerTokenDoc.data().user_id;
    
      console.log("✅ [FUNCTION] Found partner token:", {
      partnerUserId: partnerUserId,
        hasToken: !!partnerFCMToken,
      });

    // Prepara il messaggio
    const message = {
      notification: {
          title: "Nuova foto dal partner! 💕",
          body: "Il tuo partner ha caricato una nuova foto. " +
                "Apri l'app per vederla!",
      },
      data: {
          type: "partner_upload",
        date_id: dateId,
          upload_id: context.params.uploadId,
      },
      token: partnerFCMToken,
      webpush: {
        notification: {
            icon: "/favicon.svg",
            badge: "/favicon.svg",
            vibrate: [200, 100, 200],
          },
        },
      };

    // Invia la notifica
    try {
        const response = await admin.messaging().send(message);
        console.log("✅ [FUNCTION] Notification sent successfully:", response);
        return {success: true, messageId: response};
      } catch (error) {
        console.error("❌ [FUNCTION] Error sending notification:", error);
        return {success: false, error: error.message};
      }
    });

// Scheduled function per notificare a mezzanotte quando viene sbloccato
// un nuovo ricordo. Esegue ogni giorno alle 00:00 (mezzanotte) UTC
exports.notifyMidnightMemory = functions.pubsub
    .schedule("0 0 * * *") // Every day at midnight UTC
    .timeZone("Europe/Rome") // Adjust to your timezone
    .onRun(async (context) => {
      console.log("🌙 [FUNCTION] Midnight notification triggered");

      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const todayId = `${today.getFullYear()}-` +
            `${String(today.getMonth() + 1).padStart(2, "0")}-` +
            `${String(today.getDate()).padStart(2, "0")}`;

        console.log("📅 [FUNCTION] Checking for memory for date:", todayId);

        // Check if there's a daily_post for today
        const dailyPostRef = db.collection("daily_posts").doc(todayId);
        const dailyPostSnap = await dailyPostRef.get();

        if (!dailyPostSnap.exists) {
          console.log(
              "ℹ️ [FUNCTION] No memory found for today, skipping notification"
          );
          return null;
        }

        const dailyPostData = dailyPostSnap.data();
        const hasMemory = !!dailyPostData.memory_image_url;

        if (!hasMemory) {
          console.log(
              "ℹ️ [FUNCTION] Memory exists but no image, skipping notification"
          );
          return null;
        }

        console.log(
            "✅ [FUNCTION] Memory found for today, " +
            "sending notifications to all users"
        );

        // Get all FCM tokens
        const allTokensSnapshot = await db.collection("user_tokens").get();

        if (allTokensSnapshot.empty) {
          console.log("⚠️ [FUNCTION] No FCM tokens found");
          return null;
        }

        // Send notification to all users
        const messages = [];
        allTokensSnapshot.forEach((doc) => {
          const tokenData = doc.data();
          if (tokenData.fcm_token) {
            messages.push({
              notification: {
                title: "Nuovo ricordo sbloccato! 🎁",
                body: dailyPostData.theme_text ||
                      "Un nuovo ricordo ti aspetta oggi!",
              },
              data: {
                type: "midnight_memory",
                date_id: todayId,
                theme_text: dailyPostData.theme_text || "",
                memory_image_url: dailyPostData.memory_image_url || "",
              },
              token: tokenData.fcm_token,
              webpush: {
                notification: {
                  icon: "/favicon.svg",
                  badge: "/favicon.svg",
                  vibrate: [200, 100, 200],
                },
              },
            });
          }
        });

        if (messages.length === 0) {
          console.log("⚠️ [FUNCTION] No valid FCM tokens found");
          return null;
        }

        // Send all notifications
        const results = await admin.messaging().sendAll(messages);
        console.log(
            `✅ [FUNCTION] Sent ${results.successCount} midnight notifications`
        );
        console.log(
            `⚠️ [FUNCTION] Failed: ${results.failureCount} notifications`
        );

        return {
          success: true,
          sent: results.successCount,
          failed: results.failureCount,
        };
    } catch (error) {
        console.error(
            "❌ [FUNCTION] Error in midnight notification:", error
        );
        return {success: false, error: error.message};
    }
    });

// Helper function per inviare notifiche a tutti gli utenti
const sendNotificationToAllUsers = async (title, body, dataType = "reminder") => {
  try {
    const allTokensSnapshot = await db.collection("user_tokens").get();

    if (allTokensSnapshot.empty) {
      console.log("⚠️ [FUNCTION] No FCM tokens found");
      return {success: false, sent: 0, failed: 0};
    }

    const messages = [];
    allTokensSnapshot.forEach((doc) => {
      const tokenData = doc.data();
      if (tokenData.fcm_token) {
        messages.push({
          notification: {
            title: title,
            body: body,
          },
          data: {
            type: dataType,
          },
          token: tokenData.fcm_token,
          webpush: {
            notification: {
              icon: "/favicon.svg",
              badge: "/favicon.svg",
              vibrate: [200, 100, 200],
            },
          },
        });
      }
    });

    if (messages.length === 0) {
      console.log("⚠️ [FUNCTION] No valid FCM tokens found");
      return {success: false, sent: 0, failed: 0};
    }

    const results = await admin.messaging().sendAll(messages);
    console.log(`✅ [FUNCTION] Sent ${results.successCount} notifications`);
    console.log(`⚠️ [FUNCTION] Failed: ${results.failureCount} notifications`);

    return {
      success: true,
      sent: results.successCount,
      failed: results.failureCount,
    };
  } catch (error) {
    console.error("❌ [FUNCTION] Error sending notifications:", error);
    return {success: false, error: error.message, sent: 0, failed: 0};
  }
};

// Notifica ogni 2 ore in punto (ore pari: 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22)
exports.notifyEvery2Hours = functions.pubsub
    .schedule("0 */2 * * *") // Ogni 2 ore a minuto 0
    .timeZone("Europe/Rome")
    .onRun(async (context) => {
      console.log("⏰ [FUNCTION] 2-hour notification triggered");

      const now = new Date();
      const hour = now.getHours();

      // Verifica che sia un'ora pari (0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22)
      if (hour % 2 !== 0) {
        console.log(`⏭️ [FUNCTION] Skipping - current hour ${hour} is not even`);
        return null;
      }

      const messages = [
        "💕 È il momento di condividere i tuoi momenti speciali!",
        "📸 Non dimenticare di caricare la tua foto di oggi!",
        "❤️ Il tuo partner ti aspetta su MyBubiAPP!",
        "✨ Scatta un momento speciale e condividilo!",
      ];

      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      const result = await sendNotificationToAllUsers(
          `MyBubiAPP - Ora ${hour}:00`,
          randomMessage,
          "hourly_reminder"
      );

      return result;
    });

// Notifica giornaliera alle 14:20 precisa
exports.notifyDaily1420 = functions.pubsub
    .schedule("35 14 * * *") // Ogni giorno alle 14:20
    .timeZone("Europe/Rome")
    .onRun(async (context) => {
      console.log("🕐 [FUNCTION] Daily 14:20 notification triggered");

      const result = await sendNotificationToAllUsers(
          "MyBubiAPP - Pomeriggio 💕",
          "È il momento perfetto per condividere il tuo momento speciale di oggi! 📸",
          "daily_reminder"
      );

      return result;
    });
