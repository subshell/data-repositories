import {AbstractRepository, IncrementalId, Indexed} from "../src";
import {testDatabaseAccess} from "./repository.spec";

export class IncrementalTestClass {
    @IncrementalId() id: number;
    @Indexed() title: string;
    @Indexed() author: string;

    constructor(title: string, author: string) {
        this.title = title;
        this.author = author;
    }
}

export class IncrementalTestRepository extends AbstractRepository<IncrementalTestClass, number> {
    constructor() {
        super(testDatabaseAccess, IncrementalTestClass);
    }
}