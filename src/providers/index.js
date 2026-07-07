const env = require('../config/env');
const MockProvider = require('./MockProvider');
const NexusProvider = require('./NexusProvider');
const MangaDexProvider = require('./MangaDexProvider');

const providers = {
  mock: new MockProvider(),
  mangadex: new MangaDexProvider(env.mangadex),
  nexus: new NexusProvider(env.nexus)
};
function getProvider(name=env.mangaProvider) {
  const provider=providers[name];
  if(!provider) throw Object.assign(new Error(`Provedor desconhecido: ${name}`),{status:400});
  return provider;
}
module.exports = { getProvider, providers };
