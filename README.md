# @subshell/data-repositories

[![CircleCI](https://circleci.com/gh/subshell/data-repositories.svg?style=svg)](https://circleci.com/gh/subshell/data-repositories) [![npm version](https://badge.fury.io/js/%40subshell%2Fdata-repositories.svg)](https://badge.fury.io/js/%40subshell%2Fdata-repositories)

This is a wrapper around [Dexie](https://github.com/dfahlander/Dexie.js), which itself is already a wrapper around IndexedDB. This wrapper allows to create
repository classes, similar as you might be used to from Java and Spring Data.

Short example of a repository:

```typescript

/*********************************************************
* Define a class you want to store and a repository class:
*********************************************************/


class Person {    
    @Id() name: string;
    @Unique() identificationNumber: number;
    @Indexed() email: string;
    
    constructor(name: string, identificationNumber: number, email: string) {
        this.name = name;
        this.identificationNumber = identificationNumber;
        this.email = email;
    }
}

class PersonRepository extends AbstractRepository<Person, string> {
    constructor() {
        super(new DatabaseAccess(PersonRepository.name), Person);
    }
}

/*****************************
* Somewhere else in your code:
*****************************/

const personRepository = new PersonRepository();
const gandalf = new Person("Gandalf", 42, "gandalf@yahoo.com");

// Save the object
personRepository.save(gandalf).subscribe();

// Find the object
personRepository.findById("Gandalf").subscribe(foundGandalf => {
    // do something with it here
});
```

You can define a field to be the primary key of the repository by adding `@Id()` to it. If you want a number that is incremental you can use `@IncrementalId()`. 
If you want multiple properties to be a compound primary key you can add multiple `@CompoundId()` decorators to those fields. If you are using `@IncrementalId()` 
or `@CompoundId()` you need to add an additional generic parameter to the repository, e.g.:

In any case you **must** use one of the `@Id()`, `@CompoundId()` or `@IncrementalId()` decorators in your repository.

```typescript
/*****************************
* Compound ID:
*****************************/

class Person {
    @CompoundId() firstName: string;
    @CompoundId() lastName: string;
    // ...
}
class PersonRepository extends AbstractRepository<Person, [string, string]> {
    // ...
}

/*****************************
* Incremental ID:
*****************************/
class Person {
    @IncrementalId() identificationNumber: number;
    name: string;
    // ...
}
class PersonRepository extends AbstractRepository<Person, number> {
    // ...
}
```

To make keys unique you can use `@Unique()` and to have indexed fields (you can only use those in search queries) you need to use `@Indexed()`. 
`@CompoundId()` fields are not automatically indexed separately, so if you want to be able to query these you need to additionally add the
`@Indexed()` decorator to them. 

If you should at a later point upgrade your data model and e.g. add a unique or indexed field, you need to specify the respective database version in the decorator,
e.g. `@Unique({sinceVersion: 2})`. Versions start with **1** so if you update your model it is definitely at least version 2.

Methods you can use on repositories are: `save`, `saveAll`, `findById`, `findAll`, `delete`, `clear`, `count`.

Additionally, the `AbstractRepository` and `AbstractMappingRepository` allow searching using simple property equality checks and predicates with the `.search()` method.
This functionality is very basic and far from what Dexie actually offers. This is currently a low priority TODO but feel free to contribute.
   
It is recommended to have separate Dexie databases for every repository (due to some issues with Dexie and the versioning across multiple repositories). Use the `DatabaseAccess` class with care and
try not to create those classes with duplicate names unless you know what you do.

The repositories naturally work with RxJS and Observables. Due to the nature of IndexedDB there is no synchronous way to read or write any data.

* * *

Take a look at this project from the [subshell](https://subshell.com) team. We make [Sophora](https://subshell.com/sophora/): a content management software for content creation, curation, and distribution. [Join our team!](https://subshell.com/jobs/) | [Imprint](https://subshell.com/about/imprint/)
