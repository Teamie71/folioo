import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../domain/user.entity';
import { Repository } from 'typeorm';
import { UserStatus } from '../../domain/enums/user-status.enum';

@Injectable()
export class UserRepository {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>
    ) {}

    async save(user: User): Promise<User> {
        return await this.userRepository.save(user);
    }

    async findById(id: number): Promise<User | null> {
        return this.userRepository.findOne({
            where: { id },
        });
    }

    async findByPhoneNum(phoneNum: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: {
                phoneNum,
            },
        });
    }

    async findByIdWithProfile(userId: number): Promise<User | null> {
        return this.userRepository.findOne({
            where: {
                id: userId,
            },
            select: {
                name: true,
                phoneNum: true,
            },
        });
    }

    async deactivateById(userId: number, deactivatedAt: Date): Promise<boolean> {
        const result = await this.userRepository
            .createQueryBuilder()
            .update(User)
            .set({
                name: '탈퇴한 사용자',
                isActive: false,
                deactivatedAt,
                updatedAt: new Date(),
            })
            .where('id = :userId', { userId })
            .andWhere('isActive = :isActive', { isActive: true })
            .execute();

        return (result.affected ?? 0) > 0;
    }

    async findAllActiveUserIds(): Promise<number[]> {
        const rows = await this.userRepository
            .createQueryBuilder('u')
            .select('u.id', 'id')
            .where('u.is_active = :isActive', { isActive: true })
            .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
            .orderBy('u.id', 'ASC')
            .getRawMany<{ id: number }>();

        return rows.map((row) => Number(row.id));
    }
}
