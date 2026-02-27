/**
 * Lightweight Dependency Injection Container
 * 
 * Supports lazy singleton instantiation — each service is created once
 * on first resolution and cached for subsequent resolves.
 * 
 * Usage:
 *   const container = new Container();
 *   container.register('logger', () => new ConsoleLogger());
 *   container.register('userService', (c) => new UserService(c.resolve('logger')));
 *   const userService = container.resolve('userService');
 */
class Container {
    constructor() {
        /** @type {Map<string, function(Container): any>} */
        this._factories = new Map();

        /** @type {Map<string, any>} */
        this._instances = new Map();
    }

    /**
     * Register a service factory.
     * @param {string} name — unique service identifier
     * @param {function(Container): any} factory — factory that receives the container
     * @returns {Container} — for chaining
     */
    register(name, factory) {
        if (typeof name !== 'string' || !name) {
            throw new Error('Service name must be a non-empty string');
        }
        if (typeof factory !== 'function') {
            throw new Error(`Factory for "${name}" must be a function`);
        }
        this._factories.set(name, factory);
        // Clear cached instance so re-registration takes effect
        this._instances.delete(name);
        return this;
    }

    /**
     * Resolve a service by name. Creates it on first call (lazy singleton).
     * @param {string} name — service identifier
     * @returns {any} — the resolved service instance
     */
    resolve(name) {
        if (this._instances.has(name)) {
            return this._instances.get(name);
        }

        const factory = this._factories.get(name);
        if (!factory) {
            throw new Error(`Service "${name}" is not registered in the container`);
        }

        const instance = factory(this);
        this._instances.set(name, instance);
        return instance;
    }

    /**
     * Check if a service is registered.
     * @param {string} name
     * @returns {boolean}
     */
    has(name) {
        return this._factories.has(name);
    }

    /**
     * Clear all cached instances (but keep registrations).
     * Useful for testing or hot-reloading.
     */
    reset() {
        this._instances.clear();
    }

    /**
     * Clear everything — both registrations and instances.
     */
    clear() {
        this._factories.clear();
        this._instances.clear();
    }
}

module.exports = Container;
