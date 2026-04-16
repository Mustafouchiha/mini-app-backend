const PostService = require('../services/PostService');
const TelegramService = require('../services/TelegramService');
const UserService = require('../services/UserService');

class PostController {
  async create(req, res) {
    try {
      const { name, category, price, unit, qty, condition, viloyat, tuman, mahalla, photo } = req.body;

      // Validate required fields
      if (!name || !price || !viloyat) {
        return res.status(400).json({ message: 'Nomi, narxi va viloyat majburiy' });
      }

      // Create post with pending_approval status
      const postData = {
        name,
        category: category || 'boshqa',
        price: Number(price),
        unit: unit || 'dona',
        qty: Number(qty) || 1,
        condition: condition || 'Yaxshi',
        viloyat,
        tuman: tuman || '',
        mahalla: mahalla || '',
        photo: photo || null,
        owner_id: req.user.id,
        status: 'pending_approval'
      };

      const post = await PostService.create(postData);

      // Get owner info for notification
      const owner = await UserService.findById(req.user.id);

      // Notify operators
      await TelegramService.notifyNewPost(post, owner);

      res.status(201).json({
        message: 'Post yuborildi. Tekshiruvga yuborildi.',
        post: PostService.formatPost(post, true)
      });
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async getAll(req, res) {
    try {
      const { category, viloyat, search, status } = req.query;
      
      // Get active posts only (exclude pending_approval, hidden, deleted)
      const filters = { status: 'active' };
      if (category) filters.category = category;
      if (viloyat) filters.viloyat = viloyat;
      if (search) filters.search = search;

      const posts = await PostService.findActive(filters);
      
      // Format for response
      const formattedPosts = posts.map(post => PostService.formatPost(post, true));

      res.json(formattedPosts);
    } catch (error) {
      console.error('Get posts error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async getMy(req, res) {
    try {
      const posts = await PostService.findByOwner(req.user.id);
      const formattedPosts = posts.map(post => PostService.formatPost(post, true));
      res.json(formattedPosts);
    } catch (error) {
      console.error('Get my posts error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const post = await PostService.findById(req.params.id);
      if (!post) {
        return res.status(404).json({ message: 'Post topilmadi' });
      }

      // Check permissions
      if (post.owner_id !== req.user.id && !req.user.is_operator) {
        return res.status(403).json({ message: 'Ruxsat yo\'q' });
      }

      res.json(PostService.formatPost(post, true));
    } catch (error) {
      console.error('Get post error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async update(req, res) {
    try {
      const post = await PostService.findById(req.params.id);
      if (!post) {
        return res.status(404).json({ message: 'Post topilmadi' });
      }

      // Check ownership
      if (post.owner_id !== req.user.id) {
        return res.status(403).json({ message: 'Faqat post egasi tahrir qilishi mumkin' });
      }

      // Update allowed fields
      const allowedFields = ['name', 'category', 'price', 'unit', 'qty', 'condition', 'viloyat', 'tuman', 'mahalla', 'photo'];
      const updateData = {};
      
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      const updatedPost = await PostService.update(post.id, updateData);
      res.json(PostService.formatPost(updatedPost, true));
    } catch (error) {
      console.error('Update post error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async approve(req, res) {
    try {
      const { postId } = req.params;
      const { reason } = req.body;

      // Check operator permissions
      if (!req.user.is_operator) {
        return res.status(403).json({ message: 'Faqat operator ruxsati bor' });
      }

      const post = await PostService.approve(postId, req.user.id);
      const owner = await UserService.findById(post.owner_id);

      // Notify user
      await TelegramService.notifyPostApproved(post, owner);

      res.json({
        message: 'Post tasdiqlandi',
        post: PostService.formatPost(post, true)
      });
    } catch (error) {
      console.error('Approve post error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async reject(req, res) {
    try {
      const { postId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: 'Rad etish sababi majburiy' });
      }

      // Check operator permissions
      if (!req.user.is_operator) {
        return res.status(403).json({ message: 'Faqat operator ruxsati bor' });
      }

      const post = await PostService.reject(postId, req.user.id, reason);
      const owner = await UserService.findById(post.owner_id);

      // Notify user
      await TelegramService.notifyPostRejected(post, owner, reason);

      res.json({
        message: 'Post rad etildi',
        post: PostService.formatPost(post, true)
      });
    } catch (error) {
      console.error('Reject post error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async hide(req, res) {
    try {
      const { postId } = req.params;

      // Check operator permissions
      if (!req.user.is_operator) {
        return res.status(403).json({ message: 'Faqat operator ruxsati bor' });
      }

      const post = await PostService.hide(postId, req.user.id);
      res.json({
        message: 'Post yashirildi',
        post: PostService.formatPost(post, true)
      });
    } catch (error) {
      console.error('Hide post error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async show(req, res) {
    try {
      const { postId } = req.params;

      // Check operator permissions
      if (!req.user.is_operator) {
        return res.status(403).json({ message: 'Faqat operator ruxsati bor' });
      }

      const post = await PostService.show(postId, req.user.id);
      res.json({
        message: 'Post ko'rsatildi',
        post: PostService.formatPost(post, true)
      });
    } catch (error) {
      console.error('Show post error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async deletePost(req, res) {
    try {
      const { postId } = req.params;

      // Check operator permissions or ownership
      const post = await PostService.findById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post topilmadi' });
      }

      if (post.owner_id !== req.user.id && !req.user.is_operator) {
        return res.status(403).json({ message: 'Ruxsat yo\'q' });
      }

      await PostService.softDelete(postId, req.user.id);
      res.json({ message: 'Post o\'chirildi' });
    } catch (error) {
      console.error('Delete post error:', error);
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = new PostController();
