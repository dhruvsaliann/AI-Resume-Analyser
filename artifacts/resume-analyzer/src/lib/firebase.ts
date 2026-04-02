import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAIdwlz7eDM9NviVvDnmytTmmMCQSUyE8w",
  authDomain: "resume-analyzer-1979.firebaseapp.com",
  projectId: "resume-analyzer-1979",
  storageBucket: "resume-analyzer-1979.firebasestorage.app",
  messagingSenderId: "428613499585",
  appId: "1:428613499585:web:a714f1906b6aa9082bb240",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
