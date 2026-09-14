# Extensión local UI COPY4

Esta extensión ejecuta el selector de dimensiones desde el icono de Chrome y añade captura visual para documentos `iframe` cross-origin, como reCAPTCHA.

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

## Desarrollo

Después de modificar `src/bookmarklet.js`, regenera el archivo que usa la extensión:

```bash
node scripts/build-bookmarklet.cjs
```

Después, pulsa **Actualizar** en la tarjeta de la extensión dentro de `chrome://extensions`.
