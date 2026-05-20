# html.to.design — dimension picker bookmarklet

Bookmarklet para capturar una web con **html.to.design** eligiendo antes el tamaño del viewport que quieres enviar a **Figma**.

El objetivo es poder traer una página como referencia en capas, desde el navegador, sin pedirle a un agente de IA que ejecute todo el flujo MCP ni gastar tokens en una captura que puedes lanzar manualmente.

## Qué hace

Al ejecutar el marcador en una página, aparece un panel flotante con:

- Presets de viewport: actual, desktop, laptop, tablet y mobile.
- Campos manuales para ancho y alto.
- Validación básica de dimensiones.
- Apertura de una ventana de captura cuando el tamaño elegido no coincide con el viewport actual.
- Ajustes de métricas del documento antes de cargar `capture.js`, para que html.to.design lea el tamaño elegido y no el ancho real del layout.
- Logs de diagnóstico en consola para revisar qué tamaño ve el navegador antes de la captura.
- Estilo visual tipo **SwiftUI Liquid Glass** para el selector y para la toolbar secundaria de html.to.design.

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

- Ajusta el viewport real con `resizeBy`.
- Registra métricas como `window.innerWidth`, `document.documentElement.clientWidth`, `document.documentElement.scrollWidth` y `window.devicePixelRatio`.
- Sobrescribe métricas clave (`innerWidth`, `clientWidth`, `scrollWidth`, etc.) para que `capture.js` use el tamaño elegido.
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
- Si html.to.design cambia los textos o estructura de su toolbar, el override visual de esa toolbar puede dejar de aplicarse.
- Este repo no es un producto oficial de Figma ni de html.to.design; solo documenta y comparte un flujo práctico.

## Tokens: bookmarklet vs MCP

- Con el MCP (`generate_figma_design`, etc.), el asistente recibe instrucciones largas y suele hacer varias llamadas de polling, lo que consume tokens en el chat.
- Con este bookmarklet, tú disparas la captura en el navegador. Es útil para referencias e iteraciones rápidas sin pedirle al modelo que ejecute el flujo completo.

## Aviso

El flujo depende del servicio html.to.design de Figma y de tu cuenta/permisos. Úsalo para páginas que tengas permiso de capturar o para referencias propias.
