/* =========================================================
   ARCHIVO: js/app.js (VERSIÓN FINAL COMPLETA)
   INCLUYE: Auth, Persistencia, Dashboard, Directiva y Libros
   ========================================================= */

// 1. IMPORTACIONES
import { loginUsuario, logout, monitorSesion, registrarUsuarioCompleto  } from "./auth.js";
import { doc, getDoc, collection, getDocs, addDoc, query, where, updateDoc, onSnapshot  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
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
const viewRegister = document.getElementById('view-register'); // La nueva vista
const formRegisterFull = document.getElementById('form-register-full'); // El nuevo form
const btnCancelarRegistro = document.getElementById('btn-cancelar-registro');


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

        setText('user-email-display', usuario.nombres || usuario.email);
        setText('user-role-display', usuario.rol ? usuario.rol.toUpperCase() : "VECINO");

        if (usuario.jacId) {
            await cargarInfoJAC(usuario.jacId);
        }
        activarNotificaciones(usuario.jacId); 
    }
}
// --- ESCUCHAR MENSAJES SIN LEER (REALTIME) ---
function activarNotificaciones(jacId) {
    // Solo escuchamos si soy Admin (el vecino no necesita ver contador global)
    if (!currentUserData.rol.includes('admin')) return;

    const msgsRef = collection(db, "jacs", jacId, "mensajes");
    // Filtramos solo los 'no_leido'
    const q = query(msgsRef, where("estado", "==", "no_leido"));

    // onSnapshot se ejecuta cada vez que algo cambia en la base de datos
    onSnapshot(q, (snapshot) => {
        const cantidad = snapshot.size; // Cuántos mensajes hay
        const badge = document.getElementById('badge-mensajes');
        
        if (cantidad > 0) {
            badge.textContent = cantidad;
            badge.classList.remove('hidden-view');
        } else {
            badge.classList.add('hidden-view');
        }
    });
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
            if(sectionBandeja) sectionBandeja.classList.add('hidden-view'); 

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

// --- B. CARGAR DIRECTIVA (MODELO LEY 2166 DESDE USUARIOS) ---
async function cargarDirectiva(jacId) {
    console.log("Construyendo organigrama para:", jacId);
    
    // 1. Limpiar contenedores
    const contenedores = {
        'dignatarios': document.getElementById('lista-dignatarios'),
        'fiscalia': document.getElementById('lista-fiscalia'),
        'convivencia': document.getElementById('lista-convivencia'),
        'comites': document.getElementById('lista-comites')
    };

    // Poner "Cargando..." en todos
    Object.values(contenedores).forEach(div => div.innerHTML = '<div style="color:#aaa; font-size:0.9rem;">Cargando...</div>');

    try {
        // 2. Traer usuarios de ESTA Jac que tengan un grupo asignado
        const usuariosRef = collection(db, "usuarios");
        // Filtro compuesto: Usuarios de esta JAC y que el campo 'grupo' no sea nulo
        // Nota: Si esto falla por índices, usamos solo jacId y filtramos en JS (más fácil para MVP)
        const q = query(usuariosRef, where("jacId", "==", jacId));
        
        const snapshot = await getDocs(q);
        
        // Limpiamos el texto de "Cargando..."
        Object.values(contenedores).forEach(div => div.innerHTML = '');

        let contadores = { dignatarios: 0, fiscalia: 0, convivencia: 0, comites: 0 };

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // FILTRO JS: Solo procesamos si tiene un grupo válido
            if (data.grupo && contenedores[data.grupo]) {
                const tarjetaHTML = crearTarjetaDirectiva(data);
                contenedores[data.grupo].insertAdjacentHTML('beforeend', tarjetaHTML);
                contadores[data.grupo]++;
            }
        });

        // Mensaje si alguna sección quedó vacía
        Object.keys(contenedores).forEach(key => {
            if (contadores[key] === 0) {
                contenedores[key].innerHTML = `<div style="color:#555; font-style:italic; padding:10px; border:1px dashed #333; border-radius:10px;">Cargos vacantes</div>`;
            }
        });

    } catch (error) {
        console.error("Error cargando directiva:", error);
    }
}

