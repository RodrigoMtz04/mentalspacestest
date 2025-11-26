import {availability, Availability, InsertAvailability, InsertRoom, Room, rooms} from "@shared/schema.ts";
import {db} from "../../persistencia/db.ts";
import {eq} from "drizzle-orm";


/*
Hola, Juan Carlo aqui.
Ls interfaz interRoomStorage sirve para garantizar que las clases que implementen esta interfaz usen los mismos metodos.
Estos metodos estan vacios y solo tienen los argumentos y el tipo de retorno en Premise.

Notaran mucho la precencia de los Promise-ses y async-s. Esto es porque las operaciones de base de datos son asincronas.
Eso quiere decir que estos metodos no interrumpen el flujo del sistema como pasaria en uno tradicional.

Un Promise esta definido como objeto y representa la eventual finalizacion o fracaso de una operacion asincrona. Permiten manejar tareas que tomen tiempo, como consultas a BDs o APIs sin pausar el hilo principal.
(por ende, toda funcion async DEBE devolver un Promise).

Un Promise puede estar en uno de los tres estados: pending, fulfilled y rejected.
Los promises se deben manejar en un try-catch, por si estos terminan en rejected.
Dentro del try, se debe usar await antes del metodo que retorne un Promise, para esperar a que se resuelva y obtener su resultado.
Naturalmente, await solo puede usarse dentro de funciones async y las pausara hasta que el Promise salga del estado pending.
 */
export interface interRoomStorage {
    getRoom(id: number): Promise<Room | undefined>;

    getAllRooms(): Promise<Room[]>;

    getActiveRooms(): Promise<Room[]>;

    createRoom(room: InsertRoom): Promise<Room>;

    updateRoom(id: number, room: Partial<Room>): Promise<Room | undefined>;
}

/*
MemRoomStorage es para pruebas o desarrollo rápido, ya que almacena datos temporalmente en un Map (osea, un diccionario).

Es una implementacion de interRoomStorage que usa un Map para almacenar las habitaciones en memoria.
Esto es util para pruebas o desarrollo rapido, pero no es persistente y se pierde al reiniciar la aplicacion.

Aunque en teoria, no necesitamos usar promises en esta clase, lo hacemos para mantener la misma interfaz que DBRoomStorage y simular los awaits de una base de datos, por asi decirlo.
 */
export class MemRoomStorage implements interRoomStorage {
    private rooms: Map<number, Room>;
    private currentId: number;

    constructor() {
        this.rooms = new Map(); //Map es basicamente un diccionario :v
        this.currentId = 1;
    }

    // Room operations
    async getRoom(id: number): Promise<Room | undefined> {
        return this.rooms.get(id);
    }

    async getAllRooms(): Promise<Room[]> {
        return Array.from(this.rooms.values());
    }

    async getActiveRooms(): Promise<Room[]> {
        return Array.from(this.rooms.values()).filter(room => room.isActive);
    }

    async createRoom(insertRoom: InsertRoom): Promise<Room> {
        const id = this.currentId++;
        const room: Room = {
            ...insertRoom,
            id,
            features: insertRoom.features || [],
            isActive: insertRoom.isActive !== undefined ? insertRoom.isActive : true
        };
        this.rooms.set(id, room);
        return room;
    }

    async updateRoom(id: number, roomUpdate: Partial<Room>): Promise<Room | undefined> {
        const room = this.rooms.get(id);
        if (!room) return undefined;

        const updatedRoom = { ...room, ...roomUpdate };
        this.rooms.set(id, updatedRoom);
        return updatedRoom;
    }
}

