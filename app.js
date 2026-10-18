import { initializeApp, getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut,
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove, writeBatch, demo } from './backend.js';
import { firebaseConfig } from './firebase-config.js';

const BGS = ['#bfeeff', '#ffe3ec', '#e3f7d4', '#fff2bf', '#e6ddff', '#ffffff', '#2b2d42', '#16307a'];
const POST_COLORS = ['#ffffff', '#fff3b0', '#ffd6e0', '#d4f1c5', '#d3e5ff', '#e6dcff'];
const LAYOUTS = {
  wall: '벽돌', columns: '컬럼', grid: '격자', table: '테이블', canvas: '캔버스',
  row: '행', timeline: '타임라인', stream: '스트림', map: '지도',
};
const SORTABLE = ['wall', 'grid', 'stream', 'table'];
const NICK_KEY = 'dambyeorak.nick';
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';

if ('serviceWorker' in navigator && !demo) navigator.serviceWorker.register('sw.js').catch(() => { /* 로컬 파일 등 미지원 환경 */ });

const $ = (s) => document.querySelector(s);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isDark = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 < 100; };
const getNick = () => { try { return localStorage.getItem(NICK_KEY) || ''; } catch { return ''; } };
const setNick = (v) => { try { localStorage.setItem(NICK_KEY, v); } catch { /* 저장 불가 환경 */ } };
const ytId = (u) => (String(u).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/) || [])[1];

