/* ARCHIVO: js/app.js (VERSIÓN COMPLETA Y DEFINITIVA) */

// 1. IMPORTACIONES
import { loginUsuario, registrarUsuario, logout } from "./auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db } from "./firebase.js";

console.log("App iniciada: Sistema de Vistas Activo 🚀");

// 2. REFERENCIAS GLOBALES
let currentJacId = null; // Aquí guardaremos si es "providencia" o "san-vicente"

// Elementos DOM Principales
const viewAuth = document.getElementById('view-auth');
const viewDashboard = document.getElementById('view-dashboard');

// Elementos del Dashboard (Vistas Internas)
const sectionHome = document.getElementById('section-home');
const sectionDirectiva = document.getElementById('section-directiva');
const menuLinks = document.querySelectorAll('.menu-item'); // Los botones del sidebar

// Formularios
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const selectJac = document.getElementById('reg-jac');


// =========================================================
// 3. SISTEMA DE NAVEGACIÓN (CAMBIAR ENTRE INICIO Y DIRECTIVA)
// =========================================================
menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        // Verificamos si el botón tiene un destino (data-target)
        if(link.dataset.target) {
            e.preventDefault();
            
            // A. Actualizar estilo del botón (Active)
            menuLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // B. Ocultar todas las secciones
            if(sectionHome) sectionHome.classList.add('hidden-view');
            if(sectionDirectiva) sectionDirectiva.classList.add('hidden-view');

            // C. Mostrar la sección correcta
            const target = link.dataset.target;
            
            if (target === 'home') {
                if(sectionHome) sectionHome.classList.remove('hidden-view');
            } 
            else if (target === 'directiva') {
                if(sectionDirectiva) sectionDirectiva.classList.remove('hidden-view');
                // Si ya sabemos qué JAC es, cargamos los datos de la directiva
                if(currentJacId) cargarDirectiva(currentJacId);
            }
        }
    });
});


// =========================================================
// 4. FUNCIONES DE CARGA DE DATOS (FIREBASE)
// =========================================================

// --- A. Cargar Info General (Nombre, Video, NIT) ---
async function cargarInfoJAC(jacId) {
    try {
        currentJacId = jacId; // Guardamos el ID para usarlo luego
        const jacRef = doc(db, "jacs", jacId);
        const jacSnap = await getDoc(jacRef);

        if (jacSnap.exists()) {
            const data = jacSnap.data();
            
            // Llenar datos del Home
            document.getElementById('jac-nombre').textContent = data.nombre;
            document.getElementById('jac-lema').textContent = data.lema;
            document.getElementById('jac-desc').textContent = data.descripcion;
            document.getElementById('jac-nit').textContent = data.nit;
            document.getElementById('jac-lugar').textContent = data.lugar;
            document.getElementById('jac-uuid').textContent = data.uuid;
            document.getElementById('jac-did').textContent = data.did;
            document.getElementById('jac-video').src = data.videoUrl;

            // Actualizar título en Directiva también
            const tituloDir = document.getElementById('dir-titulo');
            if(tituloDir) tituloDir.textContent = "Gobierno " + data.nombre;
        }
    } catch (error) {
        console.error("Error cargando JAC:", error);
    }
}

