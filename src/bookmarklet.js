(function () {
    const ROOT_ID = 'h2d-dimension-picker-root';
    const CAPTURE_SCRIPT_URL = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
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

    function getAbsoluteUrl(value) {
      if (!value) {
        return '';
      }

      try {
        return new URL(value, window.location.href).href;
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

        if (url.protocol === 'about:' || url.protocol === 'javascript:') {
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

    function isOpenableIframeSrc(value) {
      const protocol = getUrlProtocol(value);

      return protocol === 'http:' || protocol === 'https:';
    }

    function hasSandboxToken(sandbox, token) {
      return (` ${sandbox} `).includes(` ${token} `);
    }

    function getAccessibleIframeWindow(iframe) {
      try {
        const iframeWindow = iframe.contentWindow;
        const iframeDocument =
          iframe.contentDocument || (iframeWindow ? iframeWindow.document : null);

        if (iframeWindow && iframeDocument && iframeDocument.documentElement) {
          return iframeWindow;
        }
      } catch (error) {
        // Cross-origin or sandboxed frames throw here by design.
      }

      return null;
    }

    function hasIframeDocumentContent(iframeWindow) {
      try {
        const doc = iframeWindow.document;
        const body = doc.body;

        return Boolean(
          body &&
            (body.children.length > 0 || (body.textContent || '').trim())
        );
      } catch (error) {
        return false;
      }
    }

    function scanIframes() {
      return Array.prototype.slice.call(document.querySelectorAll('iframe')).map(
        function (iframe, index) {
          const rect = iframe.getBoundingClientRect();
          const rawSrc = iframe.getAttribute('src') || '';
          const src = getAbsoluteUrl(rawSrc || iframe.src || '');
          const sandbox = iframe.hasAttribute('sandbox')
            ? iframe.getAttribute('sandbox') || 'sandbox'
            : '';
          const hasSrcdoc = iframe.hasAttribute('srcdoc');
          const iframeWindow = getAccessibleIframeWindow(iframe);
          const canAccessDocument = Boolean(iframeWindow);
          const hasUsableDocument =
            canAccessDocument && (Boolean(src) || hasSrcdoc || hasIframeDocumentContent(iframeWindow));
          let sameOrigin = inferSameOrigin(src);
          let recommendedAction = 'blocked';
          let reason = 'No capturable desde bookmarklet por Same-Origin Policy o sandbox.';

          if (canAccessDocument && sandbox && !hasSandboxToken(sandbox, 'allow-scripts')) {
            reason =
              'Accesible, pero el sandbox no permite ejecutar scripts de captura.';
          } else if (canAccessDocument && hasUsableDocument) {
            sameOrigin = sameOrigin === null ? true : sameOrigin;
            recommendedAction = 'capture-direct';
            reason = 'Accesible desde esta página; se puede capturar directamente.';
          } else if (canAccessDocument) {
            reason =
              'Accesible, pero no tiene contenido o URL útil para capturar.';
          } else if (isOpenableIframeSrc(src)) {
            recommendedAction = 'open-src';
            reason =
              'No accesible desde bookmarklet por Same-Origin Policy o sandbox; puedes abrir su URL.';
          } else if (hasSrcdoc) {
            reason =
              'No capturable desde bookmarklet por Same-Origin Policy o sandbox. No tiene URL propia.';
          } else if (src) {
            reason =
              'No capturable desde bookmarklet y su URL no es adecuada para abrirla directamente.';
          }

          return {
            index: index,
            title: iframe.getAttribute('title') || '',
            name: iframe.getAttribute('name') || '',
            src: src,
            visualWidth: Math.round(rect.width),
            visualHeight: Math.round(rect.height),
            sandbox: sandbox,
            hasSrcdoc: hasSrcdoc,
            canAccessDocument: canAccessDocument,
            sameOrigin: sameOrigin,
            recommendedAction: recommendedAction,
            reason: reason,
            element: iframe
          };
        }
      );
    }

    function getIframeLabel(info) {
      return (
        info.title ||
        info.name ||
        getHostname(info.src) ||
        `Iframe ${info.index + 1}`
      );
    }

    function getIframeExpectedSize(info, iframeWindow) {
      try {
        return {
          width: iframeWindow.innerWidth || info.visualWidth,
          height: iframeWindow.innerHeight || info.visualHeight
        };
      } catch (error) {
        return {
          width: info.visualWidth,
          height: info.visualHeight
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

    function injectCapture(targetWindow, expectedSize) {
      const win = targetWindow || window;
      const doc = win.document;
  
      function appendCaptureScript() {
        logCaptureDiagnostics(win, expectedSize, 'Capture diagnostics before capture.js');

        if (ENABLE_CAPTURE_METRIC_OVERRIDES) {
          applyCaptureMetricOverrides(win, expectedSize);
        }

        const script = doc.createElement('script');
        script.src = CAPTURE_SCRIPT_URL;
        script.async = true;
        doc.head.appendChild(script);
      }
  
      appendCaptureScript();
  
      win.setTimeout(function () {
        win.location.hash = 'figmacapture&figmadelay=1000';
        appendCaptureScript();
      }, 500);
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
      const iframeScan = scanIframes();

      function getIframeStatusLabel(info) {
        if (info.recommendedAction === 'capture-direct') {
          return 'Capturable';
        }

        if (info.recommendedAction === 'open-src') {
          return 'Abrir en nueva ventana';
        }

        return 'Bloqueado';
      }

      function renderIframeAction(info) {
        if (info.recommendedAction === 'capture-direct') {
          return `
            <button class="iframe-action" type="button" data-iframe-action="capture" data-iframe-index="${info.index}">
              Capturar iframe
            </button>
          `;
        }

        if (info.recommendedAction === 'open-src') {
          return `
            <button class="iframe-action" type="button" data-iframe-action="open" data-iframe-index="${info.index}">
              Abrir iframe
            </button>
          `;
        }

        return '';
      }

      function renderIframeInfo(info) {
        const label = getIframeLabel(info);
        const sandboxLabel = info.sandbox
          ? ` · sandbox: ${info.sandbox}`
          : '';

        return `
          <article class="iframe-item">
            <div class="iframe-topline">
              <strong title="${escapeHtml(label)}">${escapeHtml(label)}</strong>
              <span>${escapeHtml(getIframeStatusLabel(info))}</span>
            </div>
            <div class="iframe-meta">
              ${info.visualWidth} × ${info.visualHeight}${escapeHtml(sandboxLabel)}
            </div>
            <div class="iframe-reason">${escapeHtml(info.reason)}</div>
            ${renderIframeAction(info)}
          </article>
        `;
      }

      function renderIframeSection() {
        if (!iframeScan.length) {
          return '';
        }

        return `
          <section class="iframe-section" aria-labelledby="h2d-iframes-title">
            <h3 id="h2d-iframes-title">Iframes detectados</h3>
            <div class="iframe-list">
              ${iframeScan.map(renderIframeInfo).join('')}
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

          .iframe-section {
            position: relative;
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid rgba(148, 163, 184, 0.22);
          }

          .iframe-list {
            display: grid;
            gap: 8px;
            max-height: 178px;
            overflow: auto;
            padding-right: 2px;
          }

          .iframe-item {
            padding: 10px;
            color: #334155;
            background: rgba(255, 255, 255, 0.38);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 14px;
          }

          .iframe-topline {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            color: #0f172a;
            font-size: 12px;
            line-height: 16px;
          }

          .iframe-topline strong {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .iframe-topline span {
            flex: 0 0 auto;
            color: #475569;
            font-size: 11px;
            font-weight: 650;
          }

          .iframe-meta,
          .iframe-reason {
            margin-top: 4px;
            color: #64748b;
            font-size: 11px;
            line-height: 15px;
          }

          .iframe-action {
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

          .iframe-action:hover {
            border-color: rgba(148, 163, 184, 0.32);
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.56)),
              rgba(255, 255, 255, 0.5);
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

          ${renderIframeSection()}
  
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
      const iframeButtons = shadow.querySelectorAll('[data-iframe-action]');
  
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

      function getIframeInfoFromButton(button) {
        const iframeIndex = Number(button.getAttribute('data-iframe-index'));

        return iframeScan.find(function (info) {
          return info.index === iframeIndex;
        });
      }

      function captureIframe(info) {
        const iframeWindow = getAccessibleIframeWindow(info.element);

        if (!iframeWindow) {
          window.alert(
            'Este iframe ya no es accesible desde el bookmarklet. Puede estar bloqueado por Same-Origin Policy o sandbox.'
          );
          return;
        }

        closePanel();
        injectCapture(iframeWindow, getIframeExpectedSize(info, iframeWindow));
      }

      function openIframe(info) {
        const openedWindow = window.open(info.src, '_blank', 'noopener,noreferrer');

        if (!openedWindow) {
          window.alert(
            'El navegador ha bloqueado la nueva ventana. Abre manualmente la URL del iframe si está disponible.'
          );
        }
      }

      function handleIframeAction(event) {
        const button = event.currentTarget;
        const info = getIframeInfoFromButton(button);

        if (!info) {
          return;
        }

        if (button.getAttribute('data-iframe-action') === 'capture') {
          captureIframe(info);
          return;
        }

        if (button.getAttribute('data-iframe-action') === 'open') {
          openIframe(info);
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

      iframeButtons.forEach(function (button) {
        button.addEventListener('click', handleIframeAction);
      });
  
      document.addEventListener('keydown', handleEscape);
  
      applyPreset();
      presetSelect.focus();
    }
  
    createPanel();
  })();
