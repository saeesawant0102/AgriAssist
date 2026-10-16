/**
 * Farm domain model mapped from Class Diagram and Section 8.
 */
export class Farm {
  constructor({
    farm_id = null,
    farmer_id,
    farm_name,
    location,
    area,
    latitude,
    longitude,
    created_at = null,
    updated_at = null,
  }) {
    this.farm_id = farm_id ? Number(farm_id) : null;
    this.farmer_id = Number(farmer_id);
    this.farm_name = farm_name;
    this.location = location;
    this.area = Number(area);
    this.latitude = Number(latitude);
    this.longitude = Number(longitude);
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  // Operations defined in Class Diagram
  async addFarm() {
    return true;
  }

  async updateFarm(data) {
    if (data.farm_name !== undefined) this.farm_name = data.farm_name;
    if (data.location !== undefined) this.location = data.location;
    if (data.area !== undefined) this.area = Number(data.area);
    if (data.latitude !== undefined) this.latitude = Number(data.latitude);
    if (data.longitude !== undefined) this.longitude = Number(data.longitude);
    this.updated_at = new Date().toISOString();
  }

  async deleteFarm() {
    return true;
  }

  async viewFarm() {
    return this.toJSON();
  }

  toJSON() {
    return {
      farm_id: this.farm_id,
      farmer_id: this.farmer_id,
      farm_name: this.farm_name,
      location: this.location,
      area: this.area,
      latitude: this.latitude,
      longitude: this.longitude,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  static fromRow(row) {
    if (!row) return null;
    return new Farm({
      farm_id: row.farm_id,
      farmer_id: row.farmer_id,
      farm_name: row.farm_name,
      location: row.location,
      area: row.area,
      latitude: row.latitude,
      longitude: row.longitude,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
  }
}
