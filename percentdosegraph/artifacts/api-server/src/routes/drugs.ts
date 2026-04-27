import { Router, type IRouter, type Request } from 'express';
import { CreateDrugBody } from '@workspace/api-zod';
import type { Logger } from 'pino';
import logger from '../lib/logger.js';
import { createDrug, deleteDrugById, getDrugById, listDrugs } from '../lib/store.js';

type LoggedRequest = Request & { log?: Logger };

const router: IRouter = Router();

function getLogger(req: Request) {
  return (req as LoggedRequest).log ?? logger;
}

router.get('/drugs', async (req, res) => {
  try {
    const drugs = await listDrugs();
    res.json(drugs);
  } catch (err) {
    getLogger(req).error({ err }, 'Failed to list drugs');
    res.status(500).json({ error: 'Failed to list drugs' });
  }
});

router.post('/drugs', async (req, res) => {
  try {
    const parsed = CreateDrugBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const drug = await createDrug(parsed.data);
    res.status(201).json(drug);
  } catch (err) {
    getLogger(req).error({ err }, 'Failed to create drug');
    res.status(500).json({ error: 'Failed to create drug' });
  }
});

router.get('/drugs/:id', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }

    const drug = await getDrugById(id);
    if (!drug) {
      res.status(404).json({ error: 'Drug not found' });
      return;
    }

    res.json(drug);
  } catch (err) {
    getLogger(req).error({ err }, 'Failed to get drug');
    res.status(500).json({ error: 'Failed to get drug' });
  }
});

router.delete('/drugs/:id', async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }

    const deletedDrug = await deleteDrugById(id);
    if (!deletedDrug) {
      res.status(404).json({ error: 'Drug not found' });
      return;
    }

    res.json(deletedDrug);
  } catch (err) {
    getLogger(req).error({ err }, 'Failed to delete drug');
    res.status(500).json({ error: 'Failed to delete drug' });
  }
});

export default router;
