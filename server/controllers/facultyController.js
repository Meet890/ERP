const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//Utils
const sendEmail = require("../utils/nodemailer");
const bufferConversion = require("../utils/bufferConversion");
const cloudinary = require("../utils/cloudinary");

const keys = require("../config/key");

//Validation
const validateFacultyLoginInput = require("../validation/facultyLogin");
const validateFetchStudentsInput = require("../validation/facultyFetchStudent");
const validateFacultyUpdatePassword = require("../validation/facultyUpdatePassword");
const validateForgotPassword = require("../validation/forgotPassword");
const validateOTP = require("../validation/otpValidation");
const validateFacultyUploadMarks = require("../validation/facultyUploadMarks");

//Models
const Student = require("../models/Student");``
const Subject = require("../models/Subject");
const Faculty = require("../models/Faculty");
const Attendance = require("../models/Attendance");
const Mark = require("../models/Marks");

exports.facultyLogin = async (req, res, next) => {
  try {
    const { errors, isValid } = validateFacultyLoginInput(req.body);
    //console.log(req.body);
    if (!isValid) {
      return res.status(400).json(errors);
    }

    const { registrationNumber, password } = req.body;
    const faculty = await Faculty.findOne({ registrationNumber });
    if (!faculty) {
      errors.registrationNumber = "Registration number not found";
      return res.status(404).json(errors);
    }

    const validPassword = await bcrypt.compare(password, faculty.password);
    if (!validPassword) {
      errors.password = "Invalid Password";
      return res.status(404).json(errors);
    }

    const payload = {
      id: faculty.id,
      faculty,
    };

    jwt.sign(payload, keys.secretOrKey, { expiresIn: "2d" }, (err, token) => {
      res.json({
        success: true,
        token: "Bearer " + token,
      });
    });
  } catch (err) {
    console.log("Error in faculty login", err.message);
  }
};

exports.fetchStudents = async (req, res, next) => {
  try {
    const { errors, isValid } = validateFetchStudentsInput(req.body);
    if (!isValid) {
      return res.status(400).json(errors);
    }

    const { department, year, section } = req.body;
    const subjectList = await Subject.find({ department, year });

    if (subjectList.length === 0) {
      errors.department = "No subjects found in given department";
      return res.status(404).json(errors);
    }

    const students = await Student.find({
      department,
      year,
      section,
    });

    if (students.length === 0) {
      errors.department = "No Student found";
      return res.status(404).json(errors);
    }

    res.status(200).json({
      result: students.map((student) => {
        var student = {
          _id: student._id,
          registrationNumber: student.registrationNumber,
          name: student.name,
          email: student.email,
        };

        return student;
      }),
      subjectCode: subjectList.map((sub) => {
        return sub.subjectCode;
      }),
    });
  } catch (err) {
    console.log("Error in fetchStudents", err.message);
  }
};

exports.markAttendance = async (req, res) => {
    try {
        const { selectedStudents, subjectCode, department, year, section } = req.body;

        // Validate input
        if (!selectedStudents || !subjectCode || !department || !year || !section) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        // Find subject
        const subject = await Subject.findOne({ subjectCode });
        if (!subject) {
            return res.status(404).json({
                success: false,
                message: "Subject not found"
            });
        }

        // Find students with exact department match
        const students = await Student.find({
            _id: { $in: selectedStudents },
            department: department.trim()
        });

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No students found with given criteria"
            });
        }

        // Create attendance records
        const attendanceRecords = students.map(student => ({
            student: student._id,
            subject: subject._id,
            faculty: req.faculty._id,
            date: new Date(),
            status: 'present'
        }));

        // Save attendance records
        await Attendance.insertMany(attendanceRecords);

        return res.status(200).json({
            success: true,
            message: "Attendance marked successfully",
            markedStudents: students.length
        });

    } catch (error) {
        console.error("Error in marking attendance:", error);
        return res.status(500).json({
            success: false,
            message: "Error in marking attendance",
            error: error.message
        });
    }
};

