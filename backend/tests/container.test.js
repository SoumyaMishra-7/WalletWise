const Container = require('../container');

describe('DI Container', () => {
    let container;

    beforeEach(() => {
        container = new Container();
    });

    describe('register and resolve', () => {
        it('should register and resolve a service', () => {
            container.register('greeting', () => 'Hello, World!');
            expect(container.resolve('greeting')).toBe('Hello, World!');
        });

        it('should pass the container to the factory', () => {
            container.register('config', () => ({ port: 3000 }));
            container.register('server', (c) => {
                const config = c.resolve('config');
                return { started: true, port: config.port };
            });

            const server = container.resolve('server');
            expect(server.started).toBe(true);
            expect(server.port).toBe(3000);
        });

        it('should throw for unregistered services', () => {
            expect(() => container.resolve('nonexistent')).toThrow(
                'Service "nonexistent" is not registered in the container'
            );
        });

        it('should throw for invalid registration name', () => {
            expect(() => container.register('', () => { })).toThrow(
                'Service name must be a non-empty string'
            );
        });

        it('should throw for non-function factory', () => {
            expect(() => container.register('bad', 'not a function')).toThrow(
                'Factory for "bad" must be a function'
            );
        });
    });

    describe('singleton behavior', () => {
        it('should return the same instance on multiple resolves', () => {
            let callCount = 0;
            container.register('counter', () => {
                callCount++;
                return { id: callCount };
            });

            const first = container.resolve('counter');
            const second = container.resolve('counter');

            expect(first).toBe(second);
            expect(callCount).toBe(1);
        });

        it('should create a new instance after reset', () => {
            let callCount = 0;
            container.register('counter', () => {
                callCount++;
                return { id: callCount };
            });

            const first = container.resolve('counter');
            container.reset();
            const second = container.resolve('counter');

            expect(first).not.toBe(second);
            expect(first.id).toBe(1);
            expect(second.id).toBe(2);
        });
    });

    describe('has', () => {
        it('should return true for registered services', () => {
            container.register('foo', () => 'bar');
            expect(container.has('foo')).toBe(true);
        });

        it('should return false for unregistered services', () => {
            expect(container.has('unknown')).toBe(false);
        });
    });

    describe('clear', () => {
        it('should clear all registrations and instances', () => {
            container.register('foo', () => 'bar');
            container.resolve('foo');
            container.clear();

            expect(container.has('foo')).toBe(false);
            expect(() => container.resolve('foo')).toThrow();
        });
    });

    describe('re-registration', () => {
        it('should allow overriding a registration', () => {
            container.register('service', () => 'original');
            container.resolve('service'); // cache it

            container.register('service', () => 'overridden');
            expect(container.resolve('service')).toBe('overridden');
        });
    });

    describe('chaining', () => {
        it('should support method chaining on register', () => {
            const result = container
                .register('a', () => 1)
                .register('b', () => 2)
                .register('c', (c) => c.resolve('a') + c.resolve('b'));

            expect(result).toBe(container);
            expect(container.resolve('c')).toBe(3);
        });
    });
});
