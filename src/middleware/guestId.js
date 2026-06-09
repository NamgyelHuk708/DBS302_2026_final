const { v4: uuidv4 } = require('uuid');

module.exports = (req, res, next) => {
  // Read guest ID from header or generate one
  req.guestId = req.headers['x-guest-id'] || uuidv4();
  next();
};
