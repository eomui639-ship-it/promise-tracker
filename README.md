# 선출직 공약 확인 앱

## 무엇을 하는 앱인가요?

국회의원부터 시작해 선출직 공직자의 공약 이행 상태와 근거 링크를 보여주는 MVP 앱입니다.

첫 버전은 서버나 데이터베이스 없이 CSV 파일을 읽어 화면에 보여줍니다.

## 실행 방법

프로젝트 폴더에서 아래 명령어를 실행합니다.

```powershell
node scripts/dev-server.js
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:3000
```

## 데이터 수정 방법

데이터는 `data/promises.csv` 파일에서 수정합니다.

CSV 첫 줄은 반드시 아래처럼 유지해야 합니다.

```csv
선거구분,직책,국회의원,정당,선거구,공약구분,선거명,공약내용,이행상태,근거링크,확인일,비고
```

새 공약을 추가하려면 아래처럼 한 줄을 추가합니다.

```csv
국회의원선거,국회의원,조은희,국민의힘,서울 서초구갑,지난공약,제22대 국회의원선거,예금자보호한도 현행 5천만원 ⇒ 1억원으로 상향,완료,https://www.fsc.go.kr/no010101/84974,2026-05-19,금융위원회 시행 발표 확인
```

## 공약구분 규칙

공약구분은 아래 2개 중 하나만 사용합니다.

- 지난공약: 이전 선거에서 당선될 때 내세웠던 공약입니다.
- 이번공약: 이번 선거 또는 다음 선거에서 내세우는 공약입니다.

## 실행률 계산 기준

실행률은 `지난공약`만 대상으로 계산합니다.

```text
실행률 = 완료 공약 수 / 지난 공약 전체 수 * 100
```

`진행 중`은 실행률에 포함하지 않습니다. 첫 버전에서는 기준을 단순하게 유지하기 위해 `완료`만 실행한 공약으로 봅니다.

## 상태값 규칙

이행상태는 아래 값을 기준으로 운영합니다.

- 완료
- 진행중
- 지연
- 보류
- 폐기
- 검증필요

`지연/계획변경`처럼 더 자세한 표현도 사용할 수 있습니다. 다만 정치 관련 앱에서는 `미이행`처럼 단정적인 표현보다 근거링크와 확인일을 붙인 상태값을 사용하는 편이 안전합니다.

## 데이터 수집 원칙

- 공약 원문은 중앙선관위 정책·공약마당, 후보자 PDF, 선거공보 등을 근거로 수집합니다.
- PDF나 선거공보는 OCR 또는 텍스트 추출 후 사람이 정제합니다.
- 이행 여부는 선관위 공약 데이터에 같이 들어 있지 않으므로 별도 검증이 필요합니다.
- 법안은 국회 의안·발의법률안 자료, 예산은 정부·지자체 예산자료, 사업 추진은 부처·지자체 보도자료를 근거로 확인합니다.
- 이 CSV는 전체 국회의원 전수 완성본이 아니라 앱 DB 설계용 시드 데이터와 검증 방식 예시입니다.

## 중앙선관위 공약 API 수집

중앙선관위 API 인증키는 코드나 GitHub에 저장하지 않습니다.

PowerShell에서 실행할 때만 아래처럼 환경변수로 넣습니다.

```powershell
$env:NEC_SERVICE_KEY="여기에_공공데이터포털_인증키"
```

선거 전 후보자 공약은 `공약등록` 상태로 저장합니다.

```powershell
node scripts/fetch-nec-promises.js --sgId 실제선거ID --sgTypecode 4 --status 공약등록 --output data/nec-promises.csv
```

후보자ID를 알고 있을 때는 후보자 목록 API를 건너뛰고 공약 API만 직접 테스트할 수 있습니다.

```powershell
node scripts/fetch-nec-promises.js --sgId 실제선거ID --sgTypecode 4 --cnddtId 실제후보자ID --status 공약등록 --output data/nec-promises.csv
```

후보자명과 지역명을 같이 저장하고 싶으면 아래처럼 추가합니다.

```powershell
node scripts/fetch-nec-promises.js --sgId 실제선거ID --sgTypecode 4 --cnddtId 실제후보자ID --candidateName 홍길동 --partyName 예시당 --sidoName 서울특별시 --wiwName 강남구 --districtName 강남구청장선거 --status 공약등록 --output data/nec-promises.csv
```

