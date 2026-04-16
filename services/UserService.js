const User = require('../models/User');

class UserService {
  async create(userData) {
    const user = new User(userData);
    
    // Validate required fields
    if (!user.name || !user.phone) {
      throw new Error('Ism va telefon majburiy');
    }

    // Check if user already exists
    const existing = await this.findByPhone(user.phone);
    if (existing) {
      return existing;
    }

    // Save to database
    const savedUser = await this.save(user);
    return savedUser;
  }

  async findByPhone(phone) {
    // Database implementation would go here
    return null;
  }

  async findByTelegramChatId(chatId) {
    // Database implementation would go here
    return null;
  }

  async findById(id) {
    // Database implementation would go here
    return null;
  }

  async update(userId, updateData) {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('Foydalanuvchi topilmadi');
    }

    // Update fields
    Object.assign(user, updateData);
    user.updated_at = new Date().toISOString();

    return await this.save(user);
  }

  async deposit(userId, amount, transactionId = null) {
    if (amount <= 0) {
      throw new Error('Summa musbat bo\'lishi kerak');
    }

    const user = await this.findById(userId);
    if (!user) {
      throw new Error('Foydalanuvchi topilmadi');
    }

    // Check for duplicate transaction
    if (transactionId) {
      // Database implementation would check for existing transaction
    }

    user.balance += amount;
    user.updated_at = new Date().toISOString();

    return await this.save(user);
  }

  async deduct(userId, amount) {
    if (amount <= 0) {
      throw new Error('Summa musbat bo\'lishi kerak');
    }

    const user = await this.findById(userId);
    if (!user) {
      throw new Error('Foydalanuvchi topilmadi');
    }

    if (user.balance < amount) {
      throw new Error('Balansda yetarli mablag\' yo\'q');
    }

    user.balance -= amount;
    user.updated_at = new Date().toISOString();

    return await this.save(user);
  }

  async block(userId, operatorId) {
    const operator = await this.findById(operatorId);
    if (!operator || !operator.canManageUsers()) {
      throw new Error('Faqat operator foydalanuvchilarni bloklashi mumkin');
    }

    return await this.update(userId, { is_blocked: true });
  }

  async unblock(userId, operatorId) {
    const operator = await this.findById(operatorId);
    if (!operator || !operator.canManageUsers()) {
      throw new Error('Faqat operator foydalanuvchilarni bloklashi mumkin');
    }

    return await this.update(userId, { is_blocked: false });
  }

  async delete(userId, operatorId) {
    const operator = await this.findById(operatorId);
    if (!operator || !operator.canManageUsers()) {
      throw new Error('Faqat operator foydalanuvchilarni o\'chira oladi');
    }

    // Check if trying to delete main operator
    const userToDelete = await this.findById(userId);
    if (userToDelete.isMainOperator()) {
      throw new Error('Asosiy operator o\'chirib bo\'lmaydi');
    }

    // Database implementation would delete the user
    return true;
  }

  async promoteToOperator(userId, operatorId) {
    const operator = await this.findById(operatorId);
    if (!operator || !operator.canManageOperators()) {
      throw new Error('Faqat asosiy operator yangi operator tayinlashi mumkin');
    }

    return await this.update(userId, { is_operator: true });
  }

  async demoteFromOperator(userId, operatorId) {
    const operator = await this.findById(operatorId);
    if (!operator || !operator.canManageOperators()) {
      throw new Error('Faqat asosiy operator operatorlikdan olgani mumkin');
    }

    // Check if trying to demote main operator
    const userToDemote = await this.findById(userId);
    if (userToDemote.isMainOperator()) {
      throw new Error('Asosiy operatorlikdan olgani bo\'lmaydi');
    }

    return await this.update(userId, { is_operator: false });
  }

  async save(user) {
    // Database implementation would go here
    // For now, just return the user
    return user;
  }

  formatUser(user) {
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      telegram: user.telegram,
      avatar: user.avatar,
      balance: user.balance,
      is_operator: user.is_operator,
      is_blocked: user.is_blocked,
      joined: user.joined
    };
  }
}

module.exports = new UserService();
