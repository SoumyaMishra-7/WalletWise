const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All wallet routes require authentication

router.route('/')
  .post(walletController.createWallet)
  .get(walletController.getWallets);

router.route('/:id')
  .get(walletController.getWalletById)
  .put(walletController.updateWallet)
  .delete(walletController.deleteWallet);

router.route('/:id/members')
  .post(walletController.addMember);

router.route('/:id/members/:userId')
  .delete(walletController.removeMember);

module.exports = router;
