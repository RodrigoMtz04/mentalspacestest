import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { userStorage } from "./storage/userStorage";
import { User as SelectUser } from "@shared/schema";
import { log } from "../log";
import { systemLogsStorage } from "./storage/systemLogsStorage";
import { pool } from "../persistencia/db";
import bcrypt from "bcrypt";
import { paymentStorage } from "./storage/paymentStorage";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    lastActivity?: number;
    createdAt?: number;
  }
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const SESSION_TIMEOUT_MINUTES = parseInt(process.env.SESSION_TIMEOUT_MINUTES || "30", 10); // inactividad
const SESSION_ABSOLUTE_DAYS = parseInt(process.env.SESSION_ABSOLUTE_DAYS || "7", 10); // duración absoluta
const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;
const SESSION_ABSOLUTE_MS = SESSION_ABSOLUTE_DAYS * 24 * 60 * 60 * 1000;

/** Registra un log de auditoría seguro */
async function audit(severity: "INFO" | "WARN" | "ERROR" | "CRITICAL", message: string, endpoint: string, userId?: number) {
  try {
    await systemLogsStorage.createLog({ severity, message, endpoint, userId });
  } catch (e) {
    log(`No se pudo guardar log de auditoría: ${(e as Error).message}`);
  }
}

export function setupAuth(app: Express) {
  const PgSession = connectPgSimple(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'SATI-centro-consulta-secret',
    resave: false,
    saveUninitialized: false,
    rolling: true, // sliding expiration
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: 'session'
    }) as any,
    cookie: {
      secure: false, // cambiar a true detrás de HTTPS
      httpOnly: true,
      maxAge: SESSION_ABSOLUTE_MS, // expiración absoluta
      sameSite: 'lax'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Middleware para verificar inactividad antes de cualquier ruta protegida
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) return next();
    if (req.isAuthenticated && req.isAuthenticated()) {
      const now = Date.now();
      const last = req.session.lastActivity || req.session.createdAt || now;
      // Chequeo de inactividad
      if (now - last > SESSION_TIMEOUT_MS) {
        const userId = (req.user as any)?.id;
        audit('INFO', 'Logout por inactividad', req.originalUrl, userId);
        req.logout(() => {
          req.session.destroy(() => {
            return res.status(401).json({ message: 'Tu sesión ha finalizado por inactividad' });
          });
        });
        return;
      }
      // Actualizamos actividad y aseguramos creación
      req.session.lastActivity = now;
      if (!req.session.createdAt) req.session.createdAt = now;
    }
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      log(`Intentando autenticar usuario: ${username}`, "auth");
      try {
        const user = await userStorage.getUserByUsername(username);
        if (!user) {
          log(`Usuario no encontrado: ${username}`, "auth");
          return done(null, false, { message: "Usuario no encontrado" });
        }
        // TODO: implementar hashing seguro
        if (user.password !== password) {
          log(`Contraseña incorrecta para usuario: ${username}`, "auth");
          return done(null, false, { message: "Contraseña incorrecta" });
        }
        log(`Usuario autenticado correctamente: ${username}`, "auth");
        return done(null, user);
      } catch (error) {
        log(`Error durante autenticación: ${error}`, "auth");
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    log(`Serializando usuario: ${user.id}`, "auth");
    done(null, (user as any).id as number);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      log(`Deserializando usuario: ${id}`, "auth");
      const user = await userStorage.getUser(id);
      if (!user) {
        log(`Usuario no encontrado durante deserialización: ${id}`, "auth");
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      log(`Error durante deserialización: ${error}`, "auth");
      done(error, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      log(`Solicitud de registro: ${req.body.username}`, "auth");
      const existingUser = await userStorage.getUserByUsername(req.body.username);
      if (existingUser) {
        log(`Nombre de usuario ya existe: ${req.body.username}`, "auth");
        return res.status(400).json({ message: "Nombre de usuario ya existe" });
      }

      const user = await userStorage.createUser({
        ...req.body,
      });

      log(`Usuario registrado correctamente: ${user.id}, ${user.username}`, "auth");
      req.login(user, async (err) => {
        if (err) {
          log(`Error al iniciar sesión post-registro: ${err}`, "auth");
          return next(err);
        }
        req.session.userId = user.id;
        req.session.createdAt = Date.now();
        req.session.lastActivity = Date.now();
        await audit('INFO', 'Registro y login', '/api/register', user.id);
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      log(`Error durante registro: ${error}`, "auth");
      next(error);
    }
  });

    app.post("/api/login", async (req, res, next) => {
        const { username, password } = req.body;
        log(`Solicitud de login: ${username}`, "auth");

        try {
            const user = await userStorage.getUserByUsername(username);
            if (!user) {
                log(`Usuario no encontrado: ${username}`, "auth");
                return res.status(401).json({ message: "Usuario no encontrado" });
            }

            // Comparar contraseña encriptada
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                log(`Contraseña incorrecta para usuario: ${username}`, "auth");
                return res.status(401).json({ message: "Contraseña incorrecta" });
            }

            // Iniciar sesión
            req.login(user, (err) => {
                if (err) {
                    log(`Error al iniciar sesión: ${err}`, "auth");
                    return next(err);
                }

                log(`Usuario autenticado: ${user.id}, ${user.username}`, "auth");
                log(`Sesión iniciada: ${req.sessionID}`, "auth");
                log(`Detalles de sesión: ${JSON.stringify({
                    id: req.sessionID,
                    cookie: req.session.cookie,
                    passport: (req.session as any).passport
                })}`, "auth");

                const { password, ...userWithoutPassword } = user;
                res.status(200).json(userWithoutPassword);
            });
        } catch (error) {
            log(`Error durante login: ${error}`, "auth");
            next(error);
        }
    });

  // Endpoint para tocar actividad manualmente (desde frontend: interacción del usuario)
  app.post('/api/session/touch', (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: 'No autorizado' });
    }
    req.session.lastActivity = Date.now();
    res.json({ ok: true, lastActivity: req.session.lastActivity, timeoutMs: SESSION_TIMEOUT_MS });
  });

  // Logout estándar
  app.post("/api/logout", async (req, res, next) => {
    log(`Solicitud de logout: ${(req.user as any)?.username || 'desconocido'}`, "auth");
    const uid = (req.user as any)?.id;
    req.logout(async (err) => {
      if (err) {
        log(`Error al cerrar sesión: ${err}`, "auth");
        return next(err);
      }
      await audit('INFO', 'Logout manual', '/api/logout', uid);
      res.sendStatus(200);
    });
  });

  // Logout por inactividad (disparado desde frontend opcionalmente)
  app.post('/api/logout/inactive', async (req, res) => {
    const uid = (req.user as any)?.id;
    await audit('INFO', 'Logout forzado por inactividad (frontend)', '/api/logout/inactive', uid);
    req.logout(() => {
      req.session.destroy(() => {
        res.status(200).json({ message: 'Tu sesión ha finalizado por inactividad' });
      });
    });
  });

  // Logout en todos los dispositivos
  app.post('/api/logout/all', async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: 'No autorizado' });
    }
    const currentUserId = (req.user as any)?.id;
    try {
      // Eliminar todas las sesiones donde passport.user == currentUserId
      await pool.query(
        `DELETE FROM "session" WHERE (sess->'passport'->>'user')::int = $1`,
        [currentUserId]
      );
      await audit('INFO', `Logout global usuario ${currentUserId}`, '/api/logout/all', currentUserId);
      // Destruir la sesión actual por si no fue eliminada por la query (según store)
      req.logout(() => {
        req.session.destroy(() => {
          res.status(200).json({ message: 'Has cerrado sesión en todos tus dispositivos.' });
        });
      });
    } catch (e: any) {
      await audit('ERROR', `Fallo en logout global: ${e?.message || e}`, '/api/logout/all', currentUserId);
      res.status(500).json({ message: 'Error al cerrar sesión globalmente' });
    }
  });

  app.get("/api/user", async (req, res) => {
    log(`Verificando usuario actual. Session ID: ${req.sessionID}`, "auth");
    log(`¿Usuario autenticado?: ${req.isAuthenticated()}`, "auth");

    if (!req.isAuthenticated()) {
      log(`Usuario no autenticado`, "auth");
      return res.status(401).json({
        message: "No autorizado",
        sessionInfo: {
          id: req.sessionID,
          isAuthenticated: req.isAuthenticated()
        }
      });
    }

    // Obtener usuario fresco desde BD por seguridad (req.user puede estar desactualizado en algunos casos)
    try {
      const raw = await userStorage.getUser((req.user as any).id);
      if (!raw) return res.status(404).json({ message: 'Usuario no encontrado' });

      // Recalcular estado efectivo de suscripción/pago.
      let effectiveStatus: 'active' | 'inactive' | 'pending' = (raw.paymentStatus as any) || 'inactive';
      const lastSucceeded = await paymentStorage.getLastSucceededPaymentForUser(raw.id);
      const now = Date.now();
      const subEnd = raw.subscriptionEndDate ? new Date(raw.subscriptionEndDate).getTime() : null;
      const isExpired = subEnd != null && subEnd < now;
      if (!lastSucceeded || isExpired) {
        // Considerar si hay pagos pendientes para mostrar 'pending'
        const pending = await paymentStorage.getPaymentByUserAndStatus(raw.id, 'pending');
        effectiveStatus = pending.length > 0 ? 'pending' : 'inactive';
      } else {
        effectiveStatus = 'active';
      }

      // No persistimos aquí (solo vista), pero podríamos normalizar si difiere
      const { password, ...userWithoutPassword } = raw as any;
      return res.json({ ...userWithoutPassword, paymentStatus: effectiveStatus });
    } catch (e: any) {
      log(`Error obteniendo usuario actual: ${e?.message || e}`, 'auth');
      return res.status(500).json({ message: 'Error interno' });
    }
  });
}