import jwt from "jsonwebtoken";


const ACCESS_EXPIRES = process.env.ACCESS_EXPIRES || "15m";

export function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
