const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const { env } = require("./config/env");
const authRoutes = require("./routes/auth.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const userRoutes = require("./routes/user.routes");
const profileRoutes = require("./routes/profile.routes");
const adminRoutes = require("./routes/admin.routes");
const managerRoutes = require("./routes/manager.routes");
const ownerRoutes = require("./routes/owner.routes");
const scholarshipsRoutes = require("./routes/scholarships.routes");
const bookmarksRoutes = require("./routes/bookmarks.routes");
const documentsRoutes = require("./routes/documents.routes");
const applicationsRoutes = require("./routes/applications.routes");
const communityRoutes = require("./routes/community.routes");
const recommendationsRoutes = require("./routes/recommendations.routes");
const discoveryRoutes = require("./routes/discovery.routes");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.frontendAppUrl,
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/api", userRoutes);
app.use("/api", profileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/scholarships", scholarshipsRoutes);
app.use("/api/bookmarks", bookmarksRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/recommendations", recommendationsRoutes);
app.use("/api/discovery", discoveryRoutes);

app.use(errorHandler);

module.exports = { app };

