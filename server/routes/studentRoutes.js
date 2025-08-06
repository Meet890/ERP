const express = require("express");
//const router = express.Router();
const router = require("express").Router();
const passport = require("passport");
const upload = require("../utils/multer");
const studentAuth = require("../middleware/studentAuth");

const {
  registerStudent,
  studentLogin,
  getAllStudents,
  getAllMarks,
  getAllSubjects,
  checkAttendance,
  getStudentByName,
  getStudentByRegNum,
  updatePassword,
  forgotPassword,
  postOTP,
  postPrivateChat,
  getPrivateChat,
  differentChats,
  previousChats,
  updateProfile,
} = require("../controllers/studentController");

//Auth and Profile Related
router.post("/register", registerStudent);
router.post("/login", studentLogin);
router.post("/forgotPassword", forgotPassword);
router.post("/postOTP", postOTP);
router.put(
    "/updateProfile",
    studentAuth,
    upload.single("avatar"),
    updateProfile
);
router.post("/updatePassword", studentAuth, updatePassword);
router.get("/chat/:roomId", studentAuth, getPrivateChat);
router.post("/chat/:roomId", studentAuth, postPrivateChat);
router.get("/chat/newerChats/:receiverName", studentAuth, differentChats);
router.get("/chat/previousChats/:senderName", studentAuth, previousChats);
router.get("/getMarks", studentAuth, getAllMarks);
router.get("/getAllSubjects", studentAuth, getAllSubjects);
router.get("/checkAttendance", studentAuth, checkAttendance);
router.post("/getAllStudents", studentAuth, getAllStudents);
router.post("/getStudentByRegNum", studentAuth, getStudentByRegNum);
router.post("/getStudentByName", studentAuth, getStudentByName);

module.exports = router;
