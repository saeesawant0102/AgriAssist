import { FirebaseAuthGateway } from '../src/auth/FirebaseAuthGateway.js';
import { env } from '../src/config/env.js';
import { Database } from '../src/db/connection.js';
import { migrate } from '../src/db/migrate.js';
import * as userRepository from '../repositories/userRepository.js';

async function seedAdmin() {
  const args = process.argv.slice(2);
  if (args.length < 4) {
    console.error('Usage: node scripts/seedAdmin.js <email> <password> <name> <role>');
    process.exit(1);
  }

  const [email, password, name, role] = args;
  const normalizedEmail = email.toLowerCase().trim();

  console.log(`[SeedAdmin] Seeding administrator ${normalizedEmail} (Role: ${role})...`);

  const db = await Database.open(env.DATABASE_PATH);
  await migrate(db);

  const authGateway = new FirebaseAuthGateway();

  try {
    // 1. Check if user already exists locally
    const existing = await userRepository.findUserByEmail(db, normalizedEmail);
    if (existing) {
      console.error(`[SeedAdmin] An account with email ${normalizedEmail} already exists in database.`);
      await db.close();
      process.exit(1);
    }

    // 2. Create Firebase Auth user
    console.log('[SeedAdmin] Creating Firebase Auth account...');
    const fbUser = await authGateway.createUser({
      email: normalizedEmail,
      password,
      displayName: name,
    });

    // 3. Insert local database rows in transaction
    const nowIso = new Date().toISOString();
    const adminUser = await db.transaction(async (tx) => {
      const userId = await userRepository.createUser(tx, {
        firebase_uid: fbUser.uid,
        user_type: 'administrator',
        name,
        email: normalizedEmail,
        status: 'active',
        created_at: nowIso,
        updated_at: nowIso,
      });

      await userRepository.createAdministrator(tx, {
        user_id: userId,
        role,
      });

      return userRepository.findUserById(tx, userId);
    });

    console.log('[SeedAdmin] Administrator successfully created:');
    console.log(JSON.stringify(adminUser.toJSON(), null, 2));
    await db.close();
    process.exit(0);
  } catch (err) {
    console.error('[SeedAdmin] Failed to seed administrator:', err.message);
    await db.close();
    process.exit(1);
  }
}

seedAdmin();
