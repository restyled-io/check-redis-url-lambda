const AWS = require("aws-sdk");
const Heroku = require("heroku-client");
const { Logger } = require("@aws-lambda-powertools/logger");

// TODO: make this check *any* deployed environment
const ENV = process.env.ENV || "prod";

const HEROKU_API_KEY = `/restyled/${ENV}/heroku-api-key`;
const REDIS_URL_KEY = `/restyled/${ENV}/redis-url`;

const ssm = new AWS.SSM();
const logger = new Logger({ serviceName: "check-redis-url" });

// Exported for testing
exports.getRedisUrls = async (event) => {
  const tokenParameter = await ssm
    .getParameter({ Name: HEROKU_API_KEY })
    .promise();
  const token = tokenParameter.Parameter.Value;
  const heroku = new Heroku({ token });

  [{ REDIS_URL }, { Parameter }] = await Promise.all([
    heroku.get("/apps/restyled-io/config-vars"),
    ssm.getParameter({ Name: REDIS_URL_KEY }).promise(),
  ]);

  // still run all the code, but use the mock values if in test
  return typeof event.mock === "object"
    ? event.mock
    : {
        herokuEnv: REDIS_URL,
        ssmParameter: Parameter.Value,
      };
};

exports.handler = async (event, context) => {
  logger.addContext(context);

  const { herokuEnv, ssmParameter } = await exports.getRedisUrls(event);

  // Strip username/password for logging
  const cleansed = herokuEnv.replace(/^[^@]*@/, "redis://");

  if (herokuEnv === ssmParameter) {
    logger.info("Values matched", { value: cleansed });
    return { status: "ok", result: "matched" };
  } else {
    logger.info("Updating", { key: REDIS_URL_KEY, value: cleansed });
    const result = await ssm
      .putParameter({
        Name: REDIS_URL_KEY,
        Value: herokuEnv,
        Overwrite: true,
      })
      .promise();
    return { status: "ok", result };
  }
};
