const CAPTURE_MESSAGE_TYPE = 'h2d:capture-visible-tab';

function installCaptureBridge(token) {
  const tokenAttribute = 'data-h2d-extension-capture-token';
  const requestEvent = `h2d:capture-request:${token}`;
  const responseEvent = `h2d:capture-response:${token}`;

  if (typeof globalThis.__h2dCaptureBridgeCleanup === 'function') {
    globalThis.__h2dCaptureBridgeCleanup();
  }

  function cleanup() {
    document.removeEventListener(requestEvent, handleRequest);

    if (document.documentElement.getAttribute(tokenAttribute) === token) {
      document.documentElement.removeAttribute(tokenAttribute);
    }

    globalThis.__h2dCaptureBridgeCleanup = null;
  }

  function respond(requestId, response) {
    document.dispatchEvent(
      new CustomEvent(responseEvent, {
        detail: {
          requestId: requestId,
          ok: Boolean(response && response.ok),
          dataUrl: response && response.dataUrl ? response.dataUrl : '',
          error: response && response.error ? response.error : ''
        }
      })
    );
  }

  function handleRequest(event) {
    const requestId = event.detail && event.detail.requestId;

    if (!requestId || typeof requestId !== 'string') {
      return;
    }

    cleanup();

    chrome.runtime.sendMessage(
      { type: 'h2d:capture-visible-tab' },
      function (response) {
        const runtimeError = chrome.runtime.lastError;

        if (runtimeError) {
          respond(requestId, { ok: false, error: runtimeError.message });
          return;
        }

        respond(requestId, response);
      }
    );
  }

  globalThis.__h2dCaptureBridgeCleanup = cleanup;
  document.addEventListener(requestEvent, handleRequest);
  document.documentElement.setAttribute(tokenAttribute, token);
}

function showActionError(tabId, error) {
  console.error('[UI COPY4]', error);

  chrome.action.setBadgeBackgroundColor({ color: '#d93025' });
  chrome.action.setBadgeText({ tabId: tabId, text: '!' });

  setTimeout(function () {
    chrome.action.setBadgeText({ tabId: tabId, text: '' });
  }, 3000);
}

chrome.action.onClicked.addListener(async function (tab) {
  if (!tab.id) {
    return;
  }

  try {
    const token = crypto.randomUUID();

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'ISOLATED',
      func: installCaptureBridge,
      args: [token]
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      files: ['bookmarklet.js']
    });
  } catch (error) {
    showActionError(tab.id, error);
  }
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message || message.type !== CAPTURE_MESSAGE_TYPE) {
    return false;
  }

  if (!sender.tab || !sender.tab.active) {
    sendResponse({
      ok: false,
      error: 'La pestaña que solicita la captura ya no está activa.'
    });
    return false;
  }

  chrome.tabs
    .captureVisibleTab(sender.tab.windowId, { format: 'png' })
    .then(function (dataUrl) {
      sendResponse({ ok: true, dataUrl: dataUrl });
    })
    .catch(function (error) {
      sendResponse({
        ok: false,
        error: error && error.message ? error.message : 'Captura no disponible.'
      });
    });

  return true;
});
