import * as userRepository from '../../src/repositories/userRepository.js';
import * as farmRepository from '../../src/repositories/farmRepository.js';
import * as cropRepository from '../../src/repositories/cropRepository.js';
import * as weatherRepository from '../../src/repositories/weatherRepository.js';
import * as financialRepository from '../../src/repositories/financialRepository.js';
import * as profitabilityRepository from '../../src/repositories/profitabilityRepository.js';
import { round2 } from '../../src/utils/round.js';

/**
 * Seeds test data per Section 16.4:
 * 1 administrator, 2 farmers, 2 farms per farmer, 2 crops per farm, sample weather, expenses and income.
 * Uses repository methods only.
 *
 * @param {import('../../src/db/connection.js').Database} db
 * @param {Object} [authGateway]
 * @param {Object} [clock]
 * @returns {Promise<Object>} Seeded entities and tokens/uids
 */
export async function seedTestData(db, authGateway, clock) {
  const now = clock ? clock.now() : new Date();
  const nowIso = now.toISOString();
  const today = nowIso.slice(0, 10);

  // 1. Seed Administrator
  const adminFbUid = 'admin-uid-1';
  if (authGateway && authGateway.users) {
    authGateway.users.set(adminFbUid, {
      uid: adminFbUid,
      email: 'admin@agriassist.local',
      disabled: false,
      tokensRevokedAt: 0,
    });
    authGateway.tokens.set(`token-${adminFbUid}`, adminFbUid);
  }

  const adminUserId = await db.transaction(async (tx) => {
    const uId = await userRepository.createUser(tx, {
      firebase_uid: adminFbUid,
      user_type: 'administrator',
      name: 'System Admin',
      email: 'admin@agriassist.local',
      status: 'active',
      created_at: nowIso,
      updated_at: nowIso,
    });
    await userRepository.createAdministrator(tx, {
      user_id: uId,
      role: 'system_admin',
    });
    return uId;
  });

  // 2. Seed 2 Farmers
  const farmers = [];
  for (let i = 1; i <= 2; i++) {
    const fbUid = `farmer-uid-${i}`;
    const email = `farmer${i}@agriassist.local`;
    const name = `Farmer ${i}`;

    if (authGateway && authGateway.users) {
      authGateway.users.set(fbUid, {
        uid: fbUid,
        email,
        disabled: false,
        tokensRevokedAt: 0,
      });
      authGateway.tokens.set(`token-${fbUid}`, fbUid);
    }

    const { userId, farmerId } = await db.transaction(async (tx) => {
      const uId = await userRepository.createUser(tx, {
        firebase_uid: fbUid,
        user_type: 'farmer',
        name,
        email,
        status: 'active',
        created_at: nowIso,
        updated_at: nowIso,
      });
      // createFarmer expects (exec, { user_id, farm_count })
      const fId = await userRepository.createFarmer(tx, { user_id: uId });
      return { userId: uId, farmerId: fId };
    });

    const farmerFarms = [];

    // 2 farms per farmer
    for (let j = 1; j <= 2; j++) {
      const farmId = await farmRepository.insertFarm(db, {
        farmer_id: farmerId,
        farm_name: `Farmer ${i} Farm ${j}`,
        location: `Region ${i}-${j}`,
        area: 5.5 * j,
        latitude: 18.5204 + (i * 0.1) + (j * 0.01),
        longitude: 73.8567 + (i * 0.1) + (j * 0.01),
        created_at: nowIso,
        updated_at: nowIso,
      });

      // 2 crops per farm
      const crops = [];
      for (let k = 1; k <= 2; k++) {
        const cropId = await cropRepository.insertCrop(db, {
          farm_id: farmId,
          crop_name: k === 1 ? 'Wheat' : 'Rice',
          variety: `Variety ${k}`,
          sowing_date: today,
          harvest_date: null,
          growth_stage: 'Vegetative',
          created_at: nowIso,
          updated_at: nowIso,
        });
        crops.push({ cropId, crop_name: k === 1 ? 'Wheat' : 'Rice' });
      }

      // Sample weather for the farm
      await weatherRepository.insertWeatherRow(db, {
        farm_id: farmId,
        type: 'current',
        date: today,
        temperature: 28.5,
        temperature_max: 32.0,
        temperature_min: 22.0,
        humidity: 65,
        rainfall: 0,
        rainfall_probability: 10,
        wind_speed: 12.5,
        weather_code: 0,
        condition: 'Clear Sky',
        forecast: 'Sunny and clear',
        fetched_at: nowIso,
      });

      // Sample expenses and incomes
      await db.transaction(async (tx) => {
        const expRecordId = await financialRepository.insertFinancialRecord(tx, {
          farm_id: farmId,
          type: 'Expense',
          amount: 1500.0,
          date: today,
          description: 'Seeds and fertilizers',
          created_at: nowIso,
          updated_at: nowIso,
        });
        await financialRepository.insertExpense(tx, expRecordId);

        const incRecordId = await financialRepository.insertFinancialRecord(tx, {
          farm_id: farmId,
          type: 'Income',
          amount: 3500.0,
          date: today,
          description: 'Crop advance sale',
          created_at: nowIso,
          updated_at: nowIso,
        });
        await financialRepository.insertIncome(tx, incRecordId);

        // upsertOverallProfitability takes (exec, farmId, data)
        await profitabilityRepository.upsertOverallProfitability(tx, farmId, {
          total_expense: round2(1500.0),
          total_income: round2(3500.0),
          net_profit: round2(2000.0),
          date: today,
          created_at: nowIso,
        });
      });

      farmerFarms.push({ farmId, crops });
    }

    farmers.push({
      userId,
      farmerId,
      firebaseUid: fbUid,
      email,
      name,
      farms: farmerFarms,
    });
  }

  return {
    admin: {
      userId: adminUserId,
      firebaseUid: adminFbUid,
      email: 'admin@agriassist.local',
    },
    farmers,
  };
}
