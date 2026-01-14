// Mock users para entorno de pruebas (no persistente)
export const MOCK_USERS = [
  {
    uid: "u1",
    email: "test@local.test",
    pass: "test123",
    nombres: "Usuario",
    apellidos: "Prueba",
    nombre: "Usuario Prueba",
    rol: "vecino",
    jacId: "demo-jac",
  },
  {
    uid: "admin1",
    email: "admin@local.test",
    pass: "admin123",
    nombres: "Admin",
    apellidos: "Prueba",
    nombre: "Admin Prueba",
    rol: "admin",
    jacId: "demo-jac",
  },
];

export function findUserByEmailAndPass(email, pass) {
  return MOCK_USERS.find((u) => u.email === email && u.pass === pass) || null;
}

export function addMockUser(user) {
  // Simplemente empuja al array en runtime (no persiste)
  const uid =
    user.uid ||
    (crypto && crypto.randomUUID ? crypto.randomUUID() : "u" + Date.now());
  const nuevo = Object.assign({ uid }, user);
  MOCK_USERS.push(nuevo);
  return nuevo;
}
