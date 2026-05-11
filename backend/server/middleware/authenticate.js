const { jwtVerify } = require("jose");
const User = require("../models/user");

const authenticate = async (req, res, next) => {
  const token = req.header("Authorization").replace("Bearer ", "");
  try {
    const secretKey = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload: decoded } = await jwtVerify(token, secretKey);
    const user = await User.findOne({ _id: decoded.id, "tokens.token": token });

    if (!user) {
      throw new Error();
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).send({ error: "Please authenticate." });
  }
};

module.exports = authenticate;
