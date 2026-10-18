// 새 보드를 만들 때 고르는 양식. 패들렛 갤러리의 예시 보드를 종류별로 분류한 뒤, 수업에서 바로 쓰도록 새로 구성했다.
// 게시물 필드: s=섹션 번호, t=제목, b=내용, c=카드 색, d=오늘 기준 날짜 오프셋(일), ll=[위도,경도], p=장소 이름
export const TEMPLATE_CATS = ['수업·학습', '실습·프로젝트', '계획·관리', '소개·공유', '연표·지도'];

const Y = '#fff3b0', P = '#ffd6e0', G = '#d4f1c5', B = '#d3e5ff', V = '#e6dcff';

export const TEMPLATES = [
  /* ---------- 수업·학습 ---------- */
  { cat: '수업·학습', icon: '📘', name: 'KWL 차트', desc: '이미 아는 것 · 알고 싶은 것 · 새로 배운 것을 정리해요.', layout: 'columns', bg: '#e6ddff', reaction: 'none',
    sections: ['K · 이미 아는 것', 'W · 알고 싶은 것', 'L · 새로 배운 것'],
    posts: [{ s: 0, t: '예시) 전기는 전선을 통해 흐른다', c: Y }, { s: 1, t: '예시) 감전은 왜 위험할까?', c: B }, { s: 2, t: '예시) 전류가 흐르는 크기는 저항에 반비례한다', c: G }] },
  { cat: '수업·학습', icon: '⚖️', name: '찬반 토론', desc: '주제에 대한 찬성·반대 의견과 근거를 모아요.', layout: 'columns', bg: '#fff2bf', reaction: 'like',
    sections: ['토론 주제', '찬성', '반대', '결론·느낀 점'],
    posts: [{ s: 0, t: '토론 주제를 여기에 적어 주세요', b: '예) 수업 시간에 스마트폰을 사용해도 될까?', c: V }] },
  { cat: '수업·학습', icon: '💡', name: '브레인스토밍', desc: '아이디어를 자유롭게 모으고 좋아요로 골라요.', layout: 'wall', bg: '#fff2bf', reaction: 'like', sections: [],
    posts: [{ t: '아이디어를 자유롭게 적어 주세요', b: '떠오르는 대로 한 카드에 하나씩!', c: Y }] },
  { cat: '수업·학습', icon: '🎫', name: '출구 티켓 (수업 마무리)', desc: '수업이 끝나기 전 이해도와 질문을 받아요.', layout: 'columns', bg: '#e3f7d4', reaction: 'none',
    sections: ['잘 이해했어요', '조금 헷갈려요', '질문이 있어요'],
    posts: [{ s: 2, t: '궁금한 점을 적어 주세요', c: B }] },
  { cat: '수업·학습', icon: '📝', name: '사전·사후 평가', desc: '수업 전과 후의 생각을 비교해요.', layout: 'columns', bg: '#bfeeff', reaction: 'none',
    sections: ['수업 전', '수업 후'], posts: [{ s: 0, t: '수업 전 내가 아는 것을 적어 주세요', c: Y }, { s: 1, t: '수업 후 달라진 점을 적어 주세요', c: G }] },
  { cat: '수업·학습', icon: '📚', name: '용어 사전', desc: '배운 용어와 뜻을 표로 모아요.', layout: 'table', bg: '#ffffff', reaction: 'like', sections: [],
    posts: [{ t: '용어', b: '뜻을 한두 문장으로 설명해 주세요. 예) 저항: 전류의 흐름을 방해하는 정도', c: '#ffffff' }] },
  { cat: '수업·학습', icon: '🗂️', name: '스터디 가이드', desc: '단원별 핵심 정리와 참고 자료를 모아요.', layout: 'grid', bg: '#bfeeff', reaction: 'like', sections: [],
    posts: [{ t: '1단원 핵심 정리', b: '핵심 개념을 3줄로 요약해 보세요.', c: B }, { t: '참고 자료', b: '도움이 된 링크나 영상을 올려 주세요.', c: G }] },
  { cat: '수업·학습', icon: '📖', name: '독서 감상문', desc: '읽은 책의 한 줄 평과 감상을 나눠요.', layout: 'wall', bg: '#ffe3ec', reaction: 'star', sections: [],
    posts: [{ t: '책 제목과 한 줄 평', b: '책 제목 · 지은이 · 가장 인상 깊은 구절', c: P }] },
  { cat: '수업·학습', icon: '✍️', name: '글쓰기 릴레이', desc: '이어 쓰기와 글쓰기 프롬프트에 답해요.', layout: 'stream', bg: '#ffffff', reaction: 'like', sections: [],
    posts: [{ t: '오늘의 글쓰기 주제', b: '첫 문장: "그날 아침, 교실 문을 열자…"\n이어서 한 문장씩 써 주세요.', c: V }] },
  { cat: '수업·학습', icon: '🔎', name: '보물찾기 미션', desc: '미션 카드를 풀고 답을 올려요.', layout: 'grid', bg: '#e3f7d4', reaction: 'like', sections: [],
    posts: [{ t: '미션 1', b: '학교에서 3상 전원이 쓰이는 곳을 찾아 사진을 올려 보세요.', c: Y }, { t: '미션 2', b: '전기 안전 표지판을 하나 찾아 설명해 보세요.', c: B }] },
  { cat: '수업·학습', icon: '🔗', name: '자료 모음', desc: '수업 링크·영상·이미지를 한곳에 모아요.', layout: 'wall', bg: '#ffffff', reaction: 'like', sections: [],
    posts: [{ t: '자료를 올려 주세요', b: '링크, 유튜브 주소, 이미지 모두 좋아요.', c: B }] },

  /* ---------- 실습·프로젝트 ---------- */
  { cat: '실습·프로젝트', icon: '🧰', name: '실습 보고서 제출함', desc: '학생 제출물을 선생님이 확인한 뒤 공개해요.', layout: 'table', bg: '#ffffff', reaction: 'none', mod: true, sections: [],
    posts: [{ t: '제출 방법 안내', b: '제목에 학번과 이름을 쓰고, 사진과 설명을 올려 주세요. 선생님이 승인하면 목록에 보입니다.', c: Y }] },
  { cat: '실습·프로젝트', icon: '🦺', name: '실습 안전 점검', desc: '실습 전·중·후 안전 점검 상태를 공유해요.', layout: 'columns', bg: '#fff2bf', reaction: 'none',
    sections: ['점검 전', '점검 완료', '조치 필요'],
    posts: [{ s: 0, t: '전원 차단 확인', b: '배선 작업 전 전원을 내렸는지 확인', c: Y }, { s: 0, t: '공구·보호구 확인', b: '절연 장갑, 절연 드라이버 상태 확인', c: Y }, { s: 1, t: '예시) 1조 점검 완료', c: G }] },
  { cat: '실습·프로젝트', icon: '🛠️', name: '고장 원인 찾기', desc: '증상 · 원인 · 해결 과정을 정리해요.', layout: 'columns', bg: '#ffd6e0', reaction: 'like',
    sections: ['증상', '원인 추정', '해결 방법'],
    posts: [{ s: 0, t: '예시) 전동기가 돌지 않는다', c: P }, { s: 1, t: '예시) 열동 계전기(EOCR) 트립', c: Y }, { s: 2, t: '예시) 복귀 후 부하 전류 확인', c: G }] },
  { cat: '실습·프로젝트', icon: '🧩', name: '프로젝트(PBL) 진행판', desc: '모둠 프로젝트의 단계별 진행 상황을 한눈에 봐요.', layout: 'columns', bg: '#bfeeff', reaction: 'none',
    sections: ['문제 이해', '설계·계획', '제작·실습', '발표·성찰'],
    posts: [{ s: 0, t: '우리 모둠이 해결할 문제', c: Y }, { s: 1, t: '역할 분담표', c: B }, { s: 2, t: '진행 사진·기록', c: G }, { s: 3, t: '발표 자료 링크', c: V }] },
  { cat: '실습·프로젝트', icon: '📋', name: '칸반 보드', desc: '할 일 · 진행 중 · 완료로 업무를 관리해요.', layout: 'columns', bg: '#ffffff', reaction: 'none',
    sections: ['할 일', '진행 중', '검토', '완료'],
    posts: [{ s: 0, t: '예시) 회로도 그리기', c: Y }, { s: 1, t: '예시) 부품 배선', c: B }, { s: 3, t: '예시) 부품 목록 작성', c: G }] },
  { cat: '실습·프로젝트', icon: '🎞️', name: '실습 포트폴리오', desc: '학생별 결과물과 소감을 쌓아 가요.', layout: 'grid', bg: '#e6ddff', reaction: 'star', sections: [],
    posts: [{ t: '내 실습 결과물', b: '사진과 함께 배운 점, 아쉬운 점을 적어 주세요.', c: V }] },

  /* ---------- 계획·관리 ---------- */
  { cat: '계획·관리', icon: '📅', name: '주간 계획표', desc: '요일별 할 일을 정리해요.', layout: 'columns', bg: '#bfeeff', reaction: 'none',
    sections: ['월', '화', '수', '목', '금'], posts: [{ s: 0, t: '예시) 수학 숙제', c: Y }, { s: 2, t: '예시) 실습 준비물', c: B }] },
  { cat: '계획·관리', icon: '🕘', name: '하루 시간표', desc: '오전·오후 일정을 가로로 정리해요.', layout: 'row', bg: '#fff2bf', reaction: 'none',
    sections: ['오전', '점심', '오후'], posts: [{ s: 0, t: '1~2교시', b: '수업 내용', c: Y }, { s: 2, t: '5~6교시', b: '실습', c: B }] },
  { cat: '계획·관리', icon: '🎯', name: '목표 세우기', desc: '단기·중기·장기 목표를 적어요.', layout: 'columns', bg: '#e3f7d4', reaction: 'like',
    sections: ['이번 주', '이번 학기', '졸업까지'], posts: [{ s: 0, t: '예시) 배선 실습 3회 연습', c: Y }, { s: 1, t: '예시) 전기기능사 필기 합격', c: B }, { s: 2, t: '예시) 취업 목표 기업 정하기', c: V }] },
  { cat: '계획·관리', icon: '🧹', name: '역할·당번 정하기', desc: '모둠별 역할과 청소 당번을 나눠요.', layout: 'columns', bg: '#ffe3ec', reaction: 'none',
    sections: ['1모둠', '2모둠', '3모둠', '4모둠'], posts: [{ s: 0, t: '예시) 기록: 김○○', c: Y }] },
  { cat: '계획·관리', icon: '📣', name: '학급 공지판', desc: '알림과 준비물을 모두에게 알려요.', layout: 'wall', bg: '#fff2bf', reaction: 'none', sections: [],
    posts: [{ t: '이번 주 알림', b: '준비물, 제출 기한, 행사 일정을 적어 주세요.', c: Y }] },
  { cat: '계획·관리', icon: '🗒️', name: '회의 안건 · 회의록', desc: '안건 · 논의 · 결정사항을 기록해요.', layout: 'columns', bg: '#ffffff', reaction: 'none',
    sections: ['안건', '논의 내용', '결정 사항', '다음 할 일'], posts: [{ s: 0, t: '회의 안건 1', c: Y }] },
  { cat: '계획·관리', icon: '🧭', name: 'SWOT 분석', desc: '강점 · 약점 · 기회 · 위협을 분석해요.', layout: 'columns', bg: '#e6ddff', reaction: 'none',
    sections: ['강점 (S)', '약점 (W)', '기회 (O)', '위협 (T)'], posts: [{ s: 0, t: '예시) 팀워크가 좋다', c: G }, { s: 1, t: '예시) 경험이 부족하다', c: P }] },
  { cat: '계획·관리', icon: '🏃', name: '학습·운동 기록', desc: '날짜별로 한 일을 표로 기록해요.', layout: 'table', bg: '#ffffff', reaction: 'none', sections: [],
    posts: [{ t: '오늘의 기록', b: '한 일, 시간, 느낀 점을 적어 주세요.', c: '#ffffff' }] },

  /* ---------- 소개·공유 ---------- */
  { cat: '소개·공유', icon: '🙋', name: '자기소개', desc: '이름, 관심사, 꿈을 소개해요.', layout: 'wall', bg: '#ffe3ec', reaction: 'like', sections: [],
    posts: [{ t: '나를 소개해요', b: '이름 · 좋아하는 것 · 잘하는 것 · 장래 희망', c: P }] },
  { cat: '소개·공유', icon: '💌', name: '칭찬 보드', desc: '친구에게 따뜻한 말을 남겨요. (선생님 승인 후 공개)', layout: 'wall', bg: '#ffe3ec', reaction: 'like', mod: true, sections: [],
    posts: [{ t: '칭찬을 남겨 주세요', b: '친구 이름과 칭찬하고 싶은 점을 적어 주세요.', c: P }] },
  { cat: '소개·공유', icon: '🎉', name: '축하 · 롤링페이퍼', desc: '생일·졸업 등 축하 메시지를 모아요.', layout: 'wall', bg: '#fff2bf', reaction: 'like', sections: [],
    posts: [{ t: '축하 메시지를 남겨 주세요', c: Y }] },
  { cat: '소개·공유', icon: '🎨', name: '무드보드', desc: '이미지와 아이디어를 자유롭게 배치해요.', layout: 'canvas', bg: '#e6ddff', reaction: 'like', sections: [],
    posts: [{ t: '이미지와 키워드를 올려 보세요', c: V }] },
  { cat: '소개·공유', icon: '🎵', name: '추천 모음', desc: '책 · 영상 · 음악을 추천해요.', layout: 'grid', bg: '#bfeeff', reaction: 'star', sections: [],
    posts: [{ t: '추천해요!', b: '제목과 추천 이유를 적고 링크를 붙여 주세요. 유튜브 주소는 영상으로 보여요.', c: B }] },
  { cat: '소개·공유', icon: '👥', name: '팀 소개', desc: '팀원과 역할을 소개해요.', layout: 'grid', bg: '#e3f7d4', reaction: 'none', sections: [],
    posts: [{ t: '팀원 소개', b: '이름 · 역할 · 한마디', c: G }] },

  /* ---------- 연표·지도 ---------- */
  { cat: '연표·지도', icon: '⏳', name: '역사·사건 연표', desc: '시간 순서대로 사건을 정리해요.', layout: 'timeline', bg: '#fff2bf', reaction: 'none', sections: [],
    posts: [{ t: '첫 번째 사건', b: '날짜를 정하고 내용을 적어 주세요.', c: Y, d: -60 }, { t: '두 번째 사건', c: B, d: -30 }, { t: '세 번째 사건', c: G, d: 0 }] },
  { cat: '연표·지도', icon: '🗓️', name: '프로젝트 일정', desc: '단계별 마감일을 시간순으로 봐요.', layout: 'timeline', bg: '#bfeeff', reaction: 'none', sections: [],
    posts: [{ t: '기획 완료', c: Y, d: 0 }, { t: '중간 점검', c: B, d: 14 }, { t: '최종 발표', c: G, d: 28 }] },
  { cat: '연표·지도', icon: '🔬', name: '과정 순서도', desc: '실험·작업 과정을 단계별로 보여 줘요.', layout: 'timeline', bg: '#e3f7d4', reaction: 'none', sections: [],
    posts: [{ t: '1단계', b: '준비', c: Y, d: 0 }, { t: '2단계', b: '실행', c: B, d: 1 }, { t: '3단계', b: '결과 정리', c: G, d: 2 }] },
  { cat: '연표·지도', icon: '🗺️', name: '현장체험 장소 지도', desc: '방문할 장소를 지도에 표시해요.', layout: 'map', bg: '#bfeeff', reaction: 'like', sections: [],
    posts: [{ t: '수원 화성', b: '예시 장소입니다. 지도를 눌러 새 장소를 추가하세요.', c: Y, ll: [37.2866, 127.0119], p: '수원 화성' }, { t: '경복궁', c: B, ll: [37.5796, 126.977], p: '경복궁' }] },
  { cat: '연표·지도', icon: '🧳', name: '여행·견학 계획', desc: '일정별로 가고 싶은 곳을 모아요.', layout: 'map', bg: '#ffe3ec', reaction: 'star', sections: [],
    posts: [{ t: '독도', b: '예시 장소입니다.', c: P, ll: [37.2411, 131.8647], p: '독도' }] },
];

export function buildPosts(tpl, now = Date.now()) {
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`; };
  return tpl.posts.map((p, i) => ({
    title: p.t, body: p.b || '', link: '', img: '', color: p.c || '#ffffff', sectionId: tpl.sections.length ? 's' + ((p.s ?? 0) + 1) : '',
    date: p.d != null ? fmt(now + p.d * 864e5) : '', place: p.p || '', lat: p.ll?.[0] ?? null, lng: p.ll?.[1] ?? null, ord: now + i, x: 20 + (i % 6) * 40, y: 20 + (i % 6) * 40,
  }));
}
