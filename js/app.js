/* =========================================================
   ARCHIVO: js/app.js (VERSIÓN MAESTRA FINAL)
   ========================================================= */

// 1. IMPORTACIONES
import { loginUsuario, logout, monitorSesion, registrarUsuarioCompleto } from "./auth.js";
import { doc, getDoc, collection, getDocs, addDoc, query, where, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { db } from "./firebase.js";

console.log("App iniciada: Sistema Humana v6 (Clean) 🚀");

// 2. VARIABLES GLOBALES
let currentJacId = null;
let currentUserData = null;
let libroActualParaGuardar = null;

// 3. REFERENCIAS DEL DOM (HTML)
const viewAuth = document.getElementById('view-auth');
const viewDashboard = document.getElementById('view-dashboard');
const viewPending = document.getElementById('view-pending');
const viewRegister = document.getElementById('view-register');

// Secciones del Dashboard
const sectionHome = document.getElementById('section-home');
const sectionDirectiva = document.getElementById('section-directiva');
const sectionLibros = document.getElementById('section-libros');
const sectionBandeja = document.getElementById('section-bandeja');

// Menús y Botones Globales
const menuLinks = document.querySelectorAll('.menu-item');
const btnToggleLibros = document.getElementById('btn-toggle-libros');
const submenuLibros = document.getElementById('submenu-libros');
const iconArrowLibros = document.getElementById('icon-arrow-libros');
const btnLogout = document.getElementById('btn-logout');
const btnLogoutPending = document.getElementById('btn-logout-pending');

// Formularios Login/Registro
const formLogin = document.getElementById('form-login');
const formRegisterFull = document.getElementById('form-register-full');
const btnIrRegistro = document.getElementById('btn-ir-registro');
const btnCancelarRegistro = document.getElementById('btn-cancelar-registro');
const selectJac = document.getElementById('reg-jac');

// Referencias Bandeja
const btnRedactar = document.getElementById('btn-redactar');
const vistaVacia = document.getElementById('inbox-vacio');
const vistaLectura = document.getElementById('inbox-lectura');
const vistaEscritura = document.getElementById('inbox-escritura');
const formMensaje = document.getElementById('form-mensaje');
const btnCancelarMsg = document.getElementById('btn-cancelar-msg');
const btnResp = document.getElementById('btn-enviar-respuesta');

// Referencias Modales
const modalRegistro = document.getElementById('modal-registro');
const btnNuevoRegistro = document.getElementById('btn-nuevo-registro');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');
const btnCancelGen = document.getElementById('btn-cancelar-gen');
const formModal = document.getElementById('form-modal-dinamico');
const contenedorCampos = document.getElementById('modal-campos-container');

// Referencias Modal Actas
const modalActa = document.getElementById('modal-acta');
const btnCerrarActa = document.getElementById('btn-cerrar-acta');
const btnCancelarActa = document.getElementById('btn-cancelar-acta');
const btnGuardarActa = document.getElementById('btn-guardar-acta');


// =========================================================
// 4. LÓGICA DE SESIÓN (AUTH)
// =========================================================

monitorSesion((datosUsuario) => {
    if (datosUsuario) {
        ingresarAlDashboard(datosUsuario);
    } else {
        viewAuth.style.display = 'flex'; // Volver a mostrar login
        viewDashboard.classList.add('hidden-view');
        viewPending.classList.add('hidden-view');
        viewRegister.classList.add('hidden-view');
    }
});

async function ingresarAlDashboard(usuario) {
    currentUserData = usuario;
    viewAuth.style.display = 'none';
    viewRegister.classList.add('hidden-view');
    viewDashboard.classList.add('hidden-view');
    if (viewPending) viewPending.classList.add('hidden-view');

    if (usuario.rol === 'pendiente') {
        if (viewPending) viewPending.classList.remove('hidden-view');
    } else {
        viewDashboard.classList.remove('hidden-view');
        setText('user-email-display', usuario.nombres || usuario.email);
        setText('user-role-display', usuario.rol ? usuario.rol.toUpperCase() : "VECINO");

        if (usuario.jacId) {
            await cargarInfoJAC(usuario.jacId);
            activarNotificaciones(usuario.jacId);
        }
    }
}

// =========================================================
// 5. NAVEGACIÓN Y MENÚS
// =========================================================

// Acordeón Libros
if (btnToggleLibros) {
    btnToggleLibros.addEventListener('click', () => {
        const isHidden = submenuLibros.style.display === 'none';
        submenuLibros.style.display = isHidden ? 'flex' : 'none';
        iconArrowLibros.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    });
}

// Router Principal
menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        if (link.dataset.target) {
            e.preventDefault();
            menuLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Ocultar todo
            if (sectionHome) sectionHome.classList.add('hidden-view');
            if (sectionDirectiva) sectionDirectiva.classList.add('hidden-view');
            if (sectionLibros) sectionLibros.classList.add('hidden-view');
            if (sectionBandeja) sectionBandeja.classList.add('hidden-view');

            // Mostrar selección
            const target = link.dataset.target;
            if (target === 'home') sectionHome.classList.remove('hidden-view');
            else if (target === 'directiva') {
                sectionDirectiva.classList.remove('hidden-view');
                if (currentJacId) cargarDirectiva(currentJacId);
            }
            else if (target.startsWith('libro-')) {
                sectionLibros.classList.remove('hidden-view');
                const tipoLibro = target.split('-')[1];
                if (currentJacId) cargarLibro(currentJacId, tipoLibro);
            }
            else if (target === 'bandeja') {
                sectionBandeja.classList.remove('hidden-view');
                if (currentJacId) cargarMensajes(currentJacId);
            }
        }
    });
});


