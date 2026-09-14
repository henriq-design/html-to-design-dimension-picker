# Extensión local UI COPY4

Esta extensión ejecuta el selector de dimensiones desde el icono de Chrome, añade captura visual para documentos `iframe` cross-origin, como reCAPTCHA, y recupera imágenes que html.to.design no puede descargar directamente.

## Instalación

1. Abre `chrome://extensions` en Chrome.
2. Activa **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida**.
4. Selecciona la carpeta `extension` de este repositorio.
5. Fija **UI COPY4** en la barra desde el menú de extensiones.

También puedes abrirla con `Alt+Shift+U`. Chrome permite cambiar este atajo desde `chrome://extensions/shortcuts`.

## Uso con reCAPTCHA

1. Abre la página y deja reCAPTCHA completamente visible.
2. Pulsa el icono de **UI COPY4**.
3. En **Contenido embebido**, localiza el `iframe` visible.
4. Pulsa **Capturar como imagen**.
5. La extensión recortará el área visible y abrirá una captura dedicada para html.to.design.

El resultado conserva la apariencia como una única imagen. No convierte el contenido interno del `iframe` en capas editables.

## Imágenes protegidas o cross-origin

Al elegir **Viewport actual**, la extensión prepara automáticamente los elementos `img` antes de abrir la toolbar de html.to.design. Primero intenta descargarlos con la sesión actual y, si CORS lo impide, recorta sus píxeles desde la pestaña visible. Solo la imagen queda rasterizada; la card que la contiene conserva sus capas editables.

Durante esta preparación la página puede desplazarse unos segundos y vuelve después a su posición inicial. Las dimensiones personalizadas que abren otra ventana no disponen todavía de este fallback.

## Desarrollo

Después de modificar `src/bookmarklet.js`, regenera el archivo que usa la extensión:

```bash
node scripts/build-bookmarklet.cjs
```

Después, pulsa **Actualizar** en la tarjeta de la extensión dentro de `chrome://extensions`.
