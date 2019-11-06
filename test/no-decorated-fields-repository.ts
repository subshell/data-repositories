import {AbstractRepository, Unique} from "../src";
import {testDatabaseAccess} from "./repository.spec";

export class NoDecoratedFields {
    @Unique() foo: string;
}

export class NoDecoratedFieldsRepository extends AbstractRepository<NoDecoratedFields, string>{
    constructor() {
        super(testDatabaseAccess, NoDecoratedFields);
    }
}