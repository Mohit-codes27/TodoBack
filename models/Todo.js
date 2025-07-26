const mongoose = require("mongoose")

const TodoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["work", "personal", "shopping", "health", "education", "other"],
      default: "other",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    timeSpent: {
      type: Number, // in minutes
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

// Update completedAt when todo is marked as completed
TodoSchema.pre("save", function (next) {
  if (this.isModified("completed") && this.completed && !this.completedAt) {
    this.completedAt = new Date()
  }
  next()
})

module.exports = mongoose.model("Todo", TodoSchema)
