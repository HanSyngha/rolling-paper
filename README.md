# 🎉 롤링페이퍼 앱 (Rolling Paper App)

그룹별 작별 인사를 받기 위한 롤링페이퍼 애플리케이션입니다.

## ✨ 주요 기능

- 📝 **메시지 작성**: 각 그룹별로 메시지를 남길 수 있습니다
- 💾 **영구 저장**: 메시지가 파일 시스템에 저장되어 앱을 껐다 켜도 복구됩니다
- 📊 **그룹별 필터링**: 특정 그룹의 메시지만 선택적으로 볼 수 있습니다
- ❤️ **좋아요 기능**: 메시지에 좋아요를 표시할 수 있습니다
- 📁 **이중 저장 방식**:
  - `messages/all.jsonl`: 모든 메시지를 JSONL 형식으로 저장 (복구용)
  - `messages/{그룹명}.txt`: 그룹별로 사람이 읽기 쉬운 텍스트 형식으로 저장

## 🚀 실행 방법

### 사전 요구사항
- Node.js (v16 이상)

### 1. 의존성 설치
```bash
npm install
```

### 2. 앱 실행
```bash
npm run dev
```

이 명령어는 다음 두 서버를 동시에 실행합니다:
- **프론트엔드 (Vite)**: http://localhost:3000
- **백엔드 (Express)**: http://localhost:3001

### 3. 브라우저에서 접속
http://localhost:3000 에 접속하여 앱을 사용할 수 있습니다.

## 📂 프로젝트 구조

```
rolling-paper/
├── messages/              # 메시지 저장 폴더 (자동 생성)
│   ├── all.jsonl         # 모든 메시지 (JSONL 형식)
│   ├── ESD.txt           # ESD 그룹 메시지
│   ├── FDM.txt           # FDM 그룹 메시지
│   └── ...               # 기타 그룹별 파일
├── components/           # React 컴포넌트
├── services/             # API 서비스
├── server.ts             # Express 백엔드 서버
└── App.tsx               # 메인 앱 컴포넌트
```

## 💾 데이터 저장 방식

### JSONL 형식 (messages/all.jsonl)
```jsonl
{"id":"msg_1","author":"홍길동","group":"ESD","content":"감사합니다!","timestamp":1732428000000,"likes":0}
{"id":"msg_2","author":"김철수","group":"FDM","content":"좋은 하루 되세요!","timestamp":1732428100000,"likes":1}
```

### 텍스트 형식 (messages/{그룹명}.txt)
```
[2024. 11. 24. 오전 6:00:00] 홍길동: 감사합니다!
[2024. 11. 24. 오전 6:01:40] 김철수: 좋은 하루 되세요!
```

## 🛠️ 개발 명령어

- `npm run dev`: 개발 서버 실행 (프론트엔드 + 백엔드)
- `npm run server`: 백엔드 서버만 실행
- `npm run client`: 프론트엔드만 실행
- `npm run build`: 프로덕션 빌드

## 📋 지원 그룹

- ESD, FDM, BDM
- DV1, DV2, DV3, DV4
- ET, AT, PV
- AI Agent, GTE, TDE
- 공정

## 🎨 기술 스택

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Express, Node.js
- **Storage**: File System (JSONL + TXT)

## 📝 라이선스

Private project for Team Leader Choi Seon-il farewell messages.

---

© 2025 Design Technology Team. All rights reserved.
