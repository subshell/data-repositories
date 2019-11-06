import Dexie from 'dexie';
import indexedDB from 'fake-indexeddb';
import IDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';
import 'jest';
import 'reflect-metadata';
import {DatabaseAccess} from "../src";
import {IncrementalTestClass, IncrementalTestRepository} from "./incremental-test-repository";
import {MappingTestRepository, ObservableMappingTestRepository, TestObject} from "./mapping-test-repository";
import {NoDecoratedFieldsRepository} from "./no-decorated-fields-repository";
import {NoMappingRepository, NoMappingTestObject} from "./no-mapping-repository";
import {
    VersioningObjectFour,
    VersioningObjectOne,
    VersioningObjectThree,
    VersioningObjectTwo,
    VersionTestRepositoryFour,
    VersionTestRepositoryOne,
    VersionTestRepositoryThree,
    VersionTestRepositoryTwo
} from "./version-test-repository";
import {CompoundIdRepository, CompoundTestObject} from "./compound-id-repository";

export class TestDatabaseAccess extends DatabaseAccess {
    constructor(name: string) {
        super(new Dexie(name, {indexedDB: indexedDB, IDBKeyRange: IDBKeyRange}));
    }
}

export let testDatabaseAccess: DatabaseAccess;

describe('A repository', () => {

    beforeEach(() => {
        openDatabase();
    });

    afterEach(async () => {
        await deleteDatabase();
    });

    function openDatabase() {
        testDatabaseAccess = new TestDatabaseAccess("test");
    }

    function closeDatabase() {
        testDatabaseAccess.db.close();
    }

    async function deleteDatabase() {
        await testDatabaseAccess.db.delete();
    }

    test('should not be created when the stored object does not have a field decorated with @Id or @IncrementalId', () => {
        expect(() => new NoDecoratedFieldsRepository()).toThrowError(/.*@Id.*@IncrementalId.*/g);
    });

    test('should be created and save and retrieve a value', async () => {
        const repo = new NoMappingRepository();
        expect(repo.repositoryName).toEqual("NoMappingRepository");

        let obj = new NoMappingTestObject("gandalf", 42);

        let key = await repo.save(obj).toPromise();
        expect(key).toBe("gandalf");

        let retrieved = await repo.findById("gandalf").toPromise();
        expect(retrieved).toBeInstanceOf(NoMappingTestObject);
        expect(retrieved).toEqual(obj);
        expect(retrieved.name).toEqual("gandalf");
        expect(retrieved.salary).toEqual(42);
    });

    test('should save and find multiple values', async () => {
        const repo = new NoMappingRepository();

        let gandalf = new NoMappingTestObject("gandalf", 42);
        let gimli = new NoMappingTestObject("gimli", 12);
        let aragorn = new NoMappingTestObject("aragorn", 500);
        let legolas = new NoMappingTestObject("legolas", 2);

        await repo.saveAll(gandalf, gimli, aragorn, legolas).toPromise();

        let retrieved = await repo.findAll().toPromise();
        expect(retrieved).toContainEqual(gandalf);
        expect(retrieved).toContainEqual(gimli);
        expect(retrieved).toContainEqual(aragorn);
        expect(retrieved).toContainEqual(legolas);

    });

    test('should be able to clear the data', async () => {
        const repo = new NoMappingRepository();

        let gandalf = new NoMappingTestObject("gandalf", 42);
        await repo.save(gandalf).toPromise();
        expect(await repo.count().toPromise()).toBe(1);
        await repo.clear().toPromise();
        expect(await repo.count().toPromise()).toBe(0);
    });

    test('should be able to delete values', async () => {
        const repo = new NoMappingRepository();

        let gandalf = new NoMappingTestObject("gandalf", 42);
        let gimli = new NoMappingTestObject("gimli", 12);

        await repo.saveAll(gandalf, gimli).toPromise();
        expect(await repo.count().toPromise()).toBe(2);

        await repo.delete("gandalf").toPromise();
        let retrieved = await repo.findAll().toPromise();
        expect(retrieved).toHaveLength(1);
        expect(retrieved).toContainEqual(gimli);
    });

    test('should be able to map values to a model and back', async () => {
        const repo = new MappingTestRepository();

        let gandalf = new TestObject("gandalf@the-whi.te", "gandalf");
        await repo.save(gandalf).toPromise();
        expect(await repo.count().toPromise()).toBe(1);
        expect(await repo.findById("gandalf@the-whi.te").toPromise()).toEqual(gandalf);
    });

    test('should be able to map values to a model and back using observables', async () => {
        const repo = new ObservableMappingTestRepository();

        let gandalf = new TestObject("gandalf@the-whi.te", "gandalf");
        await repo.save(gandalf).toPromise();
        expect(await repo.count().toPromise()).toBe(1);
        expect(await repo.findById("gandalf@the-whi.te").toPromise()).toEqual(gandalf);
    });

    test('should be able to store values using incremental ids', async () => {
        const repo = new IncrementalTestRepository();
        expect(repo.idPropertyName).toBe("id");

        let fotr = new IncrementalTestClass("The Fellowship Of The Ring", "JRRT");
        let ttt = new IncrementalTestClass("The Two Towers", "JRRT");
        let rork = new IncrementalTestClass("The Return Of The King", "JRRT");

        let agot = new IncrementalTestClass("A Game Of Thrones", "GRRM");
        let acok = new IncrementalTestClass("A Clash Of Kings", "GRRM");
        let asos = new IncrementalTestClass("A Storm Of Swords", "GRRM");
        let affc = new IncrementalTestClass("A Feast For Crows", "GRRM");
        let adwd = new IncrementalTestClass("A Dance With Dragons", "GRRM");

        await repo.saveAll(fotr, ttt, rork, agot, acok, asos, affc, adwd).toPromise();

        let firstItem = await repo.findById(1).toPromise();
        expect(firstItem.author).toEqual(fotr.author);
        expect(firstItem.title).toEqual(fotr.title);

        let middleItem = await repo.findById(4).toPromise();
        expect(middleItem.author).toEqual(agot.author);
        expect(middleItem.title).toEqual(agot.title);

        let lastItem = await repo.findById(8).toPromise();
        expect(lastItem.author).toEqual(adwd.author);
        expect(lastItem.title).toEqual(adwd.title);
    });

    test('should be able to find stored objects using incremental, indexed or unique properties', async () => {
        const repo = new IncrementalTestRepository();
        expect(repo.idPropertyName).toBe("id");

        let fotr = new IncrementalTestClass("The Fellowship Of The Ring", "JRRT");
        let ttt = new IncrementalTestClass("The Two Towers", "JRRT");
        let rork = new IncrementalTestClass("The Return Of The King", "JRRT");

        let agot = new IncrementalTestClass("A Game Of Thrones", "GRRM");
        let acok = new IncrementalTestClass("A Clash Of Kings", "GRRM");
        let asos = new IncrementalTestClass("A Storm Of Swords", "GRRM");
        let affc = new IncrementalTestClass("A Feast For Crows", "GRRM");
        let adwd = new IncrementalTestClass("A Dance With Dragons", "GRRM");

        await repo.saveAll(fotr, ttt, rork, agot, acok, asos, affc, adwd).toPromise();

        let grrms = await repo.search().andEqual("author", "GRRM").find().toPromise();
        expect(grrms).toHaveLength(5);

        let jrrts = await repo.search().andEqual("author", "JRRT").find().toPromise();
        expect(jrrts).toHaveLength(3);

        let feastForCrows = await repo.search().andEqual("author", "GRRM")
            .andEqual("title", "A Feast For Crows")
            .andNotEqual("author", "JRRT")
            .find().toPromise();
        expect(feastForCrows).toHaveLength(1);
        expect(feastForCrows[0].title).toBe(affc.title);
    });

    test('should be able to use predicate filters on search queries', async () => {
        const repo = new IncrementalTestRepository();

        let fotr = new IncrementalTestClass("The Fellowship Of The Ring", "JRRT");
        let ttt = new IncrementalTestClass("The Two Towers", "JRRT");
        let rork = new IncrementalTestClass("The Return Of The King", "JRRT");

        let agot = new IncrementalTestClass("A Game Of Thrones", "GRRM");
        let acok = new IncrementalTestClass("A Clash Of Kings", "GRRM");
        let asos = new IncrementalTestClass("A Storm Of Swords", "GRRM");
        let affc = new IncrementalTestClass("A Feast For Crows", "GRRM");
        let adwd = new IncrementalTestClass("A Dance With Dragons", "GRRM");

        await repo.saveAll(fotr, ttt, rork, agot, acok, asos, affc, adwd).toPromise();

        expect(await repo.count().toPromise()).toBe(8);

        let itemsWithOfInTheTitle = await repo.search().and(model => model.title.includes("Of")).find().toPromise();

        expect(itemsWithOfInTheTitle).toBeDefined();
        expect(itemsWithOfInTheTitle).toHaveLength(5);
    });

    test('should be able to use compound primary keys', async () => {
        let repo = new CompoundIdRepository();
        expect(repo.idPropertyName).toBe("[firstName+lastName]");

        let testObj1 = new CompoundTestObject("Gandalf", "the White");
        let testObj2 = new CompoundTestObject("Gimli", "the Dwarf");
        let testObj3 = new CompoundTestObject("Gandalf", "the White", "again");

        await repo.saveAll(testObj1, testObj2).toPromise();
        expect(await repo.count().toPromise()).toBe(2);

        await repo.save(testObj3).toPromise();
        expect(await repo.count().toPromise()).toBe(2);

        let gandalf = await repo.findById(["Gandalf", "the White"]).toPromise();
        expect(gandalf).toBeInstanceOf(CompoundTestObject);
        expect(gandalf.nameSuffix).toBe("again");

        let found = await repo.search().andEqual("firstName", "Gandalf")
            .andEqual("lastName", "the White")
            .find()
            .toPromise();
        expect(found).toHaveLength(1);
    });

    test('should not break when multiple databases use different versions', async () => {
        let repo1 = new VersionTestRepositoryTwo();
        const testObject1 = new VersioningObjectTwo("gimli", "moria", "gimli@dwarfs.com");
        await repo1.save(testObject1).toPromise();


        let repo2 = new VersionTestRepositoryThree();
        const testObject2 = new VersioningObjectThree("frodo", "04012345678");
        await repo2.save(testObject2).toPromise();


        let repo3 = new VersionTestRepositoryFour();
        const testObject3 = new VersioningObjectFour("gandalf", "frodo");

        await repo3.save(testObject3).toPromise();

        let found1 = await repo1.findAll().toPromise();
        expect(found1).toHaveLength(1);
        expect(found1[0]).toEqual(testObject1);
    });

    test('should be able to use database versions', async () => {
        let repo = new VersionTestRepositoryOne();
        const testObject1 = new VersioningObjectOne("gandalf", "gandalf@yahoo.com");

        await repo.save(testObject1).toPromise();
        closeDatabase();
        openDatabase();

        let repo2 = new VersionTestRepositoryTwo();
        expect(await repo2.count().toPromise()).toBe(1);

        let gandalf = await repo2.findById("gandalf").toPromise();
        expect(gandalf).toEqual(testObject1);
        expect(gandalf).toBeInstanceOf(VersioningObjectTwo);
        expect(gandalf.address).toBeUndefined();

        const testObject2 = new VersioningObjectTwo("gimli", "moria", "gimli@dwarfs.com");
        await repo2.save(testObject2).toPromise();
        const foundGimliByAddedProperty = await repo2.search().andEqual("address", "moria").find().toPromise();
        expect(foundGimliByAddedProperty).toHaveLength(1);
        expect(foundGimliByAddedProperty[0]).toEqual(testObject2);
    });
});