// Extension Login Shell v3.0
// Clean white-label login widget — no branding.
(function () {
  if (document.getElementById("custom-api-chat-widget")) return;

  var EXT_VERSION = "7.5.1";
  var TOKEN_KEY = "lovable_pro_license";
  var SESSION_ID_KEY = "lovable_pro_session_id";
  var SESSION_TOKEN_KEY = "lovable_pro_session_token";
  var FINGERPRINT_KEY = "ext_client_fingerprint";
  var VALIDATE_URL =
    "https://iuvzpvhaxlrbwaitizci.supabase.co/functions/v1/fn-sv03";
  var VALIDATE_LICENSE_URL =
    "https://iuvzpvhaxlrbwaitizci.supabase.co/functions/v1/fn-vl04";
  // Public anon key — required by the Supabase Edge Functions gateway.
  // Without this header, the gateway rejects the request with 401 (HTML body),
  // which used to surface as "Erro de conexão" in the catch block.
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dnpwdmhheGxyYndhaXRpemNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MDcwNjQsImV4cCI6MjA4NzI4MzA2NH0.sFaui5qD51IdYLIYV4cAFKBdGKLkqmQu8h5K5NKEs_4";

  // Garante fingerprint estável por dispositivo
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

  var isDarkMode = localStorage.getItem("ext_dark_mode") === "true";

  var style = document.createElement("style");
  style.textContent = [
    "#custom-api-chat-widget{position:fixed;bottom:20px;right:20px;width:360px;background:hsl(0,0%,100%);border:1px solid hsl(220,13%,91%);border-radius:14px;padding:16px;z-index:999999;color:hsl(222,47%,11%);box-shadow:0 8px 30px rgba(0,0,0,0.08),0 2px 8px rgba(0,0,0,0.04);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",

    ".ext-drag-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid hsl(220,13%,91%);cursor:grab}",
    ".ext-drag-header:active{cursor:grabbing}",

    ".ext-darkmode-btn{background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:hsl(220,9%,46%);display:flex;align-items:center;justify-content:center;transition:color .2s,background .2s}",
    ".ext-darkmode-btn:hover{background:hsl(220,14%,96%);color:hsl(234,89%,56%)}",

    ".ext-input{width:100%;padding:10px 12px;background:hsl(0,0%,100%);color:hsl(222,47%,11%);border:1px solid hsl(220,13%,91%);border-radius:8px;font-size:13px;transition:border-color .2s,box-shadow .2s;outline:none;box-sizing:border-box}",
    ".ext-input:focus{border-color:hsl(234,89%,56%);box-shadow:0 0 0 3px hsla(234,89%,56%,0.1)}",
    ".ext-input::placeholder{color:hsl(220,9%,46%)}",

    ".ext-btn{width:100%;padding:10px 16px;background:hsl(234,89%,56%);color:white;border:none;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;transition:background .2s,transform .1s,box-shadow .2s;box-shadow:0 1px 3px hsla(234,89%,56%,0.3);box-sizing:border-box}",
    ".ext-btn:hover{background:hsl(234,89%,46%);box-shadow:0 4px 12px hsla(234,89%,56%,0.35)}",
    ".ext-btn:active{transform:scale(0.98)}",
    ".ext-btn:disabled{background:hsl(220,14%,96%);color:hsl(220,9%,46%);cursor:not-allowed;box-shadow:none}",

    ".ext-layout-selector{display:flex;gap:8px;margin-bottom:16px;background:hsl(220,14%,96%);padding:4px;border-radius:10px}",
    ".ext-layout-btn{flex:1;padding:8px;border:none;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:hsl(220,9%,46%);transition:all .2s}",
    ".ext-layout-btn.active{background:white;color:hsl(234,89%,56%);box-shadow:0 2px 4px rgba(0,0,0,0.05)}",
    "#custom-api-chat-widget.ext-dark .ext-layout-selector{background:hsl(222,20%,14%)}",
    "#custom-api-chat-widget.ext-dark .ext-layout-btn.active{background:hsl(222,20%,22%);color:hsl(234,89%,70%)}",

    "#login-msg{margin-top:10px;font-size:12px;font-weight:500;text-align:center;min-height:18px}",
    ".ext-error{color:hsl(0,84%,60%)}",
    ".ext-success{color:hsl(142,71%,45%)}",

    ".ext-footer{margin-top:12px;padding-top:8px;border-top:1px solid hsl(220,13%,91%)}",

    "#custom-api-chat-widget.ext-dark{background:hsl(222,20%,10%)!important;border-color:hsl(222,15%,18%)!important;color:hsl(0,0%,95%)!important}",
    "#custom-api-chat-widget.ext-dark .ext-drag-header{border-color:hsl(222,15%,18%)!important}",
    "#custom-api-chat-widget.ext-dark .ext-input{background:hsl(222,20%,14%)!important;border-color:hsl(222,15%,22%)!important;color:hsl(0,0%,95%)!important}",
    "#custom-api-chat-widget.ext-dark .ext-input::placeholder{color:hsl(220,10%,45%)!important}",
    "#custom-api-chat-widget.ext-dark .ext-darkmode-btn{color:hsl(220,10%,50%)!important}",
    "#custom-api-chat-widget.ext-dark .ext-darkmode-btn:hover{background:hsl(222,20%,18%)!important;color:hsl(234,89%,70%)!important}",
    "#custom-api-chat-widget.ext-dark .ext-footer{border-color:hsl(222,15%,18%)!important}"
  ].join("\n");
  document.head.appendChild(style);

  var moonSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  var sunSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';

  var widget = document.createElement("div");
  widget.id = "custom-api-chat-widget";
  if (isDarkMode) widget.className = "ext-dark";

  widget.innerHTML = [
    '<div class="ext-drag-header">',
    '  <div style="display:flex;align-items:center;gap:8px;">',
    '    <div style="width:8px;height:8px;border-radius:50%;background:hsl(234,89%,56%);box-shadow:0 0 6px hsla(234,89%,56%,0.4);"></div>',
    '  </div>',
    '  <div style="display:flex;align-items:center;gap:4px;">',
    '    <button id="btn-darkmode" class="ext-darkmode-btn" title="Alternar tema">' + (isDarkMode ? sunSvg : moonSvg) + '</button>',
    '  </div>',
    '</div>',

    '<div style="padding-top:4px;">',
    '  <p style="font-size:13px;color:hsl(220,9%,46%);margin-top:0;margin-bottom:16px;line-height:1.5;">Insira sua chave para ativar a extensão.</p>',
    '  <input type="text" id="license-input" class="ext-input" placeholder="Sua chave de licença..." autocomplete="off" style="margin-bottom:12px;">',
    '  <div class="ext-layout-selector">',
    '    <button class="ext-layout-btn active" data-layout="floating">Flutuante</button>',
    '    <button class="ext-layout-btn" data-layout="sidebar">Lateral</button>',
    '  </div>',
    '  <button id="btn-validate" class="ext-btn">Ativar Licença</button>',
    '  <div id="login-msg"></div>',
    '</div>',

    '<div class="ext-footer"></div>'
  ].join("\n");
  document.body.appendChild(widget);

  // Dark mode toggle
  var btnDarkMode = document.getElementById("btn-darkmode");
  btnDarkMode.addEventListener("click", function () {
    isDarkMode = !isDarkMode;
    localStorage.setItem("ext_dark_mode", isDarkMode);
    widget.className = isDarkMode ? "ext-dark" : "";
    btnDarkMode.innerHTML = isDarkMode ? sunSvg : moonSvg;
  });

  // Layout selection
  var currentLayout = localStorage.getItem("ext_layout") || "floating";
  var layoutBtns = widget.querySelectorAll(".ext-layout-btn");

  function updateLayoutUI(layout) {
    layoutBtns.forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-layout") === layout);
    });
  }

  updateLayoutUI(currentLayout);

  layoutBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      currentLayout = this.getAttribute("data-layout");
      localStorage.setItem("ext_layout", currentLayout);
      updateLayoutUI(currentLayout);
    });
  });

  // Validate license
  var input = document.getElementById("license-input");
  var btn = document.getElementById("btn-validate");
  var msg = document.getElementById("login-msg");

  // ─── Fetch with timeout + auto-retry ───
  function fetchWithRetry(url, opts, retries, delayMs) {
    return new Promise(function (resolve, reject) {
      function attempt(n) {
        var controller = new AbortController();
        // Timeout aumentado para 30s — RPC validar_licenca pode demorar sob carga.
        var timer = setTimeout(function () { controller.abort(); }, 30000);
        var fetchOpts = Object.assign({}, opts, { signal: controller.signal });
        fetch(url, fetchOpts)
          .then(function (res) { clearTimeout(timer); resolve(res); })
          .catch(function (err) {
            clearTimeout(timer);
            if (n > 0) {
              console.warn("[NexusPRO] Login attempt failed, retrying in " + delayMs + "ms...", err && err.message);
              setTimeout(function () { attempt(n - 1); }, delayMs);
            } else {
              reject(err);
            }
          });
      }
      attempt(retries);
    });
  }

  btn.addEventListener("click", function () {
    var key = (input.value || "").trim();
    if (!key) {
      msg.className = "ext-error";
      msg.textContent = "Digite sua chave de licença.";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Verificando...";
    msg.textContent = "";

    // Valida a licença diretamente via validate-license (envia fingerprint
    // já no primeiro contato para o servidor reconhecer este dispositivo).
    fetchWithRetry(VALIDATE_LICENSE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "x-license-key": key,
        "x-client-fingerprint": FINGERPRINT,
        "x-ext-version": EXT_VERSION,
      },
      body: JSON.stringify({ session_id: null, fingerprint: FINGERPRINT }),
    }, 2, 2000)
      .then(function (res) {
        // Read as text first so a non-JSON response (e.g. gateway 401 HTML)
        // doesn't throw and trigger a generic "Erro de conexão" message.
        return res.text().then(function (txt) {
          var data = null;
          try { data = txt ? JSON.parse(txt) : null; } catch (_) { data = null; }
          return { ok: res.ok, status: res.status, data: data, raw: txt };
        });
      })
      .then(function (r) {
        // ─── Version gate: extensão desatualizada (HTTP 426) ───
        if (r.status === 426 || (r.data && r.data.error_code === "ext_outdated")) {
          var url = (r.data && r.data.action_url) || "https://nexxus-pro.online/dashboard";
          var label = (r.data && r.data.action_label) || "Atualizar Extensão";
          var display = (r.data && r.data.error_display) || "Sua extensão está desatualizada. Baixe a versão mais recente para continuar.";
          msg.className = "ext-error";
          msg.innerHTML = '';
          var p = document.createElement('div');
          p.style.cssText = 'margin-bottom:10px;line-height:1.4;';
          p.textContent = display;
          var a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = label;
          a.style.cssText = 'display:inline-block;padding:8px 14px;background:hsl(234,89%,56%);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:12px;';
          msg.appendChild(p);
          msg.appendChild(a);
          btn.style.display = 'none';
          input.disabled = true;
          return;
        }
        if (!r.data || r.data.valida !== true) {
          msg.className = "ext-error";
          if (!r.data) {
            msg.textContent = "Servidor indisponível (HTTP " + r.status + "). Tente novamente.";
            return;
          }
          var motivo = r.data && r.data.motivo;
          msg.textContent = motivo === "usuario_banido"
            ? "Conta suspensa. Contate o suporte."
            : motivo === "tempo_esgotado"
              ? "Chave expirada."
              : motivo === "creditos_esgotados"
                ? "Créditos esgotados."
                : motivo === "sessao_duplicada"
                  ? "Esta chave já está em uso em outro dispositivo. Aguarde alguns minutos ou contate o suporte."
                  : motivo === "chave_inexistente"
                    ? "Chave não encontrada. Verifique e tente novamente."
                    : "Chave inválida ou expirada." + (motivo ? " (" + motivo + ")" : "");
          return;
        }
        // Persiste token + sessão antes do reload — o core já encontra tudo no localStorage.
        localStorage.setItem(TOKEN_KEY, key);
        // Cache do active_skill (piggyback) — substitui o polling do get-active-skill.
        try {
          if (Object.prototype.hasOwnProperty.call(r.data, 'active_skill')) {
            var _sk = r.data.active_skill && r.data.active_skill.name ? r.data.active_skill.name : null;
            localStorage.setItem("ext_last_active_skill", JSON.stringify({ skill: _sk, ts: Date.now() }));
          }
        } catch (_) {}
        if (r.data.session_id) {
          try {
            localStorage.setItem(SESSION_ID_KEY, r.data.session_id);
            localStorage.setItem(SESSION_TOKEN_KEY, key);
          } catch (_) {}
        }
        msg.className = "ext-success";
        msg.textContent = "✅ Licença ativada! Recarregando...";
        setTimeout(function () { location.reload(); }, 1000);
      })
      .catch(function (err) {
        msg.className = "ext-error";
        var detail = (err && err.name === "AbortError")
          ? "Tempo esgotado. Verifique sua conexão."
          : (err && err.message)
            ? "Falha de rede: " + err.message.slice(0, 80)
            : "Erro de conexão. Tente novamente.";
        msg.textContent = detail;
        console.error("[NexusPRO] Login fetch error:", err);
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = "Ativar Licença";
      });
  });

  input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") btn.click();
  });
})();
