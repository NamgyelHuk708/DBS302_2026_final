const router      = require('express').Router();
const authCtrl    = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

router.post('/register', authCtrl.register);
router.post('/login',    rateLimiter({ limit: 5, windowSec: 60 }), authCtrl.login);
router.post('/logout',   protect, authCtrl.logout);

module.exports = router;
