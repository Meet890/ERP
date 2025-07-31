const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


//utils
const keys = require("../config/key");
const sendEmail = require("../utils/nodemailer");

//Models
// const Student = require("../models/Student");
const Subject = require("../models/Subject");
const Attendance = require("../models/Attendance");
const Message = require("../models/Message");
const Mark = require("../models/Marks");
const Student = require("../models/studentModel");


//File Handler
const bufferConversion = require("../utils/bufferConversion");
const cloudinary = require("../utils/cloudinary");

//Validation
const validateStudentLoginInput = require("../validation/studentLogin");
const validateStudentUpdatePassword = require("../validation/studentUpdatePassword");
const validateForgotPassword = require("../validation/forgotPassword");
const validateOtp = require("../validation/otpValidation");
const { markAttendance } = require("./facultyController");


//Student registration
exports.registerStudent = async (req, res) => {
    const { registrationNumber, name, department, email, password } = req.body;

    try {
        const existingStudent = await Student.findOne({ registrationNumber });
        if (existingStudent) {
            return res.status(400).json({ message: "Student already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newStudent = new Student({
            registrationNumber,
            name,
            department,
            email,
            password: hashedPassword
        });

        await newStudent.save();

        res.status(201).json({ message: "Student registered successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



//Student login
exports.studentLogin = async (req, res, next) => {
  const { errors, isValid } = validateStudentLoginInput(req.body);
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const { registrationNumber, password } = req.body;

  const student = await Student.findOne({ registrationNumber });
  if (!student) {
    errors.registrationNumber = "Registration number not found";
    return res.status(404).json(errors);
  }

  const validPassword = await bcrypt.compare(password, student.password);
  if (!validPassword) {
    errors.password = "Wrong password";
    return res.status(404).json(errors);
  }

  const payload = { id: student.id, student };
  jwt.sign(payload, keys.secretOrKey, { expiresIn: "2d" }, (err, token) => {
    res.json({
      success: true,
      token: "Bearer " + token,
    });
  });
};


//check attendance
exports.checkAttendance = async (req, res, next) => {
  try {
    // console.log(req.user);
    const studentId = req.user._id;
    const attendance = await Attendance.find({ student: studentId }).populate(
      "subject"
    );
    if (!attendance) {
      res.status(400).json({ message: "Attendance not found" });
    }

    res.status(200).json({
      result: attendance.map((att) => {
        let res = {};
        res.attendance = (
          (att.lecturesAttended / att.totalLectures) *
          100
        ).toFixed(2);
        res.subjectCode = att.subject.subjectCode;
        res.subjectName = att.subject.subjectName;
        res.maxHours = att.subject.totalLectures;
        res.absentHours = att.totalLectures - att.lecturesAttended;
        res.totalLectures = att.totalLectures;
        return res;
      }),
    });
  } catch (err) {
    console.log("Error in getting attending details", err.message);
  }
};


//get all students
exports.getAllStudents = async (req, res, next) => {
  try {
    const { department, year, section } = req.body;
    const students = await Student.find({ department, year, section });
    if (students.length === 0) {
      return res.status(400).json({ message: "No student found" });
    }

    return res.status(200).json({ result: students });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};


//get the student by name
exports.getStudentByName = async (req, res, next) => {
  try {
    const { name } = req.body;
    const students = await Student.find({ name });
    if (students.length === 0) {
      return res.status(400).json({ message: "No student found" });
    }
    return res.status(200).json({ result: students });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};


//get the student by registration number
exports.getStudentByRegNum = async (req, res, next) => {
  try {
    const { registrationNumber } = req.body;
    console.log(req.body);
    const students = await Student.findOne({ registrationNumber });
    if (!students) {
      return res.status(400).json({ message: "No student found" });
    }

    return res.status(200).json({ result: students });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};


//update password
exports.updatePassword = async (req, res, next) => {
  try {
    const { errors, isValid } = validateStudentUpdatePassword(req.body);
    if (!isValid) {
      return res.status(400).json(errors);
    }

    const { registrationNumber, oldPassword, newPassword, confirmNewPassword } =
      req.body;
    if (newPassword !== confirmNewPassword) {
      errors.confirmNewpassword = "Password Mismatch";
      return res.status(400).json(errors);
    }

    const student = await Student.findOne({ registrationNumber });
    const validPassword = await bcrypt.compare(oldPassword, student.password);

    if (!validPassword) {
      errors.oldPassword = "Wrong Password. Try again";
      return res.status(404).json(errors);
    }

    let hashedPassword;
    hashedPassword = await bcrypt.hash(newPassword, 10);
    student.password = hashedPassword;
    await student.save();
    return res.status(200).json({ message: "Password updated succesfully" });
  } catch (err) {
    console.log("Error updating password", err.message);
  }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email, registrationNumber } = req.body;

        // Find student by email and registration number
        const student = await Student.findOne({ 
            email,
            registrationNumber 
        });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found with these credentials"
            });
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save OTP to student document
        student.otp = otp;
        student.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
        await student.save();

        // Send email with OTP
        const emailData = {
            to: email,
            subject: "Password Reset OTP",
            text: `Your OTP for password reset is: ${otp}. This OTP will expire in 5 minutes.`
        };

        await sendEmail(emailData);

        console.log("OTP generated:", otp); // For testing purposes

        return res.status(200).json({
            success: true,
            message: "OTP sent to your email"
        });

    } catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).json({
            success: false,
            message: "Error in sending OTP",
            error: error.message
        });
    }
};




exports.postOTP = async (req, res) => {
    try {
        const { email, otp, newPassword, confirmNewPassword } = req.body;

        // Find student
        const student = await Student.findOne({ 
            email,
            otp,
            otpExpires: { $gt: Date.now() } // Check if OTP hasn't expired
        });

        if (!student) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            });
        }

        // Validate passwords
        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and clear OTP
        student.password = hashedPassword;
        student.otp = undefined;
        student.otpExpires = undefined;
        await student.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successful"
        });

    } catch (error) {
        console.error("OTP verification error:", error);
        return res.status(500).json({
            success: false,
            message: "Error in OTP verification",
            error: error.message
        });
    }
};




