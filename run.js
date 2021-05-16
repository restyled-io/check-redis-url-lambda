require("dotenv").config();
h = require("./index.js");
h.handler({}).then(console.log).catch(console.error);
