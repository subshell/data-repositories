export const DATABASE_ID_METADATA_KEY = "database:id";
export const DATABASE_INCREMENTALID_METADATA_KEY = "database:incrementalId";
export const DATABASE_COMPOUNDID_METADATA_KEY = "database:compoundId";
export const DATABASE_UNIQUE_METADATA_KEY = "database:unique";
export const DATABASE_INDEXED_METADATA_KEY = "database:indexed";
export const DATABASE_DECORATOR_OPTIONS = "database:decoratorOptions";

export interface DatabaseDecoratorOptions {
    sinceVersion: number
}

const defaultDecoratorOptions: DatabaseDecoratorOptions = {
    sinceVersion: 1
};

/**
 * With the <code>@Id()</code> decorator you can specify the primary key of an object in the repository. Only one field can be
 * decorated with <code>@Id()</code> and no other primary key decorators are allowed.
 */
export function Id(options: DatabaseDecoratorOptions = defaultDecoratorOptions) {
    return (target: Object, propertyKey: string | symbol) => {
        assertNoIdDecoratorOnTarget(target, DATABASE_ID_METADATA_KEY);
        Reflect.defineMetadata(DATABASE_ID_METADATA_KEY, propertyKey, target.constructor);
        addFieldDecoratorOptionsToMetadata(target.constructor, propertyKey, options);
    };
}

/**
 * With the <code>@IncrementalId()</code> decorator you can specify the primary key of an object in the repository.
 * <code>@IncrementalId()</code> requires the field to be a number and automatically increments the number.
 * Only one field can be decorated with <code>@IncrementalId()</code> and no other primary key decorators are allowed.
 */
export function IncrementalId(options: DatabaseDecoratorOptions = defaultDecoratorOptions) {
    return (target: Object, propertyKey: string | symbol) => {
        assertNoIdDecoratorOnTarget(target, DATABASE_ID_METADATA_KEY);
        Reflect.defineMetadata(DATABASE_INCREMENTALID_METADATA_KEY, propertyKey, target.constructor);
        addFieldDecoratorOptionsToMetadata(target.constructor, propertyKey, options);
    };
}

/**
 * With the <code>@CompoundId()</code> decorator you can specify the primary key of an object in the repository.
 * Multiple fields can be decorated with <code>@CompoundId()</code> but no other primary key decorators are allowed.
 *
 * The primary key of an object consists of an array of the types of the fields, e.g. [number, string]. The repository
 * must have a matching key type.
 */
export function CompoundId(options: DatabaseDecoratorOptions = defaultDecoratorOptions) {
    return (target: Object, propertyKey: string | symbol) => {
        assertNoIdDecoratorOnTarget(target, DATABASE_COMPOUNDID_METADATA_KEY);
        let metadata: Array<string | symbol> = Reflect.getMetadata(DATABASE_COMPOUNDID_METADATA_KEY, target.constructor) || [];
        metadata.push(propertyKey);
        Reflect.defineMetadata(DATABASE_COMPOUNDID_METADATA_KEY, metadata, target.constructor);
        addFieldDecoratorOptionsToMetadata(target.constructor, propertyKey, options);
    };
}

function assertNoIdDecoratorOnTarget(target: Object, currentKey: string) {
    let id: string | symbol = Reflect.getMetadata(DATABASE_ID_METADATA_KEY, target.constructor);
    let incrementalId: string | symbol = Reflect.getMetadata(DATABASE_INCREMENTALID_METADATA_KEY, target.constructor);
    let compoundId: Array<string | symbol> = Reflect.getMetadata(DATABASE_COMPOUNDID_METADATA_KEY, target.constructor);

    if (id) {
        if (currentKey === DATABASE_ID_METADATA_KEY) {
            throw `Only one property in ${target.constructor.name} should be labelled with the @Id() decorator!`;
        } else {
            throw `Only one id decorator should be used in ${target.constructor.name}!`;
        }
    } else if (incrementalId) {
        if (currentKey === DATABASE_INCREMENTALID_METADATA_KEY) {
            throw `Only one property in ${target.constructor.name} should be labelled with the @IncrementalId() decorator!`;
        } else {
            throw `Only one id decorator should be used in ${target.constructor.name}!`;
        }
    } else if (compoundId && compoundId.length > 0 && currentKey !== DATABASE_COMPOUNDID_METADATA_KEY) {
        throw `Only one id decorator should be used in ${target.constructor.name}!`;
    }
}

export function Unique(options: DatabaseDecoratorOptions = defaultDecoratorOptions) {
    return (target: Object, propertyKey: string | symbol) => {
        addMetadataValueToKey(DATABASE_UNIQUE_METADATA_KEY, target.constructor, propertyKey, options);
    };
}


export function Indexed(options: DatabaseDecoratorOptions = defaultDecoratorOptions) {
    return (target: Object, propertyKey: string | symbol) => {
        addMetadataValueToKey(DATABASE_INDEXED_METADATA_KEY, target.constructor, propertyKey, options);
    };
}

function addMetadataValueToKey(metadataKey: string, target: Object, propertyKey: any, options: DatabaseDecoratorOptions) {
    let metadata: Array<unknown> = Reflect.getMetadata(metadataKey, target);
    if (!metadata) {
        metadata = [];
    }
    metadata.push(propertyKey);
    Reflect.defineMetadata(metadataKey, metadata, target);
    addFieldDecoratorOptionsToMetadata(target, propertyKey, options);
}

function addFieldDecoratorOptionsToMetadata(target: Object, propertyKey: string | symbol, decoratorOptions: DatabaseDecoratorOptions) {
    let metadata: Map<string | symbol, DatabaseDecoratorOptions> = Reflect.getMetadata(DATABASE_DECORATOR_OPTIONS, target);
    if (!metadata) {
        metadata = new Map();
    }
    metadata.set(propertyKey, decoratorOptions);
    Reflect.defineMetadata(DATABASE_DECORATOR_OPTIONS, metadata, target);
}