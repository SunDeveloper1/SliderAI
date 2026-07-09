import dotenv from "dotenv";
dotenv.config({ override: true });

import express from "express";
import path from "path";
import fs from "fs";
import pg from "pg";
import { GoogleGenAI, Type } from "@google/genai";
import { MongoClient } from "mongodb";

const DB_FILE = path.join(process.cwd(), "workspaces_db.json");

const app = express();
const PORT = 3000;


// Parse DB_VENDOR robustly (case-insensitive, trimmed, defaults to FIREBASE)
const rawVendor = (process.env.DB_VENDOR || "FIREBASE").trim().toUpperCase();
const isPostgres = rawVendor === "POSTGRES";
const isMongo = rawVendor === "MONGODB" || rawVendor === "MONGO";

console.log("----------------------------------------");
console.log(`DATABASE ENGINE CONFIGURATION:`);
console.log(`- DB_VENDOR is resolved to: "${rawVendor}"`);
console.log(`- Using PostgreSQL database driver? ${isPostgres ? "YES" : "NO"}`);
console.log(`- Using MongoDB database driver? ${isMongo ? "YES" : "NO"}`);
if (isPostgres) {
  let dbHost = "None";
  if (process.env.DB_URI) {
    try {
      dbHost = new URL(process.env.DB_URI).hostname;
    } catch {
      dbHost = "Invalid URI format";
    }
  }
  console.log(`- PostgreSQL host: "${dbHost}"`);
}
function repairMongoUri(uri: string): string {
  if (!uri) return uri;
  try {
    // Find if there are multiple '@' characters before any '?' or '/'
    const prefixMatch = uri.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/);
    if (!prefixMatch) return uri;
    
    const prefix = prefixMatch[1]; // "mongodb://" or "mongodb+srv://"
    const rest = prefixMatch[2];
    
    // Find the end of the authority part (either '/' or '?' or end of string)
    let authorityEnd = rest.indexOf('/');
    if (authorityEnd === -1) {
      authorityEnd = rest.indexOf('?');
    }
    if (authorityEnd === -1) {
      authorityEnd = rest.length;
    }
    
    const authority = rest.substring(0, authorityEnd);
    const suffix = rest.substring(authorityEnd);
    
    // Check if there are multiple '@' signs in the authority
    const parts = authority.split('@');
    if (parts.length > 2) {
      // Multiple '@' signs found!
      // The last one is the actual host boundary.
      const host = parts[parts.length - 1];
      const userPassPart = parts.slice(0, parts.length - 1).join('@');
      
      // Now parse username and password
      const firstColon = userPassPart.indexOf(':');
      if (firstColon !== -1) {
        const username = userPassPart.substring(0, firstColon);
        const password = userPassPart.substring(firstColon + 1);
        
        // URL-encode the password if it's not already fully encoded
        // Standard check: only encode if it contains unencoded characters like '@'
        if (password.includes('@') && !password.includes('%')) {
          const encodedPassword = encodeURIComponent(password);
          const repairedAuthority = `${username}:${encodedPassword}@${host}`;
          return `${prefix}${repairedAuthority}${suffix}`;
        }
      }
    }
  } catch (e) {
    console.error("Error repairing MongoDB URI:", e);
  }
  return uri;
}

function resolveMongoUri(): string | undefined {
  let uri: string | undefined;
  if (process.env.MONGODB_URI) {
    uri = process.env.MONGODB_URI;
  } else if (process.env.DB_URI && (process.env.DB_URI.startsWith("mongodb://") || process.env.DB_URI.startsWith("mongodb+srv://"))) {
    uri = process.env.DB_URI;
  } else {
    uri = process.env.DB_URI;
  }
  return uri ? repairMongoUri(uri) : undefined;
}

if (isMongo) {
  let dbHost = "None";
  const mUri = resolveMongoUri();
  if (mUri) {
    try {
      dbHost = new URL(mUri).hostname;
    } catch {
      dbHost = "Invalid URI format";
    }
  }
  console.log(`- MongoDB host: "${dbHost}"`);
}
console.log("----------------------------------------");

