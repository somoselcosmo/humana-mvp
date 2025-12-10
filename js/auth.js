import { auth, db } from "./firebase.js";

// Herramientas de Autenticación
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Herramientas de Base de Datos (Firestore)
import { 
    doc, 
    getDoc,
    setDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";


// =========================================================
// 1. INICIO DE SESIÓN
// =========================================================
export async function loginUsuario(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // El monitorSesion se encarga de redirigir
        return { success: true };
    } catch (error) {
        console.error("Error Login:", error);
        alert("Fallo al ingresar: " + error.message);
        return { success: false };
    }
}

// =========================================================
// 2. CERRAR SESIÓN
// =========================================================
export async function logout() {
    try {
        await signOut(auth);
        window.location.reload(); 
    } catch (error) {
        console.error("Error al salir", error);
    }
}

// =========================================================
// 3. MONITOR DE SESIÓN (PERSISTENCIA)
// =========================================================
export function monitorSesion(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("Usuario detectado:", user.email);
            
            // Aquí es donde fallaba antes porque no tenía 'getDoc'
            const docRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                callback(docSnap.data());
            } else {
                console.error("Usuario autenticado pero sin datos en DB");
                // Opcional: callback(null) o manejar el error
            }
        } else {
            console.log("No hay sesión activa.");
            callback(null);
        }
    });
}

// =========================================================
// 4. REGISTRO DE USUARIO COMPLETO (INTELIGENTE)
// =========================================================
export async function registrarUsuarioCompleto(datos) {
    try {
        // A. CREAR CUENTA DE ACCESO (Authentication)
        const credencial = await createUserWithEmailAndPassword(auth, datos.email, datos.pass);
        const uid = credencial.user.uid;
        const nombreCompleto = `${datos.nombres} ${datos.apellidos}`;

        // B. CREAR PERFIL DE USUARIO (Colección 'usuarios')
        // Guardamos TODOS los datos aquí
        await setDoc(doc(db, "usuarios", uid), {
            // Datos de Sistema
            email: datos.email,
            rol: "pendiente", 
            jacId: datos.jacId,
            fechaRegistro: new Date().toISOString(),

            // Datos Personales
            nombre: nombreCompleto,
            nombres: datos.nombres,
            apellidos: datos.apellidos,
            tipo_documento: datos.tipoDoc,
            documento: datos.numDoc,
            fecha_nacimiento: datos.fechaNac,
            genero: datos.genero,
            
            // Datos de Contacto y Rol
            direccion: datos.direccion,
            telefono: datos.telefono,
            comision_interes: datos.comision
        });

        // C. SINCRONIZACIÓN CON EL LIBRO DE AFILIADOS (Gemelo Digital)
        const afiliadosRef = collection(db, "jacs", datos.jacId, "libro_afiliados");
        const q = query(afiliadosRef, where("documento", "==", datos.numDoc));
        const snapshot = await getDocs(q);

        const datosLibro = {
            nombre: nombreCompleto,
            nombres: datos.nombres,
            apellidos: datos.apellidos,
            tipo_documento: datos.tipoDoc,
            documento: datos.numDoc,
            fecha_nacimiento: datos.fechaNac,
            genero: datos.genero,
            direccion: datos.direccion,
            telefono: datos.telefono,
            comision_trabajo: datos.comision,
            estado: "Activo",
            fecha_afiliacion: new Date().toISOString(),
            uid_usuario: uid,
            email: datos.email
        };

        if (!snapshot.empty) {
            // Si ya existe en el libro, lo actualizamos
            const idDocLibro = snapshot.docs[0].id;
            const docRef = doc(db, "jacs", datos.jacId, "libro_afiliados", idDocLibro);
            await updateDoc(docRef, datosLibro);
        } else {
            // Si es nuevo, lo creamos en el libro
            await addDoc(afiliadosRef, datosLibro);
        }

        return { success: true };

    } catch (error) {
        console.error("Error Registro:", error);
        return { success: false, message: error.message };
    }
}