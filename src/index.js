require("dotenv").config();
const express = require("express");
const path = require("path");
const { urlencoded, json } = require("body-parser");
require("./db/mongoose");

// Routes
const webhookRouter = require("./routes/webhook");
const messageRouter = require("./routes/message");

let app = express();
app.disable("x-powered-by");

// parse application/x-www.form-urlencoded
app.use(urlencoded({ extended: true }));

// parse application/json
app.use(json());

app.use(webhookRouter);
app.use(messageRouter);

let port = process.env.PORT || 8080;
app.listen(port, () => console.log(`webhook is running in PORT: ${port}`));
