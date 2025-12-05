/* ARCHIVO: js/auth.js (CON PERSISTENCIA) */
import { auth, db } from "./firebase.js";
// Agregamos 'onAuthStateChanged' a los imports
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- LOGIN MANUAL ---
export async function loginUsuario(email, password) {
    try {
        const credenciales = await signInWithEmailAndPassword(auth, email, password);
        // Nota: No necesitamos devolver nada aquí porque el 'monitorSesion'
        // detectará el cambio automáticamente.
        return { success: true };
    } catch (error) {
        console.error("Error Login:", error);
        alert("Fallo al ingresar: " + error.message);
        return { success: false };
    }
}

// --- LOGOUT ---
export async function logout() {
    try {
        await signOut(auth);
        window.location.reload(); 
    } catch (error) {
        console.error("Error al salir", error);
    }
}

// --- REGISTRO ---
export async function registrarUsuario(nombre, email, password, telefono, jacId) {
    try {
        const credencial = await createUserWithEmailAndPassword(auth, email, password);
        const juntaAsignada = jacId || "providencia"; 

        await setDoc(doc(db, "usuarios", credencial.user.uid), {
            nombre: nombre,
            email: email,
            telefono: telefono,
            rol: "vecino",
            jacId: juntaAsignada,
            fechaRegistro: new Date().toISOString()
        });
        
        alert("¡Cuenta creada! Bienvenido.");
        // No recargamos, dejamos que el monitor detecte el ingreso
    } catch (error) {
        console.error("Error Registro:", error);
        alert("Error: " + error.message);
    }
}

// --- NUEVO: MONITOR DE SESIÓN (El Guardia) ---
// Esta función se ejecutará automáticamente cuando Firebase detecte un usuario
export function monitorSesion(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Si hay usuario (login previo o recarga de página)
            console.log("Usuario detectado:", user.email);
            
            // Buscamos sus datos en la base de datos
            const docRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // Enviamos los datos al app.js para que pinte el dashboard
                callback(docSnap.data());
            } else {
                console.error("Usuario sin datos en DB");
            }
        } else {
            // No hay usuario (nadie logueado)
            console.log("No hay sesión activa.");
            callback(null);
        }
    });
}