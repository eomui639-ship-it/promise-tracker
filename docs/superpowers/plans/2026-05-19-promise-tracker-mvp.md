# Promise Tracker MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static MVP web app where users can search elected officials by name or region and view promise status with evidence links from a CSV file.

**Architecture:** The app is a static HTML/CSS/JavaScript site. `data/promises.csv` is the only data source. `src/app.js` loads the CSV, parses it, groups rows by elected official, filters results, and renders the list/detail UI.

**Tech Stack:** Plain HTML, CSS, JavaScript, CSV file, browser `fetch`, no build step, no backend, no database.

---

## File Structure

- `index.html`: App shell. Contains the search input, election type filter, result list, and detail area.
- `styles.css`: Visual design for the app, including layout, cards, status badges, and mobile behavior.
- `src/app.js`: CSV loading, parsing, grouping, searching, and rendering.
- `data/promises.csv`: Sample promise data. The operator edits this file in Excel or a text editor.
- `scripts/dev-server.js`: Small local server for running the static app without Python or external installs.
- `README.md`: Beginner-friendly instructions for editing CSV data and opening the app.

## Task 1: Create Static App Shell

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create the first HTML file**

Create `index.html` with this complete content:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>공약 확인</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <header class="topbar">
      <div>
        <p class="eyebrow">선출직 공약 확인</p>
        <h1>내 지역 공약, 근거까지 확인하세요</h1>
      </div>
    </header>

    <main class="app">
      <section class="search-panel" aria-labelledby="search-title">
        <div>
          <h2 id="search-title">공직자 찾기</h2>
          <p>이름이나 지역을 입력하면 공약과 이행 상태를 볼 수 있습니다.</p>
        </div>

        <div class="controls">
          <label class="field">
            <span>검색어</span>
            <input id="searchInput" type="search" placeholder="예: 홍길동, 서울 강남구갑" />
          </label>

          <label class="field">
            <span>선거 종류</span>
            <select id="electionFilter">
              <option value="all">전체</option>
            </select>
          </label>
        </div>
      </section>

      <section class="content-grid">
        <section class="results-panel" aria-labelledby="results-title">
          <div class="panel-heading">
            <h2 id="results-title">검색 결과</h2>
            <span id="resultCount" class="count">0명</span>
          </div>
          <div id="resultsList" class="results-list"></div>
        </section>

        <section class="detail-panel" aria-labelledby="detail-title">
          <div id="detailView" class="empty-detail">
            <h2 id="detail-title">공직자를 선택하세요</h2>
            <p>왼쪽 검색 결과에서 인물을 선택하면 공약 목록이 표시됩니다.</p>
          </div>
        </section>
      </section>
    </main>

    <script src="./src/app.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Open the file in a browser**

Run:

```powershell
Start-Process .\index.html
```

Expected: A blank-styled page opens. It may look plain because CSS and JavaScript do not exist yet.

- [ ] **Step 3: Commit**

If this folder has been initialized as a git repository, run:

```powershell
git add index.html
git commit -m "feat: add app shell"
```

Expected: Commit succeeds. If the folder is not a git repository, skip this step.

## Task 2: Add Sample CSV Data

**Files:**
- Create: `data/promises.csv`

- [ ] **Step 1: Create the data folder and CSV file**

Create `data/promises.csv` with this complete content:

```csv
선거종류,직책,이름,정당,지역,공약명,상태,근거링크,마지막확인일,메모
국회의원선거,국회의원,홍길동,예시당,서울 강남구갑,청년 주거 지원 확대,진행 중,https://example.com/promise-1,2026-05-19,예산안 발의 확인
국회의원선거,국회의원,홍길동,예시당,서울 강남구갑,전통시장 주차 환경 개선,확인 필요,https://example.com/promise-2,2026-05-19,공식 추진 자료 추가 확인 필요
국회의원선거,국회의원,김예시,샘플당,부산 해운대구을,노후 학교 시설 개선,완료,https://example.com/promise-3,2026-05-19,교육청 발표 자료 확인
국회의원선거,국회의원,김예시,샘플당,부산 해운대구을,지역 의료 접근성 확대,미이행,https://example.com/promise-4,2026-05-19,관련 예산 또는 법안 근거 없음
지방선거,시장,박샘플,예시당,서울특별시,대중교통 요금 부담 완화,확인 필요,https://example.com/local-1,2026-06-10,지방선거 당선자 확장 예시
```

