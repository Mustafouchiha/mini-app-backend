const { v4: uuidv4 } = require('uuid');

class Post {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.name = data.name || '';
    this.category = data.category || 'boshqa';
    this.price = Number(data.price) || 0;
    this.unit = data.unit || 'dona';
    this.qty = Number(data.qty) || 1;
    this.condition = data.condition || 'Yaxshi';
    this.viloyat = data.viloyat || '';
    this.tuman = data.tuman || '';
    this.mahalla = data.mahalla || '';
    this.photo = data.photo || null;
    this.owner_id = data.owner_id || null;
    this.is_active = data.is_active !== false;
    this.status = data.status || 'pending_approval';
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  static STATUSES = {
    PENDING_APPROVAL: 'pending_approval',
    PENDING_PAYMENT: 'pending_payment',
    ACTIVE: 'active',
    HIDDEN: 'hidden',
    DELETED: 'deleted'
  };

  static isValidStatus(status) {
    return Object.values(this.STATUSES).includes(status);
  }

  canTransitionTo(newStatus) {
    const validTransitions = {
      [Post.STATUSES.PENDING_APPROVAL]: [
        Post.STATUSES.PENDING_PAYMENT,
        Post.STATUSES.DELETED
      ],
      [Post.STATUSES.PENDING_PAYMENT]: [
        Post.STATUSES.ACTIVE,
        Post.STATUSES.DELETED
      ],
      [Post.STATUSES.ACTIVE]: [
        Post.STATUSES.HIDDEN,
        Post.STATUSES.DELETED
      ],
      [Post.STATUSES.HIDDEN]: [
        Post.STATUSES.ACTIVE,
        Post.STATUSES.DELETED
      ],
      [Post.STATUSES.DELETED]: [] // Deleted is final state
    };

    return validTransitions[this.status]?.includes(newStatus) || false;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      price: this.price,
      unit: this.unit,
      qty: this.qty,
      condition: this.condition,
      viloyat: this.viloyat,
      tuman: this.tuman,
      mahalla: this.mahalla,
      photo: this.photo,
      owner_id: this.owner_id,
      is_active: this.is_active,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Post;
