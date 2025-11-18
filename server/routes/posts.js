import express from 'express';
import { body, validationResult } from 'express-validator';
import Post from '../models/Post.js';
import { protect, restrictTo } from '../middleware/auth.js';
import logger from '../config/logger.js'; // Add logger import

const router = express.Router();

// Input validation for posts
const validatePost = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1-200 characters')
    .escape(),
  body('content')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Content is required')
    .escape(),
  body('status')
    .optional()
    .isIn(['draft', 'published'])
    .withMessage('Status must be either draft or published')
];

// Get all published posts (public) with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ status: 'published' })
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments({ status: 'published' });

    res.status(200).json({
      status: 'success',
      results: posts.length,
      data: { posts },
      pagination: {
        current: page,
        pages: Math.ceil(totalPosts / limit),
        total: totalPosts
      }
    });
  } catch (error) {
    logger.error('Error fetching posts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching posts'
    });
  }
});

// Get single post (public)
router.get('/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({ 
      slug: req.params.slug, 
      status: 'published' 
    }).populate('author', 'username');

    if (!post) {
      return res.status(404).json({
        status: 'fail',
        message: 'Post not found'
      });
    }

    // Increment view count (optional)
    post.views = (post.views || 0) + 1;
    await post.save();

    res.status(200).json({
      status: 'success',
      data: { post }
    });
  } catch (error) {
    logger.error('Error fetching post:', { slug: req.params.slug, error });
    res.status(500).json({
      status: 'error',
      message: 'Error fetching post'
    });
  }
});

// Create post (admin/author only)
router.post('/', protect, restrictTo('admin', 'author'), validatePost, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Post creation validation failed', { errors: errors.array() });
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, content, status = 'draft' } = req.body;
    
    // Generate slug and ensure uniqueness
    let slug = title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
    let existingPost = await Post.findOne({ slug });
    let counter = 1;
    
    while (existingPost) {
      slug = `${slug}-${counter}`;
      existingPost = await Post.findOne({ slug });
      counter++;
    }

    const post = await Post.create({
      title,
      content,
      slug,
      status,
      author: req.user.id
    });

    await post.populate('author', 'username');

    logger.info('Post created successfully', { 
      postId: post._id, 
      author: req.user.id,
      title: title 
    });

    res.status(201).json({
      status: 'success',
      message: 'Post created successfully',
      data: { post }
    });
  } catch (error) {
    logger.error('Error creating post:', { author: req.user.id, error });
    
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'fail',
        message: 'Post with this title already exists'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Error creating post'
    });
  }
});

// Update post (admin/author only)
router.put('/:id', protect, restrictTo('admin', 'author'), validatePost, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Post update validation failed', { errors: errors.array() });
      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        status: 'fail',
        message: 'Post not found'
      });
    }

    // Check if user is author or admin
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      logger.warn('Unauthorized post update attempt', { 
        userId: req.user.id, 
        postAuthor: post.author.toString() 
      });
      return res.status(403).json({
        status: 'fail',
        message: 'You can only update your own posts'
      });
    }

    // Handle slug regeneration if title changed
    if (req.body.title && req.body.title !== post.title) {
      let slug = req.body.title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
      let existingPost = await Post.findOne({ slug, _id: { $ne: post._id } });
      let counter = 1;
      
      while (existingPost) {
        slug = `${slug}-${counter}`;
        existingPost = await Post.findOne({ slug, _id: { $ne: post._id } });
        counter++;
      }
      req.body.slug = slug;
    }

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('author', 'username');

    logger.info('Post updated successfully', { 
      postId: post._id, 
      userId: req.user.id 
    });

    res.status(200).json({
      status: 'success',
      message: 'Post updated successfully',
      data: { post: updatedPost }
    });
  } catch (error) {
    logger.error('Error updating post:', { postId: req.params.id, error });
    res.status(500).json({
      status: 'error',
      message: 'Error updating post'
    });
  }
});

// Delete post (admin/author only)
router.delete('/:id', protect, restrictTo('admin', 'author'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        status: 'fail',
        message: 'Post not found'
      });
    }

    // Check if user is author or admin
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      logger.warn('Unauthorized post deletion attempt', { 
        userId: req.user.id, 
        postAuthor: post.author.toString() 
      });
      return res.status(403).json({
        status: 'fail',
        message: 'You can only delete your own posts'
      });
    }

    await Post.findByIdAndDelete(req.params.id);

    logger.info('Post deleted successfully', { 
      postId: post._id, 
      userId: req.user.id,
      title: post.title 
    });

    res.status(200).json({
      status: 'success',
      message: 'Post deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting post:', { postId: req.params.id, error });
    res.status(500).json({
      status: 'error',
      message: 'Error deleting post'
    });
  }
});

// Get user's posts (for authors/admins)
router.get('/user/my-posts', protect, restrictTo('admin', 'author'), async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user.id })
      .populate('author', 'username')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: posts.length,
      data: { posts }
    });
  } catch (error) {
    logger.error('Error fetching user posts:', { userId: req.user.id, error });
    res.status(500).json({
      status: 'error',
      message: 'Error fetching your posts'
    });
  }
});

export default router;