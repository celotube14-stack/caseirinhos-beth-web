import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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