exports.uploadMarks = async (req, res) => {
    try {
        // Check if faculty exists in request
        if (!req.faculty || !req.faculty._id) {
            return res.status(401).json({
                success: false,
                message: "Faculty not authenticated"
            });
        }

        const { subjectCode, exam, totalMarks, marks, section } = req.body;

        // Validate required fields
        if (!subjectCode || !exam || !totalMarks || !marks || !section) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Find subject and verify faculty authorization
        const subject = await Subject.findOne({ subjectCode });
        if (!subject) {
            return res.status(404).json({
                success: false,
                message: "Subject not found"
            });
        }

        // Process each mark entry
        const markPromises = marks.map(async (mark) => {
            const student = await Student.findById(mark.studentId);
            if (!student) {
                throw new Error(`Student with ID ${mark.studentId} not found`);
            }

            return {
                student: student._id,
                subject: subject._id,
                exam,
                department: student.department,
                semester: student.semester || 1,
                section,
                marksObtained: Number(mark.marksObtained),
                totalMarks: Number(totalMarks),
                faculty: req.faculty._id  // Now guaranteed to exist
            };
        });

        const markRecords = await Promise.all(markPromises);
        await Mark.insertMany(markRecords);

        return res.status(200).json({
            success: true,
            message: "Marks uploaded successfully",
            count: markRecords.length
        });

    } catch (error) {
        console.error("Error uploading marks:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getAllSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find({});
        
        if (!subjects) {
            return res.status(404).json({
                success: false,
                message: "No subjects found"
            });
        }

        res.status(200).json({
            success: true,
            subjects
        });
    } catch (error) {
        console.error("Error fetching subjects:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching subjects",
            error: error.message
        });
    }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const { errors, isValid } = validateFacultyUpdatePassword(req.body);
    if (!isValid) {
      return res.status(400).json(errors);
    }
    const { registrationNumber, oldPassword, newPassword, confirmNewPassword } =
      req.body;
    if (newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = "Password Mismatch";
      return res.status(404).json(errors);
    }
    const faculty = await Faculty.findOne({ registrationNumber });
    const isCorrect = await bcrypt.compare(oldPassword, faculty.password);
    if (!isCorrect) {
      errors.oldPassword = "Invalid old Password";
      return res.status(404).json(errors);
    }
    let hashedPassword;
    hashedPassword = await bcrypt.hash(newPassword, 10);
    //let hashedPassword;
    //hashedPassword = await bcrypt.hash(newPassword, 10);
    //faculty.password = hashedPassword;
    //await faculty.save();

    faculty.password = hashedPassword;
    await faculty.save();
    res.status(200).json({ message: "Password Updated" });
  } catch (err) {
    console.log("Error in updating password", err.message);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { errors, isValid } = validateForgotPassword(req.body);
    if (!isValid) {
      return res.status(400).json(errors);
    }
    const { email } = req.body;
    const faculty = await Faculty.findOne({ email });
    if (!faculty) {
      errors.email = "Email Not found, Provide registered email";
      return res.status(400).json(errors);
    }
    function generateOTP() {
      var digits = "0123456789";
      let OTP = "";
      for (let i = 0; i < 6; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
      }
      return OTP;
    }
    const OTP = generateOTP();
    faculty.otp = OTP;
    await faculty.save();
    await sendEmail(faculty.email, OTP, "OTP");
    res.status(200).json({ message: "Check your registered Email for OTP" });
    const helper = async () => {
      faculty.otp = "";
      await faculty.save();
    };
    setTimeout(function () {
      helper();
    }, 300000);
  } catch (err) {
    console.log("Error in sending OTP email", err.message);
  }
};

exports.postOTP = async (req, res, next) => {
  try {
    const { errors, isValid } = validateOTP(req.body);
    if (!isValid) {
      return res.status(400).json(errors);
    }

    const { email, otp, newPassword, confirmNewPassword } = req.body;
    if (newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = "Password Mismatch";
      return res.status(400).json(errors);
    }

    const faculty = await Faculty.findOne({ email });
    if (!faculty) {
      errors.email = "Email not found";
      return res.status(404).json(errors);
    }
if (String(faculty.otp) !== String(otp)) {
    errors.otp = "Invalid OTP..Please try again";
    return res.status(400).json(errors);
}

    let hashedPassword = await bcrypt.hash(newPassword, 10);
    faculty.password = hashedPassword;
    await faculty.save();

    return res.status(200).json({ message: "Password Changed" });
  } catch (err) {
    console.log("Error in submitting OTP", err.message);
    return res.status(400).json(err);
  }
};



exports.updateProfile = async (req, res) => {
    try {
        const { email, facultyMobileNumber, registrationNumber } = req.body;
        
        // Check if faculty exists in request
        if (!req.faculty || !req.faculty._id) {
            return res.status(401).json({
                success: false,
                message: "Faculty not authenticated"
            });
        }

        // Validate input
        if (!email && !facultyMobileNumber && !registrationNumber) {
            return res.status(400).json({
                success: false,
                message: "Please provide at least one field to update"
            });
        }

        // Find and update faculty
        const updatedFaculty = await Faculty.findByIdAndUpdate(
            req.faculty._id,
            { 
                $set: {
                    email: email || req.faculty.email,
                    facultyMobileNumber: facultyMobileNumber || req.faculty.facultyMobileNumber,
                    registrationNumber: registrationNumber || req.faculty.registrationNumber
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedFaculty) {
            return res.status(404).json({
                success: false,
                message: "Faculty not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            faculty: updatedFaculty
        });

    } catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating profile",
            error: error.message
        });
    }
};