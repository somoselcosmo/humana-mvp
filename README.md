# Humana Digital - Plataforma JAC

Plataforma institucional para gestionar comunidades.

## GitHub Pages

Este sitio está publicado en GitHub Pages y está disponible en:

**https://somoselcosmo.github.io/humana-mvp/**

## Características

- Plataforma web estática con HTML, CSS y JavaScript
- Integración con Firebase
- Sistema de autenticación de usuarios
- Dashboard para gestión de comunidades

## Estructura del Proyecto

```
├── index.html          # Página principal
├── css/               # Estilos
│   ├── style.css
│   └── dashboard.css
├── js/                # Scripts
│   ├── app.js
│   ├── auth.js
│   └── firebase.js
└── assets/            # Recursos (imágenes, etc.)
```

## Despliegue

El sitio se despliega automáticamente a GitHub Pages cuando se hace push a la rama `main` mediante GitHub Actions.

Para desplegar manualmente:
1. Ve a la pestaña "Actions" en GitHub
2. Selecciona el workflow "Deploy to GitHub Pages"
3. Haz clic en "Run workflow"

## Desarrollo Local

Para ejecutar el proyecto localmente, simplemente abre el archivo `index.html` en tu navegador o usa un servidor local:

```bash
# Con Python
python -m http.server 8000

# Con Node.js (http-server)
npx http-server

# Con PHP
php -S localhost:8000
```

Luego visita `http://localhost:8000` en tu navegador.
