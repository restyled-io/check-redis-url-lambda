const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.test") });

const index = require("./index");

// Must match /restyled/test/redis-url SSM Parameter
const TEST_REDIS_URL = "TEST-REDIS-URL";

test("when values match", async () => {
  const { status, result } = await index.handler(
    {
      mock: {
        herokuEnv: TEST_REDIS_URL,
        ssmParameter: TEST_REDIS_URL,
      },
    },
    {}
  );

  expect(status).toBe("ok");
  expect(result).toBe("matched");
});

test("when values don't match", async () => {
  const { status, result } = await index.handler(
    {
      mock: {
        herokuEnv: TEST_REDIS_URL,
        ssmParameter: "something else",
      },
    },
    {}
  );

  expect(status).toBe("ok");
  expect(result).toHaveProperty("Version");
});

test("getRedisUrls", async () => {
  const { herokuEnv, ssmParameter } = await index.getRedisUrls({});

  expect(herokuEnv).toMatch(/amazonaws\.com:/);
  expect(ssmParameter).toBe(TEST_REDIS_URL);
});
