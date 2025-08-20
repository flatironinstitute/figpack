import type { User } from "./UsersSummary";

export interface AdminData {
  users: User[];
  version: string;
  lastModified: string;
}