# Iframe diagnostics QA

## Matriz

| Caso probado | Resultado esperado | Resultado observado | Estado | Notas |
| --- | --- | --- | --- | --- |
| `no-iframes.html` | El panel abre y no muestra `Iframes detectados`. | No ejecutado en navegador real; el navegador integrado bloqueo la ejecucion de URLs `javascript:` como bookmarklet. | pending | Probar en Chrome con el bookmarklet actualizado. |
| `same-origin-iframe-parent.html` | El iframe aparece como `Capturable` y muestra `Capturar iframe`. | No ejecutado en navegador real; el navegador integrado bloqueo la ejecucion de URLs `javascript:` como bookmarklet. | pending | Al pulsar `Capturar iframe`, debe inyectar captura en el iframe, no en el padre. |
| `srcdoc-iframe.html` | Se clasifica segun accesibilidad real; si es accesible, aparece como `Capturable`. | No ejecutado en navegador real; el navegador integrado bloqueo la ejecucion de URLs `javascript:` como bookmarklet. | pending | `srcdoc` sin sandbox suele ser accesible desde el padre. |
| `sandboxed-iframe.html` | No se captura a ciegas; aparece bloqueado o sin accion de captura. | No ejecutado en navegador real; el navegador integrado bloqueo la ejecucion de URLs `javascript:` como bookmarklet. | pending | El fixture usa `sandbox` sin permisos. |
| `cross-origin-iframe.html` | No aparece como capturable; si tiene `https://example.com`, muestra `Abrir iframe`. | No ejecutado en navegador real; el navegador integrado bloqueo la ejecucion de URLs `javascript:` como bookmarklet. | pending | La carga externa puede depender de red, pero la clasificacion no debe ofrecer captura directa. |
| `iframe-without-src.html` | No muestra una accion inutil de captura o apertura. | No ejecutado en navegador real; el navegador integrado bloqueo la ejecucion de URLs `javascript:` como bookmarklet. | pending | El iframe esta vacio y sin URL propia. |
| URLs no razonables (`about:blank`, `data:`, `blob:`, `javascript:`) | No deben mostrar `Abrir iframe`; solo `http/https` son abribles. | Auditoria estatica: `isOpenableIframeSrc()` solo acepta `http:` y `https:`. | pass | Pendiente confirmar visualmente en Chrome si se anaden fixtures especificos. |
| Iframe sandboxed accesible sin `allow-scripts` | No debe mostrar `Capturar iframe`. | Auditoria estatica: si hay `sandbox` accesible sin `allow-scripts`, queda bloqueado. | pass | Evita inyectar `capture.js` donde el sandbox no ejecutaria scripts. |
| Regresion toolbar html.to.design | No existen estilos ni funciones propias sobre la toolbar de `capture.js`. | Busqueda estatica sin coincidencias. | pass | Validado con `rg` sobre fuente y outputs generados. |
| Build del bookmarklet | `marcador-codigoJS` y `dist/bookmarklet.min.js` se generan y coinciden. | `node scripts/build-bookmarklet.cjs` y `cmp` pasan. | pass | Ejecutado durante auditoria. |

## Validaciones tecnicas ejecutadas

```bash
node --check src/bookmarklet.js
node scripts/build-bookmarklet.cjs
cmp marcador-codigoJS dist/bookmarklet.min.js
rg -n "installCaptureToolbarStyles|findToolbarRoot|applyToolbarClass|h2d-capture-toolbar" src/bookmarklet.js marcador-codigoJS dist/bookmarklet.min.js
```

Resultado:

- `node --check` paso.
- `node scripts/build-bookmarklet.cjs` genero `dist/bookmarklet.min.js` y `marcador-codigoJS`.
- `cmp` paso sin diferencias.
- `rg` no encontro coincidencias para los estilos/funciones prohibidas de la toolbar.

## QA en navegador integrado

Se levanto un servidor local con:

```bash
python3 -m http.server 8080
```

El intento de ejecutar el bookmarklet como URL `javascript:` en el navegador integrado fue bloqueado por la politica de seguridad del navegador de pruebas. Por eso los casos visuales quedan como `pending` y deben validarse manualmente en Chrome.

## Instrucciones de QA manual en Chrome

1. Ejecutar desde la raiz del repo:

   ```bash
   python3 -m http.server 8080
   ```

2. Actualizar el bookmarklet guardado con el contenido de `marcador-codigoJS`.
3. Abrir cada fixture:
   - `http://127.0.0.1:8080/qa/fixtures/no-iframes.html`
   - `http://127.0.0.1:8080/qa/fixtures/same-origin-iframe-parent.html`
   - `http://127.0.0.1:8080/qa/fixtures/srcdoc-iframe.html`
   - `http://127.0.0.1:8080/qa/fixtures/sandboxed-iframe.html`
   - `http://127.0.0.1:8080/qa/fixtures/cross-origin-iframe.html`
   - `http://127.0.0.1:8080/qa/fixtures/iframe-without-src.html`
4. Lanzar el bookmarklet en cada pagina.
5. Confirmar visualmente los resultados esperados de la tabla.
6. En el fixture same-origin, pulsar `Capturar iframe` y confirmar que la captura se lanza sobre el contenido del iframe.
7. En el fixture cross-origin, pulsar `Abrir iframe` y confirmar que se abre una nueva pestana o ventana con `https://example.com`.
8. Confirmar que la toolbar de html.to.design conserva su UI original cuando aparezca.
