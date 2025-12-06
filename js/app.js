/* =========================================================
   ARCHIVO: js/app.js (VERSIÓN FINAL COMPLETA)
   INCLUYE: Auth, Persistencia, Dashboard, Directiva y Libros
   ========================================================= */

// 1. IMPORTACIONES
import { loginUsuario, registrarUsuario, logout, monitorSesion } from "./auth.js";
import { doc, getDoc, collection, getDocs, addDoc, query, where, updateDoc  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db } from "./firebase.js";

console.log("App iniciada: Sistema Humana Completo v5 🚀");

// 2. VARIABLES GLOBALES
let currentJacId = null;
let currentUserData = null;

// 3. REFERENCIAS DEL DOM (HTML)
// Vistas Principales
const viewAuth = document.getElementById('view-auth');
const viewDashboard = document.getElementById('view-dashboard');

//Estado Pendiente
const viewPending = document.getElementById('view-pending');
const btnLogoutPending = document.getElementById('btn-logout-pending');

// Secciones Internas del Dashboard
const sectionHome = document.getElementById('section-home');
const sectionDirectiva = document.getElementById('section-directiva');
const sectionLibros = document.getElementById('section-libros');

const sectionBandeja = document.getElementById('section-bandeja');

// Elementos de la Bandeja
const btnRedactar = document.getElementById('btn-redactar');
const vistaVacia = document.getElementById('inbox-vacio');
const vistaLectura = document.getElementById('inbox-lectura');
const vistaEscritura = document.getElementById('inbox-escritura');
const formMensaje = document.getElementById('form-mensaje');
const btnCancelarMsg = document.getElementById('btn-cancelar-msg');
// Menú y Navegación
const menuLinks = document.querySelectorAll('.menu-item');
const btnToggleLibros = document.getElementById('btn-toggle-libros');
const submenuLibros = document.getElementById('submenu-libros');
const iconArrowLibros = document.getElementById('icon-arrow-libros');

// Formularios y Botones
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const selectJac = document.getElementById('reg-jac');
const boxLogin = document.getElementById('form-box-login');
const boxRegister = document.getElementById('form-box-register');
const btnIrRegistro = document.getElementById('btn-ir-registro');
const btnVolverLogin = document.getElementById('btn-volver-login');
const btnLogout = document.getElementById('btn-logout');


// =========================================================
// 4. MONITOR DE SESIÓN (PERSISTENCIA)
// =========================================================
// Esta función vigila si el usuario recarga la página
monitorSesion((datosUsuario) => {
    if (datosUsuario) {
        // --- SESIÓN ACTIVA ---
        console.log("Sesión recuperada:", datosUsuario.email);
        ingresarAlDashboard(datosUsuario);
    } else {
        // --- NO HAY SESIÓN ---
        console.log("Esperando inicio de sesión...");
        viewAuth.style.display = 'block';
        viewDashboard.classList.add('hidden-view');
    }
});

// Función central para prender el Dashboard
async function ingresarAlDashboard(usuario) {
    currentUserData = usuario; // Guardamos datos globales
    // Limpiar todas las vistas primero
    viewAuth.style.display = 'none';
    viewDashboard.classList.add('hidden-view');
    if(viewPending) viewPending.classList.add('hidden-view');

    // --- EL PORTERO DE SEGURIDAD ---
    if (usuario.rol === 'pendiente') {
        // A. SI ESTÁ PENDIENTE -> SALA DE ESPERA
        console.log("Acceso restringido: Usuario pendiente.");
        if(viewPending) viewPending.classList.remove('hidden-view');
        
    } else {
        // B. SI ES VECINO O ADMIN -> DASHBOARD
        console.log("Acceso concedido:", usuario.rol);
        viewDashboard.classList.remove('hidden-view');

        setText('user-email-display', usuario.email);
        setText('user-role-display', usuario.rol ? usuario.rol.toUpperCase() : "VECINO");

        if (usuario.jacId) {
            await cargarInfoJAC(usuario.jacId);
        }
    }
}


// =========================================================
// 5. SISTEMA DE NAVEGACIÓN (ROUTER DEL MENÚ)
// =========================================================

