import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

/** Receipt only: the commercial data remains in Vendure Product/ProductVariant. */
@Entity()
@Index('UQ_catalogue_import_channel_key', ['channelId', 'rowKey'], { unique: true })
export class CatalogueImportReceipt extends VendureEntity {
  constructor(input?: DeepPartial<CatalogueImportReceipt>) { super(); Object.assign(this, input); }
  @Column({ type: 'varchar', length: 64 }) channelId!: string;
  @Column({ type: 'varchar', length: 100 }) rowKey!: string;
  @Column({ type: 'varchar', length: 64 }) fingerprint!: string;
  @Column({ type: 'varchar', length: 64 }) productId!: string;
  @Column({ type: 'varchar', length: 64 }) variantId!: string;
}
