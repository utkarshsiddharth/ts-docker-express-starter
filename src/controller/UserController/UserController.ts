import UserModel from '@/models/User'
import asyncHandler from 'express-async-handler'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { Request, Response } from 'express'
import { ErrorResponse } from '@/utilities/errorResponse'
import { JWTPayload } from '@/types'

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const users = await UserModel.find({}).select('-password')
    res.status(200).json({
        success: true,
        data: users
    })
})

export const getUser = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id
    const user = await UserModel.findById(id).select('-password')
    if (!user) {
        res.status(404).json({
            type: 'error',
            message: `User with id ${id} not found!`
        })
        return
    }
    res.status(200).json({
        success: true,
        data: user
    })
})

export const createUser = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body
    const password = await hashPassword(data.password)
    data.password = password
    const user = await UserModel.create(data)
    // generate jwt
    const token = await generateJWT({ id: user.id })
    req.session.user = user
    res.status(200).json({
        success: true,
        data: user,
        token: token
    })
})

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id
    const newUserData = req.body
    if (newUserData?.password) {
        res.status(400).json({
            type: 'error',
            message: `Password cannot be changed`
        })
    }
    const newUser = await UserModel.findByIdAndUpdate(id, newUserData, {
        runValidators: true,
        new: true
    })
    res.status(200).json({
        success: true,
        data: newUser
    })
})

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id
    await UserModel.findByIdAndRemove(id)
    res.status(200).json({
        success: true,
        message: `User with id ${id} deleted successfully`
    })
})

export const login = async (req: Request, res: Response) => {
    const session = req.session
    const { email, password } = req.body
    if (!email || !password) {
        return ErrorResponse(
            res,
            'Invalid parameters, email and password are required',
            400
        )
    }
    const user = await UserModel.findOne({ email: email })
    if (!user) {
        return ErrorResponse(res, 'User not found', 404)
    }
    // compare password
    const match = await bcrypt.compare(password, user.password)
    if (!match) {
        return ErrorResponse(res, `Invalid password provided`, 400)
    } else {
        // generate jwt
        const token = await generateJWT({ id: user.id })
        session.user = user
        res.status(200).json({
            success: true,
            token: token
        })
    }
}

// Utils
export const hashPassword = async (password: string) => {
    const hashedPassword = await bcrypt.hash(password, 10)
    return hashedPassword
}

export const generateJWT = async (payload: { id: string }) => {
    const token = jwt.sign(payload, `${process.env.SECRET_KEY}`, {
        expiresIn: process.env.EXPIRES_IN || '1h'
    })
    return token
}

export const decodeJWT = async (token: string) => {
    try {
        const isMatch = jwt.verify(
            token,
            `${process.env.SECRET_KEY}`
        ) as JWTPayload
        const userId = isMatch.id
        const user = await UserModel.findById(userId)
        return user
    } catch (err) {
        throw new Error('Invalid JWT')
    }
}
