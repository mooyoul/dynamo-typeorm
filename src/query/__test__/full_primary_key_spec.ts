import * as chai from 'chai';
const expect = chai.expect;

import { Table } from '../../table';
import * as Metadata from '../../metadata';

import { FullPrimaryKey } from '../full_primary_key';

import {
  Table as TableDecorator,
  Attribute as AttributeDecorator,
  FullPrimaryKey as FullPrimaryKeyDecorator,
} from '../../decorator';

import * as Query from '../index';
import Config from '../../config';

@TableDecorator({ name: "prod-Card" })
class Card extends Table {
  @AttributeDecorator()
  public id: number;

  @AttributeDecorator()
  public title: string;

  @AttributeDecorator()
  public count: number;

  @FullPrimaryKeyDecorator('id', 'title')
  static readonly primaryKey: Query.FullPrimaryKey<Card, number, string>;
}

describe("FullPrimaryKey", () => {
  let primaryKey: FullPrimaryKey<Card, number, string>;

  beforeEach(async() => {
    await Card.createTable();

    primaryKey = new FullPrimaryKey<Card, number, string>(
      Card,
      Card.metadata.primaryKey as Metadata.Indexes.FullPrimaryKeyMetadata,
      Config.documentClient
    );
  });

  afterEach(async () => {
    await Card.dropTable();
  });

  describe("#delete", async () => {
    it("should delete item if exist", async () => {
      await Config.documentClient.put({
        TableName: Card.metadata.name,
        Item: {
          id: 10,
          title: "abc",
        }
      }).promise();

      await primaryKey.delete(10, "abc");

      expect(await primaryKey.get(10, "abc")).to.be.null;
    });

    // it("should return false if item not exist", async () => {
    //   const deleted = await primaryKey.delete(10, "abc");
    //   expect(deleted).to.be.false;
    // });
  });

  describe("#get", async () => {
    it("should find item", async () => {
      const item = await primaryKey.get(10, "abc");
      expect(item).to.be.null;
    });

    it("should find item", async () => {
      await Config.documentClient.put({
        TableName: Card.metadata.name,
        Item: {
          id: 10,
          title: "abc",
        }
      }).promise();
      const item = await primaryKey.get(10, "abc");
      expect(item).to.be.instanceof(Card);
      expect(item!.id).to.eq(10);
      expect(item!.title).to.eq("abc");
    });
  });

  describe("#bacthGet", async () => {
    it("should find items", async () => {
      await Config.documentClient.put({
        TableName: Card.metadata.name,
        Item: {
          id: 10,
          title: "abc",
        }
      }).promise();
      await Config.documentClient.put({
        TableName: Card.metadata.name,
        Item: {
          id: 11,
          title: "abc",
        }
      }).promise();
      await Config.documentClient.put({
        TableName: Card.metadata.name,
        Item: {
          id: 12,
          title: "abc",
        }
      }).promise();

      const items = (await primaryKey.batchGet([ [10, "abc"], [11, "abc"] ])).records;
      expect(items.length).to.eq(2);
      expect(items[0].id).to.eq(10);
      expect(items[1].id).to.eq(11);
    });
  });


  describe("#query", () => {
    it("should find items", async () => {
      await Config.documentClient.put({
        TableName: Card.metadata.name,
        Item: {
          id: 10,
          title: "abc",
        }
      }).promise();
      await Config.documentClient.put({
        TableName: Card.metadata.name,
        Item: {
          id: 10,
          title: "abd",
        }
      }).promise();
      await Config.documentClient.put({
        TableName: Card.metadata.name,
        Item: {
          id: 10,
          title: "aba",
        }
      }).promise();

      let res = await primaryKey.query({
        hash: 10,
        range: ["between", "abc", "abf"]
      });

      expect(res.records.length).to.eq(2);
      expect(res.records[0].title).to.eq("abc");
      expect(res.records[1].title).to.eq("abd");

      res = await primaryKey.query({
        hash: 10,
        range: ["between", "abc", "abf"],
        rangeOrder: "DESC",
      });

      expect(res.records.length).to.eq(2);
      expect(res.records[0].title).to.eq("abd");
      expect(res.records[1].title).to.eq("abc");
    });
  });

  describe("#update", () => {
    it("should be able to update items", async () => {
      await primaryKey.update(10, "abc", { count: ["ADD", 1] });

      let card = await primaryKey.get(10, "abc");
      expect(card!.count).to.eq(1);

      await primaryKey.update(10, "abc", { count: ["ADD", 2] });

      card = await primaryKey.get(10, "abc");
      expect(card!.count).to.eq(3);
    });
  });
});