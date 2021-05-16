const AWS = require("aws-sdk");
const Heroku = require("heroku-client");

const ENV = process.env.ENV || "dev";
const HEROKU_API_KEY = `/restyled/${ENV}/heroku-api-key`;
const REDIS_URL_KEY = `/restyled/${ENV}/redis-url`;

const ssm = new AWS.SSM();

exports.handler = async (event) => {
  const { herokuEnv, ssmParameter } = await getRedisUrls(event);

  // Strip username/password for logging
  const cleansed = herokuEnv.replace(/^[^@]*@/, "redis://");

  if (herokuEnv === ssmParameter) {
    console.log(`Values matched: ${cleansed}`);
    return { status: "ok", result: "matched" };
  } else {
    console.log(`Updating ${REDIS_URL_KEY} (${cleansed})`);
    const result = await putParameter({
      Name: REDIS_URL_KEY,
      Value: herokuEnv,
      Overwrite: true,
    });
    return { status: "ok", result };
  }
};

const getRedisUrls = async (event) => {
  if (typeof event.mock === "object") {
    return event.mock;
  } else {
    const tokenParameter = await getParameter({ Name: HEROKU_API_KEY });
    const token = tokenParameter.Parameter.Value;
    const heroku = new Heroku({ token });
    const { REDIS_URL } = await heroku.get("/apps/restyled-io/config-vars");
    const { Parameter } = await getParameter({ Name: REDIS_URL_KEY });
    return {
      herokuEnv: REDIS_URL,
      ssmParameter: Parameter.Value,
    };
  }
};

const getParameter = async (params) => {
  return new Promise((resolve, reject) => {
    ssm.getParameter(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

const putParameter = async (params) => {
  return new Promise((resolve, reject) => {
    ssm.putParameter(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};