// A. Lógica del Acordeón "Libros JAC"
if (btnToggleLibros) {
    btnToggleLibros.addEventListener('click', () => {
        const isHidden = submenuLibros.style.display === 'none';
        submenuLibros.style.display = isHidden ? 'flex' : 'none';
        iconArrowLibros.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    });
}

// B. Lógica de los Clics en el Menú
menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        // Solo actuamos si el link tiene un destino (data-target)
        if(link.dataset.target) {
            e.preventDefault();
            
            // 1. Actualizar clase visual 'active'
            menuLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // 2. Ocultar TODAS las secciones
            if(sectionHome) sectionHome.classList.add('hidden-view');
            if(sectionDirectiva) sectionDirectiva.classList.add('hidden-view');
            if(sectionLibros) sectionLibros.classList.add('hidden-view');

            // 3. Mostrar la sección solicitada
            const target = link.dataset.target;
            
            if (target === 'home') {
                if(sectionHome) sectionHome.classList.remove('hidden-view');
            } 
            else if (target === 'directiva') {
                if(sectionDirectiva) sectionDirectiva.classList.remove('hidden-view');
                if(currentJacId) cargarDirectiva(currentJacId);
            }
            else if (target.startsWith('libro-')) {
                if(sectionLibros) sectionLibros.classList.remove('hidden-view');
                const tipoLibro = target.split('-')[1]; // ej: obtiene 'actas' de 'libro-actas'
                if(currentJacId) cargarLibro(currentJacId, tipoLibro);
            }
            else if (target === 'bandeja') {
                if(sectionBandeja) sectionBandeja.classList.remove('hidden-view');
                if(currentJacId) cargarMensajes(currentJacId); 
            }
        }
    });
});


// =========================================================
// 6. FUNCIONES DE CARGA DE DATOS (FIREBASE)
// =========================================================

// --- A. CARGAR INFO GENERAL (HOME) ---
async function cargarInfoJAC(jacId) {
    try {
        currentJacId = jacId; 
        const jacRef = doc(db, "jacs", jacId);
        const jacSnap = await getDoc(jacRef);

        if (jacSnap.exists()) {
            const data = jacSnap.data();
            
            // Llenar Textos Home
            setText('jac-nombre', data.nombre);
            setText('jac-lema', data.lema);
            setText('jac-desc', data.descripcion);
            setText('jac-nit', data.nit);
            setText('jac-lugar', data.lugar);
            setText('jac-uuid', data.uuid);
            setText('jac-did', data.did);
            
            // Video
            const vid = document.getElementById('jac-video');
            if(vid) vid.src = data.videoUrl;

            // Título Directiva
            setText('dir-titulo', "Gobierno " + data.nombre);
        }
    } catch (error) {
        console.error("Error cargando JAC:", error);
    }
}

// --- B. CARGAR DIRECTIVA ---
async function cargarDirectiva(jacId) {
    const tbody = document.getElementById('tabla-directiva-body');
    if(!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px">Cargando equipo...</td></tr>';

    try {
        const directivaRef = collection(db, "jacs", jacId, "directiva");
        const snapshot = await getDocs(directivaRef);
        
        tbody.innerHTML = ''; 

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">Sin miembros registrados.</td></tr>';
            // Limpiar tarjetas si no hay datos
            pintarTarjeta('card-presidente', {nombre: 'Vacante', cargo: 'Sin asignar'});
            pintarTarjeta('card-vice', {nombre: 'Vacante', cargo: 'Sin asignar'});
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Distribuir datos: Presidente, Vice o Tabla
            if (data.cargo.toLowerCase().includes('presidente') && !data.cargo.toLowerCase().includes('vice')) {
                pintarTarjeta('card-presidente', data);
            } 
            else if (data.cargo.toLowerCase().includes('vice')) {
                pintarTarjeta('card-vice', data);
            } 
            else {
                const fila = `<tr>
                    <td style="display:flex; gap:10px; align-items:center;">
                        <div class="avatar-circle" style="width:32px; height:32px; font-size:0.8rem;">${getIniciales(data.nombre)}</div>
                        ${data.nombre}
                    </td>
                    <td>${data.cargo}</td>
                    <td><span class="badge badge-active" style="color:#10b981; background:rgba(16,185,129,0.1); padding:4px 8px; border-radius:10px; font-size:0.7rem;">Activo</span></td>
                </tr>`;
                tbody.innerHTML += fila;
            }
        });
    } catch (error) { console.error(error); }
}

