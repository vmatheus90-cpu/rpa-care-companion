const script = document.createElement('script');
script.src = chrome.runtime.getURL('payload.js');
script.onload = function() { this.remove(); };
(document.head || document.documentElement).appendChild(script);
window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    const TOKEN_KEY = "lovable_pro_license";
    if (event.data && event.data.type === 'NEXXUS_CHECK_TOKEN') {
        chrome.storage.local.get([TOKEN_KEY], function(result) {
            let token = result[TOKEN_KEY] || localStorage.getItem(TOKEN_KEY);
            window.postMessage({ type: 'NEXXUS_TOKEN_READY', token: token }, '*');
        });
    }
    if (event.data && event.data.type === 'NEXXUS_SAVE_TOKEN') {
        chrome.storage.local.set({ [TOKEN_KEY]: event.data.token });
        localStorage.setItem(TOKEN_KEY, event.data.token);
    }
});
