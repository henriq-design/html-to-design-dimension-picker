# Embedded documents diagnostics QA

Este archivo conserva la ruta histórica de QA de iframe, ampliada al modelo común de documentos HTML embebidos.

## Matriz

| Caso probado | Resultado esperado | Resultado observado | Estado | Notas |
| --- | --- | --- | --- | --- |
| `no-iframes.html` | El panel abre y no muestra `Contenido embebido`. | Chromium: sección ausente; captura actual y popup 1440 × 900 conservan la página correcta. | pass | La ausencia de targets no altera los dos flujos de página actual. |
| `same-origin-iframe-parent.html` | Muestra `iframe · URL`, `Capturable por URL` y `Capturar contenido`. | Chromium: clasificación correcta; popup final en `same-origin-iframe-child.html`. | pass | El stub recibió primero hash vacío y después `#figmacapture&figmadelay=1000`. |
| `srcdoc-iframe.html` | Muestra `iframe · srcdoc` y `Snapshot capturable`. | Chromium: snapshot blob top-level conservó heading e input mutados en el DOM. | pass | `window.__srcdocApplicationExecuted` no existía en el snapshot: el script no se reejecutó. |
| `sandboxed-iframe.html` | Muestra un snapshot estático capturable sin ejecutar scripts del contenido. | Chromium: popup blob con marcador `static-sanitized` y contenido sandboxed correcto. | pass | Se reconstruyó desde el `srcdoc` original, sin inyección en el subframe. |
| `cross-origin-iframe.html` | Muestra `Abrir documento`, nunca captura directa. | Chromium: `iframe · URL`, estado de apertura y ningún botón de captura. | pass | La carga externa puede fallar sin alterar la clasificación. |
| `iframe-without-src.html` | Queda bloqueado sin acción inútil. | Chromium: estado `Bloqueado`, `sin fuente útil` y sin botón. | pass | `about:blank` vacío no es un target útil. |
| `object-data-html.html` | Prioriza el `object HTML · HTML inline`; el iframe de 1 px queda en el grupo técnico. | Chromium: object visible primero; iframe técnico plegado; popup muestra la tarjeta azul, no el padre. | pass | El SVG relativo cargó con `naturalWidth = 160`; el script inline no se reejecutó. |
| `object-data-html-base64.html` | Decodifica UTF-8 base64 y ofrece snapshot. | Chromium: popup conservó raya larga y `ñ`, con ambos hashes observados por el stub. | pass | Decodificación y estrategia inline comunes. |
| `object-same-origin-parent.html` | Clasifica el object como capturable por URL y abre el hijo top-level. | Chromium: popup final en `object-same-origin-child.html` con marcador `same-origin-object`. | pass | Conserva la estrategia histórica por URL. |
| `object-cross-origin.html` | Ofrece solo apertura fallback. | Chromium: estado `Abrir en nueva ventana` y botón `Abrir documento`, sin captura. | pass | Same-Origin Policy impide automatizar la captura. |
| `spa-hash-sensitive.html` | Iniciar captura no dispara `hashchange`, no cambia el contenido y restaura la URL. | Chromium: `hashchangeCount = 0`, contenido intacto y URL final igual a la inicial. | pass | El stub confirmó que la segunda ejecución ve el hash requerido. |
| Objetos no HTML | No aparecen en la lista de targets. | Auditoría estática: el selector filtra `object[type]` por valor exacto `text/html`. | pass | PDF, imagen y SVG quedan fuera. |
| `data:text/html` percent/base64 | Ambos formatos se decodifican mediante la misma función. | Auditoría estática sobre `decodeDataHtmlUrl()`. | pass | Un payload inválido queda bloqueado. |
| Regresión de carga infinita en subframes | `capture.js` no se inyecta dentro de `contentWindow` de un target. | Auditoría estática: `injectCapture()` exige top-level; las dos estrategias abren ventana dedicada. | pass | No existe handler separado de iframe/object. |
| Regresión toolbar html.to.design | No existen estilos ni funciones propias sobre la toolbar de `capture.js`. | Chromium con `capture.js` real: toolbar oscura original, controles visibles y captura a portapapeles operativa. | pass | Sin estilos propios; `ENABLE_CAPTURE_METRIC_OVERRIDES = false`. |
| Build del bookmarklet | Fuente válida y outputs generados idénticos. | `node --check`, build, `cmp` y `git diff --check` terminaron correctamente. | pass | Ejecutado el 3 de septiembre de 2026. |

## QA por HTTP

Los fixtures deben servirse desde la raíz del repositorio, nunca mediante `file://`:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Rutas principales:

```text
http://127.0.0.1:8080/qa/fixtures/object-data-html.html
http://127.0.0.1:8080/qa/fixtures/object-data-html-base64.html
http://127.0.0.1:8080/qa/fixtures/object-same-origin-parent.html
http://127.0.0.1:8080/qa/fixtures/object-cross-origin.html
http://127.0.0.1:8080/qa/fixtures/srcdoc-iframe.html
http://127.0.0.1:8080/qa/fixtures/spa-hash-sensitive.html
```

Las comprobaciones automatizadas sustituyeron inicialmente la respuesta de `capture.js` por un stub local para observar el contexto top-level, el hash visible al ejecutar el script y la restauración de URL. Después se repitieron los flujos principales con el `capture.js` externo real y permisos de portapapeles en el origen local.

## QA manual con `capture.js` real

Ejecutado en Chromium headed el 3 de septiembre de 2026:

- `spa-hash-sensitive.html`: apareció la toolbar original con `Copiar al portapapeles`, `Pantalla completa` y `Seleccionar elemento`; `hashchangeCount` permaneció en `0`, el contenido no cambió y la URL final se restauró. El portapapeles recibió un item `text/html` de 6683 bytes.
- `object-data-html.html`: el popup top-level mostró la tarjeta azul y el recurso SVG; el portapapeles recibió `text/html` de 12439 bytes. El payload `figh2d` decodificado tenía título `Documento inline percent-encoded`, root `HTML` de 626 px, contenía `Documento embebido azul` y no contenía `Página padre rosa`. El script inline no se reejecutó.
- `srcdoc-iframe.html`: tras mutar heading e input dentro del iframe, el popup y el payload real conservaron `Contenido srcdoc mutado real` y `Estado real mutado`; no apareció el texto del padre ni se reejecutó el script original. El payload decodificado tenía 6255 bytes.

No se observaron warnings ni errores de `capture.js` en los popups inline. El único error visto en la SPA fue el `404` irrelevante de `favicon.ico` del servidor estático.

## Validaciones técnicas ejecutadas

```bash
node --check src/bookmarklet.js
node scripts/build-bookmarklet.cjs
cmp marcador-codigoJS dist/bookmarklet.min.js
git diff --check
```

También se verificó mediante búsquedas estáticas que:

- no existen `installCaptureToolbarStyles`, `findToolbarRoot`, `applyToolbarClass`, `h2d-capture-toolbar` ni `exposeCaptureShadowRoots`;
- `ENABLE_CAPTURE_METRIC_OVERRIDES = false`;
- solo existe `scanCaptureTargets()` como escáner de documentos embebidos;
- no hay una llamada a `injectCapture()` con `contentWindow`, `contentDocument` o una ventana embebida;
- ambos outputs generados contienen `scanCaptureTargets`, `capture-inline` y los textos del nuevo panel.
