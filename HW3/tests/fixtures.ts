import type {
  ActiveReservation,
  MockSaleService,
  MockServiceDependencies,
  Order,
  SaleConfig,
} from "../src/contracts/flash-sale";
import { createMockSaleService } from "../src/service/mock-sale-service";

export const product = {
  id: "flash-product",
  name: "Tai nghe không dây",
  priceVnd: 1_290_000,
  currency: "VND" as const,
};

export function createSaleService(
  dependencies: MockServiceDependencies = {},
): MockSaleService {
  const config: SaleConfig = {
    product,
    initialStock: 10,
    reservationQuantity: 1,
    holdDurationMs: 30_000,
    saleEndsAt: 600_000,
  };
  return createMockSaleService(config, dependencies);
}

export const activeReservation: ActiveReservation = {
  id: "reservation-1",
  productId: product.id,
  ownerId: "shopper-1",
  quantity: 1,
  unitPriceVnd: product.priceVnd,
  grantedAt: 1_000,
  expiresAt: 31_000,
  status: "active",
};

export const order: Order = {
  id: "order-1",
  reservationId: activeReservation.id,
  ownerId: activeReservation.ownerId,
  productId: product.id,
  quantity: 1,
  totalVnd: product.priceVnd,
  currency: product.currency,
  createdAt: 2_000,
};
