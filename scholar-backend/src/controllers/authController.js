const jwt = require("jsonwebtoken");
const { signupUser } = require("../usecases/auth/signupUser");
const { loginUser } = require("../usecases/auth/loginUser");
const { getCurrentUser } = require("../usecases/auth/getCurrentUser");
const { handleGoogleCallback } = require("../usecases/auth/googleAuth");
const { getGoogleAuthUrl } = require("../infra/google/googleOAuthClient");
const { env } = require("../config/env");

function setTokenCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
  });
}

function buildAuthResponse(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
  };

  const token = jwt.sign(payload, env.jwtSecret, {
    expiresIn: "7d",
  });

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
  googleAuth,
  googleCallback,
  logout,
};

