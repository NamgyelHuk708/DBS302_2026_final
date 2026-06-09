const router = require('express').Router();
const ctrl   = require('../controllers/productController');
const { protect, restrictTo, optionalAuth } = require('../middleware/auth');

router.get('/',      ctrl.getProducts);
router.get('/:id',   optionalAuth, ctrl.getProductById);
router.post('/',     protect, restrictTo('seller', 'admin'), ctrl.createProduct);
router.patch('/:id', protect, restrictTo('seller', 'admin'), ctrl.updateProduct);

module.exports = router;
