const Post = require('../models/Post');

class PostService {
  constructor() {
    this.processingLocks = new Set();
  }

  async create(postData) {
    const post = new Post(postData);
    
    // Validate required fields
    if (!post.name || !post.price || !post.viloyat) {
      throw new Error('Nomi, narxi va viloyat majburiy');
    }

    // Save to database (implementation depends on your DB choice)
    const savedPost = await this.save(post);
    
    return savedPost;
  }

  async updateStatus(postId, newStatus, operatorId = null) {
    // Check if already processing
    if (this.processingLocks.has(postId)) {
      throw new Error('Bu post hozirda qayta ishlanmoqda');
    }

    this.processingLocks.add(postId);

    try {
      const post = await this.findById(postId);
      if (!post) {
        throw new Error('Post topilmadi');
      }

      // Validate status transition
      if (!post.canTransitionTo(newStatus)) {
        throw new Error(`Status "${post.status}" dan "${newStatus}" ga o'tkazib bo'lmaydi`);
      }

      // Update status
      post.status = newStatus;
      post.updated_at = new Date().toISOString();

      // If operator action, track who processed it
      if (operatorId) {
        post.processed_by = operatorId;
      }

      const updatedPost = await this.save(post);
      return updatedPost;
    } finally {
      this.processingLocks.delete(postId);
    }
  }

  async approve(postId, operatorId) {
    return this.updateStatus(postId, Post.STATUSES.PENDING_PAYMENT, operatorId);
  }

  async reject(postId, operatorId, reason) {
    const post = await this.updateStatus(postId, Post.STATUSES.DELETED, operatorId);
    post.rejection_reason = reason;
    return await this.save(post);
  }

  async hide(postId, operatorId) {
    return this.updateStatus(postId, Post.STATUSES.HIDDEN, operatorId);
  }

  async show(postId, operatorId) {
    return this.updateStatus(postId, Post.STATUSES.ACTIVE, operatorId);
  }

  async softDelete(postId, operatorId = null) {
    return this.updateStatus(postId, Post.STATUSES.DELETED, operatorId);
  }

  async findById(id) {
    // Database implementation would go here
    // For now, return mock data
    return new Post({ id, status: Post.STATUSES.ACTIVE });
  }

  async findActive(filters = {}) {
    // Database implementation would go here
    // Return only active posts
    return [];
  }

  async findByOwner(ownerId) {
    // Database implementation would go here
    return [];
  }

  async save(post) {
    // Database implementation would go here
    // For now, just return the post
    return post;
  }

  // Format post for API response
  formatPost(post, includeOwner = false) {
    const formatted = {
      id: post.id,
      name: post.name,
      category: post.category,
      price: post.price,
      unit: post.unit,
      qty: post.qty,
      condition: post.condition,
      viloyat: post.viloyat,
      tuman: post.tuman,
      mahalla: post.mahalla,
      photo: post.photo,
      status: post.status,
      created_at: post.created_at,
      updated_at: post.updated_at
    };

    if (includeOwner && post.owner) {
      formatted.owner = this.formatOwner(post.owner);
    }

    return formatted;
  }

  formatOwner(owner) {
    return {
      id: owner.id,
      name: owner.name,
      phone: owner.phone,
      telegram: owner.telegram,
      avatar: owner.avatar,
      is_operator: owner.is_operator
    };
  }
}

module.exports = new PostService();