if (!demo && firebaseConfig.apiKey.startsWith('YOUR')) {
  $('#app').innerHTML = `<div class="center"><h1>Firebase 설정이 필요해요</h1>
    <p><code>firebase-config.js</code>에 Firebase 웹 앱 설정값을 붙여넣어 주세요.<br>자세한 순서는 <code>SETUP.md</code>를 보세요.</p>
    <p><a href="?demo#/b/demo1">설정 없이 체험해 보기</a></p></div>`;
  throw new Error('firebase-config.js 미설정');
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let user = null;              // 현재 로그인 사용자 (구글=교사, 익명=학생)
let unsubs = [];              // 보드 화면 실시간 리스너
let B = null, P = [], C = []; // 현재 보드, 게시물, 댓글
let pendingRender = false, dragging = false;
let mapInst = null, mapTok = 0, mapView = { center: [36.5, 127.8], zoom: 7 };
const ui = { q: '', sort: 'auto' };
const openComments = new Set();

const isTeacher = () => !!user && !user.isAnonymous;
const isOwner = () => !!user && !!B && B.ownerUid === user.uid;
const myName = () => (isTeacher() ? user.displayName || '선생님' : getNick());
const canEdit = (p) => !!user && (p.authorUid === user.uid || isOwner());
const canWrite = () => isOwner() || B?.allowPosting;
const canComment = () => canWrite() && B?.allowComments !== false;
const showAuthor = (p) => B.showAuthor !== false || isOwner() || p.authorUid === user.uid;
const reaction = () => B.reaction || 'like';

/* ---------- 데이터 보조 ---------- */
const ms = (p) => p.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER; // 서버 시간 확정 전 = 가장 최신
const keyOf = (p) => p.ord ?? ms(p);
const secs = () => (B.sections?.length ? B.sections : [{ id: 'main', title: '게시물' }]);
const secOf = (p) => (secs().some((s) => s.id === p.sectionId) ? p.sectionId : secs()[0].id);
const visible = (p) => p.approved !== false || isOwner() || p.authorUid === user.uid;
const score = (p) => (reaction() === 'star' ? avgStar(p) : (p.likedBy || []).length);
const avgStar = (p) => { const v = Object.values(p.ratings || {}).filter((n) => n > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
const fmtDate = (s) => (s ? s.replace('T', ' ') : '');
const fmtTime = (p) => (p.createdAt?.toMillis ? new Date(p.createdAt.toMillis()).toLocaleString('ko-KR') : '');

function view() {
  const q = ui.q.trim().toLowerCase();
  return P.filter(visible).filter((p) => !q || [p.title, p.body, p.authorName, p.link, p.place].some((t) => String(t || '').toLowerCase().includes(q)));
}
function arrange(list) {
  const mode = ui.sort === 'auto' ? (B.layout === 'stream' ? 'new' : 'old') : ui.sort;
  const cmp = { old: (a, b) => keyOf(a) - keyOf(b), new: (a, b) => keyOf(b) - keyOf(a), likes: (a, b) => score(b) - score(a) || keyOf(a) - keyOf(b) }[mode];
  return [...list].sort(SORTABLE.includes(B.layout) ? cmp : (a, b) => keyOf(a) - keyOf(b));
}
const bySection = (list, id) => list.filter((p) => secOf(p) === id).sort((a, b) => keyOf(a) - keyOf(b));
function slideOrder(list) {
  if (B.layout === 'timeline') return timelineOrder(list);
  if (B.layout === 'columns' || B.layout === 'row') return secs().flatMap((s) => bySection(list, s.id));
  return arrange(list);
}
const timelineOrder = (list) => [...list].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || ms(a) - ms(b));

/* ---------- 인증 / 라우팅 ---------- */
onAuthStateChanged(auth, (u) => { user = u; route(); });
addEventListener('hashchange', route);
document.addEventListener('focusout', () => setTimeout(() => { if (pendingRender) renderBoard(); }, 0));

function cleanup() {
  unsubs.forEach((f) => f()); unsubs = []; B = null; P = []; C = []; pendingRender = false;
  mapInst?.remove(); mapInst = null;
}

async function route() {
  cleanup();
  const m = location.hash.match(/^#\/b\/(\w+)/);
  topbar();
  if (m) return enterBoard(m[1]);
  document.body.style.background = '';
  if (!isTeacher()) return renderLogin();
  renderHome();
}

function topbar() {
  const who = user ? `<span class="who">${esc(myName() || '')}</span>` : '';
  $('#topActions').innerHTML = isTeacher() ? `${who}<button id="out">로그아웃</button>` : who;
  $('#out')?.addEventListener('click', () => signOut(auth));
}

function renderLogin() {
  $('#app').innerHTML = `<div class="center"><h1>담벼락</h1><p>선생님은 구글로 로그인해 보드를 만들 수 있어요.<br>학생은 선생님이 준 링크로 들어오세요.</p>
    <button class="primary" id="gl">${demo ? '체험 모드로 시작 (선생님)' : '구글로 로그인'}</button></div>`;
  $('#gl').onclick = () => signInWithPopup(auth, new GoogleAuthProvider()).catch((e) => alert('로그인 실패: ' + e.code));
}

/* ---------- 홈 (교사) ---------- */
async function renderHome() {
  $('#app').innerHTML = `<section class="home"><h1>내 보드</h1><div class="boards" id="boards"><p>불러오는 중…</p></div></section>`;
  const snap = await getDocs(query(collection(db, 'boards'), where('ownerUid', '==', user.uid)));
  const boards = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  if (location.hash.startsWith('#/b/')) return; // 로딩 중 다른 화면으로 이동함
  $('#boards').innerHTML = `<button class="bcard bnew" id="newBoard">+ 새 보드 만들기</button>` +
    boards.map((b) => `<a class="bcard" href="#/b/${b.id}" style="background:${esc(b.bg)};${isDark(b.bg) ? 'color:#fff' : ''}">
      <b>${esc(b.title)}</b><small style="${isDark(b.bg) ? 'color:#fffa' : ''}">${LAYOUTS[b.layout] || ''}</small></a>`).join('');
  $('#newBoard').onclick = () => boardDialog(null);
}

/* ---------- 보드 입장 ---------- */
async function enterBoard(id) {
  if (!user || (!isTeacher() && !getNick())) return renderJoin();
  $('#app').innerHTML = '<div class="center"><p>불러오는 중…</p></div>';
  let first;
  try { first = await getDoc(doc(db, 'boards', id)); } catch { first = null; }
  if (!first?.exists()) { $('#app').innerHTML = '<div class="center"><h1>보드를 찾을 수 없어요</h1><p>링크를 다시 확인해 주세요.</p></div>'; return; }
  if (!location.hash.includes(id)) return;
  const ref = doc(db, 'boards', id);
  unsubs.push(
    onSnapshot(ref, (s) => {
      if (!s.exists()) { location.hash = '#/'; return; }
      B = { id: s.id, ...s.data() }; renderBoard();
    }),
    onSnapshot(collection(ref, 'posts'), (s) => { P = s.docs.map((d) => ({ id: d.id, ...d.data() })); renderBoard(); }),
    onSnapshot(collection(ref, 'comments'), (s) => { C = s.docs.map((d) => ({ id: d.id, ...d.data() })); renderBoard(); }),
  );
}

function renderJoin() {
  document.body.style.background = '';
  $('#app').innerHTML = `<div class="center"><h1>보드에 참여하기</h1><p>사용할 이름(닉네임)을 입력하세요.</p>
    <form id="jf"><input name="nick" maxlength="20" placeholder="예: 3학년 김민수" value="${esc(getNick())}" required>
    <button class="primary">입장</button></form></div>`;
  $('#jf').onsubmit = async (e) => {
    e.preventDefault();
    const nick = e.target.nick.value.trim();
    if (!nick) return;
    setNick(nick);
    if (user) return route();            // 이미 로그인된 익명 사용자: 닉네임만 갱신
    try { await signInAnonymously(auth); } catch (err) { alert('입장 실패: ' + err.code); }
  };
}

/* ---------- 보드 화면 ---------- */
function renderBoard() {
  if (!B) return;
  const active = document.activeElement;
  if (dragging || (active?.matches?.('#app input:not(#q), #app textarea') && active.value)) { pendingRender = true; return; }
  pendingRender = false;
  const qCaret = active?.id === 'q' ? active.selectionStart : null;

  document.body.style.background = B.bg;
  const dark = isDark(B.bg), owner = isOwner();
  $('#topActions').innerHTML = `<span class="who">${esc(myName())}</span>` + (isTeacher() ? `<button id="out">로그아웃</button>` : '');
  $('#out')?.addEventListener('click', () => signOut(auth));

  const locked = !canWrite();
  const sortable = SORTABLE.includes(B.layout);
  $('#app').innerHTML = `<section class="board" style="${dark ? 'color:#fff' : ''}">
    <div class="bhead"><div><h1>${esc(B.title)}</h1>${B.desc ? `<p>${esc(B.desc)}</p>` : ''}${locked ? '<p>🔒 지금은 게시물을 올릴 수 없어요.</p>' : ''}${B.moderation && !owner ? '<p>선생님이 승인하면 게시물이 모두에게 보여요.</p>' : ''}</div>
      <div class="tools row">
        <input id="q" type="search" placeholder="검색" value="${esc(ui.q)}">
        ${sortable ? `<select id="sort"><option value="auto">기본 순서</option><option value="new">최신순</option><option value="old">오래된 순</option><option value="likes">${reaction() === 'star' ? '별점순' : '좋아요순'}</option></select>` : ''}
        <button id="slide">▶ 슬라이드쇼</button><button id="share">공유</button>
        ${owner ? `<details class="menu"><summary>⋯</summary><div>
          <button id="bset">보드 설정</button><button id="bsec">섹션 추가</button><button id="bdup">보드 복제</button>
          <button id="bcsv">CSV로 내보내기</button><button id="bprint">인쇄</button><button id="bdel" class="danger">보드 삭제</button></div></details>` : ''}
      </div></div>
    ${owner ? `<div class="layouts row">${Object.entries(LAYOUTS).map(([k, v]) => `<button data-l="${k}" class="${B.layout === k ? 'on' : ''}">${v}</button>`).join('')}</div>` : ''}
    <div id="posts" class="posts"></div>
    ${locked ? '' : '<button class="fab primary" id="addPost" title="게시물 추가">+</button>'}</section>`;

  if ($('#sort')) $('#sort').value = ui.sort;
  $('#sort')?.addEventListener('change', (e) => { ui.sort = e.target.value; fillPosts(); });
  $('#q').oninput = (e) => { ui.q = e.target.value; fillPosts(); };
  $('#slide').onclick = slideshow;
  $('#share').onclick = shareDialog;
  $('#addPost')?.addEventListener('click', () => postDialog(null));
  document.querySelectorAll('[data-l]').forEach((el) => el.onclick = () => updateDoc(doc(db, 'boards', B.id), { layout: el.dataset.l }));
  if (owner) {
    $('#bset').onclick = () => boardDialog(B);
    $('#bsec').onclick = addSection;
    $('#bdup').onclick = duplicateBoard;
    $('#bcsv').onclick = exportCsv;
    $('#bprint').onclick = () => print();
    $('#bdel').onclick = deleteBoard;
  }
  fillPosts();
  if (qCaret !== null) { $('#q').focus(); $('#q').setSelectionRange(qCaret, qCaret); }
}

function fillPosts() {
  mapTok++; mapInst?.remove(); mapInst = null;
  const box = $('#posts');
  box.className = 'posts'; box.innerHTML = '';
  box.onclick = sectionClick;
  const list = view();
  const structural = ['columns', 'row', 'map'].includes(B.layout);
  if (!list.length && !structural) {
    box.innerHTML = `<div class="empty">${ui.q ? '검색 결과가 없어요.' : '아직 게시물이 없어요.'}</div>`;
    return;
  }
  ({ wall: flat, grid: flat, stream: flat, canvas, columns, row, table, timeline, map })[B.layout]?.(box, list);
}

/* ---------- 레이아웃 ---------- */
const secHead = (s) => `${esc(s.title)}${isOwner() && B.sections?.length ? ` <button class="x" data-ren="${s.id}" title="이름 바꾸기">✎</button><button class="x" data-sdel="${s.id}" title="섹션 삭제">×</button>` : ''}`;

function flat(box, list) {
  const ss = secs();
  if (ss.length < 2) { box.classList.add(B.layout); arrange(list).forEach((p) => box.append(postEl(p))); return; }
  ss.forEach((s) => {
    const add = canWrite() ? ` <button class="x" data-sadd="${s.id}" title="이 섹션에 게시">＋</button>` : '';
    const blk = h(`<div class="secblock"><h2>${secHead(s)}${add}</h2><div class="${B.layout}"></div></div>`);
    arrange(list.filter((p) => secOf(p) === s.id)).forEach((p) => blk.lastElementChild.append(postEl(p)));
    box.append(blk);
  });
}

function canvas(box, list) {
  box.classList.add('canvas');
  arrange(list).forEach((p) => box.append(postEl(p)));
  enableDrag(box);
}

function sectionBoard(box, list, kind) {
  box.classList.add(kind);
  secs().forEach((s) => {
    const col = h(`<div class="${kind === 'columns' ? 'col' : 'rowsec'}"><div class="colhead"><h2>${secHead(s)}</h2>${canWrite() ? `<button class="x" data-sadd="${s.id}" title="이 섹션에 게시">＋</button>` : ''}</div><div class="cards" data-sec="${s.id}"></div></div>`);
    bySection(list, s.id).forEach((p) => col.querySelector('.cards').append(postEl(p)));
    box.append(col);
  });
  if (isOwner()) box.append(h('<button class="addsec" data-addsec>＋ 섹션 추가</button>'));
  enableDnD(box, kind === 'row');
}
const columns = (box, list) => sectionBoard(box, list, 'columns');
const row = (box, list) => sectionBoard(box, list, 'rows');

function table(box, list) {
  const au = B.showAuthor !== false || isOwner();
  box.innerHTML = `<table class="tbl"><thead><tr><th>제목</th><th>내용</th>${au ? '<th>작성자</th>' : ''}<th>링크</th><th>반응</th><th>댓글</th><th>작성일</th><th></th></tr></thead><tbody></tbody></table>`;
  const tb = box.querySelector('tbody');
  arrange(list).forEach((p) => {
    const tr = document.createElement('tr');
    const safe = /^https?:\/\//i.test(p.link || '') ? p.link : '';
    tr.innerHTML = `<td>${esc(p.title)}${p.approved === false ? ' <span class="badge">승인 대기</span>' : ''}</td><td class="wrap">${esc(p.body)}</td>${au ? `<td>${esc(p.authorName)}</td>` : ''}
      <td>${safe ? `<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer">링크</a>` : ''}</td><td class="rx"></td>
      <td>${B.allowComments !== false ? `<button data-a="cmt">💬 ${C.filter((c) => c.postId === p.id).length}</button>` : ''}</td><td>${esc(fmtTime(p))}</td><td class="act"></td>`;
    tr.querySelector('.rx').append(reactionEl(p));
    tr.querySelector('.act').append(...actionBtns(p));
    tb.append(tr);
    tr.querySelector('[data-a=cmt]')?.addEventListener('click', () => {
      openComments.has(p.id) ? openComments.delete(p.id) : openComments.add(p.id); fillPosts();
    });
    if (openComments.has(p.id)) {
      const cr = document.createElement('tr'); cr.className = 'cmtrow';
      const td = document.createElement('td'); td.colSpan = 8; td.append(commentsEl(p, true)); cr.append(td); tb.append(cr);
    }
  });
}

function timeline(box, list) {
  box.classList.add('timeline');
  timelineOrder(list).forEach((p, i) => {
    const it = h(`<div class="tl-item ${i % 2 ? 'r' : 'l'}"><div class="tl-date">${esc(fmtDate(p.date)) || '날짜 없음'}</div><div class="tl-dot"></div><div class="tl-card"></div></div>`);
    it.querySelector('.tl-card').append(postEl(p));
    box.append(it);
  });
}

async function map(box, list) {
  box.classList.add('mapview');
  box.innerHTML = '<div id="map">지도를 불러오는 중…</div><div class="nolocs"></div>';
  const el = box.querySelector('#map'), tok = mapTok;
  let L;
  try { L = await loadLeaflet(); } catch { el.textContent = '지도를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'; return; }
  if (tok !== mapTok || !el.isConnected) return; // 그 사이 다시 그려졌으면 이번 호출은 버린다
  el.textContent = '';
  mapInst = L.map(el).setView(mapView.center, mapView.zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapInst);
  mapInst.on('moveend', () => { const c = mapInst.getCenter(); mapView = { center: [c.lat, c.lng], zoom: mapInst.getZoom() }; });
  const placed = list.filter((p) => p.lat != null && p.lng != null);
  placed.forEach((p) => L.marker([p.lat, p.lng], { icon: L.divIcon({ className: 'pin', html: '📍', iconSize: [28, 28], iconAnchor: [14, 26] }) })
    .addTo(mapInst).bindPopup(postEl(p), { maxWidth: 300 }));
  if (placed.length && mapView.zoom === 7) mapInst.fitBounds(placed.map((p) => [p.lat, p.lng]), { padding: [40, 40], maxZoom: 14 });
  if (canWrite()) mapInst.on('click', (e) => postDialog(null, { lat: e.latlng.lat, lng: e.latlng.lng }));
  const rest = list.filter((p) => p.lat == null || p.lng == null);
  if (rest.length) {
    const nl = box.querySelector('.nolocs');
    nl.innerHTML = '<h2>위치가 없는 게시물</h2><div class="wall"></div>';
    rest.forEach((p) => nl.querySelector('.wall').append(postEl(p)));
  }
}

let leafletP;
function loadLeaflet() {
  leafletP ??= new Promise((res, rej) => {
    if (window.L) return res(window.L);
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = CDN + 'leaflet/1.9.4/leaflet.min.css'; document.head.append(css);
    const s = document.createElement('script'); s.src = CDN + 'leaflet/1.9.4/leaflet.min.js';
    s.onload = () => res(window.L); s.onerror = () => { leafletP = null; rej(new Error('leaflet')); }; document.head.append(s);
  });
  return leafletP;
}

/* ---------- 섹션 ---------- */
function sectionClick(e) {
  const t = e.target.closest('[data-ren],[data-sdel],[data-sadd],[data-addsec]');
  if (!t) return;
  if (t.dataset.addsec !== undefined) return addSection();
  if (t.dataset.sadd) return postDialog(null, { sectionId: t.dataset.sadd });
  const list = [...(B.sections || [])];
  if (t.dataset.ren) {
    const s = list.find((x) => x.id === t.dataset.ren); const name = prompt('섹션 이름', s.title);
    if (name?.trim()) { s.title = name.trim(); updateDoc(doc(db, 'boards', B.id), { sections: list }); }
  } else if (t.dataset.sdel && confirm('섹션을 삭제할까요? 안에 있던 게시물은 첫 번째 섹션으로 옮겨져요.')) {
    updateDoc(doc(db, 'boards', B.id), { sections: list.filter((x) => x.id !== t.dataset.sdel) });
  }
}

function addSection() {
  const name = prompt('새 섹션 이름');
  if (!name?.trim()) return;
  const list = B.sections?.length ? [...B.sections] : [{ id: 'main', title: '섹션 1' }];
  list.push({ id: 's' + Date.now().toString(36), title: name.trim() });
  updateDoc(doc(db, 'boards', B.id), { sections: list });
}

/* ---------- 게시물 카드 ---------- */
function reactionEl(p) {
  const pref = doc(db, 'boards', B.id, 'posts', p.id), mode = reaction();
  if (mode === 'none') return document.createElement('span');
  if (mode === 'star') {
    const mine = p.ratings?.[user.uid] || 0, n = Object.values(p.ratings || {}).filter((v) => v > 0).length;
    const el = h(`<span class="stars">${[1, 2, 3, 4, 5].map((i) => `<button data-star="${i}" class="${mine >= i ? 'on' : ''}">★</button>`).join('')}<small>${n ? avgStar(p).toFixed(1) + ` (${n})` : ''}</small></span>`);
    el.querySelectorAll('[data-star]').forEach((b) => b.onclick = () => {
      const v = Number(b.dataset.star);
      updateDoc(pref, { [`ratings.${user.uid}`]: mine === v ? 0 : v });
    });
    return el;
  }
  const liked = (p.likedBy || []).includes(user.uid);
  const el = h(`<button class="${liked ? 'on' : ''}">♥ ${(p.likedBy || []).length}</button>`);
  el.onclick = () => updateDoc(pref, { likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  return el;
}

function actionBtns(p) {
  const pref = doc(db, 'boards', B.id, 'posts', p.id), out = [];
  const mk = (txt, cls, fn) => { const b = h(`<button class="${cls}">${txt}</button>`); b.onclick = fn; out.push(b); };
  if (isOwner() && p.approved === false) mk('승인', 'primary', () => updateDoc(pref, { approved: true }));
  if (canEdit(p)) {
    mk('수정', '', () => postDialog(p));
    mk('삭제', 'danger', () => { if (confirm('게시물을 삭제할까요?')) deleteDoc(pref); });
  }
  return out;
}

function commentsEl(p, forceOpen) {
  const cs = C.filter((c) => c.postId === p.id).sort((a, b) => (a.createdAt?.toMillis?.() ?? Infinity) - (b.createdAt?.toMillis?.() ?? Infinity));
  const el = h(`<div class="comments" ${forceOpen || openComments.has(p.id) ? '' : 'hidden'}>
    ${cs.map((c) => `<div><b>${esc(c.authorName)}</b> ${esc(c.text)}${(c.authorUid === user.uid || isOwner()) ? ` <button class="x" data-cdel="${c.id}">×</button>` : ''}</div>`).join('')}
    ${canComment() ? '<form><input placeholder="댓글 달기" maxlength="200"><button class="primary">등록</button></form>' : ''}</div>`);
  el.querySelectorAll('[data-cdel]').forEach((b) => b.onclick = () => deleteDoc(doc(db, 'boards', B.id, 'comments', b.dataset.cdel)));
  const form = el.querySelector('form');
  if (form) form.onsubmit = async (e) => {
    e.preventDefault();
    const input = form.querySelector('input'), text = input.value.trim();
    if (!text) return;
    input.value = '';
    await addDoc(collection(db, 'boards', B.id, 'comments'), { postId: p.id, text, authorUid: user.uid, authorName: myName(), createdAt: serverTimestamp() });
  };
  return el;
}

function mediaHtml(p) {
  const safe = /^https?:\/\//i.test(p.link || '') ? p.link : '', yt = safe && ytId(safe);
  return { safe, html: `${p.img ? `<img class="pimg" src="${esc(p.img)}" alt="">` : ''}${yt ? `<iframe class="yt" src="https://www.youtube-nocookie.com/embed/${yt}" allowfullscreen loading="lazy"></iframe>` : ''}` };
}

function postEl(p) {
  const el = document.createElement('article');
  el.className = 'post'; el.dataset.id = p.id;
  el.style.background = p.color || '#fff';
  if (isDark(p.color || '#fff')) el.style.color = '#fff';
  if (B.layout === 'canvas') { el.style.left = (p.x ?? 20) + 'px'; el.style.top = (p.y ?? 20) + 'px'; }
  el.draggable = ['columns', 'row'].includes(B.layout) && canEdit(p);
  const { safe, html: media } = mediaHtml(p);
  const nCmt = C.filter((c) => c.postId === p.id).length;
  el.innerHTML = `${media}
    ${p.approved === false ? '<div class="badge">승인 대기</div>' : ''}
    ${showAuthor(p) ? `<div class="author">${esc(p.authorName)}</div>` : ''}
    ${B.layout === 'timeline' ? '' : (p.date ? `<div class="meta">🕒 ${esc(fmtDate(p.date))}</div>` : '')}
    ${p.place ? `<div class="meta">📍 ${esc(p.place)}</div>` : ''}
    ${p.title ? `<h3>${esc(p.title)}</h3>` : ''}${p.body ? `<p>${esc(p.body)}</p>` : ''}
    ${safe && !ytId(safe) ? `<a class="plink" href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(safe)}</a>` : ''}
    <div class="pbar"><span class="rx"></span>${B.allowComments !== false ? `<button data-a="cmt">💬 ${nCmt}</button>` : ''}<span class="sp"></span></div>`;
  el.querySelector('.rx').replaceWith(reactionEl(p));
  el.querySelector('.pbar').append(...actionBtns(p));
  const cm = commentsEl(p);
  el.append(cm);
  el.querySelector('[data-a=cmt]')?.addEventListener('click', () => {
    cm.hidden = !cm.hidden;
    cm.hidden ? openComments.delete(p.id) : openComments.add(p.id);
  });
  return el;
}

/* ---------- 끌어서 이동 ---------- */
function enableDrag(box) {
  box.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.post');
    if (!el || e.target.closest('button,input,a,iframe')) return;
    const p = P.find((x) => x.id === el.dataset.id);
    if (!p || !canEdit(p)) return;
    const sx = e.clientX - el.offsetLeft, sy = e.clientY - el.offsetTop;
    let x = p.x ?? 20, y = p.y ?? 20;
    dragging = true; el.classList.add('drag'); el.setPointerCapture(e.pointerId);
    const move = (ev) => { x = Math.max(0, ev.clientX - sx); y = Math.max(0, ev.clientY - sy); el.style.left = x + 'px'; el.style.top = y + 'px'; };
    const up = async () => {
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up);
      el.classList.remove('drag'); dragging = false;
      await updateDoc(doc(db, 'boards', B.id, 'posts', p.id), { x: Math.round(x), y: Math.round(y) });
      if (pendingRender) renderBoard();
    };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
  });
}

function enableDnD(box, horizontal) {
  let dragId = null;
  const place = (zone, e) => {
    const items = [...zone.querySelectorAll(':scope > .post')].filter((x) => x.dataset.id !== dragId);
    const pos = horizontal ? e.clientX : e.clientY;
    const before = items.find((it) => { const r = it.getBoundingClientRect(); return pos < (horizontal ? r.left + r.width / 2 : r.top + r.height / 2); });
    return { items, idx: before ? items.indexOf(before) : items.length };
  };
  box.ondragstart = (e) => {
    const el = e.target.closest?.('.post[draggable=true]'); if (!el) return;
    dragId = el.dataset.id; dragging = true; el.classList.add('drag');
    e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId);
  };
  box.ondragover = (e) => {
    const zone = e.target.closest?.('.cards'); if (!zone || !dragId) return;
    e.preventDefault(); box.querySelectorAll('.cards.over').forEach((z) => z !== zone && z.classList.remove('over')); zone.classList.add('over');
  };
  box.ondrop = async (e) => {
    const zone = e.target.closest?.('.cards'); if (!zone || !dragId) return;
    e.preventDefault();
    const { items, idx } = place(zone, e), key = (el) => keyOf(P.find((p) => p.id === el.dataset.id));
    const prev = items[idx - 1] ? key(items[idx - 1]) : null, next = items[idx] ? key(items[idx]) : null;
    const ord = prev == null && next == null ? Date.now() : prev == null ? next - 1000 : next == null || next > 1e15 ? Math.min(prev, Date.now()) + 1000 : (prev + next) / 2;
    const id = dragId; dragId = null;
    await updateDoc(doc(db, 'boards', B.id, 'posts', id), { sectionId: zone.dataset.sec, ord });
  };
  box.ondragend = () => {
    dragId = null; dragging = false; box.querySelectorAll('.drag,.over').forEach((x) => x.classList.remove('drag', 'over'));
    if (pendingRender) renderBoard();
  };
}

/* ---------- 슬라이드쇼 · 공유 · 내보내기 ---------- */
function slideshow() {
  const list = slideOrder(view());
  if (!list.length) return alert('보여 줄 게시물이 없어요.');
  const d = $('#slideDialog'); let i = 0;
  const draw = () => {
    const p = list[i], { safe, html } = mediaHtml(p);
    $('#slideNo').textContent = `${i + 1} / ${list.length}`;
    $('#slideBody').innerHTML = `<div class="slide" style="background:${esc(p.color || '#fff')};${isDark(p.color || '#fff') ? 'color:#fff' : ''}">${html}
      ${p.title ? `<h2>${esc(p.title)}</h2>` : ''}${p.body ? `<p>${esc(p.body)}</p>` : ''}
      ${safe && !ytId(safe) ? `<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(safe)}</a>` : ''}
      ${showAuthor(p) ? `<div class="author">${esc(p.authorName)}</div>` : ''}</div>`;
  };
  const go = (n) => { i = (i + n + list.length) % list.length; draw(); };
  $('#slidePrev').onclick = () => go(-1); $('#slideNext').onclick = () => go(1); $('#slideClose').onclick = () => d.close();
  d.onkeydown = (e) => { if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); };
  draw(); d.showModal();
}

let qrP;
function shareDialog() {
  const d = $('#shareDialog'), link = location.href;
  $('#shareLink').value = link; $('#qr').innerHTML = '';
  $('#shareClose').onclick = () => d.close();
  $('#shareCopy').onclick = async () => { try { await navigator.clipboard.writeText(link); $('#shareCopy').textContent = '복사했어요 ✓'; } catch { $('#shareLink').select(); } };
  $('#shareCopy').textContent = '링크 복사';
  qrP ??= new Promise((res, rej) => { const s = document.createElement('script'); s.src = CDN + 'qrcodejs/1.0.0/qrcode.min.js'; s.onload = res; s.onerror = () => { qrP = null; rej(); }; document.head.append(s); });
  qrP.then(() => new window.QRCode($('#qr'), { text: link, width: 200, height: 200 })).catch(() => { $('#qr').textContent = 'QR코드를 만들지 못했어요.'; });
  d.showModal();
}

function exportCsv() {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const names = Object.fromEntries(secs().map((s) => [s.id, s.title]));
  const rows = [['섹션', '제목', '내용', '링크', '작성자', '반응', '날짜', '장소', '작성시간'],
    ...slideOrder(P.filter(visible)).map((p) => [names[secOf(p)], p.title, p.body, p.link, p.authorName,
      reaction() === 'star' ? avgStar(p).toFixed(1) : (p.likedBy || []).length, p.date, p.place, fmtTime(p)])];
  const blob = new Blob(['﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${B.title}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function duplicateBoard() {
  if (!confirm('이 보드를 게시물까지 복제할까요? (댓글과 반응은 복제되지 않아요)')) return;
  const { id, createdAt, ...rest } = B;
  const ref = await addDoc(collection(db, 'boards'), { ...rest, title: `${B.title} (복사본)`, ownerUid: user.uid, createdAt: serverTimestamp() });
  for (let i = 0; i < P.length; i += 400) {
    const batch = writeBatch(db);
    P.slice(i, i + 400).forEach(({ id: _id, createdAt: _c, likedBy: _l, ratings: _r, ...p }) =>
      batch.set(doc(collection(db, 'boards', ref.id, 'posts')), { ...p, authorUid: user.uid, likedBy: [], approved: true, createdAt: serverTimestamp() }));
    await batch.commit();
  }
  location.hash = `#/b/${ref.id}`;
}

async function deleteBoard() {
  if (!confirm(`"${B.title}" 보드와 모든 게시물을 삭제할까요?`)) return;
  const ref = doc(db, 'boards', B.id);
  for (const name of ['posts', 'comments']) {
    const snap = await getDocs(collection(ref, name));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  const id = B.id; cleanup();
  await deleteDoc(doc(db, 'boards', id));
  location.hash = '#/';
}

/* ---------- 다이얼로그 ---------- */
function swatches(host, colors, current) {
  host.innerHTML = colors.map((c) => `<button type="button" class="sw ${c === current ? 'sel' : ''}" data-c="${c}" style="background:${c}"></button>`).join('');
  host.onclick = (e) => {
    const s = e.target.closest('.sw'); if (!s) return;
    host.querySelectorAll('.sw').forEach((x) => x.classList.toggle('sel', x === s));
  };
}
const picked = (host) => host.querySelector('.sel')?.dataset.c;

function boardDialog(b) {
  const d = $('#boardDialog'), f = $('#boardForm');
  $('#boardDialogTitle').textContent = b ? '보드 설정' : '새 보드 만들기';
  f.layout.innerHTML = Object.entries(LAYOUTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  f.title.value = b?.title || ''; f.desc.value = b?.desc || ''; f.layout.value = b?.layout || 'wall'; f.reaction.value = b?.reaction || 'like';
  f.allowPosting.checked = b ? !!b.allowPosting : true; f.allowComments.checked = b?.allowComments !== false;
  f.moderation.checked = !!b?.moderation; f.showAuthor.checked = b?.showAuthor !== false;
  swatches($('#bgPick'), BGS, b?.bg || BGS[0]);
  $('#boardCancel').onclick = () => d.close();
  f.onsubmit = async () => {
    const data = {
      title: f.title.value.trim(), desc: f.desc.value.trim(), bg: picked($('#bgPick')), layout: f.layout.value, reaction: f.reaction.value,
      allowPosting: f.allowPosting.checked, allowComments: f.allowComments.checked, moderation: f.moderation.checked, showAuthor: f.showAuthor.checked,
    };
    if (b) await updateDoc(doc(db, 'boards', b.id), data);
    else {
      const ref = await addDoc(collection(db, 'boards'), { ...data, sections: [], ownerUid: user.uid, createdAt: serverTimestamp() });
      location.hash = `#/b/${ref.id}`;
    }
  };
  d.showModal();
}

let pickInst = null;
function postDialog(p, preset = {}) {
  const d = $('#postDialog'), f = $('#postForm'), prev = $('#imgPreview');
  let img = p?.img || '', ll = p?.lat != null ? [p.lat, p.lng] : preset.lat != null ? [preset.lat, preset.lng] : null;
  $('#postDialogTitle').textContent = p ? '게시물 수정' : '게시물 작성';
  f.title.value = p?.title || ''; f.body.value = p?.body || ''; f.link.value = p?.link || '';
  const showImg = () => { prev.hidden = !img; prev.src = img; $('#imgClear').hidden = !img; };
  showImg();
  swatches($('#colorPick'), POST_COLORS, p?.color || POST_COLORS[0]);
  f.img.value = '';
  f.img.onchange = async () => { const file = f.img.files[0]; if (file) { img = await shrink(file); showImg(); } };
  $('#imgClear').onclick = () => { img = ''; f.img.value = ''; showImg(); };

  const ss = secs();
  $('#secWrap').hidden = ss.length < 2;
  f.section.innerHTML = ss.map((s) => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('');
  f.section.value = p ? secOf(p) : (preset.sectionId || ss[0].id);
  $('#dateWrap').hidden = B.layout !== 'timeline'; f.date.value = p?.date || '';
  $('#pickWrap').hidden = B.layout !== 'map'; f.place.value = p?.place || '';
  pickInst?.remove(); pickInst = null;
  if (B.layout === 'map') {
    let marker = null;
    const setMarker = (L, pos) => { marker?.remove(); marker = pos ? L.marker(pos).addTo(pickInst) : null; };
    loadLeaflet().then((L) => {
      if (!d.open) return;
      pickInst = L.map('pickMap').setView(ll || mapView.center, ll ? 13 : mapView.zoom);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(pickInst);
      setMarker(L, ll);
      pickInst.on('click', (e) => { ll = [e.latlng.lat, e.latlng.lng]; setMarker(L, ll); });
      $('#pickClear').onclick = () => { ll = null; setMarker(L, null); };
      setTimeout(() => pickInst?.invalidateSize(), 60);
    }).catch(() => { $('#pickMap').textContent = '지도를 불러오지 못했어요.'; });
  }
  d.onclose = () => { pickInst?.remove(); pickInst = null; };
  $('#postCancel').onclick = () => d.close();
  f.onsubmit = async () => {
    const data = {
      title: f.title.value.trim(), body: f.body.value.trim(), link: f.link.value.trim(), img, color: picked($('#colorPick')),
      sectionId: f.section.value, date: f.date.value || (p?.date || ''), place: f.place.value.trim(),
      lat: ll ? ll[0] : null, lng: ll ? ll[1] : null,
    };
    if (!data.title && !data.body && !data.link && !data.img) return;
    try {
      if (p) await updateDoc(doc(db, 'boards', B.id, 'posts', p.id), data);
      else await addDoc(collection(db, 'boards', B.id, 'posts'), {
        ...data, authorUid: user.uid, authorName: myName(), likedBy: [], createdAt: serverTimestamp(),
        approved: isOwner() || !B.moderation, ord: Date.now(),
        x: 20 + (P.length % 8) * 36, y: 20 + (P.length % 8) * 36,
      });
    } catch (e) { alert('저장하지 못했어요: ' + (e.code || e.message)); }
  };
  d.showModal();
}

/* Firestore 문서 한도(1MB)를 넘지 않도록 가로 600px JPEG로 줄인다 */
function shrink(file) {
  return new Promise((res) => {
    const im = new Image(), url = URL.createObjectURL(file);
    im.onload = () => {
      const r = Math.min(1, 600 / im.width), c = document.createElement('canvas');
      c.width = im.width * r; c.height = im.height * r;
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.6));
    };
    im.src = url;
  });
}
