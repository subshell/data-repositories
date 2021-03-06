import {AbstractMappingRepository, NoopRepositoryMapper} from "./abstract-mapping-repository";
import {Class} from "./class";
import {DatabaseAccess} from "./database-access";
import {IndexableType} from "dexie";

/**
 * This repository implementation uses a NoopRepositoryMapper for cases where no separate model class will be used.
 */
export class AbstractRepository<VALUE, KEY extends IndexableType> extends AbstractMappingRepository<VALUE, VALUE, KEY> {
    constructor(databaseAccess: DatabaseAccess, modelType: Class<VALUE>, repositoryName?: string) {
        super(databaseAccess, modelType, new NoopRepositoryMapper(), repositoryName);
    }
}
