import { getDatabase as getCloudbaseDatabase } from "@/lib/database/cloudbase-service"

export async function getDatabase() {
  return getCloudbaseDatabase()
}
