import '../../app.module';
import { EntitiesMetadataStorage } from '@nestjs/typeorm/dist/entities-metadata.storage';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Experience } from '../experience/domain/experience.entity';
import { ExperienceMeta } from '../block/domain/experience-meta.entity';
import { Portfolio } from './domain/portfolio.entity';

class MetadataDataSource extends DataSource {
    async buildForTest(): Promise<void> {
        await this.buildMetadatas();
    }
}

describe('retained portfolio relations', () => {
    it('registers legacy Experience for portfolio and experience-map reads without ExperienceModule', async () => {
        const dataSource = new MetadataDataSource({
            type: 'postgres',
            entities: EntitiesMetadataStorage.getEntitiesByDataSource('default'),
            namingStrategy: new SnakeNamingStrategy(),
        });

        await dataSource.buildForTest();

        const experience = dataSource.getMetadata(Experience);
        for (const entity of [Portfolio, ExperienceMeta]) {
            const relation = dataSource
                .getMetadata(entity)
                .relations.find((item) => item.propertyName === 'experience');
            expect(relation?.inverseEntityMetadata).toBe(experience);
        }
    });
});
