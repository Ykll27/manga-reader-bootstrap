const metadataService=require('../services/MetadataService');
const db=require('../config/database');
exports.toggleFavorite=(req,res)=>{const {provider,mangaId,title,coverUrl}=req.body; if(!provider||!mangaId||!title)return res.status(400).json({error:'Dados incompletos.'}); const found=db.prepare('SELECT id FROM favorites WHERE user_id=? AND provider=? AND manga_id=?').get(req.session.user.id,provider,mangaId); if(found){db.prepare('DELETE FROM favorites WHERE id=?').run(found.id); return res.json({favorite:false});} db.prepare('INSERT INTO favorites(user_id,provider,manga_id,title,cover_url) VALUES(?,?,?,?,?)').run(req.session.user.id,provider,mangaId,title,coverUrl||''); res.json({favorite:true});};
exports.saveProgress=(req,res)=>{const {provider,mangaId,mangaTitle,coverUrl,chapterId,chapterTitle,scrollPosition=0}=req.body; if(!provider||!mangaId||!chapterId)return res.status(400).json({error:'Dados incompletos.'}); db.prepare(`INSERT INTO reading_progress(user_id,provider,manga_id,manga_title,cover_url,chapter_id,chapter_title,scroll_position,updated_at) VALUES(?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id,provider,manga_id) DO UPDATE SET chapter_id=excluded.chapter_id,chapter_title=excluded.chapter_title,scroll_position=excluded.scroll_position,manga_title=excluded.manga_title,cover_url=excluded.cover_url,updated_at=CURRENT_TIMESTAMP`).run(req.session.user.id,provider,mangaId,mangaTitle||'',coverUrl||'',chapterId,chapterTitle||'',Number(scrollPosition)||0); res.json({saved:true});};

exports.searchMetadata=async(req,res)=>{const title=String(req.query.q||'').trim(); if(!title)return res.status(400).json({error:'Informe q.'}); const source=String(req.query.source||'auto'); let data=null; if(source==='anilist')data=await metadataService.searchAniList(title); else if(source==='jikan')data=await metadataService.searchJikan(title); else data=await metadataService.getBest(title); res.json({data});};

// A MangaDex proíbe hotlink direto de suas imagens (uploads.mangadex.org / *.mangadex.network):
// pedidos feitos diretamente pelo navegador do usuário recebem uma resposta propositalmente errada.
// Por isso o servidor precisa buscar a imagem (server-to-server) e repassá-la para o navegador.
const ALLOWED_IMAGE_HOSTS=/(^|\.)mangadex\.(org|network)$/i;
exports.proxyImage=async(req,res)=>{
  const target=String(req.query.url||'');
  let parsed;
  try{ parsed=new URL(target); }catch{ return res.status(400).send('URL inválida.'); }
  if(parsed.protocol!=='https:'||!ALLOWED_IMAGE_HOSTS.test(parsed.hostname)) return res.status(400).send('Host de imagem não permitido.');
  try{
    const upstream=await fetch(parsed,{headers:{'User-Agent':'PrivateMangaReader/1.1',Accept:'image/*'},signal:AbortSignal.timeout(15000)});
    if(!upstream.ok||!upstream.body) return res.status(502).send('Falha ao buscar imagem na fonte.');
    res.set('Content-Type',upstream.headers.get('content-type')||'image/jpeg');
    res.set('Cache-Control','public, max-age=86400, immutable');
    const buffer=Buffer.from(await upstream.arrayBuffer());
    res.send(buffer);
  }catch(err){
    res.status(502).send('Erro ao carregar imagem.');
  }
};
