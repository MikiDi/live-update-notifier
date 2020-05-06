import { querySudo, updateSudo } from '@lblod/mu-auth-sudo';
import { query, update, sparqlEscapeString, sparqlEscapeUri, uuid as generateUuid } from 'mu';
import { parseSparqlResults } from './util';

const SESSIONS_GRAPH = 'http://mu.semte.ch/graphs/sessions';
const SUBSCRIPTIONS_GRAPH = 'http://mu.semte.ch/graphs/subscriptions';

async function subscribe (sessionUri, headId, resources) {
  const subscriptionId = generateUuid();
  const queryString = `
PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

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
        ?session mu:uuid ?sessionId .
        ${sparqlEscapeUri(sessionUri)} mu:uuid ?sessionId .
    }
}
  `;
  await updateSudo(queryString);
  return {
    id: subscriptionId
  };
}

async function unSubscribe (sessionUri, headId, subscriptionId) {
  const queryString = `
PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

DELETE {
    GRAPH <${SUBSCRIPTIONS_GRAPH}> {
        ?subscription ?p ?o .
    }
}
WHERE {
    GRAPH <${SESSIONS_GRAPH}> {
        ?session mu:uuid ?sessionId .
        ${sparqlEscapeUri(sessionUri)} mu:uuid ?sessionId .
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
PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

SELECT DISTINCT (?subscription AS ?uri) ?id (?session AS ?sessionId) ?headId
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
        ?session mu:uuid ?sessid .
    }
}
  `;
  const result = await querySudo(queryString);
  return parseSparqlResults(result);
}

async function findSubscriptionsForSession (sessionUri, headId) {
  const queryString = `
PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

SELECT DISTINCT (?subscription AS ?uri) ?id
WHERE {
    GRAPH <${SUBSCRIPTIONS_GRAPH}> {
        ?subscription a ext:Subscription ;
            mu:uuid ?id ;
            ext:session ?session ;
            ext:headId ${sparqlEscapeString(headId)}  .
    }
    GRAPH <${SESSIONS_GRAPH}> {
        ?session mu:uuid ?sessid .
        ${sparqlEscapeUri(sessionUri)} mu:uuid ?sessid .
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
