import fs from "fs";
import path from "path";

/**
 * PostgreSQL Integration disabled.
 * Persistent data storage is handled via Firebase Firestore and local caching.
 */

export async function initPostgres() {
  console.log("[PostgreSQL] Integration disabled (as requested, using Firebase/Vercel).");
}

export async function loadAllFromPostgres() {
  // Safe empty implementation
}

export async function saveToPostgres(filename: string, content: string) {
  // Safe empty implementation
}

export async function getPostgresPool() {
  return null;
}
