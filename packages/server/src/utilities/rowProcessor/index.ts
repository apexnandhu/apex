const linkRows = require("../../db/linkedRows")
const { cloneDeep } = require("lodash/fp")
import { FieldTypes, AutoFieldSubTypes } from "../../constants"
import { processFormulas, fixAutoColumnSubType } from "./utils"
const { ObjectStoreBuckets } = require("../../constants")
const {
  isProdAppID,
  getProdAppID,
  dbExists,
} = require("@budibase/backend-core/db")
const { getAppId } = require("@budibase/backend-core/context")
const { InternalTables } = require("../../db/utils")
import { objectStore } from "@budibase/backend-core"
import { Row, RowAttachment, Table } from "@budibase/types"

export * from "./utils"

const BASE_AUTO_ID = 1

/**
 * A map of how we convert various properties in rows to each other based on the row type.
 */
const TYPE_TRANSFORM_MAP = {
  [FieldTypes.LINK]: {
    "": [],
    // @ts-ignore
    [null]: [],
    // @ts-ignore
    [undefined]: undefined,
    parse: (link: any) => {
      if (Array.isArray(link) && typeof link[0] === "object") {
        return link.map(el => (el && el._id ? el._id : el))
      }
      if (typeof link === "string") {
        return [link]
      }
      return link
    },
  },
  [FieldTypes.OPTIONS]: {
    "": null,
    // @ts-ignore
    [null]: null,
    // @ts-ignore
    [undefined]: undefined,
  },
  [FieldTypes.ARRAY]: {
    "": [],
    // @ts-ignore
    [null]: [],
    // @ts-ignore
    [undefined]: undefined,
  },
  [FieldTypes.STRING]: {
    "": "",
    // @ts-ignore
    [null]: "",
    // @ts-ignore
    [undefined]: undefined,
  },
  [FieldTypes.BARCODEQR]: {
    "": "",
    // @ts-ignore
    [null]: "",
    // @ts-ignore
    [undefined]: undefined,
  },
  [FieldTypes.FORMULA]: {
    "": "",
    // @ts-ignore
    [null]: "",
    // @ts-ignore
    [undefined]: undefined,
  },
  [FieldTypes.LONGFORM]: {
    "": "",
    // @ts-ignore
    [null]: "",
    // @ts-ignore
    [undefined]: undefined,
  },
  [FieldTypes.NUMBER]: {
    "": null,
    // @ts-ignore
    [null]: null,
    // @ts-ignore
    [undefined]: undefined,
    parse: (n: any) => parseFloat(n),
  },
  [FieldTypes.DATETIME]: {
    "": null,
    // @ts-ignore
    [undefined]: undefined,
    // @ts-ignore
    [null]: null,
    parse: (date: string | Date) => {
      if (date instanceof Date) {
        return date.toISOString()
      }
      return date
    },
  },
  [FieldTypes.ATTACHMENT]: {
    "": [],
    // @ts-ignore
    [null]: [],
    // @ts-ignore
    [undefined]: undefined,
  },
  [FieldTypes.BOOLEAN]: {
    "": null,
    // @ts-ignore
    [null]: null,
    // @ts-ignore
    [undefined]: undefined,
    true: true,
    false: false,
  },
  [FieldTypes.AUTO]: {
    parse: () => undefined,
  },
  [FieldTypes.JSON]: {
    parse: (input: any) => {
      try {
        if (input === "") {
          return undefined
        }
        return JSON.parse(input)
      } catch (err) {
        return input
      }
    },
  },
}

/**
 * Given the old state of the row and the new one after an update, this will
 * find the keys that have been removed in the updated row.
 */
function getRemovedAttachmentKeys(
  oldRow: Row,
  row: Row,
  attachmentKey: string
) {
  if (!oldRow[attachmentKey]) {
    return []
  }
  const oldKeys = oldRow[attachmentKey].map((attachment: any) => attachment.key)
  // no attachments in new row, all removed
  if (!row[attachmentKey]) {
    return oldKeys
  }
  const newKeys = row[attachmentKey].map((attachment: any) => attachment.key)
  return oldKeys.filter((key: string) => newKeys.indexOf(key) === -1)
}

