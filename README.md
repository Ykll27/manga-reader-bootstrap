# Kumo Reader

Base privada e sem anúncios para leitura de mangás, manhwas e manhuas, usando **Node.js + Express + EJS + Bootstrap 5 + SQLite**.

## Recursos

- Interface mobile-first em Bootstrap, com modo claro/escuro.
- Cadastro por código de convite e aprovação opcional pelo administrador.
- Login com sessão persistida em SQLite e senhas com bcrypt.
- Home, busca, detalhes, capítulos, leitor vertical, favoritos e histórico.
- Proxy no servidor e arquitetura de provedores (`MockProvider`, `NexusProvider`).
- Helmet, limite de tentativas no login e cookies `httpOnly`.

## Instalação

```bash
cp .env.example .env
npm install
npm run dev
```

Abra `http://localhost:3000`.

O projeto começa com `MANGA_PROVIDER=mock`, portanto funciona imediatamente. Para usar a Nexus, confirme os endpoints e o formato da resposta na documentação/credenciais oficiais, preencha as variáveis `NEXUS_*` e altere para `MANGA_PROVIDER=nexus`.

## Criando o administrador

Defina `ADMIN_EMAIL` no `.env`. A primeira conta cadastrada com esse e-mail recebe o papel `admin`. Se `REQUIRE_ADMIN_APPROVAL=true`, novos usuários ficam pendentes até serem aprovados em `/admin`.

## Adicionar outra fonte

1. Crie `src/providers/MinhaFonteProvider.js` estendendo `BaseProvider`.
2. Implemente `latest`, `search`, `details` e `chapter`.
3. Normalize a saída para os mesmos campos usados no `MockProvider`.
4. Registre a instância em `src/providers/index.js`.

## Observações importantes

- Não exponha tokens no navegador; guarde-os no `.env`.
- Em produção, use HTTPS, um `SESSION_SECRET` forte e PostgreSQL quando houver mais usuários.
- Use somente APIs, scans e obras que permitam redistribuição/visualização pelo seu aplicativo, respeitando termos de uso e direitos autorais.

## Integração real com MangaDex

O provedor `mangadex` é o padrão e oferece:

- busca de obras;
- lançamentos recentes;
- capas e metadados;
- capítulos em `pt-br` e `en`;
- páginas pelo MangaDex@Home;
- navegação entre capítulos.

Configuração:

```env
MANGA_PROVIDER=mangadex
MANGADEX_API_BASE_URL=https://api.mangadex.org
MANGADEX_UPLOADS_BASE_URL=https://uploads.mangadex.org
MANGADEX_LANGUAGES=pt-br,en
```

A aplicação solicita apenas títulos classificados como `safe` por padrão. Respeite os termos, limites e exigências de atribuição da fonte. Algumas obras podem não ter capítulos em português; nesses casos, o inglês é usado como alternativa.

## Próxima camada: AniList/Jikan

AniList e Jikan são adequados para enriquecer o catálogo com notas, popularidade, autores e recomendações. Eles não devem substituir o MangaDex no leitor, pois não fornecem as imagens das páginas dos capítulos.

## Integração de catálogo: AniList + Jikan

A leitura continua vindo da MangaDex. Ao abrir os detalhes de uma obra, o backend procura metadados pelo título:

1. AniList GraphQL como fonte principal;
2. Jikan REST como fallback automático;
3. MangaDex continua sendo a fonte de capítulos e páginas.

Rota de teste:

```text
GET /api/metadata/search?q=Chainsaw%20Man
GET /api/metadata/search?q=Chainsaw%20Man&source=anilist
GET /api/metadata/search?q=Chainsaw%20Man&source=jikan
```

O arquivo `jikanApi.json` enviado era uma resposta estática da rota de anime. Ele não é necessário para executar o projeto, pois o servidor consulta `/v4/manga` dinamicamente.

## Atualização PT-BR + tema preto e dourado

Esta versão vem configurada para usar somente capítulos em português brasileiro no MangaDex:

```env
MANGADEX_LANGUAGES=pt-br
```

Isso significa que alguns títulos podem aparecer com menos capítulos ou nenhum capítulo, caso ainda não exista tradução PT-BR disponível na fonte. O nome oficial de algumas obras ainda pode aparecer em inglês porque o próprio cadastro do MangaDex nem sempre possui título em português, mas a listagem/leitura dos capítulos fica filtrada em `pt-br`.

O tema visual foi atualizado para uma identidade preta e dourada usando Bootstrap + CSS customizado em `public/assets/app.css`.

## Módulo de Animes

A rota `/animes` adiciona um catálogo de animes usando Jikan/MyAnimeList. A Jikan entrega dados de catálogo, sinopse, capas, notas, trailers e lista de episódios, mas não entrega vídeos completos dos episódios.

Rotas novas:

```text
GET /animes
GET /anime/:id
GET /anime/:id/assistir/:episodeId
```

Para episódios completos, crie um arquivo local:

```bash
cp data/anime-sources.example.json data/anime-sources.json
```

Depois edite `data/anime-sources.json` com links próprios/autorizados, como `.mp4`, `.m3u8` tratado por player futuro, ou `embedUrl` oficial. Não use fontes sem permissão.

## Animes com fontes autorizadas

A área `/animes` usa Jikan/MyAnimeList apenas como catálogo. Para assistir episódios, configure fontes próprias ou autorizadas em:

```bash
cp data/anime-sources.example.json data/anime-sources.json
nano data/anime-sources.json
```

Formatos aceitos:

```json
{
  "ID_DO_ANIME_NO_JIKAN": {
    "episodes": {
      "1": {
        "title": "Episódio 1",
        "type": "mp4",
        "url": "https://seu-servidor/autorizado/ep1.mp4"
      },
      "2": {
        "title": "Episódio 2",
        "type": "hls",
        "url": "https://seu-servidor/autorizado/ep2/master.m3u8"
      },
      "3": {
        "title": "Episódio 3",
        "type": "embed",
        "url": "https://player-oficial-autorizado.com/embed/ep3"
      }
    }
  }
}
```

O progresso dos episódios é salvo automaticamente na Biblioteca para usuários logados.
