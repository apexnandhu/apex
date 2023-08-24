import {
  auth,
  context,
  permissions,
  roles,
  users,
} from "@budibase/backend-core"
import { PermissionLevel, PermissionType, Role, UserCtx } from "@budibase/types"
import builderMiddleware from "./builder"
import { isWebhookEndpoint } from "./utils"
import { paramResource } from "./resourceId"

function hasResource(ctx: any) {
  return ctx.resourceId != null
}

const csrf = auth.buildCsrfMiddleware()

/**
 * Apply authorization to the requested resource:
 * - If this is a builder resource the user must be a builder.
 * - Builders can access all resources.
 * - Otherwise the user must have the required role.
 */
const checkAuthorized = async (
  ctx: UserCtx,
  resourceRoles: any,
  permType: PermissionType,
  permLevel: PermissionLevel
) => {
  const appId = context.getAppId()
  const isGlobalBuilderApi = permType === PermissionType.GLOBAL_BUILDER
  const isBuilderApi = permType === PermissionType.BUILDER
  const globalBuilder = users.isGlobalBuilder(ctx.user)
  let isBuilder = appId
    ? users.isBuilder(ctx.user, appId)
    : users.hasBuilderPermissions(ctx.user)
  // check if this is a builder api and the user is not a builder
  if ((isGlobalBuilderApi && !globalBuilder) || (isBuilderApi && !isBuilder)) {
    return ctx.throw(403, "Not Authorized")
  }

  // check for resource authorization
  if (!isBuilder) {
    await checkAuthorizedResource(ctx, resourceRoles, permType, permLevel)
  }
}

const checkAuthorizedResource = async (
  ctx: UserCtx,
  resourceRoles: any,
  permType: PermissionType,
  permLevel: PermissionLevel
) => {
  // get the user's roles
  const roleId = ctx.roleId || roles.BUILTIN_ROLE_IDS.PUBLIC
  const userRoles = (await roles.getUserRoleHierarchy(roleId, {
    idOnly: false,
  })) as Role[]
  const permError = "User does not have permission"
  // check if the user has the required role
  if (resourceRoles.length > 0) {
    // deny access if the user doesn't have the required resource role
    const found = userRoles.find(
      (role: any) => resourceRoles.indexOf(role._id) !== -1
    )
    if (!found) {
      ctx.throw(403, permError)
    }
    // fallback to the base permissions when no resource roles are found
  } else if (
    !permissions.doesHaveBasePermission(permType, permLevel, userRoles)
  ) {
    ctx.throw(403, permError)
  }
}

const authorized =
  (
    permType: PermissionType,
    permLevel?: PermissionLevel,
    opts = { schema: false },
    resourceId?: { path: string; transformer?: (val: string) => string }
  ) =>
  async (ctx: any, next: any) => {
    // webhooks don't need authentication, each webhook unique
    // also internal requests (between services) don't need authorized
    if (isWebhookEndpoint(ctx) || ctx.internal) {
      return next()
    }

    if (!ctx.user) {
      return ctx.throw(403, "No user info found")
    }

    // get the resource roles
    let resourceRoles: any = []
    let otherLevelRoles: any = []
    const otherLevel =
      permLevel === PermissionLevel.READ
        ? PermissionLevel.WRITE
        : PermissionLevel.READ
    const appId = context.getAppId()

    if (resourceId?.path) {
      // Reusing the existing middleware to extract the value
      paramResource(resourceId.path)(ctx, () => {})
      if (resourceId.transformer) {
        ctx.resourceId = resourceId.transformer(ctx.resourceId)
      }
    }

    if (appId && hasResource(ctx)) {
      resourceRoles = await roles.getRequiredResourceRole(permLevel!, ctx)
      if (opts && opts.schema) {
        otherLevelRoles = await roles.getRequiredResourceRole(otherLevel, ctx)
      }
    }

    // if the resource is public, proceed
    if (
      resourceRoles.includes(roles.BUILTIN_ROLE_IDS.PUBLIC) ||
      (otherLevelRoles &&
        otherLevelRoles.includes(roles.BUILTIN_ROLE_IDS.PUBLIC))
    ) {
      return next()
    }

    // check authenticated
    if (!ctx.isAuthenticated) {
      return ctx.throw(403, "Session not authenticated")
    }

    // check general builder stuff, this middleware is a good way
    // to find API endpoints which are builder focused
    if (
      permType === PermissionType.BUILDER ||
      permType === PermissionType.GLOBAL_BUILDER
    ) {
      await builderMiddleware(ctx)
    }

    try {
      // check authorized
      await checkAuthorized(ctx, resourceRoles, permType, permLevel!)
    } catch (err) {
      // this is a schema, check if
      if (opts && opts.schema && permLevel) {
        await checkAuthorized(ctx, otherLevelRoles, permType, otherLevel)
      } else {
        throw err
      }
    }

    // csrf protection
    return csrf(ctx, next)
  }

export default (
  permType: PermissionType,
  permLevel?: PermissionLevel,
  opts = { schema: false }
) => authorized(permType, permLevel, opts)

export const authorizedResource = (
  permType: PermissionType,
  permLevel: PermissionLevel,
  path: string,
  transformer?: (val: string) => string
) => {
  return authorized(permType, permLevel, undefined, { path, transformer })
}
