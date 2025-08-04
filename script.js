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

// =================================================================================
// SECTION 3: CORE APP LOGIC
// =================================================================================
signupButton.addEventListener('click', () => { const u = usernameInput.value, e = emailInput.value, p = passwordInput.value; if (!u || !e || !p) return; auth.createUserWithEmailAndPassword(e, p).then(cred => db.ref('users/' + cred.user.uid).set({username: u, email: e, canChangeName: false})).catch(err => alert(err.message))});
logoutButton.addEventListener('click', () => auth.signOut());

// --- THIS IS THE CRITICAL BAN ENFORCEMENT ---
loginButton.addEventListener('click', () => {
    const email = emailInput.value, password = passwordInput.value;
    if (!email || !password) return;
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;
            // After successful auth, CHECK FOR BAN before proceeding.
            const banRef = db.ref('bans/' + user.uid);
            banRef.once('value').then(snapshot => {
                if (snapshot.exists()) {
                    const banInfo = snapshot.val();
                    if (Date.now() < banInfo.banUntil) {
                        // User is actively banned.
                        const expiryDate = new Date(banInfo.banUntil).toLocaleString();
                        alert(`You are banned!\nReason: ${banInfo.reason}\nYour ban expires on: ${expiryDate}`);
                        auth.signOut(); // Immediately sign them out.
                    } else {
                        // Ban has expired, remove it.
                        banRef.remove();
                    }
                }
            });
        })
        .catch(error => alert("Login Failed! Reason: " + error.message));
});

// --- Admin Panel Listeners ---
adminPanelButton.addEventListener('click', () => adminPanel.classList.remove('hidden'));
adminPanelCloseBtn.addEventListener('click', () => adminPanel.classList.add('hidden'));
// (Other admin buttons remain the same)
adminClearChatBtn.addEventListener('click', () => { if (confirm("ADMIN: Sure you want to delete all messages?")) db.ref('messages').remove().then(() => alert("Chat cleared."))});
adminMuteUserBtn.addEventListener('click', () => { const u = adminMuteUserInput.value.trim(); if (u) db.ref('config/mutedUsers/' + u).set(true).then(() => alert(u + " muted.")) });
adminUnmuteUserBtn.addEventListener('click', () => { const u = adminUnmuteUserInput.value.trim(); if (u) db.ref('config/mutedUsers/' + u).remove().then(() => alert(u + " unmuted."))});
adminViewMutedBtn.addEventListener('click', () => db.ref('config/mutedUsers').once('value').then(s => alert(s.exists() ? "Muted Users:\n" + Object.keys(s.val()).join("\n") : "No users are muted.")));
adminBroadcastBtn.addEventListener('click', () => { const b = adminBroadcastInput.value.trim(); if(b) db.ref('messages').push({sender:'[SYSTEM]',text:b,timestamp:firebase.database.ServerValue.TIMESTAMP})});
adminForceWordBtn.addEventListener('click', () => { const w = adminForceWordInput.value.trim(); if (w) db.ref('config/forceWord').set(w).then(() => alert("Forcing word: " + w))});
adminDisableForceWordBtn.addEventListener('click', () => db.ref('config/forceWord').remove().then(() => alert("Force Word disabled.")));
adminPartyModeBtn.addEventListener('click', () => { const n = !config.partyMode; db.ref('config/partyMode').set(n).then(() => alert("Party Mode: " + (n?"ON":"OFF")))});

// --- NEW Ban Management Listeners ---
const findUserByEmail = (email, callback) => {
    db.ref('users').orderByChild('email').equalTo(email).once('value').then(snapshot => {
        if (snapshot.exists()) {
            const uid = Object.keys(snapshot.val())[0];
            callback(uid);
        } else {
            alert("Error: User with that email not found in database.");
            callback(null);
        }
    });
};

adminBanBtn.addEventListener('click', () => {
    const email = adminBanEmailInput.value.trim();
    const durationHours = parseFloat(adminBanDurationInput.value);
    const reason = adminBanReasonInput.value.trim() || "No reason provided.";
    if (!email || isNaN(durationHours) || durationHours <= 0) return alert("Please enter a valid email and a positive number for duration.");

    findUserByEmail(email, uid => {
        if (uid) {
            const banUntil = Date.now() + (durationHours * 60 * 60 * 1000);
            db.ref('bans/' + uid).set({ email, reason, banUntil, bannedBy: currentUser.email })
                .then(() => alert(`User ${email} has been banned for ${durationHours} hours.`));
        }
    });
});

adminUnbanBtn.addEventListener('click', () => {
    const email = adminUnbanEmailInput.value.trim();
    if (!email) return alert("Please enter an email to unban.");
    findUserByEmail(email, uid => {
        if (uid) db.ref('bans/' + uid).remove().then(() => alert(`Ban lifted for user ${email}.`));
    });
});

adminViewBansBtn.addEventListener('click', () => {
    db.ref('bans').once('value').then(snapshot => {
        if (!snapshot.exists()) return alert("No users are currently banned.");
        let banList = "Banned Users:\n\n";
        snapshot.forEach(childSnapshot => {
            const ban = childSnapshot.val();
            const expiry = new Date(ban.banUntil).toLocaleString();
            banList += `Email: ${ban.email}\nReason: ${ban.reason}\nExpires: ${expiry}\n\n`;
        });
        alert(banList);
    });
});

// --- Auth State Change Function ---
auth.onAuthStateChanged(user => {
    if (user) { // User is logged in
        currentUser = { uid: user.uid, email: user.email };
        if (user.email === 'admin@gmail.com') adminPanelButton.classList.remove('hidden');
        listenForConfigChanges();
        db.ref('users/' + user.uid).once('value').then(snapshot => {
            if (snapshot.exists()) {
                currentUser.username = snapshot.val().username;
                loginPage.classList.add('hidden'); chatPage.classList.remove('hidden');
                userDisplayName.textContent = currentUser.username;
                listenForMessages();
                // Username change logic (unchanged)
            } else { auth.signOut(); }
        });
    } else { // User is logged out
        loginPage.classList.remove('hidden'); chatPage.classList.add('hidden');
        adminPanelButton.classList.add('hidden'); adminPanel.classList.add('hidden');
        currentUser = { uid: null, username: null, email: null };
        if (messagesListener) db.ref('messages').off('child_added', messagesListener);
        if (configListener) db.ref('config').off('value', configListener);
    }
});

// =================================================================================
// SECTION 4: DATABASE & CHAT LOGIC
// =================================================================================
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