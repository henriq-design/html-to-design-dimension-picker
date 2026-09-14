# Captura de documentos HTML embebidos

## Diagnóstico confirmado

La implementación anterior solo buscaba `iframe` mediante `scanIframes()`. La clasificación, los textos, los botones y los handlers usaban conceptos específicos de iframe. Un `object[type="text/html"]` con `data:text/html` no entraba en ese flujo y la acción principal seguía apuntando a la página padre.

La historia del repositorio confirma además una regresión anterior: ejecutar `capture.js` directamente sobre `iframe.contentWindow` dejaba la captura en carga infinita. La promoción de URLs a una ventana top-level era correcta, pero no existía una estrategia equivalente para contenido inline sin URL `http/https`.

## Modelo común

`scanCaptureTargets()` consulta candidatos `iframe` y `object[type="text/html"]`, y `classifyCaptureTarget()` produce una única estructura con:

- `kind`: `iframe` u `object`;
- `sourceMode`: `url`, `inline-html`, `srcdoc` o `none`;
- dimensiones y visibilidad reales;
- acceso al documento y origen inferido;
- `sandbox` cuando aplica;
- `recommendedAction`: `capture-url`, `capture-inline`, `open-url` o `blocked`;
- motivo diagnóstico y referencia al elemento.

Los targets visibles se muestran primero. Los elementos de 0/1 px, `display:none`, `visibility:hidden`, `opacity:0` o sin cajas visuales se agrupan como contenido técnico plegado.

## Estrategias top-level

### URL `http/https`

Un documento accesible se abre con su propia URL en una ventana dimensionada. `capture.js` se inyecta allí una vez que la ventana ha cargado. Un documento cross-origin o bloqueado por sandbox conserva únicamente la acción de apertura cuando su URL es útil.

No se eleva automáticamente una URL accesible que perdería restricciones declaradas por un `sandbox` sin `allow-scripts`; queda bloqueada con un motivo explícito.

### HTML inline

Para `srcdoc` y `data:text/html` se crea un snapshot HTML:

1. Se usa el documento renderizado actual si es accesible; en caso contrario se decodifica el HTML original. Se aceptan `data:text/html` percent-encoded y base64 UTF-8.
2. Se clona el documento y se preservan valores actuales de `input`, `textarea`, `option`, `details` y canvas serializables.
3. Se eliminan `script`, handlers `on*`, URLs `javascript:`, refresh/CSP por meta, preloads y documentos `iframe`/`object`/`embed` anidados.
4. Se inserta un `<base>` basado en el `<base>` original, el `baseURI` accesible o la URL del documento padre.
5. El HTML sanitizado se convierte en una URL `blob:` y se abre en una ventana top-level dedicada; solo allí se carga `capture.js`.

El snapshot es deliberadamente estático. Evita reejecutar la aplicación embebida y reduce el riesgo de dar al HTML inline privilegios del documento padre. A cambio, custom elements, canvas tainted, vídeo, contenido anidado y estado que no esté reflejado en el DOM pueden perder fidelidad.

## SPA y hash de captura

El `capture.js` servido el 3 de septiembre de 2026 lee `window.location.hash` sincrónicamente durante su ejecución mediante una función interna y arranca el flujo cuando empieza por `#figmacapture`. No depende de un evento `hashchange` para descubrir la configuración.

El bookmarklet encapsula esta preparación en `setCaptureHashWithoutNavigation()`:

- conserva URL, título y `history.state`;
- usa `history.replaceState` con la URL absoluta actual y `#figmacapture&figmadelay=1000`, para que un `<base>` no cambie la ruta;
- carga la segunda instancia heredada de `capture.js`;
- restaura la URL original en `load` o `error`, también mediante `replaceState`.

History API no dispara `hashchange` ni navegación por sí misma. Si `replaceState` falla, se mantiene el fallback heredado `location.hash`; ese camino sí puede activar un router y queda advertido en consola. Una SPA también podría parchear `replaceState` y reaccionar por cuenta propia, algo que un bookmarklet genérico no puede impedir.

## Límites del navegador

- Same-Origin Policy puede impedir leer el DOM actual de un documento por URL.
- Un `data:` opaco puede impedir leer `contentDocument`; en ese caso solo se conserva el HTML inline original.
- Abrir una URL no garantiza conservar sesión, estado del padre, headers o permisos.
- `blob:`, `about:`, `javascript:` y objetos que no declaren `type="text/html"` no se promueven ni decodifican.
- El bookmarklet no puede leer contenido cross-origin no cooperativo.

## Captura visual desde la extensión

La extensión local añade un fallback rasterizado para targets cross-origin visibles:

1. El selector se ejecuta en el contexto principal de la página para mantener compatible la carga de `capture.js`.
2. Un puente aislado y de un solo uso solicita a Chrome una captura de la pestaña mediante `activeTab`.
3. El selector coloca el target completo dentro del viewport y recorta su rectángulo teniendo en cuenta la escala real de la captura.
4. El recorte se abre como un snapshot top-level con las dimensiones CSS originales.
5. `capture.js` procesa ese snapshot como una única imagen.

Este camino no inspecciona ni reconstruye el DOM interno del `iframe`. Está pensado para conservar con fidelidad visual widgets como reCAPTCHA, mapas, vídeos o pasarelas externas sin pedir permisos permanentes de host.
