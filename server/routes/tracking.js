/**
 * Tracking router (ticket #10).
 *
 * Public POST /api/track-visit. Public GET /api/visit-count.
 *
 * Both endpoints go through the visits storage seam (ADR-0001): the
 * shared `store` passed in by the composer is the same instance the
 * other domain routers use, so writes from one route are visible to
 * reads from another (and to the boot sync on next process start).
 */
const express = require('express');
const { createVisitsAccess } = require('../storage/visitsAccess');
const { StrictRemoteWriteError } = require('../storage/remoteAdapter');

/**
 * Parse `req.query.strict === 'true'` once at the top of every mutating
 * route. Forwarded to the store seam so remote-write failures can be
 * surfaced as HTTP 502 (ticket #11). Default behavior is unchanged.
 */
function strictFromQuery(req) {
  return { strict: req.query.strict === 'true' };
}

function createTrackingRouter(store) {
  const router = express.Router();
  const visitsAccess = createVisitsAccess({ store });

   // POST /api/track-visit — increment total visits.
   router.post('/api/track-visit', async (req, res, next) => {
     try {
       const visitsData = await visitsAccess.readVisitsData();
       visitsData.totalVisits += 1;
 
       if (await visitsAccess.writeVisitsData(visitsData, strictFromQuery(req))) {
         console.log(`Visit tracked. Total visits: ${visitsData.totalVisits}`);
         res.json({ success: true, totalVisits: visitsData.totalVisits });
       } else {
         res.status(500).json({ success: false, error: 'Failed to save visit data' });
       }
     } catch (error) {
      if (error instanceof StrictRemoteWriteError) return next(error);
       console.error('Error tracking visit:', error);
       res.status(500).json({ success: false, error: 'Internal server error' });
     }
   });

  // GET /api/visit-count — public read of the counter.
  router.get('/api/visit-count', async (req, res) => {
    try {
      const visitsData = await visitsAccess.readVisitsData();
      res.json({ totalVisits: visitsData.totalVisits });
    } catch (error) {
      console.error('Error getting visit count:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = { createTrackingRouter };
