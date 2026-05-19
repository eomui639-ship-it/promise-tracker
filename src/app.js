const DATA_URLS = ["./data/promises.csv", "./data/nec-promises.csv"];

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
  liveLookupForm: document.querySelector("#liveLookupForm"),
  liveCandidateName: document.querySelector("#liveCandidateName"),
  liveSgId: document.querySelector("#liveSgId"),
  liveSgTypecode: document.querySelector("#liveSgTypecode"),
  liveCnddtId: document.querySelector("#liveCnddtId"),
  liveLookupStatus: document.querySelector("#liveLookupStatus"),
};

const STATUS_ORDER = ["완료", "진행중", "진행 중", "지연", "지연/계획변경", "보류", "폐기", "검증필요", "확인 필요"];

init();

async function init() {
  try {
    const rowGroups = await Promise.all(DATA_URLS.map(loadCsvIfExists));
    const rows = rowGroups.flat();
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

async function loadCsvIfExists(url) {
  try {
    return await loadCsv(url);
  } catch (error) {
    return [];
  }
}

function parseCsv(text) {
  const rows = splitCsvRows(text.trim().replace(/^\uFEFF/, ""));
  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, ""));

  return rows.slice(1).map((values) => {
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || "";
      return row;
    }, {});
  });
}

function splitCsvRows(text) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(current.trim());
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current || row.length) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows;
}

function groupByPerson(rows) {
  const peopleMap = new Map();

  rows.forEach((row) => {
    const electionType = readField(row, ["선거구분", "선거종류"]);
    const role = readField(row, ["직책"]) || inferRole(row);
    const name = readField(row, ["국회의원", "이름", "후보자명"]);
    const party = readField(row, ["정당", "정당명"]);
    const region = readField(row, ["선거구", "지역", "선거구명", "구시군명"]);
    const key = [electionType, role, name, region].join("|");

    if (!peopleMap.has(key)) {
      peopleMap.set(key, {
        key,
        electionType,
        role,
        name,
        party,
        region,
        promises: [],
      });
    }

    peopleMap.get(key).promises.push({
      category: normalizePromiseCategory(row),
      electionName: readField(row, ["선거명"]) || buildElectionName(row, electionType),
      title: readField(row, ["공약명", "공약내용"]),
      status: normalizeStatus(readField(row, ["이행상태", "상태"])),
      evidenceUrl: readField(row, ["근거링크", "자료출처"]),
      checkedAt: readField(row, ["확인일", "마지막확인일"]),
      memo: readField(row, ["비고", "메모", "검증메모", "공약내용"]),
    });
  });

  return Array.from(peopleMap.values());
}

function inferRole(row) {
  const electionTypeCode = readField(row, ["선거종류코드"]);

  if (electionTypeCode === "4") {
    return "구청장 후보";
  }

  if (electionTypeCode === "3") {
    return "시장·도지사 후보";
  }

  if (electionTypeCode === "11") {
    return "교육감 후보";
  }

  return "후보자";
}

function normalizePromiseCategory(row) {
  const category = readField(row, ["공약구분"]);
  if (category) return category;

  if (readField(row, ["후보자ID", "공약순번"])) {
    return "이번공약";
  }

  return "지난공약";
}

function buildElectionName(row, electionType) {
  const typeCode = readField(row, ["선거종류코드"]);
  return typeCode ? `${electionType} · 선거종류 ${typeCode}` : electionType;
}

function readField(row, names) {
  const key = names.find((name) => row[name] !== undefined);
  return key ? row[key] : "";
}