/*
DBRoomStorage utiliza Drizzle ORM para realizar operaciones CRUD en una base de datos SQL, siendo ideal para entornos de producción donde se requiere persistencia de datos.

Es una implementacion de interRoomStorage que usa Drizzle ORM para interactuar con una base de datos.
Cada metodo realiza una operacion CRUD (Create, Read, Update, Delete) en la tabla de habitaciones o disponibilidad.

Esta es el ejemplo perfecto para los promises y async-await, ya que las operaciones de base de datos son inherentemente asincronas.

Ahora, Drizzle ORM es una libreria para realizar operaciones CRUD en bases de datos SQL de manera tipada y segura. Soporta Postgres, MySQL y SQLite.
Usa un enfoque basado en esquemas para definir tablas y relaciones, lo que ayuda a prevenir errores comunes en consultas SQL.
Su sintaxis es declarativa (ermite expresar qué se quiere hacer en lugar de cómo hacerlo) y facil de leer.

El import db es una instancia de la conexión a la base de datos configurada con Drizzle ORM.
Se utiliza para realizar operaciones CRUD sobre las tablas definidas en el esquema.

El importe eq es una funcion de Drizzle ORM que se usa para construir condiciones de igualdad en las consultas SQL.
Aaqui se usa para checar si un campo es igual a un valor dado.

En otras palabras, db y eq (que eq es solo uno de varios operadores que Drizzle ORM provee) son para hacer comandos de SQL pero en typescript.
Miren el ejempplo en getRoom para que entiendan mejor.

Uiliza roonms de schema.ts, que es basicamente la tabla rooms en la base de datos., pero aqui en tpescript.
 */
export class DBRoomStorage implements interRoomStorage {
    /**
     * Obtiene una sala específica por su ID desde la base de datos.
     *
     * @param id - ID de la sala a buscar.
     * @returns Promesa que resuelve con un objeto Room si se encuentra, o `undefined` si no existe.
     */
    async getRoom(id: number): Promise<Room | undefined> {
        const result = await db.select().from(rooms).where(eq(rooms.id, id));
        //db.select().from(rooms).where seria en SQL: SELECT * FROM rooms WHERE id = id;
        //(eq(rooms.id, id)) es la condicion: WHERE id = idBuscado.
        return result[0];
    }

    /**
     * Obtiene todas las salas registradas en la base de datos.
     *
     * @returns Promesa que resuelve un arreglo con todas las salas (Room[]).
     */
    async getAllRooms(): Promise<Room[]> {
        return await db.select().from(rooms);
    }

    /**
     * Obtiene únicamente las salas activas desde la base de datos.
     *
     * @returns Promesa que resuelve un arreglo con las salas activas (Room[]).
     *
     * @description
     * Se filtran las salas usando la condición `isActive = true`.
     */
    async getActiveRooms(): Promise<Room[]> {
        return await db.select().from(rooms).where(eq(rooms.isActive, true));
    }

    /**
     * Crea una nueva sala en la base de datos.
     *
     * @param insertRoom - Datos de la nueva sala (nombre, descripción, precio, etc.).
     * @returns Promesa que resuelve con el objeto Room recién creado.
     */
    async createRoom(insertRoom: InsertRoom): Promise<Room> {
        const result = await db.insert(rooms).values(insertRoom).returning();
        return result[0];
    }

    /**
     * Actualiza los datos de una sala existente.
     *
     * @param id - ID de la sala a actualizar.
     * @param room - Objeto parcial con los campos a modificar.
     * @returns Promesa que resuelve con el objeto Room actualizado, o `undefined` si no se encontró.
     *
     * @description
     * Este método utiliza una actualización parcial (`Partial<Room>`), lo que permite modificar
     * solo los campos necesarios sin sobrescribir el resto.
     */
    async updateRoom(id: number, room: Partial<Room>): Promise<Room | undefined> {
        const result = await db.update(rooms).set(room).where(eq(rooms.id, id)).returning();
        return result[0];
    }

    /**
     * Obtiene todos los horarios de disponibilidad asociados a una sala específica.
     *
     * @param roomId - ID de la sala.
     * @returns Promesa que resuelve un arreglo de objetos Availability.
     */
    async getRoomAvailability(roomId: number): Promise<Availability[]> {
        return await db.select().from(availability).where(eq(availability.roomId, roomId));
    }

    /**
     * Crea un nuevo registro de disponibilidad para una sala.
     *
     * @param insertAvailability - Datos de la disponibilidad a insertar.
     * @returns Promesa que resuelve el objeto Availability recién creado.
     */
    async createAvailability(insertAvailability: InsertAvailability): Promise<Availability> {
        const result = await db.insert(availability).values(insertAvailability).returning();
        return result[0];
    }
}

export const roomStorage = new DBRoomStorage();