/**
 * This will update any auto columns that are found on the row/table with the correct information based on
 * time now and the current logged in user making the request.
 * @param {Object} user The user to be used for an appId as well as the createdBy and createdAt fields.
 * @param {Object} table The table which is to be used for the schema, as well as handling auto IDs incrementing.
 * @param {Object} row The row which is to be updated with information for the auto columns.
 * @param {Object} opts specific options for function to carry out optional features.
 * @returns {{row: Object, table: Object}} The updated row and table, the table may need to be updated
 * for automatic ID purposes.
 */
export const processAutoColumn = (
  user: any,
  table: Table,
  row: Row,
  opts: { reprocessing?: boolean; noAutoRelationships?: boolean } = {
    reprocessing: false,
    noAutoRelationships: false,
  }
) => {
  let noUser = !user || !user.userId
  let isUserTable = table._id === InternalTables.USER_METADATA
  let now = new Date().toISOString()
  // if a row doesn't have a revision then it doesn't exist yet
  const creating = !row._rev
  // check its not user table, or whether any of the processing options have been disabled
  const shouldUpdateUserFields =
    !isUserTable && !opts.reprocessing && !opts.noAutoRelationships && !noUser
  for (let [key, s] of Object.entries(table.schema)) {
    let schema = s as any
    if (!schema.autocolumn) {
      continue
    }
    if (!schema.subtype) {
      schema = fixAutoColumnSubType(schema)
    }
    switch (schema.subtype) {
      case AutoFieldSubTypes.CREATED_BY:
        if (creating && shouldUpdateUserFields) {
          row[key] = [user.userId]
        }
        break
      case AutoFieldSubTypes.CREATED_AT:
        if (creating) {
          row[key] = now
        }
        break
      case AutoFieldSubTypes.UPDATED_BY:
        if (shouldUpdateUserFields) {
          row[key] = [user.userId]
        }
        break
      case AutoFieldSubTypes.UPDATED_AT:
        row[key] = now
        break
      case AutoFieldSubTypes.AUTO_ID:
        if (creating) {
          schema.lastID = !schema.lastID ? BASE_AUTO_ID : schema.lastID + 1
          row[key] = schema.lastID
        }
        break
    }
  }
  return { table, row }
}

/**
 * This will coerce a value to the correct types based on the type transform map
 * @param {object} row The value to coerce
 * @param {object} type The type fo coerce to
 * @returns {object} The coerced value
 */
export const coerce = (row: any, type: string) => {
  // no coercion specified for type, skip it
  if (!TYPE_TRANSFORM_MAP[type]) {
    return row
  }
  // eslint-disable-next-line no-prototype-builtins
  if (TYPE_TRANSFORM_MAP[type].hasOwnProperty(row)) {
    // @ts-ignore
    return TYPE_TRANSFORM_MAP[type][row]
  } else if (TYPE_TRANSFORM_MAP[type].parse) {
    // @ts-ignore
    return TYPE_TRANSFORM_MAP[type].parse(row)
  }

  return row
}

/**
 * Given an input route this function will apply all the necessary pre-processing to it, such as coercion
 * of column values or adding auto-column values.
 * @param {object} user the user which is performing the input.
 * @param {object} row the row which is being created/updated.
 * @param {object} table the table which the row is being saved to.
 * @param {object} opts some input processing options (like disabling auto-column relationships).
 * @returns {object} the row which has been prepared to be written to the DB.
 */