당선 후 추적할 공약은 `추적대상` 상태로 저장합니다.

```powershell
node scripts/fetch-nec-promises.js --sgId 실제선거ID --sgTypecode 4 --cnddtId 실제후보자ID --status 추적대상 --output data/nec-promises.csv
```

출력 CSV 형식은 아래와 같습니다.

```csv
선거구분,선거종류코드,후보자ID,후보자명,정당명,시도명,구시군명,선거구명,공약순번,공약분야,공약명,공약내용,상태,자료출처,확인일,검증메모
```

수집 스크립트는 선관위 공약 API의 `prmsOrd1~10`, `prmsRealmName1~10`, `prmsTitle1~10`, `prmsCont1~10`을 한 공약당 한 줄로 변환합니다.

후보자ID를 모를 때는 후보자 통합검색 API를 통해 후보자ID를 먼저 수집합니다. 후보자 통합검색 API는 후보자명 `name`이 필수입니다. `--sidoName`, `--wiwName`은 API 요청에는 직접 보내지 않고, 검색 결과를 앱 안에서 좁히는 데 사용합니다.

```powershell
node scripts/fetch-nec-promises.js --sgId 실제선거ID --sgTypecode 4 --candidateName 홍길동 --sidoName 서울특별시 --wiwName 강남구 --status 공약등록 --output data/nec-promises.csv
```

응답이 없을 때는 `--debug`를 붙여 실제 요청 주소를 확인합니다. 인증키는 출력에서 자동으로 가려집니다.

```powershell
node scripts/fetch-nec-promises.js --sgId 실제선거ID --sgTypecode 4 --sidoName 서울특별시 --wiwName 강서구 --candidateName 진교훈 --status 공약등록 --output data/nec-promises.csv --debug
```

스크립트 내부 동작은 아래 순서입니다.

1. 후보자 통합검색 API `CndaSrchService/getCndaSrchInqire`에서 후보자ID `huboid`를 찾습니다.
2. 선거공약 API `ElecPrmsInfoInqireService/getCnddtElecPrmsInfoInqire`에 `cnddtId=huboid`로 조회합니다.
3. 공약 1~10번을 세로형 CSV로 저장합니다.

주의:

- `cnddtId`는 공공데이터포털 샘플값이 아니라 실제 후보자ID를 넣어야 합니다.
- 공공데이터포털 예시의 `1000000000` 또는 `100000000`은 실제 데이터가 없는 샘플일 수 있습니다.
- 선거공약 API는 대통령선거 `1`, 시·도지사선거 `3`, 구·시·군의장선거 `4`, 교육감선거 `11`의 공약서를 대상으로 합니다.
- 국회의원선거 `2`는 선거공약 API가 아니라 선거공보/당선인공약 자료를 별도로 수집해야 합니다.
- `sgId`, `sgTypecode`, 후보자 API의 실제 응답 필드는 선거 종류와 API 환경에 따라 달라질 수 있습니다. 처음에는 특정 선거구나 소수 후보로 테스트한 뒤 전체 수집으로 넓히는 것이 좋습니다.

## 보안 원칙

이 앱에는 비밀번호, API Key, 고객 개인정보를 저장하지 않습니다.

## 실시간 조회 API 배포

GitHub Pages에서는 API 키를 숨길 수 없으므로 실시간 조회 기능은 Vercel 같은 서버에서 실행해야 합니다.

Vercel에 배포한 뒤 환경변수에 아래 값을 추가합니다.

```text
NEC_SERVICE_KEY=공공데이터포털_인증키
```

그 다음 사이트의 `중앙선관위 공약 가져오기` 영역에서 후보자명, 선거ID, 선거종류를 넣으면 `/api/nec-promises`가 중앙선관위 API를 대신 호출합니다.

예시 입력값:

```text
후보자명: 진교훈
선거ID: 20231011
선거종류: 구청장
후보자ID: 100150999
```

후보자ID를 모르면 후보자명으로 먼저 찾고, 후보자ID를 알면 더 정확하게 바로 조회합니다.

## 확장 계획

첫 구현은 국회의원 데이터로 시작합니다.

2026년 6월 3일 제9회 전국동시지방선거 이후에는 지방선거 당선자 데이터를 같은 CSV 구조로 추가할 수 있습니다.
