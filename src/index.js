require("dotenv").config();
const express = require("express");
const path = require("path");
const { urlencoded } = require("body-parser");
require("./db/mongoose");

// Routes
const webhookRouter = require("./routes/webhook");

let app = express();
app.disable("x-powered-by");
let port = process.env.PORT || 8080;

// parse application/x-www.form-urlencoded
app.use(urlencoded({ extended: true }));

// parse application/json
app.use(express.json());

app.use(webhookRouter);

app.listen(port, () => console.log(`webhook is running in PORT: ${port}`));
