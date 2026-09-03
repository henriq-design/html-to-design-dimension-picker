(function () {
    const ROOT_ID = 'h2d-dimension-picker-root';
    const CAPTURE_SCRIPT_URL = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
    const CAPTURE_HASH = 'figmacapture&figmadelay=1000';
    const ENABLE_CAPTURE_METRIC_OVERRIDES = false;
  
    if (document.getElementById(ROOT_ID)) {
      document.getElementById(ROOT_ID).remove();
      return;
    }
  
    const currentViewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
  
    const presets = [
      {
        id: 'current',
        label: `Viewport actual · ${currentViewport.width} × ${currentViewport.height}`,
        width: currentViewport.width,
        height: currentViewport.height
      },
      {
        id: 'desktop',
        label: 'Desktop · 1440 × 900',
        width: 1440,
        height: 900
      },
      {
        id: 'laptop',
        label: 'Laptop · 1366 × 768',
        width: 1366,
        height: 768
      },
      {
        id: 'tablet',
        label: 'Tablet · 768 × 1024',
        width: 768,
        height: 1024
      },
      {
        id: 'mobile',
        label: 'Mobile · 390 × 844',
        width: 390,
        height: 844
      }
    ];

    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, function (character) {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[character];
      });
    }

    function getAbsoluteUrl(value, baseUrl) {
      if (!value) {
        return '';
      }

      try {
        return new URL(value, baseUrl || window.location.href).href;
      } catch (error) {
        return value;
      }
    }

    function getHostname(value) {
      if (!value) {
        return '';
      }

      try {
        return new URL(value, window.location.href).hostname;
      } catch (error) {
        return '';
      }
    }

    function inferSameOrigin(value) {
      if (!value) {
        return null;
      }

      try {
        const url = new URL(value, window.location.href);

        if (
          url.protocol === 'about:' ||
          url.protocol === 'blob:' ||
          url.protocol === 'data:' ||
          url.protocol === 'javascript:'
        ) {
          return null;
        }

        return url.origin === window.location.origin;
      } catch (error) {
        return null;
      }
    }

    function getUrlProtocol(value) {
      if (!value) {
        return '';
      }

      try {
        return new URL(value, window.location.href).protocol;
      } catch (error) {
        return '';
      }
    }

    function isHttpUrl(value) {
      const protocol = getUrlProtocol(value);

      return protocol === 'http:' || protocol === 'https:';
    }

    function isTopLevelWindow(win) {
      try {
        return win.self === win.top;
      } catch (error) {
        return false;
      }
    }

    function hasSandboxToken(sandbox, token) {
      return (` ${sandbox} `).includes(` ${token} `);
    }

    function getAccessibleEmbeddedDocument(element) {
      try {
        const embeddedWindow = element.contentWindow || null;
        const embeddedDocument =
          element.contentDocument ||
          (embeddedWindow ? embeddedWindow.document : null);

        if (embeddedDocument && embeddedDocument.documentElement) {
          return embeddedDocument;
        }
      } catch (error) {
        // Los documentos cross-origin o con sandbox pueden lanzar una excepción.
      }

      return null;
    }

    function hasEmbeddedDocumentContent(embeddedDocument) {
      try {
        const body = embeddedDocument.body;

        return Boolean(
          body &&
            (body.children.length > 0 || (body.textContent || '').trim())
        );
      } catch (error) {
        return false;
      }
    }

    function decodeDataHtmlUrl(value) {
      if (!value || !/^data:text\/html(?:;[^,]*)?,/i.test(value)) {
        return null;
      }

      const commaIndex = value.indexOf(',');
      const metadata = value.slice(0, commaIndex);
      const payload = value.slice(commaIndex + 1);

      try {
        if (/;base64(?:;|$)/i.test(metadata)) {
          const binary = window.atob(payload.replace(/\s/g, ''));
          const bytes = new Uint8Array(binary.length);

          for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
          }

          if (typeof window.TextDecoder === 'function') {
            return new window.TextDecoder('utf-8').decode(bytes);
          }

          return decodeURIComponent(
            Array.prototype.map
              .call(bytes, function (byte) {
                return `%${byte.toString(16).padStart(2, '0')}`;
              })
              .join('')
          );
        }

        return decodeURIComponent(payload);
      } catch (error) {
        return null;
      }
    }

    function getTargetSource(element, kind) {
      if (kind === 'iframe' && element.hasAttribute('srcdoc')) {
        return {
          sourceMode: 'srcdoc',
          inlineHtml: element.getAttribute('srcdoc') || '',
          rawSource: element.getAttribute('srcdoc') || '',
          url: ''
        };
      }

      const rawSource =
        kind === 'iframe'
          ? element.getAttribute('src') || ''
          : element.getAttribute('data') || '';
      const inlineHtml = decodeDataHtmlUrl(rawSource);

      if (inlineHtml !== null) {
        return {
          sourceMode: 'inline-html',
          inlineHtml: inlineHtml,
          rawSource: rawSource,
          url: getAbsoluteUrl(rawSource)
        };
      }

      const url = getAbsoluteUrl(
        rawSource ||
          (kind === 'iframe' ? element.src || '' : element.data || '')
      );

      if (isHttpUrl(url)) {
        return {
          sourceMode: 'url',
          inlineHtml: '',
          rawSource: rawSource,
          url: url
        };
      }

      return {
        sourceMode: 'none',
        inlineHtml: '',
        rawSource: rawSource,
        url: url
      };
    }

    function getTargetVisibility(element, rect) {
      try {
        const style = window.getComputedStyle(element);

        return Boolean(
          rect.width > 1 &&
            rect.height > 1 &&
            element.getClientRects().length &&
            !element.hidden &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.visibility !== 'collapse' &&
            Number(style.opacity) !== 0
        );
      } catch (error) {
        return rect.width > 1 && rect.height > 1;
      }
    }

    function classifyCaptureTarget(element, index) {
      const kind = element.tagName.toLowerCase();
      const source = getTargetSource(element, kind);
      const rect = element.getBoundingClientRect();
      const sandbox =
        kind === 'iframe' && element.hasAttribute('sandbox')
          ? element.getAttribute('sandbox') || 'sandbox'
          : '';
      const embeddedDocument = getAccessibleEmbeddedDocument(element);
      const canAccessDocument = Boolean(embeddedDocument);
      const hasDocumentContent =
        canAccessDocument && hasEmbeddedDocumentContent(embeddedDocument);
      const hasInlineSource = Boolean((source.inlineHtml || '').trim());
      let sameOrigin = inferSameOrigin(source.url);
      let recommendedAction = 'blocked';
      let reason = 'No hay una fuente HTML capturable para este elemento.';

      if (source.sourceMode === 'url') {
        if (
          canAccessDocument &&
          sandbox &&
          !hasSandboxToken(sandbox, 'allow-scripts')
        ) {
          reason =
            'El documento es accesible, pero elevar su URL eliminaría restricciones del sandbox.';
        } else if (canAccessDocument) {
          sameOrigin = sameOrigin === null ? true : sameOrigin;
          recommendedAction = 'capture-url';
          reason =
            'Documento accesible con URL propia; se capturará en una ventana dedicada.';
        } else {
          recommendedAction = 'open-url';
          reason =
            'No accesible por origen o sandbox; se puede abrir su URL como fallback.';
        }
      } else if (
        (source.sourceMode === 'srcdoc' || source.sourceMode === 'inline-html') &&
        (hasDocumentContent || hasInlineSource)
      ) {
        recommendedAction = 'capture-inline';
        reason = canAccessDocument
          ? 'Se reconstruirá un snapshot estático del DOM actual en una ventana dedicada.'
          : 'Se reconstruirá un snapshot estático desde el HTML inline original.';
      } else if (source.rawSource) {
        reason =
          'La fuente no es una URL http/https ni HTML inline data:text/html válido.';
      }

      return {
        id: `capture-target-${index}`,
        index: index,
        kind: kind,
        title: element.getAttribute('title') || '',
        name: element.getAttribute('name') || '',
        sourceMode: source.sourceMode,
        rawSource: source.rawSource,
        url: source.url,
        inlineHtml: source.inlineHtml,
        baseUrl: document.baseURI || window.location.href,
        visualWidth: Math.round(rect.width),
        visualHeight: Math.round(rect.height),
        isVisible: getTargetVisibility(element, rect),
        sandbox: sandbox,
        canAccessDocument: canAccessDocument,
        sameOrigin: sameOrigin,
        recommendedAction: recommendedAction,
        reason: reason,
        element: element
      };
    }

    function scanCaptureTargets() {
      const candidates = Array.prototype.slice
        .call(document.querySelectorAll('iframe, object[type]'))
        .filter(function (element) {
          return (
            element.tagName.toLowerCase() === 'iframe' ||
            (element.getAttribute('type') || '').trim().toLowerCase() ===
              'text/html'
          );
        });

      return candidates
        .map(classifyCaptureTarget)
        .sort(function (left, right) {
          function priority(target) {
            const hiddenPenalty = target.isVisible ? 0 : 2;
            const blockedPenalty =
              target.recommendedAction === 'blocked' ? 1 : 0;

            return hiddenPenalty + blockedPenalty;
          }

          return priority(left) - priority(right) || left.index - right.index;
        });
    }

    function getCaptureTargetLabel(info) {
      return (
        info.title ||
        info.name ||
        getHostname(info.url) ||
        `${info.kind === 'iframe' ? 'Iframe' : 'Object HTML'} ${info.index + 1}`
      );
    }

    function getCaptureTargetExpectedSize(info) {
      const embeddedDocument = getAccessibleEmbeddedDocument(info.element);

      try {
        const embeddedWindow = embeddedDocument && embeddedDocument.defaultView;

        return {
          width:
            (embeddedWindow && embeddedWindow.innerWidth) ||
            (info.visualWidth > 1 ? info.visualWidth : 800),
          height:
            (embeddedWindow && embeddedWindow.innerHeight) ||
            (info.visualHeight > 1 ? info.visualHeight : 600)
        };
      } catch (error) {
        return {
          width: info.visualWidth > 1 ? info.visualWidth : 800,
          height: info.visualHeight > 1 ? info.visualHeight : 600
        };
      }
    }
  
    function getCaptureDiagnostics(win, expectedSize) {
      return {
        expectedWidth: expectedSize ? expectedSize.width : undefined,
        expectedHeight: expectedSize ? expectedSize.height : undefined,
        'window.innerWidth': win.innerWidth,
        'window.innerHeight': win.innerHeight,
        'document.documentElement.clientWidth': win.document.documentElement.clientWidth,
        'document.documentElement.clientHeight': win.document.documentElement.clientHeight,
        'document.documentElement.scrollWidth': win.document.documentElement.scrollWidth,
        'document.documentElement.scrollHeight': win.document.documentElement.scrollHeight,
        'window.devicePixelRatio': win.devicePixelRatio
      };
    }

    function logCaptureDiagnostics(win, expectedSize, label) {
      const diagnostics = getCaptureDiagnostics(win, expectedSize);

      win.console.group(`[html.to.design dimension picker] ${label}`);
      win.console.table(diagnostics);
      win.console.groupEnd();
    }

    function resizeViewportTo(win, width, height, onDone) {
      let attempts = 0;
      const maxAttempts = 10;

      function tick() {
        const widthDelta = width - win.innerWidth;
        const heightDelta = height - win.innerHeight;

        if (
          (Math.abs(widthDelta) <= 1 && Math.abs(heightDelta) <= 1) ||
          attempts >= maxAttempts
        ) {
          onDone();
          return;
        }

        attempts += 1;
        win.resizeBy(widthDelta, heightDelta);
        win.setTimeout(tick, 120);
      }

      tick();
    }

    function applyCaptureMetricOverrides(win, expectedSize) {
      if (!expectedSize || win.__h2dMetricOverridesApplied) {
        return;
      }

      const doc = win.document;
      const width = expectedSize.width;
      const height = expectedSize.height;

      function defineMetric(target, property, value) {
        if (!target) {
          return;
        }

        try {
          Object.defineProperty(target, property, {
            configurable: true,
            get: function () {
              return value;
            }
          });
        } catch (error) {
          win.console.warn(
            `[html.to.design dimension picker] No se pudo fijar ${property}.`,
            error
          );
        }
      }

      defineMetric(win, 'innerWidth', width);
      defineMetric(win, 'innerHeight', height);

      defineMetric(doc.documentElement, 'clientWidth', width);
      defineMetric(doc.documentElement, 'clientHeight', height);
      defineMetric(doc.documentElement, 'scrollWidth', width);
      defineMetric(doc.documentElement, 'scrollHeight', height);

      defineMetric(doc.body, 'clientWidth', width);
      defineMetric(doc.body, 'clientHeight', height);
      defineMetric(doc.body, 'scrollWidth', width);
      defineMetric(doc.body, 'scrollHeight', height);

      win.__h2dMetricOverridesApplied = true;
    }

    function setCaptureHashWithoutNavigation(win) {
      const originalUrl = win.location.href;
      const originalState = win.history.state;
      const originalTitle = win.document.title;
      const captureUrl = `${originalUrl.replace(/#.*$/, '')}#${CAPTURE_HASH}`;

      try {
        win.history.replaceState(
          originalState,
          originalTitle,
          captureUrl
        );

        return function restoreCaptureUrl() {
          try {
            win.history.replaceState(originalState, originalTitle, originalUrl);
          } catch (error) {
            win.console.warn(
              '[html.to.design dimension picker] No se pudo restaurar la URL tras preparar capture.js.',
              error
            );
          }
        };
      } catch (error) {
        win.console.warn(
          '[html.to.design dimension picker] History API no disponible; se usa location.hash como fallback y la SPA podría reaccionar.',
          error
        );
        win.location.hash = CAPTURE_HASH;
        return null;
      }
    }

    function injectCapture(targetWindow, expectedSize) {
      const win = targetWindow || window;
      const doc = win.document;

      if (!isTopLevelWindow(win)) {
        win.console.warn(
          '[html.to.design dimension picker] Captura cancelada: capture.js puede quedarse cargando dentro de documentos embebidos. Abre el target como ventana superior.'
        );
        return;
      }
  
      function appendCaptureScript(onSettled) {
        logCaptureDiagnostics(win, expectedSize, 'Capture diagnostics before capture.js');

        if (ENABLE_CAPTURE_METRIC_OVERRIDES) {
          applyCaptureMetricOverrides(win, expectedSize);
        }

        const script = doc.createElement('script');
        script.src = CAPTURE_SCRIPT_URL;
        script.async = true;

        if (onSettled) {
          script.addEventListener('load', onSettled, { once: true });
          script.addEventListener('error', onSettled, { once: true });
        }

        doc.head.appendChild(script);
      }
  
      appendCaptureScript();
  
      win.setTimeout(function () {
        const restoreCaptureUrl = setCaptureHashWithoutNavigation(win);
        appendCaptureScript(restoreCaptureUrl);
      }, 500);
    }

    function preserveDynamicSnapshotState(sourceRoot, clonedRoot) {
      const sourceFields = sourceRoot.querySelectorAll(
        'input, textarea, option, details'
      );
      const clonedFields = clonedRoot.querySelectorAll(
        'input, textarea, option, details'
      );

      sourceFields.forEach(function (sourceField, index) {
        const clonedField = clonedFields[index];

        if (!clonedField) {
          return;
        }

        if (sourceField.tagName === 'INPUT') {
          clonedField.setAttribute('value', sourceField.value || '');

          if (sourceField.checked) {
            clonedField.setAttribute('checked', '');
          } else {
            clonedField.removeAttribute('checked');
          }
        } else if (sourceField.tagName === 'TEXTAREA') {
          clonedField.textContent = sourceField.value || '';
        } else if (sourceField.tagName === 'OPTION') {
          if (sourceField.selected) {
            clonedField.setAttribute('selected', '');
          } else {
            clonedField.removeAttribute('selected');
          }
        } else if (sourceField.tagName === 'DETAILS') {
          if (sourceField.open) {
            clonedField.setAttribute('open', '');
          } else {
            clonedField.removeAttribute('open');
          }
        }
      });

      const sourceCanvases = sourceRoot.querySelectorAll('canvas');
      const clonedCanvases = clonedRoot.querySelectorAll('canvas');

      sourceCanvases.forEach(function (sourceCanvas, index) {
        const clonedCanvas = clonedCanvases[index];

        if (!clonedCanvas) {
          return;
        }

        try {
          const image = clonedCanvas.ownerDocument.createElement('img');
          image.src = sourceCanvas.toDataURL();
          image.className = clonedCanvas.className;
          image.setAttribute('style', clonedCanvas.getAttribute('style') || '');
          image.width = sourceCanvas.width;
          image.height = sourceCanvas.height;
          clonedCanvas.replaceWith(image);
        } catch (error) {
          // A canvas con recursos cross-origin no se puede serializar con toDataURL.
        }
      });
    }

    function getSnapshotBaseUrl(info, sourceDocument) {
      const baseElement = sourceDocument.querySelector('base[href]');

      if (baseElement) {
        const resolvedBase = getAbsoluteUrl(
          baseElement.getAttribute('href') || '',
          info.baseUrl
        );

        if (isHttpUrl(resolvedBase)) {
          return resolvedBase;
        }
      }

      if (isHttpUrl(sourceDocument.baseURI)) {
        return sourceDocument.baseURI;
      }

      return info.baseUrl;
    }

    function sanitizeSnapshotDocument(sourceDocument, info) {
      const clonedRoot = sourceDocument.documentElement.cloneNode(true);
      const baseUrl = getSnapshotBaseUrl(info, sourceDocument);

      preserveDynamicSnapshotState(sourceDocument.documentElement, clonedRoot);

      clonedRoot
        .querySelectorAll(
          'script, iframe, object, embed, meta[http-equiv="refresh" i], meta[http-equiv="content-security-policy" i], link[rel="modulepreload" i], link[rel="preload" i], link[rel="prefetch" i]'
        )
        .forEach(function (node) {
          node.remove();
        });

      clonedRoot.querySelectorAll('*').forEach(function (node) {
        Array.prototype.slice.call(node.attributes).forEach(function (attribute) {
          const attributeName = attribute.name.toLowerCase();
          const attributeValue = (attribute.value || '').trim();

          if (
            attributeName.indexOf('on') === 0 ||
            ((attributeName === 'href' ||
              attributeName === 'xlink:href' ||
              attributeName === 'action' ||
              attributeName === 'formaction') &&
              /^javascript:/i.test(attributeValue))
          ) {
            node.removeAttribute(attribute.name);
          }
        });
      });

      clonedRoot.querySelectorAll('base').forEach(function (node) {
        node.remove();
      });

      let head = clonedRoot.querySelector('head');

      if (!head) {
        head = clonedRoot.ownerDocument.createElement('head');
        clonedRoot.insertBefore(head, clonedRoot.firstChild);
      }

      const base = clonedRoot.ownerDocument.createElement('base');
      base.href = baseUrl;
      head.insertBefore(base, head.firstChild);

      const marker = clonedRoot.ownerDocument.createElement('meta');
      marker.name = 'h2d-snapshot-mode';
      marker.content = 'static-sanitized';
      head.insertBefore(marker, base.nextSibling);

      return `<!doctype html>\n${clonedRoot.outerHTML}`;
    }

    function createInlineSnapshot(info) {
      let sourceDocument = getAccessibleEmbeddedDocument(info.element);

      if (!sourceDocument && info.inlineHtml) {
        sourceDocument = new window.DOMParser().parseFromString(
          info.inlineHtml,
          'text/html'
        );
      }

      if (!sourceDocument || !sourceDocument.documentElement) {
        return '';
      }

      return sanitizeSnapshotDocument(sourceDocument, info);
    }

    function waitForCaptureWindow(captureWindow, width, height, messages) {
      let attempts = 0;
      const maxAttempts = 40;

      const interval = window.setInterval(function () {
        attempts += 1;

        try {
          if (
            captureWindow.document &&
            captureWindow.document.readyState === 'complete'
          ) {
            window.clearInterval(interval);
            captureWindow.focus();

            resizeViewportTo(captureWindow, width, height, function () {
              captureWindow.setTimeout(function () {
                injectCapture(captureWindow, { width: width, height: height });
              }, 500);
            });
          }
        } catch (error) {
          window.clearInterval(interval);
          window.alert(messages.inaccessible);
        }

        if (attempts >= maxAttempts) {
          window.clearInterval(interval);
          window.alert(messages.timeout);
        }
      }, 250);
    }

    function openUrlSizedCapture(url, width, height) {
      const captureWindow = window.open(
        url,
        `h2d-target-capture-${Date.now()}`,
        [
          `width=${width}`,
          `height=${height}`,
          'left=0',
          'top=0',
          'resizable=yes',
          'scrollbars=yes',
          'noopener=no'
        ].join(',')
      );

      if (!captureWindow) {
        window.alert(
          'El navegador ha bloqueado la ventana de captura. Abre el documento en una nueva ventana y lanza allí el bookmarklet.'
        );
        return;
      }

      waitForCaptureWindow(captureWindow, width, height, {
        inaccessible:
          'El documento se abrió, pero ya no es accesible para captura automática. Lanza el bookmarklet manualmente en esa ventana si la página lo permite.',
        timeout:
          'El documento está tardando demasiado en cargar. Lanza el bookmarklet manualmente en la ventana abierta cuando termine.'
      });
    }

    function openInlineSizedCapture(snapshotHtml, width, height) {
      const snapshotUrl = window.URL.createObjectURL(
        new window.Blob([snapshotHtml], { type: 'text/html;charset=utf-8' })
      );
      const captureWindow = window.open(
        snapshotUrl,
        `h2d-inline-capture-${Date.now()}`,
        [
          `width=${width}`,
          `height=${height}`,
          'left=0',
          'top=0',
          'resizable=yes',
          'scrollbars=yes',
          'noopener=no'
        ].join(',')
      );

      if (!captureWindow) {
        window.URL.revokeObjectURL(snapshotUrl);
        window.alert(
          'El navegador ha bloqueado la ventana del snapshot. Permite popups y vuelve a intentarlo.'
        );
        return;
      }

      captureWindow.addEventListener(
        'load',
        function () {
          window.setTimeout(function () {
            window.URL.revokeObjectURL(snapshotUrl);
          }, 60000);
        },
        { once: true }
      );

      waitForCaptureWindow(captureWindow, width, height, {
        inaccessible:
          'El snapshot se abrió, pero dejó de ser accesible para la captura automática.',
        timeout:
          'El snapshot está tardando demasiado en cargar sus recursos visuales.'
      });
    }
  
    function openSizedCapture(width, height) {
      const captureWindow = window.open(
        window.location.href,
        `h2d-capture-${Date.now()}`,
        [
          `width=${width}`,
          `height=${height}`,
          'left=0',
          'top=0',
          'resizable=yes',
          'scrollbars=yes',
          'noopener=no'
        ].join(',')
      );
  
      if (!captureWindow) {
        window.alert(
          'El navegador ha bloqueado la ventana de captura. Permite popups o usa la opción “Viewport actual”.'
        );
        return;
      }
  
      let attempts = 0;
      const maxAttempts = 40;
  
      const interval = window.setInterval(function () {
        attempts += 1;
  
        try {
          if (
            captureWindow.document &&
            captureWindow.document.readyState === 'complete'
          ) {
            window.clearInterval(interval);
  
            captureWindow.focus();
  
            resizeViewportTo(captureWindow, width, height, function () {
              captureWindow.setTimeout(function () {
                injectCapture(captureWindow, { width: width, height: height });
              }, 500);
            });
          }
        } catch (error) {
          window.clearInterval(interval);
          window.alert(
            'No se pudo acceder a la ventana dimensionada. Prueba con el viewport actual o con DevTools responsive mode.'
          );
        }
  
        if (attempts >= maxAttempts) {
          window.clearInterval(interval);
          window.alert(
            'La página está tardando demasiado en cargar. Prueba de nuevo cuando termine la carga.'
          );
        }
      }, 250);
    }
  
    function createPanel() {
      const host = document.createElement('div');
      host.id = ROOT_ID;
      host.style.position = 'fixed';
      host.style.top = '0';
      host.style.left = '0';
      host.style.zIndex = '2147483647';
  
      const shadow = host.attachShadow({ mode: 'open' });
      const captureTargets = scanCaptureTargets();
      const visibleTargets = captureTargets.filter(function (info) {
        return info.isVisible;
      });
      const technicalTargets = captureTargets.filter(function (info) {
        return !info.isVisible;
      });

      function getCaptureTargetStatusLabel(info) {
        if (info.recommendedAction === 'capture-url') {
          return 'Capturable por URL';
        }

        if (info.recommendedAction === 'capture-inline') {
          return 'Snapshot capturable';
        }

        if (info.recommendedAction === 'open-url') {
          return 'Abrir en nueva ventana';
        }

        return 'Bloqueado';
      }

      function renderCaptureTargetAction(info) {
        if (
          info.recommendedAction === 'capture-url' ||
          info.recommendedAction === 'capture-inline'
        ) {
          return `
            <button class="target-action" type="button" data-target-action="capture" data-target-id="${info.id}">
              Capturar contenido
            </button>
          `;
        }

        if (info.recommendedAction === 'open-url') {
          return `
            <button class="target-action" type="button" data-target-action="open" data-target-id="${info.id}">
              Abrir documento
            </button>
          `;
        }

        return '';
      }

      function renderCaptureTargetInfo(info) {
        const label = getCaptureTargetLabel(info);
        const sandboxLabel = info.sandbox
          ? ` · sandbox: ${info.sandbox}`
          : '';
        const kindLabel = info.kind === 'iframe' ? 'iframe' : 'object HTML';
        const sourceLabel =
          info.sourceMode === 'srcdoc'
            ? 'srcdoc'
            : info.sourceMode === 'inline-html'
              ? 'HTML inline'
              : info.sourceMode === 'url'
                ? 'URL'
                : 'sin fuente útil';

        return `
          <article class="target-item">
            <div class="target-topline">
              <strong title="${escapeHtml(label)}">${escapeHtml(label)}</strong>
              <span>${escapeHtml(getCaptureTargetStatusLabel(info))}</span>
            </div>
            <div class="target-meta">
              ${escapeHtml(kindLabel)} · ${escapeHtml(sourceLabel)} · ${info.visualWidth} × ${info.visualHeight}${escapeHtml(sandboxLabel)}
            </div>
            <div class="target-reason">${escapeHtml(info.reason)}</div>
            ${renderCaptureTargetAction(info)}
          </article>
        `;
      }

      function renderCaptureTargetSection() {
        if (!captureTargets.length) {
          return '';
        }

        return `
          <section class="target-section" aria-labelledby="h2d-targets-title">
            <h3 id="h2d-targets-title">Contenido embebido</h3>
            <div class="target-list">
              ${visibleTargets.map(renderCaptureTargetInfo).join('')}
            </div>
            ${
              technicalTargets.length
                ? `
                  <details class="technical-targets">
                    <summary>${technicalTargets.length} elemento${technicalTargets.length === 1 ? '' : 's'} oculto${technicalTargets.length === 1 ? '' : 's'} o técnico${technicalTargets.length === 1 ? '' : 's'}</summary>
                    <div class="target-list target-list-technical">
                      ${technicalTargets.map(renderCaptureTargetInfo).join('')}
                    </div>
                  </details>
                `
                : ''
            }
          </section>
        `;
      }
  
      shadow.innerHTML = `
        <style>
          :host {
            all: initial;
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }
  
          .panel {
            position: fixed;
            top: 16px;
            right: 16px;
            width: 336px;
            padding: 18px;
            box-sizing: border-box;
            color: #111827;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(246, 248, 252, 0.68)),
              rgba(246, 248, 252, 0.62);
            border: 1px solid rgba(255, 255, 255, 0.78);
            border-radius: 26px;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.92),
              inset 0 -1px 0 rgba(148, 163, 184, 0.18),
              0 18px 55px rgba(15, 23, 42, 0.18);
            backdrop-filter: blur(24px) saturate(180%) brightness(1.04);
            -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.04);
            isolation: isolate;
            overflow: hidden;
          }

          .panel::before {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background:
              linear-gradient(145deg, rgba(255, 255, 255, 0.72), transparent 28%),
              radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.5), transparent 24%),
              radial-gradient(circle at 0% 100%, rgba(125, 211, 252, 0.16), transparent 30%);
            opacity: 0.7;
            z-index: -1;
          }

          .panel::after {
            content: "";
            position: absolute;
            inset: 1px;
            border-radius: 25px;
            pointer-events: none;
            background:
              linear-gradient(135deg, rgba(255, 255, 255, 0.72), transparent 22%, transparent 74%, rgba(255, 255, 255, 0.34)),
              linear-gradient(90deg, rgba(255, 70, 150, 0.05), transparent 24%, transparent 76%, rgba(56, 189, 248, 0.08));
            opacity: 0.6;
            mask-image: linear-gradient(#000, transparent 44%, transparent 74%, #000);
            -webkit-mask-image: linear-gradient(#000, transparent 44%, transparent 74%, #000);
          }
  
          .header {
            position: relative;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 16px;
          }
  
          h2 {
            margin: 0;
            color: #0f172a;
            font-size: 17px;
            line-height: 24px;
            font-weight: 700;
            letter-spacing: 0;
          }
  
          p {
            margin: 3px 0 0;
            color: #475569;
            font-size: 13px;
            line-height: 18px;
            font-weight: 450;
          }

          h3 {
            margin: 0 0 8px;
            color: #0f172a;
            font-size: 13px;
            line-height: 18px;
            font-weight: 700;
            letter-spacing: 0;
          }
  
          button,
          select,
          input {
            font: inherit;
            box-sizing: border-box;
          }
  
          label {
            position: relative;
            display: block;
            margin: 10px 0 6px;
            color: #334155;
            font-size: 12px;
            line-height: 16px;
            font-weight: 600;
          }
  
          select,
          input {
            position: relative;
            width: 100%;
            min-height: 40px;
            padding: 9px 12px;
            color: #0f172a;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.54)),
              rgba(255, 255, 255, 0.46);
            border: 1px solid rgba(148, 163, 184, 0.26);
            border-radius: 16px;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.9),
              0 1px 2px rgba(15, 23, 42, 0.06);
            outline: none;
            backdrop-filter: blur(18px) saturate(160%);
            -webkit-backdrop-filter: blur(18px) saturate(160%);
          }

          select {
            color-scheme: light;
          }
  
          select:focus,
          input:focus {
            border-color: rgba(0, 122, 255, 0.62);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.92),
              0 0 0 3px rgba(0, 122, 255, 0.14),
              0 10px 26px rgba(15, 23, 42, 0.08);
          }

          select:hover,
          input:hover {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.58)),
              rgba(255, 255, 255, 0.54);
            border-color: rgba(148, 163, 184, 0.34);
          }
  
          .grid {
            position: relative;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
  
          .actions {
            position: relative;
            display: flex;
            gap: 10px;
            margin-top: 18px;
          }
  
          .button {
            min-height: 40px;
            padding: 9px 13px;
            border: 1px solid rgba(148, 163, 184, 0.22);
            border-radius: 999px;
            cursor: pointer;
            font-weight: 650;
            backdrop-filter: blur(18px) saturate(160%);
            -webkit-backdrop-filter: blur(18px) saturate(160%);
            transition:
              transform 140ms ease,
              border-color 120ms ease,
              background 120ms ease,
              box-shadow 120ms ease;
          }

          .button:hover {
            transform: translateY(-1px);
          }

          .button:active {
            transform: translateY(0);
          }
  
          .button-primary {
            flex: 1;
            color: #fff;
            background:
              linear-gradient(180deg, rgba(0, 122, 255, 0.92), rgba(0, 95, 220, 0.9)),
              #006ee6;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.36),
              0 10px 24px rgba(0, 122, 255, 0.24);
          }

          .button-primary:hover {
            border-color: rgba(255, 255, 255, 0.42);
            background:
              linear-gradient(180deg, rgba(36, 145, 255, 0.96), rgba(0, 100, 230, 0.92)),
              #006ee6;
          }
  
          .button-secondary {
            color: #334155;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.5)),
              rgba(255, 255, 255, 0.44);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.84),
              0 8px 20px rgba(15, 23, 42, 0.06);
          }

          .button-secondary:hover {
            border-color: rgba(148, 163, 184, 0.32);
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.56)),
              rgba(255, 255, 255, 0.5);
          }
  
          .button-icon {
            width: 34px;
            height: 34px;
            padding: 0;
            color: #475569;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.76), rgba(255, 255, 255, 0.42)),
              rgba(255, 255, 255, 0.36);
            border: 1px solid rgba(148, 163, 184, 0.22);
            border-radius: 999px;
            cursor: pointer;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.82),
              0 6px 18px rgba(15, 23, 42, 0.06);
            backdrop-filter: blur(18px) saturate(160%);
            -webkit-backdrop-filter: blur(18px) saturate(160%);
            transition:
              background 120ms ease,
              border-color 120ms ease;
          }

          .button-icon:hover {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.52)),
              rgba(255, 255, 255, 0.5);
            border-color: rgba(148, 163, 184, 0.32);
          }

          .target-section {
            position: relative;
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid rgba(148, 163, 184, 0.22);
          }

          .target-list {
            display: grid;
            gap: 8px;
            max-height: 178px;
            overflow: auto;
            padding-right: 2px;
          }

          .target-item {
            padding: 10px;
            color: #334155;
            background: rgba(255, 255, 255, 0.38);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 14px;
          }

          .target-topline {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            color: #0f172a;
            font-size: 12px;
            line-height: 16px;
          }

          .target-topline strong {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .target-topline span {
            flex: 0 0 auto;
            color: #475569;
            font-size: 11px;
            font-weight: 650;
          }

          .target-meta,
          .target-reason {
            margin-top: 4px;
            color: #64748b;
            font-size: 11px;
            line-height: 15px;
          }

          .target-action {
            width: 100%;
            min-height: 32px;
            margin-top: 8px;
            padding: 6px 10px;
            color: #334155;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.5)),
              rgba(255, 255, 255, 0.44);
            border: 1px solid rgba(148, 163, 184, 0.22);
            border-radius: 999px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 650;
          }

          .target-action:hover {
            border-color: rgba(148, 163, 184, 0.32);
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.56)),
              rgba(255, 255, 255, 0.5);
          }

          .technical-targets {
            margin-top: 8px;
            color: #64748b;
            font-size: 11px;
            line-height: 15px;
          }

          .technical-targets summary {
            cursor: pointer;
          }

          .target-list-technical {
            margin-top: 8px;
          }
  
          .hint {
            position: relative;
            margin-top: 12px;
            color: #64748b;
            font-size: 11px;
            line-height: 15px;
          }
        </style>
  
        <section class="panel" role="dialog" aria-labelledby="h2d-title">
          <div class="header">
            <div>
              <h2 id="h2d-title">Capturar viewport</h2>
              <p>Elige el tamaño que se enviará a Figma</p>
            </div>
  
            <button class="button-icon" type="button" data-action="close" aria-label="Cerrar">
              ×
            </button>
          </div>
  
          <label for="preset">Preset</label>
          <select id="preset">
            ${presets
              .map(function (preset, index) {
                return `<option value="${index}">${preset.label}</option>`;
              })
              .join('')}
          </select>
  
          <div class="grid">
            <div>
              <label for="width">Ancho</label>
              <input id="width" type="number" min="320" max="3840" step="1" inputmode="numeric" />
            </div>
  
            <div>
              <label for="height">Alto</label>
              <input id="height" type="number" min="320" max="3000" step="1" inputmode="numeric" />
            </div>
          </div>
  
          <div class="actions">
            <button class="button button-secondary" type="button" data-action="close">
              Cancelar
            </button>
  
            <button class="button button-primary" type="button" data-action="capture">
              Capturar
            </button>
          </div>

          ${renderCaptureTargetSection()}
  
          <div class="hint">
            Si eliges otro tamaño, se abrirá una ventana de captura con ese viewport.
          </div>
        </section>
      `;
  
      document.documentElement.appendChild(host);
  
      const presetSelect = shadow.getElementById('preset');
      const widthInput = shadow.getElementById('width');
      const heightInput = shadow.getElementById('height');
      const captureButton = shadow.querySelector('[data-action="capture"]');
      const closeButtons = shadow.querySelectorAll('[data-action="close"]');
      const targetButtons = shadow.querySelectorAll('[data-target-action]');
  
      function closePanel() {
        host.remove();
        document.removeEventListener('keydown', handleEscape);
      }
  
      function applyPreset() {
        const selectedPreset = presets[Number(presetSelect.value)];
  
        widthInput.value = selectedPreset.width;
        heightInput.value = selectedPreset.height;
      }
  
      function handleCapture() {
        const width = Number(widthInput.value);
        const height = Number(heightInput.value);
  
        if (!Number.isFinite(width) || !Number.isFinite(height)) {
          window.alert('Introduce dimensiones numéricas válidas.');
          return;
        }
  
        if (width < 320 || height < 320) {
          window.alert('Usa un ancho y alto mínimos de 320 px.');
          return;
        }
  
        if (width > 3840 || height > 3000) {
          window.alert('Las dimensiones son demasiado grandes para este bookmarklet.');
          return;
        }
  
        closePanel();
  
        const shouldCaptureCurrentViewport =
          width === window.innerWidth && height === window.innerHeight;
  
        if (shouldCaptureCurrentViewport) {
          injectCapture(window, { width: width, height: height });
          return;
        }
  
        openSizedCapture(width, height);
      }

      function getCaptureTargetFromButton(button) {
        const targetId = button.getAttribute('data-target-id');

        return captureTargets.find(function (info) {
          return info.id === targetId;
        });
      }

      function captureEmbeddedTarget(info) {
        const expectedSize = getCaptureTargetExpectedSize(info);

        if (info.recommendedAction === 'capture-url') {
          closePanel();
          openUrlSizedCapture(
            info.url,
            expectedSize.width,
            expectedSize.height
          );
          return;
        }

        if (info.recommendedAction === 'capture-inline') {
          const snapshotHtml = createInlineSnapshot(info);

          if (!snapshotHtml) {
            window.alert(
              'El contenido inline ya no está disponible para reconstruir el snapshot.'
            );
            return;
          }

          closePanel();
          openInlineSizedCapture(
            snapshotHtml,
            expectedSize.width,
            expectedSize.height
          );
        }
      }

      function openEmbeddedTarget(info) {
        const openedWindow = window.open(info.url, '_blank', 'noopener,noreferrer');

        if (!openedWindow) {
          window.alert(
            'El navegador ha bloqueado la nueva ventana. Abre manualmente la URL del documento si está disponible.'
          );
        }
      }

      function handleCaptureTargetAction(event) {
        const button = event.currentTarget;
        const info = getCaptureTargetFromButton(button);

        if (!info) {
          return;
        }

        if (button.getAttribute('data-target-action') === 'capture') {
          captureEmbeddedTarget(info);
          return;
        }

        if (button.getAttribute('data-target-action') === 'open') {
          openEmbeddedTarget(info);
        }
      }
  
      function handleEscape(event) {
        if (event.key === 'Escape') {
          closePanel();
        }
      }
  
      presetSelect.addEventListener('change', applyPreset);
      captureButton.addEventListener('click', handleCapture);
  
      closeButtons.forEach(function (button) {
        button.addEventListener('click', closePanel);
      });

      targetButtons.forEach(function (button) {
        button.addEventListener('click', handleCaptureTargetAction);
      });
  
      document.addEventListener('keydown', handleEscape);
  
      applyPreset();
      presetSelect.focus();
    }
  
    createPanel();
  })();
