# html.to.design — dimension picker bookmarklet

Bookmarklet para capturar una web con **html.to.design** eligiendo antes el tamaño del viewport que quieres enviar a **Figma**.

El objetivo es poder traer una página como referencia en capas, desde el navegador, sin pedirle a un agente de IA que ejecute todo el flujo MCP ni gastar tokens en una captura que puedes lanzar manualmente.

Este proyecto parte del bookmarklet original de Raúl Marín y añade una capa de decisión previa orientada a diseño responsive: antes de lanzar la captura, permite elegir si quieres capturar la página con el viewport actual, con un preset o con unas dimensiones manuales.

## Qué problema resuelve

Cuando se usa html.to.design para traer una web a Figma, el resultado depende mucho del tamaño de la ventana desde la que se lanza la captura. Eso puede generar referencias poco útiles para diseño responsive: capturas con anchos accidentales, breakpoints mezclados o frames difíciles de comparar.

Este bookmarklet intenta resolver esa fricción concreta: **decidir el tamaño de captura antes de enviar la web a Figma**.

## Qué hace

Al ejecutar el marcador en una página, aparece un panel flotante con:

- Presets de viewport: actual, desktop, laptop, tablet y mobile.
- Campos manuales para ancho y alto.
- Validación básica de dimensiones.
- Apertura de una ventana de captura cuando el tamaño elegido no coincide con el viewport actual.
- Ajuste del tamaño real de esa ventana usando APIs del navegador como `window.open` y `resizeBy`.
- Detección común de documentos HTML embebidos en `iframe` y `object[type="text/html"]`.
- Captura top-level de URLs `http/https` accesibles y snapshots estáticos de `srcdoc` o `data:text/html`.
- Fallback de apertura para documentos cross-origin con URL útil.
- Extensión local opcional con captura visual de `iframe` cross-origin como una única imagen.
- Preparación automática de imágenes protegidas o cross-origin al capturar desde la extensión.
- Registro de métricas de diagnóstico en consola para revisar qué tamaño ve el navegador antes de cargar `capture.js`.
- Carga de `https://mcp.figma.com/mcp/html-to-design/capture.js` para continuar el flujo de html.to.design.
- Estilo visual tipo **SwiftUI Liquid Glass** para el selector, sin modificar la toolbar de html.to.design.

## Alcance técnico actual

La versión actual **abre una ventana dimensionada y registra métricas**, pero **no fuerza overrides de métricas por defecto**.

En el código fuente, `ENABLE_CAPTURE_METRIC_OVERRIDES` está desactivado (`false`). Esto significa que el bookmarklet no sobrescribe por defecto propiedades como `window.innerWidth`, `clientWidth` o `scrollWidth` para engañar a `capture.js`.

La decisión es intencional: forzar métricas del navegador puede ser frágil, afectar al layout real de la página o producir resultados difíciles de depurar. El comportamiento actual es más conservador y trazable: primero intenta conseguir el tamaño deseado mediante una ventana dimensionada y después registra métricas para verificar qué está viendo realmente el navegador.

## Qué no hace el bookmarklet por sí solo

- No tiene permisos especiales para saltarse restricciones de navegador, CSP, iframes o sandbox.
- No garantiza que todas las páginas se capturen exactamente con el ancho deseado.
- No sustituye a la extensión oficial de Figma.
- No ofrece selección granular visual de un elemento de la página como flujo propio.
- No mapea automáticamente componentes, estilos, variables o librerías de Figma.

## Comparativa con la extensión oficial de Figma

La extensión oficial de Figma está pensada como producto generalista para capturar webs reales desde Chrome y llevarlas a Figma como capas editables. Según su ficha pública, permite capturar una página completa o seleccionar elementos concretos, y pegar el resultado en Figma como capas editables en vez de screenshots.

Este bookmarklet tiene otro foco: no compite en robustez ni en integración oficial; añade una utilidad específica alrededor del flujo html.to.design para controlar mejor el tamaño de captura antes de lanzarla.

| Criterio | Extensión oficial de Figma | Este bookmarklet |
| --- | --- | --- |
| Tipo de solución | Extensión oficial de Chrome | Bookmarklet ejecutado desde un marcador |
| Soporte | Producto oficial de Figma | Proyecto experimental/no oficial |
| Captura de página completa | Sí | Sí, mediante `capture.js` |
| Captura de elemento concreto | Sí, como flujo propio de la extensión | No como selección visual propia |
| Capas editables en Figma | Sí | Sí, depende del flujo html.to.design/capture.js |
| Control previo de viewport | No es el foco documentado de la extensión | Sí: presets y dimensiones manuales antes de capturar |
| Ventana dimensionada | No es el valor principal comunicado | Sí, cuando el tamaño elegido no coincide con el viewport actual |
| Diagnóstico de métricas | No orientado al usuario final | Sí, logs de métricas en consola |
| Robustez ante restricciones del navegador | Mayor, por permisos de extensión | Menor, limitado por el contexto de la página |
| Instalación | Chrome Web Store | Marcador/bookmarklet |
| Valor principal | Captura oficial, integrada y más robusta | Captura responsive más controlada y hackable |

