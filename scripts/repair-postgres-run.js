const { repairPostgresSchema } = require('../src/database/repair-postgres');

(async () => {
  try {
    await repairPostgresSchema();
    console.log('REPAIR_DONE');
    process.exit(0);
  } catch (e) {
    console.error('REPAIR_FAILED', e);
    process.exit(1);
  }
})();


