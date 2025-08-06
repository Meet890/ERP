const mongoose = require("mongoose");
const { Schema } = mongoose;

const markSchema = new Schema({
  student: {
    type: Schema.Types.ObjectId,
    ref: "student",
    required: true
  },
  subject: {
    type: Schema.Types.ObjectId,
    ref: "subject",
    required: true
  },
  exam: {
    type: String,
    required: true,
    enum: ["Internal-1", "Internal-2", "Mid Term", "End Term"]
  },
  department: {
    type: String,
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  section: {
    type: String,
    required: true
  },
  marksObtained: {  // renamed from marks for clarity
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v) {
        return v <= this.totalMarks;
      },
      message: "Marks obtained cannot be greater than total marks"
    }
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 0
  },
  faculty: {  // Added to track who uploaded the marks
    type: Schema.Types.ObjectId,
    ref: "faculty",
    required: true
  }
}, {
  timestamps: true  // Adds createdAt and updatedAt fields
});

// Add index for faster queries
markSchema.index({ student: 1, subject: 1, exam: 1 }, { unique: true });

module.exports = mongoose.model("mark", markSchema);