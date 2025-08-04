// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBOidUP581zhOhhIw3wZt4AZRI8mmRPMGU",
  authDomain: "chat-8acd3.firebaseapp.com",
  databaseURL: "https://chat-8acd3-default-rtdb.firebaseio.com",
  projectId: "chat-8acd3",
  storageBucket: "chat-8acd3.firebasestorage.app",
  messagingSenderId: "28770655347",
  appId: "1:28770655347:web:82e7ec64c68152091f1e06",
  measurementId: "G-981ZKE2YYY"
};
// =================================================================================

// For example:
// const firebaseConfig = {
//   apiKey: "...",
//   authDomain: "...",
//   databaseURL: "...",
//   projectId: "...",
//   storageBucket: "...",
//   messagingSenderId: "...",
//   appId: "..."
// };


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();


// =================================================================================
// SECTION 2: GET HTML ELEMENTS
// This is how our JavaScript code can find the buttons, inputs, and pages.
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


// =================================================================================
// SECTION 3: AUTHENTICATION LOGIC (Login, Signup, Logout)
// =================================================================================

// Function to handle signing up a new user
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

// Function to handle logging in an existing user
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

// Function to handle logging out
logoutButton.addEventListener('click', () => {
    auth.signOut();
});

// This function listens for changes in login state (is someone logged in or not?)
auth.onAuthStateChanged(user => {
    if (user) {
        // If a user is logged in...
        loginPage.classList.add('hidden'); // Hide the login screen
        chatPage.classList.remove('hidden'); // Show the chat screen
        userEmail.textContent = user.email; // Show their email
        listenForMessages(); // Start listening for new messages
    } else {
        // If no user is logged in...
        loginPage.classList.remove('hidden'); // Show the login screen
        chatPage.classList.add('hidden'); // Hide the chat screen
    }
});


// =================================================================================
// SECTION 4: REALTIME DATABASE LOGIC (Sending and Receiving Messages)
// =================================================================================

// Function to send a message
sendButton.addEventListener('click', () => {
    const messageText = messageInput.value;
    const user = auth.currentUser;

    if (messageText.trim() === '' || !user) {
        return; // Don't send empty messages
    }

    // Create a message object to save to the database
    const message = {
        sender: user.email,
        text: messageText,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    // Push the message to the 'messages' list in our database
    db.ref('messages').push(message);

    messageInput.value = ''; // Clear the input box
});

// Function to listen for new messages and display them
function listenForMessages() {
    const messagesRef = db.ref('messages').orderByChild('timestamp').limitToLast(100);

    messagesRef.on('child_added', snapshot => {
        const message = snapshot.val();
        const messageElement = document.createElement('div');
        
        // Add CSS classes to style the message
        messageElement.classList.add('message');
        if (message.sender === auth.currentUser.email) {
            messageElement.classList.add('sent');
        } else {
            messageElement.classList.add('received');
            // Add sender's email for received messages
            const senderElement = document.createElement('div');
            senderElement.classList.add('message-sender');
            senderElement.textContent = message.sender;
            messageElement.appendChild(senderElement);
        }

        const textElement = document.createElement('div');
        textElement.textContent = message.text;
        messageElement.appendChild(textElement);
        
        chatContainer.appendChild(messageElement);
        
        // Scroll to the bottom to see the latest message
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });
}