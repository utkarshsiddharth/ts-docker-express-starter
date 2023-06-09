// import { PostRouter, UserRouter } from '@/routes'
import PostRouter from '@/routes/PostRouter'
import UserRouter from '@/routes/UserRouter'
import express, { Request, Response, NextFunction, Express } from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { connectDB } from '@/config/connectDB'

// redis
import session from 'express-session'
import connectRedis from 'connect-redis'
const RedisStore = connectRedis(session)
import { redisStatic } from '@/middlewares/redis'
import { redisClient, rateLimiter } from '@/utilities'
// utilities
import logger from '@/utilities/logger'
import config from '@/config/config'
import { ErrorResponse } from '@/utilities/errorResponse'

// @todo use app from createServer instead
const app: Express = express()
if (process.env.NODE_ENV !== 'testing') {
    connectDB()
}
// trust the nginx proxy headers
app.enable('trust proxy')
app.use(cors())
app.use(express.json())
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}
/**
 * Redis Client Setup
 */
redisClient.on('error', (err) => {
    logger.info('redis connection error', err)
})
redisClient.on('connect', async () => {
    logger.info(`check redis status`)
    const redisSetValue = await redisClient.set('redis', 'redis-value')
    logger.info({ redisSetValue })
    const redisGetValue = await redisClient.get('redis')
    logger.info({ redisSetValue, redisGetValue })
})
app.use(rateLimiter(100, 60))
app.use(
    session({
        store: new RedisStore({ client: redisClient }),
        secret: config.SESSION_SECRET || 'sessionsecret',
        saveUninitialized: false,
        resave: false,
        cookie: {
            secure: false,
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24
        }
    })
)
app.use(function (req, res, next) {
    if (!req.session) {
        return ErrorResponse(res, 'oh no session lost!', 401)
    }
    next() // otherwise continue
})

// Redis Setup Ends

// Headers
app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    next()
})
app.get('/api/v1', (req, res) => {
    res.status(200).json({
        success: true
    })
})

app.get('/api/v1/health-check', async (req, res) => {
    res.status(200).json({
        success: true
    })
})

app.use('/api/v1/post', PostRouter)
app.use('/api/v1/user', UserRouter)

// app.use('/api/v1/user', UserRouter)
export default app
