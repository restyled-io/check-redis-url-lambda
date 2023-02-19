const AWS = require("aws-sdk");
const Heroku = require("heroku-client");
const { Logger } = require("@aws-lambda-powertools/logger");

// TODO: make this check *any* deployed environment
const ENV = process.env.ENV || "prod";

const HEROKU_API_KEY = `/restyled/${ENV}/heroku-api-key`;
const REDIS_URL_KEY = `/restyled/${ENV}/redis-url`;

const ssm = new AWS.SSM();
const logger = new Logger({ serviceName: "check-redis-url" });

exports.handler = async (event, context) => {
  logger.addContext(context);

  const { herokuEnv, ssmParameter } = await getRedisUrls(event);

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

const getRedisUrls = async (event) => {
  if (typeof event.mock === "object") {
    return event.mock;
  } else {
    const tokenParameter = await ssm
      .getParameter({ Name: HEROKU_API_KEY })
      .promise();
    const token = tokenParameter.Parameter.Value;
    const heroku = new Heroku({ token });
    const { REDIS_URL } = await heroku.get("/apps/restyled-io/config-vars");
    const { Parameter } = await ssm
      .getParameter({ Name: REDIS_URL_KEY })
      .promise();
    return {
      herokuEnv: REDIS_URL,
      ssmParameter: Parameter.Value,
    };
  }
};
