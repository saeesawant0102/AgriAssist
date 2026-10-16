/**
 * CropAdvisory domain model mapped from Class Diagram and Section 8.
 * Requirement: R7, Advisory.Generate, Advisory.Display
 */
export class CropAdvisory {
  constructor({
    advisory_id = null,
    crop_id,
    recommendation,
    message,
    date,
    created_at = null,
    weather_data = [],
  }) {
    this.advisory_id = advisory_id ? Number(advisory_id) : null;
    this.crop_id = Number(crop_id);
    this.recommendation = recommendation;
    this.message = message;
    this.date = date;
    this.created_at = created_at;
    this.weather_data = Array.isArray(weather_data) ? weather_data : [];
  }

  // Operation from Class Diagram: view_advisory
  async viewAdvisory() {
    return this.toJSON();
  }

  toJSON() {
    const data = {
      advisory_id: this.advisory_id,
      crop_id: this.crop_id,
      recommendation: this.recommendation,
      message: this.message,
      date: this.date,
      created_at: this.created_at,
    };
    if (this.weather_data.length > 0) {
      data.weather_data = this.weather_data.map((w) => (w.toJSON ? w.toJSON() : w));
    }
    return data;
  }

  static fromRow(row, weatherRows = []) {
    if (!row) return null;
    return new CropAdvisory({
      advisory_id: row.advisory_id,
      crop_id: row.crop_id,
      recommendation: row.recommendation,
      message: row.message,
      date: row.date,
      created_at: row.created_at,
      weather_data: weatherRows,
    });
  }
}
