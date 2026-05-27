# Iframe capture audit

## Casos soportados

- El bookmarklet detecta iframes presentes en la página padre.
- Para cada iframe muestra nombre legible, tamaño visual, estado y acción disponible.
- Si el iframe es accesible desde la página padre, se puede usar `Capturar iframe`.
- Esa captura se inyecta en `iframe.contentWindow`, por lo que no captura la página padre.
- Si el iframe no es accesible pero tiene un `src` `http` o `https`, se puede usar `Abrir iframe` para abrir su URL en una nueva ventana o pestaña.
- Si el iframe está bloqueado y no hay una URL útil, el panel muestra un estado bloqueado y no lanza una captura a ciegas.

## Casos no soportados

- No hay captura universal de iframes cross-origin desde un bookmarklet.
- Same-Origin Policy impide leer o inyectar scripts en iframes de otro origen si el navegador no lo permite.
- `sandbox` puede bloquear acceso incluso cuando la URL parece cercana al origen de la página padre.
- `srcdoc` sin acceso directo ni URL propia no se puede abrir como página independiente.
- Abrir un `src` en otra pestaña no garantiza que funcione: la URL puede depender de sesión, estado del padre, cookies, headers, permisos o sandbox.
- URLs `about:blank`, `data:`, `blob:` y `javascript:` no se tratan como URLs razonables para abrir desde el panel.
- No se usa `postMessage` porque solo sirve si el iframe coopera y no controlamos el código embebido.

## Cómo probar iframe same-origin

1. Crear una página local o del mismo dominio con un iframe que apunte a otra ruta del mismo origen.
2. Lanzar el bookmarklet en la página padre.
3. Confirmar que aparece la sección `Iframes detectados`.
4. Confirmar que el iframe aparece como `Capturable`.
5. Pulsar `Capturar iframe`.
6. Confirmar que html.to.design se lanza dentro del contenido del iframe y no sobre la página padre.
7. Confirmar que la toolbar de html.to.design conserva su UI original.

## Cómo probar iframe cross-origin

1. Crear una página con un iframe que apunte a un dominio externo, por ejemplo una preview o una herramienta embebida.
2. Lanzar el bookmarklet en la página padre.
3. Confirmar que el iframe aparece como no accesible desde el bookmarklet.
4. Si tiene `src`, confirmar que aparece la acción `Abrir iframe`.
5. Pulsar `Abrir iframe` y comprobar que se abre una nueva ventana o pestaña con esa URL.
6. Ejecutar manualmente el bookmarklet en esa ventana si la página carga y permite ejecución.
7. Si no tiene URL útil, confirmar que aparece el estado bloqueado y no se lanza una captura en blanco.

## Alternativa para soporte robusto

Para soporte fiable en frames haría falta una extensión de navegador con permisos declarados e inyección controlada en frames. Una extensión puede pedir permisos de host, ejecutar scripts en subframes permitidos y manejar mejor casos con iframes, aunque seguirá estando limitada por políticas del navegador, sandbox, CSP y autenticación de cada servicio.
