/**
 * Robin Widget — Standalone vanilla JS version for non-React pages.
 * Inject on any page: <script src="/robin-widget.js"></script>
 */
(function() {
  const widget = document.createElement('div');
  widget.id = 'robin-widget';
  widget.innerHTML = `
    <div style="position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;align-items:center;gap:8px;">
      <div style="width:80px;height:80px;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.3);cursor:pointer;" id="robin-logo">
        <img src="/chef-logo.png" style="width:100%;height:100%;object-fit:cover;" draggable="false" />
      </div>
      <div style="display:flex;gap:6px;background:#d4d4d4;border-radius:24px;padding:6px 10px;">
        <button id="robin-type" title="Type" style="width:32px;height:32px;border-radius:50%;border:none;background:#c0c0c0;cursor:pointer;display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#222" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        </button>
        <button id="robin-call" title="Call" style="width:32px;height:32px;border-radius:50%;border:none;background:#c0c0c0;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.3s;">
          <svg id="robin-call-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#222" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
        </button>
        <button id="robin-share" title="Share Screen" style="width:32px;height:32px;border-radius:50%;border:none;background:#c0c0c0;cursor:pointer;display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#222" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  // Call button state machine
  let callState = 'idle'; // idle | active | hold | ending
  const callBtn = document.getElementById('robin-call');
  const callIcon = document.getElementById('robin-call-icon');
  let longPressTimer = null;

  function updateCallUI() {
    if (callState === 'active') {
      callBtn.style.background = '#bbf7d0';
      callIcon.setAttribute('stroke', '#15803d');
    } else if (callState === 'hold') {
      callBtn.style.background = '#fef3c7';
      callIcon.setAttribute('stroke', '#92400e');
    } else if (callState === 'ending') {
      callBtn.style.background = '#fecaca';
      callIcon.setAttribute('stroke', '#dc2626');
    } else {
      callBtn.style.background = '#c0c0c0';
      callIcon.setAttribute('stroke', '#222');
    }
  }

  callBtn.addEventListener('click', function() {
    if (callState === 'idle') {
      callState = 'active';
      startListening();
    } else if (callState === 'active') {
      callState = 'hold';
    } else if (callState === 'hold') {
      callState = 'active';
      startListening();
    }
    updateCallUI();
  });

  callBtn.addEventListener('pointerdown', function() {
    longPressTimer = setTimeout(function() {
      callState = 'ending';
      updateCallUI();
      setTimeout(function() { callState = 'idle'; updateCallUI(); }, 3000);
    }, 600);
  });
  callBtn.addEventListener('pointerup', function() { clearTimeout(longPressTimer); });
  callBtn.addEventListener('pointerleave', function() { clearTimeout(longPressTimer); });

  // Speech recognition
  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = function(e) {
      const t = e.results[0][0].transcript.toLowerCase();
      console.log('[Robin Widget] Heard:', t);
      // Navigate based on command
      if (t.includes('dashboard') || t.includes('home pulse')) window.location.href = '/dashboard/index.html';
      else if (t.includes('pantry') || t.includes('menu') || t.includes('food')) window.location.href = '/';
      else if (t.includes('energy')) window.location.href = '/dashboard/energy.html';
      else if (t.includes('grocery')) window.location.href = '/dashboard/grocery.html';
      else if (t.includes('cleaning')) window.location.href = '/dashboard/cleaning.html';
      else if (t.includes('security')) window.location.href = '/dashboard/security.html';
      else if (t.includes('smart') || t.includes('device')) window.location.href = '/dashboard/smart-devices.html';
    };
    rec.onerror = function() { callState = 'idle'; updateCallUI(); };
    rec.onend = function() { if (callState === 'active') { callState = 'idle'; updateCallUI(); } };
    try { rec.start(); } catch(e) {}
  }

  // Type button — navigate to PantryPilot chat
  document.getElementById('robin-type').addEventListener('click', function() {
    window.location.href = '/';
  });
})();
