import { Channel, DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Check, Column, Entity, ForeignKey, ManyToOne, Unique } from 'typeorm';
import type { PageDocument } from './document';

@Entity()
@Unique('content_page_channelId_languageCode_slug_key', ['channelId', 'languageCode', 'slug'])
@Check('content_page_revision_check', '"revision" > 0')
@Check('content_page_headVersion_check', '"headVersion" > 0')
@Check('content_page_fencingToken_check', '"fencingToken" >= 0')
@ForeignKey(() => ContentRevision, ['id', 'selectedVersion'], ['pageId', 'version'], { name: 'content_selected_version_fk' })
export class ContentPage extends VendureEntity {
  constructor(input?: DeepPartial<ContentPage>) { super(); Object.assign(this, input); }
  @ManyToOne(() => Channel, { onDelete: 'RESTRICT' }) channel!: Channel;
  @EntityId() channelId!: ID;
  @Column() languageCode!: string;
  @Column() slug!: string;
  @Column() title!: string;
  @Column({ default: 1 }) revision!: number;
  @Column({ default: 1 }) headVersion!: number;
  @Column({ type: 'integer', nullable: true }) selectedVersion!: number | null;
  @Column({ default: 0 }) fencingToken!: number;
  @Column({ type: 'varchar', nullable: true }) leaseHolder!: string | null;
  @Column({ type: 'timestamptz', nullable: true }) acquiredAt!: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) expiresAt!: Date | null;
}

@Entity()
@Unique('content_revision_pageId_version_key', ['pageId', 'version'])
@Check('content_revision_version_check', '"version" > 0')
@Check('content_revision_state_check', '"state" IN (\'draft\',\'validated\')')
@Check('content_revision_check', '("version" = 1 AND "parentVersion" IS NULL) OR ("version" > 1 AND "parentVersion" IS NOT NULL AND "parentVersion" = "version" - 1)')
@Check('content_revision_check1', '("state" = \'draft\' AND "validatedAt" IS NULL) OR ("state" = \'validated\' AND "validatedAt" IS NOT NULL AND jsonb_array_length("evidenceRefs") > 0)')
@ForeignKey(() => ContentRevision, ['pageId', 'parentVersion'], ['pageId', 'version'], { name: 'content_revision_pageId_parentVersion_fkey' })
export class ContentRevision extends VendureEntity {
  constructor(input?: DeepPartial<ContentRevision>) { super(); Object.assign(this, input); }
  @ManyToOne(() => ContentPage, { onDelete: 'RESTRICT' }) page!: ContentPage;
  @EntityId() pageId!: ID;
  @Column() version!: number;
  @Column({ type: 'integer', nullable: true }) parentVersion!: number | null;
  @Column() state!: 'draft' | 'validated';
  @Column({ type: 'jsonb' }) document!: PageDocument;
  @Column() contentDigest!: string;
  @Column() themeVersion!: string;
  @Column({ type: 'timestamptz', nullable: true }) validatedAt!: Date | null;
  @Column({ type: 'jsonb' }) evidenceRefs!: string[];
  @Column() authorId!: string;
}

@Entity()
export class ContentLeaseEvent extends VendureEntity {
  constructor(input?: DeepPartial<ContentLeaseEvent>) { super(); Object.assign(this, input); }
  @ManyToOne(() => ContentPage, { onDelete: 'RESTRICT' }) page!: ContentPage;
  @EntityId() pageId!: ID;
  @Column() kind!: string;
  @Column() fencingToken!: number;
  @Column() actorId!: string;
}
