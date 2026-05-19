(function () {
    const ROOT_ID = 'h2d-dimension-picker-root';
    const CAPTURE_SCRIPT_URL = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
  
    if (document.getElementById(ROOT_ID)) {
      document.getElementById(ROOT_ID).remove();
      return;
    }
  
    const presets = [
      {
        id: 'current',
        label: `Viewport actual · ${window.innerWidth} × ${window.innerHeight}`,
        width: window.innerWidth,
        height: window.innerHeight,
        mode: 'current'
      },
      {
        id: 'desktop',
        label: 'Desktop · 1440 × 900',
        width: 1440,
        height: 900,
        mode: 'popup'
      },
      {
        id: 'laptop',
        label: 'Laptop · 1366 × 768',
        width: 1366,
        height: 768,
        mode: 'popup'
      },
      {
        id: 'tablet',
        label: 'Tablet · 768 × 1024',
        width: 768,
        height: 1024,
        mode: 'popup'
      },
      {
        id: 'mobile',
        label: 'Mobile · 390 × 844',
        width: 390,
        height: 844,
        mode: 'popup'
      }
    ];
  
    function injectCapture(targetWindow) {
      const win = targetWindow || window;
      const doc = win.document;
  
      function appendCaptureScript() {
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
  
            captureWindow.resizeTo(width, height);
            captureWindow.focus();
  
            captureWindow.setTimeout(function () {
              injectCapture(captureWindow);
            }, 500);
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
            padding: 16px;
            box-sizing: border-box;
            color: #fff;
            background: #111;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 14px;
            box-shadow: 0 18px 60px rgba(0, 0, 0, 0.35);
          }
  
          .header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 12px;
          }
  
          h2 {
            margin: 0;
            color: #fff;
            font-size: 15px;
            line-height: 20px;
            font-weight: 700;
          }
  
          p {
            margin: 4px 0 0;
            color: #bdbdbd;
            font-size: 12px;
            line-height: 16px;
          }
  
          button,
          select,
          input {
            font: inherit;
            box-sizing: border-box;
          }
  
          label {
            display: block;
            margin: 12px 0 6px;
            color: #e8e8e8;
            font-size: 12px;
            line-height: 16px;
            font-weight: 600;
          }
  
          select,
          input {
            width: 100%;
            min-height: 38px;
            padding: 8px 10px;
            color: #fff;
            background: #1d1d1d;
            border: 1px solid #3c3c3c;
            border-radius: 9px;
            outline: none;
          }
  
          select:focus,
          input:focus {
            border-color: #fff;
            box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.16);
          }
  
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
  
          .actions {
            display: flex;
            gap: 8px;
            margin-top: 16px;
          }
  
          .button {
            min-height: 38px;
            padding: 8px 12px;
            border: 0;
            border-radius: 9px;
            cursor: pointer;
          }
  
          .button-primary {
            flex: 1;
            color: #111;
            background: #fff;
            font-weight: 700;
          }
  
          .button-secondary {
            color: #fff;
            background: #2a2a2a;
          }
  
          .button-icon {
            width: 32px;
            height: 32px;
            padding: 0;
            color: #fff;
            background: #242424;
            border: 0;
            border-radius: 8px;
            cursor: pointer;
          }
  
          .hint {
            margin-top: 10px;
            color: #949494;
            font-size: 11px;
            line-height: 15px;
          }
        </style>
  
        <section class="panel" role="dialog" aria-labelledby="h2d-title">
          <div class="header">
            <div>
              <h2 id="h2d-title">Capturar con dimensiones</h2>
              <p>Define el tamaño antes de enviar la página a html.to.design.</p>
            </div>
  
            <button class="button-icon" type="button" data-action="close" aria-label="Cerrar">
              ×
            </button>
          </div>
  
          <label for="preset">Preset</label>
          <select id="preset">
            ${presets
              .map(
                function (preset, index) {
                  return `<option value="${index}">${preset.label}</option>`;
                }
              )
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
            Las dimensiones custom abren una ventana nueva. El viewport actual captura esta pestaña directamente.
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
        const selectedPreset = presets[Number(presetSelect.value)];
  
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
  
        if (selectedPreset.mode === 'current') {
          injectCapture(window);
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