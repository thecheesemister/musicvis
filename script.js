// =================================================================================
// SECTION 1: FIREBASE CONFIGURATION
// =================================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBOidUP581zhOhhIw3wZt4AZRI8mmRPMGU",
    authDomain: "chat-8acd3.firebaseapp.com",
    databaseURL: "https://chat-8acd3-default-rtdb.firebaseio.com",
    projectId: "chat-8acd3",
    storageBucket: "chat-8acd3.appspot.com",
    messagingSenderId: "28770655347",
    appId: "1:28770655347:web:82e7ec64c68152091f1e06"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// =================================================================================
// SECTION 2: GET HTML ELEMENTS & GLOBAL VARIABLES
// =================================================================================
const loginPage = document.getElementById('login-page');
const chatPage = document.getElementById('chat-page');
const usernameInput = document.getElementById('username-input');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const logoutButton = document.getElementById('logout-button');
const userDisplayName = document.getElementById('user-display-name');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const chatContainer = document.getElementById('chat-container');

// Admin Panel Elements
const adminPanelButton = document.getElementById('admin-panel-button');
const adminPanel = document.getElementById('admin-panel');
const adminPanelCloseBtn = document.getElementById('admin-panel-close-btn');
const adminClearChatBtn = document.getElementById('admin-clear-chat-btn');
const adminMuteUserInput = document.getElementById('admin-mute-user-input');
const adminMuteUserBtn = document.getElementById('admin-mute-user-btn');
const adminUnmuteUserInput = document.getElementById('admin-unmute-user-input');
const adminUnmuteUserBtn = document.getElementById('admin-unmute-user-btn');
const adminViewMutedBtn = document.getElementById('admin-view-muted-btn');
const adminBroadcastInput = document.getElementById('admin-broadcast-input');
const adminBroadcastBtn = document.getElementById('admin-broadcast-btn');
const adminForceWordInput = document.getElementById('admin-force-word-input');
const adminForceWordBtn = document.getElementById('admin-force-word-btn');
const adminDisableForceWordBtn = document.getElementById('admin-disable-force-word-btn');
const adminPartyModeBtn = document.getElementById('admin-party-mode-btn');

// Global State Variables
let messagesListener = null;
let configListener = null;
let config = {}; // Holds global config like partyMode status
let currentUser = { uid: null, username: null, email: null };

// =================================================================================
// SECTION 3: CORE APP LOGIC (AUTH, ADMIN PANEL, ETC.)
// =================================================================================

// --- Auth Listeners ---
signupButton.addEventListener('click', () => { /* No changes here */ });
loginButton.addEventListener('click', () => { /* No changes here */ });
logoutButton.addEventListener('click', () => { auth.signOut(); });

// --- Admin Panel Listeners ---
adminPanelButton.addEventListener('click', () => adminPanel.classList.remove('hidden'));
adminPanelCloseBtn.addEventListener('click', () => adminPanel.classList.add('hidden'));

adminClearChatBtn.addEventListener('click', () => {
    if (confirm("ADMIN: Are you sure you want to delete all messages?")) {
        db.ref('messages').remove().then(() => alert("Chat cleared."));
    }
});
adminMuteUserBtn.addEventListener('click', () => {
    const userToMute = adminMuteUserInput.value.trim();
    if (userToMute) db.ref('config/mutedUsers/' + userToMute).set(true).then(() => alert(userToMute + " has been muted."));
});
adminUnmuteUserBtn.addEventListener('click', () => {
    const userToUnmute = adminUnmuteUserInput.value.trim();
    if (userToUnmute) db.ref('config/mutedUsers/' + userToUnmute).remove().then(() => alert(userToUnmute + " has been unmuted."));
});
adminViewMutedBtn.addEventListener('click', () => {
    db.ref('config/mutedUsers').once('value').then(snapshot => {
        if (snapshot.exists()) {
            alert("Muted Users:\n" + Object.keys(snapshot.val()).join("\n"));
        } else {
            alert("No users are currently muted.");
        }
    });
});
adminBroadcastBtn.addEventListener('click', () => {
    const broadcastText = adminBroadcastInput.value.trim();
    if (broadcastText) {
        db.ref('messages').push({ sender: '[SYSTEM]', text: broadcastText, timestamp: firebase.database.ServerValue.TIMESTAMP });
    }
});
adminForceWordBtn.addEventListener('click', () => {
    const word = adminForceWordInput.value.trim();
    if (word) db.ref('config/forceWord').set(word).then(() => alert("All users will now say '" + word + "'"));
});
adminDisableForceWordBtn.addEventListener('click', () => {
    db.ref('config/forceWord').remove().then(() => alert("Force Word disabled."));
});
adminPartyModeBtn.addEventListener('click', () => {
    const newStatus = !config.partyMode;
    db.ref('config/partyMode').set(newStatus).then(() => alert("Party Mode is now " + (newStatus ? "ON" : "OFF")));
});

