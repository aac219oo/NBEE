import { swagger } from "@elysiajs/swagger";
import pkg from "@heiso/core/package.json";
import { Elysia } from "elysia";
import { modules } from "./modules";
import { corsPlugin } from "./plugins";

const { name, version } = pkg;
export const app = new Elysia({ prefix: "/api" })
  .headers({
    "X-Powered-By": name,
  })
  .use(corsPlugin)
  .use(
    swagger({
      path: "/docs",
      exclude: ["/docs", "/docs/json"],
      documentation: {
        security: [{ bearerAuth: [] }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
            },
          },
        },
        info: {
          title: `${name} docs`,
          description: `A playground api docs for ${name}`,
          version,
        },
      },
    }),
  )
  .get("/", () => `Hello ${name}:${version} API`)
  .get("/health", () => "ok")
  .use(modules);