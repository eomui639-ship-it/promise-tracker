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
      category: row.공약구분 || "지난공약",
      electionName: row.선거명 || row.선거종류,
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
      <span class="rate-line">지난 공약 실행률 ${calculateCompletionRate(person.promises).rate}%</span>
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
  const pastPromises = getPromisesByCategory(person.promises, "지난공약");
  const currentPromises = getPromisesByCategory(person.promises, "이번공약");
  const statusCounts = countStatuses(pastPromises);
  const completion = calculateCompletionRate(person.promises);

  elements.detailView.className = "person-detail";
  elements.detailView.innerHTML = `
    <div class="detail-header">
      <div>
        <span class="meta">${person.electionType} · ${person.role}</span>
        <h2>${person.name}</h2>
        <p>${person.party} · ${person.region}</p>
      </div>
      <div class="completion-card">
        <span>지난 공약 실행률</span>
        <strong>${completion.rate}%</strong>
        <p>완료 ${completion.doneCount}개 / 전체 ${completion.totalCount}개</p>
      </div>
      <div class="summary">
        ${renderStatusSummary(statusCounts)}
      </div>
    </div>

    ${renderPromiseSection("지난 공약", pastPromises)}
    ${renderPromiseSection("이번 공약", currentPromises)}
  `;
}

function renderPromiseSection(title, promises) {
  const emptyText =
    title === "지난 공약"
      ? "아직 지난 공약 데이터가 없습니다."
      : "아직 이번 공약 데이터가 없습니다.";

  return `
    <section class="promise-section">
      <div class="section-heading">
        <h3>${title}</h3>
        <span>${promises.length}개</span>
      </div>
      <div class="promise-list">
        ${promises.length > 0 ? promises.map(renderPromise).join("") : `<p class="empty-message">${emptyText}</p>`}
      </div>
    </section>
  `;
}

function renderPromise(promise) {
  return `
    <article class="promise-card">
      <div class="promise-top">
        <div>
          <span class="promise-election">${promise.electionName}</span>
          <h4>${promise.title}</h4>
        </div>
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

function getPromisesByCategory(promises, category) {
  return promises.filter((promise) => promise.category === category);
}

function calculateCompletionRate(promises) {
  const pastPromises = getPromisesByCategory(promises, "지난공약");
  const doneCount = pastPromises.filter((promise) => promise.status === "완료").length;
  const totalCount = pastPromises.length;
  const rate = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  return {
    doneCount,
    totalCount,
    rate,
  };
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
