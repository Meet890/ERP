const jwt = require('jsonwebtoken');
const Faculty = require('../models/Faculty');
const keys = require('../config/key');

module.exports = async function (req, res, next) {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "Invalid token format"
            });
        }

        // Extract token
        const token = authHeader.split(' ')[1];
        
        // Verify token
        const decoded = jwt.verify(token, keys.secretOrKey);
        
        // Find faculty and attach to request
        const faculty = await Faculty.findById(decoded.id);
        if (!faculty) {
            return res.status(401).json({
                success: false,
                message: "Faculty not found"
            });
        }

        // Set faculty in request object
        req.faculty = faculty;
        next();

    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            message: "Faculty not authenticated",
            error: error.message
        });
    }
};