### Qué mejora este bookmarklet frente a la extensión oficial

- Permite decidir el tamaño de captura antes de lanzar html.to.design.
- Hace más explícito el trabajo con breakpoints: desktop, laptop, tablet, mobile o dimensiones manuales.
- Sirve mejor para benchmarks responsive donde interesa comparar una misma web en tamaños concretos.
- Es transparente y modificable: el flujo vive en un archivo JS legible y se puede auditar o adaptar.
- Registra métricas para depurar si el navegador está respetando o no el tamaño esperado.

### En qué es peor que la extensión oficial

- Es menos robusto porque no tiene permisos de extensión.
- Depende de que la página permita ejecutar scripts y abrir una ventana de captura.
- Puede fallar en páginas con CSP estricta, login, iframes cross-origin, sandbox, canvas o contenido muy dinámico.
- No tiene soporte oficial de Figma.
- No ofrece el mismo flujo de selección granular de elementos que comunica la extensión oficial.
- Depende de que `capture.js` y la toolbar de html.to.design mantengan comportamientos compatibles.

## Diferencia respecto al bookmarklet original de Raúl Marín

El bookmarklet original es una solución mínima y directa: ejecuta el flujo de html.to.design desde un marcador.

Esta versión conserva esa idea base, pero añade una capa previa de producto:

- Panel de selección de viewport.
- Presets responsive.
- Dimensiones manuales.
- Validación básica.
- Apertura de ventana dimensionada.
- Logs de diagnóstico.
- Tratamiento común de documentos HTML embebidos y casos no capturables.
- Documentación de limitaciones y decisiones técnicas.

La aportación no está en reemplazar el flujo original, sino en convertirlo en una herramienta más útil para análisis responsive, benchmarks y captura de referencias con un tamaño más controlado.

## Archivos principales

| Archivo | Para qué sirve |
| --- | --- |
| `src/bookmarklet.js` | Código fuente legible del bookmarklet. Aquí están la lógica del selector, la captura y los estilos. |
| `scripts/build-bookmarklet.cjs` | Genera el bookmarklet listo para pegar y la copia que usa la extensión. Preserva strings, HTML y CSS para no romper los textos del modal. |
| `marcador-codigoJS` | Código final para pegar como URL de un marcador. |
| `dist/bookmarklet.min.js` | Mismo output generado, dentro de `dist/`. |
| `extension/` | Extensión local de Chrome con icono propio y captura visual de `iframe` cross-origin. |
| `original/marcador-codigoJS` | Versión original simple, conservada como referencia. |
| `docs/decision-log.md` | Notas de decisiones del proyecto. |
| `.cursor/skills/` y `.cursor/rules/` | Instrucciones auxiliares para asistentes/IDE que trabajan con el flujo de Figma/html.to.design. |

## Uso rápido

La forma más cómoda para probar la última versión publicada en este repo es crear un marcador con este loader:

```javascript
javascript:(()=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/henriq-design/html-to-design-dimension-picker@main/src/bookmarklet.js';document.head.appendChild(s)})()
```

Si una página bloquea scripts externos por CSP, usa la versión autocontenida de `marcador-codigoJS`.

## Cómo crear el marcador

1. Crea un marcador nuevo en el navegador.
2. En el campo **URL**, pega el loader anterior o el contenido completo de `marcador-codigoJS`.
3. Entra en la página que quieres capturar.
4. Pulsa el marcador.
5. Elige el preset o introduce ancho/alto manualmente.
6. Pulsa **Capturar**.
7. Sigue la toolbar de html.to.design para copiar o enviar la captura a Figma.

## Extensión local de Chrome

La carpeta `extension` contiene una versión Manifest V3 que reutiliza el mismo selector, añade la acción **Capturar como imagen** para `iframe` cross-origin visibles y prepara las imágenes que html.to.design no puede descargar por CORS o autenticación. Usa únicamente los permisos `activeTab` y `scripting`; no solicita acceso permanente a todos los sitios. Las capturas se procesan localmente y el puente se elimina al terminar o al alcanzar su tiempo límite.

Para instalarla:

1. Abre `chrome://extensions`.
2. Activa **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida**.
4. Selecciona la carpeta `extension` del repositorio.
5. Fija **UI COPY4** desde el menú de extensiones.

También puedes abrirla con `Alt+Shift+U` o personalizar el atajo desde `chrome://extensions/shortcuts`.

Cuando cambie el código, ejecuta `node scripts/build-bookmarklet.cjs` y pulsa **Actualizar** en la tarjeta de la extensión.

## Flujo de captura

Si eliges el viewport actual, el bookmarklet lanza la captura en la pestaña activa. Si eliges otro tamaño, abre una ventana nueva con esas dimensiones y espera a que cargue.

Antes de inyectar `capture.js`, el bookmarklet:

