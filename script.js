// =================================================================================
// SECTION 1: FIREBASE CONFIGURATION
// =================================================================================
const firebaseConfig = { apiKey: "AIzaSyBOidUP581zhOhhIw3wZt4AZRI8mmRPMGU", authDomain: "chat-8acd3.firebaseapp.com", databaseURL: "https://chat-8acd3-default-rtdb.firebaseio.com", projectId: "chat-8acd3", storageBucket: "chat-8acd3.appspot.com", messagingSenderId: "28770655347", appId: "1:28770655347:web:82e7ec64c68152091f1e06" };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// =================================================================================
// SECTION 2: GET HTML ELEMENTS & GLOBAL VARIABLES
// =================================================================================
const loginPage = document.getElementById('login-page'), chatPage = document.getElementById('chat-page'), usernameInput = document.getElementById('username-input'), emailInput = document.getElementById('email-input'), passwordInput = document.getElementById('password-input'), loginButton = document.getElementById('login-button'), signupButton = document.getElementById('signup-button'), logoutButton = document.getElementById('logout-button'), userDisplayName = document.getElementById('user-display-name'), messageInput = document.getElementById('message-input'), sendButton = document.getElementById('send-button'), chatContainer = document.getElementById('chat-container');
const adminPanelButton = document.getElementById('admin-panel-button'), adminPanel = document.getElementById('admin-panel'), adminPanelCloseBtn = document.getElementById('admin-panel-close-btn'), adminClearChatBtn = document.getElementById('admin-clear-chat-btn'), adminMuteUserInput = document.getElementById('admin-mute-user-input'), adminMuteUserBtn = document.getElementById('admin-mute-user-btn'), adminUnmuteUserInput = document.getElementById('admin-unmute-user-input'), adminUnmuteUserBtn = document.getElementById('admin-unmute-user-btn'), adminViewMutedBtn = document.getElementById('admin-view-muted-btn'), adminBroadcastInput = document.getElementById('admin-broadcast-input'), adminBroadcastBtn = document.getElementById('admin-broadcast-btn'), adminForceWordInput = document.getElementById('admin-force-word-input'), adminForceWordBtn = document.getElementById('admin-force-word-btn'), adminDisableForceWordBtn = document.getElementById('admin-disable-force-word-btn'), adminPartyModeBtn = document.getElementById('admin-party-mode-btn');
const adminBanEmailInput = document.getElementById('admin-ban-email-input'), adminBanDurationInput = document.getElementById('admin-ban-duration-input'), adminBanReasonInput = document.getElementById('admin-ban-reason-input'), adminBanBtn = document.getElementById('admin-ban-btn'), adminUnbanEmailInput = document.getElementById('admin-unban-email-input'), adminUnbanBtn = document.getElementById('admin-unban-btn'), adminViewBansBtn = document.getElementById('admin-view-bans-btn');

let messagesListener = null, configListener = null, config = {}, currentUser = { uid: null, username: null, email: null };

// --- THIS IS THE NEW, BULLETPROOF FIX ---
// This function forces the UI into the correct starting state.
function resetUIState(isLoggedIn) {
    if (isLoggedIn) {
        loginPage.classList.add('hidden');
        chatPage.classList.remove('hidden');
    } else {
        loginPage.classList.remove('hidden');
        chatPage.classList.add('hidden');
    }
    // Always hide the admin panel and button initially. They will be shown later if the user is an admin.
    adminPanel.classList.add('hidden');
    adminPanelButton.classList.add('hidden');
}

// =================================================================================
// SECTION 3: CORE APP LOGIC
// =================================================================================
signupButton.addEventListener('click', () => { const u = usernameInput.value, e = emailInput.value, p = passwordInput.value; if (!u || !e || !p) return; auth.createUserWithEmailAndPassword(e, p).then(cred => db.ref('users/' + cred.user.uid).set({username: u, email: e, canChangeName: false})).catch(err => alert(err.message))});
logoutButton.addEventListener('click', () => auth.signOut());

loginButton.addEventListener('click', () => {
    const email = emailInput.value, password = passwordInput.value;
    if (!email || !password) return;
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;
            const banRef = db.ref('bans/' + user.uid);
            banRef.once('value').then(snapshot => {
                if (snapshot.exists()) {
                    const banInfo = snapshot.val();
                    if (Date.now() < banInfo.banUntil) {
                        const expiryDate = new Date(banInfo.banUntil).toLocaleString();
                        alert(`You are banned!\nReason: ${banInfo.reason}\nYour ban expires on: ${expiryDate}`);
                        auth.signOut();
                    } else { banRef.remove(); }
                }
            });
        })
        .catch(error => alert("Login Failed! Reason: " + error.message));
});