- [ ] **Step 2: Verify CSV headers**

Open `data/promises.csv` and confirm the first row is exactly:

```csv
선거종류,직책,이름,정당,지역,공약명,상태,근거링크,마지막확인일,메모
```

Expected: Header matches exactly. The JavaScript parser will use these names.

- [ ] **Step 3: Commit**

If this folder has been initialized as a git repository, run:

```powershell
git add data/promises.csv
git commit -m "feat: add sample promise data"
```

Expected: Commit succeeds. If the folder is not a git repository, skip this step.

## Task 3: Implement CSV Loading And Rendering

**Files:**
- Create: `src/app.js`

- [ ] **Step 1: Create the JavaScript file**

Create `src/app.js` with this complete content:

```javascript
const DATA_URL = "./data/promises.csv";

const state = {
  people: [],
  filteredPeople: [],
  selectedPersonKey: "",
};

const elements = {
  searchInput: document.querySelector("#searchInput"),
  electionFilter: document.querySelector("#electionFilter"),
  resultsList: document.querySelector("#resultsList"),
  resultCount: document.querySelector("#resultCount"),
  detailView: document.querySelector("#detailView"),
};

init();

async function init() {
  try {
    const rows = await loadCsv(DATA_URL);
    state.people = groupByPerson(rows);
    state.filteredPeople = state.people;
    fillElectionFilter(state.people);
    bindEvents();
    renderResults();
    renderInitialDetail();
  } catch (error) {
    renderError("CSV 파일을 불러오지 못했습니다. 로컬 서버로 실행해 주세요.");
  }
}

async function loadCsv(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`CSV load failed: ${response.status}`);
  }

  const text = await response.text();
  return parseCsv(text);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || "";
      return row;
    }, {});
  });
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function groupByPerson(rows) {
  const peopleMap = new Map();

  rows.forEach((row) => {
    const key = [row.선거종류, row.직책, row.이름, row.지역].join("|");

    if (!peopleMap.has(key)) {
      peopleMap.set(key, {
        key,
        electionType: row.선거종류,
        role: row.직책,
        name: row.이름,
        party: row.정당,
        region: row.지역,
        promises: [],
      });
    }

    peopleMap.get(key).promises.push({
      title: row.공약명,
      status: row.상태,
      evidenceUrl: row.근거링크,
      checkedAt: row.마지막확인일,
      memo: row.메모,
    });
  });

  return Array.from(peopleMap.values());
}

function fillElectionFilter(people) {
  const electionTypes = Array.from(new Set(people.map((person) => person.electionType)));

  electionTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    elements.electionFilter.appendChild(option);
  });
}

function bindEvents() {
  elements.searchInput.addEventListener("input", applyFilters);
  elements.electionFilter.addEventListener("change", applyFilters);
}

function applyFilters() {
  const keyword = elements.searchInput.value.trim().toLowerCase();
  const electionType = elements.electionFilter.value;

  state.filteredPeople = state.people.filter((person) => {
    const matchesElection = electionType === "all" || person.electionType === electionType;
    const targetText = `${person.name} ${person.region} ${person.party} ${person.role}`.toLowerCase();
    const matchesKeyword = keyword === "" || targetText.includes(keyword);
    return matchesElection && matchesKeyword;
  });

  if (!state.filteredPeople.some((person) => person.key === state.selectedPersonKey)) {
    state.selectedPersonKey = "";
    renderInitialDetail();
  }

  renderResults();
}

function renderResults() {
  elements.resultCount.textContent = `${state.filteredPeople.length}명`;
  elements.resultsList.innerHTML = "";

  if (state.filteredPeople.length === 0) {
    elements.resultsList.innerHTML = '<p class="empty-message">검색 결과가 없습니다.</p>';
    return;
  }

  state.filteredPeople.forEach((person) => {
    const button = document.createElement("button");
    button.className = "result-card";
    button.type = "button";
    button.setAttribute("aria-pressed", String(person.key === state.selectedPersonKey));
    button.innerHTML = `
      <span class="meta">${person.electionType} · ${person.role}</span>
      <strong>${person.name}</strong>
      <span>${person.party}</span>
      <span>${person.region}</span>
    `;

    button.addEventListener("click", () => {
      state.selectedPersonKey = person.key;
      renderResults();
      renderDetail(person);
    });

    elements.resultsList.appendChild(button);
  });
}

function renderInitialDetail() {
  elements.detailView.className = "empty-detail";
  elements.detailView.innerHTML = `
    <h2>공직자를 선택하세요</h2>
    <p>검색 결과에서 인물을 선택하면 공약 목록이 표시됩니다.</p>
  `;
}

function renderDetail(person) {
  const statusCounts = countStatuses(person.promises);

  elements.detailView.className = "person-detail";
  elements.detailView.innerHTML = `
    <div class="detail-header">
      <div>
        <span class="meta">${person.electionType} · ${person.role}</span>
        <h2>${person.name}</h2>
        <p>${person.party} · ${person.region}</p>
      </div>
      <div class="summary">
        ${renderStatusSummary(statusCounts)}
      </div>
    </div>

    <div class="promise-list">
      ${person.promises.map(renderPromise).join("")}
    </div>
  `;
}

function renderPromise(promise) {
  return `
    <article class="promise-card">
      <div class="promise-top">
        <h3>${promise.title}</h3>
        <span class="status ${getStatusClass(promise.status)}">${promise.status}</span>
      </div>
      <p class="memo">${promise.memo || "메모 없음"}</p>
      <div class="promise-footer">
        <span>마지막 확인일: ${promise.checkedAt}</span>
        <a href="${promise.evidenceUrl}" target="_blank" rel="noreferrer">근거 보기</a>
      </div>
    </article>
  `;
}

function countStatuses(promises) {
  return promises.reduce((counts, promise) => {
    counts[promise.status] = (counts[promise.status] || 0) + 1;
    return counts;
  }, {});
}

function renderStatusSummary(statusCounts) {
  const statuses = ["완료", "진행 중", "미이행", "확인 필요"];

  return statuses
    .map((status) => `<span><strong>${statusCounts[status] || 0}</strong>${status}</span>`)
    .join("");
}

function getStatusClass(status) {
  const classMap = {
    완료: "done",
    "진행 중": "progress",
    미이행: "missed",
    "확인 필요": "unknown",
  };

  return classMap[status] || "unknown";
}

function renderError(message) {
  elements.resultsList.innerHTML = `<p class="empty-message">${message}</p>`;
  elements.resultCount.textContent = "0명";
}
```

