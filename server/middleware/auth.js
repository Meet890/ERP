const jwt = require('jsonwebtoken');
const Faculty = require('../models/Faculty');
const keys = require('../config/key');

module.exports = async function (req, res, next) {
    try {
        // Log headers for debugging
        console.log('Headers:', req.headers);
        
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authorization header missing"
            });
        }

        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.substring(7) 
            : authHeader;

        // Verify token using the correct secret key
        const decoded = jwt.verify(token, keys.secretOrKey);
        console.log('Decoded token:', decoded);

        // Find faculty using the ID from token
        const faculty = await Faculty.findById(decoded.id);
        if (!faculty) {
            return res.status(401).json({
                success: false,
                message: "Faculty not found"
            });
        }

        // Attach faculty to request object
        req.faculty = faculty;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({
            success: false,
            message: "Invalid token",
            error: error.message
        });
    }
};