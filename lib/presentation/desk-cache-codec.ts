import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";

const zip = promisify(gzip);
const unzip = promisify(gunzip);
const MAX_JSON_BYTES = 32 * 1024 * 1024;

/** Lossless server-cache transport only; never changes or drops plan fields. */
export async function encodeDeskCache(value: unknown): Promise<string> {
  const json = Buffer.from(JSON.stringify(value), "utf8");
  if (json.length > MAX_JSON_BYTES) throw new Error("交易快照超出安全读取大小");
  const encoded = (await zip(json)).toString("base64");
  if (encoded.length > 1_900_000) throw new Error("交易快照超出缓存容量");
  return encoded;
}

export async function decodeDeskCache<T>(value: string): Promise<T> {
  const json = await unzip(Buffer.from(value, "base64"), { maxOutputLength: MAX_JSON_BYTES });
  return JSON.parse(json.toString("utf8")) as T;
}
