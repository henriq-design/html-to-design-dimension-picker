# Capture flow audit

## Causa probable

La regresión más probable venía de `installCaptureToolbarStyles(win)`. Esa función detectaba la toolbar creada por `capture.js`, le añadía la clase `h2d-capture-toolbar`, inyectaba CSS propio y escribía estilos inline con `!important` sobre el contenedor y sus controles.

Dentro de ese bloque, `findToolbarRoot()` buscaba la UI de html.to.design por textos como `Copy to clipboard`, `Entire screen` y `Select element`, y `applyToolbarClass()` aplicaba los estilos glass. Ese flujo podía convertir la UI original de html.to.design en una barra blanca inferior o alterar su posición visual.

También se revisó `exposeCaptureShadowRoots(win)`. Aunque no aplicaba estilos directamente, forzaba los shadow roots creados después a `mode: "open"`, una interferencia innecesaria ahora que no se va a inspeccionar ni reestilizar el DOM de `capture.js`.

`applyCaptureMetricOverrides(win, expectedSize)` también puede afectar al posicionamiento de la UI si `capture.js` usa `innerWidth`, `clientWidth`, `scrollWidth` o `scrollHeight` para calcular layouts. No se considera imprescindible para corregir esta regresión, así que queda desactivado por defecto para probar el baseline.

## Cambio aplicado

- Eliminado el flujo de styling custom sobre la toolbar de html.to.design:
  - `installCaptureToolbarStyles(win)`
  - `findToolbarRoot()`
  - `applyToolbarClass()`
  - inyección de `#h2d-capture-toolbar-style`
  - aplicación de estilos inline sobre toolbar y controles
  - intervalos y `MutationObserver` que perseguían nodos de `capture.js`
- Eliminada la llamada previa a `exposeCaptureShadowRoots(win)` dentro de `injectCapture()`.
- `applyCaptureMetricOverrides(win, expectedSize)` queda detrás de `ENABLE_CAPTURE_METRIC_OVERRIDES = false`.
- Añadido un log diagnóstico mínimo antes de cargar `capture.js` con:
  - expected width/height
  - `window.innerWidth/innerHeight`
  - `document.documentElement.clientWidth/clientHeight`
  - `document.documentElement.scrollWidth/scrollHeight`
  - `devicePixelRatio`

## Qué se ha decidido no tocar

- No se rediseña la toolbar de html.to.design.
- No se añaden estilos propios sobre DOM generado por `capture.js`.
- No se añade funcionalidad de iframes en esta iteración.
- No se cambia el panel propio de selección de viewport.
- No se cambia el flujo de apertura de ventana dimensionada.
- No se cambia la URL de `capture.js` ni el uso del hash `figmacapture&figmadelay=1000`.

## Pasos manuales de QA

1. Ejecutar `node scripts/build-bookmarklet.cjs`.
2. Instalar o actualizar el bookmarklet con el contenido de `marcador-codigoJS`.
3. Abrir una web de prueba.
4. Lanzar el bookmarklet y confirmar que aparece el panel propio de selección de viewport.
5. Elegir `Desktop · 1440 × 900` y pulsar `Capturar`.
6. Confirmar que se abre una ventana emergente dimensionada.
7. Confirmar en consola el log `[html.to.design dimension picker] Capture diagnostics before capture.js`.
8. Confirmar que la UI de html.to.design conserva su diseño y posición original.
9. Confirmar que no aparece una barra blanca inferior causada por estilos propios del bookmarklet.
10. Confirmar que los controles `Copy to clipboard`, `Entire screen` y `Select element` siguen visibles y utilizables.
11. Repetir con `Viewport actual` para validar el flujo sin ventana emergente.

## Limitaciones conocidas

- El ajuste real del viewport sigue dependiendo de `window.open()` y `resizeBy()`, que algunos navegadores pueden limitar.
- Las métricas del viewport pueden diferir ligeramente por barras del navegador, zoom, DPR o políticas de resize de la ventana.
- Los overrides de métricas quedan desactivados por defecto; si en QA se detecta que la captura no usa el tamaño esperado, se puede probar temporalmente `ENABLE_CAPTURE_METRIC_OVERRIDES = true`, validando de nuevo que la toolbar original no se mueve ni se reestiliza.
- El flujo sigue cargando `capture.js` desde `https://mcp.figma.com/mcp/html-to-design/capture.js`, por lo que cambios externos en ese script pueden cambiar la UI observada.
