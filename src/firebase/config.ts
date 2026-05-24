import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyB0fda-X546A5dpLB9bVBfVQVZ28EDwZw8',
  authDomain: 'nightly-app-f3722.firebaseapp.com',
  projectId: 'nightly-app-f3722',
  storageBucket: 'nightly-app-f3722.firebasestorage.app',
  messagingSenderId: '58724179976',
  appId: '1:58724179976:web:72ece6d6f4930864f931bd',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
