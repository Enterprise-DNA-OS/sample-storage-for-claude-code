insert into storage_units(id,code,name,min_c,max_c) values
 ('10000000-0000-4000-8000-000000000001','FZ-80','South freezer',-85,-70),
 ('10000000-0000-4000-8000-000000000002','FZ-20','North freezer',-25,-15) on conflict do nothing;
insert into boxes(id,code,storage_unit_id,rows,columns) values
 ('20000000-0000-4000-8000-000000000001','BOX-A','10000000-0000-4000-8000-000000000001',3,3),
 ('20000000-0000-4000-8000-000000000002','BOX-B','10000000-0000-4000-8000-000000000002',2,3) on conflict do nothing;
insert into samples(id,code,name,material,quantity,unit,owner,review_due,expires,status,box_id,position,held,hold_reason,borrower,return_due) values
 ('30000000-0000-4000-8000-000000000001','ALG-001','Coastal algae reference','algae extract',12,'mL','Mara',current_date-4,current_date+12,'stored','20000000-0000-4000-8000-000000000001',1,false,'',null,null),
 ('30000000-0000-4000-8000-000000000002','ALG-002','Coastal algae replicate','algae extract',4,'mL','Mara',current_date+30,current_date+90,'checked_out','20000000-0000-4000-8000-000000000001',2,false,'','Noah',current_date-3),
 ('30000000-0000-4000-8000-000000000003','SOIL-001','Estuary soil reference','soil',8,'g','Tui',current_date-10,current_date-1,'stored','20000000-0000-4000-8000-000000000002',1,true,'Container seal requires inspection',null,null),
 ('30000000-0000-4000-8000-000000000004','SEED-001','Coastal seed archive','seed',30,'count','Tui',current_date+60,current_date+180,'stored','20000000-0000-4000-8000-000000000002',2,false,'',null,null)
 on conflict do nothing;
insert into observations(id,storage_unit_id,temperature_c,observed_at,actor,note) values
 ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',-79,now()-interval '2 hours','Mara','Fictional manual reading'),
 ('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',-12,now()-interval '27 hours','Tui','Fictional manual reading; check equipment') on conflict do nothing;
insert into events(id,sample_id,action,actor,note,after_record)
 select s.id,s.id,'seed','Demo','Fictional nonclinical research material',to_jsonb(s) from samples s where s.code in ('ALG-001','ALG-002','SOIL-001','SEED-001') on conflict do nothing;