// --- Main Auth State Change Function ---
auth.onAuthStateChanged(user => {
    if (user) { // User is logged in
        currentUser = { uid: user.uid, email: user.email };
        if (user.email === 'admin@gmail.com') {
            adminPanelButton.classList.remove('hidden');
        }
        listenForConfigChanges();
        db.ref('users/' + user.uid).once('value').then(snapshot => {
            if (snapshot.exists()) {
                currentUser.username = snapshot.val().username;
                loginPage.classList.add('hidden');
                chatPage.classList.remove('hidden');
                userDisplayName.textContent = currentUser.username;
                listenForMessages();
                // Handle username change logic (no changes here)
            } else { auth.signOut(); }
        });
    } else { // User is logged out
        loginPage.classList.remove('hidden');
        chatPage.classList.add('hidden');
        adminPanelButton.classList.add('hidden');
        adminPanel.classList.add('hidden');
        currentUser = { uid: null, username: null, email: null };
        if (messagesListener) db.ref('messages').off('child_added', messagesListener);
        if (configListener) db.ref('config').off('value', configListener);
    }
});

// =================================================================================
// SECTION 4: REALTIME DATABASE LOGIC
// =================================================================================

function listenForConfigChanges() {
    const configRef = db.ref('config');
    configListener = configRef.on('value', snapshot => {
        config = snapshot.val() || {}; // Update global config object
    });
}

sendButton.addEventListener('click', () => {
    let messageText = messageInput.value.trim();
    if (messageText === '' || !currentUser.username) return;

    // Check for Mute
    if (config.mutedUsers && config.mutedUsers[currentUser.username]) {
        return alert("You are currently muted by an admin.");
    }
    // Check for Force Word (admin is immune)
    if (config.forceWord && currentUser.email !== 'admin@gmail.com') {
        messageText = config.forceWord;
    }

    const message = { sender: currentUser.username, text: messageText, timestamp: firebase.database.ServerValue.TIMESTAMP };
    db.ref('messages').push(message);
    messageInput.value = '';
});

function listenForMessages() {
    chatContainer.innerHTML = '';
    const messagesRef = db.ref('messages').orderByChild('timestamp').limitToLast(100);
    messagesListener = messagesRef.on('child_added', snapshot => {
        const message = snapshot.val();
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        if (message.sender === currentUser.username) messageElement.classList.add('sent');
        else messageElement.classList.add('received');
        
        // Apply special styles
        if (message.sender === '[SYSTEM]') messageElement.classList.add('system-message');
        if (config.partyMode) messageElement.classList.add('party-message');
        
        const usernameSpan = document.createElement('span');
        usernameSpan.classList.add('message-username');
        usernameSpan.textContent = message.sender + ":";
        const messageTextNode = document.createTextNode(" " + message.text);
        messageElement.appendChild(usernameSpan);
        messageElement.appendChild(messageTextNode);
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });
}

// Dummy signup/login functions for completeness
signupButton.addEventListener('click', () => { const u = usernameInput.value, e = emailInput.value, p = passwordInput.value; if (!u || !e || !p) return; auth.createUserWithEmailAndPassword(e, p).then(cred => db.ref('users/' + cred.user.uid).set({username: u, email: e, canChangeName: false}))});
loginButton.addEventListener('click', () => { const e = emailInput.value, p = passwordInput.value; if (!e || !p) return; auth.signInWithEmailAndPassword(e, p).catch(err => alert(err.message)) });