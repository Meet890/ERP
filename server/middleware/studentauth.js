const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const keys = require('../config/key');

module.exports = async function (req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        // Debug log
        console.log('Auth Header:', authHeader);

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "Invalid token format"
            });
        }

        // Extract and verify token
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, keys.secretOrKey);
        
        // Find student instead of faculty
        const student = await Student.findById(decoded.id);
        if (!student) {
            return res.status(401).json({
                success: false,
                message: "Student not found"
            });
        }

        // Attach student to request object
        req.student = student;
        next();
        
    } catch (error) {
        console.error('Student auth error:', error);
        return res.status(401).json({
            success: false,
            message: "Authentication failed",
            error: error.message
        });
    }
};