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
              linear-gradient(135deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.08) 34%, rgba(255, 255, 255, 0.03) 68%),
              rgba(255, 255, 255, 0.075);
            border: 1px solid rgba(255, 255, 255, 0.42);
            border-radius: 22px;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.68),
              inset 0 -1px 0 rgba(255, 255, 255, 0.18),
              inset 1px 0 0 rgba(255, 255, 255, 0.18),
              0 22px 70px rgba(0, 0, 0, 0.22);
            backdrop-filter: blur(20px) saturate(210%) brightness(1.08);
            -webkit-backdrop-filter: blur(20px) saturate(210%) brightness(1.08);
            isolation: isolate;
            overflow: hidden;
          }

          .panel::before {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background:
              radial-gradient(circle at 18% 0%, rgba(255, 255, 255, 0.78), transparent 26%),
              radial-gradient(circle at 92% 12%, rgba(255, 255, 255, 0.26), transparent 22%),
              linear-gradient(118deg, rgba(255, 255, 255, 0.42), transparent 28%, rgba(255, 255, 255, 0.08) 48%, transparent 72%);
            opacity: 0.65;
            mix-blend-mode: screen;
            z-index: -1;
          }

          .panel::after {
            content: "";
            position: absolute;
            inset: 1px;
            border-radius: 21px;
            pointer-events: none;
            background:
              linear-gradient(90deg, rgba(255, 70, 150, 0.12), transparent 18%, transparent 82%, rgba(85, 180, 255, 0.16)),
              repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.13) 0 1px, transparent 1px 11px);
            opacity: 0.32;
            mask-image: linear-gradient(#000, transparent 62%);
            -webkit-mask-image: linear-gradient(#000, transparent 62%);
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
            text-shadow: 0 1px 18px rgba(0, 0, 0, 0.38);
          }
  
          p {
            margin: 5px 0 0;
            color: rgba(255, 255, 255, 0.82);
            font-size: 13px;
            line-height: 18px;
            text-shadow: 0 1px 14px rgba(0, 0, 0, 0.32);
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
            color: rgba(255, 255, 255, 0.9);
            font-size: 12px;
            line-height: 16px;
            font-weight: 650;
            text-shadow: 0 1px 12px rgba(0, 0, 0, 0.34);
          }
  
          select,
          input {
            position: relative;
            width: 100%;
            min-height: 38px;
            padding: 9px 11px;
            color: #fff;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.06)),
              rgba(255, 255, 255, 0.055);
            border: 1px solid rgba(255, 255, 255, 0.36);
            border-radius: 12px;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.42),
              inset 0 -1px 0 rgba(255, 255, 255, 0.1),
              0 1px 0 rgba(0, 0, 0, 0.06);
            outline: none;
            text-shadow: 0 1px 12px rgba(0, 0, 0, 0.38);
            backdrop-filter: blur(20px) saturate(190%) brightness(1.08);
            -webkit-backdrop-filter: blur(20px) saturate(190%) brightness(1.08);
          }

          select {
            color-scheme: dark;
          }
  
          select:focus,
          input:focus {
            border-color: rgba(255, 255, 255, 0.76);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.52),
              0 0 0 3px rgba(255, 255, 255, 0.18),
              0 0 24px rgba(255, 255, 255, 0.16);
          }

          select:hover,
          input:hover {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.08)),
              rgba(255, 255, 255, 0.075);
            border-color: rgba(255, 255, 255, 0.48);
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
            border: 1px solid rgba(255, 255, 255, 0.34);
            border-radius: 14px;
            cursor: pointer;
            backdrop-filter: blur(20px) saturate(190%) brightness(1.08);
            -webkit-backdrop-filter: blur(20px) saturate(190%) brightness(1.08);
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
            color: rgba(15, 17, 22, 0.92);
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.42)),
              rgba(255, 255, 255, 0.28);
            font-weight: 700;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.78),
              inset 0 -1px 0 rgba(255, 255, 255, 0.18),
              0 10px 28px rgba(0, 0, 0, 0.12);
          }

          .button-primary:hover {
            border-color: rgba(255, 255, 255, 0.68);
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.5)),
              rgba(255, 255, 255, 0.34);
          }
  
          .button-secondary {
            color: #fff;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.05)),
              rgba(255, 255, 255, 0.055);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.34),
              inset 0 -1px 0 rgba(255, 255, 255, 0.08);
            text-shadow: 0 1px 12px rgba(0, 0, 0, 0.36);
          }

          .button-secondary:hover {
            border-color: rgba(255, 255, 255, 0.5);
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.08)),
              rgba(255, 255, 255, 0.08);
          }
  
          .button-icon {
            width: 32px;
            height: 32px;
            padding: 0;
            color: #fff;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05)),
              rgba(255, 255, 255, 0.055);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 12px;
            cursor: pointer;
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.34),
              inset 0 -1px 0 rgba(255, 255, 255, 0.08);
            text-shadow: 0 1px 12px rgba(0, 0, 0, 0.38);
            backdrop-filter: blur(20px) saturate(190%) brightness(1.08);
            -webkit-backdrop-filter: blur(20px) saturate(190%) brightness(1.08);
            transition:
              background 120ms ease,
              border-color 120ms ease;
          }

          .button-icon:hover {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.08)),
              rgba(255, 255, 255, 0.09);
            border-color: rgba(255, 255, 255, 0.5);
          }
  
          .hint {
            position: relative;
            margin-top: 12px;
            color: rgba(255, 255, 255, 0.72);
            font-size: 11px;
            line-height: 15px;
            text-shadow: 0 1px 12px rgba(0, 0, 0, 0.34);
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
