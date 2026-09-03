// Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDG5vxYJvhmqCa8XttFU1zZDXFbskSOv_o",
    authDomain: "lab-safety-project.firebaseapp.com",
    projectId: "lab-safety-project",
    storageBucket: "lab-safety-project.firebasestorage.app",
    messagingSenderId: "561811481099",
    appId: "1:561811481099:web:8f8fffacd1fd01d80a5d0e"
  };

// 初始化 Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // 使用 Firestore 資料庫
