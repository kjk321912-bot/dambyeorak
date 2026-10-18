// Firebase 연결 계층. 주소 뒤에 ?demo 가 붙으면 설정 없이 써 볼 수 있는 체험용 가짜 저장소(mock-firebase.js)를 쓴다.
export const demo = new URLSearchParams(location.search).has('demo');

let m;
if (demo) {
  m = await import('./mock-firebase.js');
} else {
  const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const [a, au, fs] = await Promise.all([
    import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js'),
  ]);
  m = { ...a, ...au, ...fs };
}

export const {
  initializeApp, getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut,
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove, writeBatch,
} = m;
