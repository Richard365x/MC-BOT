import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { join } from 'path'

const file = join('data', 'db.json')
const adapter = new JSONFile(file)

const defaultData = {
  typeRoleIds: [],
  seasonOrder: { "1": [], "2": [] }
}

export const db = new Low(adapter, defaultData)

export async function getDB() {
  await db.read()
  db.data ||= { ...defaultData }
  return db
}
