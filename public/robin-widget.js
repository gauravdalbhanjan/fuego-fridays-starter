(function(){
if(document.getElementById("robin-widget-root"))return;
var callState="idle",longPressTimer=null,chatOpen=false;
var root=document.createElement("div");
root.id="robin-widget-root";
root.style.cssText="position:fixed;top:16px;right:16px;z-index:99999;width:160px;user-select:none;touch-action:none;font-family:-apple-system,BlinkMacSystemFont,sans-serif;";
var PHONE='<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.36 1.87.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.94.34 1.91.58 2.81.7A2 2 0 0122 16.92z"/></svg>';
var PHONE_ACTIVE='<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.36 1.87.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.94.34 1.91.58 2.81.7A2 2 0 0122 16.92z"/><path d="M14.5 2c3 .5 5.5 3 6 6M14.5 5.5c1.5.5 2.5 1.5 3 3" stroke-linecap="round"/></svg>';
var PHONE_MUTED='<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.36 1.87.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.94.34 1.91.58 2.81.7A2 2 0 0122 16.92z"/><line x1="3" y1="3" x2="21" y2="21" stroke-linecap="round"/></svg>';
var PHONE_END='<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.36 1.87.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.94.34 1.91.58 2.81.7A2 2 0 0122 16.92z"/><line x1="18" y1="2" x2="18" y2="10" stroke-linecap="round" stroke="red"/><line x1="14" y1="6" x2="22" y2="6" stroke-linecap="round" stroke="red"/></svg>';
var CHAT_ICON='<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
var SCREEN_ICON='<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>';

function render(){
  var callBg=callState==="active"?"#bbf7d0":callState==="hold"?"#fefce8":callState==="ending"?"#fecaca":"#c0c0c0";
  var callColor=callState==="active"?"#15803d":callState==="hold"?"#92400e":callState==="ending"?"#dc2626":"#333";
  var icon=callState==="active"?PHONE_ACTIVE:callState==="hold"?PHONE_MUTED:callState==="ending"?PHONE_END:PHONE;
  var dotColor=callState==="active"?"#22c55e":callState==="hold"?"#f59e0b":callState==="ending"?"#ef4444":"#666";
  var dotShadow=callState!=="idle"?"0 0 8px "+dotColor:"none";
  root.innerHTML='<div style="position:relative;margin:0 auto;width:140px;height:140px;border-radius:24px;overflow:hidden;border:2px solid rgba(200,200,200,0.3);box-shadow:0 8px 32px rgba(0,0,0,0.3);cursor:pointer;" id="rw-logo"><img src="/chef-logo.png" style="width:100%;height:100%;object-fit:cover;pointer-events:none;" draggable="false"/><span style="position:absolute;top:8px;right:8px;width:12px;height:12px;border-radius:50%;background:'+dotColor+';border:2px solid rgba(0,0,0,0.2);box-shadow:'+dotShadow+';"></span></div><div style="margin:8px auto 0;display:flex;justify-content:center;gap:8px;background:#d4d4d4;border-radius:28px;padding:8px 14px;width:fit-content;box-shadow:0 2px 10px rgba(0,0,0,0.12);"><button id="rw-type" title="Type" style="width:42px;height:42px;border-radius:50%;border:none;background:#c0c0c0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#333;">'+CHAT_ICON+'</button><button id="rw-call" title="Call" style="width:42px;height:42px;border-radius:50%;border:none;background:'+callBg+';cursor:pointer;display:flex;align-items:center;justify-content:center;color:'+callColor+';transition:all 0.3s;">'+icon+'</button><button id="rw-share" title="Share Screen" style="width:42px;height:42px;border-radius:50%;border:none;background:#c0c0c0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#333;">'+SCREEN_ICON+'</button></div>';
  bind();
}

function bind(){
  document.getElementById("rw-logo").onclick=function(){if(callState==="idle"){callState="active";render();startListening();}};
  document.getElementById("rw-call").onclick=function(){
    if(callState==="idle"){callState="active";render();startListening();}
    else if(callState==="active"){callState="hold";render();}
    else if(callState==="hold"){callState="active";render();startListening();}
  };
  document.getElementById("rw-call").onpointerdown=function(){longPressTimer=setTimeout(function(){callState="ending";render();setTimeout(function(){callState="idle";render();},3000);},600);};
  document.getElementById("rw-call").onpointerup=function(){clearTimeout(longPressTimer);};
  document.getElementById("rw-call").onpointerleave=function(){clearTimeout(longPressTimer);};
  document.getElementById("rw-type").onclick=function(){toggleChat();};
}

function startListening(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){callState="idle";render();return;}
  var rec=new SR();rec.continuous=false;rec.interimResults=false;rec.lang="en-US";
  rec.onresult=function(e){
    var t=e.results[0][0].transcript.toLowerCase();
    console.log("[Robin] Heard:",t);
    if(t.includes("dashboard")||t.includes("homepulse"))window.location.href="/dashboard/index.html";
    else if(t.includes("energy"))window.location.href="/dashboard/energy.html";
    else if(t.includes("grocery"))window.location.href="/dashboard/grocery.html";
    else if(t.includes("clean"))window.location.href="/dashboard/cleaning.html";
    else if(t.includes("security")||t.includes("camera"))window.location.href="/dashboard/security.html";
    else if(t.includes("smart")||t.includes("device"))window.location.href="/dashboard/smart-devices.html";
    else if(t.includes("pantry")||t.includes("menu")||t.includes("food")||t.includes("inventory"))window.location.href="/";
    else if(t.includes("routine"))window.dispatchEvent(new CustomEvent("robin-navigate",{detail:"routine"}));
    else if(t.includes("light mode"))window.dispatchEvent(new CustomEvent("robin-theme",{detail:"light"}));
    else if(t.includes("dark mode"))window.dispatchEvent(new CustomEvent("robin-theme",{detail:"dark"}));
    callState="idle";render();
  };
  rec.onerror=function(){callState="idle";render();};
  rec.onend=function(){if(callState==="active"){callState="idle";render();}};
  try{rec.start();}catch(e){callState="idle";render();}
}

function toggleChat(){
  chatOpen=!chatOpen;
  var panel=document.getElementById("rw-chat-panel");
  if(chatOpen){
    if(!panel){buildChatPanel();}
    else{panel.style.display="flex";applyTheme();}
    loadCurrentSession();
  }else{if(panel)panel.style.display="none";}
}

function isDark(){return document.documentElement.classList.contains("dark")||document.body.classList.contains("dark-mode");}

function applyTheme(){
  var panel=document.getElementById("rw-chat-panel");if(!panel)return;
  var dark=isDark();
  panel.style.background=dark?"#1a1a2e":"#fff";
  panel.style.borderColor=dark?"#333":"#ddd";
  panel.style.color=dark?"#e6edf3":"#1a2332";
  var msgs=document.getElementById("rw-chat-messages");if(msgs)msgs.style.background=dark?"#0d1117":"#fff";
  var inp=document.getElementById("rw-chat-input");
  if(inp){inp.style.background=dark?"#161b22":"#fff";inp.style.color=dark?"#e6edf3":"#333";inp.style.borderColor=dark?"#30363d":"#ddd";}
}

function buildChatPanel(){
  var panel=document.createElement("div");
  panel.id="rw-chat-panel";
  panel.style.cssText="position:fixed;bottom:80px;right:16px;z-index:99998;width:380px;max-width:calc(100vw - 32px);height:420px;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.25);display:flex;flex-direction:column;overflow:hidden;border:1px solid #ddd;background:#fff;";
  panel.innerHTML='<div id="rw-header" style="padding:10px 16px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;"><div style="display:flex;align-items:center;gap:8px;"><img src="/chef-logo.png" style="width:26px;height:26px;border-radius:8px;object-fit:cover;"/><span style="font-weight:600;font-size:13px;">Robin</span><span style="width:6px;height:6px;border-radius:50%;background:#22c55e;"></span></div><div style="display:flex;gap:6px;"><button id="rw-sessions-btn" title="Chat History" style="border:none;background:none;cursor:pointer;font-size:14px;opacity:0.6;">&#128196;</button><button id="rw-new-chat" title="New Chat" style="border:none;background:none;cursor:pointer;font-size:14px;opacity:0.6;">&#10010;</button><button id="rw-chat-close" style="border:none;background:none;cursor:pointer;font-size:16px;opacity:0.6;">&#10005;</button></div></div><div id="rw-chat-messages" style="flex:1;overflow-y:auto;padding:12px 16px;font-size:13px;"></div><div style="padding:8px 12px;border-top:1px solid #eee;display:flex;gap:8px;"><input id="rw-chat-input" type="text" placeholder="Type a message..." style="flex:1;border:1px solid #ddd;border-radius:20px;padding:8px 14px;font-size:13px;outline:none;"/><button id="rw-chat-send" style="border:none;background:#1a73e8;color:#fff;border-radius:50%;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button></div>';
  document.body.appendChild(panel);
  document.getElementById("rw-chat-close").onclick=function(){toggleChat();};
  document.getElementById("rw-chat-send").onclick=sendMsg;
  document.getElementById("rw-chat-input").onkeydown=function(e){if(e.key==="Enter")sendMsg();};
  document.getElementById("rw-new-chat").onclick=startNewSession;
  document.getElementById("rw-sessions-btn").onclick=showSessions;
  applyTheme();
}

// Session management
function getSessions(){try{return JSON.parse(localStorage.getItem("robin_sessions")||"[]");}catch(e){return[];}}
function saveSessions(s){try{localStorage.setItem("robin_sessions",JSON.stringify(s));}catch(e){}}
function getCurrentSessionId(){return localStorage.getItem("robin_current_session")||null;}
function setCurrentSessionId(id){localStorage.setItem("robin_current_session",id);}

function loadCurrentSession(){
  var sessions=getSessions();
  var id=getCurrentSessionId();
  var session=sessions.find(function(s){return s.id===id;});
  if(!session){session={id:"s_"+Date.now(),messages:[{role:"robin",text:"Hey! I\u2019m Robin. How can I help?"}],created:Date.now()};sessions.push(session);saveSessions(sessions);setCurrentSessionId(session.id);}
  var c=document.getElementById("rw-chat-messages");if(!c)return;
  c.innerHTML="";
  session.messages.forEach(function(m){renderMsg(m.role,m.text);});
  c.scrollTop=c.scrollHeight;
}

function startNewSession(){
  var session={id:"s_"+Date.now(),messages:[{role:"robin",text:"New conversation started. What can I do for you?"}],created:Date.now()};
  var sessions=getSessions();sessions.push(session);saveSessions(sessions);setCurrentSessionId(session.id);
  loadCurrentSession();
}

function showSessions(){
  var c=document.getElementById("rw-chat-messages");if(!c)return;
  var sessions=getSessions();
  c.innerHTML="<div style='font-size:12px;font-weight:600;margin-bottom:8px;opacity:0.6;'>CHAT HISTORY</div>";
  if(sessions.length===0){c.innerHTML+="<div style='font-size:12px;opacity:0.5;'>No sessions yet.</div>";return;}
  sessions.slice().reverse().forEach(function(s){
    var d=document.createElement("div");
    var preview=s.messages.length>1?s.messages[s.messages.length-1].text.substring(0,40)+"...":"Empty";
    var date=new Date(s.created).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
    var isActive=s.id===getCurrentSessionId();
    d.style.cssText="padding:10px 12px;border-radius:8px;cursor:pointer;margin-bottom:6px;border:1px solid "+(isActive?"#1a73e8":"#eee")+";background:"+(isActive?"#e8f0fe":"transparent")+";";
    d.innerHTML="<div style='font-size:12px;font-weight:500;'>"+date+"</div><div style='font-size:11px;opacity:0.6;margin-top:2px;'>"+preview+"</div>";
    d.onclick=function(){setCurrentSessionId(s.id);loadCurrentSession();};
    c.appendChild(d);
  });
}

function addMsg(role,text){
  renderMsg(role,text);
  // Save to current session
  var sessions=getSessions();var id=getCurrentSessionId();
  var session=sessions.find(function(s){return s.id===id;});
  if(session){session.messages.push({role:role,text:text});saveSessions(sessions);}
}

function renderMsg(role,text){
  var c=document.getElementById("rw-chat-messages");if(!c)return;
  var dark=isDark();
  var d=document.createElement("div");
  if(role==="robin"){d.style.cssText="margin-bottom:10px;padding:8px 12px;background:"+(dark?"#1c2333":"#f0f4f8")+";border-radius:12px;border-top-left-radius:4px;max-width:85%;color:"+(dark?"#e6edf3":"#333")+";";}
  else{d.style.cssText="margin-bottom:10px;padding:8px 12px;background:#1a73e8;color:#fff;border-radius:12px;border-top-right-radius:4px;max-width:85%;margin-left:auto;";}
  d.textContent=text;c.appendChild(d);c.scrollTop=c.scrollHeight;
}
function sendMsg(){
  var inp=document.getElementById("rw-chat-input");var text=inp.value.trim();if(!text)return;
  addMsg("user",text);inp.value="";
  if(!window._robinMemory)window._robinMemory={history:[],learned:{},preferences:{},context:null};
  var mem=window._robinMemory;
  mem.history.push({role:"user",text:text,time:Date.now()});
  try{localStorage.setItem("robin_memory",JSON.stringify(mem));}catch(e){}

  // Knowledge base - Robin knows the app data
  var KNOWLEDGE={
    lowStock:["Spinach","Broccoli","Apple","Banana","Oranges","Chicken Breast","Eggs","Sourdough","Whole Milk","Bagels","Orange Juice"],
    categories:["Veggies","Fruits","Meat","Staples","Breads","Dairy","Beverages"],
    meals:["Caesar Salad","Bundt Cake","Chicken Strips","Agliolio Spaghetti","Caesar Wrap","Bacon Ham Sandwich","Guacamole","Chicken Stir Fry","Poha Bowl","Veggie Omelette","Grilled Salmon","Banana Smoothie","Pasta Bolognese","Avocado Toast","Chicken Burger","French Fries"],
    energy:{usage:"342 kWh",cost:"$89.40",solar:"128 kWh"},
    cleaning:{low:["Laundry Detergent","Glass Cleaner","Sponges"],stock:14},
    security:{cameras:4,events:2,storage:"67%"},
    devices:{connected:18,updates:2,uptime:"99.9%"}
  };

  setTimeout(function(){
    var t=text.toLowerCase(),r="",action=null;

    // Check learned commands first
    for(var key in mem.learned){if(t.includes(key)){r=mem.learned[key].response;action=mem.learned[key].action;break;}}

    if(!r){
      // CONTEXTUAL UNDERSTANDING - ingredients, running out, what do I need
      if(t.includes("running out")||t.includes("running low")||t.includes("low on")||t.includes("need to buy")||t.includes("ingredient")||t.includes("what am i running")||t.includes("what's running")||t.includes("almost out")||t.includes("about to run out")||t.includes("need to restock")||t.includes("what do i need")){
        r="You're running low on: "+KNOWLEDGE.lowStock.join(", ")+". That's "+KNOWLEDGE.lowStock.length+" items that need restocking soon. Want me to add them to your cart?";
        mem.context="confirm_order";
      }
      else if(t.includes("what do i have")||t.includes("what's in")||t.includes("pantry status")||t.includes("inventory status")||t.includes("what's available")||t.includes("in my kitchen")||t.includes("what food")){
        r="Your pantry has items across "+KNOWLEDGE.categories.length+" categories: "+KNOWLEDGE.categories.join(", ")+". "+KNOWLEDGE.lowStock.length+" items are running low. Want me to show the full inventory?";
        mem.context="show_inventory";
      }
      else if(t.includes("what can i cook")||t.includes("what can i make")||t.includes("recipe")||t.includes("meal suggestion")||t.includes("suggest something")||t.includes("hungry")||t.includes("what to eat")||t.includes("dinner idea")||t.includes("lunch idea")||t.includes("breakfast idea")){
        var available=KNOWLEDGE.meals.slice(0,5);
        r="Based on what's in stock, you can make: "+available.join(", ")+". Want me to open the menu with all options?";
        mem.context="suggesting_meal";
      }
      else if(t.includes("how much")||t.includes("cost")||t.includes("spend")||t.includes("budget")||t.includes("expensive")){
        if(t.includes("energy")||t.includes("electric")){r="Energy cost this month: "+KNOWLEDGE.energy.cost+" (above $75 target). Usage: "+KNOWLEDGE.energy.usage+". Want to see the breakdown?";}
        else if(t.includes("grocery")||t.includes("food")){r="Grocery spend this month: $487 across 29 items. That's up 5.2% from last month. Want details?";}
        else{r="Here's your spending: Energy "+KNOWLEDGE.energy.cost+", Groceries $487, Cleaning $34. Which one do you want to dig into?";}
        mem.context="cost_details";
      }
      else if(t.includes("energy")||t.includes("electricity")||t.includes("power")||t.includes("kwh")||t.includes("solar")||t.includes("bill")){
        r="Your energy this month: "+KNOWLEDGE.energy.usage+" used, "+KNOWLEDGE.energy.solar+" from solar, costing "+KNOWLEDGE.energy.cost+". That's above your $75 target. Want details?";
        action={type:"url",url:"/dashboard/energy.html"};
      }
      else if(t.includes("cleaning")||t.includes("supplies")||t.includes("detergent")||t.includes("soap")){
        r="Cleaning supplies: "+KNOWLEDGE.cleaning.stock+" items in stock. Running low on: "+KNOWLEDGE.cleaning.low.join(", ")+". Next auto-order in 5 days.";
        action={type:"url",url:"/dashboard/cleaning.html"};
      }
      else if(t.includes("security")||t.includes("camera")||t.includes("motion")){
        r="Security: All "+KNOWLEDGE.security.cameras+" cameras online. "+KNOWLEDGE.security.events+" motion events today. Storage at "+KNOWLEDGE.security.storage+".";
        action={type:"url",url:"/dashboard/security.html"};
      }
      else if(t.includes("device")||t.includes("smart home")||t.includes("connected")){
        r=KNOWLEDGE.devices.connected+" devices connected, uptime "+KNOWLEDGE.devices.uptime+". "+KNOWLEDGE.devices.updates+" firmware updates pending.";
        action={type:"url",url:"/dashboard/smart-devices.html"};
      }
      // Navigation
      else if(t.includes("menu")||t.includes("cook")||t.includes("food")){r="Opening menu!";action={type:"navigate",detail:"menu"};}
      else if(t.includes("inventory")||t.includes("pantry")||t.includes("stock")){r="Opening inventory.";action={type:"navigate",detail:"inventory"};}
      else if(t.includes("routine")||t.includes("schedule")){r="Opening routine.";action={type:"navigate",detail:"routine"};}
      else if(t.includes("alexa")||t.includes("order")){r="Opening orders.";action={type:"navigate",detail:"events"};}
      else if(t.includes("dashboard")||t.includes("homepulse")){r="Taking you to HomePulse.";action={type:"url",url:"/dashboard/index.html"};}
      else if(t.includes("grocery")&&t.includes("detail")){r="Opening grocery details.";action={type:"url",url:"/dashboard/grocery.html"};}
      // Theme
      else if(t.includes("dark mode")||t.includes("dark theme")||t.includes("dark")){r="Switched to dark mode.";action={type:"theme",detail:"dark"};}
      else if(t.includes("light mode")||t.includes("light theme")||t.includes("light")){r="Switched to light mode.";action={type:"theme",detail:"light"};}
      // Settings
      else if(t.includes("setting")){r="Opening settings.";action={type:"navigate",detail:"settings"};}
      // Learning
      else if(t.startsWith("remember")||t.startsWith("learn")){
        var parts=t.replace(/^(remember|learn)\s+(that\s+)?/i,"").split(" means ");
        if(parts.length===2){mem.learned[parts[0].trim()]={response:"Got it! "+parts[1].trim(),action:null};r='Learned! I\'ll remember "'+parts[0].trim()+'".';}
        else{r='Teach me: "remember [phrase] means [action]"';}
      }
      // Preferences
      else if(t.includes("i like")||t.includes("i prefer")){var pref=t.replace(/^(i like|i prefer)\s*/i,"");mem.preferences[Date.now()]=pref;r="Noted! I'll remember you like "+pref+".";}
      else if(t.includes("i don't like")||t.includes("i hate")){var dis=t.replace(/^(i don't like|i hate)\s*/i,"");mem.preferences["dislike_"+Date.now()]=dis;r="Got it, avoiding "+dis+".";}
      // Confirmations
      else if(t.includes("yes")||t.includes("sure")||t.includes("yeah")||t.includes("ok")){
        if(mem.context==="suggesting_meal"){r="Opening menu with available dishes!";action={type:"navigate",detail:"menu"};}
        else if(mem.context==="confirm_order"){r="Adding low-stock items to your cart!";}
        else if(mem.context==="show_inventory"){r="Opening inventory now.";action={type:"navigate",detail:"inventory"};}
        else{r="What would you like me to do?";}
        mem.context=null;
      }
      else if(t.includes("no")||t.includes("nah")||t.includes("not now")){r="No problem!";mem.context=null;}
      // Greetings
      else if(t.includes("hi")||t.includes("hello")||t.includes("hey")){var g=["Hey! What can I help with?","Hi! Ready to assist.","Hello! Check pantry or suggest a meal?"];r=g[Math.floor(Math.random()*g.length)];}
      else if(t.includes("thanks")||t.includes("thank")){r="You're welcome! Anything else?";}
      else if(t.includes("who are you")){r="I'm Robin \u2014 your household AI. I know your pantry, meals, routines, energy, security, and smart devices. Ask me anything!";}
      // Fallback with context awareness
      else{
        r="I'm not sure about \""+text+"\". I can help with: pantry status, meal suggestions, energy/cleaning/security data, dark mode, navigation, or teach me new commands.";
        if(!mem.unknown)mem.unknown=[];
        mem.unknown.push({text:t,time:Date.now()});
      }
    }

    addMsg("robin",r);
    mem.history.push({role:"robin",text:r,time:Date.now()});
    try{localStorage.setItem("robin_memory",JSON.stringify(mem));}catch(e){}

    if(action){
      if(action.type==="url")setTimeout(function(){window.location.href=action.url;},1200);
      else if(action.type==="navigate")window.dispatchEvent(new CustomEvent("robin-navigate",{detail:action.detail}));
      else if(action.type==="theme")window.dispatchEvent(new CustomEvent("robin-theme",{detail:action.detail}));
    }
  },400);
}
  // Save to localStorage
  try{localStorage.setItem("robin_memory",JSON.stringify(mem));}catch(e){}
  setTimeout(function(){
    var t=text.toLowerCase(),r="",action=null;

    // Check learned commands first
    for(var key in mem.learned){
      if(t.includes(key)){r=mem.learned[key].response;action=mem.learned[key].action;break;}
    }

    if(!r){
      // Navigation
      if(t.includes("menu")||t.includes("cook")||t.includes("food")){r="Opening menu for you!";action={type:"navigate",detail:"menu"};}
      else if(t.includes("inventory")||t.includes("pantry")||t.includes("stock")){r="Switching to inventory.";action={type:"navigate",detail:"inventory"};}
      else if(t.includes("routine")||t.includes("schedule")){r="Here's your routine.";action={type:"navigate",detail:"routine"};}
      else if(t.includes("alexa")||t.includes("order")){r="Opening Alexa orders.";action={type:"navigate",detail:"events"};}
      else if(t.includes("dashboard")||t.includes("homepulse")){r="Taking you to HomePulse.";action={type:"url",url:"/dashboard/index.html"};}
      else if(t.includes("energy")){r="Opening energy metrics.";action={type:"url",url:"/dashboard/energy.html"};}
      else if(t.includes("grocery")){r="Opening grocery details.";action={type:"url",url:"/dashboard/grocery.html"};}
      else if(t.includes("clean")){r="Opening cleaning supplies.";action={type:"url",url:"/dashboard/cleaning.html"};}
      else if(t.includes("security")||t.includes("camera")){r="Opening security feed.";action={type:"url",url:"/dashboard/security.html"};}
      else if(t.includes("smart")||t.includes("device")){r="Opening smart devices.";action={type:"url",url:"/dashboard/smart-devices.html"};}
      // Theme
      else if(t.includes("dark mode")||t.includes("dark theme")){r="Done! Switched to dark mode.";action={type:"theme",detail:"dark"};}
      else if(t.includes("light mode")||t.includes("light theme")){r="Done! Switched to light mode.";action={type:"theme",detail:"light"};}
      // Settings
      else if(t.includes("setting")){r="Opening settings for you.";action={type:"navigate",detail:"settings"};}
      // Learning - user teaches Robin
      else if(t.startsWith("remember")||t.startsWith("learn")){
        var parts=t.replace(/^(remember|learn)\s+(that\s+)?/i,"").split(" means ");
        if(parts.length===2){
          mem.learned[parts[0].trim()]={response:"Got it! "+parts[1].trim(),action:null};
          r="Learned! Next time you say \""+parts[0].trim()+"\", I'll know what to do.";
        }else{r="Tell me like: \"remember [phrase] means [action]\"";}
      }
      // Preferences
      else if(t.includes("i like")||t.includes("i prefer")||t.includes("my favorite")){
        var pref=t.replace(/^(i like|i prefer|my favorite is?)\s*/i,"");
        mem.preferences[Date.now()]=pref;
        r="Noted! I'll remember that you like "+pref+". I'll factor this into suggestions.";
      }
      else if(t.includes("i don't like")||t.includes("i hate")||t.includes("stop suggesting")){
        var dislike=t.replace(/^(i don't like|i hate|stop suggesting)\s*/i,"");
        mem.preferences["dislike_"+Date.now()]=dislike;
        r="Got it — I'll avoid "+dislike+" in future suggestions.";
      }
      // Questions - Robin asks back
      else if(t.includes("what should")||t.includes("suggest")||t.includes("recommend")){
        var hour=new Date().getHours();
        if(hour<10)r="It's morning! Based on your pantry, how about a quick breakfast? I see you have eggs and bread. Want me to suggest a recipe?";
        else if(hour<14)r="Lunch time approaching. You have ingredients for a salad or sandwich. Want me to open the menu with options?";
        else if(hour<18)r="Afternoon snack? Your fruit supply looks good. Or I can check what's running low for a restock.";
        else r="Dinner time! Based on what's in stock, I'd suggest pasta or stir fry. Want me to show matching recipes?";
        mem.context="suggesting_meal";
      }
      else if(t.includes("yes")||t.includes("sure")||t.includes("yeah")||t.includes("ok")){
        if(mem.context==="suggesting_meal"){r="Opening the menu with dishes you can make right now!";action={type:"navigate",detail:"menu"};mem.context=null;}
        else if(mem.context==="confirm_order"){r="Order confirmed! I'll add those items.";mem.context=null;}
        else{r="What would you like me to do?";}
      }
      else if(t.includes("no")||t.includes("nah")||t.includes("not now")){
        r="No problem! Let me know whenever you need something.";mem.context=null;
      }
      // What do I have / status
      else if(t.includes("what do i have")||t.includes("what's in")||t.includes("status")){
        r="Let me check your pantry... You have 29 items tracked. 11 are running low. Want me to show the inventory?";
        mem.context="show_inventory";
      }
      else if(t.includes("running low")||t.includes("need to buy")||t.includes("restock")){
        r="I see 11 items running low. Should I add them to your cart automatically, or show you the list first?";
        mem.context="confirm_order";
      }
      // Greetings
      else if(t.includes("hi")||t.includes("hello")||t.includes("hey")){
        var greetings=["Hey! What can I help with today?","Hi there! Ready to assist.","Hello! Want me to check your pantry or suggest a meal?"];
        r=greetings[Math.floor(Math.random()*greetings.length)];
      }
      else if(t.includes("thanks")||t.includes("thank you")){r="You're welcome! Anything else?";}
      else if(t.includes("who are you")||t.includes("what are you")){r="I'm Robin — your household assistant. I manage pantry, meals, routines, and smart home. I learn from our conversations to get better over time.";}
      // Fallback — learn from it
      else{
        r="I'm not sure how to help with that yet. You can teach me! Say \"remember [phrase] means [what to do]\" and I'll learn it for next time.";
        // Log unknown command for future learning
        if(!mem.unknown)mem.unknown=[];
        mem.unknown.push({text:t,time:Date.now()});
      }
    }

    // Proactive follow-up based on time
    var recentCount=mem.history.filter(function(h){return Date.now()-h.time<300000;}).length;
    if(recentCount>3&&!mem.context){
      r+="\n\nBy the way — is there anything you'd like me to automate? I notice we chat often about similar things.";
    }

    addMsg("robin",r);
    mem.history.push({role:"robin",text:r,time:Date.now()});
    try{localStorage.setItem("robin_memory",JSON.stringify(mem));}catch(e){}

    // Execute action
    if(action){
      if(action.type==="url")setTimeout(function(){window.location.href=action.url;},1000);
      else if(action.type==="navigate")window.dispatchEvent(new CustomEvent("robin-navigate",{detail:action.detail}));
      else if(action.type==="theme")window.dispatchEvent(new CustomEvent("robin-theme",{detail:action.detail}));
    }
  },400);
}

// Load memory from localStorage on init
try{var saved=localStorage.getItem("robin_memory");if(saved)window._robinMemory=JSON.parse(saved);}catch(e){}

document.body.appendChild(root);
render();

// Dark mode sync across ALL pages
(function syncDarkMode(){
  // Apply saved theme on load
  var savedTheme=localStorage.getItem("robin_theme");
  if(savedTheme==="dark"){
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark-mode");
  }else if(savedTheme==="light"){
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark-mode");
  }
  // Listen for theme toggle events
  window.addEventListener("robin-theme",function(e){
    var mode=e.detail;
    localStorage.setItem("robin_theme",mode);
    if(mode==="dark"){document.documentElement.classList.add("dark");document.body.classList.add("dark-mode");}
    else{document.documentElement.classList.remove("dark");document.body.classList.remove("dark-mode");}
    setTimeout(applyTheme,50);
  });

  // Apply saved theme on page load (syncs across all pages)
  var savedTheme=localStorage.getItem("robin_theme");
  if(savedTheme==="dark"){document.documentElement.classList.add("dark");document.body.classList.add("dark-mode");}
  else if(savedTheme==="light"){document.documentElement.classList.remove("dark");document.body.classList.remove("dark-mode");}

  new MutationObserver(function(){applyTheme();}).observe(document.documentElement,{attributes:true,attributeFilter:["class"]});
})();
