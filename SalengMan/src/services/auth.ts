import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

// Create or update user document in Firestore
const saveUserToDatabase = async (user: User) => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    // First time user - create document
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  } else {
    // Existing user - update last login
    await setDoc(userRef, {
      lastLoginAt: serverTimestamp(),
    }, { merge: true });
  }
};

// Sign Up - create user data
export const signUp = async (email: string, password: string, username: string, gender: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Save user with username and gender
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    email: user.email,
    username: username,
    gender: gender,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });

  return user;
};

// Sign In - update last login
export const signIn = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await saveUserToDatabase(userCredential.user);
  return userCredential.user;
};

// Sign Out
export const logOut = async () => {
  await signOut(auth);
};

// Password Reset
export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

// Auth State Listener
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
