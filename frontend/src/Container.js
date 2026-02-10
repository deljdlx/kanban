/**
 * Container — Service locator léger.
 *
 * Registre centralisé des singletons de l'application.
 * Permet de récupérer n'importe quel service par son nom,
 * et de les remplacer facilement en test via reset() + set().
 *
 * Ce n'est pas une classe : il n'y en aura jamais qu'un seul.
 * La Map interne est encapsulée en closure pour éviter
 * toute manipulation directe.
 *
 * @example
 * // Enregistrement (fait automatiquement par chaque service)
 * Container.set('BoardService', boardServiceInstance);
 *
 * // Récupération
 * const bs = Container.get('BoardService');
 *
 * // En test
 * Container.reset();
 * Container.set('BoardService', fakeBoardService);
 */

/** @type {Map<string, *>} */
const _services = new Map();

const Container = {
    /**
     * Enregistre un service dans le conteneur.
     * Émet un warning si un service du même nom est déjà enregistré.
     *
     * @param {string} name - Clé unique du service (ex: 'BoardService')
     * @param {*} instance - Instance du service
     */
    set(name, instance) {
        if (_services.has(name)) {
            console.warn(`Container : le service "${name}" est déjà enregistré.`);
        }
        _services.set(name, instance);
    },

    /**
     * Récupère un service par son nom.
     * Lève une erreur si le service n'existe pas, avec la liste
     * des services disponibles pour faciliter le debug.
     *
     * @param {string} name - Clé du service
     * @returns {*} L'instance enregistrée
     */
    get(name) {
        if (!_services.has(name)) {
            const available = [..._services.keys()].sort().join(', ') || '(aucun)';
            throw new Error(`Container : service "${name}" introuvable. Services disponibles : ${available}`);
        }
        return _services.get(name);
    },

    /**
     * Vérifie si un service est enregistré.
     *
     * @param {string} name - Clé du service
     * @returns {boolean}
     */
    has(name) {
        return _services.has(name);
    },

    /**
     * Vide le conteneur. Utilisé dans les tests pour repartir
     * d'un état propre avant chaque scénario.
     */
    reset() {
        _services.clear();
    },
};

export default Container;
