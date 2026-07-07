const BaseProvider = require('./BaseProvider');

const covers = [
  'https://placehold.co/600x900/212529/f8f9fa?text=Reino+da+Lua',
  'https://placehold.co/600x900/343a40/f8f9fa?text=Espada+Celeste',
  'https://placehold.co/600x900/495057/f8f9fa?text=Nivel+Infinito',
  'https://placehold.co/600x900/6c757d/f8f9fa?text=Alquimista'
];
const works = [
  { id:'reino-da-lua', title:'Reino da Lua', coverUrl:covers[0], synopsis:'Uma aprendiz descobre ruínas ligadas ao desaparecimento da antiga capital lunar.', genres:['Aventura','Fantasia'], status:'Em publicação' },
  { id:'espada-celeste', title:'A Espada Celeste', coverUrl:covers[1], synopsis:'Um guerreiro desacreditado recebe a missão de proteger uma cidade suspensa.', genres:['Ação','Drama'], status:'Em publicação' },
  { id:'nivel-infinito', title:'Nível Infinito', coverUrl:covers[2], synopsis:'Preso em uma torre, um jogador precisa vencer desafios usando inteligência e estratégia.', genres:['Ação','Fantasia'], status:'Em publicação' },
  { id:'alquimista-da-fronteira', title:'Alquimista da Fronteira', coverUrl:covers[3], synopsis:'Uma jovem alquimista viaja por vilas remotas resolvendo mistérios.', genres:['Mistério','Fantasia'], status:'Completo' }
].map((m, index) => ({...m, updatedAt:new Date(Date.now()-index*86400000).toISOString(), latestChapter:`Capítulo ${12-index}`}));

function chaptersFor(id) {
  return Array.from({length:12}, (_, i) => ({ id:String(12-i), title:`Capítulo ${12-i}`, number:12-i, publishedAt:new Date(Date.now()-i*604800000).toISOString() }));
}

class MockProvider extends BaseProvider {
  constructor(){ super('mock'); }
  async latest({page=1, limit=12}={}) { return { items:works.slice(0,limit), page:Number(page), hasNext:false }; }
  async search(query,{page=1}={}) { const q=String(query||'').toLowerCase(); return {items:works.filter(x=>x.title.toLowerCase().includes(q)||x.genres.join(' ').toLowerCase().includes(q)),page:Number(page),hasNext:false}; }
  async details(id) { const manga=works.find(x=>x.id===id); if(!manga) throw Object.assign(new Error('Obra não encontrada.'),{status:404}); return {...manga, chapters:chaptersFor(id)}; }
  async chapter(mangaId,chapterId) {
    const manga=await this.details(mangaId); const number=Number(chapterId); if(!Number.isInteger(number)||number<1||number>12) throw Object.assign(new Error('Capítulo não encontrado.'),{status:404});
    const pages=Array.from({length:8},(_,i)=>`https://placehold.co/900x1300/111827/e5e7eb?text=${encodeURIComponent(manga.title)}%0ACapitulo+${number}%0APagina+${i+1}`);
    return {manga:{id:manga.id,title:manga.title,coverUrl:manga.coverUrl},chapter:{id:String(number),title:`Capítulo ${number}`,number},pages,previousId:number>1?String(number-1):null,nextId:number<12?String(number+1):null};
  }
}
module.exports = MockProvider;
