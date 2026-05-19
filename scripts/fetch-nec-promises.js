const fs = require("fs");
const path = require("path");

const BASE_URLS = {
  code: "https://apis.data.go.kr/9760000/CommonCodeService",
  candidate: "https://apis.data.go.kr/9760000/CndaSrchService",
  promise: "https://apis.data.go.kr/9760000/ElecPrmsInfoInqireService",
};

const DEFAULT_OUTPUT = path.join(__dirname, "..", "data", "nec-promises.csv");
const SOURCE_NAME = "중앙선관위 선거공약 API";
const CSV_COLUMNS = [
  "선거구분",
  "선거종류코드",
  "후보자ID",
  "후보자명",
  "정당명",
  "시도명",
  "구시군명",
  "선거구명",
  "공약순번",
  "공약분야",
  "공약명",
  "공약내용",
  "상태",
  "자료출처",
  "확인일",
  "검증메모",
];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const serviceKey = process.env.NEC_SERVICE_KEY;

  if (!serviceKey) {
    throw new Error("NEC_SERVICE_KEY 환경변수를 먼저 설정해 주세요.");
  }

  const electionName = options.electionName || "지방선거";
  const status = options.status || "공약등록";
  const checkedAt = options.checkedAt || new Date().toISOString().slice(0, 10);
  const note =
    options.note ||
    (status === "추적대상" ? "당선 후 공약 추적 대상" : "선거 전 후보자 공약");

  const codeInfo = await resolveElectionCode({
    serviceKey,
    sgId: options.sgId,
    sgTypecode: options.sgTypecode,
  });

  const candidates = options.cnddtId
    ? [buildDirectCandidate(options)]
    : await fetchCandidates({
        serviceKey,
        sgId: codeInfo.sgId,
        sgTypecode: codeInfo.sgTypecode,
        sidoName: options.sidoName,
        wiwName: options.wiwName,
      });

  const promisesByHuboid = new Map();
  for (const candidate of candidates) {
    if (!candidate.huboid) continue;
    const promises = await fetchCandidatePromises({
      serviceKey,
      sgId: codeInfo.sgId,
      sgTypecode: codeInfo.sgTypecode,
      cnddtId: candidate.huboid,
    });
    promisesByHuboid.set(candidate.huboid, promises);
  }

  const rows = buildPromiseRows({
    electionName,
    electionTypeCode: codeInfo.sgTypecode,
    candidates,
    promisesByHuboid,
    status,
    checkedAt,
    note,
  });

  const outputPath = path.resolve(options.output || DEFAULT_OUTPUT);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, toCsv(rows), "utf8");

  console.log(`Saved ${rows.length} pledge rows to ${outputPath}`);
}

function parseArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;

    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = "true";
    } else {
      options[key] = next;
      index += 1;
    }
  }

  return options;
}

async function resolveElectionCode({ serviceKey, sgId, sgTypecode }) {
  if (sgId && sgTypecode) {
    return { sgId, sgTypecode };
  }

  const items = await callApi({
    baseUrl: BASE_URLS.code,
    methodName: "getCommonSgCodeList",
    serviceKey,
    params: {
      sgId,
      sgTypecode,
      numOfRows: "100",
      pageNo: "1",
    },
  });

  const first = items.find((item) => readApiField(item, ["sgId"]) && readApiField(item, ["sgTypecode"]));
  if (!first) {
    throw new Error("코드정보 API에서 sgId, sgTypecode를 찾지 못했습니다. 옵션으로 직접 입력해 주세요.");
  }

  return {
    sgId: readApiField(first, ["sgId"]),
    sgTypecode: readApiField(first, ["sgTypecode"]),
  };
}

async function fetchCandidates({ serviceKey, sgId, sgTypecode, sidoName, wiwName }) {
  const items = await callApi({
    baseUrl: BASE_URLS.candidate,
    methodName: "getCndaSrchInqire",
    serviceKey,
    params: {
      sgId,
      sgTypecode,
      sdName: sidoName,
      wiwName,
      numOfRows: "1000",
      pageNo: "1",
    },
  });

  return items.map(normalizeCandidate).filter((candidate) => candidate.huboid);
}

async function fetchCandidatePromises({ serviceKey, sgId, sgTypecode, cnddtId }) {
  return callApi({
    baseUrl: BASE_URLS.promise,
    methodName: "getCnddtElecPrmsInfoInqire",
    serviceKey,
    params: {
      sgId,
      sgTypecode,
      cnddtId,
      numOfRows: "100",
      pageNo: "1",
    },
  });
}

