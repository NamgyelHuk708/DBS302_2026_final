const router   = require('express').Router();
const ctrl     = require('../controllers/cartController');
const { optionalAuth } = require('../middleware/auth');
const guestId  = require('../middleware/guestId');

router.use(guestId);
router.use(optionalAuth);

router.get('/',    ctrl.getCart);
router.post('/',   ctrl.addToCart);
router.put('/',    ctrl.updateCart);
router.delete('/', ctrl.clearCart);

module.exports = router;
