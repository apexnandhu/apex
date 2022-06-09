const {
  getAppDB,
  getDevAppDB,
  getProdAppDB,
  getAppId,
  updateAppId,
  doInAppContext,
  doInTenant,
} = require("./dist/src/context")

const identity = require("./dist/src/context/identity")

module.exports = {
  getAppDB,
  getDevAppDB,
  getProdAppDB,
  getAppId,
  updateAppId,
  doInAppContext,
  doInTenant,
  identity,
}
