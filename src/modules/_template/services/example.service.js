import { getWriteDB } from '../../../config/databases.js';
import { logger } from '../../../shared/index.js';

const prisma = getWriteDB();

export const exampleService = async (data) => {
  try {
    logger.info('Example service called', { data });

    // Business logic here
    const result = await prisma.example.create({
      data: {
        ...data
      }
    });

    return result;
  } catch (error) {
    logger.error('Example service failed', {
      error: error.message,
      data
    });
    throw error;
  }
};
