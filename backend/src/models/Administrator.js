import { User } from './User.js';

export class Administrator extends User {
  constructor(data) {
    super({ ...data, user_type: 'administrator' });
    this.admin_id = data.admin_id ? Number(data.admin_id) : null;
    this.role = data.role || 'system_admin';
  }

  // Facade operations specified in Class Diagram
  async manageUsers() {
    return true;
  }

  async manageSystem() {
    return true;
  }

  async viewAllReports() {
    return true;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      admin_id: this.admin_id,
      role: this.role,
    };
  }

  static fromRow(row) {
    if (!row) return null;
    return new Administrator({
      user_id: row.user_id,
      firebase_uid: row.firebase_uid,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      admin_id: row.admin_id,
      role: row.role,
    });
  }
}
