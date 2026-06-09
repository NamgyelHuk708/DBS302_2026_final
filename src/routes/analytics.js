const router = require('express').Router();
const ctrl   = require('../controllers/analyticsController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('admin'));
router.get('/revenue/monthly',      ctrl.monthlyRevenue);
router.get('/products/top',          ctrl.topProducts);
router.get('/inventory/low',         ctrl.lowStockReport);
router.get('/products/viewed-vs-purchased', ctrl.viewedVsPurchased);

module.exports = router;
