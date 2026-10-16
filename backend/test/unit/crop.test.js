import { describe, expect, it } from 'vitest';
import { GROWTH_STAGES } from '../../src/config/constants.js';
import { Crop } from '../../src/models/Crop.js';
import {
  addCropSchema,
  updateCropSchema,
  updateStageSchema,
} from '../../src/validators/cropValidators.js';

describe('Crop Unit Tests (Feature 3)', () => {
  it('Crop.Model: initializes correctly and serializes to JSON', async () => {
    const crop = new Crop({
      crop_id: 10,
      farm_id: 2,
      crop_name: 'Paddy',
      variety: 'Basmati',
      sowing_date: '2026-06-15',
      harvest_date: '2026-10-20',
      growth_stage: 'Vegetative',
      created_at: '2026-06-15T00:00:00.000Z',
      updated_at: '2026-06-15T00:00:00.000Z',
    });

    const json = crop.toJSON();
    expect(json.crop_id).toBe(10);
    expect(json.farm_id).toBe(2);
    expect(json.crop_name).toBe('Paddy');
    expect(json.growth_stage).toBe('Vegetative');

    await crop.updateStage('Flowering');
    expect(crop.growth_stage).toBe('Flowering');

    await expect(crop.updateStage('FakeStage')).rejects.toThrow();
  });

  it('Crop.Validate: addCropSchema validates required fields and date ordering', () => {
    // Valid
    const valid = addCropSchema.safeParse({
      crop_name: 'Cotton',
      variety: 'Bt Cotton',
      sowing_date: '2026-05-01',
      harvest_date: '2026-11-01',
    });
    expect(valid.success).toBe(true);
    expect(valid.data.growth_stage).toBe('Sowing'); // default

    // Missing crop_name
    const missingName = addCropSchema.safeParse({
      sowing_date: '2026-05-01',
    });
    expect(missingName.success).toBe(false);

    // Invalid dates: harvest before sowing
    const invalidDates = addCropSchema.safeParse({
      crop_name: 'Cotton',
      sowing_date: '2026-05-01',
      harvest_date: '2026-04-30',
    });
    expect(invalidDates.success).toBe(false);
  });

  it('Crop.Validate: updateCropSchema validates date ordering on partial update', () => {
    const valid = updateCropSchema.safeParse({
      crop_name: 'Updated Cotton',
      harvest_date: '2026-11-15',
      sowing_date: '2026-05-01',
    });
    expect(valid.success).toBe(true);

    const invalid = updateCropSchema.safeParse({
      harvest_date: '2026-04-01',
      sowing_date: '2026-05-01',
    });
    expect(invalid.success).toBe(false);
  });

  it('Crop.Validate: updateStageSchema only allows the 7 D3 lifecycle stages', () => {
    for (const stage of GROWTH_STAGES) {
      const res = updateStageSchema.safeParse({ growth_stage: stage });
      expect(res.success).toBe(true);
    }

    const invalid = updateStageSchema.safeParse({ growth_stage: 'Dormant' });
    expect(invalid.success).toBe(false);
  });
});
