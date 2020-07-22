//For Winston
const { createLogger, format, transports } = require('winston');

//For Bunyan2Loggly
const Logger = require("bunyan");
const config = require("config");
const Bunyan2Loggly = require("bunyan-loggly");
const bformat = require("bunyan-format");
const formatOut = bformat({ outputMode: "short", colors: "true" });
let log_level = config.get("log_level")
let logglyConfig = config.get("loggly");

logglyConfig = JSON.parse(JSON.stringify(logglyConfig));
log_level = JSON.parse(JSON.stringify(log_level));

//Winston logger
const winston_logger = createLogger({
    level: 'debug',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
    ),
    defaultMeta: { service: 'ic-backend' },
    transports: [
        //
        // - Write to all logs with level `info` and below to `quick-start-combined.log`.
        // - Write all logs error (and below) to `quick-start-error.log`.
        //
        //   new transports.File({ filename: 'quick-start-error.log', level: 'error' }),
        //   new transports.File({ filename: 'quick-start-combined.log' })
    ]
});

//
// If we're not in production then **ALSO** log to the `console`
// with the colorized simple format.
//
if (process.env.NODE_ENV !== 'production') {
    winston_logger.add(new transports.Console({
        format: format.combine(
            format.colorize({ all: true }),
            format.simple()
        ),
        level: 'debug'
    }));
}


//Loggly logger
const logglyStream = new Bunyan2Loggly(
    logglyConfig.credentials,
    logglyConfig.bufferLength,
    logglyConfig.bufferTimeout
);

const log = new Logger({
    name: "ic_backend",
    streams: [
        {
            stream: formatOut,
            level: log_level
        },
        {
            stream: logglyStream,
            type: "raw",
            json: true,
            level: log_level
        }
    ],
    serializers: {
        req: Logger.stdSerializers.req,
        res: Logger.stdSerializers.res,
        err: Logger.stdSerializers.err
    }
});

module.exports = {
    logger: log,
    winston: winston_logger
};
