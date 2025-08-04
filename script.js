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

// Initialize Firebase
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

// NEW! Get the admin button.
const adminClearButton = document.getElementById('admin-clear-button');

let messagesListener = null;
let currentUser = {
    uid: null,
    username: null,
    email: null
};

// =================================================================================
// SECTION 3: AUTHENTICATION & ADMIN LOGIC
// =================================================================================

signupButton.addEventListener('click', () => {
    const username = usernameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!username || !email || !password) {
        return alert("Please fill out all fields: Username, Email, and Password.");
    }
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            const uid = userCredential.user.uid;
            db.ref('users/' + uid).set({
                username: username,
                email: email,
                canChangeName: false
            }).then(() => {
                alert("Sign Up Successful!");
            });
        })
        .catch(error => {
            alert("Signup Failed! Reason: " + error.message);
        });
});

loginButton.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) { return alert("Please enter email and password."); }
    auth.signInWithEmailAndPassword(email, password)
        .catch(error => { alert("Login Failed! Reason: " + error.message); });
});

logoutButton.addEventListener('click', () => { auth.signOut(); });

// NEW! Logic for the admin clear button.
adminClearButton.addEventListener('click', () => {
    const confirmClear = confirm("ADMIN ACTION: Are you sure you want to delete all messages forever?");
    if (confirmClear) {
        db.ref('messages').remove()
            .then(() => { alert("Chat cleared successfully."); })
            .catch(error => { alert("Error clearing chat: " + error.message); });
    }
});


// This function now controls showing/hiding the admin button.
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser.uid = user.uid;
        currentUser.email = user.email;
        
        // NEW! Check if the logged-in user is the admin.
        if (currentUser.email === 'admin@gmail.com') {
            adminClearButton.classList.remove('hidden'); // Show the button.
        }

        db.ref('users/' + user.uid).once('value').then(snapshot => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                currentUser.username = userData.username;
                loginPage.classList.add('hidden');
                chatPage.classList.remove('hidden');
                userDisplayName.textContent = currentUser.username;
                listenForMessages();
                if (userData.canChangeName === true) {
                    const newName = prompt("You have permission to change your username! Enter a new one, or cancel to keep your current name.");
                    if (newName && newName.trim() !== '') {
                        db.ref('users/' + user.uid).update({
                            username: newName,
                            canChangeName: false
                        });
                        currentUser.username = newName;
                        userDisplayName.textContent = newName;
                    }
                }
            } else {
                alert("Error: Could not find user data.");
                auth.signOut();
            }
        });
    } else {
        loginPage.classList.remove('hidden');
        chatPage.classList.add('hidden');
        adminClearButton.classList.add('hidden'); // IMPORTANT: Hide the button on logout.
        currentUser = { uid: null, username: null, email: null };
        if (messagesListener) {
            db.ref('messages').off('child_added', messagesListener);
        }
    }
});

// =================================================================================
// SECTION 4: REALTIME DATABASE LOGIC (CHAT)
// =================================================================================

// CHANGED! The old "?clear" command logic has been completely removed from here.
sendButton.addEventListener('click', () => {
    const messageText = messageInput.value;
    if (messageText.trim() === '' || !currentUser.username) { return; }
    
    const message = {
        sender: currentUser.username,
        text: messageText,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    db.ref('messages').push(message).catch(error => { alert("Could not send message! Reason: " + error.message); });
    messageInput.value = '';
});

function listenForMessages() {
    chatContainer.innerHTML = '';
    const messagesRef = db.ref('messages').orderByChild('timestamp').limitToLast(100);
    
    messagesListener = messagesRef.on('child_added', snapshot => {
        const message = snapshot.val();
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        
        if (message.sender === currentUser.username) {
            messageElement.classList.add('sent');
        } else {
            messageElement.classList.add('received');
        }

        const usernameSpan = document.createElement('span');
        usernameSpan.classList.add('message-username');
        usernameSpan.textContent = message.sender + ":";
        
        const messageTextNode = document.createTextNode(" " + message.text);

        messageElement.appendChild(usernameSpan);
        messageElement.appendChild(messageTextNode);
        
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, error => {
        alert("Error listening for messages! Reason: " + error.message);
    });
}