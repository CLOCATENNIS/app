"""Restauration d'une sauvegarde CLOCA (donnees.json) dans une base Postgres déjà dotée du schéma.
Usage : python3 restaurer.py donnees.json "psql -h ... -d ..."  (tout est rechargé dans une seule transaction)"""
import json,subprocess,sys,shlex
fichier, cmd = sys.argv[1], shlex.split(sys.argv[2])
d=json.load(open(fichier))
def psql(sql,one=False):
    r=subprocess.run(cmd+['-q','-tA','-v','ON_ERROR_STOP=1']+(['-1'] if one else []),input=sql,capture_output=True,text=True)
    return r.returncode, r.stdout.strip(), r.stderr.strip()[:500]
tables=list(d['tables'].keys())
rc,cols,err=psql("select c.relname||'|'||string_agg(quote_ident(a.attname), ',' order by a.attnum) from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped and a.attgenerated='' group by c.relname")
COLS=dict(l.split('|',1) for l in cols.splitlines())
sql="set session_replication_role=replica;\ncreate temp table j(x jsonb);\n\\set c `cat %s`\ninsert into j values (:'c'::jsonb);\n"%shlex.quote(fichier)
sql+="truncate auth.users, storage.objects, "+", ".join('public."%s"'%t for t in tables)+" cascade;\n"
sql+="insert into auth.users(id,email,created_at,last_sign_in_at) select (e->>'id')::uuid, e->>'email', (e->>'created_at')::timestamptz, (e->>'last_sign_in_at')::timestamptz from j, jsonb_array_elements(x->'comptes_auth') e;\n"
sql+="insert into storage.objects(bucket_id,name,metadata) select e->>'bucket', e->>'name', jsonb_build_object('size',e->>'size','mimetype',e->>'type') from j, jsonb_array_elements(x->'fichiers') e;\n"
for t in tables:
    c=COLS[t]
    sql+='insert into public."%s"(%s) overriding system value select %s from jsonb_populate_recordset(null::public."%s", (select x->\'tables\'->\'%s\' from j));\n'%(t,c,c,t,t)
rc,out,err=psql(sql,True); print('chargement', 'OK' if rc==0 else err)
bad=[]
for t in tables:
    rc,out,err=psql('select count(*) from public."%s"'%t)
    if int(out)!=len(d['tables'][t]): bad.append((t,out,len(d['tables'][t])))
print('tables',len(tables),'lignes',sum(len(v) for v in d['tables'].values()),'ecarts',bad or 'aucun')
q="""select format('select %L, count(*) from %s c where %s and not exists (select 1 from %s p where %s)', conname, conrelid::regclass, (select string_agg(format('c.%I is not null',a.attname),' and ') from unnest(conkey) k join pg_attribute a on a.attrelid=conrelid and a.attnum=k), confrelid::regclass, (select string_agg(format('p.%I = c.%I',fa.attname,ca.attname),' and ') from unnest(conkey,confkey) as u(ck,fk) join pg_attribute ca on ca.attrelid=conrelid and ca.attnum=u.ck join pg_attribute fa on fa.attrelid=confrelid and fa.attnum=u.fk)) from pg_constraint where contype='f' and connamespace='public'::regnamespace"""
rc,out,err=psql(q); orph=[]
for line in out.splitlines():
    n,c=psql(line)[1].split('|')
    if int(c)>0: orph.append((n,c))
print('liens verifies',len(out.splitlines()),'liens casses',orph or 'aucun')
