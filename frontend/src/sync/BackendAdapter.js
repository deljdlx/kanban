/**
 * BackendAdapter — Interface abstraite pour la communication backend.
 *
 * Définit le contrat que tout adapteur de synchronisation doit respecter.
 * L'implémentation par défaut (NoOpBackendAdapter) désactive le sync
 * backend tout en gardant le reste de la chaîne fonctionnel.
 *
 * Pour connecter un vrai backend REST, utiliser RestBackendAdapter.
 * @see RestBackendAdapter.js
 */

/**
 * Classe de base (abstraite). Chaque méthode lève une erreur
 * pour forcer les implémentations concrètes à tout overrider.
 */
export class BackendAdapter {
    /**
     * Envoie un batch d'opérations au backend.
     *
     * @param {string} _boardId - ID du board
     * @param {Array} _ops - Opérations de BoardDiffer
     * @param {number} _clientRevision - Révision côté client
     * @returns {Promise<{ serverRevision: number }>}
     */
    async pushOps(_boardId, _ops, _clientRevision) {
        throw new Error('BackendAdapter.pushOps() not implemented');
    }

    /**
     * Récupère les opérations depuis le backend depuis une révision donnée.
     *
     * @param {string} _boardId - ID du board
     * @param {number} _sinceRevision - Révision à partir de laquelle lire
     * @returns {Promise<{ ops: Array, serverRevision: number }>}
     */
    async pullOps(_boardId, _sinceRevision) {
        throw new Error('BackendAdapter.pullOps() not implemented');
    }

    /**
     * Récupère le snapshot complet d'un board depuis le backend.
     *
     * @param {string} _boardId - ID du board
     * @returns {Promise<Object|null>}
     */
    async fetchSnapshot(_boardId) {
        throw new Error('BackendAdapter.fetchSnapshot() not implemented');
    }

    /**
     * Envoie le snapshot complet d'un board au backend.
     *
     * @param {string} _boardId - ID du board
     * @param {Object} _snapshot - Board.toJSON()
     * @returns {Promise<{ serverRevision: number }>}
     */
    async pushSnapshot(_boardId, _snapshot) {
        throw new Error('BackendAdapter.pushSnapshot() not implemented');
    }
}

/**
 * NoOpBackendAdapter — Adapteur qui ne fait rien.
 *
 * Utilisé par défaut quand aucun backend n'est configuré.
 * Toutes les méthodes retournent des résultats vides,
 * ce qui désactive le sync backend sans erreur.
 */
export class NoOpBackendAdapter extends BackendAdapter {
    /** @returns {Promise<{ serverRevision: number }>} */
    async pushOps(_boardId, _ops, _clientRevision) {
        return { serverRevision: 0 };
    }

    /** @returns {Promise<{ ops: Array, serverRevision: number }>} */
    async pullOps(_boardId, _sinceRevision) {
        return { ops: [], serverRevision: 0 };
    }

    /** @returns {Promise<null>} */
    async fetchSnapshot(_boardId) {
        return null;
    }

    /** @returns {Promise<{ serverRevision: number }>} */
    async pushSnapshot(_boardId, _snapshot) {
        return { serverRevision: 0 };
    }
}