export const inputProcessing = (
  user = {},
  table: Table,
  row: Row,
  opts = { noAutoRelationships: false }
) => {
  let clonedRow = cloneDeep(row)
  // need to copy the table so it can be differenced on way out
  const copiedTable = cloneDeep(table)
  const dontCleanseKeys = ["type", "_id", "_rev", "tableId"]
  for (let [key, value] of Object.entries(clonedRow)) {
    const field = table.schema[key]
    // cleanse fields that aren't in the schema
    if (!field) {
      if (dontCleanseKeys.indexOf(key) === -1) {
        delete clonedRow[key]
      }
      continue
    }
    // remove any formula values, they are to be generated
    if (field.type === FieldTypes.FORMULA) {
      delete clonedRow[key]
    }
    // remove any attachment urls, they are generated on read
    if (field.type === FieldTypes.ATTACHMENT) {
      clonedRow[key].forEach((attachment: RowAttachment) => {
        delete attachment.url
      })
    }
    // otherwise coerce what is there to correct types
    else {
      clonedRow[key] = coerce(value, field.type)
    }
  }

  if (!clonedRow._id || !clonedRow._rev) {
    clonedRow._id = row._id
    clonedRow._rev = row._rev
  }

  // handle auto columns - this returns an object like {table, row}
  return processAutoColumn(user, copiedTable, clonedRow, opts)
}

/**
 * This function enriches the input rows with anything they are supposed to contain, for example
 * link records or attachment links.
 * @param {object} table the table from which these rows came from originally, this is used to determine
 * the schema of the rows and then enrich.
 * @param {object[]|object} rows the rows which are to be enriched.
 * @param {object} opts used to set some options for the output, such as disabling relationship squashing.
 * @returns {object[]|object} the enriched rows will be returned.
 */
export const outputProcessing = async (
  table: Table,
  rows: Row[],
  opts = { squash: true }
) => {
  let wasArray = true
  if (!(rows instanceof Array)) {
    rows = [rows]
    wasArray = false
  }
  // attach any linked row information
  let enriched = await linkRows.attachFullLinkedDocs(table, rows)

  // process formulas
  enriched = processFormulas(table, enriched, { dynamic: true })

  // set the attachments URLs
  for (let [property, column] of Object.entries(table.schema)) {
    if (column.type === FieldTypes.ATTACHMENT) {
      for (let row of enriched) {
        if (row[property] == null || !Array.isArray(row[property])) {
          continue
        }
        row[property].forEach((attachment: RowAttachment) => {
          attachment.url = objectStore.getAppFileUrl(attachment.key)
        })
      }
    }
  }
  if (opts.squash) {
    enriched = await linkRows.squashLinksToPrimaryDisplay(table, enriched)
  }
  return wasArray ? enriched : enriched[0]
}

/**
 * Clean up any attachments that were attached to a row.
 * @param {object} table The table from which a row is being removed.
 * @param {any} row optional - the row being removed.
 * @param {any} rows optional - if multiple rows being deleted can do this in bulk.
 * @param {any} oldRow optional - if updating a row this will determine the difference.
 * @param {any} oldTable optional - if updating a table, can supply the old table to look for
 * deleted attachment columns.
 * @return {Promise<void>} When all attachments have been removed this will return.
 */
export const cleanupAttachments = async (
  table: Table,
  opts: { row?: Row; rows?: Row[]; oldRow?: Row; oldTable?: Table }
) => {
  const row = opts.row
  const rows = opts.rows
  const oldRow = opts.oldRow
  const oldTable = opts.oldTable

  const appId = getAppId()
  if (!isProdAppID(appId)) {
    const prodAppId = getProdAppID(appId)
    // if prod exists, then don't allow deleting
    const exists = await dbExists(prodAppId)
    if (exists) {
      return
    }
  }
  let files: string[] = []
  function addFiles(row: Row, key: string) {
    if (row[key]) {
      files = files.concat(row[key].map((attachment: any) => attachment.key))
    }
  }
  const schemaToUse = oldTable ? oldTable.schema : table.schema
  for (let [key, schema] of Object.entries(schemaToUse)) {
    if (schema.type !== FieldTypes.ATTACHMENT) {
      continue
    }
    // old table had this column, new table doesn't - delete it
    if (oldTable && !table.schema[key]) {
      rows?.forEach(row => addFiles(row, key))
    } else if (oldRow && row) {
      // if updating, need to manage the differences
      files = files.concat(getRemovedAttachmentKeys(oldRow, row, key))
    } else if (row) {
      addFiles(row, key)
    } else if (rows) {
      rows.forEach(row => addFiles(row, key))
    }
  }
  if (files.length > 0) {
    await objectStore.deleteFiles(ObjectStoreBuckets.APPS, files)
  }
}
