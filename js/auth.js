// Autenticación local para entorno de pruebas (sin Firebase)
import { findUserByEmailAndPass, addMockUser } from "./mock_users.js";

// =========================================================
// 1. INICIO DE SESIÓN (mock)
// =========================================================
export async function loginUsuario(email, password) {
  try {
    const user = findUserByEmailAndPass(email, password);
    if (!user) {
      alert("Credenciales inválidas.");
      return { success: false };
    }
    // Guardamos una sesión simple en sessionStorage
    sessionStorage.setItem("hd_user", JSON.stringify(user));
    // Disparar evento para que la app detecte el cambio en la misma pestaña
    try {
      window.dispatchEvent(new Event("hd_session_changed"));
    } catch (e) {}
    // Retornar el usuario por si se necesita
    return { success: true, user };
  } catch (error) {
    console.error("Error login (mock):", error);
    return { success: false };
  }
}

// =========================================================
// 2. CERRAR SESIÓN (mock)
// =========================================================
export async function logout() {
  try {
    sessionStorage.removeItem("hd_user");
    // Disparar evento para que la app detecte el cambio en la misma pestaña
    try {
      window.dispatchEvent(new Event("hd_session_changed"));
    } catch (e) {}
    window.location.reload();
  } catch (error) {
    console.error("Error al salir (mock):", error);
  }
}

// =========================================================
// 3. MONITOR DE SESIÓN (PERSISTENCIA) - mock
// =========================================================
export function monitorSesion(callback) {
  try {
    const raw = sessionStorage.getItem("hd_user");
    const user = raw ? JSON.parse(raw) : null;
    // Llamada inmediata para inicializar estado
    callback(user);

    // Escuchar cambios de storage (otras pestañas) y evento custom (misma pestaña)
    window.addEventListener("storage", () => {
      const r = sessionStorage.getItem("hd_user");
      callback(r ? JSON.parse(r) : null);
    });
    window.addEventListener("hd_session_changed", () => {
      const r = sessionStorage.getItem("hd_user");
      callback(r ? JSON.parse(r) : null);
    });
  } catch (error) {
    console.error("monitorSesion (mock) error:", error);
    callback(null);
  }
}

// =========================================================
// 4. REGISTRO DE USUARIO (mock, runtime solamente)
// =========================================================
export async function registrarUsuarioCompleto(datos) {
  try {
    // Validación simple: no duplicar correo
    const exists = findUserByEmailAndPass(datos.email, datos.pass);
    if (exists) return { success: false, message: "Usuario ya existe" };

    const nombreCompleto = `${datos.nombres} ${datos.apellidos}`;
    const nuevo = addMockUser({
      email: datos.email,
      pass: datos.pass,
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      nombre: nombreCompleto,
      tipo_documento: datos.tipoDoc,
      documento: datos.numDoc,
      fecha_nacimiento: datos.fechaNac,
      genero: datos.genero,
      direccion: datos.direccion,
      telefono: datos.telefono,
      comision_interes: datos.comision,
      rol: "pendiente",
      jacId: datos.jacId,
    });

    return { success: true, user: nuevo };
  } catch (error) {
    console.error("Error registro (mock):", error);
    return { success: false, message: error.message };
  }
}
