const Validator = require("validator");
const isEmpty = require("./is-empty");

const validateFacultyUploadMarks = (data) => {
  let errors = {};
  
  // Convert numbers to strings for validation
  data.subjectCode = !isEmpty(data.subjectCode) ? data.subjectCode : "";
  data.exam = !isEmpty(data.exam) ? data.exam : "";
  data.totalMarks = !isEmpty(data.totalMarks) ? String(data.totalMarks) : "";
  
  if (Validator.isEmpty(data.subjectCode)) {
    errors.subjectCode = "Subject Code field is required";
  }

  if (Validator.isEmpty(data.exam)) {
    errors.exam = "Exam field is required";
  }

  if (Validator.isEmpty(data.totalMarks)) {
    errors.totalMarks = "Total marks field is required";
  }

  // Validate marks array
  if (!data.marks || !Array.isArray(data.marks)) {
    errors.marks = "Marks must be an array";
  } else {
    data.marks.forEach((mark, index) => {
      if (!mark.studentId) {
        errors[`marks.${index}.studentId`] = "Student ID is required";
      }
      if (typeof mark.marksObtained !== 'number') {
        errors[`marks.${index}.marksObtained`] = "Marks obtained must be a number";
      }
    });
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
};

module.exports = validateFacultyUploadMarks;