function normalizeStatus(status) {
  const trimmedStatus = status.trim();

  if (trimmedStatus === "진행 중") {
    return "진행중";
  }

  if (trimmedStatus === "확인 필요") {
    return "검증필요";
  }

  return trimmedStatus;
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

function refreshElectionFilter(people) {
  const selectedValue = elements.electionFilter.value;
  elements.electionFilter.innerHTML = '<option value="all">전체</option>';
  fillElectionFilter(people);
  elements.electionFilter.value = Array.from(elements.electionFilter.options).some(
    (option) => option.value === selectedValue,
  )
    ? selectedValue
    : "all";
}

function bindEvents() {
  elements.searchInput.addEventListener("input", applyFilters);
  elements.electionFilter.addEventListener("change", applyFilters);
  elements.liveLookupForm.addEventListener("submit", handleLiveLookup);
}

async function handleLiveLookup(event) {
  event.preventDefault();

  const candidateName = elements.liveCandidateName.value.trim();
  const sgId = elements.liveSgId.value.trim();
  const sgTypecode = elements.liveSgTypecode.value;
  const cnddtId = elements.liveCnddtId.value.trim();

  if (!sgId || (!candidateName && !cnddtId)) {
    setLiveLookupStatus("선거ID와 후보자명 또는 후보자ID를 입력해 주세요.", "error");
    return;
  }

  const params = new URLSearchParams({
    sgId,
    sgTypecode,
    status: "공약등록",
  });

  if (candidateName) params.set("candidateName", candidateName);
  if (cnddtId) params.set("cnddtId", cnddtId);

  const button = elements.liveLookupForm.querySelector("button");
  button.disabled = true;
  setLiveLookupStatus("중앙선관위에서 공약을 조회하고 있습니다.", "loading");

  try {
    const response = await fetch(`/api/nec-promises?${params.toString()}`);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.ok) {
      throw new Error(payload.message || "실시간 조회 서버가 아직 연결되지 않았습니다.");
    }

    if (!payload.rows.length) {
      setLiveLookupStatus("후보자는 찾았지만 공약 데이터가 없습니다.", "error");
      return;
    }

    mergeRows(payload.rows);
    elements.searchInput.value = payload.rows[0].후보자명 || candidateName;
    applyFilters();
    selectFirstFilteredPerson();
    setLiveLookupStatus(`공약 ${payload.rows.length}개를 불러왔습니다.`, "success");
  } catch (error) {
    setLiveLookupStatus(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

function mergeRows(rows) {
  const incomingPeople = groupByPerson(rows);
  const peopleMap = new Map(state.people.map((person) => [person.key, person]));

  incomingPeople.forEach((person) => {
    peopleMap.set(person.key, person);
  });

  state.people = Array.from(peopleMap.values());
  state.filteredPeople = state.people;
  refreshElectionFilter(state.people);
}

function selectFirstFilteredPerson() {
  const [firstPerson] = state.filteredPeople;
  if (!firstPerson) return;

  state.selectedPersonKey = firstPerson.key;
  renderResults();
  renderDetail(firstPerson);
}

function setLiveLookupStatus(message, type) {
  elements.liveLookupStatus.textContent = message;
  elements.liveLookupStatus.dataset.type = type;
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
      <span class="meta">${escapeHtml(person.electionType)} · ${escapeHtml(person.role)}</span>
      <strong>${escapeHtml(person.name)}</strong>
      <span>${escapeHtml(person.party)}</span>
      <span>${escapeHtml(person.region)}</span>
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
        <span class="meta">${escapeHtml(person.electionType)} · ${escapeHtml(person.role)}</span>
        <h2>${escapeHtml(person.name)}</h2>
        <p>${escapeHtml(person.party)} · ${escapeHtml(person.region)}</p>
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
  const evidenceMarkup = promise.evidenceUrl.startsWith("http")
    ? `<a href="${escapeAttribute(promise.evidenceUrl)}" target="_blank" rel="noreferrer">근거 보기</a>`
    : `<span>${escapeHtml(promise.evidenceUrl || "근거 없음")}</span>`;

  return `
    <article class="promise-card">
      <div class="promise-top">
        <div>
          <span class="promise-election">${escapeHtml(promise.electionName)}</span>
          <h4>${escapeHtml(promise.title)}</h4>
        </div>
        <span class="status ${getStatusClass(promise.status)}">${escapeHtml(promise.status)}</span>
      </div>
      <p class="memo">${escapeHtml(promise.memo || "메모 없음")}</p>
      <div class="promise-footer">
        <span>마지막 확인일: ${escapeHtml(promise.checkedAt)}</span>
        ${evidenceMarkup}
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
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
  const extraStatuses = Object.keys(statusCounts).filter((status) => !STATUS_ORDER.includes(status));
  const statuses = [...STATUS_ORDER, ...extraStatuses].filter((status) => statusCounts[status] > 0);

  return statuses
    .map((status) => `<span><strong>${statusCounts[status] || 0}</strong>${status}</span>`)
    .join("");
}

function getStatusClass(status) {
  const classMap = {
    완료: "done",
    진행중: "progress",
    "진행 중": "progress",
    지연: "delay",
    "지연/계획변경": "delay",
    보류: "hold",
    폐기: "discarded",
    미이행: "missed",
    검증필요: "unknown",
    "확인 필요": "unknown",
  };

  return classMap[status] || "unknown";
}

function renderError(message) {
  elements.resultsList.innerHTML = `<p class="empty-message">${message}</p>`;
  elements.resultCount.textContent = "0명";
}
