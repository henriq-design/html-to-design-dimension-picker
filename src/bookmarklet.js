(function () {
    const ROOT_ID = 'h2d-dimension-picker-root';
    const CAPTURE_SCRIPT_URL = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
    const CAPTURE_HASH = 'figmacapture&figmadelay=1000';
    const ENABLE_CAPTURE_METRIC_OVERRIDES = false;

    function getExtensionCaptureToken() {
      return document.documentElement.getAttribute(
        'data-h2d-extension-capture-token'
      );
    }

    function hasExtensionCaptureApi() {
      return Boolean(getExtensionCaptureToken());
    }
  
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

    function waitForPagePaint() {
      return new Promise(function (resolve) {
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            window.setTimeout(resolve, 80);
          });
        });
      });
    }

    function getVisibleTargetRect(element) {
      const rect = element.getBoundingClientRect();
      const tolerance = 1;

      if (rect.width <= 1 || rect.height <= 1) {
        throw new Error('El contenido embebido no tiene un tamaño visible.');
      }

      if (
        rect.width > window.innerWidth + tolerance ||
        rect.height > window.innerHeight + tolerance
      ) {
        throw new Error(
          'El contenido embebido es mayor que el viewport. Reduce el zoom o amplía la ventana para verlo completo.'
        );
      }

      if (
        rect.left < -tolerance ||
        rect.top < -tolerance ||
        rect.right > window.innerWidth + tolerance ||
        rect.bottom > window.innerHeight + tolerance
      ) {
        throw new Error(
          'No se ha podido colocar todo el contenido embebido dentro del viewport.'
        );
      }

      return rect;
    }

    function requestVisibleTabCapture() {
      return new Promise(function (resolve, reject) {
        const token = getExtensionCaptureToken();

        if (!token) {
          reject(
            new Error(
              'La captura visual solo está disponible desde la extensión de Chrome.'
            )
          );
          return;
        }

        const requestId = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;
        const requestEvent = `h2d:capture-request:${token}`;
        const responseEvent = `h2d:capture-response:${token}`;
        let timeoutId = null;

        function cleanup() {
          document.removeEventListener(responseEvent, handleResponse);

          if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
          }
        }

        function handleResponse(event) {
          const response = event.detail;

          if (!response || response.requestId !== requestId) {
            return;
          }

          cleanup();

          if (!response.ok || !response.dataUrl) {
            reject(
              new Error(
                response.error ||
                  'Chrome no ha podido capturar la pestaña visible.'
              )
            );
            return;
          }

          resolve(response.dataUrl);
        }

        document.addEventListener(responseEvent, handleResponse);

        timeoutId = window.setTimeout(function () {
          cleanup();
          reject(
            new Error('La extensión ha tardado demasiado en responder.')
          );
        }, 10000);

        document.dispatchEvent(
          new CustomEvent(requestEvent, {
            detail: { requestId: requestId }
          })
        );
      });
    }

    function closeVisibleTabCaptureBridge() {
      const token = getExtensionCaptureToken();

      if (!token) {
        return;
      }

      document.dispatchEvent(
        new CustomEvent(`h2d:capture-close:${token}`)
      );
    }

    function wait(milliseconds) {
      return new Promise(function (resolve) {
        window.setTimeout(resolve, milliseconds);
      });
    }

    function blobToDataUrl(blob) {
      return new Promise(function (resolve, reject) {
        const reader = new FileReader();

        reader.addEventListener('load', function () {
          resolve(String(reader.result || ''));
        });
        reader.addEventListener('error', function () {
          reject(new Error('No se ha podido convertir la imagen descargada.'));
        });
        reader.readAsDataURL(blob);
      });
    }

    async function fetchImageAsDataUrl(source) {
      const response = await window.fetch(source, {
        credentials: 'include',
        cache: 'force-cache'
      });

      if (!response.ok) {
        throw new Error(`La imagen ha respondido con ${response.status}.`);
      }

      const blob = await response.blob();

      if (blob.type && !blob.type.startsWith('image/')) {
        throw new Error('El recurso descargado no es una imagen.');
      }

      return blobToDataUrl(blob);
    }

    function getPageImageSource(image) {
      return image.currentSrc || image.src || '';
    }

    function getPageImageSources(image) {
      return Array.from(
        new Set([image.currentSrc || '', image.src || ''].filter(Boolean))
      );
    }

    function getPageImagesForPreparation() {
      return Array.from(document.images).filter(function (image) {
        if (!image.isConnected || image.closest(`#${ROOT_ID}`)) {
          return false;
        }

        const rect = image.getBoundingClientRect();
        const source = getPageImageSource(image);

        return (
          getTargetVisibility(image, rect) &&
          /^https?:\/\//i.test(source)
        );
      });
    }

    function getImageContentRect(image) {
      const rect = image.getBoundingClientRect();
      const style = window.getComputedStyle(image);
      const insetLeft =
        parseFloat(style.borderLeftWidth || '0') +
        parseFloat(style.paddingLeft || '0');
      const insetRight =
        parseFloat(style.borderRightWidth || '0') +
        parseFloat(style.paddingRight || '0');
      const insetTop =
        parseFloat(style.borderTopWidth || '0') +
        parseFloat(style.paddingTop || '0');
      const insetBottom =
        parseFloat(style.borderBottomWidth || '0') +
        parseFloat(style.paddingBottom || '0');

      return {
        left: rect.left + insetLeft,
        top: rect.top + insetTop,
        right: rect.right - insetRight,
        bottom: rect.bottom - insetBottom,
        width: Math.max(1, rect.width - insetLeft - insetRight),
        height: Math.max(1, rect.height - insetTop - insetBottom)
      };
    }

    function isRectFullyVisible(rect) {
      const tolerance = 1;

      return (
        rect.left >= -tolerance &&
        rect.top >= -tolerance &&
        rect.right <= window.innerWidth + tolerance &&
        rect.bottom <= window.innerHeight + tolerance
      );
    }

    async function replaceImageSource(image, dataUrl) {
      const picture =
        image.parentElement && image.parentElement.tagName === 'PICTURE'
          ? image.parentElement
          : null;

      if (picture) {
        picture.querySelectorAll('source').forEach(function (source) {
          source.removeAttribute('srcset');
        });
      }

      image.removeAttribute('srcset');
      image.src = dataUrl;

      if (typeof image.decode === 'function') {
        try {
          await image.decode();
        } catch (error) {
          // La captura visual sigue siendo utilizable aunque decode no esté disponible.
        }
      }
    }

    async function waitForImageReady(image) {
      if (image.complete && image.naturalWidth > 0) {
        return;
      }

      await Promise.race([
        new Promise(function (resolve) {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        }),
        wait(1200)
      ]);
    }

    async function preparePageImagesForCapture() {
      if (!hasExtensionCaptureApi()) {
        return {
          prepared: 0,
          rasterized: 0,
          unresolved: 0,
          replacements: []
        };
      }

      const images = getPageImagesForPreparation();
      const sourcesByImage = new Map(
        images.map(function (image) {
          return [image, getPageImageSources(image)];
        })
      );
      const originalScroll = { x: window.scrollX, y: window.scrollY };
      const sourceResults = new Map();
      const replacements = new Map();
      let prepared = 0;
      let rasterized = 0;
      let lastScreenshotAt = 0;

      function registerReplacement(image, dataUrl) {
        (sourcesByImage.get(image) || []).forEach(function (source) {
          replacements.set(source, dataUrl);
        });
      }

      try {
        const uniqueSources = Array.from(
          new Set(images.map(getPageImageSource).filter(Boolean))
        );

        await Promise.all(
          uniqueSources.map(async function (source) {
            try {
              sourceResults.set(source, await fetchImageAsDataUrl(source));
            } catch (error) {
              sourceResults.set(source, '');
            }
          })
        );

        for (const image of images) {
          const dataUrl = sourceResults.get(getPageImageSource(image));

          if (dataUrl) {
            registerReplacement(image, dataUrl);
            await replaceImageSource(image, dataUrl);
            prepared += 1;
          }
        }

        let pending = images.filter(function (image) {
          return /^https?:\/\//i.test(getPageImageSource(image));
        });

        while (pending.length > 0) {
          const target = pending[0];

          if (!target.isConnected) {
            pending.shift();
            continue;
          }

          target.scrollIntoView({
            block: 'center',
            inline: 'center',
            behavior: 'instant'
          });
          await waitForPagePaint();
          await waitForImageReady(target);
          await waitForPagePaint();

          const visibleImages = pending.filter(function (image) {
            return image.isConnected && isRectFullyVisible(getImageContentRect(image));
          });

          if (visibleImages.length === 0) {
            pending.shift();
            continue;
          }

          const elapsed = Date.now() - lastScreenshotAt;

          if (elapsed < 600) {
            await wait(600 - elapsed);
          }

          const screenshot = await requestVisibleTabCapture();
          lastScreenshotAt = Date.now();

          for (const image of visibleImages) {
            const rect = getImageContentRect(image);
            const crop = await cropVisibleTabCapture(screenshot, rect);

            registerReplacement(image, crop.dataUrl);
            await replaceImageSource(image, crop.dataUrl);
            rasterized += 1;
          }

          pending = pending.filter(function (image) {
            return !visibleImages.includes(image);
          });
        }
      } finally {
        window.scrollTo({
          left: originalScroll.x,
          top: originalScroll.y,
          behavior: 'instant'
        });
        await waitForPagePaint();
        closeVisibleTabCaptureBridge();
      }

      return {
        prepared: prepared,
        rasterized: rasterized,
        unresolved: images.length - prepared - rasterized,
        replacements: Array.from(replacements.entries())
      };
    }

    function getImagePreparationSummary(result) {
      return {
        prepared: result.prepared,
        rasterized: result.rasterized,
        unresolved: result.unresolved,
        replacementCount: result.replacements.length
      };
    }

    function installPreparedImageReplacements(targetWindow, replacements) {
      const win = targetWindow || window;
      const doc = win.document;
      const replacementMap = new Map(replacements || []);

      if (replacementMap.size === 0 || !doc.documentElement) {
        return null;
      }

      function applyReplacements() {
        Array.from(doc.images).forEach(function (image) {
          const dataUrl = getPageImageSources(image)
            .map(function (source) {
              return replacementMap.get(source) || '';
            })
            .find(Boolean);

          if (dataUrl) {
            void replaceImageSource(image, dataUrl);
          }
        });
      }

      const observer = new win.MutationObserver(applyReplacements);

      applyReplacements();
      observer.observe(doc.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'srcset']
      });

      return observer;
    }

    function loadImage(source) {
      return new Promise(function (resolve, reject) {
        const image = new Image();

        image.addEventListener('load', function () {
          resolve(image);
        });
        image.addEventListener('error', function () {
          reject(new Error('No se ha podido leer la captura de Chrome.'));
        });
        image.src = source;
      });
    }

    async function cropVisibleTabCapture(dataUrl, rect) {
      const image = await loadImage(dataUrl);
      const scaleX = image.naturalWidth / window.innerWidth;
      const scaleY = image.naturalHeight / window.innerHeight;
      const sourceX = Math.max(0, Math.round(rect.left * scaleX));
      const sourceY = Math.max(0, Math.round(rect.top * scaleY));
      const sourceWidth = Math.min(
        image.naturalWidth - sourceX,
        Math.max(1, Math.round(rect.width * scaleX))
      );
      const sourceHeight = Math.min(
        image.naturalHeight - sourceY,
        Math.max(1, Math.round(rect.height * scaleY))
      );
      const canvas = document.createElement('canvas');

      canvas.width = sourceWidth;
      canvas.height = sourceHeight;

      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Chrome no ha podido preparar el recorte visual.');
      }

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        sourceWidth,
        sourceHeight
      );

      return {
        dataUrl: canvas.toDataURL('image/png'),
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height))
      };
    }

    function createRasterSnapshot(capture, label) {
      return `<!doctype html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>${escapeHtml(label)}</title>
            <style>
              html,
              body {
                width: ${capture.width}px;
                height: ${capture.height}px;
                margin: 0;
                overflow: hidden;
                background: transparent;
              }

              img {
                display: block;
                width: ${capture.width}px;
                height: ${capture.height}px;
              }
            </style>
          </head>
          <body>
            <img src="${capture.dataUrl}" alt="${escapeHtml(label)}" />
          </body>
        </html>`;
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
  
    function openSizedCapture(width, height, imagePreparationPromise) {
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
  
      const interval = window.setInterval(async function () {
        attempts += 1;
  
        try {
          if (
            captureWindow.document &&
            captureWindow.document.readyState === 'complete'
          ) {
            window.clearInterval(interval);

            if (imagePreparationPromise) {
              try {
                const imageResult = await imagePreparationPromise;

                installPreparedImageReplacements(
                  captureWindow,
                  imageResult.replacements
                );
                console.info(
                  '[UI COPY4] Imágenes preparadas para la vista responsive.',
                  getImagePreparationSummary(imageResult)
                );
              } catch (error) {
                console.warn(
                  '[UI COPY4] Algunas imágenes protegidas no se han podido transferir a la vista responsive.',
                  error
                );
              }
            }
  
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
        return info.isVisible && info.recommendedAction !== 'blocked';
      });
      const diagnosticTargets = captureTargets.filter(function (info) {
        return !visibleTargets.includes(info);
      });

      if (diagnosticTargets.length > 0) {
        console.info(
          '[UI COPY4] Elementos embebidos omitidos de la interfaz.',
          diagnosticTargets.map(function (info) {
            return {
              label: getCaptureTargetLabel(info),
              kind: info.kind,
              width: info.visualWidth,
              height: info.visualHeight,
              action: info.recommendedAction,
              reason: info.reason
            };
          })
        );
      }

      function getCaptureTargetStatusLabel(info) {
        if (info.recommendedAction === 'capture-url') {
          return 'Capturable por URL';
        }

        if (info.recommendedAction === 'capture-inline') {
          return 'Snapshot capturable';
        }

        if (info.recommendedAction === 'open-url') {
          return 'Contenido externo';
        }

        return 'Bloqueado';
      }

      function renderCaptureTargetAction(info) {
        if (
          info.recommendedAction === 'capture-url' ||
          info.recommendedAction === 'capture-inline'
        ) {
          return `
            <div class="target-actions">
              <button class="target-action" type="button" data-target-action="capture" data-target-id="${info.id}">
                Capturar solo este HTML
              </button>
            </div>
          `;
        }

        if (info.recommendedAction === 'open-url') {
          if (hasExtensionCaptureApi() && info.isVisible) {
            return `
              <div class="target-actions">
                <button class="target-action" type="button" data-target-action="open" data-target-id="${info.id}">
                  Abrir URL en nueva pestaña
                </button>
                <button class="target-action target-action-tertiary" type="button" data-target-action="capture-raster" data-target-id="${info.id}">
                  Capturar apariencia como imagen
                </button>
              </div>
            `;
          }

          return `
            <div class="target-actions">
              <button class="target-action" type="button" data-target-action="open" data-target-id="${info.id}">
                Abrir URL en nueva pestaña
              </button>
            </div>
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
        const reason =
          info.recommendedAction === 'open-url'
            ? 'Ábrelo en una pestaña nueva y pulsa UI COPY4 allí para capturar el HTML. Si no carga fuera de esta página, usa la captura visual.'
            : info.reason;

        return `
          <article class="target-item">
            <div class="target-topline">
              <strong title="${escapeHtml(label)}">${escapeHtml(label)}</strong>
              <span>${escapeHtml(getCaptureTargetStatusLabel(info))}</span>
            </div>
            <div class="target-meta">
              ${escapeHtml(kindLabel)} · ${escapeHtml(sourceLabel)} · ${info.visualWidth} × ${info.visualHeight}${escapeHtml(sandboxLabel)}
            </div>
            <div class="target-reason">${escapeHtml(reason)}</div>
            ${renderCaptureTargetAction(info)}
          </article>
        `;
      }

      function renderCaptureTargetSection() {
        if (!visibleTargets.length) {
          return '';
        }

        return `
          <section class="target-section" aria-labelledby="h2d-targets-title">
            <h3 id="h2d-targets-title">Contenido embebido</h3>
            <div class="target-list">
              ${visibleTargets.map(renderCaptureTargetInfo).join('')}
            </div>
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
            max-height: calc(100vh - 32px);
            overflow-x: hidden;
            overflow-y: auto;
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
            width: 100%;
            min-width: 0;
            margin-top: 16px;
            padding-top: 12px;
            box-sizing: border-box;
            border-top: 1px solid rgba(148, 163, 184, 0.22);
          }

          .target-list {
            display: grid;
            width: 100%;
            min-width: 0;
            gap: 8px;
            padding: 0;
            box-sizing: border-box;
          }

          .target-item {
            width: 100%;
            min-width: 0;
            padding: 10px;
            box-sizing: border-box;
            color: #334155;
            background: rgba(255, 255, 255, 0.38);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 14px;
          }

          .target-topline {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
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
            overflow-wrap: anywhere;
          }

          .target-action {
            width: 100%;
            min-height: 32px;
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

          .target-actions {
            display: grid;
            width: 100%;
            min-width: 0;
            gap: 6px;
            margin-top: 8px;
            box-sizing: border-box;
          }

          .target-action:hover {
            border-color: rgba(148, 163, 184, 0.32);
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.56)),
              rgba(255, 255, 255, 0.5);
          }

          .target-action-tertiary {
            min-height: 28px;
            color: #475569;
            background: transparent;
            border-color: transparent;
            box-shadow: none;
          }

          .target-action-tertiary:hover {
            color: #334155;
            background: rgba(255, 255, 255, 0.38);
            border-color: transparent;
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
  
      async function handleCapture() {
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
          if (hasExtensionCaptureApi()) {
            try {
              const imageResult = await preparePageImagesForCapture();

              console.info(
                '[UI COPY4] Preparación de imágenes completada.',
                getImagePreparationSummary(imageResult)
              );
            } catch (error) {
              console.warn(
                '[UI COPY4] Algunas imágenes protegidas no se han podido preparar.',
                error
              );
              closeVisibleTabCaptureBridge();
            }
          }

          injectCapture(window, { width: width, height: height });
          return;
        }

        const imagePreparationPromise = hasExtensionCaptureApi()
          ? preparePageImagesForCapture()
          : null;

        openSizedCapture(width, height, imagePreparationPromise);
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

      async function captureEmbeddedTargetAsRaster(info) {
        const element = info.element;

        closePanel();

        try {
          if (!element || !element.isConnected) {
            throw new Error(
              'El contenido embebido ya no está disponible en la página.'
            );
          }

          element.scrollIntoView({
            block: 'center',
            inline: 'center',
            behavior: 'instant'
          });

          await waitForPagePaint();

          const rect = getVisibleTargetRect(element);
          const screenshot = await requestVisibleTabCapture();
          const capture = await cropVisibleTabCapture(screenshot, rect);
          const label = getCaptureTargetLabel(info);

          openInlineSizedCapture(
            createRasterSnapshot(capture, label),
            capture.width,
            capture.height
          );
        } catch (error) {
          window.alert(
            `No se ha podido capturar el contenido como imagen. ${
              error && error.message ? error.message : 'Error desconocido.'
            }`
          );
        }
      }

      function openEmbeddedTarget(info) {
        const openedWindow = window.open(info.url, '_blank');

        if (!openedWindow) {
          window.alert(
            'El navegador ha bloqueado la nueva pestaña. Abre manualmente la URL del documento si está disponible.'
          );
          return;
        }

        try {
          openedWindow.opener = null;
        } catch (error) {
          console.warn(
            '[UI COPY4] No se ha podido aislar la pestaña externa de su origen.',
            error
          );
        }

        closePanel();
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

        if (button.getAttribute('data-target-action') === 'capture-raster') {
          captureEmbeddedTargetAsRaster(info);
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