const DB_CA_CERT = `-----BEGIN CERTIFICATE-----
MIIERDCCAqygAwIBAgIUZ66qbOv0GIAewf28XQsKPTjPLvcwDQYJKoZIhvcNAQEM
BQAwOjE4MDYGA1UEAwwvNzM2ZjFiZWQtYTA1Yy00OWVmLTk5NTUtMzEwOWQ0ODcy
YzlmIFByb2plY3QgQ0EwHhcNMjYwNjIyMTAyMzA5WhcNMzYwNjE5MTAyMzA5WjA6
MTgwNgYDVQQDDC83MzZmMWJlZC1hMDVjLTQ5ZWYtOTk1NS0zMTA5ZDQ4NzJjOWYg
UHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCCAYoCggGBAMAgZyCd
Q49W43apKrwewhwoaBhKNEleA5i8qoiCGtRWsjVp5HtfMnHtdJgygPPavADUBC+R
XUZvv5qDCw7Lq+AuAgPK1yO1qZBIYcz2e1WBCYRDxFlN+68aqa4RIF0bx7lPawUS
9r6sVpdEuDYpk8oQalqC/JtYP9DmdHVj3G+YoniChWOL4kP+QW0MstbxsPwRnq+Y
1OBvDRtMplmTcXfgicf9gL7XGIF0WTTbJtVwyFoxCMJXP9EUQxEjucycXP/LA6Ad
sRbJzqgM23Yri7ZSIfq4yUfeNrs7KtHaisSAUZVSjMWu1u/tyT6E9kuacE5E0Lmj
MeYAIdMMKlJUdHBLgHv25JpcQBPKuiqIOd5Uyn9I7QD0OoGXaVH17bMc2z4xaCHs
xnxUhdnfTS/iZjE85lDq8b/pAwBQRNhryCGKZrHAqyBCdk9l6akfiZwNztRndqr2
3V9ryvrds54vHpY2Bkkrd4TU2budisU342ii/kYd+jkcpfdiobs3HPJ9kQIDAQAB
o0IwQDAdBgNVHQ4EFgQUMYww4uj8DDLsw1Qj3NqHi3SjYIUwEgYDVR0TAQH/BAgw
BgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQADggGBAE3hrjBWGQoA
bx52xEcSHLetY9jM7JHNOR1zTfkW/M5wM9KL1jlxM/9n5B0f/NpoNuOBvQh0m7vo
WVpi8jifl7XE90DEQTEflvONngmiFPKs8VtIU1woVrBnWaGf/c/bxDvD2347sFyl
y/M8dZpUjOA0mTznubuh7QoBgA1XZdbEBcwzZj3gVGalImwgmsZFBARWqSvR0ZCR
XstwyMIx1ZmfKjq/Z1VcU8VElY+K/KoWvBrofBsctCR0f/Sqmk0cgWlphJXYK40Z
iCzeWBhNtJqMECwSjmubUhN6/Epg6PEnYRmJpqY5dANvCqXGuRSMKep8rPoazrYS
GKJV/O9VxKtAr5MYbubFxymk8ekIDG7I7TtPbetHjNS43OczVbzKh/oYKOCDeiYf
O7mfOBHzKf0XJnkTu6jDVIjeHNI1lQ0ZF7a2wzLtEp1bgYIpVNPlXk6nsC8H0EU3
nAkiDaNpZqiVKVILDRBQdbtPejvMoJjHFpndwADtWWzgfIu+mljOcg==
-----END CERTIFICATE-----`;

let pool: pg.Pool | null = null;

function getPgPool(): pg.Pool {
  if (!pool) {
    const uri = process.env.DB_URI;
    if (!uri) {
      throw new Error("DB_URI environment variable is required because DB_VENDOR is set to POSTGRES");
    }
    
    const useSsl = !uri.includes("localhost") && !uri.includes("127.0.0.1");
    
    pool = new pg.Pool({
      connectionString: uri,
      ssl: useSsl ? {
        ca: DB_CA_CERT,
        rejectUnauthorized: false
      } : false
    });
  }
  return pool;
}

let mongoClient: MongoClient | null = null;

function getMongoDb() {
  if (!mongoClient) {
    const uri = resolveMongoUri();
    if (!uri) {
      throw new Error("DB_URI or MONGODB_URI environment variable is required because DB_VENDOR is set to MONGODB");
    }
    mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });
  }
  return mongoClient.db();
}

