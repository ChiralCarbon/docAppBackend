const swaggerJsDoc = require('swagger-jsdoc')
const baseUrl = require('config').get('hostname')
const http_status = require('http-status')

const components = {
    securitySchemes: {
        BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
        }
    }
}

exports.init = app => {
    /**
     * Only show the docs for localhost and dev env
     */
    if (process.env.NODE_ENV !== 'develop' && process.env.NODE_ENV !== 'localhost') {
        return
    }

    const swaggerDefinition = {
        info: {
            //API Information
            title: 'Fandome',
            version: '0.5.0',
            description: 'This is the documentation for the Fandome application apis.',
            version: '1.0.0',
        },
        host: `${baseUrl}`,
        basePath: '/api/v1',
    }

    const options = {
        swaggerDefinition,
        apis: [
            './src/docs/authentication.yaml',
            './src/docs/user.yaml'
        ],
    }

    const swaggerSpec = swaggerJsDoc(options)
    app.get('/api-docs.json', (req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
        res.status(http_status.OK).json(swaggerSpec)
    })
}
