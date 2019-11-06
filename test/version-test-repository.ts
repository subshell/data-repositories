import {AbstractRepository, Id, Unique} from "../src";
import {TestDatabaseAccess, testDatabaseAccess} from "./repository.spec";

export class VersioningObjectOne {
    @Id() name: string;
    email: string;

    constructor(name: string, email: string) {
        this.name = name;
        this.email = email;
    }
}

/**
 * Let's pretend this is the same class but it has been modified over time.
 */
export class VersioningObjectTwo {
    @Id() name: string;
    @Unique({sinceVersion: 3}) address: string;
    email: string;

    constructor(name: string, address: string, email: string) {
        this.name = name;
        this.address = address;
        this.email = email;
    }
}

export class VersionTestRepositoryOne extends AbstractRepository<VersioningObjectOne, string> {

    constructor() {
        super(testDatabaseAccess,
            VersioningObjectOne,
            'versionTestRepoName');
    }

}

/**
 * Same here: Let's pretend this is the same repository.
 */
export class VersionTestRepositoryTwo extends AbstractRepository<VersioningObjectTwo, string> {

    constructor() {
        super(testDatabaseAccess,
            VersioningObjectTwo,
            'versionTestRepoName');
    }
}

export class VersioningObjectThree {
    @Id({sinceVersion: 5}) name: string;
    phoneNumber: string;

    constructor(name: string, phoneNumber: string) {
        this.name = name;
        this.phoneNumber = phoneNumber;
    }
}

export class VersionTestRepositoryThree extends AbstractRepository<VersioningObjectThree, string> {
    constructor() {
        super(new TestDatabaseAccess("foo1"), VersioningObjectThree);
    }

}

export class VersioningObjectFour {
    @Id({sinceVersion: 4}) name: string;
    petName: string;

    constructor(name: string, petName: string) {
        this.name = name;
        this.petName = petName;
    }
}

export class VersionTestRepositoryFour extends AbstractRepository<VersioningObjectFour, string> {
    constructor() {
        super(new TestDatabaseAccess("foo2"), VersioningObjectFour);
    }

}