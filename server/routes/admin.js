import express from 'express';
import User from '../models/User.js';
import Post from '../models/Post.js';
import { protect, restrictTo } from '../middleware/auth.js';
import logger from '../config/logger.js'; // Add logger import

const router = express.Router();

// All admin routes require admin role
router.use(protect, restrictTo('admin'));

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users }
    });
  } catch (error) {
    logger.error('Admin users fetch error:', error); // Add logging
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users'
    });
  }
});

// Get all posts (including drafts)
router.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      status: 'success',
      results: posts.length,
      data: { posts }
    });
  } catch (error) {
    logger.error('Admin posts fetch error:', error); // Add logging
    res.status(500).json({
      status: 'error',
      message: 'Error fetching posts'
    });
  }
});

// Delete a user
router.delete('/users/:id', async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot delete your own account',
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found',
      });
    }

    logger.info(`Admin ${req.user.id} deleted user ${req.params.id}`); // Log admin actions
    
    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Admin user delete error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting user',
    });
  }
});

// Update user role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['admin', 'author', 'reader'].includes(role)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid role'
      });
    }

    // Prevent role change on own account
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot change your own role'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true } // Added validation
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    logger.info(`Admin ${req.user.id} updated role for user ${req.params.id} to ${role}`);
    
    res.status(200).json({
      status: 'success',
      message: 'User role updated successfully',
      data: { user }
    });
  } catch (error) {
    logger.error('Admin role update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating user role'
    });
  }
});

// Admin dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const publishedPosts = await Post.countDocuments({ status: 'published' });
    const draftPosts = await Post.countDocuments({ status: 'draft' });

    // Add recent activity (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = await User.countDocuments({ 
      createdAt: { $gte: weekAgo } 
    });
    const newPostsThisWeek = await Post.countDocuments({ 
      createdAt: { $gte: weekAgo } 
    });

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalUsers,
          totalPosts,
          publishedPosts,
          draftPosts,
          newUsersThisWeek,
          newPostsThisWeek
        }
      }
    });
  } catch (error) {
    logger.error('Admin dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching dashboard stats'
    });
  }
});

export default router;