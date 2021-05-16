const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.test") });

const index = require("./index");

// Must match /restyled/test/redis-url SSM Parameter
const TEST_REDIS_URL = "TEST-REDIS-URL";
const originalDebug = console.debug;
const originalLog = console.log;

beforeEach(() => {
  console.debug = jest.fn();
  console.log = jest.fn();
});

afterEach(() => {
  console.debug = originalDebug;
  console.log = originalLog;
});

test("when values match", async () => {
  const { status, result } = await index.handler({
    mock: {
      herokuEnv: TEST_REDIS_URL,
      ssmParameter: TEST_REDIS_URL,
    },
  });

  expect(status).toBe("ok");
  expect(result).toBe("matched");
});

test("when values don't match", async () => {
  const { status, result } = await index.handler({
    mock: {
      herokuEnv: TEST_REDIS_URL,
      ssmParameter: "something else",
    },
  });

  expect(status).toBe("ok");
  expect(result).toHaveProperty("Version");
});
