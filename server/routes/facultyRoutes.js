const express = require("express");
const router = express.Router();
const upload = require("../utils/multer");
const verifyToken = require("../middleware/auth");

const {
  facultyLogin,
  getAllSubjects,
  updateProfile,
  updatePassword,
  fetchStudents,
  markAttendance,
  forgotPassword,
  postOTP,
  uploadMarks,
} = require("../controllers/facultyController");

// Public routes (no auth required)
router.post("/login", facultyLogin);
router.post("/forgotPassword", forgotPassword);
router.post("/postOTP", postOTP);

// Protected routes (auth required)
router.put(
  "/updateProfile",
  verifyToken,
  upload.single("avatar"),
  updateProfile
);

router.post(
  "/updatePassword",
  verifyToken,
  updatePassword
);

// Utility routes
router.get(
  "/fetch-all-subjects",
  verifyToken,
  getAllSubjects
);

router.post(
  "/markAttendance",
  verifyToken,
  markAttendance
);

router.post(
  "/uploadMarks",
  verifyToken,
  uploadMarks
);

module.exports = router;