- Ajusta el tamaño de la ventana usando `resizeBy` cuando el navegador lo permite.
- Registra métricas como `window.innerWidth`, `document.documentElement.clientWidth`, `document.documentElement.scrollWidth` y `window.devicePixelRatio`.
- Mantiene desactivados por defecto los overrides de métricas (`ENABLE_CAPTURE_METRIC_OVERRIDES = false`).
- Prepara el hash heredado de html.to.design mediante History API para evitar `hashchange` en SPAs compatibles, con fallback documentado a `location.hash`.
- Carga `https://mcp.figma.com/mcp/html-to-design/capture.js`.

Al usar la extensión, primero intenta incrustar cada imagen mediante una descarga autenticada. Si el servidor no permite leerla por CORS, desplaza temporalmente la página, recorta esa imagen desde la pestaña visible y vuelve a la posición inicial. Para presets o dimensiones distintas, transfiere las imágenes preparadas a la ventana responsive y vigila los nuevos renders de la página. La card y el resto del DOM siguen llegando como capas; solo el contenido de la imagen se rasteriza.

## Contenido embebido

El panel agrupa los casos especiales bajo `Contenido embebido` y muestra el tipo de elemento, fuente, dimensiones, estado y acción recomendada. Los elementos visibles y accionables se priorizan; los targets de 0/1 px, ocultos o transparentes quedan en un grupo técnico plegado.

Casos soportados:

- `iframe` accesible con `src` `http/https`: captura de su URL en una ventana top-level dedicada.
- `iframe` cross-origin con URL `http/https`: apertura como fallback para lanzar allí el bookmarklet manualmente.
- `iframe` cross-origin visible desde la extensión: recorte visual de la pestaña y captura como una única imagen.
- `iframe srcdoc`: snapshot estático top-level, priorizando el DOM renderizado actual.
- `object[type="text/html"]` con `data` `http/https`: captura por URL si es accesible y apertura como fallback si no lo es.
- `object[type="text/html"]` con `data:text/html`: snapshot estático para payload percent-encoded o base64.

Los snapshots inline conservan el DOM actual cuando Same-Origin Policy permite leerlo, valores de formulario, algunos canvas serializables, estilos y recursos resolubles mediante un `<base>`. Antes de abrir el snapshot se eliminan scripts, handlers inline, navegación automática, CSP declarada por meta y documentos embebidos anidados. `capture.js` solo se ejecuta en la ventana top-level reconstruida, nunca dentro del `iframe` u `object` original.

## Desarrollo

Edita el archivo fuente:

```bash
src/bookmarklet.js
```

Después genera los outputs:

```bash
node scripts/build-bookmarklet.cjs
```

El script actualiza:

```text
marcador-codigoJS
dist/bookmarklet.min.js
```

## Estilo visual

El selector usa una interpretación web de **SwiftUI Liquid Glass**:

- Material translúcido con `backdrop-filter`.
- Fondo lechoso para mantener contraste.
- Bordes ópticos suaves.
- Botones tipo cápsula.
- Acción principal con azul sistema accesible.
- Tipografía sobria y compacta.

La toolbar que monta `capture.js` (`Copy to clipboard`, `Entire screen`, `Select element`) conserva su estructura y estilos originales; el bookmarklet no inspecciona ni modifica su DOM.

## Limitaciones conocidas

- Algunas páginas pueden bloquear scripts externos con CSP.
- Same-Origin Policy y `sandbox` impiden leer el estado actual de algunos documentos. Si existe HTML inline original se usa como fallback estático; si solo existe una URL cross-origin, se ofrece apertura manual.
- La captura visual de la extensión solo incluye el área del `iframe` que cabe completamente en el viewport y genera una capa de imagen, no DOM editable.
- La recuperación visual puede omitir imágenes mayores que el viewport, ocultas, virtualizadas, tapadas por elementos flotantes o exclusivas de la vista responsive sin una URL equivalente en la página original.
- Los snapshots no reejecutan JavaScript de la aplicación embebida. Por ello custom elements, canvas con recursos cross-origin, vídeo, estado residente solo en memoria y documentos embebidos anidados pueden perder fidelidad.
- URLs `blob:`, `about:`, `javascript:` y objetos que no sean `text/html` no se tratan como targets capturables.
- El ajuste de dimensiones depende de APIs del navegador como `window.open`, `resizeBy` y acceso al documento de la ventana nueva.
- Algunos navegadores o configuraciones pueden bloquear ventanas emergentes o impedir el redimensionado exacto.
- El fallback a `location.hash` puede activar routing si History API está bloqueada o parcheada por la aplicación; el camino normal usa `history.replaceState` y restaura la URL tras cargar el script.
- Este repo no es un producto oficial de Figma ni de html.to.design; solo documenta y comparte un flujo práctico.

## Tokens: bookmarklet vs MCP

- Con el MCP (`generate_figma_design`, etc.), el asistente recibe instrucciones largas y suele hacer varias llamadas de polling, lo que consume tokens en el chat.
- Con este bookmarklet, tú disparas la captura en el navegador. Es útil para referencias e iteraciones rápidas sin pedirle al modelo que ejecute el flujo completo.

## Aviso

El flujo depende del servicio html.to.design de Figma y de tu cuenta/permisos. Úsalo para páginas que tengas permiso de capturar o para referencias propias.
