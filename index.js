const mongoose = require("mongoose");
const dbConnect = require("./database/dbConnect");
const express = require("express");
const app = express();
const cors = require("cors");
const Team = require("./models/Team.model");
const Task = require("./models/Task.model");
const Project = require("./models/Project.model");
const Tag = require("./models/Tag.model");
const User = require("./models/User.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const saltrounds = 12;

const corOptions = {
  origin: "*",
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corOptions));
app.use(express.json());

dbConnect();

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        error: "Invalid token",
      });
    }

    req.userId = decoded.userId;

    next();
  });
};

// Auth Fetch Calls

app.post("/v1/auth/signup", async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(400).json({
      error: "Email already in use",
    });
  }

  const hashedPassword = await bcrypt.hash(password, saltrounds);

  try {
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User created successfully",
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.post("/v1/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({
      error: "Invalid email or password",
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(400).json({
      error: "Invalid email or password",
    });
  }

  const token = jwt.sign(
    {
      userId: user._id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    },
  );

  res.status(200).json({
    token,
  });
});

app.get("/v1/auth/me", verifyJWT, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

// Teams Fetch Calls

app.get("/v1/teams", verifyJWT, (req, res) => {
  try {
    Team.find()
      .populate("owner")
      .populate("members")
      .then((teams) => res.status(200).json(teams))
      .catch((err) =>
        res.status(400).json({
          error: err.message,
        }),
      );
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.post("/v1/teams", verifyJWT, (req, res) => {
  const { name, description, owner, members } = req.body;

  if (!name || !owner) {
    return res.status(400).json({
      error: "Name and owner are required",
    });
  }

  try {
    const team = new Team({
      name,
      description,
      owner,
      members,
    });

    team
      .save()
      .then(() =>
        res.status(201).json({
          message: "Team created successfully",
        }),
      )
      .catch((err) =>
        res.status(400).json({
          error: err.message,
        }),
      );
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.get("/v1/teams/:id", verifyJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const team = await Team.findById(id)
      .populate("members")
      .populate("owner");

    if (!team) {
      return res.status(404).json({
        error: "Team not found",
      });
    }

    res.status(200).json(team);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.put("/v1/teams/:id", verifyJWT, async (req, res) => {
  try {
    const updatedTeam = await Team.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      },
    )
      .populate("owner")
      .populate("members");

    res.status(200).json(updatedTeam);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.delete(
  "/v1/teams/:teamId/members/:memberId",
  verifyJWT,
  async (req, res) => {
    try {
      const { teamId, memberId } = req.params;

      const updatedTeam = await Team.findByIdAndUpdate(
        teamId,
        {
          $pull: {
            members: memberId,
          },
        },
        {
          new: true,
        },
      )
        .populate("owner")
        .populate("members");

      res.status(200).json(updatedTeam);
    } catch (error) {
      res.status(400).json({
        error: error.message,
      });
    }
  },
);

// Tags Fetch Calls

app.get("/v1/tags", verifyJWT, (req, res) => {
  try {
    Tag.find()
      .then((tags) => res.status(200).json(tags))
      .catch((err) =>
        res.status(400).json({
          error: err.message,
        }),
      );
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.post("/v1/tags", verifyJWT, async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({
      error: "Name is required",
    });
  }

  try {
    const tag = new Tag({
      name,
    });

    await tag.save();

    res.status(201).json(tag);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

// Projects Fetch Calls

app.get("/v1/projects", verifyJWT, async (req, res) => {
  try {
    await Project.find()
      .then((projects) => res.status(200).json(projects))
      .catch((err) =>
        res.status(400).json({
          error: err.message,
        }),
      );
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.get("/v1/projects/:id", verifyJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        error: "Project not found",
      });
    }

    res.status(200).json(project);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.post("/v1/projects", verifyJWT, async (req, res) => {
  const { name, description } = req.body;

  try {
    const project = new Project({
      name,
      description,
    });

    await project.save();

    res.status(201).json({
      message: "Project created successfully",
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.delete("/v1/projects/:id", verifyJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        error: "Project not found",
      });
    }

    await Task.deleteMany({
      project: id,
    });

    await Project.findByIdAndDelete(id);

    res.status(200).json({
      message: "Project and related tasks deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// Tasks Fetch Calls

app.get("/v1/tasks", verifyJWT, async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate("project")
      .populate("team")
      .populate("owners")
      .populate("tags");

    res.status(200).json(tasks);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.get("/v1/tasks/:id", verifyJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const task = await Task.findById(id)
      .populate("project")
      .populate("team")
      .populate("owners")
      .populate("tags");

    if (!task) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    res.status(200).json(task);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.get(
  "/v1/tasks/project/:projectId",
  verifyJWT,
  async (req, res) => {
    const { projectId } = req.params;

    try {
      const tasks = await Task.find({
        project: projectId,
      });

      res.status(200).json({
        tasks,
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
      });
    }
  },
);

app.post("/v1/tasks", verifyJWT, async (req, res) => {
  const {
    taskName,
    projectName,
    team,
    owners,
    tags,
    timeToComplete,
    status,
    priority,
  } = req.body;

  if (!taskName || !projectName || !team || !owners) {
    return res.status(400).json({
      error: "Task name, project, team and owners are required",
    });
  }

  try {
    const task = new Task({
      name: taskName,
      project: projectName,
      team,
      owners,
      tags,
      timeToComplete,
      status,
      priority: priority || "Low",
    });

    await task.save();

    res.status(201).json({
      message: "Task created successfully",
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.put("/v1/tasks/:id", verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const updatedTask = await Task.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("project")
      .populate("team")
      .populate("owners");

    if (!updatedTask) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.delete("/v1/tasks/:id", verifyJWT, async (req, res) => {
  const { id } = req.params;

  try {
    const task = await Task.findByIdAndDelete(id);

    if (!task) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

// Reports Fetch Calls

app.get("/v1/report/last-week", verifyJWT, async (req, res) => {
  try {
    const lastWeek = new Date();

    lastWeek.setDate(lastWeek.getDate() - 7);

    const data = await Task.aggregate([
      {
        $match: {
          status: "Completed",
          updatedAt: {
            $gte: lastWeek,
          },
        },
      },
      {
        $group: {
          _id: {
            $dayOfWeek: "$updatedAt",
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

app.get("/v1/report/pending", verifyJWT, async (req, res) => {
  try {
    const tasks = await Task.find({
      status: {
        $ne: "Completed",
      },
    });

    const totalPendingTime = tasks.reduce(
      (acc, task) => acc + (task.timeToComplete || 0),
      0,
    );

    res.json({
      pendingTasks: tasks.length,
      totalPendingTime,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

app.get("/v1/report/closed-tasks", verifyJWT, async (req, res) => {
  try {
    const byTeam = await Task.aggregate([
      {
        $match: {
          status: "Completed",
        },
      },
      {
        $group: {
          _id: "$team",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $lookup: {
          from: "teams",
          localField: "_id",
          foreignField: "_id",
          as: "teamData",
        },
      },
      {
        $unwind: "$teamData",
      },
      {
        $project: {
          _id: 0,
          name: "$teamData.name",
          count: 1,
        },
      },
    ]);

    const byOwner = await Task.aggregate([
      {
        $match: {
          status: "Completed",
        },
      },
      {
        $unwind: "$owners",
      },
      {
        $group: {
          _id: "$owners",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "ownerData",
        },
      },
      {
        $unwind: "$ownerData",
      },
      {
        $project: {
          _id: 0,
          name: "$ownerData.name",
          count: 1,
        },
      },
    ]);

    const byProject = await Task.aggregate([
      {
        $match: {
          status: "Completed",
        },
      },
      {
        $group: {
          _id: "$project",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "_id",
          as: "projectData",
        },
      },
      {
        $unwind: "$projectData",
      },
      {
        $project: {
          _id: 0,
          name: "$projectData.name",
          count: 1,
        },
      },
    ]);

    res.json({
      byTeam,
      byOwner,
      byProject,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

// User Fetch Calls

app.get("/v1/users", verifyJWT, async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.status(200).json(users);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log("Server is running on port" ,PORT);
});
