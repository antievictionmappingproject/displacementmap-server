SELECT distinct(ellis_act_evictions.petition), ellis_act_evictions.dirty_dozen, ellis_act_evictions.date, ellis_act_evictions.protected, ellis_act_evictions.landlord, ellis_act_evictions.units from ellis_act_evictions join blklot_ellis on (blklot_ellis.petition = ellis_act_evictions.petition) where blklot_ellis.blk_lot IN( + blk_lotParams.join(',') + ')', blk_lots)

Ellis.forge({})


SELECT blklot_ellis.petition, units, landlord, date, protected, dirty_dozen, address, latitude::text || '|' || longitude::text AS loc FROM blklot_ellis JOIN ellis_act_evictions ON (blklot_ellis.petition = ellis_act_evictions.petition) JOIN address_blklot ON (blklot_ellis.blk_lot = address_blklot.blk_lot) ORDER BY (address_blklot.latitude, address_blklot.longitude)
-- 2975 rows
-- BlockLotEllis
-- Ellis
-- Address


-- Ellises
select blklot_ellis.petition, units, landlord, date, protected, dirty_dozen, address, latitude::text || '|' || longitude::text AS loc from blklot_ellis join ellis_act_evictions on (blklot_ellis.petition = ellis_act_evictions.petition) join address_blklot on (blklot_ellis.blk_lot = address_blklot.blk_lot) order by (address_blklot.latitude, address_blklot.longitude)
-- blklot_ellis
-- ellis_act_evictions
-- address_blklot
-- 2975 rows
-- petition, units, landlord, date, protected, dirty_dozen, address, loc
select block_lot.petition, units, landlord, date, protected, dirty_dozen, address, latitude::text || '|' || longitude::text as loc FROM ellis_act_evictions AS ellis JOIN blklot_ellis AS block_lot USING (petition) JOIN address_blklot USING (blk_lot);
