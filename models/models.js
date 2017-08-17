const { host, user, password, database } = require('../config');
const knex = require('knex')({
  client: 'pg',
  connection: { host, user, password, database, charset: 'utf8' }
});

const objection = require('objection');
const Model = objection.Model;
Model.knex(knex);

class Address extends Model {

  static get tableName() {
    return 'address_blklot';
  }

  static get idColumn() {
    return 'blk_lot';
  }

  static get relationMappings() {
    return {
      blockLots: {
        relation: Model.HasManyRelation,
        modelClass: BlockLotEllis,
        join: {
          from: 'address_blklot.blk_lot',
          to: 'blklot_ellis.blk_lot'
        }
      }
    };
  }
}

class Ellis extends Model {
  static get tableName() {
    return 'ellis_act_evictions';
  }

  static get idColumn() {
    return 'petition';
  }

  static get relationMappings() {
    return {
      blockLots: {
        relation: Model.HasManyRelation,
        modelClass: BlockLotEllis,
        join: {
          from: 'ellis_act_evictions.petition',
          to: 'blklot_ellis.petition'
        }
      },
      addresses: {
        relation: Model.ManyToManyRelation,
        modelClass: Address,
        join: {
          from: 'ellis_act_evictions.petition',
          through: {
            from: 'blklot_ellis.petition',
            to: 'blklot_ellis.blk_lot',
            modelClass: BlockLotEllis
          },
          to: 'address_blklot.blk_lot'
        }
      }
    };
  }

}

class BlockLotEllis extends Model {
  static get tableName() {
    return 'blklot_ellis';
  }

  static get idColumn() {
    return ['blk_lot', 'petition'];
  }

  static get relationMappings() {
    return {
      eviction: {
        relation: Model.BelongsToOneRelation,
        modelClass: Ellis,
        join: {
          from: 'blklot_ellis.petition',
          to: 'ellis_act_evictions.petition'
        }
      },
      addresses: {
        relation: Model.HasManyRelation,
        modelClass: Address,
        join: {
          from: 'blklot_ellis.blk_lot',
          to: 'address_blklot.blk_lot'
        }
      }
    }
  }
}

class Pledge extends Model {
  static get tableName() {
    return 'pledges';
  }

  static get idColumn() {
    return 'id';
  }

}


module.exports = {
  Address,
  Ellis,
  BlockLotEllis,
  Pledge,
  knex
};
