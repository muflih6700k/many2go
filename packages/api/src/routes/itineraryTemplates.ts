import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/jwt';

const router = Router();
const prisma = new PrismaClient();

// GET /api/itinerary-templates - list all templates
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const templates = await prisma.itineraryTemplate.findMany({
      orderBy: { planNum: 'asc' },
    });
    res.json(templates);
  } catch (error) {
    console.error('Error fetching itinerary templates:', error);
    res.status(500).json({ error: 'Failed to fetch itinerary templates' });
  }
});

// GET /api/itinerary-templates/:code - get by code
router.get('/:code', authenticate, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const template = await prisma.itineraryTemplate.findUnique({
      where: { code },
    });

    if (!template) {
      res.status(404).json({ error: 'Itinerary template not found' });
      return;
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching itinerary template:', error);
    res.status(500).json({ error: 'Failed to fetch itinerary template' });
  }
});

export default router;
