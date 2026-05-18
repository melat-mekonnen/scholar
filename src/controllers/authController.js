const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { UserRepository } = require("../repositories/UserRepository");
const { signupUser } = require("../usecases/auth/signupUser");
const { loginUser } = require("../usecases/auth/loginUser");
const { getCurrentUser } = require("../usecases/auth/getCurrentUser");
const { handleGoogleCallback } = require("../usecases/auth/googleAuth");
const { getGoogleAuthUrl } = require("../infra/google/googleOAuthClient");
const { sendPasswordResetEmail } = require("../infra/email/mailer");
const { env } = require("../config/env");

const userRepo = new UserRepository();

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function signAccessToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
  };

  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

function setTokenCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
  });
}

function buildAuthResponse(user) {
  const token = signAccessToken(user);

  return {
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
    },
    token,
  };
}

async function signup(req, res, next) {
  try {
    const { fullName, email, password } = req.body || {};
    const user = await signupUser({ fullName, email, password });
    const response = buildAuthResponse(user);
    setTokenCookie(res, response.token);
    return res.status(201).json(response);
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const user = await loginUser({ email, password });
    const response = buildAuthResponse(user);
    setTokenCookie(res, response.token);
    return res.json(response);
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const userId = req.user?.id;
    const user = await getCurrentUser(userId);
    return res.json({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    return next(err);
  }
}

function logout(req, res, next) {
  try {
    res.clearCookie("token");
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

function googleAuth(req, res, next) {
  try {
    const url = getGoogleAuthUrl();
    return res.redirect(url);
  } catch (err) {
    return next(err);
  }
}

async function passwordResetRequest(req, res, next) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw Object.assign(new Error("Valid email is required"), { statusCode: 400 });
    }

    const user = await userRepo.findByEmail(email);
    if (user) {
      const resetToken = crypto.randomBytes(24).toString("hex");
      const tokenHash = hashResetToken(resetToken);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await userRepo.deletePasswordResetTokensByUser(user.id);
      await userRepo.createPasswordResetToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const resetUrl = `${env.frontendAppUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
      const sent = await sendPasswordResetEmail({ to: email, resetUrl });

      if (env.nodeEnv !== "production") {
        if (sent) {
          // eslint-disable-next-line no-console
          console.log(`[auth] password reset email sent to ${email}`);
        } else {
          // eslint-disable-next-line no-console
          console.log(
            `[auth] SMTP not configured. reset token for ${email}: ${resetToken} (expires in 15m)`
          );
        }
      }
    }

    return res.json({
      message:
        "If an account with that email exists, a password reset link has been generated.",
    });
  } catch (err) {
    return next(err);
  }
}

async function passwordReset(req, res, next) {
  try {
    const token = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!token) {
      throw Object.assign(new Error("Reset token is required"), { statusCode: 400 });
    }
    if (!newPassword || newPassword.length < 8) {
      throw Object.assign(new Error("Password must be at least 8 characters"), {
        statusCode: 400,
      });
    }

    const tokenHash = hashResetToken(token);
    const record = await userRepo.findValidPasswordResetToken(tokenHash);
    if (!record) {
      throw Object.assign(new Error("Invalid or expired reset token"), { statusCode: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userRepo.updatePasswordById(record.user_id, passwordHash);
    await userRepo.deletePasswordResetToken(record.id);

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    return next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = req.cookies?.token || null;

    if (!token && authHeader) {
      const trimmed = String(authHeader).trim();
      token = trimmed.toLowerCase().startsWith("bearer ")
        ? trimmed.substring("bearer ".length)
        : trimmed;
    }

    if (!token) {
      throw Object.assign(new Error("Refresh token is required"), { statusCode: 401 });
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await userRepo.findById(payload.sub);
    if (!user || !user.is_active) {
      throw Object.assign(new Error("User not found or inactive"), { statusCode: 401 });
    }

    const nextToken = signAccessToken(user);
    setTokenCookie(res, nextToken);
    return res.json({ token: nextToken });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    return next(err);
  }
}

async function googleCallback(req, res, next) {
  try {
    const { code } = req.query;
    const user = await handleGoogleCallback(code);
    const { token } = buildAuthResponse(user);

    setTokenCookie(res, token);

    // Option 1: redirect back with token in query
    const redirectUrl = `${env.frontendAppUrl}/auth/callback?token=${encodeURIComponent(
      token
    )}`;
    return res.redirect(redirectUrl);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  signup,
  login,
  me,
  passwordResetRequest,
  passwordReset,
  refreshToken,
  googleAuth,
  googleCallback,
  logout,
};

