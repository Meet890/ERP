const jwt = require('jsonwebtoken');
const Student = require('../models/studentModel');  // Updated to match your model path
const keys = require('../config/key');

module.exports = async function (req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "Invalid token format"
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, keys.secretOrKey);
        
        const student = await Student.findById(decoded.id).select('-password');
        if (!student) {
            return res.status(401).json({
                success: false,
                message: "Student not found"
            });
        }

        req.student = student;
        next();
        
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            message: "Authentication failed",
            error: error.message
        });
    }
};