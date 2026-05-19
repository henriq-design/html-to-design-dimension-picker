(function () {
    const ROOT_ID = 'h2d-dimension-picker-root';
    const CAPTURE_SCRIPT_URL = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
  
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
  
    function getCaptureDiagnostics(win, expectedSize) {
      return {
        expectedWidth: expectedSize ? expectedSize.width : undefined,
        expectedHeight: expectedSize ? expectedSize.height : undefined,
        'window.innerWidth': win.innerWidth,
        'window.innerHeight': win.innerHeight,
        'document.documentElement.clientWidth': win.document.documentElement.clientWidth,
        'document.documentElement.clientHeight': win.document.documentElement.clientHeight,
        'document.documentElement.scrollWidth': win.document.documentElement.scrollWidth,
        'document.body.scrollWidth': win.document.body ? win.document.body.scrollWidth : undefined,
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
        logCaptureDiagnostics(win, expectedSize, 'Raw capture diagnostics');
        applyCaptureMetricOverrides(win, expectedSize);
        logCaptureDiagnostics(win, expectedSize, 'Effective capture diagnostics');

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
            width: 328px;
            padding: 18px;
            box-sizing: border-box;
            color: #fff;
            background:
              linear-gradient(145deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.07) 42%, rgba(18, 18, 22, 0.46)),
              rgba(18, 18, 22, 0.54);
            border: 1px solid rgba(255, 255, 255, 0.28);
            border-radius: 22px;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.38),
              inset 0 -1px 0 rgba(255, 255, 255, 0.1),
              0 24px 70px rgba(0, 0, 0, 0.38);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            overflow: hidden;
          }

          .panel::before {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background:
              radial-gradient(circle at 18% 0%, rgba(255, 255, 255, 0.2), transparent 32%),
              linear-gradient(120deg, rgba(255, 255, 255, 0.14), transparent 38%);
            opacity: 0.8;
          }
  
          .header {
            position: relative;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
          }
  
          h2 {
            margin: 0;
            color: #fff;
            font-size: 18px;
            line-height: 24px;
            font-weight: 720;
          }
  
          p {
            margin: 5px 0 0;
            color: rgba(255, 255, 255, 0.72);
            font-size: 13px;
            line-height: 18px;
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
            margin: 12px 0 6px;
            color: rgba(255, 255, 255, 0.82);
            font-size: 12px;
            line-height: 16px;
            font-weight: 650;
          }
  
          select,
          input {
            position: relative;
            width: 100%;
            min-height: 38px;
            padding: 9px 11px;
            color: #fff;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.06)),
              rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.22);
            border-radius: 12px;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.2),
              0 1px 0 rgba(0, 0, 0, 0.08);
            outline: none;
            backdrop-filter: blur(20px) saturate(160%);
            -webkit-backdrop-filter: blur(20px) saturate(160%);
          }

          select {
            color-scheme: dark;
          }
  
          select:focus,
          input:focus {
            border-color: rgba(255, 255, 255, 0.58);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.24),
              0 0 0 3px rgba(255, 255, 255, 0.16);
          }

          select:hover,
          input:hover {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.08)),
              rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.32);
          }
  
          .grid {
            position: relative;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
  
          .actions {
            position: relative;
            display: flex;
            gap: 8px;
            margin-top: 18px;
          }
  
          .button {
            min-height: 38px;
            padding: 8px 12px;
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: 14px;
            cursor: pointer;
            transition:
              transform 120ms ease,
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
            color: #101014;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.82));
            font-weight: 700;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.9),
              0 10px 28px rgba(0, 0, 0, 0.18);
          }
  
          .button-secondary {
            color: #fff;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.06)),
              rgba(255, 255, 255, 0.08);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
          }

          .button-secondary:hover {
            border-color: rgba(255, 255, 255, 0.3);
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.17), rgba(255, 255, 255, 0.08)),
              rgba(255, 255, 255, 0.1);
          }
  
          .button-icon {
            width: 32px;
            height: 32px;
            padding: 0;
            color: #fff;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.06)),
              rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 12px;
            cursor: pointer;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
            transition:
              background 120ms ease,
              border-color 120ms ease;
          }

          .button-icon:hover {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.08)),
              rgba(255, 255, 255, 0.12);
            border-color: rgba(255, 255, 255, 0.28);
          }
  
          .hint {
            position: relative;
            margin-top: 12px;
            color: rgba(255, 255, 255, 0.6);
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
  
      document.addEventListener('keydown', handleEscape);
  
      applyPreset();
      presetSelect.focus();
    }
  
    createPanel();
  })();