// =========================================================
// 6. FUNCIONES DE CARGA DE DATOS (LIBROS Y TABLAS)
// =========================================================

// --- A. CARGAR INFO GENERAL ---
async function cargarInfoJAC(jacId) {
    try {
        currentJacId = jacId;
        const jacSnap = await getDoc(doc(db, "jacs", jacId));
        if (jacSnap.exists()) {
            const data = jacSnap.data();
            setText('jac-nombre', data.nombre);
            setText('jac-nit', data.nit);
            setText('jac-uuid', data.uuid);
            const vid = document.getElementById('jac-video');
            if (vid) vid.src = data.videoUrl;
            setText('dir-titulo', "Gobierno " + data.nombre);
        }
    } catch (e) { console.error(e); }
}

// --- B. CARGAR DIRECTIVA (LEE DESDE 'USUARIOS') ---
async function cargarDirectiva(jacId) {
    const gridContainer = document.getElementById('grid-gobierno');
    if (!gridContainer) return;
    gridContainer.innerHTML = '<div style="color:white; padding:20px;">Cargando estructura...</div>';

    try {
        // 1. CAMBIO CLAVE: Buscamos en la colección 'usuarios'
        const usuariosRef = collection(db, "usuarios");
        // Filtramos por la JAC actual
        const q = query(usuariosRef, where("jacId", "==", jacId));
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            gridContainer.innerHTML = '<div style="color:#aaa;">No hay directiva visible.</div>';
            return;
        }

        // 2. CLASIFICAR DATOS (En memoria)
        let dignatarios = []; // Presidente, Tesorero, etc.
        let comites = [];     // Coordinadores

        snapshot.forEach(doc => {
            const data = doc.data();
            // Filtramos usando el campo 'grupo' que se ve en tu captura
            if (data.grupo === 'dignatarios') dignatarios.push(data);
            else if (data.grupo === 'comites') comites.push(data);
        });

        gridContainer.innerHTML = '';

        // 3. PINTAR TARJETA 1: JUNTA DIRECTIVA (DIGNATARIOS)
        if (dignatarios.length > 0) {
            // Buscamos al Presidente para mostrarlo (o al primero que haya si no hay presi)
            const presidente = dignatarios.find(d => d.cargo && d.cargo.toLowerCase().includes('presidente')) || dignatarios[0];
            
            const htmlDirectiva = `
                <article class="gov-card">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div class="gov-badge-top">JUNTA DIRECTIVA ACTUAL</div>
                        <a href="#" style="color:#77c7ff; font-size:0.8rem; text-decoration:none;">Ver perfil →</a>
                    </div>
                    
                    <h2 class="gov-role-title">${presidente.cargo || 'Dignatario'}</h2>
                    
                    <div class="gov-profile">
                        <div class="gov-avatar">${getIniciales(presidente.nombre)}</div>
                        <div class="gov-info">
                            <h3>${presidente.nombre}</h3>
                            <p style="opacity:0.7; font-size:0.8rem">${presidente.email}</p>
                        </div>
                    </div>

                    <div class="gov-footer">
                        <div class="gov-tags">
                            <span class="gov-tag">Gobernanza</span>
                            <span class="gov-tag">Gestión</span>
                        </div>
                        <span style="color:#aaa; font-size:0.85rem;">${dignatarios.length} integrantes</span>
                    </div>
                </article>
            `;
            gridContainer.innerHTML += htmlDirectiva;
        } else {
             gridContainer.innerHTML = '<div style="color:#aaa; padding:10px;">No hay dignatarios registrados.</div>';
        }

        // 4. PINTAR TARJETAS 2...N: COMITÉS DE TRABAJO
        comites.forEach(comite => {
            // Usamos 'comision_interes' (nuevo registro) o 'nombre_comision' (viejo)
            const nombreComite = comite.comision_interes || comite.nombre_comision || "Comité de Trabajo";
            const htmlComite = `
                <article class="gov-card">
                    <div class="gov-badge-top" style="background:#232d36;">COMITÉ DE TRABAJO</div>
                    
                    <h2 class="gov-role-title" style="font-size:1.4rem; margin-bottom:10px;">${comite.nombre}</h2>
                    <p style="color:#77c7ff; font-size:0.9rem; margin-bottom:20px;">${comite.cargo || 'Coordinador'}</p>
                    
                    <div class="gov-info" style="margin-bottom:20px;">
                        <p style="color:white; font-weight:600; margin-bottom:5px;">${nombreComite}</p>
                        <p style="font-size:0.85rem; opacity:0.7;">Gestión de proyectos y comunidad.</p>
                    </div>

                    <div class="gov-footer">
                        <div class="gov-btn-group">
                            <button class="gov-action-btn"><i class="ri-group-line"></i> Ver</button>
                        </div>
                    </div>
                </article>
            `;
            gridContainer.innerHTML += htmlComite;
        });

    } catch (error) { 
        console.error("Error cargando directiva:", error);
        gridContainer.innerHTML = '<div style="color:red;">Error de conexión.</div>';
    }
}

