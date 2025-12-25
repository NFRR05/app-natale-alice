// Cloud Functions per inviare notifiche FCM quando il partner carica una foto
// e per notifiche a mezzanotte quando viene sbloccato un nuovo ricordo
// Deploy con: firebase deploy --only functions

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

// Get Firestore instance - use the custom database "mybubiiapp2005"
const {getFirestore} = require("firebase-admin/firestore");
const db = getFirestore("mybubiiapp2005");

// Trigger quando viene creato un nuovo upload
exports.notifyPartnerOnUpload = onDocumentCreated(
    {
      document: "uploads/{uploadId}",
      database: "mybubiiapp2005",
    },
    async (event) => {
      const uploadData = event.data.data();
      const uploadUserId = uploadData.user_id;
      const dateId = uploadData.date_id;
      const uploadId = event.params.uploadId;

      console.log("📸 [FUNCTION] New upload detected:", {
        uploadId: uploadId,
        userId: uploadUserId,
        dateId: dateId,
      });

      // Trova il token FCM del partner
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
          upload_id: uploadId,
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
        console.log(
            "✅ [FUNCTION] Notification sent successfully:", response,
        );
        return {success: true, messageId: response};
      } catch (error) {
        console.error("❌ [FUNCTION] Error sending notification:", error);
        return {success: false, error: error.message};
      }
    },
);

// Scheduled function per notificare a mezzanotte quando viene sbloccato
// un nuovo ricordo
exports.notifyMidnightMemory = onSchedule(
    {
      schedule: "0 0 * * *",
      timeZone: "Europe/Rome",
    },
    async (event) => {
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
              "ℹ️ [FUNCTION] No memory found for today, " +
              "skipping notification",
          );
          return null;
        }

        const dailyPostData = dailyPostSnap.data();
        const hasMemory = !!dailyPostData.memory_image_url;

        if (!hasMemory) {
          console.log(
              "ℹ️ [FUNCTION] Memory exists but no image, " +
              "skipping notification",
          );
          return null;
        }

        console.log(
            "✅ [FUNCTION] Memory found for today, " +
            "sending notifications to all users",
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
                memory_image_url:
                    dailyPostData.memory_image_url || "",
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
            `✅ [FUNCTION] Sent ${results.successCount} ` +
            "midnight notifications",
        );
        console.log(
            `⚠️ [FUNCTION] Failed: ${results.failureCount} notifications`,
        );

        return {
          success: true,
          sent: results.successCount,
          failed: results.failureCount,
        };
      } catch (error) {
        console.error(
            "❌ [FUNCTION] Error in midnight notification:", error,
        );
        return {success: false, error: error.message};
      }
    },
);

// Helper function per inviare notifiche a tutti gli utenti
const sendNotificationToAllUsers = async (
    title,
    body,
    dataType = "reminder",
) => {
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
    console.log(
        `✅ [FUNCTION] Sent ${results.successCount} notifications`,
    );
    console.log(
        `⚠️ [FUNCTION] Failed: ${results.failureCount} notifications`,
    );

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

// Notifica ogni 2 ore in punto (ore pari: 0, 2, 4, 6, 8, 10, 12, 14, 16,
// 18, 20, 22)
exports.notifyEvery2Hours = onSchedule(
    {
      schedule: "0 0,2,4,6,8,10,12,14,16,18,20,22 * * *",
      timeZone: "Europe/Rome",
    },
    async (event) => {
      console.log("⏰ [FUNCTION] Every 2 hours notification triggered");

      const messages = [
        "È ora di un piccolo pensiero per il tuo amore! 💖",
        "Un nuovo momento da condividere ti aspetta! ✨",
        "Non dimenticare di rendere speciale questo momento! 💌",
        "Ogni due ore, un'occasione per amare! ❤️",
      ];
      const randomMessage =
          messages[Math.floor(Math.random() * messages.length)];

      const result = await sendNotificationToAllUsers(
          "MyBubiAPP Reminder",
          randomMessage,
          "hourly_reminder",
      );

      return result;
    },
);

// Notifica giornaliera alle 14:20 precisa
exports.notifyDaily1420 = onSchedule(
    {
      schedule: "20 14 * * *",
      timeZone: "Europe/Rome",
    },
    async (event) => {
      console.log("🕐 [FUNCTION] Daily 14:20 notification triggered");

      const result = await sendNotificationToAllUsers(
          "MyBubiAPP: Momento Speciale! 💑",
          "Sono le 14:20! Un pensiero per il tuo amore? " +
          "Apri l'app e condividi un momento!",
          "daily_1420_reminder",
      );

      return result;
    },
);

// Funzione di TEST per verificare le notifiche immediatamente
// Chiama: https://us-central1-mybubiiapp.cloudfunctions.net/testNotificationNow
// Elimina questa funzione dopo i test
exports.testNotificationNow = onRequest(
    async (req, res) => {
      console.log("🧪 [TEST] Test notification triggered");

      try {
        const allTokensSnapshot = await db.collection("user_tokens").get();

        if (allTokensSnapshot.empty) {
          console.log("⚠️ [TEST] No FCM tokens found in user_tokens");
          return res.status(400).json({
            error: "No FCM tokens found",
            message: "Make sure users have logged in and granted " +
                     "notification permissions",
          });
        }

        console.log(`📋 [TEST] Found ${allTokensSnapshot.size} user token(s)`);

        const messages = [];
        allTokensSnapshot.forEach((doc) => {
          const tokenData = doc.data();
          if (tokenData.fcm_token) {
            console.log(
                `📋 [TEST] Adding token for user: ${tokenData.user_id}`,
            );
            messages.push({
              notification: {
                title: "🧪 Test Notifica MyBubiAPP",
                body: "Se vedi questa notifica, " +
                      "tutto funziona perfettamente! ✅",
              },
              data: {
                type: "test",
                timestamp: new Date().toISOString(),
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
          } else {
            console.log(
                `⚠️ [TEST] User ${tokenData.user_id} has no FCM token`,
            );
          }
        });

        if (messages.length === 0) {
          return res.status(400).json({
            error: "No valid FCM tokens found",
            message: "Tokens exist but none have valid fcm_token field",
          });
        }

        console.log(`📤 [TEST] Sending ${messages.length} notification(s)...`);
        const results = await admin.messaging().sendAll(messages);

        console.log(
            `✅ [TEST] Results: ${results.successCount} sent, ` +
            `${results.failureCount} failed`,
        );

        return res.json({
          success: true,
          sent: results.successCount,
          failed: results.failureCount,
          totalTokens: allTokensSnapshot.size,
          validTokens: messages.length,
          message: `Notifiche inviate: ${results.successCount}, ` +
                   `Fallite: ${results.failureCount}`,
        });
      } catch (error) {
        console.error("❌ [TEST] Error:", error);
        return res.status(500).json({
          error: error.message,
          code: error.code,
        });
      }
    },
);
