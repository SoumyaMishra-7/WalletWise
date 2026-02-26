const Wallet = require('../models/Wallet');
const User = require('../models/User');
const Transaction = require('../models/Transactions');

// @desc    Create a new shared wallet
// @route   POST /api/v1/wallets
// @access  Private
exports.createWallet = async (req, res) => {
  try {
    const { name, description, currency } = req.body;

    const wallet = await Wallet.create({
      name,
      description,
      currency: currency || req.user.currency || 'USD',
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }]
    });

    res.status(201).json(wallet);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get user's shared wallets
// @route   GET /api/v1/wallets
// @access  Private
exports.getWallets = async (req, res) => {
  try {
    const wallets = await Wallet.find({ 'members.user': req.user._id })
      .populate('owner', 'name email')
      .populate('members.user', 'name email avatarUrl');
    res.json(wallets);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get specific wallet details
// @route   GET /api/v1/wallets/:id
// @access  Private
exports.getWalletById = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      _id: req.params.id,
      'members.user': req.user._id
    })
      .populate('owner', 'name email')
      .populate('members.user', 'name email avatarUrl');

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found or access denied' });
    }

    res.json(wallet);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update wallet details
// @route   PUT /api/v1/wallets/:id
// @access  Private
exports.updateWallet = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Only owner or admin can update
    const wallet = await Wallet.findOne({
      _id: req.params.id,
      members: { $elemMatch: { user: req.user._id, role: 'admin' } }
    });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found or you are not an admin' });
    }

    wallet.name = name || wallet.name;
    wallet.description = description || wallet.description;
    await wallet.save();

    res.json(wallet);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a shared wallet
// @route   DELETE /api/v1/wallets/:id
// @access  Private
exports.deleteWallet = async (req, res) => {
  try {
    // Only owner can delete
    const wallet = await Wallet.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found or you are not the owner' });
    }

    // Optional: Delete associated transactions or mark walletId null
    // Here we decide to delete them
    await Transaction.deleteMany({ walletId: wallet._id });
    await wallet.deleteOne();

    res.json({ message: 'Wallet removed' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Add member to wallet
// @route   POST /api/v1/wallets/:id/members
// @access  Private
exports.addMember = async (req, res) => {
  try {
    const { email, role } = req.body;

    const wallet = await Wallet.findOne({
      _id: req.params.id,
      members: { $elemMatch: { user: req.user._id, role: 'admin' } }
    });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found or you are not an admin' });
    }

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ message: 'User with this email not found' });
    }

    // Check if already a member
    const isMember = wallet.members.some(m => m.user.toString() === userToAdd._id.toString());
    if (isMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    wallet.members.push({ user: userToAdd._id, role: role || 'member' });
    await wallet.save();

    const updatedWallet = await Wallet.findById(wallet._id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email avatarUrl');

    res.json(updatedWallet);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Remove member from wallet
// @route   DELETE /api/v1/wallets/:id/members/:userId
// @access  Private
exports.removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const wallet = await Wallet.findOne({ _id: id });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Check permissions: A user can remove themselves. An admin can remove anyone (except owner).
    const isSelf = req.user._id.toString() === userId;
    const reqUserMember = wallet.members.find(m => m.user.toString() === req.user._id.toString());
    const isAdmin = reqUserMember && reqUserMember.role === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to remove this member' });
    }

    // Cannot remove owner
    if (wallet.owner.toString() === userId) {
      return res.status(400).json({ message: 'Cannot remove the owner of the wallet' });
    }

    wallet.members = wallet.members.filter(m => m.user.toString() !== userId);
    await wallet.save();

    res.json({ message: 'Member removed' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
