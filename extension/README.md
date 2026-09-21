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
4. Pulsa **Capturar apariencia como imagen**.
5. La extensión recortará el área visible y abrirá una captura dedicada para html.to.design.

El resultado conserva la apariencia como una única imagen. No convierte el contenido interno del `iframe` en capas editables.

## Contenido HTML externo

Cuando un `iframe` u `object` visible tiene una URL externa, el panel ofrece dos caminos:

- **Abrir URL en nueva pestaña**: acción secundaria para cargar el documento fuera del contenedor. La pestaña conserva la barra normal de Chrome; pulsa allí **UI COPY4** para capturar el HTML.
- **Capturar apariencia como imagen**: alternativa para widgets que no funcionan fuera de la página original, como reCAPTCHA.

Los iframes ocultos, de 0 × 0 o sin una acción útil no aparecen en el panel. La extensión conserva un resumen en la consola para diagnóstico.

## Imágenes protegidas o cross-origin

La extensión prepara automáticamente los elementos `img` antes de abrir la toolbar de html.to.design. Primero intenta descargarlos con la sesión actual y, si CORS lo impide, recorta sus píxeles desde la pestaña visible. En presets como mobile o tablet, transfiere después esas imágenes a la nueva ventana y también las aplica si la aplicación vuelve a renderizar las cards. Solo la imagen queda rasterizada; la card que la contiene conserva sus capas editables.

Durante esta preparación la página original puede desplazarse unos segundos y vuelve después a su posición inicial.

## Desarrollo

Después de modificar `src/bookmarklet.js`, regenera el archivo que usa la extensión:

```bash
node scripts/build-bookmarklet.cjs
```

Después, pulsa **Actualizar** en la tarjeta de la extensión dentro de `chrome://extensions`.
