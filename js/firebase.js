/* 
  ARCHIVO: js/firebase.js
  ESTADO: Limpio y corregido.
*/

// 1. Importaciones directas de Google (Versión Web Modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// 2. TUS CREDENCIALES (Pega aquí las tuyas reales)
const firebaseConfig = {
  apiKey: "AIzaSyB1K9O7zDCouHYIHkPvdLxAqkKxGPZ1hVY",
  authDomain: "humana-mvp-2000.firebaseapp.com",
  projectId: "humana-mvp-2000",
  storageBucket: "humana-mvp-2000.firebasestorage.app",
  messagingSenderId: "642338833046",
  appId: "1:642338833046:web:eda84576ddc8a794afb8b7"
};

// 3. Inicializamos la App
const app = initializeApp(firebaseConfig);

// 4. EXPORTAMOS las herramientas (Esto es lo que falló antes)
// La palabra 'export' permite que auth.js use estas variables.
export const auth = getAuth(app);
export const db = getFirestore(app);

// 5. Señal de vida
console.log("1. Módulo Firebase cargado correctamente 🟢");