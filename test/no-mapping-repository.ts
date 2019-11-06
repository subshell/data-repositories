import {AbstractRepository, Id} from "../src/";
import {testDatabaseAccess} from "./repository.spec";

export class NoMappingTestObject {
    @Id() private _name: string;

    constructor(_name: string, private _salary: number) {
        this._name = _name;
    }

    get name(): string {
        return this._name;
    }

    get salary(): number {
        return this._salary;
    }
}

export class NoMappingRepository extends AbstractRepository<NoMappingTestObject, string> {
    constructor() {
        super(testDatabaseAccess, NoMappingTestObject);
    }
}