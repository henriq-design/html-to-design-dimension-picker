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
- Registro de métricas de diagnóstico en consola para revisar qué tamaño ve el navegador antes de cargar `capture.js`.
- Carga de `https://mcp.figma.com/mcp/html-to-design/capture.js` para continuar el flujo de html.to.design.
- Estilo visual tipo **SwiftUI Liquid Glass** para el selector y para la toolbar secundaria de html.to.design, cuando esa toolbar existe en el DOM accesible.

## Alcance técnico actual

La versión actual **abre una ventana dimensionada y registra métricas**, pero **no fuerza overrides de métricas por defecto**.

En el código fuente, `ENABLE_CAPTURE_METRIC_OVERRIDES` está desactivado (`false`). Esto significa que el bookmarklet no sobrescribe por defecto propiedades como `window.innerWidth`, `clientWidth` o `scrollWidth` para engañar a `capture.js`.

La decisión es intencional: forzar métricas del navegador puede ser frágil, afectar al layout real de la página o producir resultados difíciles de depurar. El comportamiento actual es más conservador y trazable: primero intenta conseguir el tamaño deseado mediante una ventana dimensionada y después registra métricas para verificar qué está viendo realmente el navegador.

## Qué no hace

- No es una extensión de Chrome.
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
- Tratamiento más explícito de iframes y casos no capturables.
- Documentación de limitaciones y decisiones técnicas.

La aportación no está en reemplazar el flujo original, sino en convertirlo en una herramienta más útil para análisis responsive, benchmarks y captura de referencias con un tamaño más controlado.

## Archivos principales

| Archivo | Para qué sirve |
| --- | --- |
| `src/bookmarklet.js` | Código fuente legible del bookmarklet. Aquí están la lógica del selector, la captura y los estilos. |
| `scripts/build-bookmarklet.cjs` | Genera el bookmarklet listo para pegar en el navegador. Preserva strings, HTML y CSS para no romper los textos del modal. |
| `marcador-codigoJS` | Código final para pegar como URL de un marcador. |
| `dist/bookmarklet.min.js` | Mismo output generado, dentro de `dist/`. |
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

## Flujo de captura

Si eliges el viewport actual, el bookmarklet lanza la captura en la pestaña activa.

Si eliges otro tamaño, abre una ventana nueva con esas dimensiones y espera a que cargue. Antes de inyectar `capture.js`, el bookmarklet:

- Ajusta el tamaño de la ventana usando `resizeBy` cuando el navegador lo permite.
- Registra métricas como `window.innerWidth`, `document.documentElement.clientWidth`, `document.documentElement.scrollWidth` y `window.devicePixelRatio`.
- No sobrescribe métricas clave por defecto.
- Carga `https://mcp.figma.com/mcp/html-to-design/capture.js`.
- Aplica estilos glass a la toolbar secundaria que crea html.to.design cuando aparece.

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

También se intenta aplicar el mismo lenguaje visual a la toolbar que monta `capture.js` (`Copy to clipboard`, `Entire screen`, `Select element`). Esta parte depende de que esa toolbar exista en el DOM accesible de la página.

## Limitaciones conocidas

- Algunas páginas pueden bloquear scripts externos con CSP.
- Sitios con iframes, login, canvas o contenido muy dinámico pueden no capturarse bien.
- El ajuste de dimensiones depende de APIs del navegador como `window.open`, `resizeBy` y acceso al documento de la ventana nueva.
- Algunos navegadores o configuraciones pueden bloquear ventanas emergentes o impedir el redimensionado exacto.
- Si html.to.design cambia los textos o estructura de su toolbar, el override visual de esa toolbar puede dejar de aplicarse.
- Este repo no es un producto oficial de Figma ni de html.to.design; solo documenta y comparte un flujo práctico.

## Tokens: bookmarklet vs MCP

- Con el MCP (`generate_figma_design`, etc.), el asistente recibe instrucciones largas y suele hacer varias llamadas de polling, lo que consume tokens en el chat.
- Con este bookmarklet, tú disparas la captura en el navegador. Es útil para referencias e iteraciones rápidas sin pedirle al modelo que ejecute el flujo completo.

## Aviso

El flujo depende del servicio html.to.design de Figma y de tu cuenta/permisos. Úsalo para páginas que tengas permiso de capturar o para referencias propias.
