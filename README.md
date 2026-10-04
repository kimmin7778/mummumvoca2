# ClassVoca (mummumvoca) - 클래스카드 & 우리반 단어 연습실 통합 영단어 학습 웹 앱

> 클래스카드(Classcard) 스타일의 UI/UX와 **우리반 단어 연습실(Word Lab)**의 7모둠 실시간 단어 레이스, 매칭 게임, compressed URL QR 공유 메커니즘을 결합한 현대적인 반응형 영어 단어 학습 웹 애플리케이션입니다.

---

## ✨ 핵심 기능 (Features)

### 1. 🚀 7모둠 실시간 달나라 단어 레이스 (Moon Word Race)
- **교실 TV 화면 (Host Mode)**:
  - MQTT 기반 실시간 7모둠 우주비행사 트랙 애니메이션.
  - 4자리 PIN 방 번호 생성 및 학생 태블릿/스마트폰 접속용 QR 코드 자동 생성.
  - 목표 점수(15점, 20점, 30점, 40점, 50점), 제한 시간(무제한, 3분, 5분, 7분), 문제 유형(뜻 고르기 / 단어 고르기 / 섞어서) 자유 설정.
  - 레이스 종료 시 1, 2, 3위 시상대(Podium) 축하 애니메이션 & 경품 폭죽(Confetti) 연출.
- **학생 태블릿/모바일 화면 (Tablet Mode)**:
  - PIN 번호 입력 및 모둠(1~7모둠) 즉시 참가.
  - 4지선다 실시간 퀴즈 및 콤보 스트릭 카운터 (`3연속 정답! 🔥`).
  - 틀렸을 때 **3초 화면 잠금 페널티 타이머** & 정답 힌트 제공 (`lockUntil` 메커니즘).

### 2. 🧩 타일 매칭 게임 (Match Game Mode)
- 영단어 카드와 한글 뜻 카드의 짝을 빠르게 맞추는 그리드 매칭 게임.
- 정답 매칭 시 카드 소멸 효과 / 오답 시 **흔들림(Shake) 애니메이션 & +1초 시간 페널티**.
- 0.1초 단위 스톱워치 측정 및 단어장별 **최고 기록(Best Score) 자동 저장**.
- 최고 기록 경신 시 celebratory modal 및 축하 폭죽 애니메이션.

### 3. 📱 학생 연습용 QR 코드 & Compressed URL 공유 (LZ-String Share)
- 서버나 DB 없이도 단어장 전체 데이터를 **LZ-String 압축 Hash (`#p=...`)**로 변환하여 URL 생성.
- 단어장별 **QR 코드 이미지 생성 및 다운로드(PNG)**, 링크 복사, 새 창 열기 지원.
- 링크를 받은 학생은 구글 클래스룸이나 카카오톡에서 QR/링크로 바로 학습 진입 가능.

### 4. 📚 단어장 관리 & JSON 백업/복원 (CRUD & Import/Export)
- **개별 단어 편집**: 영단어, 품사, 한글 뜻, 영어 예문, 예문 해석, 발음 기호, 생성 일시 기록 및 수정.
- **TXT 파일 일괄 가져오기**: Drag & Drop 및 파일 업로드. 구분자(콜론 `:`, 탭 `\t`, 쉼표 `,`, 이콜 `=`, 하이픈 `-`, 파이프 `|`) 자동 감지 및 실시간 미리보기.
- **전체 JSON 백업 & 복원**: 모든 단어장을 `.json` 파일로 내보내기 및 1-Click 병합 불러오기.
- **사전 API 자동완성 (Auto-Fill)**: Free Dictionary API 연동으로 발음 기호, 예문, 한글 뜻 자동 완성.

### 5. 🎴 클래스카드 암기 · 리콜 · 스펠 · 시험 모드
- **암기 모드 (Flashcard Mode)**: Framer Motion 3D 카드 뒤집기, Web Speech API TTS 발음, Auto-Play 3초 자동 재생.
- **리콜 모드 (Recall Mode)**: Web Audio API 리얼 찰칵 Sound 효과음 & 4지선다 퀴즈.
- **스펠 모드 (Spelling Mode)**: TTS 발음과 뜻을 보고 입력하는 타이핑 연습 및 글자 수 힌트.
- **단어 시험 & 오답노트 (Test Mode)**: 10/20/50/전체 문항 시험, 80점 이상 Pass Confetti, **"틀린 단어만 모아서 재시험"** 1-Click 지원.

---

## 🚀 시작하기 (Getting Started)

### 설치 및 실행
```bash
# 클론하기
git clone https://github.com/kimmin7778/mummumvoca.git
cd mummumvoca

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

---

## 🛠️ 기술 스택 (Tech Stack)
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide Icons, Framer Motion
- **Networking & Compression**: MQTT WebSocket (`mqtt`), LZ-String (`lz-string`), QR Code Generator (`qrcode`)
- **Sound & TTS**: Web Speech API (`window.speechSynthesis`), Web Audio API Synthesizer
- **Storage**: LocalStorage (Offline-First persistence & High scores)
- **Effects**: Canvas-Confetti
