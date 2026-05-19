const assert = require("assert");
const {
  buildPromiseRows,
  toCsv,
  normalizeItems,
  buildDirectCandidate,
  normalizeCandidate,
} = require("./fetch-nec-promises");

function testBuildPromiseRows() {
  const candidates = [
    {
      huboid: "1000000000",
      name: "홍길동",
      partyName: "예시당",
      sidoName: "서울특별시",
      wiwName: "강남구",
      sdName: "강남구청장선거",
    },
  ];

  const promisesByHuboid = new Map([
    [
      "1000000000",
      [
        {
          prmsOrd1: "1",
          prmsRealmName1: "복지",
          prmsTitle1: "어르신 돌봄 확대",
          prmsCont1: "어르신 돌봄센터를 확대하겠습니다",
          prmsOrd2: "2",
          prmsRealmName2: "교통",
          prmsTitle2: "마을버스 증차",
          prmsCont2: "출퇴근 시간 마을버스를 늘리겠습니다",
        },
      ],
    ],
  ]);

  const rows = buildPromiseRows({
    electionName: "지방선거",
    electionTypeCode: "4",
    candidates,
    promisesByHuboid,
    status: "공약등록",
    checkedAt: "2026-05-19",
    note: "선거 전 후보자 공약",
  });

  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].후보자ID, "1000000000");
  assert.strictEqual(rows[0].공약순번, "1");
  assert.strictEqual(rows[0].공약분야, "복지");
  assert.strictEqual(rows[0].공약명, "어르신 돌봄 확대");
  assert.strictEqual(rows[0].상태, "공약등록");
  assert.strictEqual(rows[1].공약순번, "2");
}

function testToCsvEscapesCommasAndQuotes() {
  const csv = toCsv([
    {
      선거구분: "지방선거",
      선거종류코드: "4",
      후보자ID: "1",
      후보자명: "홍길동",
      정당명: "예시당",
      시도명: "서울특별시",
      구시군명: "강남구",
      선거구명: "강남구청장선거",
      공약순번: "1",
      공약분야: "복지",
      공약명: "어르신, 돌봄 확대",
      공약내용: '센터를 "확대"합니다',
      상태: "공약등록",
      자료출처: "중앙선관위 선거공약 API",
      확인일: "2026-05-19",
      검증메모: "선거 전 후보자 공약",
    },
  ]);

  assert(csv.includes('"어르신, 돌봄 확대"'));
  assert(csv.includes('"센터를 ""확대""합니다"'));
}

function testNormalizeItems() {
  assert.deepStrictEqual(normalizeItems({ item: { a: 1 } }), [{ a: 1 }]);
  assert.deepStrictEqual(normalizeItems({ item: [{ a: 1 }, { a: 2 }] }), [{ a: 1 }, { a: 2 }]);
  assert.deepStrictEqual(normalizeItems({}), []);
}

function testBuildDirectCandidate() {
  const candidate = buildDirectCandidate({
    cnddtId: "1000000000",
    candidateName: "홍길동",
    partyName: "예시당",
    sidoName: "서울특별시",
    wiwName: "강남구",
    districtName: "강남구청장선거",
  });

  assert.strictEqual(candidate.huboid, "1000000000");
  assert.strictEqual(candidate.name, "홍길동");
  assert.strictEqual(candidate.sdName, "강남구청장선거");
}

function testNormalizeCandidateFromSearchApi() {
  const candidate = normalizeCandidate({
    huboid: "1234567890",
    name: "김후보",
    jdName: "예시당",
    sdName: "서울특별시",
    wiwName: "강남구",
    sggName: "강남구청장선거",
  });

  assert.strictEqual(candidate.huboid, "1234567890");
  assert.strictEqual(candidate.name, "김후보");
  assert.strictEqual(candidate.partyName, "예시당");
  assert.strictEqual(candidate.sidoName, "서울특별시");
  assert.strictEqual(candidate.wiwName, "강남구");
  assert.strictEqual(candidate.sdName, "강남구청장선거");
}

testBuildPromiseRows();
testToCsvEscapesCommasAndQuotes();
testNormalizeItems();
testBuildDirectCandidate();
testNormalizeCandidateFromSearchApi();

console.log("NEC promise import tests passed");
