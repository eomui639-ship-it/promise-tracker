const {
  buildDirectCandidate,
  buildPromiseRows,
  fetchCandidatePromises,
  fetchCandidates,
} = require("../scripts/fetch-nec-promises");

module.exports = async function handler(request, response) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, {
      ok: false,
      message: "GET 요청만 사용할 수 있습니다.",
    });
    return;
  }

  const serviceKey = process.env.NEC_SERVICE_KEY;
  if (!serviceKey) {
    sendJson(response, 500, {
      ok: false,
      message: "서버에 NEC_SERVICE_KEY 환경변수가 설정되지 않았습니다.",
    });
    return;
  }

  const query = request.query || {};
  const sgId = String(query.sgId || "").trim();
  const sgTypecode = String(query.sgTypecode || "4").trim();
  const candidateName = String(query.candidateName || "").trim();
  const cnddtId = String(query.cnddtId || "").trim();
  const status = String(query.status || "공약등록").trim();

  if (!sgId || !sgTypecode || (!candidateName && !cnddtId)) {
    sendJson(response, 400, {
      ok: false,
      message: "sgId, sgTypecode, 후보자명 또는 후보자ID가 필요합니다.",
    });
    return;
  }

  try {
    const candidates = cnddtId
      ? [
          buildDirectCandidate({
            sgId,
            sgTypecode,
            cnddtId,
            candidateName,
          }),
        ]
      : await fetchCandidates({
          serviceKey,
          sgId,
          sgTypecode,
          candidateName,
        });

    if (!candidates.length) {
      sendJson(response, 404, {
        ok: false,
        message: "후보자 통합검색 API에서 후보자를 찾지 못했습니다.",
      });
      return;
    }

    const promisesByHuboid = new Map();
    for (const candidate of candidates) {
      const promises = await fetchCandidatePromises({
        serviceKey,
        sgId,
        sgTypecode,
        cnddtId: candidate.huboid,
      });
      promisesByHuboid.set(candidate.huboid, promises);
    }

    const rows = buildPromiseRows({
      electionName: "지방선거",
      electionTypeCode: sgTypecode,
      candidates,
      promisesByHuboid,
      status,
      checkedAt: new Date().toISOString().slice(0, 10),
      note: status === "추적대상" ? "당선 후 공약 추적 대상" : "선거 전 후보자 공약",
    });

    sendJson(response, 200, {
      ok: true,
      candidates,
      rows,
      rowCount: rows.length,
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      message: error.message,
    });
  }
};

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}
