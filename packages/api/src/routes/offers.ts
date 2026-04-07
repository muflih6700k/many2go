import express from 'express';
import { body, query } from 'express-validator';
import { prisma } from '../config/prisma';
import { authenticate, requireRole } from '../middleware/jwt';
import { validate } from '../middleware/validate';

const router = express.Router();

// Get all active offers (public)
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ max: 100 }).toInt(),
    query('active').optional().isBoolean().toBoolean(),
  ]),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const showActiveOnly = req.query.active !== undefined ? req.query.active : true;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (showActiveOnly) {
        where.isActive = true;
        where.expiresAt = { gt: new Date() };
      }

      const [offers, total] = await Promise.all([
        prisma.offer.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.offer.count({ where }),
      ]);

      return res.json({
        success: true,
        data: offers,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: skip + offers.length < total,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      console.error('Get offers error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch offers' } });
    }
  }
);

// Create offer (ADMIN only)
router.post(
  '/',
  requireRole('ADMIN'),
  validate([
    body('title').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('discount').isFloat({ min: 0 }),
    body('expiresAt').isISO8601(),
  ]),
  async (req, res) => {
    try {
      const { title, description, discount, imageUrl, expiresAt } = req.body;

      const offer = await prisma.offer.create({
        data: {
          title,
          description,
          discount,
          imageUrl: imageUrl || null,
          expiresAt: new Date(expiresAt),
        },
      });

      return res.status(201).json({ success: true, data: offer });
    } catch (error) {
      console.error('Create offer error:', error);
      return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create offer' } });
    }
  }
);

// Update offer (ADMIN only)
router.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, discount, imageUrl, expiresAt, isActive } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (discount !== undefined) updateData.discount = discount;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
    if (expiresAt !== undefined) updateData.expiresAt = new Date(expiresAt);
    if (isActive !== undefined) updateData.isActive = isActive;

    const offer = await prisma.offer.update({ where: { id }, data: updateData });

    return res.json({ success: true, data: offer });
  } catch (error) {
    console.error('Update offer error:', error);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update offer' } });
  }
});

export default router;
