const router = require('express').Router();
const ctrl   = require('../controllers/orderController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.post('/',              ctrl.placeOrder);
router.get('/my',             ctrl.getMyOrders);
router.patch('/:id/status',   restrictTo('admin', 'seller'), ctrl.updateOrderStatus);

module.exports = router;
