/**
 * Robin Widget v2 — ONE widget, ONE codebase, ONE render.
 * Include on ANY page: <script src="/robin-widget.js"></script>
 * Works on React pages, plain HTML pages, anywhere.
 */
(function() {
  if (document.getElementById('robin-widget-root')) return; // Already loaded

  // State
  let callState = 'idle'; // idle | active | hold | ending
  let longPressTimer = null;

  // Create widget
  const root = document.createElement('div');
  root.id = 'robin-widget-root';
  root.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;width:160px;user-select:none;touch-action:none;font-family:-apple-system,BlinkMacSystemFont,sans-serif;';

  // Icons as SVG strings
  const ICONS = {
    phone: '<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>',
    phoneActive: '<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/><path d="M14.5 2c3 .5 5.5 3 6 6M14.5 5.5c1.5.5 2.5 1.5 3 3" stroke-linecap="round"/></svg>',
    phoneMuted: '<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/><line x1="3" y1="3" x2="21" y2="21" stroke-linecap="round"/></svg>',
    phoneEnd: '<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/><circle cx="18" cy="6" r="4" fill="currentColor" stroke="none"/><path d="M16.5 4.5l3 3M19.5 4.5l-3 3" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>',
    chat: '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    screen: '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M17 8l-5 5-5-5" stroke-linecap="round"/></svg>'
  };

  function render() {
    const callBg = callState === 'active' ? '#bbf7d0' : callState === 'hold' ? '#fefce8' : callState === 'ending' ? '#fecaca' : '#c0c0c0';
    const callColor = callState === 'active' ? '#15803d' : callState === 'hold' ? '#92400e' : callState === 'ending' ? '#dc2626' : '#333';
    const callIcon = callState === 'active' ? ICONS.phoneActive : callState === 'hold' ? ICONS.phoneMuted : callState === 'ending' ? ICONS.phoneEnd : ICONS.phone;
    const dotColor = callState === 'active' ? '#22c55e' : callState === 'hold' ? '#f59e0b' : callState === 'ending' ? '#ef4444' : '#666';
    const dotShadow = callState !== 'idle' ? '0 0 8px ' + dotColor : 'none';

    root.innerHTML = `
      <div style="position:relative;margin:0 auto;width:140px;height:140px;border-radius:24px;overflow:hidden;border:2px solid rgba(200,200,200,0.3);box-shadow:0 8px 32px rgba(0,0,0,0.3);cursor:pointer;" id="rw-logo">
        <img src="/chef-logo.png" style="width:100%;height:100%;object-fit:cover;pointer-events:none;" draggable="false"/>
        <span style="position:absolute;top:8px;right:8px;width:12px;height:12px;border-radius:50%;background:${dotColor};border:2px solid rgba(0,0,0,0.2);box-shadow:${dotShadow};"></span>
      </div>
      <div style="margin:8px auto 0;display:flex;justify-content:center;gap:8px;background:#d4d4d4;border-radius:28px;padding:8px 14px;width:fit-content;box-shadow:0 2px 10px rgba(0,0,0,0.12);">
        <button id="rw-type" title="Type" style="width:42px;height:42px;border-radius:50%;border:none;background:#c0c0c0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#333;transition:all 0.2s;">${ICONS.chat}</button>
        <button id="rw-call" title="${callState === 'active' ? 'On Call' : callState === 'hold' ? 'On Hold' : callState === 'ending' ? 'Ending' : 'Call'}" style="width:42px;height:42px;border-radius:50%;border:none;background:${callBg};cursor:pointer;display:flex;align-items:center;justify-content:center;color:${callColor};transition:all 0.3s;">${callIcon}</button>
        <button id="rw-share" title="Share Screen" style="width:42px;height:42px;border-radius:50%;border:none;background:#c0c0c0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#333;transition:all 0.2s;">${ICONS.screen}</button>
      </div>
    `;

    // Bind events after render
    document.getElementById('rw-logo').onclick = function() {
      if (callState === 'idle') { callState = 'active'; render(); startListening(); }
    };
    document.getElementById('rw-call').onclick = function() {
      if (callState === 'idle') { callState = 'active'; render(); startListening(); }
      else if (callState === 'active') { callState = 'hold'; render(); }
      else if (callState === 'hold') { callState = 'active'; render(); startListening(); }
    };
    document.getElementById('rw-call').onpointerdown = function() {
      longPressTimer = setTimeout(function() {
        callState = 'ending'; render();
        setTimeout(function() { callState = 'idle'; render(); }, 3000);
      }, 600);
    };
    document.getElementById('rw-call').onpointerup = function() { clearTimeout(longPressTimer); };
    document.getElementById('rw-call').onpointerleave = function() { clearTimeout(longPressTimer); };
    document.getElementById('rw-type').onclick = function() {
      // Navigate to PantryPilot home (chat)
      if (window.location.pathname !== '/') window.location.href = '/';
      // If already on PantryPilot, dispatch event to open chat
      else window.dispatchEvent(new CustomEvent('robin-open-chat'));
    };
  }

  // Speech recognition
  function startListening() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { callState = 'idle'; render(); return; }
    var rec = new SR();
    rec.continuous = false; rec.interimResults = false; rec.lang = 'en-US';
    rec.onresult = function(e) {
      var t = e.results[0][0].transcript.toLowerCase();
      console.log('[Robin] Heard:', t);
      // Navigation commands
      if (t.includes('dashboard') || t.includes('home pulse') || t.includes('homepulse')) window.location.href = '/dashboard/index.html';
      else if (t.includes('energy')) window.location.href = '/dashboard/energy.html';
      else if (t.includes('grocery')) window.location.href = '/dashboard/grocery.html';
      else if (t.includes('clean')) window.location.href = '/dashboard/cleaning.html';
      else if (t.includes('security') || t.includes('camera')) window.location.href = '/dashboard/security.html';
      else if (t.includes('smart') || t.includes('device')) window.location.href = '/dashboard/smart-devices.html';
      else if (t.includes('pantry') || t.includes('menu') || t.includes('food') || t.includes('cook') || t.includes('inventory')) window.location.href = '/';
      else if (t.includes('routine') || t.includes('schedule')) { window.location.href = '/'; window.dispatchEvent(new CustomEvent('robin-navigate', {detail:'routine'})); }
      else if (t.includes('light mode') || t.includes('light theme')) window.dispatchEvent(new CustomEvent('robin-theme', {detail:'light'}));
      else if (t.includes('dark mode') || t.includes('dark theme')) window.dispatchEvent(new CustomEvent('robin-theme', {detail:'dark'}));
      callState = 'idle'; render();
    };
    rec.onerror = function() { callState = 'idle'; render(); };
    rec.onend = function() { if (callState === 'active') { callState = 'idle'; render(); } };
    try { rec.start(); } catch(e) { callState = 'idle'; render(); }
  }

  document.body.appendChild(root);
  render();
})();