// --- B. Cargar Miembros de la Directiva ---
async function cargarDirectiva(jacId) {
    console.log("Cargando directiva de:", jacId);
    const tbody = document.getElementById('tabla-directiva-body');
    if(!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Cargando equipo...</td></tr>';

    try {
        const directivaRef = collection(db, "jacs", jacId, "directiva");
        const snapshot = await getDocs(directivaRef);
        
        tbody.innerHTML = ''; // Limpiar

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">No hay miembros registrados aún.</td></tr>';
            // Limpiar tarjetas si no hay datos
            pintarTarjeta('card-presidente', {nombre: 'Vacante', cargo: 'Sin asignar'});
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Lógica para repartir los datos en las tarjetas o la tabla
            if (data.cargo.toLowerCase().includes('presidente') && !data.cargo.toLowerCase().includes('vice')) {
                pintarTarjeta('card-presidente', data);
            } 
            else if (data.cargo.toLowerCase().includes('vice')) {
                pintarTarjeta('card-vice', data);
            }
            else {
                // Agregar a la tabla
                const iniciales = data.nombre.substring(0,2).toUpperCase();
                const fila = `
                    <tr>
                        <td style="display:flex; gap:10px; align-items:center;">
                            <div class="avatar-circle" style="width:32px; height:32px; font-size:0.8rem;">${iniciales}</div>
                            ${data.nombre}
                        </td>
                        <td>${data.cargo}</td>
                        <td><span class="badge badge-active" style="color:#10b981; background:rgba(16,185,129,0.1); padding:4px 8px; border-radius:10px; font-size:0.7rem;">Activo</span></td>
                    </tr>
                `;
                tbody.innerHTML += fila;
            }
        });

    } catch (error) {
        console.error("Error cargando directiva:", error);
        tbody.innerHTML = '<tr><td colspan="3">Error al cargar datos.</td></tr>';
    }
}

// Auxiliar para pintar tarjeta pequeña
function pintarTarjeta(elementId, data) {
    const el = document.getElementById(elementId);
    const iniciales = data.nombre ? data.nombre.substring(0,2).toUpperCase() : "--";
    
    if(el) {
        el.innerHTML = `
            <div class="avatar-circle">${iniciales}</div>
            <div class="member-info">
                <h3>${data.nombre}</h3>
                <p>${data.cargo}</p>
            </div>
        `;
    }
}


// =========================================================
// 5. LÓGICA DE LOGIN Y REGISTRO
// =========================================================

// LOGIN
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;

        const resultado = await loginUsuario(email, pass);

        if (resultado.success) {
            viewAuth.style.display = 'none';
            viewDashboard.classList.remove('hidden-view');

            document.getElementById('user-email-display').textContent = resultado.email;
            document.getElementById('user-role-display').textContent = resultado.rol.toUpperCase();

            // CARGA INICIAL
            if (resultado.jacId) {
                await cargarInfoJAC(resultado.jacId);
            }
        }
    });
}

// REGISTRO (Cargar lista de JACs)
async function cargarListaDeJACs() {
    if (selectJac.options.length > 1) return;
    try {
        const q = await getDocs(collection(db, "jacs"));
        selectJac.innerHTML = '<option value="" disabled selected>-- Selecciona tu Comunidad --</option>';
        q.forEach((doc) => {
            const op = document.createElement('option');
            op.value = doc.id;
            op.textContent = doc.data().nombre;
            selectJac.appendChild(op);
        });
    } catch (e) { console.error(e); }
}

// Botones de cambio de vista Login/Registro
const boxLogin = document.getElementById('form-box-login');
const boxRegister = document.getElementById('form-box-register');
const btnIrRegistro = document.getElementById('btn-ir-registro');
const btnVolverLogin = document.getElementById('btn-volver-login');

if (btnIrRegistro) {
    btnIrRegistro.addEventListener('click', () => {
        boxLogin.style.display = 'none';
        boxRegister.style.display = 'block';
        cargarListaDeJACs();
    });
}
if (btnVolverLogin) {
    btnVolverLogin.addEventListener('click', (e) => {
        e.preventDefault();
        boxRegister.style.display = 'none';
        boxLogin.style.display = 'block';
    });
}

// REGISTRO SUBMIT
if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('reg-nombre').value;
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-pass').value;
        const phone = document.getElementById('reg-phone').value;
        const jacId = selectJac.value;

        if(!jacId) { alert("Selecciona una comunidad"); return; }

        await registrarUsuario(nombre, email, pass, phone, jacId);
    });
}

// LOGOUT
const btnLogout = document.getElementById('btn-logout');
if(btnLogout) btnLogout.addEventListener('click', () => logout());