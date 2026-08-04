(function () {
  var _currentScript = document.currentScript;

  var existingWidget = document.getElementById("custom-api-chat-widget");
  if (existingWidget && existingWidget.offsetParent !== null) return;
  if (window.__nexxus_loader_executed) return;
  window.__nexxus_loader_executed = true;

  var FUNCTION_URL = "https://iuvzpvhaxlrbwaitizci.supabase.co/functions/v1/fn-sv03";
  var EXT_VERSION = "7.5.1";
  var TOKEN_KEY = "lovable_pro_license";
  var FINGERPRINT_KEY = "ext_client_fingerprint";

  function ensureFingerprint() {
    try {
      var fp = localStorage.getItem(FINGERPRINT_KEY);
      if (!fp) {
        fp = (window.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : (Date.now() + "-" + Math.random().toString(36).slice(2));
        localStorage.setItem(FINGERPRINT_KEY, fp);
      }
      return fp;
    } catch (_) { return ""; }
  }
  var FINGERPRINT = ensureFingerprint();

  var baseUrl = "";
  if (_currentScript && _currentScript.src) {
    baseUrl = _currentScript.src.replace(/[^/]*$/, "");
  }

  function injectScript(code) {
    try {
      var blob = new Blob([code], { type: "application/javascript" });
      var url = URL.createObjectURL(blob);
      var s = document.createElement("script");
      s.src = url;
      s.onload = function () { URL.revokeObjectURL(url); };
      s.onerror = function () {
        URL.revokeObjectURL(url);
        console.error("[NexxusPRO Loader] Erro ao executar script via Blob URL.");
      };
      document.head.appendChild(s);
    } catch (e) {
      console.error("[NexxusPRO Loader] Erro ao injetar script:", e);
    }
  }

  function loadLoginShell() {
    var script = document.createElement("script");
    script.src = baseUrl + "extensao-login.js";
    script.onerror = function () {
      console.debug("[NexxusPRO Loader] Login shell não encontrado.");
    };
    document.head.appendChild(script);
  }

  var MAX_RETRIES = 3;
  var RETRY_DELAY = 2000;

  function attemptLoad(token, attempt) {
    var layout = localStorage.getItem("ext_layout") || "floating";
    var ctrl = new AbortController();
    var timeoutId = setTimeout(function() { ctrl.abort(); }, 15000);

    fetch(FUNCTION_URL, {
      method: "GET",
      headers: {
        "x-license-key": token,
        "x-layout-mode": layout,
        "x-client-fingerprint": FINGERPRINT,
        "x-ext-version": EXT_VERSION,
      },
      signal: ctrl.signal
    })
      .then(function (res) {
        clearTimeout(timeoutId);
        if (res.status === 401) {
          window.postMessage({ type: 'NEXXUS_CLEAR_LICENSE' }, '*');
          loadLoginShell();
          return null;
        }
        if (res.status === 403 || res.status === 426) {
          // Não apaga a licença — login shell tratará 426 com CTA de update.
          loadLoginShell();
          return null;
        }
        if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
          var backoff = RETRY_DELAY * Math.pow(2, attempt - 1);
          setTimeout(function () { attemptLoad(token, attempt + 1); }, backoff);
          return null;
        }
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (code) {
        if (!code) return;
        console.log("[NexxusPRO Loader] Core carregado.");
        injectScript(code);
      })
      .catch(function (err) {
        clearTimeout(timeoutId);
        console.debug("[NexxusPRO Loader] Falha ao buscar core:", err.message);
        if (attempt < MAX_RETRIES) {
          var backoff = RETRY_DELAY * Math.pow(2, attempt - 1);
          setTimeout(function () { attemptLoad(token, attempt + 1); }, backoff);
        } else {
          loadLoginShell();
        }
      });
  }

  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'NEXXUS_TOKEN_READY') {
      if (event.data.token) {
        attemptLoad(event.data.token, 1);
      } else {
        loadLoginShell();
      }
    }
  });

  window.postMessage({ type: 'NEXXUS_CHECK_TOKEN' }, '*');
})();
