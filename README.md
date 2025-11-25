# 🎨 Rolling Paper - 롤링페이퍼

최선일 팀장님께 전하는 마음을 담은 실시간 롤링페이퍼 웹 애플리케이션

## ✨ 주요 기능

- 📝 **그룹별 메시지 작성**: 각 팀/그룹에서 메시지 작성
- 🔐 **비밀번호 보호**: 메시지 수정/삭제 시 비밀번호 인증
- ❤️ **좋아요 기능**: 공감하는 메시지에 좋아요
- 🔄 **실시간 동기화**: 다른 사람이 작성한 메시지 즉시 반영 (PostgreSQL LISTEN/NOTIFY)
- 📥 **TXT 다운로드**: 모든 메시지를 그룹별 TXT 파일로 다운로드
- ⚡ **고성능**: PostgreSQL + Redis로 빠른 응답속도

## 🚀 빠른 시작

### 권장: 통합 관리 스크립트 사용

```bash
# 모든 서비스 시작 (Docker + 애플리케이션)
./manage.sh start

# 서비스 상태 확인
./manage.sh status

# 로그 확인
./manage.sh logs

# 서비스 재시작
./manage.sh restart

# 모든 서비스 중지
./manage.sh stop

# 도움말 보기
./manage.sh help
```

### 수동 설정 (선택사항)

```bash
# 1. 패키지 설치
npm install

# 2. Docker 컨테이너 시작
docker compose up -d

# 3. 기존 데이터 마이그레이션 (있을 경우)
tsx migrate-to-db.ts

# 4. 개발 서버 시작
npm run dev
```

**접속**: http://localhost:3000

## 🗄️ 아키텍처

### 기술 스택

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express + TypeScript
- **Database**: PostgreSQL 16 (port 9700)
- **Cache**: Redis 7 (port 9701)
- **Real-time**: Server-Sent Events (SSE) + PostgreSQL LISTEN/NOTIFY

### 실시간 동시성 처리

서버 배포 환경에서 여러 사용자가 동시에 접속해도 실시간 동기화가 보장됩니다:

1. **PostgreSQL LISTEN/NOTIFY**
   - 데이터베이스 변경 시 자동으로 트리거 발동
   - 모든 연결된 클라이언트에 즉시 알림
   - 누군가 메시지를 작성하면 다른 모든 사용자 화면에 즉시 표시

2. **Redis 캐싱**
   - 전체 메시지: 60초 TTL
   - 개별 메시지: 5분 TTL
   - 쓰기 작업 시 자동 캐시 무효화
   - 빠른 읽기 성능 보장

3. **SSE (Server-Sent Events)**
   - 클라이언트와 실시간 양방향 연결
   - 데이터베이스 변경 감지 시 모든 클라이언트에 브로드캐스트

### 포트 구성

- **3000**: Frontend (Vite 개발 서버)
- **3001**: Backend API (Express)
- **9700**: PostgreSQL
- **9701**: Redis

## 📋 관리 명령어

### manage.sh 통합 스크립트

```bash
./manage.sh start      # 전체 서비스 시작 (Docker + 앱)
./manage.sh stop       # 전체 서비스 중지
./manage.sh restart    # 전체 서비스 재시작
./manage.sh status     # 서비스 상태 확인
./manage.sh migrate    # JSONL 데이터를 DB로 마이그레이션
./manage.sh logs       # Docker 로그 확인 (실시간)
./manage.sh clean      # 모든 컨테이너 및 볼륨 삭제
./manage.sh help       # 도움말 표시
```

### Docker 명령어

```bash
# 컨테이너 상태 확인
docker compose ps

# 컨테이너 로그
docker compose logs -f

# PostgreSQL 접속
docker exec -it rolling-paper-postgres psql -U rollingpaper -d rollingpaper

# Redis 접속
docker exec -it rolling-paper-redis redis-cli
```

## 📊 데이터베이스 스키마

```sql
CREATE TABLE messages (
    id VARCHAR(255) PRIMARY KEY,
    author VARCHAR(255) NOT NULL,
    "group" VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    likes INTEGER DEFAULT 0,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스로 빠른 조회 성능
CREATE INDEX idx_messages_group ON messages("group");
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
```

## 📂 프로젝트 구조

```
rolling-paper/
├── components/          # React 컴포넌트
├── services/           # API 서비스 레이어
├── docker-compose.yml  # Docker 설정
├── init.sql           # DB 초기화 스크립트
├── server.ts          # Express 백엔드 서버
├── manage.sh          # 통합 관리 스크립트 ⭐
├── migrate-to-db.ts   # JSONL → PostgreSQL 마이그레이션
└── DATABASE_SETUP.md  # 상세 DB 설정 가이드
```

## 📥 TXT 다운로드

- 헤더의 "다운로드" 버튼 클릭
- 비밀번호 입력: `dt2025-pw`
- 그룹별 TXT 파일이 포함된 ZIP 파일 다운로드
- TXT 파일은 DB에서 실시간으로 생성됩니다

## 🛠️ 개발 명령어

- `npm run dev`: 개발 서버 실행 (프론트엔드 + 백엔드)
- `npm run server`: 백엔드 서버만 실행
- `npm run client`: 프론트엔드만 실행
- `npm run build`: 프로덕션 빌드
- `tsx migrate-to-db.ts`: 데이터 마이그레이션

## 📋 지원 그룹

- ESD, FDM, BDM
- DV1, DV2, DV3, DV4
- ET, AT, PV
- AI Agent, GTE, TDE
- 공정, 개발지원과, Staff

## 🎯 배포 가이드

### 프로덕션 빌드

```bash
# 프론트엔드 빌드
npm run build

# 빌드된 파일 미리보기
npm run preview
```

### 서버 배포

1. Docker 설치 확인
2. `./manage.sh start`로 모든 서비스 시작
3. 방화벽에서 필요한 포트 개방
4. Nginx/Apache를 통한 리버스 프록시 설정 (선택사항)

## 🐛 문제 해결

### Docker rate limit 에러

```bash
# Docker Hub 로그인
docker login

# 또는 수동으로 이미지 pull
docker pull postgres:16-alpine
docker pull redis:7-alpine
```

### PostgreSQL 연결 실패

```bash
# 컨테이너 상태 확인
docker compose ps

# 로그 확인
docker compose logs postgres

# 포트 충돌 확인
lsof -i :9700
```

### 캐시 초기화

```bash
# Redis 캐시 전체 삭제
docker exec -it rolling-paper-redis redis-cli FLUSHALL
```

## 🔐 보안

- 비밀번호는 SHA-256으로 해시화되어 저장
- 다운로드 비밀번호 보호
- SQL Injection 방지 (Parameterized Queries)
- CORS 설정으로 출처 제어

## 📝 라이선스

© 2025 Design Technology Team. All rights reserved.

---

**To Team Leader Choi Seon-il: Expressing Respect and Gratitude** 🎉
