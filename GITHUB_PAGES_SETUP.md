# Guía de Configuración de GitHub Pages

Este documento proporciona instrucciones paso a paso para configurar GitHub Pages para este repositorio.

## Pasos para Habilitar GitHub Pages

### 1. Habilitar GitHub Pages en el Repositorio

1. Ve a tu repositorio en GitHub: `https://github.com/somoselcosmo/humana-mvp`
2. Haz clic en **Settings** (Configuración) en la barra superior del repositorio
3. En el menú lateral izquierdo, desplázate hasta **Pages** (en la sección "Code and automation")
4. En la sección **Build and deployment**:
   - **Source**: Selecciona **GitHub Actions**
   
   ![GitHub Pages Source Setting](https://docs.github.com/assets/cb-47267/mw-1440/images/help/pages/select-github-actions-source.webp)

### 2. Ejecutar el Workflow (Opcional)

Una vez que hagas merge de esta Pull Request a la rama `main`, el workflow se ejecutará automáticamente.

Si deseas ejecutarlo manualmente antes:

1. Ve a la pestaña **Actions** en tu repositorio
2. Selecciona el workflow "Deploy to GitHub Pages" en la lista de la izquierda
3. Haz clic en el botón **Run workflow**
4. Selecciona la rama `main` (o la rama que deseas desplegar)
5. Haz clic en **Run workflow**

### 3. Verificar el Despliegue

1. Ve a la pestaña **Actions** para ver el progreso del workflow
2. Una vez que el workflow se complete exitosamente, tu sitio estará disponible en:
   
   **https://somoselcosmo.github.io/humana-mvp/**

3. Puede tomar unos minutos para que el sitio esté disponible después del primer despliegue

### 4. Configuración de Dominio Personalizado (Opcional)

Si deseas usar un dominio personalizado:

1. Ve a **Settings** > **Pages**
2. En la sección **Custom domain**, ingresa tu dominio
3. Haz clic en **Save**
4. Configura los registros DNS de tu dominio según las instrucciones de GitHub

## Cómo Funciona

El workflow de GitHub Actions (`deploy.yml`) hace lo siguiente:

1. **Se activa** cuando:
   - Se hace push a la rama `main`
   - Se ejecuta manualmente desde la pestaña Actions

2. **Pasos del despliegue**:
   - Descarga el código del repositorio
   - Configura GitHub Pages
   - Sube todos los archivos como un artefacto
   - Despliega el artefacto a GitHub Pages

3. **Permisos**: El workflow tiene los permisos necesarios para:
   - Leer el contenido del repositorio
   - Escribir en GitHub Pages
   - Usar tokens de identidad para la autenticación

## Despliegues Futuros

Después de la configuración inicial, cualquier push a la rama `main` desplegará automáticamente los cambios a GitHub Pages. No se requiere ninguna acción manual adicional.

## Solución de Problemas

### El workflow falla con error de permisos

Verifica que GitHub Pages esté habilitado y configurado para usar **GitHub Actions** como fuente.

### El sitio no se carga correctamente

- Verifica que `index.html` esté en la raíz del repositorio
- Asegúrate de que todas las rutas a recursos (CSS, JS, imágenes) sean relativas o absolutas correctas
- Revisa la consola del navegador para errores

### El sitio muestra un error 404

- Espera unos minutos después del primer despliegue
- Verifica que el workflow se haya completado exitosamente
- Asegúrate de estar accediendo a la URL correcta: `https://somoselcosmo.github.io/humana-mvp/`

## Recursos Adicionales

- [Documentación oficial de GitHub Pages](https://docs.github.com/es/pages)
- [Configuración de GitHub Actions para Pages](https://docs.github.com/es/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow)
- [Solución de problemas de GitHub Pages](https://docs.github.com/es/pages/getting-started-with-github-pages/troubleshooting-404-errors-for-github-pages-sites)
