import Dexie from "dexie";

/**
 * This class lets you create an instance of a Database that can be provided to your repository.
 * Take care to create one database per repository, currently you might encounter issues otherwise.
 */
export class DatabaseAccess {

  protected constructor(public db: Dexie) {
  }

  public static get(name: string): DatabaseAccess {
    return new DatabaseAccess(new Dexie(name));
  }

}

/**
 * Use with care. This does not always work as you would wish, when you are using database versions
 * and different tables / repositories.
 */
export class SingletonDatabaseAccess extends DatabaseAccess {
  private static instance?: SingletonDatabaseAccess;

  public static get(name: string): DatabaseAccess {
    if (!SingletonDatabaseAccess.instance) {
      SingletonDatabaseAccess.instance = new SingletonDatabaseAccess(new Dexie(name));
    }
    return SingletonDatabaseAccess.instance;
  }
}
