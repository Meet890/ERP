const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//utils
const keys = require("../config/key");
const sendEmail = require("../utils/nodemailer");

//Models
//const Student = require("../models/Student");
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
const validateOTP = require("../validation/otpValidation");
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


//forgot password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { errors, isValid } = validateForgotPassword(req.body);
    if (!isValid) {
      return res.status(400).json(errors);
    }

    const { email } = req.body;
    const student = await Student.findOne({ email });

    if (!student) {
      errors.email = "Email not found";
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

    const otp = generateOTP();
    student.otp = otp;
    await student.save();
    await sendEmail(student.email, otp, "OTP");
    res.status(200).json({ message: "Check your registered email for OTP" });

    const helper = async () => {
      student.otp = "";
      await student.save();
    };

    setTimeout(function () {
      helper();
    }, 5 * 60 * 1000); // OTP expires after 5 minutes

  } catch (err) {
    console.log("Error in sending email", err.message);
  }
};





exports.postOTP = async (req, res, next) => {
  try {
    const { errors, isValid } = validateOTP(req.body);
    console.log("Validation result:", { isValid, errors });

    if (!isValid) {
      return res.status(400).json(errors);
    }

    const { email, otp, newPassword, confirmNewPassword } = req.body;
    console.log("POST OTP BODY:", req.body);

    if (newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = "Password Mismatch";
      return res.status(400).json(errors);
    }

    const student = await Student.findOne({ email });
    console.log("Student found:", student);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    console.log("Student.otp from DB:", student.otp);
    console.log("OTP received:", otp);

    if (student.otp !== otp) {
      errors.otp = "Invalid OTP, check your email again";
      return res.status(400).json(errors);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    student.password = hashedPassword;

    // Clear the OTP after successful password change (optional)
    student.otp = null;

    await student.save();

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.log("Error in submitting OTP", err.message);
    return res.status(400).json({ message: "Error in submitting OTP" });
  }
};







exports.sendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const student = await Student.findOneAndUpdate(
      { email },
      { otp: otp },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Send mail
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Your OTP for password reset",
      text: `Your OTP is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    return res.status(500).json({ message: "Server error sending OTP" });
  }
};

exports.postPrivateChat = async (req, res, next) => {
  try {
    console.log("Request Body:", req.body);

    const {
      senderName,
      senderId,
      roomId,
      receiverRegistrationNumber,
      senderRegistrationNumber,
      message,
    } = req.body;

    if (!receiverRegistrationNumber) {
      return res.status(400).json({ error: "receiverRegistrationNumber is missing" });
    }

    const trimmedRegNo = receiverRegistrationNumber.trim();
    console.log("Looking for student with registrationNumber:", trimmedRegNo);

    const receiverStudent = await Student.findOne({
      registrationNumber: trimmedRegNo,
    });

    console.log("receiverStudent is", receiverStudent);

    if (!receiverStudent) {
      return res.status(404).json({ error: "Receiver student not found" });
    }

    const newMessage = new Message({
      senderName,
      senderId,
      roomId,
      message,
      senderRegistrationNumber,
      receiverRegistrationNumber: trimmedRegNo,
      receiverName: receiverStudent.name,
      receiverId: receiverStudent._id,
      createdAt: new Date(),
    });

    await newMessage.save();

    res.status(200).json({ success: true, message: "Message sent successfully" });

  } catch (err) {
    console.error("Error in sending private chat:", err); // log full error
    res.status(500).json({ error: "Internal Server Error", details: err.message });
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

    console.log("req.user ===>", req.user);
    console.log("Trying to find:", { department, year });

    const subjects = await Subject.find({ department, year: Number(year) });

    if (subjects.length === 0) {
      console.log("No subjects found in DB");
      return res.status(404).json({ message: "No subjects found" });
    }

    res.status(200).json({ result: subjects });
  } catch (err) {
    console.log("Error in fetching subjects:", err.message);
    return res.status(400).json({ "Error in fetching subjects": err.message });
  }
};



exports.getAllMarks = async (req, res, next) => {
  try {
    const { department, id: studentId } = req.user;

    const marks = await Mark.find({ department, student: studentId })
      .populate("subject", "subjectName subjectCode") // Optional: only populate required fields
      .lean(); // improves performance if you don't need Mongoose methods later

    const grouped = {
      UnitTest1: [],
      UnitTest2: [],
      Semester: [],
    };

    for (const mark of marks) {
      if (grouped[mark.exam]) {
        grouped[mark.exam].push(mark);
      }
    }

    res.status(200).json({ result: grouped });
  } catch (err) {
    console.error("Error in getAllMarks:", err);
    res.status(500).json({ message: "Internal server error" });
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





exports.updateProfile = async (req, res, next) => {
  try {
    const {
      email,
      studentMobileNumber,
      fatherName,
      fatherMobileNumber,
      registrationNumber,
    } = req.body;

    // Step 1: Check if registrationNumber is provided
    if (!registrationNumber) {
      return res.status(400).json({
        success: false,
        message: "Registration number is required",
      });
    }

    console.log("🔍 Searching for student with registrationNumber:", registrationNumber);

    // Step 2: Find student by registrationNumber
    const student = await Student.findOne({ registrationNumber });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const { _id } = student;

    // Step 3: Prepare updated data
    const updatedData = {
      email,
      studentMobileNumber,
      fatherName,
      fatherMobileNumber,
    };

    console.log("✏️ Updating student with:", updatedData);

    // Step 4: Perform update
    await Student.findByIdAndUpdate(
      _id,
      { $set: updatedData },
      {
        new: true,
        runValidators: true,
        useFindAndModify: false,
      }
    );

    // Step 5: Fetch latest data from DB to verify update
    const freshStudent = await Student.findById(_id);

    console.log("✅ Fetched after update:", freshStudent);

    // Step 6: Send updated data to frontend
    return res.status(200).json({
      success: true,
      updatedStudent: freshStudent,
    });

  } catch (err) {
    console.error("❌ Error in updating profile:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};







//https://www.base64-image.de/  this website is used to convert image to base64