// --- C. CARGAR LIBROS ---
async function cargarLibro(jacId, tipoLibro) {
    const tituloEl = document.getElementById('libro-titulo');
    const thead = document.getElementById('libro-thead');
    const tbody = document.getElementById('libro-tbody');
    
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Cargando registros...</td></tr>';

    let coleccionNombre = "libro_" + tipoLibro;
    
    // Configurar Encabezados según el libro
    if (tipoLibro === 'afiliados') {
        tituloEl.textContent = "Libro de Afiliados";
        thead.innerHTML = `<tr><th>Nombre</th><th>Documento</th><th>Dirección</th><th>Estado</th></tr>`;
    } else if (tipoLibro === 'actas') {
        tituloEl.textContent = "Libro de Actas";
        thead.innerHTML = `<tr><th>Fecha</th><th>Título</th><th>Resumen</th><th>Acción</th></tr>`;
    } else if (tipoLibro === 'contable') {
        tituloEl.textContent = "Libro de Tesorería";
        thead.innerHTML = `<tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Valor</th></tr>`;
    } else {
        tituloEl.textContent = "Libro: " + tipoLibro;
        thead.innerHTML = `<tr><th>Información</th></tr>`;
    }

    try {
        const librosRef = collection(db, "jacs", jacId, coleccionNombre);
        const snapshot = await getDocs(librosRef);
        
        tbody.innerHTML = ''; 

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Libro vacío.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            let fila = "";
            
            if (tipoLibro === 'afiliados') {
                fila = `<tr><td><b style="color:white">${data.nombre}</b></td><td>${data.documento}</td><td>${data.direccion}</td><td>${data.estado}</td></tr>`;
            } else if (tipoLibro === 'actas') {
                fila = `<tr><td>${data.fecha}</td><td><b style="color:white">${data.titulo}</b></td><td>${data.resumen}</td><td><button class="btn-editar">Ver</button></td></tr>`;
            } else if (tipoLibro === 'contable') {
                const color = data.tipo === 'ingreso' ? '#10b981' : '#f87171';
                fila = `<tr><td>${data.fecha}</td><td>${data.concepto}</td><td style="color:${color}; text-transform:uppercase;">${data.tipo}</td><td style="color:white;">$${data.valor}</td></tr>`;
            } else {
                fila = `<tr><td>Datos no formateados</td></tr>`;
            }
            tbody.innerHTML += fila;
        });
    } catch (error) { console.error(error); }
}

// --- D. CARGAR LISTA DE JACS (PARA REGISTRO) ---
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

// --- E. CARGAR MENSAJES (CON NOMBRE EN LISTA) ---
async function cargarMensajes(jacId) {
    console.log("🔍 Buscando mensajes en la JAC:", jacId); // <--- AGREGA ESTO
    const contenedor = document.getElementById('lista-mensajes');
    if(!contenedor) return;
    
    contenedor.innerHTML = '<div style="padding:20px; text-align:center">Cargando...</div>';

    try {
        const msgsRef = collection(db, "jacs", jacId, "mensajes");
        let q;

        if (currentUserData.rol.includes('admin')) {
            q = msgsRef; 
        } else {
            q = query(msgsRef, where("remitente", "==", currentUserData.email));
        }

        const snapshot = await getDocs(q);
        contenedor.innerHTML = '';

        if (snapshot.empty) {
            contenedor.innerHTML = '<div style="padding:20px; text-align:center; color:gray">Bandeja vacía.</div>';
            return;
        }

        let listaMensajes = [];
        snapshot.forEach(doc => {
            listaMensajes.push({ id: doc.id, ...doc.data() });
        });

        listaMensajes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        const nombresAreas = { 'admin': 'Junta Directiva', 'tesoreria': 'Tesorería', 'convivencia': 'Convivencia' };

        listaMensajes.forEach(data => {
            const item = document.createElement('div');
            item.className = 'message-item';
            
            if (data.estado === 'no_leido') item.classList.add('unread');
            else item.classList.add('read');
            
            let infoContexto = "";
            const nombreArea = nombresAreas[data.destinatario] || data.destinatario; 

            // --- AQUÍ ESTÁ EL CAMBIO VISUAL ---
            if (currentUserData.rol.includes('admin')) {
                // Preferimos el NOMBRE, si no existe (mensaje viejo), usamos el email
                const quienEnvia = data.remitenteNombre || data.remitenteEmail || data.remitente;
                
                infoContexto = `<span style="color:#77c7ff; font-weight:bold;">[${nombreArea}]</span> <span style="font-size:0.9em">De: ${quienEnvia}</span>`;
            } else {
                infoContexto = `Para: ${nombreArea}`;
            }

            item.innerHTML = `
                <h4 style="margin-bottom:4px;">${data.asunto}</h4>
                <p>${infoContexto}</p>
                <p style="font-size:0.75rem; margin-top:2px; opacity:0.6;">${data.fecha}</p>
            `;
            
            item.addEventListener('click', () => verMensajeCompleto(data, data.id, item));
            contenedor.appendChild(item);
        });

    } catch (error) {
        console.error("Error cargando mensajes:", error);
    }
}

