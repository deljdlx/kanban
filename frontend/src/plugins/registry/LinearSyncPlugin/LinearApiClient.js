/**
 * LinearApiClient — Client GraphQL minimaliste pour l'API Linear.
 *
 * Effectue des requetes directes depuis le navigateur (CORS active
 * par Linear). Le token API est configure via setToken().
 *
 * Point d'entree unique : _query(graphql, variables) qui envoie
 * un POST a https://api.linear.app/graphql avec le Bearer token.
 */

const LINEAR_API_URL = 'https://api.linear.app/graphql';

export default class LinearApiClient {
    /**
     * Token API Linear (Bearer).
     * @type {string|null}
     */
    _token = null;

    /**
     * Configure le token API.
     *
     * @param {string|null} token
     */
    setToken(token) {
        this._token = token;
    }

    /**
     * Recupere la liste des equipes.
     *
     * @returns {Promise<Array<{ id: string, name: string, key: string }>>}
     */
    async fetchTeams() {
        const query = `
            query {
                teams {
                    nodes { id name key }
                }
            }
        `;
        const data = await this._query(query);
        return data.teams.nodes;
    }

    /**
     * Recupere les workflow states d'une equipe.
     *
     * @param {string} teamId
     * @returns {Promise<Array<{ id: string, name: string, type: string, color: string }>>}
     */
    async fetchWorkflowStates(teamId) {
        const query = `
            query($teamId: ID!) {
                workflowStates(
                    filter: { team: { id: { eq: $teamId } } }
                    first: 50
                ) {
                    nodes { id name type color position }
                }
            }
        `;
        const data = await this._query(query, { teamId });
        // Tri par position pour un affichage coherent
        return data.workflowStates.nodes.sort((a, b) => a.position - b.position);
    }

    /**
     * Recupere les issues d'une equipe filtrees par state IDs.
     *
     * @param {string} teamId
     * @param {string[]} stateIds - IDs des workflow states a inclure
     * @returns {Promise<Array>} Issues avec state, assignee, labels, etc.
     */
    async fetchIssues(teamId, stateIds) {
        const query = `
            query($teamId: ID!, $stateIds: [ID!]) {
                issues(
                    filter: {
                        team: { id: { eq: $teamId } }
                        state: { id: { in: $stateIds } }
                    }
                    first: 200
                    orderBy: updatedAt
                ) {
                    nodes {
                        id
                        identifier
                        title
                        description
                        state { id name color type }
                        assignee { id name }
                        priority
                        labels { nodes { id name color } }
                        url
                        updatedAt
                    }
                }
            }
        `;
        const data = await this._query(query, { teamId, stateIds });
        return data.issues.nodes;
    }

    /**
     * Execute une requete GraphQL contre l'API Linear.
     *
     * @param {string} query - Requete GraphQL
     * @param {Object} [variables={}] - Variables de la requete
     * @returns {Promise<Object>} Donnees de la reponse
     * @throws {Error} Si le token n'est pas configure ou si l'API retourne une erreur
     * @private
     */
    async _query(query, variables = {}) {
        if (!this._token) {
            throw new Error('Token API Linear non configure');
        }

        const response = await fetch(LINEAR_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: this._token,
            },
            body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
            throw new Error(`Linear API : ${response.status} ${response.statusText}`);
        }

        const json = await response.json();

        if (json.errors && json.errors.length > 0) {
            throw new Error(`Linear API : ${json.errors[0].message}`);
        }

        return json.data;
    }
}
