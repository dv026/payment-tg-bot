import { ObjectId } from 'mongodb';
import { dbConnector } from '../db-connector';
import { CarModel, PurchaseModel } from '../models/purchase-model';
import { PurchaseStatuses } from '../types';

class PurchaseController {
  constructor() {}

  async get(id: string) {
    return dbConnector.purchases.findOne({ _id: new ObjectId(id) });
  }

  async getList() {
    return dbConnector.purchases.find().limit(10).toArray();
  }

  async delete(id: string) {
    return dbConnector.purchases.deleteOne({ _id: new ObjectId(id) });
  }

  async update({
    id,
    year,
    price,
    brand,
    mileage,
    model,
    commission,
    deposit,
    purchaseType
  }: CarModel) {
    return dbConnector.purchases.updateOne(
      { _id: new ObjectId(id) },
      { $set: { year, price, brand, mileage, model, deposit, commission, purchaseType } }
    );
  }

  hasFakeFee = (rate: number) => rate !== 0;

  async updateStatus({ id, status }: Partial<CarModel>) {
    const purchase = await this.get(id);
    let enrichedPurchase: Partial<CarModel> = {
      status
    };
    if (status === PurchaseStatuses.DepositPaid) {
      // enrichedPurchase.deposit = {
      //   ...purchase.deposit,
      //   canReturn: true
      // };
      enrichedPurchase.fakeFee = {
        ...purchase.fakeFee,
        canReturn: this.hasFakeFee(purchase.fakeFee.rate)
      };
    }

    if (status === PurchaseStatuses.Canceled) {
      enrichedPurchase.commission = {
        ...purchase.deposit,
        canReturn: true
      };
      if (!purchase.deposit.returned) {
        enrichedPurchase.deposit = {
          ...purchase.deposit,
          canReturn: true
        };
      }
      if (!purchase.fakeFee.returned) {
        enrichedPurchase.fakeFee = {
          ...purchase.fakeFee,
          canReturn: this.hasFakeFee(purchase.fakeFee.rate)
        };
      }
    }
    return dbConnector.purchases.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...enrichedPurchase } }
    );
  }

  async returnFakeDeposit({ id }: Pick<CarModel, 'id'>) {
    return dbConnector.purchases.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          fakeFee: {
            returned: true
          } as any
        }
      }
    );
  }

  async returnDeposit({ id }: Pick<CarModel, 'id'>) {
    return dbConnector.purchases.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          deposit: {
            returned: true
          } as any
        }
      }
    );
  }

  async partialUpdate({ id, ...data }: Partial<CarModel>) {
    return dbConnector.purchases.updateOne({ _id: new ObjectId(id) }, { $set: { ...data } });
  }

  // async updateSoldPrice({ id, soldPrice }: Partial<CarModel>) {
  //   return dbConnector.purchases.updateOne({ _id: new ObjectId(id) }, { $set: { soldPrice } });
  // }

  async create(purchase: CarModel) {
    if (purchase.type === 'car') {
      purchase.deposit = {
        ...purchase.deposit,
        canReturn: false,
        returned: false
      };
      purchase.fakeFee = {
        ...purchase.fakeFee,
        canReturn: false,
        returned: false
      };
      purchase.commission = {
        ...purchase.commission,
        canReturn: false,
        returned: false
      };

      return dbConnector.purchases.insertOne(purchase);
    }
  }
}

export const purchaseController = new PurchaseController();