- [ ] **Step 2: Run a local server**

Run:

```powershell
node scripts/dev-server.js
```

Expected: The command prints `Promise tracker is running at http://127.0.0.1:3000`.

- [ ] **Step 3: Open the app**

Open the printed local URL in a browser.

Expected: Search results show `홍길동`, `김예시`, and `박샘플`.

- [ ] **Step 4: Verify search behavior**

In the search box, type:

```text
서울
```

Expected: Results include `홍길동` and `박샘플`.

Then type:

```text
해운대
```

Expected: Results include `김예시`.

- [ ] **Step 5: Verify detail behavior**

Click `홍길동`.

Expected: Detail panel shows two promises:

```text
청년 주거 지원 확대
전통시장 주차 환경 개선
```

- [ ] **Step 6: Commit**

If this folder has been initialized as a git repository, run:

```powershell
git add src/app.js
git commit -m "feat: load and render promise data"
```

Expected: Commit succeeds. If the folder is not a git repository, skip this step.

## Task 4: Add Professional Styling

**Files:**
- Create: `styles.css`

- [ ] **Step 1: Create the stylesheet**

Create `styles.css` with this complete content:

```css
:root {
  color-scheme: light;
  --bg: #f6f7f9;
  --surface: #ffffff;
  --surface-soft: #eef3f8;
  --text: #17202a;
  --muted: #637083;
  --line: #dce3ea;
  --primary: #0f6b5f;
  --primary-dark: #0a4f46;
  --done: #18794e;
  --progress: #9a6700;
  --missed: #b42318;
  --unknown: #596579;
  font-family: "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
}

button,
input,
select {
  font: inherit;
}

.topbar {
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  padding: 32px clamp(20px, 5vw, 64px);
}

.topbar h1 {
  margin: 6px 0 0;
  font-size: clamp(28px, 4vw, 44px);
  line-height: 1.15;
}

.eyebrow,
.meta {
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;
}

.app {
  width: min(1180px, calc(100% - 32px));
  margin: 28px auto 48px;
}

.search-panel,
.results-panel,
.detail-panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.search-panel {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 24px;
  padding: 24px;
  margin-bottom: 20px;
}

.search-panel h2,
.panel-heading h2,
.detail-panel h2 {
  margin: 0;
}

.search-panel p,
.empty-detail p,
.memo {
  color: var(--muted);
}

.controls {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 12px;
}

.field {
  display: grid;
  gap: 8px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
}

.field input,
.field select {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 12px 14px;
  color: var(--text);
  background: #fff;
}

.field input:focus,
.field select:focus {
  outline: 3px solid rgba(15, 107, 95, 0.18);
  border-color: var(--primary);
}

.content-grid {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 20px;
  align-items: start;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid var(--line);
}

.count {
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
}

.results-list {
  display: grid;
  gap: 10px;
  padding: 14px;
}

.result-card {
  display: grid;
  gap: 5px;
  width: 100%;
  text-align: left;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  padding: 14px;
  cursor: pointer;
}

.result-card:hover,
.result-card[aria-pressed="true"] {
  border-color: var(--primary);
  background: var(--surface-soft);
}

.result-card strong {
  font-size: 20px;
}

.detail-panel {
  min-height: 420px;
  padding: 24px;
}

.empty-detail {
  display: grid;
  place-content: center;
  min-height: 360px;
  text-align: center;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--line);
}

.detail-header h2 {
  margin-top: 6px;
  font-size: 32px;
}

.summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(84px, 1fr));
  gap: 8px;
}

.summary span {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px;
  color: var(--muted);
  text-align: center;
}

.summary strong {
  display: block;
  color: var(--text);
  font-size: 24px;
}

.promise-list {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}

.promise-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 18px;
}

.promise-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.promise-top h3 {
  margin: 0;
  font-size: 19px;
}

.status {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 5px 10px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.status.done {
  background: var(--done);
}

.status.progress {
  background: var(--progress);
}

.status.missed {
  background: var(--missed);
}

.status.unknown {
  background: var(--unknown);
}

.promise-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--muted);
  font-size: 14px;
}

.promise-footer a {
  color: var(--primary-dark);
  font-weight: 700;
}

.empty-message {
  margin: 0;
  padding: 16px;
  color: var(--muted);
}

@media (max-width: 860px) {
  .search-panel,
  .content-grid,
  .controls,
  .detail-header {
    grid-template-columns: 1fr;
  }

  .detail-header {
    display: grid;
  }

  .summary {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

- [ ] **Step 2: Refresh the browser**

Refresh the app page.

Expected: The app has a clean two-column layout on desktop and stacks on smaller screens.

- [ ] **Step 3: Commit**

If this folder has been initialized as a git repository, run:

```powershell
git add styles.css
git commit -m "style: add promise tracker layout"
```

Expected: Commit succeeds. If the folder is not a git repository, skip this step.

## Task 5: Add Local Development Server

**Files:**
- Create: `scripts/dev-server.js`

- [ ] **Step 1: Create the server script**

Create `scripts/dev-server.js` with this complete content:

```javascript
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 3000);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
};

