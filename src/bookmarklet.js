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

    function installCaptureToolbarStyles(win) {
      const doc = win.document;

      if (!doc || !doc.head) {
        return;
      }

      const toolbarCss = `
        .h2d-capture-toolbar {
          position: relative !important;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(246, 248, 252, 0.68)),
            rgba(246, 248, 252, 0.62) !important;
          border: 1px solid rgba(255, 255, 255, 0.78) !important;
          border-radius: 26px !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.92),
            inset 0 -1px 0 rgba(148, 163, 184, 0.18),
            0 18px 55px rgba(15, 23, 42, 0.18) !important;
          color: #0f172a !important;
          overflow: hidden !important;
          backdrop-filter: blur(24px) saturate(180%) brightness(1.04) !important;
          -webkit-backdrop-filter: blur(24px) saturate(180%) brightness(1.04) !important;
        }

        .h2d-capture-toolbar::before {
          content: "" !important;
          position: absolute !important;
          inset: 0 !important;
          pointer-events: none !important;
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.72), transparent 28%),
            radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.5), transparent 24%),
            radial-gradient(circle at 0% 100%, rgba(125, 211, 252, 0.16), transparent 30%) !important;
          opacity: 0.7 !important;
        }

        .h2d-capture-toolbar,
        .h2d-capture-toolbar * {
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif !important;
          letter-spacing: 0 !important;
        }

        .h2d-capture-toolbar button,
        .h2d-capture-toolbar [role="button"] {
          color: #334155 !important;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.5)),
            rgba(255, 255, 255, 0.44) !important;
          border: 1px solid rgba(148, 163, 184, 0.22) !important;
          border-radius: 999px !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.84),
            0 8px 20px rgba(15, 23, 42, 0.06) !important;
          font-weight: 650 !important;
          backdrop-filter: blur(18px) saturate(160%) !important;
          -webkit-backdrop-filter: blur(18px) saturate(160%) !important;
        }

        .h2d-capture-toolbar button:hover,
        .h2d-capture-toolbar [role="button"]:hover {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.56)),
            rgba(255, 255, 255, 0.5) !important;
          border-color: rgba(148, 163, 184, 0.32) !important;
        }

        .h2d-capture-toolbar svg,
        .h2d-capture-toolbar path {
          color: #475569 !important;
          stroke: currentColor !important;
        }

        .h2d-capture-toolbar [style*="background"] {
          background: transparent !important;
        }
      `;

      function injectStyle(root) {
        const target = root.head || root;

        if (!target || target.querySelector('#h2d-capture-toolbar-style')) {
          return;
        }

        const style = doc.createElement('style');
        style.id = 'h2d-capture-toolbar-style';
        style.textContent = toolbarCss;
        target.appendChild(style);
      }

      injectStyle(doc);

      function setImportant(element, property, value) {
        if (element && element.style) {
          element.style.setProperty(property, value, 'important');
        }
      }

      function applyRootInlineStyles(toolbar) {
        setImportant(toolbar, 'isolation', 'isolate');
        setImportant(
          toolbar,
          'background',
          'linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(246, 248, 252, 0.66)), rgba(246, 248, 252, 0.6)'
        );
        setImportant(toolbar, 'border', '1px solid rgba(255, 255, 255, 0.78)');
        setImportant(toolbar, 'border-radius', '22px');
        setImportant(
          toolbar,
          'box-shadow',
          'inset 0 1px 0 rgba(255, 255, 255, 0.92), inset 0 -1px 0 rgba(148, 163, 184, 0.18), 0 18px 55px rgba(15, 23, 42, 0.18)'
        );
        setImportant(toolbar, 'color', '#0f172a');
        setImportant(toolbar, 'overflow', 'hidden');
        setImportant(toolbar, 'backdrop-filter', 'blur(24px) saturate(180%) brightness(1.04)');
        setImportant(toolbar, '-webkit-backdrop-filter', 'blur(24px) saturate(180%) brightness(1.04)');
      }

      function clearCompetingInlineStyles(toolbar) {
        const elements = toolbar.querySelectorAll ? toolbar.querySelectorAll('*') : [];

        elements.forEach(function (element) {
          setImportant(element, 'box-shadow', 'none');
          setImportant(element, 'border-color', 'rgba(148, 163, 184, 0.16)');

          if (element !== toolbar) {
            setImportant(element, 'background-color', 'transparent');
          }
        });
      }

      function applyControlInlineStyles(toolbar) {
        const controls = toolbar.querySelectorAll
          ? toolbar.querySelectorAll('button, [role="button"], a, div')
          : [];

        controls.forEach(function (control) {
          const text = control.textContent || '';
          const isCaptureControl =
            text.includes('Copy to clipboard') ||
            text.includes('Copiar al portapapeles') ||
            text.includes('Entire screen') ||
            text.includes('Pantalla completa') ||
            text.includes('Select element') ||
            text.includes('Seleccionar elemento');

          if (
            !isCaptureControl &&
            control.tagName !== 'BUTTON' &&
            control.getAttribute('role') !== 'button'
          ) {
            return;
          }

          setImportant(control, 'color', '#334155');
          setImportant(
            control,
            'background',
            'linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.5)), rgba(255, 255, 255, 0.44)'
          );
          setImportant(control, 'border', '1px solid rgba(148, 163, 184, 0.22)');
          setImportant(control, 'border-radius', '999px');
          setImportant(control, 'font-weight', '650');
          setImportant(control, 'backdrop-filter', 'blur(18px) saturate(160%)');
          setImportant(control, '-webkit-backdrop-filter', 'blur(18px) saturate(160%)');

          const descendants = control.querySelectorAll ? control.querySelectorAll('*') : [];
          descendants.forEach(function (descendant) {
            setImportant(descendant, 'color', '#334155');
            setImportant(descendant, 'background-color', 'transparent');
            setImportant(descendant, 'stroke', 'currentColor');
          });
        });
      }

      function getDeepElements(root) {
        const elements = [];
        const tree = root.querySelectorAll ? root.querySelectorAll('*') : [];

        tree.forEach(function (element) {
          elements.push(element);

          if (element.shadowRoot) {
            injectStyle(element.shadowRoot);
            getDeepElements(element.shadowRoot).forEach(function (shadowElement) {
              elements.push(shadowElement);
            });
          }

          if (element.tagName === 'IFRAME') {
            try {
              const iframeDoc = element.contentDocument;

              if (iframeDoc) {
                injectStyle(iframeDoc);
                getDeepElements(iframeDoc).forEach(function (iframeElement) {
                  elements.push(iframeElement);
                });
              }
            } catch (error) {
              // Cross-origin iframes are intentionally ignored.
            }
          }
        });

        return elements;
      }

      function getVisualToolbarContainer(element) {
        let toolbar = element;
        let parent = element.parentElement;

        while (parent && parent !== doc.body && parent !== doc.documentElement) {
          const rect = parent.getBoundingClientRect();
          const style = win.getComputedStyle(parent);
          const isToolbarSized = rect.width > 320 && rect.height >= 36 && rect.height < 120;
          const isOverlay =
            style.position === 'fixed' ||
            style.position === 'sticky' ||
            Number(style.zIndex) > 100;

          if (!isToolbarSized || !isOverlay) {
            break;
          }

          toolbar = parent;
          parent = parent.parentElement;
        }

        return toolbar;
      }

      function findToolbarRoot() {
        const matches = getDeepElements(doc).filter(function (element) {
          const text = element.textContent || '';
          const rect = element.getBoundingClientRect();
          const hasToolbarCopy =
            (text.includes('Copy to clipboard') ||
              text.includes('Copiar al portapapeles')) &&
            (text.includes('Entire screen') ||
              text.includes('Pantalla completa') ||
              text.includes('Select element') ||
              text.includes('Seleccionar elemento'));

          return (
            hasToolbarCopy &&
            rect.width > 320 &&
            rect.height > 36 &&
            rect.height < 160
          );
        });

        return matches.sort(function (a, b) {
          return (
            a.getBoundingClientRect().height - b.getBoundingClientRect().height
          );
        }).map(getVisualToolbarContainer)[0];
      }

      function applyToolbarClass() {
        const toolbar = findToolbarRoot();

        if (toolbar) {
          toolbar.classList.add('h2d-capture-toolbar');
          applyRootInlineStyles(toolbar);
          clearCompetingInlineStyles(toolbar);
          applyControlInlineStyles(toolbar);
          win.console.info('[html.to.design dimension picker] Toolbar glass styles applied.');
        }
      }

      let attempts = 0;
      const interval = win.setInterval(function () {
        attempts += 1;
        applyToolbarClass();

        if (attempts >= 80) {
          win.clearInterval(interval);
        }
      }, 100);

      if (win.MutationObserver && doc.body) {
        const observer = new win.MutationObserver(applyToolbarClass);
        observer.observe(doc.body, { childList: true, subtree: true });

        win.setTimeout(function () {
          observer.disconnect();
        }, 10000);
      }

      applyToolbarClass();
      win.__h2dCaptureToolbarStylesInstalled = true;
    }

    function exposeCaptureShadowRoots(win) {
      if (win.__h2dShadowRootsExposed || !win.Element || !win.Element.prototype) {
        return;
      }

      const originalAttachShadow = win.Element.prototype.attachShadow;

      if (!originalAttachShadow) {
        return;
      }

      win.Element.prototype.attachShadow = function (init) {
        const options = Object.assign({}, init, { mode: 'open' });

        return originalAttachShadow.call(this, options);
      };

      win.__h2dShadowRootsExposed = true;
    }

    function injectCapture(targetWindow, expectedSize) {
      const win = targetWindow || window;
      const doc = win.document;
  
      function appendCaptureScript() {
        exposeCaptureShadowRoots(win);
        logCaptureDiagnostics(win, expectedSize, 'Raw capture diagnostics');
        applyCaptureMetricOverrides(win, expectedSize);
        logCaptureDiagnostics(win, expectedSize, 'Effective capture diagnostics');
        installCaptureToolbarStyles(win);

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
