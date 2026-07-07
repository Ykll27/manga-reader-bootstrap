const bcrypt = require('bcryptjs');
const db = require('../config/database');
const env = require('../config/env');

exports.loginPage=(req,res)=>res.render('auth/login',{title:'Entrar',next:req.query.next||'/'});
exports.registerPage=(req,res)=>res.render('auth/register',{title:'Criar conta'});
exports.login=(req,res)=>{
  const email=String(req.body.email||'').trim().toLowerCase(); const password=String(req.body.password||'');
  const user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if(!user||!bcrypt.compareSync(password,user.password_hash)) return res.status(401).render('auth/login',{title:'Entrar',next:req.body.next||'/',error:'E-mail ou senha inválidos.'});
  if(!user.approved) return res.status(403).render('auth/login',{title:'Entrar',next:'/',error:'Conta aguardando aprovação do administrador.'});
  req.session.user={id:user.id,name:user.name,email:user.email,role:user.role,approved:Boolean(user.approved)};
  res.redirect(req.body.next&&req.body.next.startsWith('/')?req.body.next:'/');
};
exports.register=(req,res)=>{
  const name=String(req.body.name||'').trim(); const email=String(req.body.email||'').trim().toLowerCase(); const password=String(req.body.password||''); const invite=String(req.body.inviteCode||'');
  if(name.length<2||!email.includes('@')||password.length<8) return res.status(400).render('auth/register',{title:'Criar conta',error:'Informe nome, e-mail válido e senha com pelo menos 8 caracteres.'});
  if(env.inviteCode&&invite!==env.inviteCode) return res.status(403).render('auth/register',{title:'Criar conta',error:'Código de convite inválido.'});
  try {
    const isAdmin=email===env.adminEmail; const approved=isAdmin||!env.requireAdminApproval;
    const info=db.prepare('INSERT INTO users(name,email,password_hash,role,approved) VALUES(?,?,?,?,?)').run(name,email,bcrypt.hashSync(password,12),isAdmin?'admin':'user',approved?1:0);
    if(!approved) return res.render('message',{title:'Cadastro recebido',message:'Sua conta foi criada e aguarda aprovação do administrador.'});
    req.session.user={id:Number(info.lastInsertRowid),name,email,role:isAdmin?'admin':'user',approved:true}; res.redirect('/');
  } catch(e){ if(String(e.message).includes('UNIQUE')) return res.status(409).render('auth/register',{title:'Criar conta',error:'Este e-mail já está cadastrado.'}); throw e; }
};
exports.logout=(req,res)=>req.session.destroy(()=>res.redirect('/'));