const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent(request.url.split("?")[0]);
  const normalizedPath = path
    .normalize(requestPath === "/" ? "/index.html" : requestPath)
    .replace(/^[/\\]+/, "");
  const filePath = path.join(root, normalizedPath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
    });
    response.end(data);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Promise tracker is running at http://127.0.0.1:${port}`);
});
```

- [ ] **Step 2: Run the local server**

Run:

```powershell
node scripts/dev-server.js
```

Expected: The terminal prints `Promise tracker is running at http://127.0.0.1:3000`.

- [ ] **Step 3: Commit**

If this folder has been initialized as a git repository, run:

```powershell
git add scripts/dev-server.js
git commit -m "chore: add local development server"
```

Expected: Commit succeeds. If the folder is not a git repository, skip this step.

## Task 6: Add Beginner README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README**

Create `README.md` with this complete content:

```markdown
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
선거종류,직책,이름,정당,지역,공약명,상태,근거링크,마지막확인일,메모
```

새 공약을 추가하려면 아래처럼 한 줄을 추가합니다.

```csv
국회의원선거,국회의원,홍길동,예시당,서울 강남구갑,청년 주거 지원 확대,진행 중,https://example.com,2026-05-19,예산안 발의 확인
```

## 상태값 규칙

상태는 아래 4개 중 하나만 사용합니다.