// --- C. CARGAR LIBROS (LA FUNCIÓN CRÍTICA) ---
async function cargarLibro(jacId, tipoLibro) {
    const tituloEl = document.getElementById('libro-titulo');
    const subtituloEl = document.getElementById('libro-subtitulo');
    const thead = document.getElementById('libro-thead');
    const tbody = document.getElementById('libro-tbody');
    
    // Limpieza
    if(tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Cargando...</td></tr>';
    const headerActas = document.getElementById('header-actas-extra');
    if(headerActas) headerActas.style.display = 'none';

    // 1. CONFIGURACIÓN VISUAL
    if (tipoLibro === 'afiliados') {
        setText(tituloEl, "Libro de Afiliados");
        if(subtituloEl) subtituloEl.textContent = "Registro legal de socios (Ley 2166).";
        thead.innerHTML = `<tr><th>Afiliado</th><th>Documento</th><th>Comisión</th><th>Estado</th></tr>`;
    } 
    else if (tipoLibro === 'actas') {
        setText(tituloEl, "Libro de Actas");
        if(subtituloEl) subtituloEl.textContent = "Historial de asambleas.";
        if(headerActas) headerActas.style.display = 'block';
        thead.innerHTML = `<tr><th>Número</th><th>Fecha</th><th>Tema</th><th>Decisiones</th><th>Estado</th><th>Acciones</th></tr>`;
    }
    else if (tipoLibro === 'contable') {
        setText(tituloEl, "Libro Contable");
        if(subtituloEl) subtituloEl.textContent = "Control de tesorería.";
        if(headerActas) headerActas.style.display = 'block'; // Reusa el header de stats
        thead.innerHTML = `<tr><th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Valor</th><th>Soporte</th></tr>`;
    }
    else if (tipoLibro === 'inventario') {
        setText(tituloEl, "Inventario");
        if(subtituloEl) subtituloEl.textContent = "Bienes y equipos.";
        if(headerActas) headerActas.style.display = 'block'; // Reusa el header de stats
        thead.innerHTML = `<tr><th>Código</th><th>Bien</th><th>Categoría</th><th>Estado</th><th>Cant.</th><th>Ubicación</th><th>Resp.</th></tr>`;
    }
    else if (tipoLibro === 'convivencia') {
        setText(tituloEl, "Libro de Convivencia");
        if(subtituloEl) subtituloEl.textContent = "Normas y acuerdos.";
        thead.innerHTML = `<tr><th>Fecha</th><th>Norma</th><th>Descripción</th><th>Aprobado Por</th><th>Responsable</th></tr>`;
    }

    // 2. PERMISOS DEL BOTÓN NUEVO
    const btnNuevo = document.getElementById('btn-nuevo-registro');
    const permisos = {
        'afiliados': ['presidente', 'secretario', 'admin'],
        'actas': ['presidente', 'secretario', 'admin'],
        'contable': ['presidente', 'tesorero', 'admin'],
        'inventario': ['presidente', 'tesorero', 'admin'],
        'convivencia': ['presidente', 'secretario', 'conciliador', 'admin']
    };
    if (btnNuevo) {
        const miRol = currentUserData ? currentUserData.rol : 'vecino';
        const autorizados = permisos[tipoLibro] || [];
        btnNuevo.style.display = autorizados.includes(miRol) ? 'flex' : 'none';
        
        // Texto personalizado para convivencia
        if(tipoLibro === 'convivencia') btnNuevo.innerHTML = '<i class="ri-add-line"></i> Agregar norma';
        else btnNuevo.innerHTML = '<i class="ri-add-line"></i> Nuevo Registro';
    }

    // 3. TRAER DATOS
    try {
        const librosRef = collection(db, "jacs", jacId, "libro_" + tipoLibro);
        const snapshot = await getDocs(librosRef);
        
        if(tbody) tbody.innerHTML = ''; 
        if (snapshot.empty) {
            if(tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#aaa;">No hay registros.</td></tr>';
            return;
        }

        // Variables para totales
        let sumaIng = 0, sumaEgr = 0, invItems = 0, invValor = 0, invAsig = 0, invBaja = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            let fila = "";

            if (tipoLibro === 'actas') {
                const badge = data.estado === 'Aprobada' ? 'badge-green' : 'badge-blue';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-family:monospace; color:white;">${data.numero || '-'}</td>
                    <td>${data.fecha}</td>
                    <td style="color:white; font-weight:600;">${data.tipo || data.tema}</td>
                    <td>${data.decisiones ? data.decisiones.substring(0,25)+'...' : '-'}</td>
                    <td><span class="acta-badge ${badge}">${data.estado}</span></td>
                    <td><button class="btn-editar btn-ver-acta">Ver</button></td>
                `;
                tr.querySelector('.btn-ver-acta').addEventListener('click', () => abrirVisorActa(data));
                tbody.appendChild(tr);
                return; // Importante return para no duplicar
            }
            else if (tipoLibro === 'afiliados') {
                const icono = data.uid_usuario ? '<i class="ri-wifi-line" style="color:#10b981"></i>' : '<i class="ri-wifi-off-line" style="color:#555"></i>';
                const estadoColor = data.estado === 'Inactivo' ? '#ef4444' : '#10b981';
                const nombre = data.nombre || `${data.nombres} ${data.apellidos}`;
                fila = `<tr>
                    <td style="display:flex; gap:10px; align-items:center;">${icono} <div><b style="color:white">${nombre}</b><br><span style="font-size:0.8em; color:#777">${data.telefono||''}</span></div></td>
                    <td><span style="color:#777; font-size:0.8em">${data.tipo_documento||'CC'}</span> ${data.documento}</td>
                    <td>${data.comision_trabajo || 'Asamblea'}</td>
                    <td><span class="badge" style="color:${estadoColor}; border:1px solid ${estadoColor}40">${data.estado||'Activo'}</span></td>
                </tr>`;
            }
            else if (tipoLibro === 'contable') {
                const esIng = data.tipo === 'Ingreso';
                if(esIng) sumaIng += Number(data.valor); else sumaEgr += Number(data.valor);
                const color = esIng ? '#10b981' : '#f87171';
                fila = `<tr>
                    <td>${data.fecha}</td>
                    <td><b style="color:white">${data.concepto}</b></td>
                    <td style="color:${color}; text-transform:uppercase;">${data.tipo}</td>
                    <td style="color:white;">$${new Intl.NumberFormat().format(data.valor)}</td>
                    <td>${data.soporte || '-'}</td>
                </tr>`;
            }
            else if (tipoLibro === 'inventario') {
                invItems += Number(data.cantidad);
                invValor += Number(data.valor_estimado);
                if(data.responsable) invAsig += Number(data.cantidad);
                if(data.estado_bien === 'Para baja') invBaja += Number(data.cantidad);
                
                fila = `<tr>
                    <td style="font-family:monospace;">${data.codigo||'-'}</td>
                    <td><b style="color:white">${data.item}</b></td>
                    <td>${data.categoria}</td>
                    <td>${data.estado_bien}</td>
                    <td>${data.cantidad}</td>
                    <td>${data.ubicacion}</td>
                    <td>${data.responsable}</td>
                </tr>`;
            }
            else if (tipoLibro === 'convivencia') {
                fila = `<tr>
                    <td style="color:#aaa;">${data.fecha}</td>
                    <td><b style="color:white;">${data.norma}</b></td>
                    <td style="color:#ccc;">${data.descripcion}</td>
                    <td><span style="color:white; font-weight:bold;">${data.votos}</span></td>
                    <td>${data.responsable} <br> <span style="font-size:0.7em; color:#555;">${data.doc_responsable}</span></td>
                </tr>`;
            }

            if(fila && tbody) tbody.innerHTML += fila;
        });

        // Actualizar totales (Contable e Inventario)
        if(tipoLibro === 'contable') {
            setText('total-ingresos', "$ "+sumaIng);
            setText('total-egresos', "$ "+sumaEgr);
            const bal = sumaIng - sumaEgr;
            const elBal = document.getElementById('total-balance');
            if(elBal) {
                elBal.textContent = "$ "+bal;
                elBal.style.color = bal >= 0 ? '#10b981' : '#f43f5e';
            }
        }
        if(tipoLibro === 'inventario') {
            setText('inv-total-items', invItems);
            setText('inv-total-valor', "$ "+invValor);
            setText('inv-asignados', invAsig);
            setText('inv-baja', invBaja);
        }

    } catch (error) { console.error(error); }
}


// =========================================================
// 7. BANDEJA DE ENTRADA Y MENSAJERÍA
// =========================================================

async function cargarMensajes(jacId) {
    const contenedor = document.getElementById('lista-mensajes');
    if(!contenedor) return;
    contenedor.innerHTML = '<div style="padding:20px; text-align:center">Cargando...</div>';

    try {
        const msgsRef = collection(db, "jacs", jacId, "mensajes");
        let q;
        const rolesDirectiva = ['presidente', 'vicepresidente', 'tesorero', 'secretario', 'fiscal', 'admin'];
        
        if (rolesDirectiva.includes(currentUserData.rol)) {
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

        let lista = [];
        snapshot.forEach(doc => lista.push({ id: doc.id, ...doc.data() }));
        lista.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        lista.forEach(data => {
            const item = document.createElement('div');
            item.className = data.estado === 'no_leido' ? 'message-item unread' : 'message-item read';
            
            let infoContexto = "";
            const nombresAreas = { 'admin': 'Directiva', 'tesoreria': 'Tesorería', 'convivencia': 'Convivencia' };
            const nombreArea = nombresAreas[data.destinatario] || data.destinatario;

            if (rolesDirectiva.includes(currentUserData.rol)) {
                const quien = data.remitenteNombre || data.remitente;
                infoContexto = `<span style="color:#77c7ff;">[${nombreArea}]</span> De: ${quien}`;
            } else {
                infoContexto = `Para: ${nombreArea}`;
            }

            item.innerHTML = `<h4>${data.asunto}</h4><p>${infoContexto}</p><p style="font-size:0.7em; opacity:0.6">${data.fecha}</p>`;
            item.addEventListener('click', () => verMensajeCompleto(data, data.id, item));
            contenedor.appendChild(item);
        });
    } catch (e) { console.error(e); }
}

async function verMensajeCompleto(data, msgId, itemHTML) {
    vistaVacia.classList.add('hidden-view');
    vistaEscritura.classList.add('hidden-view');
    vistaLectura.classList.remove('hidden-view');

    const nombre = data.remitenteNombre || "Usuario";
    const iniciales = nombre.substring(0, 2).toUpperCase();
    
    setText('msg-asunto', data.asunto);
    setText('msg-nombre-completo', nombre);
    setText('msg-email', data.remitente);
    setText('msg-fecha', data.fecha);
    setText('msg-avatar-container', iniciales);
    document.getElementById('msg-cuerpo').innerText = data.cuerpo;

    // Respuesta
    const boxVis = document.getElementById('visualizar-respuesta');
    const boxForm = document.getElementById('formulario-respuesta');
    boxVis.classList.add('hidden-view');
    boxForm.classList.add('hidden-view');
    
    if(btnResp) btnResp.dataset.msgId = msgId;

    const rolesDir = ['presidente', 'vicepresidente', 'tesorero', 'secretario', 'fiscal', 'admin'];
    
    if (data.respuesta) {
        boxVis.classList.remove('hidden-view');
        setText('resp-texto', data.respuesta);
        setText('resp-fecha', data.fechaRespuesta);
    } else if (rolesDir.includes(currentUserData.rol)) {
        boxForm.classList.remove('hidden-view');
        document.getElementById('txt-respuesta-admin').value = "";
    }

    // Marcar leído
    if (rolesDir.includes(currentUserData.rol) && data.estado === 'no_leido') {
        try {
            await updateDoc(doc(db, "jacs", currentJacId, "mensajes", msgId), { estado: 'leido' });
            if(itemHTML) { itemHTML.classList.remove('unread'); itemHTML.classList.add('read'); }
        } catch(e) {}
    }
}

async function enviarMensajeNuevo(asunto, dest, cuerpo) {
    try {
        const nombre = currentUserData.nombres || currentUserData.nombre || "Vecino";
        await addDoc(collection(db, "jacs", currentJacId, "mensajes"), {
            asunto: asunto, destinatario: dest, cuerpo: cuerpo,
            remitente: currentUserData.email,
            remitenteNombre: nombre,
            fecha: new Date().toLocaleDateString(),
            timestamp: Date.now(),
            estado: 'no_leido'
        });
        alert("Mensaje enviado.");
        vistaEscritura.classList.add('hidden-view');
        vistaVacia.classList.remove('hidden-view');
        cargarMensajes(currentJacId);
        document.getElementById('form-mensaje').reset();
    } catch (e) { alert("Error envío"); }
}

async function enviarRespuestaAdmin() {
    const msgId = btnResp.dataset.msgId;
    const txt = document.getElementById('txt-respuesta-admin').value;
    if(!txt) return;
    try {
        await updateDoc(doc(db, "jacs", currentJacId, "mensajes", msgId), {
            respuesta: txt,
            fechaRespuesta: new Date().toLocaleDateString(),
            estado: 'solucionado'
        });
        alert("Respuesta enviada.");
        // Refrescar vista
        document.getElementById('formulario-respuesta').classList.add('hidden-view');
        document.getElementById('visualizar-respuesta').classList.remove('hidden-view');
        setText('resp-texto', txt);
    } catch(e) { alert("Error"); }
}

function activarNotificaciones(jacId) {
    if (!currentUserData.rol.includes('admin') && !['presidente','secretario'].includes(currentUserData.rol)) return;
    const q = query(collection(db, "jacs", jacId, "mensajes"), where("estado", "==", "no_leido"));
    onSnapshot(q, (snap) => {
        const badge = document.getElementById('badge-mensajes');
        if(snap.size > 0) {
            badge.textContent = snap.size;
            badge.classList.remove('hidden-view');
        } else {
            badge.classList.add('hidden-view');
        }
    });
}


// =========================================================
// 8. LOGICA DE FORMULARIOS (LOGIN/REGISTRO)
// =========================================================

if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        await loginUsuario(document.getElementById('login-email').value, document.getElementById('login-pass').value);
    });
}

if (formRegisterFull) {
    formRegisterFull.addEventListener('submit', async (e) => {
        e.preventDefault();
        const datos = {
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
        if(!datos.jacId) return alert("Selecciona JAC");
        const res = await registrarUsuarioCompleto(datos);
        if(res.success) {
            viewRegister.classList.add('hidden-view');
            if(viewPending) viewPending.classList.remove('hidden-view');
            formRegisterFull.reset();
        } else { alert("Error: " + res.message); }
    });
}

// Botones Vista
if(btnIrRegistro) btnIrRegistro.addEventListener('click', () => { viewAuth.classList.add('hidden-view'); viewRegister.classList.remove('hidden-view'); cargarListaDeJACs(); });
if(btnCancelarRegistro) btnCancelarRegistro.addEventListener('click', () => { viewRegister.classList.add('hidden-view'); viewAuth.classList.remove('hidden-view'); });
if(btnLogout) btnLogout.addEventListener('click', logout);
if(btnLogoutPending) btnLogoutPending.addEventListener('click', logout);

// Cargar Lista de JACs
async function cargarListaDeJACs() {
    if(selectJac.options.length > 1) return;
    try {
        const snap = await getDocs(collection(db, "jacs"));
        selectJac.innerHTML = '<option value="" disabled selected>-- Selecciona tu Comunidad --</option>';
        snap.forEach(d => {
            selectJac.innerHTML += `<option value="${d.id}">${d.data().nombre}</option>`;
        });
    } catch(e) {}
}


// =========================================================
// 9. LOGICA DE MODALES (ACTAS Y GENÉRICO)
// =========================================================

// CONFIGURACIÓN LIBROS
const configLibros = {
    'afiliados': [
        { label: 'Nombres', type: 'text', id: 'nombres' },
        { label: 'Apellidos', type: 'text', id: 'apellidos' },
        { label: 'Tipo Doc', type: 'select', id: 'tipo_documento', options: ['CC', 'TI', 'CE'] },
        { label: 'Documento', type: 'number', id: 'documento' },
        { label: 'Nacimiento', type: 'date', id: 'fecha_nacimiento' },
        { label: 'Género', type: 'select', id: 'genero', options: ['Hombre', 'Mujer', 'Otro'] },
        { label: 'Dirección', type: 'text', id: 'direccion' },
        { label: 'Teléfono', type: 'number', id: 'telefono' },
        { label: 'Comisión', type: 'select', id: 'comision_trabajo', options: ['Asamblea', 'Obras', 'Salud', 'Deportes', 'Seguridad'] },
        { label: 'Estado', type: 'select', id: 'estado', options: ['Activo', 'Inactivo'] }
    ],
    'contable': [
        { label: 'Nº Comprobante', type: 'text', id: 'numero', placeholder: 'CMP-001' },
        { label: 'Fecha', type: 'date', id: 'fecha' },
        { label: 'Tipo', type: 'select', id: 'tipo', options: ['Ingreso', 'Egreso'] },
        { label: 'Concepto', type: 'text', id: 'concepto' },
        { label: 'Tercero', type: 'text', id: 'tercero' },
        { label: 'Valor ($)', type: 'number', id: 'valor' },
        { label: 'Estado', type: 'select', id: 'estado', options: ['En revisión', 'Aprobado'] }
    ],
    'inventario': [
        { label: 'Código', type: 'text', id: 'codigo' },
        { label: 'Nombre Bien', type: 'text', id: 'item' },
        { label: 'Categoría', type: 'select', id: 'categoria', options: ['Tecnología', 'Mobiliario', 'Equipo'] },
        { label: 'Estado', type: 'select', id: 'estado_bien', options: ['Operativo', 'Mantenimiento', 'Baja'] },
        { label: 'Cantidad', type: 'number', id: 'cantidad' },
        { label: 'Ubicación', type: 'text', id: 'ubicacion' },
        { label: 'Responsable', type: 'text', id: 'responsable' },
        { label: 'Valor Estimado', type: 'number', id: 'valor_estimado' }
    ],
    'convivencia': [
        { label: 'Fecha', type: 'date', id: 'fecha' },
        { label: 'Norma', type: 'text', id: 'norma' },
        { label: 'Descripción', type: 'textarea', id: 'descripcion' },
        { label: 'Aprobado por', type: 'text', id: 'votos' },
        { label: 'Responsable', type: 'text', id: 'responsable' },
        { label: 'Doc. Responsable', type: 'number', id: 'doc_responsable' }
    ]
};

// ABRIR MODAL GENÉRICO
if (btnNuevoRegistro) {
    btnNuevoRegistro.addEventListener('click', () => {
        const menuActivo = document.querySelector('#submenu-libros .menu-item.active');
        if (!menuActivo) return;
        const tipoLibro = menuActivo.dataset.target.split('-')[1];
        libroActualParaGuardar = tipoLibro;

        if (tipoLibro === 'actas') { abrirModalActas(); return; }

        const campos = configLibros[tipoLibro];
        if(!campos) return alert("Error configuración");

        contenedorCampos.innerHTML = '';
        document.getElementById('modal-titulo-texto').textContent = "Nuevo: " + tipoLibro.toUpperCase();

        campos.forEach(c => {
            let inputHTML = '';
            if (c.type === 'select') {
                const opts = c.options.map(o => `<option value="${o}">${o}</option>`).join('');
                inputHTML = `<select id="input-${c.id}" class="inbox-input">${opts}</select>`;
            } else if (c.type === 'textarea') {
                inputHTML = `<textarea id="input-${c.id}" class="inbox-input" rows="3"></textarea>`;
            } else {
                inputHTML = `<input type="${c.type}" id="input-${c.id}" class="inbox-input" placeholder="${c.placeholder||''}">`;
            }
            const div = document.createElement('div');
            if(['direccion','comision_trabajo','descripcion','concepto'].includes(c.id)) div.className='full-width';
            div.innerHTML = `<label class="input-label">${c.label}</label>${inputHTML}`;
            contenedorCampos.appendChild(div);
        });
        modalRegistro.classList.remove('hidden-view');
    });
}

// GUARDAR GENÉRICO
if(formModal) {
    formModal.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {};
        configLibros[libroActualParaGuardar].forEach(c => {
            data[c.id] = document.getElementById(`input-${c.id}`).value;
        });
        data.timestamp = Date.now();
        try {
            await addDoc(collection(db, "jacs", currentJacId, "libro_"+libroActualParaGuardar), data);
            alert("Guardado.");
            modalRegistro.classList.add('hidden-view');
            cargarLibro(currentJacId, libroActualParaGuardar);
        } catch(err) { alert("Error"); }
    });
}
if(btnCancelGen) btnCancelGen.onclick = () => modalRegistro.classList.add('hidden-view');
if(btnCerrarModal) btnCerrarModal.onclick = () => modalRegistro.classList.add('hidden-view');


// MODAL ACTAS (ESPECÍFICO)
async function abrirModalActas() {
    modalActa.classList.remove('hidden-view');
    document.getElementById('acta-uuid').value = crypto.randomUUID();
    const selPresi = document.getElementById('acta-presidente');
    const selSecre = document.getElementById('acta-secretario');
    
    selPresi.innerHTML = '<option>Cargando...</option>';
    selSecre.innerHTML = '<option>Cargando...</option>';

    try {
        // Buscar en usuarios roles presidente/secretario
        const q = query(collection(db, "usuarios"), where("jacId", "==", currentJacId), where("rol", "in", ["presidente", "secretario"]));
        const snap = await getDocs(q);
        
        const def = '<option value="" disabled selected>Seleccione...</option>';
        selPresi.innerHTML = def; selSecre.innerHTML = def;

        snap.forEach(doc => {
            const d = doc.data();
            const opt = `<option value="${d.nombre}">${d.nombre} (${d.rol})</option>`;
            if(d.rol === 'presidente') selPresi.innerHTML += opt;
            if(d.rol === 'secretario') selSecre.innerHTML += opt;
        });
        // Opciones manuales
        selPresi.innerHTML += '<option value="Ad-Hoc">Ad-Hoc</option>';
        selSecre.innerHTML += '<option value="Ad-Hoc">Ad-Hoc</option>';

    } catch(e) { console.error(e); }
}

if(btnGuardarActa) {
    btnGuardarActa.addEventListener('click', async () => {
        // ... (Recolección de datos acta - Simplificada para el ejemplo)
        // Puedes pegar aquí tu lógica detallada de recolección si la tienes
        // Por ahora haré un guardado básico para que funcione
        const nuevaActa = {
            numero: document.getElementById('acta-num').value,
            tipo: document.getElementById('acta-tipo').value,
            fecha: document.getElementById('acta-fecha').value,
            hora_inicio: document.getElementById('acta-inicio').value,
            hora_fin: document.getElementById('acta-fin').value,
            lugar: document.getElementById('acta-lugar').value,
            uuid: document.getElementById('acta-uuid').value,
            quorum: {
                habiles: document.getElementById('acta-habiles').value,
                asistentes: document.getElementById('acta-asistentes').value,
                resultado: document.getElementById('acta-quorum-res').value
            },
            orden_dia: [], // Llenar con inputs
            desarrollo: document.getElementById('acta-desarrollo').value,
            acuerdos: [],
            cierre_msg: document.getElementById('acta-cierre-texto').value,
            firmas: {
                presidente: document.getElementById('acta-presidente').value,
                secretario: document.getElementById('acta-secretario').value
            },
            estado: 'Aprobada',
            timestamp: Date.now()
        };
        
        // Recolectar orden del dia
        document.querySelectorAll('.input-orden').forEach(i => { if(i.value) nuevaActa.orden_dia.push(i.value) });
        // Recolectar acuerdo 1
        if(document.getElementById('acuerdo-1-desc').value) {
            nuevaActa.acuerdos.push({
                desc: document.getElementById('acuerdo-1-desc').value,
                resp: document.getElementById('acuerdo-1-resp').value,
                plazo: document.getElementById('acuerdo-1-plazo').value
            });
        }

        try {
            await addDoc(collection(db, "jacs", currentJacId, "libro_actas"), nuevaActa);
            alert("Acta guardada.");
            modalActa.classList.add('hidden-view');
            cargarLibro(currentJacId, 'actas');
        } catch(e) { alert("Error guardar acta"); }
    });
}
if(btnCerrarActa) btnCerrarActa.onclick = () => modalActa.classList.add('hidden-view');
if(btnCancelarActa) btnCancelarActa.onclick = () => modalActa.classList.add('hidden-view');


// VISOR DE ACTAS
function abrirVisorActa(data) {
    const modalVisor = document.getElementById('modal-visor-acta');
    modalVisor.classList.remove('hidden-view');
    
    setText('visor-numero', data.numero);
    setText('visor-tipo', data.tipo);
    setText('visor-lugar-fecha', `${data.lugar} • ${data.fecha}`);
    setText('visor-uuid', data.uuid);
    
    setText('visor-habiles', data.quorum?.habiles);
    setText('visor-asistentes', data.quorum?.asistentes);
    setText('visor-quorum-res', data.quorum?.resultado);
    
    const lst = document.getElementById('visor-orden');
    lst.innerHTML = '';
    if(data.orden_dia) data.orden_dia.forEach(i => lst.innerHTML+=`<li>${i}</li>`);
    
    setText('visor-desarrollo', data.desarrollo);
    
    const ac = document.getElementById('visor-acuerdos-container');
    ac.innerHTML = '';
    if(data.acuerdos) data.acuerdos.forEach(a => {
        ac.innerHTML += `<div class="acuerdo-card"><span class="acuerdo-desc">${a.desc}</span><div class="acuerdo-meta">Resp: ${a.resp} | Plazo: ${a.plazo}</div></div>`;
    });
    
    setText('visor-firma-presi', data.firmas?.presidente);
    setText('visor-firma-secre', data.firmas?.secretario);
    setText('visor-cierre', data.cierre_msg);
    
    document.getElementById('btn-cerrar-visor').onclick = () => modalVisor.classList.add('hidden-view');
}


// 10. HELPERS
function setText(id, text) {
    const el = document.getElementById(id);
    if(el) el.textContent = text;
}
function getIniciales(nombre) {
    return nombre ? nombre.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : "--";
}