const baseUrl = process.env.MENUDEX_BASE_URL ?? "http://127.0.0.1:3000";

async function expectStatus(path, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });

  if (response.status !== expectedStatus) {
    throw new Error(
      `${path} returned ${response.status}; expected ${expectedStatus}`,
    );
  }

  return response;
}

async function expectPageContains(path, expectedText) {
  const response = await expectStatus(path, 200);
  const body = await response.text();

  if (!body.includes(expectedText)) {
    throw new Error(`${path} did not contain "${expectedText}"`);
  }
}

async function expectPageContainsAny(path, expectedTexts) {
  const response = await expectStatus(path, 200);
  const body = await response.text();

  if (!expectedTexts.some((text) => body.includes(text))) {
    throw new Error(`${path} did not contain any of: ${expectedTexts.join(", ")}`);
  }
}

await expectStatus("/", 307);
await expectPageContains("/restaurants", "식당 목록");
await expectPageContainsAny("/restaurants", [
  "식당 추가",
  "MenuDex 설정이 필요합니다",
  "로그인이 필요합니다",
  "불러오는 중",
]);
await expectPageContains("/restaurants/new", "새 식당");
await expectPageContains("/restaurants/smoke-test/edit", "식당 수정");
await expectPageContains("/restaurants/smoke-test/menus/new", "메뉴 추가");
await expectPageContains("/restaurants/smoke-test/visits/new", "방문 기록");

console.log(`Web smoke passed against ${baseUrl}`);
