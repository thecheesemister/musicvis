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

// NEW! Get the username input
const usernameInput = document.getElementById('username-input');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');

const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const logoutButton = document.getElementById('logout-button');

// NEW! Get the new welcome message span
const userDisplayName = document.getElementById('user-display-name');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const chatContainer = document.getElementById('chat-container');

// NEW! Global variables to hold user info while they are logged in.
let messagesListener = null;
let currentUser = {
    uid: null,
    username: null
};

// =================================================================================
// SECTION 3: AUTHENTICATION LOGIC
// =================================================================================

signupButton.addEventListener('click', () => {
    const username = usernameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;

    // NEW! Check if username is filled out.
    if (!username || !email || !password) {
        return alert("Please fill out all fields: Username, Email, and Password.");
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            // NEW! After creating the user, save their username info to the database.
            const uid = userCredential.user.uid;
            db.ref('users/' + uid).set({
                username: username,
                email: email,
                canChangeName: false // The admin lock flag
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

// THIS IS THE CORE LOGIC FOR HANDLING LOGIN/LOGOUT STATE
auth.onAuthStateChanged(user => {
    if (user) {
        // User is logged in.
        currentUser.uid = user.uid; // Store their unique ID.
        
        // NEW! Fetch user data (like username) from the database.
        db.ref('users/' + user.uid).once('value').then(snapshot => {
            if (snapshot.exists()) {
                const userData = snapshot.val();
                currentUser.username = userData.username; // Store their username.
                
                // Show the chat page and hide the login page
                loginPage.classList.add('hidden');
                chatPage.classList.remove('hidden');
                userDisplayName.textContent = currentUser.username; // Display their username.
                listenForMessages();

                // NEW! Check if the admin has given them permission to change their name.
                if (userData.canChangeName === true) {
                    const newName = prompt("You have permission to change your username! Enter a new one, or cancel to keep your current name.");
                    if (newName && newName.trim() !== '') {
                        // If they entered a new name, update it in the database and turn the permission off.
                        db.ref('users/' + user.uid).update({
                            username: newName,
                            canChangeName: false
                        });
                        currentUser.username = newName; // Update it locally too.
                        userDisplayName.textContent = newName;
                    }
                }
            } else {
                // This is a failsafe in case a user exists in Auth but not in the database.
                alert("Error: Could not find user data.");
                auth.signOut();
            }
        });
    } else {
        // User is logged out.
        loginPage.classList.remove('hidden');
        chatPage.classList.add('hidden');
        currentUser = { uid: null, username: null }; // Clear user data.
        if (messagesListener) {
            db.ref('messages').off('child_added', messagesListener);
        }
    }
});

// =================================================================================
// SECTION 4: REALTIME DATABASE LOGIC (CHAT)
// =================================================================================

sendButton.addEventListener('click', () => {
    const messageText = messageInput.value;
    // NEW! Check if we have a username before sending.
    if (messageText.trim() === '' || !currentUser.username) { return; }
    
    // CHANGED! The message now stores the username as the sender.
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
        
        // CHANGED! Check if the message sender's username matches the current user's username.
        if (message.sender === currentUser.username) {
            messageElement.classList.add('sent');
        } else {
            messageElement.classList.add('received');
            const senderElement = document.createElement('div');
            senderElement.classList.add('message-sender');
            senderElement.textContent = message.sender; // The sender is already the username.
            messageElement.appendChild(senderElement);
        }

        const textElement = document.createElement('div');
        textElement.textContent = message.text;
        messageElement.appendChild(textElement);
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, error => {
        alert("Error listening for messages! Reason: " + error.message);
    });
}