async function initMongoDb() {
  if (!isMongo) return;
  try {
    const db = getMongoDb();
    console.log("Connecting to MongoDB database...");
    const mongoUserCount = await db.collection("users").countDocuments();
    console.log(`MongoDB connection established. Found ${mongoUserCount} existing users.`);
    
    if (mongoUserCount === 0) {
      const localDb = getDb();
      if (localDb.users && localDb.users.length > 0) {
        console.log(`[MIGRATION] Migrating ${localDb.users.length} users to MongoDB...`);
        await db.collection("users").insertMany(localDb.users);
      }
      if (localDb.workspaces && localDb.workspaces.length > 0) {
        console.log(`[MIGRATION] Migrating ${localDb.workspaces.length} workspaces to MongoDB...`);
        await db.collection("workspaces").insertMany(localDb.workspaces);
      }
      const slidesEntries = Object.entries(localDb.slides || {});
      if (slidesEntries.length > 0) {
        console.log(`[MIGRATION] Migrating slides for ${slidesEntries.length} workspaces...`);
        const allSlides: any[] = [];
        for (const [workspaceId, slides] of slidesEntries) {
          if (Array.isArray(slides)) {
            slides.forEach(s => {
              allSlides.push({
                id: s.id,
                workspaceId,
                slideNumber: s.slideNumber,
                markdownContent: s.markdownContent,
                audioUrl: s.audioUrl || ""
              });
            });
          }
        }
        if (allSlides.length > 0) {
          await db.collection("slides").insertMany(allSlides);
        }
      }
      console.log("[MIGRATION] Data migrated to MongoDB successfully!");
    }
  } catch (err) {
    console.error("Failed to initialize or migrate MongoDB database:", err);
  }
}

interface DbData {
  workspaces: any[];
  slides: Record<string, any[]>;
  users: any[];
}

function getDb(): DbData {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf8");
      const parsed = JSON.parse(data);
      return {
        workspaces: parsed.workspaces || [],
        slides: parsed.slides || {},
        users: parsed.users || []
      };
    }
  } catch (err) {
    console.error("Failed to read local DB file:", err);
  }
  return { workspaces: [], slides: {}, users: [] };
}

function saveDb(data: DbData) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write local DB file:", err);
  }
}