// --- FUNCIÓN AUXILIAR: GENERADOR DE HTML DE TARJETA ---
function crearTarjetaDirectiva(usuario) {
    const iniciales = getIniciales(usuario.nombre);
    // Si tiene fotoUrl usamos imagen, si no, iniciales
    const avatarHTML = usuario.fotoUrl 
        ? `<img src="${usuario.fotoUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:18px;">`
        : iniciales;
    
    // Botón de WhatsApp (Si tiene teléfono)
    let btnContacto = '';
    if (usuario.telefono) {
        // Limpiamos el número para el link (quitamos espacios o guiones)
        const numeroLimpio = usuario.telefono.replace(/\D/g,''); 
        btnContacto = `
            <a href="https://wa.me/57${numeroLimpio}" target="_blank" class="gov-action-btn" style="text-decoration:none; justify-content:center; width:100%;">
                <i class="ri-whatsapp-line" style="color:#25D366; font-size:1.1rem;"></i> Contactar
            </a>
        `;
    }

    // Retornamos el string HTML
    return `
        <article class="gov-card" style="padding: 20px;">
            <div class="gov-profile" style="margin-bottom: 15px;">
                <div class="gov-avatar">${avatarHTML}</div>
                <div class="gov-info">
                    <!-- Cargo destacado en azul -->
                    <p style="color:var(--cyber-blue); font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; font-weight:700; margin-bottom:4px;">
                        ${usuario.cargo || 'Cargo indefinido'}
                    </p>
                    <h3 style="font-size:1.1rem;">${usuario.nombre}</h3>
                </div>
            </div>
            
            <div class="gov-footer" style="padding-top: 15px; margin-top: auto;">
                ${btnContacto}
            </div>
        </article>
    `;
}


