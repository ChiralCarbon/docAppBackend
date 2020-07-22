class DependencyInjector {
    constructor() {
        this.injector = {}
    }

    factory(name, resolverFn) {
        this.injector[name] = resolverFn()
    }

    get(name) {
        return this.injector[name]
    }

    getAll() {
        return this.injector
    }
}

const injector = new DependencyInjector()

module.exports = injector
