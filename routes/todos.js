const express = require("express")
const { body, validationResult } = require("express-validator")
const Todo = require("../models/Todo")
const auth = require("../middleware/auth")

const router = express.Router()

// Get all todos for authenticated user
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, category, priority, completed } = req.query

    const filter = { user: req.user._id }

    if (category) filter.category = category
    if (priority) filter.priority = priority
    if (completed !== undefined) filter.completed = completed === "true"

    const todos = await Todo.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Todo.countDocuments(filter)

    res.json({
      todos,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get recent todos (last 7 days)
router.get("/recent", auth, async (req, res) => {
  try {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const todos = await Todo.find({
      user: req.user._id,
      createdAt: { $gte: sevenDaysAgo },
    }).sort({ createdAt: -1 })

    res.json(todos)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Create new todo
router.post(
  "/",
  [
    auth,
    body("title").trim().isLength({ min: 1 }).withMessage("Title is required"),
    body("category")
      .isIn(["work", "personal", "shopping", "health", "education", "other"])
      .withMessage("Invalid category"),
    body("priority").isIn(["low", "medium", "high"]).withMessage("Invalid priority"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { title, description, category, priority, dueDate } = req.body

      const todo = new Todo({
        title,
        description,
        category,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        user: req.user._id,
      })

      await todo.save()
      res.status(201).json(todo)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: "Server error" })
    }
  },
)

// Update todo
router.put("/:id", auth, async (req, res) => {
  try {
    const { title, description, category, priority, completed, dueDate, timeSpent } = req.body

    const todo = await Todo.findOne({ _id: req.params.id, user: req.user._id })

    if (!todo) {
      return res.status(404).json({ message: "Todo not found" })
    }

    // Update fields
    if (title !== undefined) todo.title = title
    if (description !== undefined) todo.description = description
    if (category !== undefined) todo.category = category
    if (priority !== undefined) todo.priority = priority
    if (completed !== undefined) todo.completed = completed
    if (dueDate !== undefined) todo.dueDate = dueDate ? new Date(dueDate) : null
    if (timeSpent !== undefined) todo.timeSpent = timeSpent

    await todo.save()
    res.json(todo)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Delete todo
router.delete("/:id", auth, async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({ _id: req.params.id, user: req.user._id })

    if (!todo) {
      return res.status(404).json({ message: "Todo not found" })
    }

    res.json({ message: "Todo deleted successfully" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
