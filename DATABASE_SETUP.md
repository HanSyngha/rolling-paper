# Database Setup Guide

## 개요

기존 JSONL + TXT 파일 저장 방식에서 PostgreSQL + Redis 기반 데이터베이스로 전환했습니다.

## 아키텍처

- **PostgreSQL (9700 포트)**: 메시지 영구 저장
- **Redis (9701 포트)**: 캐싱으로 빠른 읽기 성능
- **SSE**: 실시간 업데이트
- **동적 TXT 생성**: 다운로드 시 DB에서 TXT 파일 생성

## 성능 개선

- ✅ Redis 캐싱으로 읽기 속도 향상
- ✅ PostgreSQL 인덱싱으로 쿼리 최적화
- ✅ 파일 I/O 없이 DB 트랜잭션으로 데이터 일관성 보장
- ✅ 동시성 처리 개선

## 설치 및 실행

### 1. Docker 컨테이너 시작

```bash
# Docker 로그인 (rate limit 해결)
docker login

# PostgreSQL과 Redis 시작
docker compose up -d

# 컨테이너 상태 확인
docker compose ps
```

### 2. 기존 데이터 마이그레이션 (선택사항)

기존 JSONL 파일의 메시지를 PostgreSQL로 이동:

```bash
tsx migrate-to-db.ts
```

### 3. 서버 시작

```bash
npm run dev
```

## Docker 명령어

```bash
# 컨테이너 시작
docker compose up -d

# 컨테이너 중지
docker compose down

# 로그 확인
docker compose logs -f

# PostgreSQL 접속
docker exec -it rolling-paper-postgres psql -U rollingpaper -d rollingpaper

# Redis 접속
docker exec -it rolling-paper-redis redis-cli
```

## 데이터베이스 스키마

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

-- 인덱스
CREATE INDEX idx_messages_group ON messages("group");
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

## Redis 캐싱 전략

- `messages:all`: 전체 메시지 리스트 (60초 TTL)
- `message:{id}`: 개별 메시지 (5분 TTL)
- 쓰기 작업 시 자동 캐시 무효화

## 포트

- **3000**: Frontend (Vite)
- **3001**: Backend (Express)
- **9700**: PostgreSQL
- **9701**: Redis

## 문제 해결

### Docker rate limit 에러
```bash
# Docker 로그인
docker login

# 또는 이미지를 수동으로 pull
docker pull postgres:16-alpine
docker pull redis:7-alpine
```

### PostgreSQL 연결 실패
```bash
# 컨테이너 상태 확인
docker compose ps

# PostgreSQL 로그 확인
docker compose logs postgres

# 포트 사용 여부 확인
lsof -i :9700
```

### Redis 연결 실패
```bash
# Redis 로그 확인
docker compose logs redis

# 포트 사용 여부 확인
lsof -i :9701
```

## 데이터 백업

```bash
# PostgreSQL 백업
docker exec rolling-paper-postgres pg_dump -U rollingpaper rollingpaper > backup.sql

# PostgreSQL 복원
docker exec -i rolling-paper-postgres psql -U rollingpaper rollingpaper < backup.sql
```
