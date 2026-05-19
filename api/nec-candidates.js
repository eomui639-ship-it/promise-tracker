const { fetchCandidates } = require("../scripts/fetch-nec-promises");

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
  const candidateName = String(query.candidateName || "").trim();
  const sgId = String(query.sgId || "").trim();
  const sgTypecode = String(query.sgTypecode || "").trim();

  if (!candidateName) {
    sendJson(response, 400, {
      ok: false,
      message: "후보자명을 입력해 주세요.",
    });
    return;
  }

  try {
    const candidates = await fetchCandidates({
      serviceKey,
      sgId,
      sgTypecode,
      candidateName,
    });

    sendJson(response, 200, {
      ok: true,
      candidates,
      count: candidates.length,
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
