const router      = require('express').Router();
const ctrl        = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.get('/products/:productId',          ctrl.getProductReviews);
router.post('/products/:productId', protect, ctrl.createReview);
router.delete('/:id',               protect, ctrl.deleteReview);

module.exports = router;