exports.postPrivateChat = async (req, res, next) => {
  try {
    const {
      senderName,
      senderId,
      roomId,
      receiverRegistrationNumber,
      senderRegistrationNumber,
      message,
    } = req.body;

    const receiverStudent = await Student.findOne({
      registrationNumber: receiverRegistrationNumber,
    });

    //console.log(receiverStudent);

    const newMessage = await new Message({
      senderName,
      senderId,
      roomId,
      message,
      senderRegistrationNumber,
      receiverRegistrationNumber,
      receiverName: receiverStudent.name,
      receiverId: receiverStudent._id,
      createdAt: new Date(),
    });

    await newMessage.save();
    res.status(200).json("Message sent successfully");
  } catch (err) {
    console.log("Error is sending private chat", err.message);
  }
};

exports.getPrivateChat = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const swap = (input, a, b) => {
      let temp = input[a];
      input[a] = input[b];
      input[b] = temp;
    };

    const allMessage = await Message.find({ roomId });
    let tempArr = roomId.split(".");
    swap(tempArr, 0, 1);
    let secondRoomId = tempArr[0] + "." + tempArr[1];
    const allMessage2 = await Message.find({ roomId: secondRoomId });

    var conversation = allMessage.concat(allMessage2);
    conversation.sort();
    res.status(200).json({ result: conversation });
  } catch (err) {
    console.log("Error in get private chat server side", err.message);
  }
};

exports.getAllSubjects = async (req, res, next) => {
  try {
    const { department, year } = req.user;
    const subjects = await Subject.find({ department, year });

    if (subjects.length === 0) {
      return res.status(404).json({ message: "No subjects found" });
    }
    res.status(200).json({ result: subjects });
  } catch (err) {
    return res.status(400).json({ "Error in fetching subjects": err.message });
  }
};