- 완료
- 진행 중
- 미이행
- 확인 필요

## 보안 원칙

이 앱에는 비밀번호, API Key, 고객 개인정보를 저장하지 않습니다.

## 확장 계획

첫 구현은 국회의원 데이터로 시작합니다.

2026년 6월 3일 제9회 전국동시지방선거 이후에는 지방선거 당선자 데이터를 같은 CSV 구조로 추가할 수 있습니다.
```

- [ ] **Step 2: Review instructions**

Open `README.md`.

Expected: A non-developer can understand where to edit data and how to run the app.

- [ ] **Step 3: Commit**

If this folder has been initialized as a git repository, run:

```powershell
git add README.md
git commit -m "docs: add usage instructions"
```

Expected: Commit succeeds. If the folder is not a git repository, skip this step.

## Task 7: Final Verification

**Files:**
- Read: `index.html`
- Read: `styles.css`
- Read: `src/app.js`
- Read: `data/promises.csv`
- Read: `scripts/dev-server.js`
- Read: `README.md`

- [ ] **Step 1: Start local server**

Run:

```powershell
node scripts/dev-server.js
```

Expected: The server starts on port 3000.

- [ ] **Step 2: Open and test**

Open:

```text
http://localhost:3000
```

Expected:

- Results load from CSV.
- Name search works.
- Region search works.
- Election type filter works.
- Detail panel shows promises.
- Evidence links open in a new tab.

- [ ] **Step 3: Edit CSV and retest**

Change the memo for `홍길동` in `data/promises.csv`, save the file, then refresh the browser.

Expected: The updated memo appears on the detail screen.

- [ ] **Step 4: Confirm no secret data**

Search all files for secret-looking terms:

```powershell
Select-String -Path .\index.html,.\styles.css,.\src\app.js,.\data\promises.csv,.\README.md,.\scripts\dev-server.js -Pattern 'password|api key|apikey|secret|token|주민등록|전화번호|이메일'
```

Expected: No results that contain real secrets or personal information.

- [ ] **Step 5: Commit**

If this folder has been initialized as a git repository, run:

```powershell
git add index.html styles.css src/app.js data/promises.csv README.md scripts/dev-server.js docs/superpowers/specs/2026-05-19-promise-tracker-design.md docs/superpowers/plans/2026-05-19-promise-tracker-mvp.md
git commit -m "feat: build promise tracker mvp"
```

Expected: Commit succeeds. If the folder is not a git repository, skip this step.