// --- C. CARGAR LIBROS (COMPLETA Y CORREGIDA) ---
async function cargarLibro(jacId, tipoLibro) {
    const tituloEl = document.getElementById('libro-titulo');
    // Intentamos buscar el subtítulo, si no existe no pasa nada
    const subtituloEl = document.getElementById('libro-subtitulo'); 
    const thead = document.getElementById('libro-thead');
    const tbody = document.getElementById('libro-tbody');
    
    // Limpiamos contenido previo
    if(tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Cargando...</td></tr>';

    let coleccionNombre = "libro_" + tipoLibro;
    
    // Ocultar header especial de actas si existe, por defecto
    const headerActas = document.getElementById('header-actas-extra');
    if(headerActas) headerActas.style.display = 'none';

    // =====================================================
    // 1. CONFIGURACIÓN VISUAL (Títulos y Columnas)
    // =====================================================
    
    if (tipoLibro === 'afiliados') {
        setText(tituloEl, "Libro de Afiliados");
        if(subtituloEl) subtituloEl.textContent = "Registro legal de socios (Ley 2166).";
        thead.innerHTML = `<tr>
            <th>Afiliado</th>
            <th>Documento</th>
            <th>Comisión</th>
            <th>Estado</th>
        </tr>`;
    } 
    else if (tipoLibro === 'actas') {
        setText(tituloEl, "Libro de Actas");
        if(subtituloEl) subtituloEl.textContent = "Historial de asambleas y reuniones.";
        
        // Mostrar tarjetas estadísticas
        if(headerActas) headerActas.style.display = 'block';
        
        thead.innerHTML = `<tr>
            <th>Número</th>
            <th>Fecha</th>
            <th>Tema</th>
            <th>Decisiones</th>
            <th>Estado</th>
            <th>Acciones</th>
        </tr>`;
    }
    else if (tipoLibro === 'contable') {
        setText(tituloEl, "Libro de Tesorería");
        if(subtituloEl) subtituloEl.textContent = "Control de ingresos, egresos y balances.";
        thead.innerHTML = `<tr>
            <th>Fecha</th>
            <th>Concepto</th>
            <th>Tipo Movimiento</th>
            <th>Valor</th>
            <th>Soporte</th>
        </tr>`;
    }
    else if (tipoLibro === 'inventario') {
        setText(tituloEl, "Inventario de Bienes");
        if(subtituloEl) subtituloEl.textContent = "Control de muebles, inmuebles y equipos.";
        thead.innerHTML = `<tr>
            <th>Item / Bien</th>
            <th>Cantidad</th>
            <th>Ubicación</th>
            <th>Estado</th>
        </tr>`;
    }
    else if (tipoLibro === 'convivencia') {
        setText(tituloEl, "Libro de Convivencia");
        if(subtituloEl) subtituloEl.textContent = "Registro de conciliaciones y procesos.";
        thead.innerHTML = `<tr>
            <th>Fecha</th>
            <th>Asunto</th>
            <th>Implicados</th>
            <th>Estado</th>
        </tr>`;
    }

    // --- LÓGICA DE BOTÓN NUEVO REGISTRO (PERMISOS) ---
    const btnNuevo = document.getElementById('btn-nuevo-registro');
    const permisosEscritura = {
        'afiliados':   ['presidente', 'secretario', 'admin'],
        'actas':       ['presidente', 'secretario', 'admin'],
        'contable':    ['tesorero', 'admin'],
        'inventario':  ['presidente', 'tesorero', 'admin'],
        'convivencia': ['presidente', 'secretario', 'conciliador', 'admin']
    };

    if (btnNuevo) {
        const miRol = currentUserData ? currentUserData.rol : 'vecino';
        const rolesAutorizados = permisosEscritura[tipoLibro] || [];
        btnNuevo.style.display = rolesAutorizados.includes(miRol) ? 'flex' : 'none';
    }

    // =====================================================
    // 2. TRAER DATOS DE FIREBASE Y PINTAR TABLA
    // =====================================================
    try {
        const librosRef = collection(db, "jacs", jacId, coleccionNombre);
        const snapshot = await getDocs(librosRef);
        
        if(tbody) tbody.innerHTML = ''; 

        if (snapshot.empty) {
            if(tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#aaa;">No hay registros aún.</td></tr>';
            return; // <--- ESTE ERA EL RETURN QUE DABA ERROR (Ahora está seguro dentro de la función)
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            let fila = "";

            if (tipoLibro === 'actas') {
                let badgeClass = 'badge-blue';
                if (data.estado === 'Aprobada') badgeClass = 'badge-green';
                if (data.estado === 'En revisión') badgeClass = 'badge-yellow';

                fila = `<tr>
                    <td style="font-family:monospace; color:white;">${data.numero || '---'}</td>
                    <td>${data.fecha}</td>
                    <td style="color:white; font-weight:600;">${data.tipo || data.tema}</td>
                    <td>${data.decisiones || 'Sin resumen'}</td>
                    <td><span class="acta-badge ${badgeClass}">${data.estado || 'N/A'}</span></td>
                    <td><button class="btn-editar">Ver</button></td>
                </tr>`;
            }
            else if (tipoLibro === 'afiliados') {
                 fila = `<tr>
                    <td><b style="color:white">${data.nombre}</b><br><span style="font-size:0.8em; color:#aaa">${data.telefono || ''}</span></td>
                    <td>${data.tipo_documento || ''} ${data.documento || ''}</td>
                    <td>${data.comision_trabajo || 'Sin asignar'}</td>
                    <td><span class="badge badge-active">Activo</span></td>
                 </tr>`;
            }
            else if (tipoLibro === 'contable') {
                const color = data.tipo === 'Ingreso' ? '#10b981' : '#f87171';
                fila = `<tr>
                    <td>${data.fecha}</td>
                    <td>${data.concepto}</td>
                    <td style="color:${color}; text-transform:uppercase; font-weight:bold;">${data.tipo}</td>
                    <td style="color:white;">$${data.valor}</td>
                    <td>${data.soporte || '-'}</td>
                </tr>`;
            }
            else if (tipoLibro === 'inventario') {
                fila = `<tr>
                    <td style="color:white; font-weight:bold;">${data.item}</td>
                    <td>${data.cantidad}</td>
                    <td>${data.ubicacion}</td>
                    <td>${data.estado_bien}</td>
                </tr>`;
            }
            else {
                // Genérico para otros libros
                fila = `<tr><td colspan="4">${JSON.stringify(data)}</td></tr>`;
            }

            if(tbody) tbody.innerHTML += fila;
        });

    } catch (error) {
        console.error("Error cargando libro:", error);
        if(tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error de conexión.</td></tr>';
    }
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
    console.log("🔍 Buscando mensajes en la JAC:", jacId);
    const contenedor = document.getElementById('lista-mensajes');
    if(!contenedor) return;
    
    contenedor.innerHTML = '<div style="padding:20px; text-align:center">Cargando...</div>';

    try {
        const msgsRef = collection(db, "jacs", jacId, "mensajes");
        let q;
        // DEFINIMOS QUIÉN ES "DIRECTIVA" (Quienes ven todo)
        const rolesDirectiva = ['presidente', 'vicepresidente', 'tesorero', 'secretario', 'fiscal', 'admin'];
        const miRol = currentUserData.rol;
        // FILTRO DE PRIVACIDAD
        if (rolesDirectiva.includes(miRol)) {
            // Si soy directivo, veo TODO
            q = msgsRef; 
        } else {
            // Si soy vecino o comité, solo veo lo MÍO
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

// --- VER DETALLE (ACTUALIZADO CON ROLES DE DIRECTIVA) ---
async function verMensajeCompleto(data, mensajeId, elementoHTML) {
    // 1. Mostrar la vista de lectura
    vistaVacia.classList.add('hidden-view');
    vistaEscritura.classList.add('hidden-view');
    vistaLectura.classList.remove('hidden-view');

    // 2. Preparar datos visuales
    const nombreReal = data.remitenteNombre || "Usuario";
    const emailReal = data.remitenteEmail || data.remitente; 
    const iniciales = nombreReal.substring(0, 2).toUpperCase();

    // 3. Inyectar datos en el HTML
    setText('msg-asunto', data.asunto);
    setText('msg-nombre-completo', nombreReal);
    setText('msg-email', emailReal);
    setText('msg-fecha', data.fecha);
    setText('msg-avatar-container', iniciales);
    document.getElementById('msg-cuerpo').innerText = data.cuerpo;

    // --- AQUÍ ESTÁ EL CAMBIO CLAVE ---
    // Definimos quiénes tienen permiso de responder y marcar visto
    const rolesDirectiva = ['presidente', 'vicepresidente', 'tesorero', 'secretario', 'fiscal', 'admin'];
    const miRol = currentUserData.rol; // El rol de quien está logueado

    // 4. Gestión de Respuesta
    const boxVisual = document.getElementById('visualizar-respuesta');
    const boxForm = document.getElementById('formulario-respuesta');
    
    // Limpiamos estados
    boxVisual.classList.add('hidden-view');
    boxForm.classList.add('hidden-view');

    // Guardamos el ID en el botón por si vamos a responder
    const btnResponder = document.getElementById('btn-enviar-respuesta');
    if(btnResponder) btnResponder.dataset.msgId = mensajeId; 

    // Lógica visual
    if (data.respuesta) {
        // A. Si YA tiene respuesta, cualquiera la puede ver
        boxVisual.classList.remove('hidden-view');
        setText('resp-texto', data.respuesta);
        setText('resp-fecha', data.fechaRespuesta || "");
    } 
    else if (rolesDirectiva.includes(miRol)) { 
        // B. Si NO tiene respuesta Y soy Directivo -> Muestro formulario
        // (Antes aquí decía: if currentUserData.rol === 'admin')
        boxForm.classList.remove('hidden-view');
        document.getElementById('txt-respuesta-admin').value = ""; 
    }

    // 5. Marcar como Leído (Solo si soy Directivo y es nuevo)
    if (rolesDirectiva.includes(miRol) && data.estado === 'no_leido') {
        try {
            const msgRef = doc(db, "jacs", currentJacId, "mensajes", mensajeId);
            await updateDoc(msgRef, { estado: 'leido' });
            
            // Actualizar visualmente la lista izquierda
            if(elementoHTML) {
                elementoHTML.classList.remove('unread');
                elementoHTML.classList.add('read');
            }
            data.estado = 'leido'; // Actualizar dato en memoria
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
        // Ocultar Login y mostrar Registro Full
        viewAuth.classList.add('hidden-view'); // Ocultamos el login completo
        viewRegister.classList.remove('hidden-view'); // Mostramos la nueva pantalla
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
// Botón Cancelar (Volver al login)
if (btnCancelarRegistro) {
    btnCancelarRegistro.addEventListener('click', () => {
        viewRegister.classList.add('hidden-view');
        viewAuth.classList.remove('hidden-view'); // Volver al login original
    });
}
// NUEVO REGISTRO COMPLETO (CON UX MEJORADA)
if (formRegisterFull) {
    formRegisterFull.addEventListener('submit', async (e) => {
        e.preventDefault();

        // A. EFECTO DE CARGA (UX)
        const btnSubmit = formRegisterFull.querySelector('button[type="submit"]');
        const textoOriginal = btnSubmit.textContent;
        btnSubmit.disabled = true;
        btnSubmit.textContent = "Procesando...";
        btnSubmit.style.opacity = "0.7";

        // B. RECOLECCIÓN DE DATOS
        const datosUsuario = {
            email: document.getElementById('reg-email').value,
            pass: document.getElementById('reg-pass').value,
            nombres: document.getElementById('reg-nombres').value,
            apellidos: document.getElementById('reg-apellidos').value,
            tipoDoc: document.getElementById('reg-tipo-doc').value,
            numDoc: document.getElementById('reg-num-doc').value,
            fechaNac: document.getElementById('reg-fecha-nac').value,
            genero: document.getElementById('reg-genero').value,
            jacId: document.getElementById('reg-jac').value,
            direccion: document.getElementById('reg-direccion').value,
            telefono: document.getElementById('reg-telefono').value,
            comision: document.getElementById('reg-comision').value
        };

        if(!datosUsuario.jacId) { 
            alert("Selecciona una comunidad"); 
            resetBtn(); 
            return; 
        }

        // C. ENVIAR A AUTH
        const respuesta = await registrarUsuarioCompleto(datosUsuario);

        // D. MANEJAR RESULTADO
        if (respuesta.success) {
            // ¡ÉXITO! Transición suave
            console.log("Registro exitoso. Cambiando vista...");
            
            // 1. Ocultar Registro
            viewRegister.classList.add('hidden-view');
            
            // 2. Mostrar Pantalla de Pendiente/Éxito DIRECTAMENTE
            // (El monitorSesion también se disparará, pero nos adelantamos visualmente)
            const viewPending = document.getElementById('view-pending');
            if(viewPending) viewPending.classList.remove('hidden-view');
            
            // Limpiar formulario
            formRegisterFull.reset();
            resetBtn();

        } else {
            // ERROR
            alert("Hubo un problema: " + respuesta.message);
            resetBtn();
        }

        function resetBtn() {
            btnSubmit.disabled = false;
            btnSubmit.textContent = textoOriginal;
            btnSubmit.style.opacity = "1";
        }
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
// =========================================================
// 9. MODAL UNIVERSAL (LÓGICA DE ESCRITURA)
// =========================================================

// CONFIGURACIÓN: Qué campos pide cada libro
const configLibros = {
    'afiliados': [
        { label: 'Nombre Completo', type: 'text', id: 'nombre' },
        { label: 'Documento / Cédula', type: 'number', id: 'documento' },
        { label: 'Dirección', type: 'text', id: 'direccion' },
        { label: 'Estado', type: 'select', id: 'estado', options: ['Activo', 'Inactivo'] }
    ],
    'actas': [
        { 
            label: 'Número de Acta (Ej: ACT-0042)', 
            type: 'text', 
            id: 'numero' 
        },
        { 
            label: 'Fecha de la Sesión', 
            type: 'date', 
            id: 'fecha' 
        },
        { 
            label: 'Tema / Tipo de Reunión', 
            type: 'select', 
            id: 'tema', 
            options: ['Ordinaria', 'Extraordinaria', 'Agenda Social', 'Presupuesto'] 
        },
        { 
            label: 'Resumen Decisiones (Corto)', 
            type: 'text', 
            id: 'decisiones' 
        },
        { 
            label: 'Estado Actual', 
            type: 'select', 
            id: 'estado', 
            options: ['Aprobada', 'En revisión', 'Por aprobar'] 
        }
    ],
    'contable': [
        { label: 'Concepto', type: 'text', id: 'concepto' },
        { label: 'Valor ($)', type: 'number', id: 'valor' },
        { label: 'Tipo', type: 'select', id: 'tipo', options: ['ingreso', 'egreso'] },
        { label: 'Fecha', type: 'date', id: 'fecha' }
    ],
    // Puedes agregar 'inventario' o 'convivencia' aquí después
};

let libroActualParaGuardar = null; // Variable temporal para saber qué estamos guardando

// REFERENCIAS DEL MODAL
const modalRegistro = document.getElementById('modal-registro');
const btnNuevoRegistro = document.getElementById('btn-nuevo-registro');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');
const formModal = document.getElementById('form-modal-dinamico');
const contenedorCampos = document.getElementById('modal-campos-container');

// A. ABRIR MODAL
if (btnNuevoRegistro) {
    btnNuevoRegistro.addEventListener('click', () => {
        // Obtenemos el libro actual del título (Truco rápido)
        // Ejemplo: "Libro de Afiliados" -> sacamos "afiliados"
        // O mejor, usamos una variable global.
        // Haremos un "hack" buscando qué menú está activo en Libros
        const menuActivo = document.querySelector('#submenu-libros .menu-item.active');
        if (!menuActivo) return alert("Selecciona un libro primero.");
        
        const tipoLibro = menuActivo.dataset.target.split('-')[1]; // 'afiliados'
        libroActualParaGuardar = tipoLibro;

        const campos = configLibros[tipoLibro];
        if (!campos) return alert("Formulario no configurado para este libro.");

        // Generar HTML de los campos
        contenedorCampos.innerHTML = '';
        document.getElementById('modal-titulo-texto').textContent = "Registrar en " + tipoLibro.toUpperCase();

        campos.forEach(campo => {
            let inputHTML = '';
            
            if (campo.type === 'select') {
                const optionsHTML = campo.options.map(o => `<option value="${o}">${o}</option>`).join('');
                inputHTML = `<select id="input-${campo.id}" class="inbox-input" required>${optionsHTML}</select>`;
            } 
            else if (campo.type === 'textarea') {
                inputHTML = `<textarea id="input-${campo.id}" class="inbox-input" rows="3" required></textarea>`;
            } 
            else {
                inputHTML = `<input type="${campo.type}" id="input-${campo.id}" class="inbox-input" required>`;
            }

            const wrapper = document.createElement('div');
            wrapper.innerHTML = `
                <label style="display:block; margin-bottom:5px; color:#aaa; font-size:0.8rem;">${campo.label}</label>
                ${inputHTML}
            `;
            contenedorCampos.appendChild(wrapper);
        });

        modalRegistro.classList.remove('hidden-view');
    });
}

// B. CERRAR MODAL
if (btnCerrarModal) {
    btnCerrarModal.addEventListener('click', () => {
        modalRegistro.classList.add('hidden-view');
    });
}

// C. GUARDAR DATOS (SUBMIT)
if (formModal) {
    formModal.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentJacId || !libroActualParaGuardar) return;

        // 1. Recolectar datos del formulario dinámico
        const datosAGuardar = {};
        const campos = configLibros[libroActualParaGuardar];
        
        campos.forEach(campo => {
            const valor = document.getElementById(`input-${campo.id}`).value;
            datosAGuardar[campo.id] = valor;
        });

        // Agregamos timestamp automático
        datosAGuardar.timestamp = Date.now();

        try {
            // 2. Guardar en Firebase
            const coleccionDestino = "libro_" + libroActualParaGuardar;
            await addDoc(collection(db, "jacs", currentJacId, coleccionDestino), datosAGuardar);

            alert("Registro guardado exitosamente.");
            modalRegistro.classList.add('hidden-view');
            
            // 3. Recargar la tabla para ver el cambio
            cargarLibro(currentJacId, libroActualParaGuardar);

        } catch (error) {
            console.error(error);
            alert("Error al guardar.");
        }
    });
}