exports.getAllMarks = async (req, res, next) => {
  try {
    const { department, year, id } = req.user;
    const getMarks = await Mark.find({ department, student: id }).populate(
      "subject"
    );

    const UnitTest1 = getMarks.filter((obj) => {
      return obj.exam === "Unit Test 1";
    });

    const UnitTest2 = getMarks.filter((obj) => {
      return obj.exam === "Unit Test 2";
    });

    const Semester = getMarks.filter((obj) => {
      return obj.exam === "Semester";
    });

    res.status(200).json({
      result: {
        UnitTest1,
        UnitTest2,
        Semester,
      },
    });
  } catch (err) {
    return res.status(400).json({ "Error in getting marks": err.message });
  }
};

exports.differentChats = async (req, res, next) => {
  try {
    const { receiverName } = req.params;
    const newChatsTemp = await Message.find({ senderName: receiverName });

    var filteredObjTemp = newChatsTemp.map((obj) => {
      let filteredObj = {
        senderName: obj.senderName,
        receiverName: obj.receiverName,
        senderRegistrationNumber: obj.senderRegistrationNumber,
        receiverRegistrationNumber: obj.receiverRegistrationNumber,
        receiverId: obj.receiverId,
      };

      return filteredObj;
    });

    let filteredListTemp = [
      ...new Set(filteredObjTemp.map(JSON.stringify)),
    ].map(JSON.parse);
    const newChats = await Message.find({ receiverName });

    var filteredObj = newChats.map((obj) => {
      let filteredObj = {
        senderName: obj.senderName,
        receiverName: obj.receiverName,
        senderRegistrationNumber: obj.senderRegistrationNumber,
        receiverRegistrationNumber: obj.receiverRegistrationNumber,
        receiverId: obj.receiverId,
      };
      return filteredObj;
    });

    let filteredListPro = [...new Set(filteredObj.map(JSON.stringify))].map(
      JSON.parse
    );
    for (var i = 0; i < filteredListPro.length; i++) {
      for (var j = 0; j < filteredListTemp.length; j++) {
        if (
          filteredListPro[i].senderName === filteredListTemp[j].receiverName
        ) {
          filteredListPro.splice(i, 1);
        }
      }
    }
    res.status(200).json({ result: filteredListPro });
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.previousChats = async (req, res, next) => {
  try {
    const { senderName } = req.params;
    const newChats = await Message.find({ senderName });

    var filteredObj = newChats.map((obj) => {
      let filteredObj = {
        senderName: obj.senderName,
        receiverName: obj.receiverName,
        senderRegistrationNumber: obj.senderRegistrationNumber,
        receiverRegistrationNumber: obj.receiverRegistrationNumber,
        receiverId: obj.receiverId,
      };
      return filteredObj;
    });
    var filteredList = [...new Set(filteredObj.map(JSON.stringify))].map(
      JSON.parse
    );
    //console.log("filterdList",filteredList)
    res.status(200).json({ result: filteredList });
  } catch (err) {
    res.status(500).json(err);
  }
};


exports.updateProfile = async (req, res) => {
    try {
        // Check if student exists in request
        if (!req.student) {
            return res.status(401).json({
                success: false,
                message: "Student not authenticated"
            });
        }

        const { email, studentMobileNumber, fatherMobileNumber } = req.body;
        const updateFields = {};

        // Only update fields that are provided
        if (email) updateFields.email = email;
        if (studentMobileNumber) updateFields.studentMobileNumber = studentMobileNumber;
        if (fatherMobileNumber) updateFields.fatherMobileNumber = fatherMobileNumber;

        // Handle avatar upload if provided
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
            updateFields.avatar = {
                public_id: result.public_id,
                url: result.secure_url
            };
        }

        const updatedStudent = await Student.findByIdAndUpdate(
            req.student._id,
            { $set: updateFields },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            student: updatedStudent
        });

    } catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};