// --- VER DETALLE ---
async function verMensajeCompleto(data, mensajeId, elementoHTML) {
    // 1. Mostrar vista base
    vistaVacia.classList.add('hidden-view');
    vistaEscritura.classList.add('hidden-view');
    vistaLectura.classList.remove('hidden-view');

    // 2. Llenar datos originales
    setText('msg-asunto', data.asunto);
    setText('msg-remitente', data.remitente);
    setText('msg-fecha', data.fecha);
    document.getElementById('msg-cuerpo').innerText = data.cuerpo;

    // 3. GESTIÓN DE LA RESPUESTA
    const boxVisual = document.getElementById('visualizar-respuesta');
    const boxForm = document.getElementById('formulario-respuesta');
    
    // Limpiamos estados previos
    boxVisual.classList.add('hidden-view');
    boxForm.classList.add('hidden-view');

    // Guardamos el ID actual en el botón para saber a cuál responder
    const btnResponder = document.getElementById('btn-enviar-respuesta');
    if(btnResponder) btnResponder.dataset.msgId = mensajeId; 

    if (data.respuesta) {
        // CASO A: YA TIENE RESPUESTA (Visible para todos)
        boxVisual.classList.remove('hidden-view');
        setText('resp-texto', data.respuesta);
        setText('resp-fecha', data.fechaRespuesta || "");
    } 
    else if (currentUserData.rol === 'admin') {
        // CASO B: NO TIENE RESPUESTA Y SOY ADMIN (Mostrar Formulario)
        boxForm.classList.remove('hidden-view');
        document.getElementById('txt-respuesta-admin').value = ""; // Limpiar input
    }
    // Caso C: Soy vecino y no hay respuesta -> No mostramos nada extra.

    // 4. MARCAR COMO LEÍDO (Si aplica)
    if (currentUserData.rol === 'admin' && data.estado === 'no_leido') {
        try {
            const msgRef = doc(db, "jacs", currentJacId, "mensajes", mensajeId);
            await updateDoc(msgRef, { estado: 'leido' });
            elementoHTML.classList.remove('unread');
            elementoHTML.classList.add('read');
            data.estado = 'leido'; 
        } catch (e) { console.error(e); }
    }
}

