const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");
const { env } = require("../../config/env");

const client = new OAuth2Client(
  env.googleClientId,
  env.googleClientSecret,
  env.googleRedirectUri
);

function getGoogleAuthUrl() {
  const scopes = [
    "openid",
    "profile",
    "email",
  ];

  const url = client.generateAuthUrl({
    access_type: "online",
    scope: scopes,
    prompt: "consent",
  });

  return url;
}

async function getGoogleUserProfile(code) {
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const response = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });

  const profile = response.data;

  return {
    googleId: profile.sub,
    email: profile.email,
    fullName: profile.name,
  };
}

module.exports = {
  getGoogleAuthUrl,
  getGoogleUserProfile,
};

