import "server-only";
import { localStore } from "./local";
import { s3Configured, s3Store } from "./s3";
import type { DocumentStore } from "./types";

/** S3/R2 when configured, otherwise the local sandbox adapter. */
export function documentStore(): DocumentStore {
  return s3Configured() ? s3Store : localStore;
}
export type { DocumentStore } from "./types";
