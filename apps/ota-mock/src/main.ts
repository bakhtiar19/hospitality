import express, { Request, Response } from 'express';

const app = express();
const port = process.env.AGODA_MOCK_PORT || 4001;

app.use(express.json());
app.use(express.text({ type: ['*/xml', '+xml'] }));

// In-memory queue of pending reservations waiting to be pulled by PMS
let pendingReservations = [
  {
    channelReservationId: 'AGD-88291',
    hotelId: 'HOTEL-WINOTOSASTRO-AGD',
    roomTypeCode: 'AGD-RT-DLX',
    ratePlanCode: 'AGD-RP-BB',
    guest: {
      firstName: 'Bambang',
      lastName: 'Setyawan',
      email: 'bambang.setyawan@example.id',
      phone: '+6281234567890',
      nationality: 'ID',
    },
    stay: {
      checkInDate: '2026-11-25',
      checkOutDate: '2026-11-27',
      nights: 2,
      adults: 2,
      children: 0,
    },
    pricing: {
      currency: 'IDR',
      totalAmount: 1760000,
      dailyRates: [
        { date: '2026-11-25', amount: 880000 },
        { date: '2026-11-26', amount: 880000 },
      ],
    },
    status: 'CONFIRMED',
    action: 'NEW_BOOKING',
    specialRequests: 'High floor, quiet room requested. Late check-in around 19:00 WIB.',
    createdAt: new Date().toISOString(),
  },
];

// Error injection flag for testing resilience
let simulatedErrorMode: 'NONE' | 'RATE_LIMIT_429' | 'TIMEOUT_504' | 'AUTH_401' = 'NONE';

// 1. Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    channel: 'AGODA_MOCK',
    latencyMs: 38,
    simulatedErrorMode,
    pendingReservationsCount: pendingReservations.length,
    timestamp: new Date().toISOString(),
  });
});

app.get('/agoda/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    channel: 'AGODA_ARI_V2',
    hotelId: 'HOTEL-WINOTOSASTRO-AGD',
    latencyMs: 38,
    version: '2026.11-SANDBOX',
    timestamp: new Date().toISOString(),
  });
});

// Middleware to inject simulated errors if active
app.use((req: Request, res: Response, next) => {
  if (req.path.startsWith('/agoda/simulate')) {
    return next();
  }

  if (simulatedErrorMode === 'RATE_LIMIT_429') {
    return res.status(429).json({
      error: 'AgodaRateLimitExceeded',
      message: 'Too many requests. Quota exceeded for property HOTEL-WINOTOSASTRO-AGD. Retry-After: 5s',
    });
  }

  if (simulatedErrorMode === 'AUTH_401') {
    return res.status(401).json({
      error: 'AgodaAuthenticationFailed',
      message: 'Invalid API key or extranet credentials signature',
    });
  }

  if (simulatedErrorMode === 'TIMEOUT_504') {
    return setTimeout(() => {
      res.status(504).json({
        error: 'AgodaGatewayTimeout',
        message: 'Agoda Extranet ARI gateway timed out upstream',
      });
    }, 1500);
  }

  next();
});

// 2. ARI - Push Availability
// ASSUMPTION: Agoda ARI connectivity endpoint
app.post('/agoda/ari/availability', (req: Request, res: Response) => {
  const payload = req.body;
  console.log('[Agoda Mock] Received Availability Push:', JSON.stringify(payload).slice(0, 200));

  res.json({
    status: 'Success',
    echoToken: `ACK-${Date.now()}`,
    timestamp: new Date().toISOString(),
    message: 'Availability matrix successfully synced to Agoda Extranet inventory ledger',
    receivedUpdates: Array.isArray(payload?.updates) ? payload.updates.length : 1,
  });
});

// 3. ARI - Push Rates
// ASSUMPTION: Agoda ARI connectivity endpoint
app.post('/agoda/ari/rates', (req: Request, res: Response) => {
  const payload = req.body;
  console.log('[Agoda Mock] Received Rates Push:', JSON.stringify(payload).slice(0, 200));

  res.json({
    status: 'Success',
    echoToken: `ACK-${Date.now()}`,
    timestamp: new Date().toISOString(),
    message: 'Rate plans and daily pricing matrices updated successfully',
    receivedUpdates: Array.isArray(payload?.updates) ? payload.updates.length : 1,
  });
});