async function callApi({ baseUrl, methodName, serviceKey, params }) {
  const url = new URL(`${baseUrl}/${methodName}`);
  url.searchParams.set("ServiceKey", serviceKey);
  url.searchParams.set("resultType", "json");

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${methodName} 호출 실패: HTTP ${response.status}`);
  }

  const text = await response.text();
  const payload = parseApiPayload(text);
  const resultCode = readApiField(payload, ["response.header.resultCode", "header.resultCode"]);
  if (resultCode && resultCode !== "00" && resultCode !== "INFO-00") {
    const message = readApiField(payload, ["response.header.resultMsg", "header.resultMsg"]) || "알 수 없는 API 오류";
    throw new Error(`${methodName} 오류: ${resultCode} ${message}`);
  }

  return normalizeItems(readApiField(payload, ["response.body.items", "body.items", "items"]));
}

function parseApiPayload(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("JSON 응답을 해석하지 못했습니다. API가 XML을 반환했을 수 있습니다.");
  }
}

function normalizeCandidate(item) {
  return {
    huboid: readApiField(item, ["huboid", "HUBOID", "cnddtId"]),
    name: readApiField(item, ["name", "cnddtNm", "huboName", "candidateName"]),
    partyName: readApiField(item, ["jdName", "partyName", "partyNm"]),
    sidoName: readApiField(item, ["sdName", "sidoName", "cityName"]),
    wiwName: readApiField(item, ["wiwName", "sggName", "gusigunName"]),
    sdName: readApiField(item, ["sggName", "sdName", "sggSdName", "constituencyName"]),
  };
}

function buildDirectCandidate(options) {
  return {
    huboid: options.cnddtId,
    name: options.candidateName || "",
    partyName: options.partyName || "",
    sidoName: options.sidoName || "",
    wiwName: options.wiwName || "",
    sdName: options.districtName || "",
  };
}

function buildPromiseRows({
  electionName,
  electionTypeCode,
  candidates,
  promisesByHuboid,
  status,
  checkedAt,
  note,
}) {
  const rows = [];

  candidates.forEach((candidate) => {
    const promiseItems = promisesByHuboid.get(candidate.huboid) || [];

    promiseItems.forEach((promiseItem) => {
      for (let order = 1; order <= 10; order += 1) {
        const title = readApiField(promiseItem, [`prmsTitle${order}`]);
        const content = readApiField(promiseItem, [`prmsCont${order}`]);
        const realm = readApiField(promiseItem, [`prmsRealmName${order}`]);
        const promiseOrder = readApiField(promiseItem, [`prmsOrd${order}`]) || String(order);

        if (!title && !content) continue;

        rows.push({
          선거구분: electionName,
          선거종류코드: electionTypeCode,
          후보자ID: candidate.huboid,
          후보자명: candidate.name,
          정당명: candidate.partyName,
          시도명: candidate.sidoName,
          구시군명: candidate.wiwName,
          선거구명: candidate.sdName,
          공약순번: promiseOrder,
          공약분야: realm,
          공약명: title,
          공약내용: content,
          상태: status,
          자료출처: SOURCE_NAME,
          확인일: checkedAt,
          검증메모: note,
        });
      }
    });
  });

  return rows;
}

function normalizeItems(items) {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (Array.isArray(items.item)) return items.item;
  if (items.item) return [items.item];
  return [];
}

function readApiField(source, paths) {
  if (!source) return "";

  for (const fieldPath of paths) {
    const value = fieldPath.split(".").reduce((current, key) => {
      if (current && Object.prototype.hasOwnProperty.call(current, key)) {
        return current[key];
      }
      return undefined;
    }, source);

    if (value !== undefined && value !== null) {
      return String(value).trim();
    }
  }

  return "";
}

function toCsv(rows) {
  const lines = [CSV_COLUMNS.join(",")];

  rows.forEach((row) => {
    lines.push(CSV_COLUMNS.map((column) => escapeCsv(row[column] || "")).join(","));
  });

  return `${lines.join("\n")}\n`;
}

function escapeCsv(value) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  buildPromiseRows,
  buildDirectCandidate,
  normalizeCandidate,
  normalizeItems,
  toCsv,
};
