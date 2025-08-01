const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    registrationNumber: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    otp: {
        type: String,    
        default: null
    }
}, { timestamps: true });


module.exports = mongoose.model('Student', studentSchema);
