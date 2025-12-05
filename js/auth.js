/* ARCHIVO: js/auth.js (CORREGIDO) */
import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- LOGIN ---
export async function loginUsuario(email, password) {
    try {
        const credenciales = await signInWithEmailAndPassword(auth, email, password);
        const user = credenciales.user;
        
        // Consultar Rol en DB
        const docRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const datos = docSnap.data();
            return {
                success: true,
                nombre: datos.nombre,
                email: datos.email,
                rol: datos.rol,
                jacId: datos.jacId || "providencia" // Fallback por si acaso
            };
        } else {
            // AQUÍ ES DONDE TE SALÍA EL ERROR 2
            alert("Error crítico: Usuario autenticado pero sin perfil en base de datos. Contacta soporte.");
            return { success: false };
        }

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

// --- REGISTRO (AQUÍ ESTABA EL ERROR) ---
// Fíjate que ahora añadimos 'jacId' en los argumentos de la función
export async function registrarUsuario(nombre, email, password, telefono, jacId) {
    try {
        // 1. Crear usuario en Auth (Google)
        const credencial = await createUserWithEmailAndPassword(auth, email, password);
        
        // 2. Guardar en Firestore
        // Si no llega jacId, ponemos 'providencia' por defecto para evitar errores
        const juntaAsignada = jacId || "providencia"; 

        await setDoc(doc(db, "usuarios", credencial.user.uid), {
            nombre: nombre,
            email: email,
            telefono: telefono,
            rol: "vecino",
            jacId: juntaAsignada, // <--- Aquí es donde fallaba antes
            fechaRegistro: new Date().toISOString()
        });
        
        alert("¡Cuenta creada exitosamente! Bienvenido a tu comunidad.");
        window.location.reload();

    } catch (error) {
        console.error("Error Registro:", error);
        
        // Si falló el guardado en DB pero se creó en Auth, es un problema.
        // En un sistema avanzado borraríamos el usuario de Auth, 
        // pero para el MVP basta con mostrar el error.
        alert("Error: " + error.message);
    }
}