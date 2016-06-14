SELECT distinct(ellis_act_evictions.petition), ellis_act_evictions.dirty_dozen, ellis_act_evictions.date, ellis_act_evictions.protected, ellis_act_evictions.landlord, ellis_act_evictions.units from ellis_act_evictions join blklot_ellis on (blklot_ellis.petition = ellis_act_evictions.petition) where blklot_ellis.blk_lot IN( + blk_lotParams.join(',') + ')', blk_lots)

Ellis.forge({})
