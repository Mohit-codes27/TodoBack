const express = require("express")
const Todo = require("../models/Todo")
const auth = require("../middleware/auth")

const router = express.Router()

// Get analytics data
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user._id

    // Total todos
    const totalTodos = await Todo.countDocuments({ user: userId })

    // Completed todos
    const completedTodos = await Todo.countDocuments({ user: userId, completed: true })

    // Pending todos
    const pendingTodos = totalTodos - completedTodos

    // Completion rate
    const completionRate = totalTodos > 0 ? ((completedTodos / totalTodos) * 100).toFixed(1) : 0

    // Category distribution
    const categoryStats = await Todo.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    // Priority distribution
    const priorityStats = await Todo.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    // Weekly completion trend (last 7 days)
    const weeklyTrend = await Todo.aggregate([
      {
        $match: {
          user: userId,
          completed: true,
          completedAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$completedAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])

    // Most productive category
    const mostProductiveCategory = categoryStats.length > 0 ? categoryStats[0]._id : "none"

    // Average time spent per todo
    const avgTimeSpent = await Todo.aggregate([
      { $match: { user: userId, completed: true, timeSpent: { $gt: 0 } } },
      { $group: { _id: null, avgTime: { $avg: "$timeSpent" } } },
    ])

    const averageTimeSpent = avgTimeSpent.length > 0 ? Math.round(avgTimeSpent[0].avgTime) : 0

    res.json({
      totalTodos,
      completedTodos,
      pendingTodos,
      completionRate: Number.parseFloat(completionRate),
      categoryStats,
      priorityStats,
      weeklyTrend,
      mostProductiveCategory,
      averageTimeSpent,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get monthly analytics
router.get("/monthly", auth, async (req, res) => {
  try {
    const userId = req.user._id
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()

    // Get first and last day of current month
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)

    const monthlyStats = await Todo.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: firstDay, $lte: lastDay },
        },
      },
      {
        $group: {
          _id: null,
          totalCreated: { $sum: 1 },
          totalCompleted: {
            $sum: { $cond: [{ $eq: ["$completed", true] }, 1, 0] },
          },
          avgTimeSpent: { $avg: "$timeSpent" },
        },
      },
    ])

    const stats =
      monthlyStats.length > 0
        ? monthlyStats[0]
        : {
            totalCreated: 0,
            totalCompleted: 0,
            avgTimeSpent: 0,
          }

    res.json({
      month: currentDate.toLocaleString("default", { month: "long", year: "numeric" }),
      ...stats,
      avgTimeSpent: Math.round(stats.avgTimeSpent || 0),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router
