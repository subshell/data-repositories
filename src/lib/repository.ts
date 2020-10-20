import {Observable} from "rxjs";
import {IndexableType} from "dexie";

export interface Repository<VALUE, KEY extends IndexableType = string> {

    save(value: VALUE): Observable<KEY>
    saveAll(...values: Array<VALUE>): Observable<Array<KEY>>
    findById(key: KEY): Observable<VALUE>
    findAll(): Observable<Array<VALUE>>
    delete(key: KEY): Observable<void>
    clear(): Observable<void>
    count(): Observable<number>

}
