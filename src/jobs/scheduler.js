import cron from 'node-cron';
import { logger } from '../shared/index.js';
import { carryForwardIncompleteTasks } from '../modules/task/services/carry-forward.service.js';

export const startCronJobs = () => {
  cron.schedule('0 0 * * *', async () => {
    logger.info('Starting daily task carry forward cron job');

    try {
      const result = await carryForwardIncompleteTasks();

      logger.info('Daily task carry forward completed', {
        carriedForward: result.carriedForward,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Daily task carry forward failed', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    }
  });

  logger.info('Cron jobs started: Task carry forward scheduled for midnight daily');
};