// Admin Panel Listeners (No changes here)
adminPanelButton.addEventListener('click', () => adminPanel.classList.remove('hidden'));
adminPanelCloseBtn.addEventListener('click', () => adminPanel.classList.add('hidden'));
// ... (all other admin button event listeners are the same)
const findUserByEmail = (email, callback) => { db.ref('users').orderByChild('email').equalTo(email).once('value').then(s => { if(s.exists()){ const uid = Object.keys(s.val())[0]; callback(uid); } else { alert("User not found."); callback(null); }})};
adminClearChatBtn.addEventListener('click', () => { if (confirm("ADMIN: Sure you want to delete all messages?")) db.ref('messages').remove().then(() => alert("Chat cleared."))});
adminMuteUserBtn.addEventListener('click', () => { const u = adminMuteUserInput.value.trim(); if (u) db.ref('config/mutedUsers/' + u).set(true).then(() => alert(u + " muted.")) });
adminUnmuteUserBtn.addEventListener('click', () => { const u = adminUnmuteUserInput.value.trim(); if (u) db.ref('config/mutedUsers/' + u).remove().then(() => alert(u + " unmuted."))});
adminViewMutedBtn.addEventListener('click', () => db.ref('config/mutedUsers').once('value').then(s => alert(s.exists() ? "Muted Users:\n" + Object.keys(s.val()).join("\n") : "No users are muted.")));
adminBroadcastBtn.addEventListener('click', () => { const b = adminBroadcastInput.value.trim(); if(b) db.ref('messages').push({sender:'[SYSTEM]',text:b,timestamp:firebase.database.ServerValue.TIMESTAMP})});
adminForceWordBtn.addEventListener('click', () => { const w = adminForceWordInput.value.trim(); if (w) db.ref('config/forceWord').set(w).then(() => alert("Forcing word: " + w))});
adminDisableForceWordBtn.addEventListener('click', () => db.ref('config/forceWord').remove().then(() => alert("Force Word disabled.")));
adminPartyModeBtn.addEventListener('click', () => { const n = !config.partyMode; db.ref('config/partyMode').set(n).then(() => alert("Party Mode: " + (n?"ON":"OFF")))});
adminBanBtn.addEventListener('click', () => { const e=adminBanEmailInput.value.trim(),d=parseFloat(adminBanDurationInput.value),r=adminBanReasonInput.value.trim()||"No reason."; if(!e||isNaN(d)||d<=0)return alert("Invalid email or duration."); findUserByEmail(e,uid=>{if(uid){const u=Date.now()+(d*36e5);db.ref('bans/'+uid).set({email:e,reason:r,banUntil:u,bannedBy:currentUser.email}).then(()=>alert(`${e} banned.`))}}) });
adminUnbanBtn.addEventListener('click', () => { const e=adminUnbanEmailInput.value.trim(); if(!e)return; findUserByEmail(e,uid=>{if(uid)db.ref('bans/'+uid).remove().then(()=>alert(`Ban lifted for ${e}.`))}) });
adminViewBansBtn.addEventListener('click', () => { db.ref('bans').once('value').then(s=>{if(!s.exists())return alert("No bans.");let l="Bans:\n\n";s.forEach(c=>{const b=c.val(),x=new Date(b.banUntil).toLocaleString();l+=`Email:${b.email}\nReason:${b.reason}\nExpires:${x}\n\n`});alert(l)}) });


auth.onAuthStateChanged(user => {
    // Call our new UI reset function immediately.
    resetUIState(!!user);

    if (user) {
        currentUser = { uid: user.uid, email: user.email };
        // Now, check if admin and show the button if needed.
        if (user.email === 'admin@gmail.com') {
            adminPanelButton.classList.remove('hidden');
        }
        listenForConfigChanges();
        db.ref('users/' + user.uid).once('value').then(snapshot => {
            if (snapshot.exists()) {
                currentUser.username = snapshot.val().username;
                userDisplayName.textContent = currentUser.username;
                listenForMessages();
            } else { auth.signOut(); }
        });
    } else {
        currentUser = { uid: null, username: null, email: null };
        if (messagesListener) db.ref('messages').off('child_added', messagesListener);
        if (configListener) db.ref('config').off('value', configListener);
    }
});

// --- DATABASE & CHAT LOGIC (No changes here) ---
function listenForConfigChanges() { configListener = db.ref('config').on('value', s => { config = s.val() || {} }) }
sendButton.addEventListener('click', () => {
    let msgTxt = messageInput.value.trim();
    if (msgTxt === '' || !currentUser.username) return;
    if (config.mutedUsers && config.mutedUsers[currentUser.username]) return alert("You are currently muted.");
    if (config.forceWord && currentUser.email !== 'admin@gmail.com') msgTxt = config.forceWord;
    db.ref('messages').push({ sender: currentUser.username, text: msgTxt, timestamp: firebase.database.ServerValue.TIMESTAMP });
    messageInput.value = '';
});
function listenForMessages() {
    chatContainer.innerHTML = '';
    messagesListener = db.ref('messages').orderByChild('timestamp').limitToLast(100).on('child_added', s => {
        const msg = s.val(), el = document.createElement('div');
        el.classList.add('message');
        if (msg.sender === currentUser.username) el.classList.add('sent'); else el.classList.add('received');
        if (msg.sender === '[SYSTEM]') el.classList.add('system-message');
        if (config.partyMode) el.classList.add('party-message');
        const userSpan = document.createElement('span');
        userSpan.classList.add('message-username');
        userSpan.textContent = msg.sender + ":";
        el.appendChild(userSpan);
        el.appendChild(document.createTextNode(" " + msg.text));
        chatContainer.appendChild(el);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });
}