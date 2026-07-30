import * as dotenv from 'dotenv';
import * as path from 'path';
import { GankMeDaddyApp } from './app/GankMeDaddyApp';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const coach = new GankMeDaddyApp(path.resolve(__dirname, '..'));
coach.on('state', state => console.log(`[STATUS] ${state.status}`));
coach.on('activity', message => console.log(`[ACTIVITY] ${message}`));

coach.start(process.env.STRATZ_API_TOKEN || '').catch(error => {
  console.error('Fatal error:', error);
  process.exitCode = 1;
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    coach.stop();
    process.exit(0);
  });
}
