import Dexie, {IndexableType, Table} from "dexie";
import 'dexie-observable';
import {defer, from, Observable, of, Subject} from "rxjs";
import {combineAll, concatAll, defaultIfEmpty, flatMap, map, toArray} from "rxjs/operators";
import {Class} from "./class";
import {DatabaseAccess} from "./database-access";
import {
	DATABASE_COMPOUNDID_METADATA_KEY,
	DATABASE_DECORATOR_OPTIONS,
	DATABASE_ID_METADATA_KEY,
	DATABASE_INCREMENTALID_METADATA_KEY,
	DATABASE_INDEXED_METADATA_KEY,
	DATABASE_UNIQUE_METADATA_KEY,
	DatabaseDecoratorOptions
} from "./database-decorators";
import {Repository} from "./repository";
import {fromPromise} from "rxjs/internal/observable/innerFrom";
import Collection = Dexie.Collection;

export interface RepositoryMapper<VALUE, MODEL> {
  toDatabaseModel(value: VALUE): MODEL | Observable<MODEL>;
  fromDatabaseModel(model: MODEL): VALUE | Observable<VALUE>;
}

export class NoopRepositoryMapper implements RepositoryMapper<any, any> {
  fromDatabaseModel(model: any): any {
    return model;
  }
  toDatabaseModel(value: any): any {
    return value;
  }
}

export enum RepositoryEventType {
  CREATE, UPDATE, DELETE
}

export interface RepositoryEvent<VALUE, KEY> {
  type: RepositoryEventType
  key: KEY
  newValue?: VALUE
  previousValue?: VALUE
}

interface MetaFieldOptions {
  unique?: boolean
  incremental?: boolean
}
interface MetaField extends MetaFieldOptions {
  field: string | symbol
}

export abstract class AbstractMappingRepository<VALUE, MODEL, KEY extends IndexableType> implements Repository<VALUE, KEY> {

  public readonly repositoryName: string;

  public idPropertyName: string;

  private eventsSubject = new Subject<RepositoryEvent<VALUE, KEY>>();
  private repositoryInstantiationTimestamp = String(new Date().getTime()); // used as a unique id across tabs

  constructor(private databaseAccess: DatabaseAccess,
              private modelType: Class<MODEL>,
              private mapper: RepositoryMapper<VALUE, MODEL>,
              repositoryName?: string) {
    this.repositoryName = repositoryName || this.constructor.name;
    this.createDatabaseVersions();
    this.table.mapToClass(modelType);
    this.registerEventsListener();
  }

  private get table(): Table<MODEL, KEY> {
    return this.databaseAccess.db.table(this.repositoryName);
  }

  public createDatabaseVersions() {
    if (this.databaseAccess.db.isOpen()) {
      this.databaseAccess.db.close();
    }
    let relevantVersions = this.getSchemaVersions();
    let highestVersion = relevantVersions[relevantVersions.length - 1];
    let lowestVersion = relevantVersions[0];

    for(let version = lowestVersion; version <= Math.max(highestVersion, this.databaseAccess.db.verno); version++) {
      const schema = this.buildTableSchema(version);
      const dexieSchema = {};
      dexieSchema[this.repositoryName] = schema.schemaString;
      this.databaseAccess.db.version(version).stores(dexieSchema);
      this.idPropertyName = schema.idPropertyName;
    }
    this.databaseAccess.db.open();
  }

  private getSchemaVersions(): Array<number> {
    let metadata: Map<string | symbol, DatabaseDecoratorOptions> = Reflect.getMetadata(DATABASE_DECORATOR_OPTIONS, this.modelType);
    if (!metadata) {
      throw `At least one field of ${this.modelType.name} must be decorated with @Unique, @Id or @IncrementalId!`;
    }
    let versions: Array<number> = [];
    metadata.forEach(value => {
      versions.push(value.sinceVersion);
    });
    return versions.sort();
  }

  private findRelevantFieldsForVersion(version: number): Array<string | symbol> {
    let metadata: Map<string | symbol, DatabaseDecoratorOptions> = Reflect.getMetadata(DATABASE_DECORATOR_OPTIONS, this.modelType);
    let fields: Array<string | symbol> = [];
    metadata.forEach((value, key) => {
      if (value.sinceVersion <= version) {
        fields.push(key);
      }
    });
    return fields;
  }

