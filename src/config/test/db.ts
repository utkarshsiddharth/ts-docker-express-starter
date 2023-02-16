/* eslint-disable no-loops/no-loops */
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
const mongod = MongoMemoryServer.create()
export const connect = async () => {
    const uri = await (await mongod).getUri()
    console.log(process.env.NODE_ENV, 'ENV')
    await mongoose.connect(uri)
}
export const closeDatabase = async () => {
    await mongoose.connection.dropDatabase()
    await mongoose.connection.close()
    await (await mongod).stop()
}
export const clearDatabase = async () => {
    const collections = mongoose.connection.collections
    for (const key in collections) {
        const collection = collections[key]
        await collection.deleteMany({})
    }
}
