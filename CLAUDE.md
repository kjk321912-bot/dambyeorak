# 담벼락 (페들렛 클론) — 프로젝트 안내

학생과 함께 쓰는 공동작업 보드 웹앱. 순수 HTML+JS(빌드 없음) + Firebase(Auth, Firestore), PWA.

- 배포: GitHub Pages (저장소 루트 = 앱 루트). 주소는 `NEXT.md` 상단 참고
- Firebase 프로젝트: `dambyeorak` (ID `dambyeorak-8cfef`), 콘솔에서 Authentication(Google·익명)과 Firestore 규칙 설정 완료
- `firebase-config.js`의 값은 공개돼도 되는 식별 정보다. 접근 제어는 `firestore.rules`가 한다.

## 파일
- `app.js` 화면·동작 전체, `backend.js` Firebase 연결(주소에 `?demo`가 있으면 `mock-firebase.js` 사용)
- `mock-firebase.js` 체험 모드용 메모리 저장소(규칙 미적용), `firestore.rules` 보안 규칙
- `sw.js` 서비스워커, `manifest.webmanifest`, `icons/`

## 작업 규칙
- 앱 파일을 고치면 `sw.js`의 `VERSION`을 올린다(설치된 기기에 새 버전이 반영되는 조건). 파일을 새로 추가하면 `CORE` 목록도 고친다.
- `firestore.rules`를 고치면 Firebase 콘솔 > Firestore > 규칙에 붙여넣고 **게시**해야 서버에 반영된다.
- 로컬 확인: 폴더에서 `python -m http.server 8765` 후 `http://localhost:8765/` (Firebase 연결) 또는 `/?demo` (체험).
- 작업 시작 전 `git pull`, 끝나면 커밋하고 `git push`.