  private buildTableSchema(version: number): {schemaString: string, idPropertyName: string} {
    const relevantFieldsForThisVersion = this.findRelevantFieldsForVersion(version);;
    let idField: string | symbol = Reflect.getMetadata(DATABASE_ID_METADATA_KEY, this.modelType);
    let incrementalIdField: string | symbol = Reflect.getMetadata(DATABASE_INCREMENTALID_METADATA_KEY, this.modelType);
    let compoundIdFields: Array<string | symbol> = Reflect.getMetadata(DATABASE_COMPOUNDID_METADATA_KEY, this.modelType) || [];
    let uniqueFields: Array<string | symbol> = Reflect.getMetadata(DATABASE_UNIQUE_METADATA_KEY, this.modelType) || [];
    let indexedFields: Array<string | symbol> = Reflect.getMetadata(DATABASE_INDEXED_METADATA_KEY, this.modelType) || [];

    if (idField && !relevantFieldsForThisVersion.includes(idField)) {
      idField = null;
    }
    if (incrementalIdField && !relevantFieldsForThisVersion.includes(incrementalIdField)) {
      incrementalIdField = null;
    }
    compoundIdFields = compoundIdFields.filter(field => relevantFieldsForThisVersion.includes(field));
    uniqueFields = uniqueFields.filter(field => relevantFieldsForThisVersion.includes(field));
    indexedFields = indexedFields.filter(field => relevantFieldsForThisVersion.includes(field));

    if (!idField && !incrementalIdField && !compoundIdFields.length) {
      throw `At least one field of ${this.modelType.name} in version ${version} must be decorated with @Id(), @IncrementalId() or @CompoundId()!`;
    }

    let allFields = this.mapToFieldsMeta(uniqueFields, {unique: true}).concat(this.mapToFieldsMeta(indexedFields));

    if (idField) {
      allFields.splice(0, 0, {unique: true, field: idField});
    } else if (incrementalIdField) {
      allFields.splice(0, 0, {incremental: true, field: incrementalIdField});
    } else if (compoundIdFields.length) {
      allFields.splice(0, 0, this.createCompoundIdField(compoundIdFields));
    }

    let schemaString = "";
    let idPropertyName = "";
    for (let i = 0; i < allFields.length; i++) {
      let field = allFields[i];
      schemaString += `${field.incremental ? '++' : ''}${field.unique ? '&' : ''}${String(field.field)}${i < allFields.length - 1 ? ', ' : ''}`;
      if (i === 0) {
        idPropertyName = String(field.field);
      }
    }

    return {schemaString, idPropertyName};
  }

  private createCompoundIdField(fields: Array<string | symbol>): MetaField {
    return {
      field: `[${fields.join("+")}]`
    };
  }

  private mapToFieldsMeta(fields: Array<string | symbol>, options: MetaFieldOptions = {}): Array<MetaField> {
    return fields.map(field => {
      return {
        incremental: options.incremental,
        unique: options.unique,
        field: field
      }
    });
  }

  private registerEventsListener() {
    this.databaseAccess.db.on("changes",changes => {
      changes.forEach(change => {
        if (change.table !== this.repositoryName || change.source && change.source === this.repositoryInstantiationTimestamp) {
          return;
        }
        let repositoryEvent: RepositoryEvent<VALUE, KEY> = {
          type: this.getRepositoryEventTypeFromDexieType(change.type),
          key: change.key,
          newValue: (<any>change).obj,
          previousValue: (<any>change).oldObj
        };
        this.eventsSubject.next(repositoryEvent);
      });
    });
  }

  private getRepositoryEventTypeFromDexieType(dexieType: number): RepositoryEventType {
    switch (dexieType) {
      case 1: return RepositoryEventType.CREATE;
      case 2: return RepositoryEventType.UPDATE;
      case 3: return RepositoryEventType.DELETE;
    }
  }

  public static ensureObservable<T>(value: T | Observable<T>): Observable<T> {
    if (value instanceof Observable) {
        return value;
    } else {
        return of(value);
    }
  }

  public save(value: VALUE): Observable<KEY> {
    return AbstractMappingRepository.ensureObservable(this.mapper.toDatabaseModel(value)).pipe(flatMap(model => fromPromise(this.databaseAccess.db.transaction("rw", this.table, transaction => {
                transaction["source"] = this.repositoryInstantiationTimestamp;
                return this.table.put(model);
    }))));
  }

  public saveAll(...values: Array<VALUE>): Observable<Array<KEY>> {
    return from(values.map(value => AbstractMappingRepository.ensureObservable(this.mapper.toDatabaseModel(value))))
        .pipe(
            flatMap(value => value),
            toArray(),
            flatMap(models => fromPromise(this.databaseAccess.db.transaction("rw", this.table, transaction => {
                transaction["source"] = this.repositoryInstantiationTimestamp;
                return this.table.bulkPut(models);
            }))),
            map(key => [key])
            );
  }

