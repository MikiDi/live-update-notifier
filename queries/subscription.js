import { querySudo, updateSudo } from '@lblod/mu-auth-sudo';
import { query, update, sparqlEscapeString, sparqlEscapeUri, uuid as generateUuid } from 'mu';
import { parseSparqlResults } from './util';

const SESSIONS_GRAPH = 'http://mu.semte.ch/graphs/sessions';
const SUBSCRIPTIONS_GRAPH = 'http://mu.semte.ch/graphs/subscriptions';

async function subscribe (sessionId, headId, resources) {
  const subscriptionId = generateUuid();
  const queryString = `
INSERT {
    GRAPH <${SUBSCRIPTIONS_GRAPH}> {
        ?subscription a ext:Subscription ;
            mu:uuid ${sparqlEscapeString(subscriptionId)} ;
            ext:session ?session ;
            ext:headId ${sparqlEscapeString(headId)} ;
            ext:resources ${resources.map(sparqlEscapeUri).join(', ')} .
    }
}
WHERE {
    GRAPH <${SESSIONS_GRAPH}> {
        ?session mu:uuid ${sparqlEscapeString(sessionId)} .
    }
}
  `;
  await updateSudo(queryString);
  return {
    id: subscriptionId
  };
}

async function unSubscribe (sessionId, headId, subscriptionId) {
  const queryString = `
DELETE {
    GRAPH <${SUBSCRIPTIONS_GRAPH}> {
        ?subscription ?p ?o .
    }
}
WHERE {
    GRAPH <${SESSIONS_GRAPH}> {
        ?session mu:uuid ${sparqlEscapeString(sessionId)} .
    }
    GRAPH <${SUBSCRIPTIONS_GRAPH}> {
        ?subscription a ext:Subscription ;
            mu:uuid ${sparqlEscapeString(subscriptionId)} ;
            ext:session ?session ;
            ext:headId ${sparqlEscapeString(headId)} ;
            ?p ?o .
    }
}
  `;
  return updateSudo(queryString);
}

async function findSubscriptionsToResources (resources) {
  const queryString = `
SELECT DISTINCT (?subscription AS ?uri) ?id ?sessionId ?headId
WHERE {
    GRAPH <${SUBSCRIPTIONS_GRAPH}> {
        ?subscription a ext:Subscription ;
            mu:uuid ?id ;
            ext:session ?session ;
            ext:headId ?headId ;
            ext:resources ?resource .
        VALUES ?resource {
            ${resources.map(sparqlEscapeUri).join('\n                ')}
        }
    }
    GRAPH <${SESSIONS_GRAPH}> {
        ?session mu:uuid ?sessionId .
    }
}
  `;
  const result = await querySudo(queryString);
  return parseSparqlResults(result);
}

async function findSubscriptionsForSession (sessionId, headId) {
  const queryString = `
SELECT DISTINCT (?subscription AS ?uri) ?id ?sessionId ?headId
WHERE {
    GRAPH <${SUBSCRIPTIONS_GRAPH}> {
        ?subscription a ext:Subscription ;
            mu:uuid ?id ;
            ext:session ?session ;
            ext:headId ?headId .
    }
    GRAPH <${SESSIONS_GRAPH}> {
        ?session mu:uuid ?sessionId .
    }
}
  `;
  const result = await querySudo(queryString);
  return parseSparqlResults(result);
}

export {
  subscribe,
  unSubscribe,
  findSubscriptionsToResources,
  findSubscriptionsForSession
};
