import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC_9zXbG10tSKFtx0fI0ccdtoltDFFRT_c",
  authDomain: "caseirinhosdabeth-f8645.firebaseapp.com",
  projectId: "caseirinhosdabeth-f8645",
  storageBucket: "caseirinhosdabeth-f8645.firebasestorage.app",
  messagingSenderId: "182127069288",
  appId: "1:182127069288:web:411584e3c7c9b6ec3793dd"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