// Database helper driver wrapping Postgres, MongoDB & file-based storage
const dbObj = {
  async findUserByUsername(username: string): Promise<any | null> {
    const cleanUsername = username.trim().toLowerCase();
    if (isMongo) {
      const db = getMongoDb();
      return await db.collection("users").findOne({ username: { $regex: new RegExp(`^${cleanUsername}$`, "i") } }) || null;
    } else if (isPostgres) {
      const client = getPgPool();
      const res = await client.query("SELECT * FROM users WHERE LOWER(username) = $1", [cleanUsername]);
      return res.rows[0] || null;
    } else {
      const dbData = getDb();
      return dbData.users.find((u) => u.username.toLowerCase() === cleanUsername) || null;
    }
  },

  async createUser(id: string, username: string, pin: string): Promise<any> {
    const cleanUsername = username.trim();
    if (isMongo) {
      const db = getMongoDb();
      const newUser = { id, username: cleanUsername, pin };
      await db.collection("users").insertOne(newUser);
      return newUser;
    } else if (isPostgres) {
      const client = getPgPool();
      await client.query("INSERT INTO users (id, username, pin) VALUES ($1, $2, $3)", [id, cleanUsername, pin]);
      return { id, username: cleanUsername, pin };
    } else {
      const dbData = getDb();
      const newUser = { id, username: cleanUsername, pin };
      dbData.users.push(newUser);
      saveDb(dbData);
      return newUser;
    }
  },

  async getUserWorkspaces(userId: string): Promise<any[]> {
    if (isMongo) {
      const db = getMongoDb();
      const workspaces = await db.collection("workspaces").find({ ownerId: userId }).toArray();
      const list = [];
      for (const ws of workspaces) {
        const count = await db.collection("slides").countDocuments({ workspaceId: ws.id });
        list.push({
          id: ws.id,
          name: ws.name,
          markdownText: ws.markdownText || ws.markdown_text || "",
          ownerId: ws.ownerId || ws.owner_id || "",
          createdAt: ws.createdAt || ws.created_at || "",
          updatedAt: ws.updatedAt || ws.updated_at || "",
          slidesCount: count
        });
      }
      return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (isPostgres) {
      const client = getPgPool();
      const res = await client.query(`
        SELECT w.*, COALESCE(s.count, 0)::int as "slidesCount"
        FROM workspaces w
        LEFT JOIN (
          SELECT workspace_id, COUNT(*) as count
          FROM slides
          GROUP BY workspace_id
        ) s ON w.id = s.workspace_id
        WHERE w.owner_id = $1
        ORDER BY w.updated_at DESC
      `, [userId]);
      
      return res.rows.map(row => ({
        id: row.id,
        name: row.name,
        markdownText: row.markdown_text,
        ownerId: row.owner_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        slidesCount: row.slidesCount
      }));
    } else {
      const dbData = getDb();
      const userWorkspaces = dbData.workspaces.filter((w) => w.ownerId === userId);
      const list = userWorkspaces.map((ws) => {
        const workspaceSlides = dbData.slides[ws.id] || [];
        return {
          ...ws,
          slidesCount: workspaceSlides.length
        };
      });
      return list.sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    }
  },

  async createWorkspace(workspace: any, slides: any[]): Promise<any> {
    if (isMongo) {
      const db = getMongoDb();
      await db.collection("workspaces").insertOne({
        id: workspace.id,
        name: workspace.name,
        markdownText: workspace.markdownText,
        ownerId: workspace.ownerId,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt
      });
      if (Array.isArray(slides) && slides.length > 0) {
        const formattedSlides = slides.map(s => ({
          id: s.id,
          workspaceId: workspace.id,
          slideNumber: s.slideNumber,
          markdownContent: s.markdownContent,
          audioUrl: s.audioUrl || ""
        }));
        await db.collection("slides").insertMany(formattedSlides);
      }
      return workspace;
    } else if (isPostgres) {
      const client = getPgPool();
      await client.query(`
        INSERT INTO workspaces (id, name, markdown_text, owner_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [workspace.id, workspace.name, workspace.markdownText, workspace.ownerId, workspace.createdAt, workspace.updatedAt]);

      for (const slide of slides) {
        await client.query(`
          INSERT INTO slides (id, workspace_id, slide_number, markdown_content, audio_url)
          VALUES ($1, $2, $3, $4, $5)
        `, [slide.id, workspace.id, slide.slideNumber, slide.markdownContent, slide.audioUrl || ""]);
      }
      return workspace;
    } else {
      const dbData = getDb();
      dbData.workspaces.push(workspace);
      dbData.slides[workspace.id] = slides;
      saveDb(dbData);
      return workspace;
    }
  },

  async getWorkspace(id: string): Promise<any | null> {
    if (isMongo) {
      const db = getMongoDb();
      const ws = await db.collection("workspaces").findOne({ id });
      if (!ws) return null;
      return {
        id: ws.id,
        name: ws.name,
        markdownText: ws.markdownText || ws.markdown_text || "",
        ownerId: ws.ownerId || ws.owner_id || "",
        createdAt: ws.createdAt || ws.created_at || "",
        updatedAt: ws.updatedAt || ws.updated_at || ""
      };
    } else if (isPostgres) {
      const client = getPgPool();
      const res = await client.query("SELECT * FROM workspaces WHERE id = $1", [id]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        name: row.name,
        markdownText: row.markdown_text,
        ownerId: row.owner_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } else {
      const dbData = getDb();
      return dbData.workspaces.find((w) => w.id === id) || null;
    }
  },

  async getWorkspaceSlides(workspaceId: string): Promise<any[]> {
    if (isMongo) {
      const db = getMongoDb();
      const slides = await db.collection("slides").find({ workspaceId }).toArray();
      return slides.map(s => ({
        id: s.id,
        workspaceId: s.workspaceId,
        slideNumber: s.slideNumber,
        markdownContent: s.markdownContent || "",
        audioUrl: s.audioUrl || ""
      })).sort((a, b) => a.slideNumber - b.slideNumber);
    } else if (isPostgres) {
      const client = getPgPool();
      const res = await client.query("SELECT * FROM slides WHERE workspace_id = $1 ORDER BY slide_number ASC", [workspaceId]);
      return res.rows.map(row => ({
        id: row.id,
        workspaceId: row.workspace_id,
        slideNumber: row.slide_number,
        markdownContent: row.markdown_content,
        audioUrl: row.audio_url
      }));
    } else {
      const dbData = getDb();
      const slides = dbData.slides[workspaceId] || [];
      return [...slides].sort((a, b) => a.slideNumber - b.slideNumber);
    }
  },

  async updateWorkspace(id: string, name: string | undefined, slides: any[] | undefined): Promise<{ workspace: any, slides: any[] }> {
    const now = new Date().toISOString();
    if (isMongo) {
      const db = getMongoDb();
      const existing = await this.getWorkspace(id);
      if (!existing) {
        throw new Error("Workspace not found");
      }

      const updatedName = typeof name === "string" ? name.trim().slice(0, 150) : existing.name;
      const firstSlideMarkdown = Array.isArray(slides) && slides.length > 0 ? slides[0].markdownContent : existing.markdownText;

      await db.collection("workspaces").updateOne(
        { id },
        {
          $set: {
            name: updatedName,
            markdownText: firstSlideMarkdown,
            updatedAt: now
          }
        }
      );

      if (Array.isArray(slides)) {
        await db.collection("slides").deleteMany({ workspaceId: id });
        if (slides.length > 0) {
          const formattedSlides = slides.map(s => ({
            id: s.id,
            workspaceId: id,
            slideNumber: s.slideNumber,
            markdownContent: s.markdownContent,
            audioUrl: s.audioUrl || ""
          }));
          await db.collection("slides").insertMany(formattedSlides);
        }
      }

      const freshWorkspace = await this.getWorkspace(id);
      const freshSlides = await this.getWorkspaceSlides(id);
      return {
        workspace: freshWorkspace,
        slides: freshSlides
      };
    } else if (isPostgres) {
      const client = getPgPool();
      const existing = await this.getWorkspace(id);
      if (!existing) {
        throw new Error("Workspace not found");
      }

      const updatedName = typeof name === "string" ? name.trim().slice(0, 150) : existing.name;
      const firstSlideMarkdown = Array.isArray(slides) && slides.length > 0 ? slides[0].markdownContent : existing.markdownText;

      await client.query(`
        UPDATE workspaces 
        SET name = $1, markdown_text = $2, updated_at = $3 
        WHERE id = $4
      `, [updatedName, firstSlideMarkdown, now, id]);

      if (Array.isArray(slides)) {
        await client.query("DELETE FROM slides WHERE workspace_id = $1", [id]);
        for (const slide of slides) {
          await client.query(`
            INSERT INTO slides (id, workspace_id, slide_number, markdown_content, audio_url)
            VALUES ($1, $2, $3, $4, $5)
          `, [slide.id, id, slide.slideNumber, slide.markdownContent, slide.audioUrl || ""]);
        }
      }

      const freshWorkspace = await this.getWorkspace(id);
      const freshSlides = await this.getWorkspaceSlides(id);
      return {
        workspace: freshWorkspace,
        slides: freshSlides
      };
    } else {
      const dbData = getDb();
      const workspaceIdx = dbData.workspaces.findIndex((w) => w.id === id);
      if (workspaceIdx === -1) {
        throw new Error("Workspace not found");
      }

      const existingWorkspace = dbData.workspaces[workspaceIdx];
      const updatedWorkspace = {
        ...existingWorkspace,
        name: typeof name === "string" ? name.trim().slice(0, 150) : existingWorkspace.name,
        markdownText: Array.isArray(slides) && slides.length > 0 ? slides[0].markdownContent : existingWorkspace.markdownText,
        updatedAt: now
      };

      dbData.workspaces[workspaceIdx] = updatedWorkspace;

      if (Array.isArray(slides)) {
        dbData.slides[id] = slides;
      }
      saveDb(dbData);

      return {
        workspace: updatedWorkspace,
        slides: dbData.slides[id] || []
      };
    }
  },

  async deleteWorkspace(id: string): Promise<void> {
    if (isMongo) {
      const db = getMongoDb();
      await db.collection("slides").deleteMany({ workspaceId: id });
      await db.collection("workspaces").deleteMany({ id });
    } else if (isPostgres) {
      const client = getPgPool();
      await client.query("DELETE FROM slides WHERE workspace_id = $1", [id]);
      await client.query("DELETE FROM workspaces WHERE id = $1", [id]);
    } else {
      const dbData = getDb();
      const workspaceIdx = dbData.workspaces.findIndex((w) => w.id === id);
      if (workspaceIdx !== -1) {
        dbData.workspaces.splice(workspaceIdx, 1);
        delete dbData.slides[id];
        saveDb(dbData);
      }
    }
  }
};

// Ensure database tables exist if we are in POSTGRES mode
async function initPgTables() {
  if (!isPostgres) return;
  const client = getPgPool();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        pin VARCHAR(4) NOT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        markdown_text TEXT,
        owner_id VARCHAR(255) NOT NULL,
        created_at VARCHAR(255) NOT NULL,
        updated_at VARCHAR(255) NOT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS slides (
        id VARCHAR(255) PRIMARY KEY,
        workspace_id VARCHAR(255) NOT NULL,
        slide_number INT NOT NULL,
        markdown_content TEXT,
        audio_url TEXT
      );
    `);
    console.log("PostgreSQL schema validated/created successfully.");
  } catch (err) {
    console.error("Failed to initialize PostgreSQL schema:", err);
  }
}

async function startServer() {
  // Ensure database is initialized based on vendor
  if (isMongo) {
    await initMongoDb();
  } else if (isPostgres) {
    await initPgTables();
  }

  app.use(express.json());

  // Log requests
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // REST API: POST user registration (username and 4-digit PIN)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, pin } = req.body;
      if (!username || typeof username !== "string" || !username.trim()) {
        res.status(400).json({ error: "Username is required" });
        return;
      }
      const cleanUsername = username.trim();
      if (cleanUsername.length < 3) {
        res.status(400).json({ error: "Username must be at least 3 characters long" });
        return;
      }

      if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
        res.status(400).json({ error: "PIN must be exactly 4 digits (numeric)" });
        return;
      }

      const alreadyExists = await dbObj.findUserByUsername(cleanUsername);
      if (alreadyExists) {
        res.status(400).json({ error: "Username is already taken" });
        return;
      }

      const newUserId = "user_" + Math.random().toString(36).substring(2, 12);
      await dbObj.createUser(newUserId, cleanUsername, pin);

      // Seed an initial gorgeous slides presentation for the newly registered user
      const presentationId = "ws_" + Math.random().toString(36).substring(2, 12);
      const now = new Date().toISOString();
      const welcomeWork = {
        id: presentationId,
        name: "My First Presentation Workspace",
        markdownText: `# ScribeSlide AI Guide\n\n- Welcome to your personal workspace, ${cleanUsername}!\n- Enjoy standard formatting, modular presentation components, and responsive audio voiceovers.`,
        ownerId: newUserId,
        createdAt: now,
        updatedAt: now
      };

      const welcomeSlides = [
        {
          id: "slide_1",
          workspaceId: presentationId,
          slideNumber: 1,
          markdownContent: `# Welcome to ScribeSlide AI\n\n- Welcome to your personal account workspace, ${cleanUsername}!\n- This is slides dashboard where you can edit individual presentation slides.\n- Try typing some details or pasting layout notes in the editor on the right!`,
          audioUrl: ""
        },
        {
          id: "slide_2",
          workspaceId: presentationId,
          slideNumber: 2,
          markdownContent: `## Real-Time Navigation\n\n- Re-arrange, visual select, and review slides seamlessly on the left.\n- Standard custom grid display allows easy list management.\n- Use **New Slide** or **Delete Slide** to control slide stacks.`,
          audioUrl: ""
        },
        {
          id: "slide_3",
          workspaceId: presentationId,
          slideNumber: 3,
          markdownContent: `## Multi-Format Uploads & Images\n\n- Copy/Paste or Drag & Drop images directly into the Markdown Editor!\n- Embedded Base64 raw graphics are saved effortlessly in real-time.\n- Clean markdown visual assets rendered instantaneously in preview.`,
          audioUrl: ""
        }
      ];

      await dbObj.createWorkspace(welcomeWork, welcomeSlides);

      res.status(201).json({
        success: true,
        user: { id: newUserId, username: cleanUsername }
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: POST user login (username and 4-digit PIN)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, pin } = req.body;
      if (!username || typeof username !== "string" || !pin || typeof pin !== "string") {
        res.status(400).json({ error: "Username and PIN are required" });
        return;
      }

      const cleanUsername = username.trim();
      const userMatch = await dbObj.findUserByUsername(cleanUsername);

      if (!userMatch || userMatch.pin !== pin) {
        res.status(401).json({ error: "Invalid username or 4-digit PIN" });
        return;
      }

      res.json({
        success: true,
        user: { id: userMatch.id, username: userMatch.username }
      });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: GET all workspaces belonging to the authenticated User
  app.get("/api/workspaces", async (req, res) => {
    try {
      const userId = (req.headers["x-user-id"] || "default_user") as string;
      const list = await dbObj.getUserWorkspaces(userId);
      res.json(list);
    } catch (err: any) {
      console.error("GET /api/workspaces error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: POST create workspace
  app.post("/api/workspaces", async (req, res) => {
    try {
      const { name } = req.body;
      const userId = (req.headers["x-user-id"] || "default_user") as string;

      if (!name || typeof name !== "string") {
        res.status(400).json({ error: "Workspace name is required" });
        return;
      }

      const cleanName = name.trim().slice(0, 150);
      const uuid = "ws_" + Math.random().toString(36).substring(2, 15);
      const now = new Date().toISOString();

      const welcomeSlides = [
        {
          id: "slide_1",
          workspaceId: uuid,
          slideNumber: 1,
          markdownContent: `# Welcome to ScribeSlide\n\n- ScribeSlide is a powerful presentation editor\n- Easy formatting, responsive layouts\n- Copy/Paste or drag images directly here`,
          audioUrl: ""
        }
      ];

      const workspaceDoc = {
        id: uuid,
        name: cleanName,
        markdownText: welcomeSlides[0].markdownContent,
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
      };

      await dbObj.createWorkspace(workspaceDoc, welcomeSlides);

      res.status(201).json(workspaceDoc);
    } catch (err: any) {
      console.error("POST /api/workspaces error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: GET a single workspace with its slides
  app.get("/api/workspaces/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const workspace = await dbObj.getWorkspace(id);

      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const slides = await dbObj.getWorkspaceSlides(id);
      res.json({
        workspace,
        slides
      });
    } catch (err: any) {
      console.error("GET /api/workspaces/:id error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: PUT update workspace and save slides directly
  app.put("/api/workspaces/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, slides } = req.body;

      try {
        const result = await dbObj.updateWorkspace(id, name, slides);
        res.json(result);
      } catch (err: any) {
        if (err.message === "Workspace not found") {
          res.status(404).json({ error: "Workspace not found" });
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      console.error("PUT /api/workspaces/:id error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: DELETE workspace and its slides
  app.delete("/api/workspaces/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const workspace = await dbObj.getWorkspace(id);

      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      await dbObj.deleteWorkspace(id);

      res.json({ success: true, message: "Workspace deleted" });
    } catch (err: any) {
      console.error("DELETE /api/workspaces/:id error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // REST API: POST generate revision shorts
  app.post("/api/workspaces/:id/shorts", async (req, res) => {
    try {
      const { id } = req.params;
      const workspace = await dbObj.getWorkspace(id);
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const slides = await dbObj.getWorkspaceSlides(id);
      if (slides.length === 0) {
        res.status(400).json({ error: "Workspace has no slides content to generate shorts" });
        return;
      }

      // Concatenate content across all slides
      const fullText = slides
        .map((s, idx) => `[Slide ${idx + 1}: ${s.title || 'Slide'}]\n${s.markdownContent}`)
        .join("\n\n");

      if (!fullText.trim()) {
        res.status(400).json({ error: "Workspace slides are completely empty" });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "AI Service is not configured (missing GEMINI_API_KEY)" });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const prompt = `You are a helpful AI learning assistant. Read the following workspace slide presentation slides content:

=== PRESENTATION SLIDES CONTENT ===
${fullText}
==================================

Generate 5 to 7 high-impact, extremely catchy, and easy-to-remember "Revision Shorts" (key facts, points to remember, memory tips, summary capsules) based ONLY on the presentation's contents.
Make the points visually elegant, concise (1-2 clear, punchy sentences), and conversational. Use fancy, fun tags for categories like "💡 Key Fact", "🧠 Pro Tip", "⚡ Remember This", "🎯 Core Goal", "🔥 Fast Concept".

Respond with a valid JSON array of objects conforming to this schema:
[
  {
    "id": "string (unique identifier)",
    "text": "string (the punchy revision note text, direct, elegant, easy-to-read, catchy)",
    "category": "string (the fun category/tag with emoji)",
  }
]`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
                category: { type: Type.STRING }
              },
              required: ["id", "text", "category"]
            }
          }
        }
      });

      const jsonText = response.text || "[]";
      let parsedShorts = [];
      try {
        parsedShorts = JSON.parse(jsonText);
      } catch (parseError) {
        console.error("Failed to parse AI dynamic output:", jsonText, parseError);
        parsedShorts = [
          {
            id: "err-1",
            text: "Could not structure facts correctly, please try again.",
            category: "⚠️ Alert"
          }
        ];
      }

      res.json(parsedShorts);
    } catch (err: any) {
      console.error("POST /api/workspaces/:id/shorts error:", err);
      res.status(500).json({ error: err.message || "Failed to generate AI revision shorts" });
    }
  });

  // Helper function to split text for TTS translation requests (limit is 200 characters)
  function splitTextIntoChunks(text: string, maxLength = 180): string[] {
    const cleanText = text
      .replace(/[#*`_~]/g, "") // strip standard markdown styling characters
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // replace link syntax with plain anchor text
      .replace(/[-+]/g, " ") // replace bullets and dashes with safe space delimiters
      .replace(/\s+/g, " ") // strip extra whitespaces
      .trim();

    if (!cleanText) return [];

    const chunks: string[] = [];
    let currentChunk = "";

    // Split by sentences first for natural pause bounds
    const sentences = cleanText.split(/(?<=[.?!])\s+/);

    for (const sentence of sentences) {
      if (sentence.length <= maxLength) {
        if ((currentChunk + " " + sentence).trim().length <= maxLength) {
          currentChunk = (currentChunk + " " + sentence).trim();
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = sentence;
        }
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = "";
        }
        // Sub-split long word sentences
        const words = sentence.split(/\s+/);
        for (const word of words) {
          if ((currentChunk + " " + word).trim().length <= maxLength) {
            currentChunk = (currentChunk + " " + word).trim();
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = word;
          }
        }
      }
    }
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    return chunks;
  }

  // AGENT CHAT endpoint: POST /api/ai/agent-chat
  app.post("/api/ai/agent-chat", express.json(), async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "AI Service is not configured (missing GEMINI_API_KEY)" });
        return;
      }

      const { userMessage, systemPrompt, temperature, slideContext, chatHistory } = req.body;

      if (!userMessage) {
        res.status(400).json({ error: "User message is required" });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      // Format previous chat history to help model remember the context
      let historyText = "";
      if (Array.isArray(chatHistory) && chatHistory.length > 0) {
        historyText = chatHistory
          .map((msg: any) => `${msg.sender === "user" ? "User" : "Agent"}: ${msg.text}`)
          .join("\n");
      }

      const fullPrompt = `You are an AI Agent with the following detailed system instructions:
===================================
${systemPrompt || "You are a helpful and intelligent presentation study assistant."}
===================================

[ACTIVE SLIDE PRESENTATION CONTEXT]
${slideContext ? slideContext : "No active slide context attached."}

[CONVERSATION HISTORY]
${historyText || "No prior history in this thread."}

[NEW USER MESSAGE]
User says: "${userMessage}"

Generate your response adhering perfectly to your assigned personality, system instructions, and temperature profile (${temperature || 0.7}). Use markdown lists or formatting where helpful.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: fullPrompt,
        config: {
          temperature: typeof temperature === "number" ? temperature : 0.7,
        }
      });

      res.json({
        text: response.text || "No response generated.",
        speed: (Math.random() * 8 + 18).toFixed(1) // Simulate local tokens/sec metric
      });
    } catch (err: any) {
      console.error("POST /api/ai/agent-chat error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // INDIAN ENGLISH TTS Proxy route: POST /api/tts
  app.post("/api/tts", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string") {
        res.status(400).json({ error: "Text string is required for processing TTS voiceover" });
        return;
      }

      console.log(`Processing Text-to-Speech for text slice (${text.length} chars)`);
      const chunks = splitTextIntoChunks(text);

      if (chunks.length === 0) {
        res.status(400).json({ error: "No vocalizable text found in markdown" });
        return;
      }

      const buffers: Buffer[] = [];

      // Query Google translate audio chunks using Indian English ('en-IN', top level co.in representation 'client=tw-ob')
      for (const chunk of chunks) {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en-IN&client=tw-ob&q=${encodeURIComponent(chunk)}`;
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36"
          }
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          buffers.push(Buffer.from(arrayBuffer));
        } else {
          console.error(`Failed to fetch TTS segment for: "${chunk}"`);
        }
      }

      if (buffers.length === 0) {
        res.status(502).json({ error: "Failed to generate any voice audio streams from external service" });
        return;
      }

      // Concatenate standard MP3 buffers directly. MP3 is frame-based and works wonderfully.
      const finalBuffer = Buffer.concat(buffers);

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", finalBuffer.length);
      res.setHeader("Cache-Control", "public, max-age=86400"); // cache results for 1 day
      res.send(finalBuffer);
    } catch (err: any) {
      console.error("POST /api/tts error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Serve Vite or static public client bundle
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server ScribeSlide AI active on local port: ${PORT}`);
    });
  }
}

startServer();

export default app;
