import bodyParser from 'body-parser';
import { app, errorHandler } from 'mu';
import { verifyResourceAccess } from './queries/resource';
import { subscribe, unSubscribe, findSubscriptionsToResources } from './queries/subscription';
import { uniquifyDeltaSubjects } from './lib/delta';

/*
 * In this array we store the subscriptions that we received updates for, but the
 * client didn't re-request yet. This is a temporary solution. In the future we will rather
 * send out update notifications immediately.
 */
let dirtySubscriptions = [];

function verifyHeaders (req, res, next) {
  if (req.headers['mu-session-id'] && req.headers['mu-head-id']) {
    next();
  } else {
    throw new Error('Session or head id missing');
  }
}

app.post('/subscribe', verifyHeaders, async function (req, res) {
  if (Array.isArray(req.body.data)) {
    req.resources = req.body.data.map(r => r.id);
  } else if (req.body.data.id) {
    req.resources = [req.body.data.id];
  } else {
    throw new Error('Payload must be valid JSONAPI');
  }
  const verifiedResourceUris = verifyResourceAccess(req.resources);
  const subscription = await subscribe(req.headers['mu-session-id'], req.headers['mu-head-id'], verifiedResourceUris);
  const payload = {};
  payload.data = {
    type: 'subscription',
    id: subscription.id
  };
  res.status(201);
  res.send(payload);
});

app.delete('/subscriptions/:subscription_id', verifyHeaders, async function (req, res) { // unsubscribe
  await unSubscribe(req.headers['mu-session-id'], req.headers['mu-head-id'], req.params.subscription_id);
  res.status(201).end();
});

app.get('/subscriptions/:subscription_id', verifyHeaders, function (req, res) { // get status
  const subscription = dirtySubscriptions.find(s => {
    return s.id === req.params.subscription_id &&
      s.sessionId === req.headers['mu-session-id'] &&
      s.headId === req.headers['mu-head-id'];
  });
  if (subscription) {
    res.status(205).end(); // Reset content: Updates available, should reload
    const i = dirtySubscriptions.indexOf(subscription);
    dirtySubscriptions.splice(i, 1);
  } else {
    res.status(204).end(); // No Content: No updates for this resource
  }
});

app.post('/delta', bodyParser.json(), async function (req, res) {
  res.status(202).end();
  const subjects = uniquifyDeltaSubjects(req.body);
  const subscriptions = await findSubscriptionsToResources(subjects);
  dirtySubscriptions = dirtySubscriptions.concat(subscriptions);
});

app.use(errorHandler);