// 4. ARI - Push Restrictions
// ASSUMPTION: Agoda ARI connectivity endpoint
app.post('/agoda/ari/restrictions', (req: Request, res: Response) => {
  const payload = req.body;
  console.log('[Agoda Mock] Received Restrictions Push:', JSON.stringify(payload).slice(0, 200));

  res.json({
    status: 'Success',
    echoToken: `ACK-${Date.now()}`,
    timestamp: new Date().toISOString(),
    message: 'Restrictions (CTA, CTD, MinStay, StopSell) successfully applied',
    receivedUpdates: Array.isArray(payload?.updates) ? payload.updates.length : 1,
  });
});

// 5. Pull Reservations
// ASSUMPTION: Agoda ARI connectivity endpoint
app.get('/agoda/reservations/pending', (_req: Request, res: Response) => {
  res.json({
    status: 'Success',
    reservations: pendingReservations,
    count: pendingReservations.length,
    timestamp: new Date().toISOString(),
  });
});

// 6. Acknowledge Reservation
app.post('/agoda/reservations/:id/ack', (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLength = pendingReservations.length;
  pendingReservations = pendingReservations.filter((r) => r.channelReservationId !== id);

  console.log(`[Agoda Mock] Acknowledged reservation ${id}. Pending count: ${pendingReservations.length}`);

  res.json({
    status: 'Success',
    channelReservationId: id,
    acknowledged: true,
    wasFound: initialLength !== pendingReservations.length,
    timestamp: new Date().toISOString(),
  });
});

// 7. Simulation Triggers (for testing and UI demos)
app.post('/agoda/simulate/booking', (req: Request, res: Response) => {
  const newBooking = {
    channelReservationId: req.body.channelReservationId || `AGD-${Math.floor(10000 + Math.random() * 90000)}`,
    hotelId: req.body.hotelId || 'HOTEL-WINOTOSASTRO-AGD',
    roomTypeCode: req.body.roomTypeCode || 'AGD-RT-DLX',
    ratePlanCode: req.body.ratePlanCode || 'AGD-RP-BB',
    guest: {
      firstName: req.body.guest?.firstName || 'Rian',
      lastName: req.body.guest?.lastName || 'Pratama',
      email: req.body.guest?.email || 'rian.pratama@example.com',
      phone: req.body.guest?.phone || '+6281987654321',
      nationality: 'ID',
    },
    stay: {
      checkInDate: req.body.stay?.checkInDate || '2026-11-26',
      checkOutDate: req.body.stay?.checkOutDate || '2026-11-28',
      nights: 2,
      adults: 2,
      children: 0,
    },
    pricing: {
      currency: 'IDR',
      totalAmount: req.body.pricing?.totalAmount || 1760000,
      dailyRates: [
        { date: '2026-11-26', amount: 880000 },
        { date: '2026-11-27', amount: 880000 },
      ],
    },
    status: 'CONFIRMED',
    action: 'NEW_BOOKING',
    specialRequests: req.body.specialRequests || 'Simulated Agoda reservation from test runner',
    createdAt: new Date().toISOString(),
  };

  pendingReservations.push(newBooking);
  res.json({
    message: 'Simulated Agoda reservation queued successfully',
    booking: newBooking,
    pendingReservationsCount: pendingReservations.length,
  });
});

app.post('/agoda/simulate/error', (req: Request, res: Response) => {
  const { mode } = req.body;
  if (!['NONE', 'RATE_LIMIT_429', 'TIMEOUT_504', 'AUTH_401'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode. Use NONE, RATE_LIMIT_429, TIMEOUT_504, or AUTH_401' });
  }

  simulatedErrorMode = mode;
  res.json({
    message: `Simulated error mode set to ${simulatedErrorMode}`,
    simulatedErrorMode,
  });
});

app.listen(port, () => {
  console.log(`[Agoda Mock Sandbox] Running on port ${port}`);
});
