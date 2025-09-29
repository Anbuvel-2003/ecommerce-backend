import jwt from "jsonwebtoken";

const createToken = async (email, otp) => {
  try {
    const token = jwt.sign({ email, otp }, process.env.JWT_SECRET_KEY);
    return token;
  } catch (error) {
    console.log(error);
  }
};

const verifyToken = async (token) => {
  const verifiedTokenData = jwt.verify(token, process.env.JWT_SECRET_KEY);
  console.log(verifiedTokenData, "asdsad");
  return verifiedTokenData["otp"];
};

export {
  createToken,
  verifyToken,
};
