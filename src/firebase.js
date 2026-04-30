import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDOgw7e47AScilMAPPhQ2JmMqGydzElvz8",
  authDomain: "flavortown-2de77.firebaseapp.com",
  projectId: "flavortown-2de77",
  storageBucket: "flavortown-2de77.firebasestorage.app",
  messagingSenderId: "742542144742",
  appId: "1:742542144742:web:bc6d44e210806ef87e3727"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);