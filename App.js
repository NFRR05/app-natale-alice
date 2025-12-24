import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Notifications from 'expo-notifications';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebaseConfig';

// Configurazione notifiche
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Email consentiti (hardcoded per sicurezza)
const ALLOWED_EMAILS = [
  'riccardoremec05@gmail.com', // Sostituisci con la prima email
  'alicebiancato5@gmail.com', // Sostituisci con la seconda email
];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Stato per la home screen
  const [theme, setTheme] = useState('');
  const [memoryImage, setMemoryImage] = useState(null);
  const [myUpload, setMyUpload] = useState(null);
  const [partnerUpload, setPartnerUpload] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dateId, setDateId] = useState('');

  useEffect(() => {
    // Verifica stato autenticazione
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        setupNotifications();
        loadDailyData();
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadDailyData();
    }
  }, [user]);

  // Imposta notifiche giornaliere alle 13:00
  const setupNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permessi', 'Le notifiche sono necessarie per ricordarti la foto quotidiana!');
      return;
    }

    // Cancella notifiche precedenti
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Crea notifica ricorrente
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'È ora della foto! 📸',
        body: 'Non dimenticare di condividere il tuo momento speciale di oggi!',
        sound: true,
      },
      trigger: {
        hour: 13,
        minute: 0,
        repeats: true,
      },
    });
  };

  // Carica dati del giorno
  const loadDailyData = async () => {
    if (!user) return;

    const today = new Date();
    const todayId = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setDateId(todayId);

    try {
      // Carica tema del giorno
      const dailyPostRef = doc(db, 'daily_posts', todayId);
      const dailyPostSnap = await getDoc(dailyPostRef);
      
      if (dailyPostSnap.exists()) {
        setTheme(dailyPostSnap.data().theme_text || 'Nessun tema per oggi');
        setMemoryImage(dailyPostSnap.data().memory_image_url || null);
      } else {
        setTheme('Nessun tema per oggi');
      }

      // Carica uploads del giorno
      const uploadsRef = collection(db, 'uploads');
      const q = query(uploadsRef, where('date_id', '==', todayId));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.user_id === user.uid) {
          setMyUpload(data);
        } else {
          setPartnerUpload(data);
        }
      });
    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
      Alert.alert('Errore', 'Impossibile caricare i dati del giorno');
    }
  };

  // Login
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Errore', 'Inserisci email e password');
      return;
    }

    if (!ALLOWED_EMAILS.includes(email.toLowerCase())) {
      Alert.alert('Accesso Negato', 'Questa email non è autorizzata');
      return;
    }

    setLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      Alert.alert('Errore', error.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMyUpload(null);
      setPartnerUpload(null);
      setCaption('');
    } catch (error) {
      Alert.alert('Errore', error.message);
    }
  };

  // Seleziona immagine
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permessi', 'L\'app ha bisogno dell\'accesso alle foto');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1, // Prendiamo la qualità massima, poi comprimiamo
    });

    if (!result.canceled && result.assets[0]) {
      try {
        // Comprimi e ridimensiona l'immagine
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [
            { resize: { width: 1080 } }, // Max 1080px di larghezza (ottimo per mobile)
          ],
          {
            compress: 0.7, // Qualità 70% (riduce drasticamente la dimensione)
            format: ImageManipulator.SaveFormat.JPEG, // Forza JPEG (più piccolo di HEIC)
          }
        );

        setMyUpload({ image_uri: manipResult.uri });
      } catch (error) {
        console.error('Errore compressione:', error);
        Alert.alert('Errore', 'Impossibile processare l\'immagine');
      }
    }
  };

  // Carica foto
  const uploadPhoto = async () => {
    if (!myUpload?.image_uri) {
      Alert.alert('Errore', 'Seleziona prima una foto');
      return;
    }

    setUploading(true);
    try {
      // Converti URI in blob
      const response = await fetch(myUpload.image_uri);
      const blob = await response.blob();

      // Log della dimensione (opzionale, per debug)
      const sizeInMB = (blob.size / (1024 * 1024)).toFixed(2);
      console.log(`Dimensione foto compressa: ${sizeInMB} MB`);

      // Upload a Firebase Storage
      const imageRef = ref(storage, `uploads/${user.uid}/${dateId}_${Date.now()}.jpg`);
      await uploadBytes(imageRef, blob);
      const imageUrl = await getDownloadURL(imageRef);

      // Salva in Firestore
      const uploadData = {
        date_id: dateId,
        user_id: user.uid,
        image_url: imageUrl,
        caption: caption || '',
        timestamp: serverTimestamp(),
      };

      const uploadRef = doc(db, 'uploads', `${dateId}_${user.uid}`);
      await setDoc(uploadRef, uploadData);

      // Aggiorna stato locale
      setMyUpload({
        ...uploadData,
        timestamp: new Date(),
      });
      setCaption('');

      Alert.alert('Successo!', `Foto caricata con successo! (${sizeInMB} MB)`);
      await loadDailyData();
    } catch (error) {
      console.error('Errore upload:', error);
      Alert.alert('Errore', 'Impossibile caricare la foto');
    } finally {
      setUploading(false);
    }
  };

  // Formatta timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  // Verifica se può vedere la foto del partner
  const canSeePartnerPhoto = myUpload && myUpload.image_url;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b9d" />
      </View>
    );
  }

  // Schermata di login
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.loginContainer}
        >
          <View style={styles.loginContent}>
            <Text style={styles.loginTitle}>Il Nostro Album 📸</Text>
            <Text style={styles.loginSubtitle}>Condividi i tuoi momenti speciali</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, loginLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loginLoading}
            >
              {loginLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Accedi</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Home screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Il Nostro Album</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Esci</Text>
          </TouchableOpacity>
        </View>

        {/* Tema del Giorno */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tema del Giorno</Text>
          <Text style={styles.themeText}>{theme || 'Nessun tema per oggi'}</Text>
        </View>

        {/* Ricordo del Giorno */}
        {memoryImage && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ricordo del Giorno</Text>
            <Image source={{ uri: memoryImage }} style={styles.memoryImage} />
          </View>
        )}

        {/* La Tua Foto */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>La Tua Foto di Oggi</Text>
          {myUpload?.image_url ? (
            <View>
              <Image source={{ uri: myUpload.image_url }} style={styles.uploadImage} />
              {myUpload.caption && (
                <Text style={styles.caption}>{myUpload.caption}</Text>
              )}
              {myUpload.timestamp && (
                <Text style={styles.timestamp}>
                  Caricata alle {formatTimestamp(myUpload.timestamp)}
                </Text>
              )}
            </View>
          ) : (
            <View>
              {myUpload?.image_uri ? (
                <View>
                  <Image source={{ uri: myUpload.image_uri }} style={styles.uploadImage} />
                  <TextInput
                    style={styles.captionInput}
                    placeholder="Aggiungi una didascalia..."
                    placeholderTextColor="#999"
                    value={caption}
                    onChangeText={setCaption}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.uploadButton, uploading && styles.buttonDisabled]}
                    onPress={uploadPhoto}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.uploadButtonText}>Carica Foto</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.pickImageButton} onPress={pickImage}>
                  <Text style={styles.pickImageText}>📷 Seleziona una Foto</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Foto del Partner */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>La Foto del Tuo Partner</Text>
          {partnerUpload ? (
            canSeePartnerPhoto ? (
              <View>
                <Image source={{ uri: partnerUpload.image_url }} style={styles.uploadImage} />
                {partnerUpload.caption && (
                  <Text style={styles.caption}>{partnerUpload.caption}</Text>
                )}
                {partnerUpload.timestamp && (
                  <Text style={styles.timestamp}>
                    Caricata alle {formatTimestamp(partnerUpload.timestamp)}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.blurredContainer}>
                <View style={styles.blurredOverlay}>
                  <Text style={styles.blurredText}>
                    🔒 Carica la tua foto per sbloccare!
                  </Text>
                </View>
                <Image
                  source={{ uri: partnerUpload.image_url }}
                  style={[styles.uploadImage, styles.blurredImage]}
                  blurRadius={20}
                />
              </View>
            )
          ) : (
            <Text style={styles.noUploadText}>
              Il tuo partner non ha ancora caricato la foto di oggi
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff5f7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff5f7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loginContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff6b9d',
    textAlign: 'center',
    marginBottom: 10,
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#ff6b9d',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ff6b9d',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#ff6b9d',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  themeText: {
    fontSize: 18,
    color: '#666',
    lineHeight: 26,
  },
  memoryImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  uploadImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    resizeMode: 'cover',
    marginBottom: 10,
  },
  caption: {
    fontSize: 16,
    color: '#333',
    marginTop: 10,
    lineHeight: 22,
  },
  captionInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    marginBottom: 15,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timestamp: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
  pickImageButton: {
    backgroundColor: '#ff6b9d',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  pickImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#ff6b9d',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  blurredContainer: {
    position: 'relative',
  },
  blurredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
  },
  blurredText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff6b9d',
    textAlign: 'center',
  },
  blurredImage: {
    opacity: 0.3,
  },
  noUploadText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
});

