const router      = require('express').Router();
const ctrl        = require('../controllers/realtimeController');
const { protect } = require('../middleware/auth');

router.get('/trending',                 ctrl.getTrending);
router.get('/recently-viewed', protect, ctrl.getRecentlyViewed);
router.get('/unique-visitors/:id',      ctrl.getUniqueVisitors);
router.get('/leaderboard/sellers',      ctrl.getSellerLeaderboard);

module.exports = router;
