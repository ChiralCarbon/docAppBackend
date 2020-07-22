const express = require('express');
const serverless = require('serverless-http')
const cookieParser = require('cookie-parser');
const logger = require('morgan');
process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
const config = require('config')
const mongoose = require('mongoose')
const winston = require('./utils/logger').winston
const cors = require('cors')

require('dotenv').config()

//Initialize passport
require('./utils/passport')

const app = express();

app.use(cors())

mongoose.connect(config.get("mongoDb.uri"), { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
    .catch(error => {
        console.log("dbConnection error -> \n", error)
    })

mongoose.set('debug', function (coll, method, query, doc, options) {
    //Log all mongoose queries
    winston.debug({
        eventType: 'mongoose_log',
        collection: coll,
        method,
        query,
        doc,
        options,
    })
})
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/health', (req, res, next) => res.status(200).json({ "message": "Server is healthy" }))

require('./managers')
require('./routes').init(app)


//Swagger Documentation
require('./utils/init-swagger').init(app)

app.use(function (error, req, res, next) {
    winston.error({ error })

    if (error.name === 'ValidationError') {
        return res.status(400).json({ error: { msg: error.message } })
    } else {
        return res.status(500).json({ msg: "An error internal occurred." })
    }
})

exports.app = app;
exports.handler = serverless(app);