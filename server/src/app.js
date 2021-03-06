const fs = require("fs");
const rfs = require("rotating-file-stream");
const path = require("path");
const moment = require("moment");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const initDb = require("./db-init");
const apiRoutes = require("./api/index");

const app = express();

// http access logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
if (process.env.NODE_ENV === "production") {
  const logDirectory = path.resolve(__dirname, "../log");
  // ensure log directory exists
  fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
  // create a rotating write stream
  const accessLogStream = rfs(
    `${moment().format("MMMM Do YYYY, h:mm:ss a")} access.log`,
    {
      interval: "1d", // rotate daily
      path: logDirectory
    }
  );
  // setup the logger
  app.use(morgan("combined", { stream: accessLogStream }));
}

initDb()
  .then(() => console.log("db initd"))
  .catch(err => {
    console.error(err);
  });

// enable CORS
app.use(cors());

// app setup
app.use(
  express.urlencoded({
    extended: true
  })
);
app.use(express.json());
app.use(apiRoutes);

// serves SPA
app.use(express.static(path.resolve(__dirname, "../../client/build")));
app.get("*", function(request, response) {
  response.sendFile(path.resolve(__dirname, "../../client/build/index.html"));
});

// global error handling
app.use((req, res, next) => {
  const err = new Error("not found");
  err.code = 404;
  next(err);
});
app.use((err, req, res, next) => {
  res.status(err.code || 500);
  res.json({
    error: {
      message: err.message
    }
  });
});

module.exports = app;
