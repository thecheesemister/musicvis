// =================================================================================
// SECTION 1: FIREBASE CONFIGURATION
// Your project's unique configuration details are now included.
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBOidUP581zhOhhIw3wZt4AZRI8mmRPMGU",
  authDomain: "chat-8acd3.firebaseapp.com",
  databaseURL: "https://chat-8acd3-default-rtdb.firebaseio.com",
  projectId: "chat-8acd3",
  storageBucket: "chat-8acd3.appspot.com",
  messagingSenderId: "28770655347",
  appId: "1:28770655347:web:82e7ec64c68152091f1e06",
  measurementId: "G-981ZKE2YYY"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();


// =================================================================================
// SECTION 2: GET HTML ELEMENTS
// =================================================================================
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

// This variable keeps track of our message listener so we can turn it off.
let messagesListener = null;


// =================================================================================
// SECTION 3: AUTHENTICATION LOGIC (Login, Signup, Logout)
// =================================================================================

signupButton.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
        alert("Please enter email and password.");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            console.log("Signed up successfully!", userCredential.user);
        })
        .catch(error => {
            alert(error.message);
        });
});

loginButton.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
        alert("Please enter email and password.");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            console.log("Logged in successfully!", userCredential.user);
        })
        .catch(error => {
            alert(error.message);
        });
});

logoutButton.addEventListener('click', () => {
    auth.signOut();
});

// This function listens for changes in login state.
auth.onAuthStateChanged(user => {
    if (user) {
        // If a user is logged in...
        loginPage.classList.add('hidden');
        chatPage.classList.remove('hidden');
        userEmail.textContent = user.email;
        listenForMessages(); // Start listening for messages
    } else {
        // If no user is logged in...
        loginPage.classList.remove('hidden');
        chatPage.classList.add('hidden');

        // This is the fix: If the listener exists, turn it off.
        if (messagesListener) {
            const messagesRef = db.ref('messages');
            messagesRef.off('child_added', messagesListener);
        }
    }
});


// =================================================================================
// SECTION 4: REALTIME DATABASE LOGIC (Sending and Receiving Messages)
// =================================================================================

sendButton.addEventListener('click', () => {
    const messageText = messageInput.value;
    const user = auth.currentUser;

    if (messageText.trim() === '' || !user) {
        return;
    }
    
    const message = {
        sender: user.email,
        text: messageText,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    db.ref('messages').push(message);

    messageInput.value = '';
});


// Function to listen for new messages and display them
function listenForMessages() {
    // Clear any old messages from the screen before we add new ones.
    chatContainer.innerHTML = '';

    const messagesRef = db.ref('messages').orderByChild('timestamp').limitToLast(100);

    // We now save the listener to our variable so we can turn it off later.
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
    });
}```