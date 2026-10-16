import { User } from './User.js';

export class Farmer extends User {
  constructor(data) {
    super({ ...data, user_type: 'farmer' });
    this.farmer_id = data.farmer_id ? Number(data.farmer_id) : null;
    this.farm_count = data.farm_count !== undefined ? Number(data.farm_count) : 0;
  }

  // Facade operations specified in Class Diagram
  async manageFarms() {
    return true;
  }

  async viewDashboard() {
    return true;
  }

  async viewReports() {
    return true;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      farmer_id: this.farmer_id,
      farm_count: this.farm_count,
    };
  }

  static fromRow(row) {
    if (!row) return null;
    return new Farmer({
      user_id: row.user_id,
      firebase_uid: row.firebase_uid,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      farmer_id: row.farmer_id,
      farm_count: row.farm_count,
    });
  }
}
