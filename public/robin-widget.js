(function(){
"use strict";
if(document.getElementById("robin-widget-root"))return;

var callState="idle";
var chatOpen=false;
var transcript="";
var longPressTimer=null;

var root=document.createElement("div");
root.id="robin-widget-root";
root.style.cssText="position:fixed;top:16px;right:16px;z-index:99999;width:170px;user-select:none;touch-action:none;font-family:-apple-system,BlinkMacSystemFont,sans-serif;";
document.body.appendChild(root);

function render(){
  var cBg=callState==="active"?"#bbf7d0":callState==="hold"?"#fefce8":callState==="ending"?"#fecaca":"#c0c0c0";
  var cCol=callState==="active"?"#15803d":callState==="hold"?"#92400e":callState==="ending"?"#dc2626":"#333";
  var dot=callState==="active"?"#22c55e":callState==="hold"?"#f59e0b":callState==="ending"?"#ef4444":"#666";
  var showTranscript=(callState==="active"&&transcript);
  var html='<div id="rw-logo" style="position:relative;margin:0 auto;width:150px;height:150px;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.35);cursor:pointer;border:2px solid rgba(255,255,255,0.12);">';
  html+='<img src="/chef-logo.png" style="width:100%;height:100%;object-fit:cover;pointer-events:none;" draggable="false"/>';
  html+='<span style="position:absolute;top:10px;right:10px;width:12px;height:12px;border-radius:50%;background:'+dot+';border:2px solid rgba(0,0,0,0.25);box-shadow:0 0 8px '+dot+';"></span>';
  html+='</div>';
  html+='<div style="margin:8px auto 0;display:flex;justify-content:center;gap:8px;background:rgba(200,200,200,0.9);backdrop-filter:blur(8px);border-radius:28px;padding:8px 14px;width:fit-content;box-shadow:0 2px 10px rgba(0,0,0,0.1);">';
  html+='<button id="rw-type" title="Type" style="width:40px;height:40px;border-radius:50%;border:none;background:#c0c0c0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#333;"><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></button>';
  html+='<button id="rw-call" title="Call" style="width:40px;height:40px;border-radius:50%;border:none;background:'+cBg+';cursor:pointer;display:flex;align-items:center;justify-content:center;color:'+cCol+';transition:all 0.3s;"><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.36 1.87.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.94.34 1.91.58 2.81.7A2 2 0 0122 16.92z"/></svg></button>';
  html+='<button id="rw-share" title="Share Screen" style="width:40px;height:40px;border-radius:50%;border:none;background:#c0c0c0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#333;"><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></button>';
  html+='</div>';
  if(showTranscript){
    html+='<div style="margin:8px auto 0;background:rgba(20,20,20,0.88);backdrop-filter:blur(10px);border-radius:12px;padding:8px 12px;max-width:170px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">';
    html+='<p style="font-size:11px;color:#fff;margin:0;line-height:1.4;">'+transcript+'</p></div>';
  }
  root.innerHTML=html;
  document.getElementById("rw-logo").onclick=function(){if(callState==="idle"){callState="active";render();listen();}};
  document.getElementById("rw-call").onclick=function(){
    if(callState==="idle"){callState="active";render();listen();}
    else if(callState==="active"){callState="hold";transcript="";render();}
    else if(callState==="hold"){callState="active";render();listen();}
  };
  document.getElementById("rw-call").onpointerdown=function(){longPressTimer=setTimeout(function(){callState="ending";transcript="";render();setTimeout(function(){callState="idle";render();},3000);},600);};
  document.getElementById("rw-call").onpointerup=function(){clearTimeout(longPressTimer);};
  document.getElementById("rw-call").onpointerleave=function(){clearTimeout(longPressTimer);};
  document.getElementById("rw-type").onclick=function(){toggleChat();};
}

function listen(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){callState="idle";render();return;}
  var rec=new SR();rec.continuous=false;rec.interimResults=true;rec.lang="en-US";
  transcript="Listening...";render();
  rec.onresult=function(e){
    var ft="",it="";
    for(var i=0;i<e.results.length;i++){if(e.results[i].isFinal)ft+=e.results[i][0].transcript;else it+=e.results[i][0].transcript;}
    transcript=ft||it||"Listening...";render();
    if(ft){
      var t=ft.toLowerCase();
      console.log("[Robin] Heard:",t);
      processVoice(t);
      transcript="";callState="idle";render();
    }
  };
  rec.onerror=function(){if(callState==="active")setTimeout(listen,500);};
  rec.onend=function(){if(callState==="active")setTimeout(listen,200);};
  try{rec.start();}catch(x){if(callState==="active")setTimeout(listen,1000);}
}

function processVoice(t){
  if(t.includes("dashboard")||t.includes("homepulse"))window.location.href="/dashboard/index.html";
  else if(t.includes("energy"))window.location.href="/dashboard/energy.html";
  else if(t.includes("grocery"))window.location.href="/dashboard/grocery.html";
  else if(t.includes("clean"))window.location.href="/dashboard/cleaning.html";
  else if(t.includes("security")||t.includes("camera"))window.location.href="/dashboard/security.html";
  else if(t.includes("smart")||t.includes("device"))window.location.href="/dashboard/smart-devices.html";
  else if(t.includes("pantry")||t.includes("menu")||t.includes("food")||t.includes("cook"))window.location.href="/";
  else if(t.includes("inventory")||t.includes("running out")||t.includes("running low")||t.includes("ingredient")){window.location.href="/";setTimeout(function(){window.dispatchEvent(new CustomEvent("robin-navigate",{detail:"inventory"}));},500);}
  else if(t.includes("routine")||t.includes("schedule"))window.dispatchEvent(new CustomEvent("robin-navigate",{detail:"routine"}));
  else if(t.includes("light mode"))window.dispatchEvent(new CustomEvent("robin-theme",{detail:"light"}));
  else if(t.includes("dark mode"))window.dispatchEvent(new CustomEvent("robin-theme",{detail:"dark"}));
}

function toggleChat(){
  chatOpen=!chatOpen;
  var panel=document.getElementById("rw-chat-panel");
  if(chatOpen){
    if(!panel){buildChat();}
    else{panel.style.display="flex";}
    loadSession();applyTheme();
  }else{if(panel)panel.style.display="none";}
}

function buildChat(){
  var dark=isDark();
  var panel=document.createElement("div");
  panel.id="rw-chat-panel";
  panel.style.cssText="position:fixed;bottom:80px;right:16px;z-index:99998;width:380px;max-width:calc(100vw - 32px);height:400px;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.25);display:flex;flex-direction:column;overflow:hidden;border:1px solid #333;background:#1a1a2e;color:#e6edf3;";
  panel.innerHTML='<div style="padding:10px 16px;border-bottom:1px solid #333;display:flex;align-items:center;justify-content:space-between;"><div style="display:flex;align-items:center;gap:8px;"><img src="/chef-logo.png" style="width:24px;height:24px;border-radius:6px;object-fit:cover;"/><span style="font-weight:600;font-size:13px;">Robin</span><span style="width:6px;height:6px;border-radius:50%;background:#22c55e;"></span></div><div style="display:flex;gap:6px;"><button id="rw-sessions-btn" title="History" style="border:none;background:none;cursor:pointer;font-size:13px;opacity:0.6;color:inherit;">&#128196;</button><button id="rw-new-chat" title="New Chat" style="border:none;background:none;cursor:pointer;font-size:13px;opacity:0.6;color:inherit;">&#10010;</button><button id="rw-chat-close" style="border:none;background:none;cursor:pointer;font-size:15px;opacity:0.6;color:inherit;">&#10005;</button></div></div><div id="rw-msgs" style="flex:1;overflow-y:auto;padding:12px 16px;font-size:13px;"></div><div style="padding:8px 12px;border-top:1px solid #333;display:flex;gap:8px;"><input id="rw-input" type="text" placeholder="Type a message..." style="flex:1;border:1px solid #444;border-radius:20px;padding:8px 14px;font-size:13px;outline:none;background:#111;color:#fff;"/><button id="rw-send" style="border:none;background:#1a73e8;color:#fff;border-radius:50%;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button></div>';
  document.body.appendChild(panel);
  document.getElementById("rw-chat-close").onclick=function(){toggleChat();};
  document.getElementById("rw-send").onclick=sendMsg;
  document.getElementById("rw-input").onkeydown=function(e){if(e.key==="Enter")sendMsg();};
  document.getElementById("rw-new-chat").onclick=newSession;
  document.getElementById("rw-sessions-btn").onclick=showSessions;
}

function isDark(){return document.documentElement.classList.contains("dark")||document.body.classList.contains("dark-mode");}
function applyTheme(){
  var p=document.getElementById("rw-chat-panel");if(!p)return;
  var d=isDark();
  p.style.background=d?"#1a1a2e":"#fff";
  p.style.borderColor=d?"#333":"#ddd";
  p.style.color=d?"#e6edf3":"#1a2332";
  var inp=document.getElementById("rw-input");
  if(inp){inp.style.background=d?"#111":"#fff";inp.style.color=d?"#fff":"#333";inp.style.borderColor=d?"#444":"#ddd";}
}

function getSessions(){try{return JSON.parse(localStorage.getItem("robin_sessions")||"[]");}catch(e){return[];}}
function saveSessions(s){try{localStorage.setItem("robin_sessions",JSON.stringify(s));}catch(e){}}
function curId(){return localStorage.getItem("robin_sid")||null;}
function setCurId(id){localStorage.setItem("robin_sid",id);}

function loadSession(){
  var ss=getSessions(),id=curId(),s=ss.find(function(x){return x.id===id;});
  if(!s){s={id:"s"+Date.now(),msgs:[{r:"robin",t:"Hey! How can I help?"}],ts:Date.now()};ss.push(s);saveSessions(ss);setCurId(s.id);}
  var c=document.getElementById("rw-msgs");if(!c)return;c.innerHTML="";
  s.msgs.forEach(function(m){renderBubble(m.r,m.t);});c.scrollTop=c.scrollHeight;
}
function newSession(){
  var s={id:"s"+Date.now(),msgs:[{r:"robin",t:"New chat. What do you need?"}],ts:Date.now()};
  var ss=getSessions();ss.push(s);saveSessions(ss);setCurId(s.id);loadSession();
}
function showSessions(){
  var c=document.getElementById("rw-msgs");if(!c)return;var ss=getSessions();
  c.innerHTML="<div style='font-size:11px;font-weight:600;opacity:0.5;margin-bottom:8px;'>CHAT HISTORY</div>";
  ss.slice().reverse().forEach(function(s){
    var d=document.createElement("div");
    d.style.cssText="padding:8px 10px;border-radius:8px;cursor:pointer;margin-bottom:6px;border:1px solid #444;";
    d.textContent=new Date(s.ts).toLocaleDateString()+" - "+(s.msgs.length-1)+" messages";
    d.onclick=function(){setCurId(s.id);loadSession();};c.appendChild(d);
  });
}

function renderBubble(role,text){
  var c=document.getElementById("rw-msgs");if(!c)return;
  var d=document.createElement("div");
  d.style.cssText=role==="robin"?"margin-bottom:8px;padding:8px 12px;background:rgba(100,100,120,0.2);border-radius:12px;border-top-left-radius:4px;max-width:85%;font-size:12px;":"margin-bottom:8px;padding:8px 12px;background:#1a73e8;color:#fff;border-radius:12px;border-top-right-radius:4px;max-width:85%;margin-left:auto;font-size:12px;";
  d.textContent=text;c.appendChild(d);c.scrollTop=c.scrollHeight;
}
function addMsg(role,text){
  renderBubble(role,text);
  var ss=getSessions(),id=curId(),s=ss.find(function(x){return x.id===id;});
  if(s){s.msgs.push({r:role,t:text});saveSessions(ss);}
}

var KNOWLEDGE={
  lowStock:["Spinach","Broccoli","Apple","Banana","Oranges","Chicken Breast","Eggs","Sourdough","Whole Milk","Bagels","Orange Juice"],
  categories:["Veggies","Fruits","Meat","Staples","Breads","Dairy","Beverages"],
  meals:["Caesar Salad","Chicken Strips","Agliolio Spaghetti","Guacamole","Chicken Stir Fry","Poha Bowl","Veggie Omelette","Pasta Bolognese","Avocado Toast","Chicken Burger"]
};

function sendMsg(){
  var inp=document.getElementById("rw-input");var text=inp.value.trim();if(!text)return;
  addMsg("user",text);inp.value="";
  setTimeout(function(){
    var t=text.toLowerCase(),r="",nav=null;
    if(t.includes("running out")||t.includes("running low")||t.includes("ingredient")||t.includes("what do i need")||t.includes("low on")){
      r="Running low on: "+KNOWLEDGE.lowStock.join(", ")+". Want me to open inventory?";nav="inventory";
    }else if(t.includes("what can i")||t.includes("cook")||t.includes("recipe")||t.includes("hungry")||t.includes("suggest")){
      r="You can make: "+KNOWLEDGE.meals.slice(0,5).join(", ")+". Open menu?";nav="menu";
    }else if(t.includes("menu")||t.includes("food")){r="Opening menu.";nav="menu";
    }else if(t.includes("inventory")||t.includes("pantry")||t.includes("stock")){r="Opening inventory.";nav="inventory";
    }else if(t.includes("routine")||t.includes("schedule")){r="Opening routine.";nav="routine";
    }else if(t.includes("dashboard")||t.includes("homepulse")){r="Going to HomePulse.";setTimeout(function(){window.location.href="/dashboard/index.html";},800);
    }else if(t.includes("energy")){r="Opening energy details.";setTimeout(function(){window.location.href="/dashboard/energy.html";},800);
    }else if(t.includes("clean")){r="Opening cleaning.";setTimeout(function(){window.location.href="/dashboard/cleaning.html";},800);
    }else if(t.includes("security")||t.includes("camera")){r="Opening security.";setTimeout(function(){window.location.href="/dashboard/security.html";},800);
    }else if(t.includes("dark mode")||t.includes("dark theme")){r="Dark mode on.";window.dispatchEvent(new CustomEvent("robin-theme",{detail:"dark"}));
    }else if(t.includes("light mode")||t.includes("light theme")){r="Light mode on.";window.dispatchEvent(new CustomEvent("robin-theme",{detail:"light"}));
    }else if(t.includes("hi")||t.includes("hello")||t.includes("hey")){r="Hey! What can I help with?";
    }else if(t.includes("thanks")){r="You're welcome!";
    }else if(t.includes("yes")||t.includes("sure")||t.includes("show me")){
      r="Opening that for you.";nav="inventory";
    }else{r="I can help with: inventory, menu, routine, dashboard, energy, security, or cleaning. Try asking!";}
    addMsg("robin",r);
    if(nav)window.dispatchEvent(new CustomEvent("robin-navigate",{detail:nav}));
  },300);
}

// Dark mode sync
var saved=localStorage.getItem("robin_theme");
if(saved==="dark"){document.documentElement.classList.add("dark");document.body.classList.add("dark-mode");}
else if(saved==="light"){document.documentElement.classList.remove("dark");document.body.classList.remove("dark-mode");}
window.addEventListener("robin-theme",function(e){
  var m=e.detail;localStorage.setItem("robin_theme",m);
  if(m==="dark"){document.documentElement.classList.add("dark");document.body.classList.add("dark-mode");}
  else{document.documentElement.classList.remove("dark");document.body.classList.remove("dark-mode");}
  applyTheme();
});

render();
})();
