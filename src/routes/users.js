const router = require('express').Router();
const ctrl   = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.get('/profile',                    ctrl.getProfile);
router.patch('/profile',                  ctrl.updateProfile);
router.post('/wishlist/:productId',       ctrl.addToWishlist);
router.delete('/wishlist/:productId',     ctrl.removeFromWishlist);

router.get('/', restrictTo('admin'),      ctrl.getAllUsers);

module.exports = router;
