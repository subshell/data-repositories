import {Observable, of} from "rxjs";
import {AbstractMappingRepository, Id, RepositoryMapper} from "../src";
import {testDatabaseAccess} from "./repository.spec";

export class TestObject {
    email: string;
    name: string;

    constructor(email: string, name: string) {
        this.email = email;
        this.name = name;
    }
}

export class TestObjectIDBModel {
    @Id() email: string;
    name: string;
    saveDate: Date;

    constructor(email: string, name: string, saveDate: Date) {
        this.email = email;
        this.name = name;
        this.saveDate = saveDate;
    }
}

export class TestObjectMapper implements RepositoryMapper<TestObject, TestObjectIDBModel> {

    fromDatabaseModel(model: TestObjectIDBModel): Observable<TestObject> | TestObject {
        return new TestObject(model.email, model.name);
    }

    toDatabaseModel(value: TestObject): Observable<TestObjectIDBModel> | TestObjectIDBModel {
        return new TestObjectIDBModel(value.email, value.name, new Date());
    }

}

export class ObservableTestObjectMapper implements RepositoryMapper<TestObject, TestObjectIDBModel> {

    fromDatabaseModel(model: TestObjectIDBModel): Observable<TestObject> | TestObject {
        return of(new TestObject(model.email, model.name));
    }

    toDatabaseModel(value: TestObject): Observable<TestObjectIDBModel> | TestObjectIDBModel {
        return of(new TestObjectIDBModel(value.email, value.name, new Date()));
    }

}

export class MappingTestRepository extends AbstractMappingRepository<TestObject, TestObjectIDBModel, string> {
    constructor() {
        super(testDatabaseAccess, TestObjectIDBModel, new TestObjectMapper());
    }
}

export class ObservableMappingTestRepository extends AbstractMappingRepository<TestObject, TestObjectIDBModel, string> {
    constructor() {
        super(testDatabaseAccess, TestObjectIDBModel, new ObservableTestObjectMapper());
    }
}