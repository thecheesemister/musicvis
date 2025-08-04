// --- THIS IS A SPECIAL DEBUG VERSION ---

alert("The script.js file has loaded!");

const firebaseConfig = {
    apiKey: "AIzaSyBOidUP581zhOhhIw3wZt4AZRI8mmRPMGU",
    authDomain: "chat-8acd3.firebaseapp.com",
    databaseURL: "https://chat-8acd3-default-rtdb.firebaseio.com",
    projectId: "chat-8acd3",
    storageBucket: "chat-8acd3.appspot.com",
    messagingSenderId: "28770655347",
    appId: "1:28770655347:web:82e7ec64c68152091f1e06"
};

try {
    firebase.initializeApp(firebaseConfig);
} catch (e) {
    alert("CRITICAL ERROR: Could not initialize Firebase. Check config. Error: " + e.message);
}

const auth = firebase.auth();
const db = firebase.database();

const loginPage = document.getElementById('login-page');
const chatPage = document.getElementById('chat-page');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const logoutButton = document.getElementById('logout-button');
const userEmail = document.getElementById('user-email');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const chatContainer = document.getElementById('chat-container');
let messagesListener = null;

signupButton.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) { return alert("Please enter email and password."); }
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => { alert("Signup Successful!"); })
        .catch(error => { alert("Signup Failed! Reason: " + error.message); });
});

loginButton.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) { return alert("Please enter email and password."); }
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => { console.log("Logged in!"); })
        .catch(error => { alert("Login Failed! Reason: " + error.message); });
});

logoutButton.addEventListener('click', () => { auth.signOut(); });

auth.onAuthStateChanged(user => {
    if (user) {
        loginPage.classList.add('hidden');
        chatPage.classList.remove('hidden');
        userEmail.textContent = user.email;
        listenForMessages();
    } else {
        loginPage.classList.remove('hidden');
        chatPage.classList.add('hidden');
        if (messagesListener) {
            db.ref('messages').off('child_added', messagesListener);
        }
    }
});

sendButton.addEventListener('click', () => {
    const messageText = messageInput.value;
    const user = auth.currentUser;
    if (messageText.trim() === '' || !user) { return; }
    const message = { sender: user.email, text: messageText, timestamp: firebase.database.ServerValue.TIMESTAMP };
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
        if (message.sender === auth.currentUser.email) {
            messageElement.classList.add('sent');
        } else {
            messageElement.classList.add('received');
            const senderElement = document.createElement('div');
            senderElement.classList.add('message-sender');
            senderElement.textContent = message.sender;
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