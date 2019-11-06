import {AbstractRepository, CompoundId, Indexed} from "../src";
import {testDatabaseAccess} from "./repository.spec";

export class CompoundTestObject {
    @Indexed() @CompoundId() firstName: string;
    @Indexed() @CompoundId() lastName: string;
    @Indexed() nameSuffix?: string;

    constructor(firstName: string, lastName: string, nameSuffix?: string) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.nameSuffix = nameSuffix;
    }
}

export class CompoundIdRepository extends AbstractRepository<CompoundTestObject, [string, string]> {
    constructor() {
        super(testDatabaseAccess, CompoundTestObject);
    }
}