# Remix Starter
빌드 환경은 Vite, 배포 환경은 Cloudflare가 적용된 Remix 시작 탬플릿입니다. 라이트&다크 테마가 적용되어 있습니다.

## 설치
로컬에 기본적으로 18버전 이상의 node.js가 설치되어 있어야합니다.
패키지 매니저는 yarn 4.1.1 버전을 사용합니다.

패키지 설치하기
```bash
yarn
```

환경 변수를 설정합니다. 아래 커맨드로 .env.example을 복사하여 .env 파일을 복사하여 만들어 줍니다.
```bash
cp .env.example .env
```

.env를 개발 환경에 맞게 수정해줍니다.

## 실행 및 배포
### 개발 환경 실행
```bash
yarn dev
```

### 배포 전 빌드
```bash
yarn build
```

### 배포 앱 실행
참고: 배포(production) 환경에서 .env 파일의 환경 변수는 더 이상 불러오지 않으므로 환경 변수를 직접 생성해줘야 합니다.

```bash
yarn start
```
