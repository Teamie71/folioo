import { BeforeInsert, BeforeUpdate, Column, PrimaryGeneratedColumn } from 'typeorm';

export abstract class BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'timestamp', update: false })
    createdAt: Date;

    @Column({ type: 'timestamp' })
    updatedAt: Date;

    @BeforeInsert()
    protected setTimestampsOnInsert(): void {
        const now = new Date();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @BeforeUpdate()
    protected setTimestampsOnUpdate(): void {
        this.updatedAt = new Date();
    }
}