  public findById(key: KEY): Observable<VALUE | null> {
    return defer(() => fromPromise(this.databaseAccess.db.transaction("r", this.table, transaction => {
      transaction["source"] = this.repositoryInstantiationTimestamp;
      return this.table.get(key);
    })).pipe(flatMap(model => model ? AbstractMappingRepository.ensureObservable(this.mapper.fromDatabaseModel(model)) : of(null))));
  }

  public findAll(): Observable<Array<VALUE>> {
      return defer(() => fromPromise(this.databaseAccess.db.transaction("r", this.table, transaction => {
          transaction["source"] = this.repositoryInstantiationTimestamp;
          return this.table.toArray();
      })).pipe(
          map(models => models ? models.map(model => AbstractMappingRepository.ensureObservable(this.mapper.fromDatabaseModel(model))) : []),
          concatAll(),
          combineAll(),
          defaultIfEmpty([])
      ));
  }

  public getPrimaryKeys(): Observable<Array<KEY>> {
    return defer(() => fromPromise(this.databaseAccess.db.transaction("r", this.table, transaction => {
      transaction["source"] = this.repositoryInstantiationTimestamp;
      return this.table.toCollection().primaryKeys();
    })));
  }

  public delete(key: KEY): Observable<void> {
    return defer(() => fromPromise(this.databaseAccess.db.transaction("rw", this.table, transaction => {
      transaction["source"] = this.repositoryInstantiationTimestamp;
      return this.table.delete(key);
    })));
  }

  public clear(): Observable<void> {
    return defer(() => fromPromise(this.databaseAccess.db.transaction("rw", this.table, transaction => {
      transaction["source"] = this.repositoryInstantiationTimestamp;
      return this.table.clear();
    })));
  }

  public count(): Observable<number> {
    return defer(() => fromPromise(this.databaseAccess.db.transaction("r", this.table, transaction => {
      transaction["source"] = this.repositoryInstantiationTimestamp;
      return this.table.count();
    })));
  }

  public search(): DBQuery<VALUE, MODEL, KEY> {
    return new DBQuery(this.table, this.databaseAccess, this.mapper, this.repositoryInstantiationTimestamp);
  }

  public events(): Observable<RepositoryEvent<VALUE, KEY>> {
    return this.eventsSubject.asObservable();
  }
}

export class DBQuery<VALUE, MODEL, KEY extends IndexableType> {

  private internalQuery: Collection<MODEL, KEY>;

  constructor(private table: Table<MODEL, KEY>,
              private databaseAccess: DatabaseAccess,
              private mapper: RepositoryMapper<VALUE, MODEL>,
              private repositoryInstantiationTimestamp: string) {
  }

  public andEqual(property: string, value: any): DBQuery<VALUE, MODEL, KEY> {
    if (this.internalQuery) {
      this.internalQuery = this.internalQuery.and(item => item[property] === value);
    } else {
      this.internalQuery = this.table.where(property).equals(value);
    }
    return this;
  }

  public andNotEqual(property: string, value: any): DBQuery<VALUE, MODEL, KEY> {
    if (this.internalQuery) {
      this.internalQuery = this.internalQuery.and(item => item[property] !== value);
    } else {
      this.internalQuery = this.table.where(property).notEqual(value);
    }
    return this;
  }

  public orEqual(property: string, value: any): DBQuery<VALUE, MODEL, KEY> {
    if (this.internalQuery) {
      this.internalQuery = this.internalQuery.or(property).equals(value);
    } else {
      this.internalQuery = this.table.where(property).equals(value);
    }
    return this;
  }

  public orNotEqual(property: string, value: any): DBQuery<VALUE, MODEL, KEY> {
    if (this.internalQuery) {
      this.internalQuery = this.internalQuery.or(property).notEqual(value);
    } else {
      this.internalQuery = this.table.where(property).notEqual(value);
    }
    return this;
  }

  public and(predicate: (model: MODEL) => boolean): DBQuery<VALUE, MODEL, KEY> {
    if (this.internalQuery) {
      this.internalQuery = this.internalQuery.filter(model => predicate(model));
    } else {
      this.internalQuery = this.table.filter(model => predicate(model));
    }
    return this;
  }

  public find(): Observable<Array<VALUE>> {
      return defer(() => fromPromise(this.databaseAccess.db.transaction("r", this.table, transaction => {
          transaction["source"] = this.repositoryInstantiationTimestamp;
          return this.internalQuery.toArray();
      })).pipe(
          map(models => models ? models.map(model => AbstractMappingRepository.ensureObservable(this.mapper.fromDatabaseModel(model))) : []),
          concatAll(),
          combineAll(),
          defaultIfEmpty([])
      ));
  }
}
