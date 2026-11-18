// Configuración de Firebase para sincronizar la bitácora entre teléfonos.
// Pega aquí el objeto firebaseConfig de tu proyecto:
// Firebase → ⚙️ Configuración del proyecto → General → Tus apps → Configuración del SDK → "Config".
// Estos valores identifican tu proyecto y pueden ser públicos; la seguridad la dan
// las reglas de Firestore (firestore.rules) y que solo existan las cuentas de ustedes dos.
// Mientras apiKey diga "PEGA_AQUI", la app guarda los datos solo en el teléfono.
window.FIREBASE_CONFIG = {
  apiKey: "PEGA_AQUI",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
