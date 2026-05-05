import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdfZHHiWO-9QskhajFynbuJHwRz70M7cA",
  authDomain: "kiszedesi-jegyzek.firebaseapp.com",
  projectId: "kiszedesi-jegyzek",
  storageBucket: "kiszedesi-jegyzek.firebasestorage.app",
  messagingSenderId: "420844361677",
  appId: "1:420844361677:web:cf45ef50868077ca1c5684"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export {
    auth,
    db,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    doc,
    query,
    orderBy
};
