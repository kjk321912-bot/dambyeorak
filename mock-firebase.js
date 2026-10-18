// 체험 모드(?demo)용 메모리 저장소. Firebase SDK와 같은 이름·모양의 함수만 흉내 낸다. 새로고침하면 사라진다.
// 보안 규칙은 적용되지 않는다. 화면과 동작을 눈으로 확인하는 용도다.
const store = new Map();          // 경로 -> 데이터
const listeners = new Set();      // { path, kind, filters, cb }
let seq = 0;
const newId = () => 'm' + Date.now().toString(36) + (seq++).toString(36);

const isSentinel = (v) => v && typeof v === 'object' && v.__sentinel;
const ts = (ms) => ({ __ts: ms });
const hydrate = (v) => {
  if (Array.isArray(v)) return v.map(hydrate);
  if (v && typeof v === 'object') {
    if ('__ts' in v) return { toMillis: () => v.__ts };
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, hydrate(x)]));
  }
  return v;
};
const clone = (v) => JSON.parse(JSON.stringify(v));

function resolve(value, current) {
  if (!isSentinel(value)) return clone(value);
  if (value.__sentinel === 'ts') return ts(Date.now());
  const arr = Array.isArray(current) ? [...current] : [];
  if (value.__sentinel === 'union') value.items.forEach((x) => { if (!arr.includes(x)) arr.push(x); });
  else return arr.filter((x) => !value.items.includes(x));
  return arr;
}
function applyPatch(base, patch) {
  const out = clone(base);
  for (const [key, val] of Object.entries(patch)) {
    const path = key.split('.'); let o = out;
    path.slice(0, -1).forEach((p) => { o = o[p] = o[p] && typeof o[p] === 'object' ? o[p] : {}; });
    const last = path[path.length - 1];
    o[last] = resolve(val, o[last]);
  }
  return out;
}
function setData(path, data) { store.set(path, data); notify(); }
function deleteData(path) { store.delete(path); notify(); }

const parentOf = (p) => p.slice(0, p.lastIndexOf('/'));
const colDocs = (path, filters = []) => [...store.entries()]
  .filter(([p]) => parentOf(p) === path)
  .map(([p, d]) => ({ id: p.slice(path.length + 1), data: () => hydrate(d), ref: { type: 'doc', path: p } }))
  .filter((d) => filters.every((f) => d.data()[f.field] === f.value));
const docSnap = (path) => ({ id: path.slice(path.lastIndexOf('/') + 1), exists: () => store.has(path), data: () => hydrate(store.get(path)), ref: { type: 'doc', path } });

function fire(l) { l.cb(l.kind === 'doc' ? docSnap(l.path) : { docs: colDocs(l.path, l.filters) }); }
function notify() { queueMicrotask(() => listeners.forEach(fire)); }

/* ---------- 인증 ---------- */
let authCb = null, cur = null;
export const initializeApp = (c) => c;
export const getAuth = () => ({});
export const getFirestore = () => ({});
export class GoogleAuthProvider {}
export const onAuthStateChanged = (_a, cb) => { authCb = cb; setTimeout(() => cb(cur), 0); return () => {}; };
export const signInWithPopup = async () => { cur = { uid: 'teacher1', displayName: '선생님(체험)', isAnonymous: false }; authCb?.(cur); };
export const signInAnonymously = async () => { cur = { uid: 'stu' + newId(), displayName: null, isAnonymous: true }; authCb?.(cur); };
export const signOut = async () => { cur = null; authCb?.(null); };

/* ---------- 경로·쿼리 ---------- */
export const collection = (parent, ...segs) => ({ type: 'col', path: [parent?.path, ...segs].filter(Boolean).join('/') });
export const doc = (parent, ...segs) => {
  if (parent?.type === 'col' && !segs.length) return { type: 'doc', path: parent.path + '/' + newId() };
  return { type: 'doc', path: [parent?.path, ...segs].filter(Boolean).join('/') };
};
export const where = (field, _op, value) => ({ field, value });
export const query = (col, ...filters) => ({ ...col, filters });
export const serverTimestamp = () => ({ __sentinel: 'ts' });
export const arrayUnion = (...items) => ({ __sentinel: 'union', items });
export const arrayRemove = (...items) => ({ __sentinel: 'remove', items });

/* ---------- 읽기·쓰기 ---------- */
export const getDoc = async (ref) => docSnap(ref.path);
export const getDocs = async (q) => ({ docs: colDocs(q.path, q.filters) });
export const addDoc = async (col, data) => { const ref = { type: 'doc', path: col.path + '/' + newId(), id: undefined }; ref.id = ref.path.split('/').pop(); setData(ref.path, applyPatch({}, data)); return ref; };
export const updateDoc = async (ref, patch) => { if (!store.has(ref.path)) throw Object.assign(new Error('없는 문서'), { code: 'not-found' }); setData(ref.path, applyPatch(store.get(ref.path), patch)); };
export const deleteDoc = async (ref) => deleteData(ref.path);
export const writeBatch = () => {
  const ops = [];
  return {
    set: (ref, data) => ops.push(() => store.set(ref.path, applyPatch({}, data))),
    delete: (ref) => ops.push(() => store.delete(ref.path)),
    commit: async () => { ops.forEach((f) => f()); notify(); },
  };
};
export const onSnapshot = (ref, cb) => {
  const l = { path: ref.path, kind: ref.type === 'doc' ? 'doc' : 'col', filters: ref.filters, cb };
  listeners.add(l); queueMicrotask(() => fire(l));
  return () => listeners.delete(l);
};

/* ---------- 체험용 샘플 보드 ---------- */
const now = Date.now();
store.set('boards/demo1', {
  title: '체험용 보드', desc: '여러 레이아웃을 바꿔 보며 써 보세요.', bg: '#bfeeff', layout: 'columns', ownerUid: 'teacher1',
  allowPosting: true, allowComments: true, moderation: false, showAuthor: true, reaction: 'like',
  sections: [{ id: 's1', title: '아이디어' }, { id: 's2', title: '진행 중' }, { id: 's3', title: '완료' }], createdAt: ts(now),
});
[
  ['s1', '전기 안전 수칙 정리', '감전 사고를 줄이는 방법을 모아 봅시다.', '#fff3b0', '2026-10-05T09:00', null],
  ['s1', '회로도 그리기 앱', '', '#d3e5ff', '2026-10-08T10:30', null],
  ['s2', '릴레이 시퀀스 실습', '자기유지 회로를 직접 배선해 봤어요.', '#d4f1c5', '2026-10-12T13:00', [37.2636, 127.0286]],
  ['s3', '수원 화성 견학', '현장 체험학습 후기', '#ffd6e0', '2026-10-15T11:00', [37.2866, 127.0119]],
].forEach(([sec, title, body, color, date, ll], i) => store.set(`boards/demo1/posts/p${i}`, {
  title, body, link: '', img: '', color, sectionId: sec, date, lat: ll?.[0] ?? null, lng: ll?.[1] ?? null, place: ll ? '수원' : '',
  authorUid: i % 2 ? 'stuA' : 'teacher1', authorName: i % 2 ? '김민수' : '선생님(체험)', likedBy: i === 0 ? ['stuA'] : [], approved: true,
  createdAt: ts(now - (4 - i) * 3600e3), ord: now - (4 - i) * 3600e3,
}));
