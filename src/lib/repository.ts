import {Observable} from "rxjs";

export interface Repository<VALUE, KEY = string> {

    save(value: VALUE): Observable<KEY>
    saveAll(...values: Array<VALUE>): Observable<Array<KEY>>
    findById(key: KEY): Observable<VALUE>
    findAll(): Observable<Array<VALUE>>
    delete(key: KEY): Observable<void>
    clear(): Observable<void>
    count(): Observable<number>

}