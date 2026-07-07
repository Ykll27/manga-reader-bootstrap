const BaseProvider = require('./BaseProvider');

class NexusProvider extends BaseProvider {
  constructor(config){ super('nexus'); this.config=config; }
  buildPath(template, values={}) {
    if (!template) throw Object.assign(new Error('Endpoint Nexus não configurado no .env.'), {status:503});
    return template.replace(/\{(\w+)\}/g, (_,key)=>encodeURIComponent(values[key] ?? ''));
  }
  async request(path) {
    const url = new URL(path, this.config.baseUrl);
    const headers = { Accept:'application/json', 'User-Agent':'PrivateMangaReader/1.0' };
    if (this.config.token) headers.Authorization = `Bearer ${this.config.token}`;
    const response = await fetch(url, {headers, signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw Object.assign(new Error(`A fonte respondeu com HTTP ${response.status}.`),{status:502});
    return response.json();
  }
  normalizeList(payload) {
    const raw = payload.items || payload.results || payload.data || [];
    return raw.map(x=>({
      id:String(x.id ?? x.slug), title:x.title ?? x.name ?? 'Sem título', coverUrl:x.coverUrl ?? x.cover ?? x.thumbnail ?? '',
      latestChapter:x.latestChapter?.title ?? x.latest_chapter ?? x.chapter ?? '', updatedAt:x.updatedAt ?? x.updated_at ?? null,
      synopsis:x.synopsis ?? x.description ?? '', genres:x.genres ?? [], status:x.status ?? ''
    }));
  }
  async latest({page=1}={}) { const p=await this.request(this.buildPath(this.config.latestPath,{page})); return {items:this.normalizeList(p),page:Number(page),hasNext:Boolean(p.hasNext ?? p.next_page)}; }
  async search(query,{page=1}={}) { const p=await this.request(this.buildPath(this.config.searchPath,{query,page})); return {items:this.normalizeList(p),page:Number(page),hasNext:Boolean(p.hasNext ?? p.next_page)}; }
  async details(id) {
    const p=await this.request(this.buildPath(this.config.detailsPath,{id})); const x=p.data||p;
    const chapters=(x.chapters||[]).map(c=>({id:String(c.id??c.slug??c.number),title:c.title??`Capítulo ${c.number??''}`,number:Number(c.number??0),publishedAt:c.publishedAt??c.published_at??null}));
    return {id:String(x.id??x.slug),title:x.title??x.name,coverUrl:x.coverUrl??x.cover??x.thumbnail??'',synopsis:x.synopsis??x.description??'',genres:x.genres??[],status:x.status??'',chapters:chapters.sort((a,b)=>b.number-a.number)};
  }
  async chapter(mangaId,chapterId) {
    const p=await this.request(this.buildPath(this.config.chapterPath,{id:mangaId,chapterId})); const x=p.data||p;
    return {manga:{id:String(mangaId),title:x.manga?.title??x.title??'Obra',coverUrl:x.manga?.coverUrl??''},chapter:{id:String(chapterId),title:x.chapter?.title??x.chapterTitle??`Capítulo ${chapterId}`,number:Number(x.chapter?.number??chapterId)},pages:x.pages??x.images??[],previousId:x.previousId??x.previous_chapter_id??null,nextId:x.nextId??x.next_chapter_id??null};
  }
}
module.exports = NexusProvider;
