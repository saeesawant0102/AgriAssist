/**
 * IrrigationSchedule domain model mapped from Class Diagram and Section 8.
 * Requirement: R5, Irrigation.Generate, Irrigation.View, Irrigation.Update, Irrigation.Skip
 */
export class IrrigationSchedule {
  constructor({
    schedule_id = null,
    crop_id,
    start_date,
    end_date,
    frequency,
    water_required,
    skip_recommended = 0,
    note = '',
    created_at = null,
    updated_at = null,
    irrigation_dates = [],
    skipped_dates = [],
    weather_data = [],
  }) {
    this.schedule_id = schedule_id ? Number(schedule_id) : null;
    this.crop_id = Number(crop_id);
    this.start_date = start_date;
    this.end_date = end_date;
    this.frequency = frequency;
    this.water_required = water_required;
    this.skip_recommended = Number(skip_recommended) ? 1 : 0;
    this.note = note || '';
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.irrigation_dates = Array.isArray(irrigation_dates) ? [...irrigation_dates].sort() : [];
    this.skipped_dates = Array.isArray(skipped_dates) ? [...skipped_dates].sort() : [];
    this.weather_data = Array.isArray(weather_data) ? weather_data : [];
  }

  // Operation from Class Diagram: view_schedule
  async viewSchedule() {
    return this.toJSON();
  }

  toJSON() {
    const data = {
      schedule_id: this.schedule_id,
      crop_id: this.crop_id,
      start_date: this.start_date,
      end_date: this.end_date,
      frequency: this.frequency,
      water_required: this.water_required,
      skip_recommended: this.skip_recommended,
      note: this.note,
      created_at: this.created_at,
      updated_at: this.updated_at,
      irrigation_dates: this.irrigation_dates,
      skipped_dates: this.skipped_dates,
    };
    if (this.weather_data.length > 0) {
      data.weather_data = this.weather_data.map((w) => (w.toJSON ? w.toJSON() : w));
    }
    return data;
  }

  static fromRow(row, datesRows = [], weatherRows = []) {
    if (!row) return null;
    const irrigationDates = datesRows
      .filter((d) => Number(d.is_skipped) === 0)
      .map((d) => d.date)
      .sort();

    const skippedDates = datesRows
      .filter((d) => Number(d.is_skipped) === 1)
      .map((d) => d.date)
      .sort();

    return new IrrigationSchedule({
      schedule_id: row.schedule_id,
      crop_id: row.crop_id,
      start_date: row.start_date,
      end_date: row.end_date,
      frequency: row.frequency,
      water_required: row.water_required,
      skip_recommended: row.skip_recommended,
      note: row.note,
      created_at: row.created_at,
      updated_at: row.updated_at,
      irrigation_dates: irrigationDates,
      skipped_dates: skippedDates,
      weather_data: weatherRows,
    });
  }
}
