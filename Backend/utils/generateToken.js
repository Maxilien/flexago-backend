import jwt from "jsonwebtoken";

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, "FLEXAGO_SECRET_KEY", { expiresIn: "30d" });
};
