/**
 * Robin Widget — Standalone vanilla JS version matching the React widget exactly.
 */
(function() {
  const widget = document.createElement('div');
  widget.id = 'robin-widget';
  widget.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;width:160px;user-select:none;';
  widget.innerHTML = `
    <button id="robin-logo" style="display:block;margin:0 auto;width:140px;height:140px;border-radius:24px;overflow:hidden;border:2px solid rgba(200,200,200,0.3);box-shadow:0 8px 32px rgba(0,0,0,0.4);cursor:pointer;padding:0;background:none;">
      <img src="/chef-logo.png" style="width:100%;height:100%;object-fit:cover;pointer-events:none;" draggable="false" />
      <span id="robin-dot" style="position:absolute;top:8px;right:8px;width:12px;height:12px;border-radius:50%;background:#666;border:2px solid rgba(0,0,0,0.3);"></span>
    </button>
    <div style="margin-top:8px;display:flex;justify-content:center;gap:8px;background:#d4d4d4;border-radius:24px;padding:8px 12px;width:fit-content;margin-left:auto;margin-right:auto;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
      <button id="robin-type" title="Type" style="width:40px;height:40px;border-radius:50%;border:none;background:#c0c0c0;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#222" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      </button>
      <button id="robin-call" title="Call" style="width:40px;height:40px;border-radius:50%;border:none;background:#c0c0c0;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.3s;">
        <svg id="robin-call-icon" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#222" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
      </button>
      <button id="robin-share" title="Share Screen" style="width:40px;height:40px;border-radius:50%;border:none;background:#c0c0c0;cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#222" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      </button>
    </div>
  `;
  document.body.appendChild(widget);

  // Make logo position relative for the dot
  document.getElementById('robin-logo').style.position = 'relative';

  // Call button state
  let callState = 'idle';
  const callBtn = document.getElementById('robin-call');
  const callIcon = document.getElementById('robin-call-icon');
  const dot = document.getElementById('robin-dot');
  let longPressTimer = null;

  function updateUI() {
    if (callState === 'active') {
      callBtn.style.background = '#bbf7d0';
      callIcon.setAttribute('stroke', '#15803d');
      dot.style.background = '#22c55e';
      dot.style.boxShadow = '0 0 6px #22c55e';
    } else if (callState === 'hold') {
      callBtn.style.background = '#fef3c7';
      callIcon.setAttribute('stroke', '#92400e');
      dot.style.background = '#f59e0b';
      dot.style.boxShadow = '0 0 6px #f59e0b';
    } else if (callState === 'ending') {
      callBtn.style.background = '#fecaca';
      callIcon.setAttribute('stroke', '#dc2626');
      dot.style.background = '#ef4444';
      dot.style.boxShadow = '0 0 6px #ef4444';
    } else {
      callBtn.style.background = '#c0c0c0';
      callIcon.setAttribute('stroke', '#222');
      dot.style.background = '#666';
      dot.style.boxShadow = 'none';
    }
  }

  callBtn.addEventListener('click', function() {
    if (callState === 'idle') { callState = 'active'; startListening(); }
    else if (callState === 'active') { callState = 'hold'; }
    else if (callState === 'hold') { callState = 'active'; startListening(); }
    updateUI();
  });

  callBtn.addEventListener('pointerdown', function() {
    longPressTimer = setTimeout(function() {
      callState = 'ending'; updateUI();
      setTimeout(function() { callState = 'idle'; updateUI(); }, 3000);
    }, 600);
  });
  callBtn.addEventListener('pointerup', function() { clearTimeout(longPressTimer); });
  callBtn.addEventListener('pointerleave', function() { clearTimeout(longPressTimer); });

  // Logo tap = also start listening
  document.getElementById('robin-logo').addEventListener('click', function() {
    if (callState === 'idle') { callState = 'active'; startListening(); updateUI(); }
  });

  function startListening() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    var rec = new SR();
    rec.continuous = false; rec.interimResults = false; rec.lang = 'en-US';
    rec.onresult = function(e) {
      var t = e.results[0][0].transcript.toLowerCase();
      console.log('[Robin] Heard:', t);
      if (t.includes('dashboard') || t.includes('home pulse') || t.includes('homepulse')) window.location.href = '/dashboard/index.html';
      else if (t.includes('pantry') || t.includes('menu') || t.includes('food') || t.includes('cook')) window.location.href = '/';
      else if (t.includes('energy')) window.location.href = '/dashboard/energy.html';
      else if (t.includes('grocery')) window.location.href = '/dashboard/grocery.html';
      else if (t.includes('cleaning') || t.includes('clean')) window.location.href = '/dashboard/cleaning.html';
      else if (t.includes('security') || t.includes('camera')) window.location.href = '/dashboard/security.html';
      else if (t.includes('smart') || t.includes('device')) window.location.href = '/dashboard/smart-devices.html';
      else if (t.includes('inventory')) window.location.href = '/';
      else if (t.includes('routine')) window.location.href = '/';
      callState = 'idle'; updateUI();
    };
    rec.onerror = function() { callState = 'idle'; updateUI(); };
    rec.onend = function() { if (callState === 'active') { callState = 'idle'; updateUI(); } };
    try { rec.start(); } catch(e) { callState = 'idle'; updateUI(); }
  }

  document.getElementById('robin-type').addEventListener('click', function() { window.location.href = '/'; });
})();