// --- F. ENVIAR MENSAJE NUEVO (CON NOMBRE Y EMAIL) ---
async function enviarMensajeNuevo(asunto, destinatario, cuerpo) {
    try {
        // Usamos la variable global currentUserData para sacar los datos exactos
        const nombreRemitente = currentUserData.nombre || "Vecino";
        const emailRemitente = currentUserData.email;
        
        await addDoc(collection(db, "jacs", currentJacId, "mensajes"), {
            asunto: asunto,
            destinatario: destinatario,
            cuerpo: cuerpo,
            // GUARDAMOS AMBOS DATOS:
            remitenteNombre: nombreRemitente, 
            remitenteEmail: emailRemitente,
            // Mantenemos 'remitente' antiguo por compatibilidad temporal o usamos email
            remitente: emailRemitente, 
            fecha: new Date().toLocaleDateString(),
            timestamp: Date.now(),
            estado: 'no_leido'
        });

        alert("Mensaje enviado correctamente.");
        
        vistaEscritura.classList.add('hidden-view');
        vistaVacia.classList.remove('hidden-view');
        cargarMensajes(currentJacId);
        document.getElementById('form-mensaje').reset();

    } catch (error) {
        console.error(error);
        alert("Error al enviar mensaje");
    }
}
// --- G. ENVIAR RESPUESTA ADMIN ---
async function enviarRespuestaAdmin() {
    const btn = document.getElementById('btn-enviar-respuesta');
    const msgId = btn.dataset.msgId; // Recuperamos el ID que guardamos antes
    const texto = document.getElementById('txt-respuesta-admin').value;

    if (!texto.trim()) return alert("Escribe una respuesta.");

    try {
        const msgRef = doc(db, "jacs", currentJacId, "mensajes", msgId);
        
        await updateDoc(msgRef, {
            respuesta: texto,
            fechaRespuesta: new Date().toLocaleDateString(),
            estado: 'solucionado' // Cambiamos el estado a solucionado
        });

        alert("Respuesta enviada.");
        
        // Truco visual: Ocultar formulario y mostrar la respuesta in-situ
        document.getElementById('formulario-respuesta').classList.add('hidden-view');
        const boxVisual = document.getElementById('visualizar-respuesta');
        boxVisual.classList.remove('hidden-view');
        setText('resp-texto', texto);
        setText('resp-fecha', "Ahora mismo");

    } catch (error) {
        console.error(error);
        alert("Error al guardar respuesta.");
    }
}


// =========================================================
// 7. EVENTOS DE FORMULARIOS (INTERACCIÓN USUARIO)
// =========================================================

// LOGIN
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        // La redirección la maneja el monitorSesion
        await loginUsuario(email, pass);
    });
}

// REGISTRO
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
if(btnLogout) btnLogout.addEventListener('click', () => logout());

// SWITCH LOGIN / REGISTRO
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
// --- EVENTOS BANDEJA ---

// 1. Botón Redactar (Muestra formulario)
if (btnRedactar) {
    btnRedactar.addEventListener('click', () => {
        vistaVacia.classList.add('hidden-view');
        vistaLectura.classList.add('hidden-view');
        vistaEscritura.classList.remove('hidden-view');
    });
}

// 2. Botón Cancelar (Vuelve al inicio)
if (btnCancelarMsg) {
    btnCancelarMsg.addEventListener('click', () => {
        vistaEscritura.classList.add('hidden-view');
        vistaVacia.classList.remove('hidden-view');
    });
}

// 3. Enviar Formulario
if (formMensaje) {
    formMensaje.addEventListener('submit', async (e) => {
        e.preventDefault();
        const asunto = document.getElementById('new-asunto').value;
        const dest = document.getElementById('new-destinatario').value;
        const cuerpo = document.getElementById('new-cuerpo').value;

        await enviarMensajeNuevo(asunto, dest, cuerpo);
    });
}
// Listener para el botón de respuesta
const btnResp = document.getElementById('btn-enviar-respuesta');
if(btnResp) {
    btnResp.addEventListener('click', enviarRespuestaAdmin);
}
// Logout desde vista pendiente
if (btnLogoutPending) {
    btnLogoutPending.addEventListener('click', () => logout());
}


// =========================================================
// 8. HELPERS (UTILIDADES VISUALES)
// =========================================================
function setText(id, text) {
    const el = document.getElementById(id);
    if(el) el.textContent = text;
}

function getIniciales(nombre) {
    return nombre ? nombre.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : "--";
}

function pintarTarjeta(elementId, data) {
    const el = document.getElementById(elementId);
    if(el) {
        el.innerHTML = `
            <div class="avatar-circle">${getIniciales(data.nombre)}</div>
            <div class="member-info">
                <h3>${data.nombre}</h3>
                <p>${data.cargo}</p>
            </div>
        `;
    }
}