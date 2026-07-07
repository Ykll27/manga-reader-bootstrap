class BaseProvider {
  constructor(name) { this.name = name; }
  async latest() { throw new Error('latest() não implementado'); }
  async search() { throw new Error('search() não implementado'); }
  async details() { throw new Error('details() não implementado'); }
  async chapter() { throw new Error('chapter() não implementado'); }
}
module.exports = BaseProvider;
