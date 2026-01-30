// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB9toFkJBlF4lnmThQr0amK0whp8AOMx8U",
  authDomain: "salengman-5fdaf.firebaseapp.com",
  projectId: "salengman-5fdaf",
  storageBucket: "salengman-5fdaf.firebasestorage.app",
  messagingSenderId: "878810724957",
  appId: "1:878810724957:web:7980c89a0f6177754febb4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);